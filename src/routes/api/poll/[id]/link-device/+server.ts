import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { randomUUID } from "node:crypto";

export const POST: RequestHandler = async ({ locals, params, cookies }) => {
  const supabase = locals.supabase;
  const poll_id = Number(params.id);
  if (!poll_id) throw error(400, "Bad request");

  const { user } = await locals.safeGetSession();
  const identityCookieName = user
    ? `poll_identity_${poll_id}_${user.id}`
    : `poll_identity_${poll_id}_anon`;
  const player_id = cookies.get(identityCookieName);
  if (!player_id) throw error(400, "Nessuna identità da collegare");

  const token = randomUUID();
  const { error: e } = await supabase.from("player_link_token").insert({
    token,
    poll_id,
    player_id,
    origin_voter_token: locals.voterToken,
  });
  if (e) {
    console.error("link-device insert error", e);
    throw error(500, e.message);
  }

  return json({ token });
};
