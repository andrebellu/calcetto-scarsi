import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/push';

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as {
    player_id?: string;
    subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
  };
  const { player_id, subscription } = body;
  if (!player_id || !subscription?.endpoint || !subscription.keys) {
    throw error(400, 'player_id e subscription richiesti');
  }

  const { error: err } = await supabaseAdmin.from('push_subscription').upsert(
    {
      player_id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (err) {
    console.error('push subscribe error', err);
    throw error(500, 'Errore salvataggio subscription');
  }

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) throw error(400, 'endpoint richiesto');

  const { error: err } = await supabaseAdmin.from('push_subscription').delete().eq('endpoint', endpoint);
  if (err) {
    console.error('push unsubscribe error', err);
    throw error(500, 'Errore rimozione subscription');
  }

  return json({ ok: true });
};
