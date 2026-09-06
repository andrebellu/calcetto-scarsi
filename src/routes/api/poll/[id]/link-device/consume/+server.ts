import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, cookies, request }) => {
  const supabase = locals.supabase;
  const poll_id = Number(params.id);
  if (!poll_id) throw error(400, "Bad request");

  const { token } = await request.json();
  if (!token) throw error(400, "Missing token");

  const { user } = await locals.safeGetSession();
  const identityCookieName = user
    ? `poll_identity_${poll_id}_${user.id}`
    : `poll_identity_${poll_id}_anon`;

  const { data: linkRow } = await supabase
    .from("player_link_token")
    .select("player_id, expires_at")
    .eq("token", token)
    .eq("poll_id", poll_id)
    .maybeSingle();

  await supabase.from("player_link_token").delete().eq("token", token);

  const linkOk = !!linkRow && new Date(linkRow.expires_at) > new Date();
  if (linkOk) {
    cookies.set(identityCookieName, linkRow!.player_id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return json({ ok: linkOk });
};
