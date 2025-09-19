// src/routes/api/poll/[id]/vote/+server.ts
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  const token = locals.voterToken; // token anonimo da hooks
  const poll_id = Number(params.id);

  const body = (await request.json()) as {
    option_id?: number;
    option_ids?: number[];
    choice?: "yes" | "no";
    player_id?: string; // NEW
  };
  const optionIds = body.option_ids ?? (body.option_id ? [body.option_id] : []);
  if (!poll_id || optionIds.length === 0) throw error(400, "Bad request");

  // chiama l'RPC che fa l'UPSERT con la predicate sull'indice parziale
  for (const oid of optionIds) {
    const { error: e } = await supabase.rpc("vote_upsert", {
      p_poll_id: poll_id,
      p_option_id: oid,
      p_voter_id: user?.id ?? null,
      p_voter_token: user ? null : token,
      p_choice: body.choice ?? "yes",
      p_player_id: body.player_id ?? null, // NEW
    });
    if (e) {
      console.error("vote_upsert RPC error", e);
      throw error(500, e.message);
    }
  }
  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params, url }) => {
  const supabase = locals.supabase;
  const { user } = await locals.safeGetSession();
  const token = locals.voterToken;
  const poll_id = Number(params.id);
  const option_id = Number(url.searchParams.get('option_id'));
  if (!poll_id || !option_id) throw error(400, 'option_id required');

  const q = user
    ? supabase.from('poll_vote').delete()
        .eq('poll_id', poll_id).eq('option_id', option_id)
        .eq('voter_id', user.id)
    : supabase.from('poll_vote').delete()
        .eq('poll_id', poll_id).eq('option_id', option_id)
        .eq('voter_token', token);

  const { error: e } = await q;
  if (e) throw error(500, e.message);
  return json({ ok: true });
};
