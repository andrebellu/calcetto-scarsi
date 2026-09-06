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

export async function sendPushToAllPlayers(payload: PushPayload) {
  if (process.env.PUSH_TEST_ONLY_PLAYER_ID) {
    await sendPushToPlayers([process.env.PUSH_TEST_ONLY_PLAYER_ID], payload);
    return;
  }
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('player_id')
    .eq('is_temporary', false);
  const playerIds = (players ?? []).map((p) => p.player_id).filter(Boolean);
  await sendPushToPlayers(playerIds, payload);
}

const itDateLabel = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

export function formatMatchDate(matchDate: string | null) {
  if (!matchDate) return 'La data';
  const dt = new Date(matchDate);
  return Number.isFinite(dt.getTime()) ? itDateLabel.format(dt) : matchDate;
}

export async function notifyOptionThresholds(pollId: number, optionId: number) {
  const { data: option } = await supabaseAdmin
    .from('poll_option')
    .select('match_date, notified_seven, notified_quota')
    .eq('option_id', optionId)
    .maybeSingle();
  if (!option) return;

  const { count, error: countErr } = await supabaseAdmin
    .from('poll_vote')
    .select('option_id', { count: 'exact', head: true })
    .eq('poll_id', pollId)
    .eq('option_id', optionId)
    .eq('choice', 'yes');
  if (countErr) {
    console.error('push: errore conteggio voti', countErr);
    return;
  }

  const yesCount = count ?? 0;
  if (yesCount < 7) return;

  const dateLabel = formatMatchDate(option.match_date);

  if (yesCount >= 7 && !option.notified_seven) {
    await sendPushToAllPlayers({
      title: 'Quasi pieno!',
      body: `${dateLabel}: raggiunti 7 giocatori, manca solo 1 posto!`,
      url: '/poll',
    });
    await supabaseAdmin.from('poll_option').update({ notified_seven: true }).eq('option_id', optionId);
  }

  if (yesCount >= 8 && !option.notified_quota) {
    const { count: otherQuotaCount } = await supabaseAdmin
      .from('poll_option')
      .select('option_id', { count: 'exact', head: true })
      .eq('poll_id', pollId)
      .eq('notified_quota', true)
      .neq('option_id', optionId);

    if (!otherQuotaCount) {
      await sendPushToAllPlayers({
        title: 'Quota raggiunta!',
        body: `${dateLabel}: siamo in 8, si gioca!`,
        url: '/poll',
      });
    }
    await supabaseAdmin.from('poll_option').update({ notified_quota: true }).eq('option_id', optionId);
  }
}
