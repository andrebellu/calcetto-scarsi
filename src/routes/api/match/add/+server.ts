import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type PlayerInput = { player_id: string; goals: number; autogol: number; };
type Payload = {
  luogo: string;
  match_date: string; // YYYY-MM-DD
  team_blue_score: number;
  team_red_score: number;
  blue: PlayerInput[];
  red: PlayerInput[];
};

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event;

  const { session } = await locals.safeGetSession();
  if (!session) return new Response(JSON.stringify({ message: 'Non autenticato' }), { status: 401 });

  const supabase = locals.supabase;

  let body: Payload;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ message: 'JSON non valido' }), { status: 400 }); }

  const { luogo, match_date, team_blue_score, team_red_score, blue = [], red = [] } = body ?? {};
  if (!luogo?.trim() || !match_date) {
    return new Response(JSON.stringify({ message: 'luogo e match_date sono obbligatori' }), { status: 400 });
  }
  if (!Array.isArray(blue) || !Array.isArray(red)) {
    return new Response(JSON.stringify({ message: 'blue e red devono essere array' }), { status: 400 });
  }

  const blueScore = Number(team_blue_score ?? 0);
  const redScore = Number(team_red_score ?? 0);
  const bluWon = blueScore > redScore;
  const rossiWon = redScore > blueScore;

  const { count, error: countErr } = await supabase
    .from('matches')
    .select('match_id', { count: 'exact', head: true })
    .eq('match_date', match_date)
    .eq('luogo', luogo);
  if (countErr) return new Response(JSON.stringify({ message: countErr.message }), { status: 500 });
  const nextMatchNumber = (count ?? 0) + 1;

  const { data: matchRow, error: insMatchErr } = await supabase
    .from('matches')
    .insert([{
      match_date,
      luogo,
      match_number: nextMatchNumber,
      team_blue_score: blueScore,
      team_red_score: redScore,
      created_at: new Date().toISOString()
    }])
    .select('match_id')
    .single();

  if (insMatchErr) return new Response(JSON.stringify({ message: insMatchErr.message }), { status: 500 });

  const match_id = matchRow.match_id as number;

  const norm = (n: any) => Math.max(0, Number(n) || 0);
  const mk = (arr: PlayerInput[], team: 'blu' | 'rossi') =>
    arr.map((p) => ({
      match_id,
      player_id: p.player_id,
      team,
      goals: norm(p.goals),
      autogol: norm(p.autogol),
      is_winner: team === 'blu' ? bluWon : rossiWon
    }));
  const rows = [...mk(blue, 'blu'), ...mk(red, 'rossi')];

  await supabase.from('player_match').delete().eq('match_id', match_id);

  const { error: insPmErr } = await supabase.from('player_match').insert(rows);
  if (insPmErr) {
    await supabase.from('matches').delete().eq('match_id', match_id);
    return new Response(JSON.stringify({ message: insPmErr.message }), { status: 500 });
  }

  return json({ match_id, players: rows });
};
