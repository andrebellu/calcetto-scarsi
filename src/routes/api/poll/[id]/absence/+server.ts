import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parsePositiveInt } from '$lib/domain/fixture';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    const id = parsePositiveInt(params.id);
    if (!id) error(400, 'poll_id non valido');

    const { absent, player_id } = (await request.json().catch(() => ({}))) as {
        absent?: boolean;
        player_id?: unknown;
    };

    const targetPlayerId = typeof player_id === 'string' ? player_id.trim() : '';
    if (!targetPlayerId) {
        error(400, 'player_id required');
    }

    const supabase = locals.supabase;

    if (absent) {
        const { error: err } = await supabase
            .from('poll_absence')
            .upsert({ poll_id: id, player_id: targetPlayerId }, { onConflict: 'poll_id,player_id' });

        if (err) {
            console.error(err);
            error(500, 'Database error');
        }
    } else {
        const { error: err } = await supabase
            .from('poll_absence')
            .delete()
            .eq('poll_id', id)
            .eq('player_id', targetPlayerId);

        if (err) {
            console.error(err);
            error(500, 'Database error');
        }
    }

    return json({ success: true });
};
