import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendPushToPlayers, formatMatchDate } from '$lib/server/push';
import { requireUser } from '$lib/server/auth';
import {
  ValidationError,
  buildFixturePlayerRows,
  normalizeFixturePlayers,
  parsePositiveInt,
  pickWinnerOptionId,
  uniqueByPlayerId,
  type FixturePlayerInput
} from '$lib/domain/fixture';

type ConfirmBody = {
  option_id?: number;
  players?: unknown;
};

export const POST: RequestHandler = async ({ params, locals, request }) => {
  await requireUser(locals);
  const supabase = locals.supabase;

  const poll_id = parsePositiveInt(params.poll_id);
  if (!poll_id) throw error(400, 'poll_id non valido');

  const body: ConfirmBody = await request.json().catch(() => ({}));

  // Validazione completa PRIMA di qualsiasi scrittura.
  let requestedPlayers: FixturePlayerInput[];
  try {
    requestedPlayers = normalizeFixturePlayers(body.players);
  } catch (e) {
    if (e instanceof ValidationError) throw error(400, e.message);
    throw e;
  }
  const requestedOptionId =
    body.option_id === undefined || body.option_id === null ? null : parsePositiveInt(body.option_id);
  if (body.option_id != null && !requestedOptionId) throw error(400, 'option_id non valido');

  try {
    const { data: poll, error: pollErr } = await supabase
      .from('poll')
      .select('poll_id')
      .eq('poll_id', poll_id)
      .maybeSingle();
    if (pollErr) throw pollErr;
    if (!poll) throw error(404, 'Sondaggio non trovato');

    // L'opzione vincente viene calcolata al massimo una volta e solo se serve.
    let winnerOptionId: number | null = requestedOptionId;
    const resolveWinner = async (): Promise<number> => {
      if (winnerOptionId) return winnerOptionId;
      const [{ data: options, error: optErr }, { data: votes, error: vErr }] = await Promise.all([
        supabase.from('poll_option').select('option_id, match_date, time_of_day').eq('poll_id', poll_id),
        supabase.from('poll_vote').select('option_id, choice').eq('poll_id', poll_id).eq('choice', 'yes')
      ]);
      if (optErr) throw optErr;
      if (vErr) throw vErr;
      if (!options?.length) throw error(400, 'Il sondaggio non ha opzioni');
      winnerOptionId = pickWinnerOptionId(options, votes ?? []);
      if (!winnerOptionId) throw error(400, 'Impossibile determinare la data vincente');
      return winnerOptionId;
    };

    // Riusa la convocazione esistente: un doppio clic non ne crea una seconda.
    const { data: fx, error: fxErr } = await supabase
      .from('fixture')
      .select('fixture_id, status')
      .eq('poll_id', poll_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fxErr) throw fxErr;

    let fixture_id: number | undefined = fx?.fixture_id;
    let created_fixture = false;

    if (!fixture_id) {
      const optionId = await resolveWinner();
      const { data: picked, error: pickErr } = await supabase
        .from('poll_option')
        .select('match_date, luogo, time_of_day')
        .eq('poll_id', poll_id)
        .eq('option_id', optionId)
        .maybeSingle();
      if (pickErr) throw pickErr;
      if (!picked) throw error(400, "L'opzione scelta non appartiene a questo sondaggio");

      const { data: created, error: insErr } = await supabase
        .from('fixture')
        .insert({
          poll_id,
          match_date: picked.match_date,
          luogo: picked.luogo,
          time_of_day: picked.time_of_day,
          status: 'confirmed',
          locked_at: new Date().toISOString()
        })
        .select('fixture_id')
        .single();
      if (insErr) throw insErr;

      fixture_id = created.fixture_id as number;
      created_fixture = true;
    }

    let playersToPersist = requestedPlayers;
    if (playersToPersist.length === 0) {
      const optionId = await resolveWinner();
      const { data: voters, error: votersErr } = await supabase
        .from('poll_vote')
        .select('player_id, players!inner(name)')
        .eq('poll_id', poll_id)
        .eq('option_id', optionId)
        .eq('choice', 'yes');
      if (votersErr) throw votersErr;
      playersToPersist = uniqueByPlayerId(
        (voters ?? []).map((row) => ({
          player_id: row.player_id as string,
          team: 'P' as const,
          is_goalkeeper: false
        }))
      );
    }

    const rows = buildFixturePlayerRows(fixture_id, playersToPersist);

    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from('fixture_player')
        .upsert(rows, { onConflict: 'fixture_id,player_id' });
      if (upErr) {
        // Compensazione: non lasciare una convocazione appena creata senza giocatori.
        if (created_fixture) await supabase.from('fixture').delete().eq('fixture_id', fixture_id);
        throw upErr;
      }
    }

    if (!created_fixture) {
      const { error: updErr } = await supabase
        .from('fixture')
        .update({ status: 'confirmed', locked_at: new Date().toISOString() })
        .eq('fixture_id', fixture_id);
      if (updErr) throw updErr;
    }

    const { error: closeErr } = await supabase
      .from('poll')
      .update({ status: 'closed' })
      .eq('poll_id', poll_id);
    if (closeErr) console.error('confirm fixture: chiusura sondaggio fallita', closeErr);

    // Le notifiche non devono mai far fallire una conferma già salvata.
    const notifyPlayerIds = rows.filter((r) => r.team === 'A' || r.team === 'B').map((r) => r.player_id);
    if (notifyPlayerIds.length) {
      try {
        const { data: fixtureInfo } = await supabase
          .from('fixture')
          .select('match_date, luogo')
          .eq('fixture_id', fixture_id)
          .maybeSingle();
        const dateLabel = formatMatchDate(fixtureInfo?.match_date ?? null);
        const luogo = fixtureInfo?.luogo ? ` @ ${fixtureInfo.luogo}` : '';
        await sendPushToPlayers(notifyPlayerIds, {
          title: 'Squadre pubblicate!',
          body: `${dateLabel}${luogo} — controlla la tua squadra`,
          url: '/planned'
        });
      } catch (pushErr) {
        console.error('push notify-teams error', pushErr);
      }
    }

    return json({ ok: true, fixture_id });
  } catch (e: unknown) {
    // Prima gli errori 4xx venivano trasformati in 500: ora li lasciamo passare.
    if (isHttpError(e)) throw e;
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message;
    console.error('confirm fixture error:', message ?? e);
    throw error(500, 'Errore durante la conferma della convocazione');
  }
};
