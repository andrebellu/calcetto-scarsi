import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { PUBLIC_SUPABASE_URL, PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY } from '$env/static/private';

export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

webpush.setVapidDetails('mailto:bellu.andrea@outlook.it', PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToPlayers(playerIds: string[], payload: PushPayload) {
  if (!playerIds.length) return;

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscription')
    .select('id, endpoint, p256dh, auth')
    .in('player_id', playerIds);

  if (error) {
    console.error('push: errore lettura subscription', error);
    return;
  }
  if (!subscriptions?.length) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  const staleIds: number[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const statusCode = result.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(subscriptions[i].id);
      } else {
        console.error('push: invio fallito', result.reason);
      }
    }
  });

  if (staleIds.length) {
    await supabaseAdmin.from('push_subscription').delete().in('id', staleIds);
  }
}

export async function sendPushToPlayer(playerId: string, payload: PushPayload) {
  return sendPushToPlayers([playerId], payload);
}
