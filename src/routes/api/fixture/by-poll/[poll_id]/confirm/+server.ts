import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { mulberry32, shuffle } from "$lib/utils/random";

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  if (!user) throw error(401, "Unauthorized");

  const poll_id = Number(params.poll_id);
  if (!poll_id || Number.isNaN(poll_id)) throw error(400, "Invalid poll_id");

  const body = (await (async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  })()) as {
    option_id?: number;
    players?: Array<{
      player_id: string;
      team: "A" | "B" | "P";
      is_goalkeeper?: boolean;
    }>;
  };

  try {
    const { data: fx, error: fxErr } = await supabase
      .from("fixture")
      .select("fixture_id, status")
      .eq("poll_id", poll_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fxErr) throw fxErr;

    let fixture_id = fx?.fixture_id;
    let created_fixture = false;

    if (!fixture_id) {
      let winnerOptionId = body.option_id;
      if (!winnerOptionId) {
        const { data: options, error: optErr } = await supabase
          .from("poll_option")
          .select("option_id, match_date, time_of_day, luogo")
          .eq("poll_id", poll_id);
        if (optErr) throw optErr;
        if (!options?.length) throw error(400, "No options for this poll");

        const { data: votes, error: vErr } = await supabase
          .from("poll_vote")
          .select("option_id, choice")
          .eq("poll_id", poll_id)
          .eq("choice", "yes");
        if (vErr) throw vErr;

        const counts = new Map<number, number>();
        for (const v of votes ?? [])
          counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
        const ranked = options.slice().sort((a, b) => {
          const ca = counts.get(a.option_id) ?? 0;
          const cb = counts.get(b.option_id) ?? 0;
          if (cb !== ca) return cb - ca;
          const da = a.match_date ?? "";
          const db = b.match_date ?? "";
          if (da !== db) return da < db ? -1 : 1;
          const ta = a.time_of_day ?? "";
          const tb = b.time_of_day ?? "";
          if (ta !== tb) return ta < tb ? -1 : 1;
          return a.option_id - b.option_id;
        });
        winnerOptionId = ranked[0]?.option_id;
        if (!winnerOptionId) throw error(400, "Cannot pick a winner");
      }

      const { data: picked, error: pickErr } = await supabase
        .from("poll_option")
        .select("match_date, luogo, time_of_day")
        .eq("poll_id", poll_id)
        .eq("option_id", winnerOptionId!)
        .maybeSingle();
      if (pickErr || !picked) throw error(400, "Invalid option chosen");

      const { data: created, error: insErr } = await supabase
        .from("fixture")
        .insert({
          poll_id,
          match_date: picked.match_date,
          luogo: picked.luogo,
          status: "confirmed",
          locked_at: new Date().toISOString(),
        })
        .select("fixture_id")
        .single();
      if (insErr) throw insErr;

      fixture_id = created.fixture_id;
      created_fixture = true;
    }

    if (Array.isArray(body.players) && body.players.length > 0) {
      const map = new Map<
        string,
        {
          fixture_id: number;
          player_id: string;
          team: "A" | "B" | "P";
          is_goalkeeper: boolean;
          gk_order?: number;
        }
      >();

      for (const p of body.players) {
        map.set(p.player_id, {
          fixture_id,
          player_id: p.player_id,
          team: p.team,
          is_goalkeeper: !!p.is_goalkeeper,
        });
      }
      const rows = Array.from(map.values());

      const rowsA = rows.filter((r) => r.team === "A");
      const rowsB = rows.filter((r) => r.team === "B");

      shuffle(rowsA, mulberry32(fixture_id * 1337 + 65)).forEach(
        (r, i) => (r.gk_order = i + 1)
      );
      shuffle(rowsB, mulberry32(fixture_id * 1337 + 66)).forEach(
        (r, i) => (r.gk_order = i + 1)
      );

      const { error: upErr } = await supabase
        .from("fixture_player")
        .upsert(rows, { onConflict: "fixture_id,player_id" });
      if (upErr) {
        if (created_fixture)
          await supabase.from("fixture").delete().eq("fixture_id", fixture_id);
        throw upErr;
      }
    }

    const { error: updErr } = await supabase
      .from("fixture")
      .update({ status: "confirmed", locked_at: new Date().toISOString() })
      .eq("fixture_id", fixture_id);
    if (updErr) throw updErr;

    await supabase
      .from("poll")
      .update({ status: "closed" })
      .eq("poll_id", poll_id);

    return json({ ok: true, fixture_id });
  } catch (e: any) {
    console.error("confirm fixture error:", e?.message ?? e);
    throw error(500, e?.message ?? "Internal error");
  }
};
