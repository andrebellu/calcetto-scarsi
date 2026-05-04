import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
    const { id } = params;
    const { absent, player_id } = await request.json();

    const targetPlayerId = player_id;

    if (!targetPlayerId) {
        return error(400, 'player_id required');
    }

    const supabase = locals.supabase;

    if (absent) {
        const { error: err } = await supabase
            .from('poll_absence')
            .upsert({ poll_id: id, player_id: targetPlayerId }, { onConflict: 'poll_id,player_id' });

        if (err) {
            console.error(err);
            return error(500, 'Database error');
        }
    } else {
        const { error: err } = await supabase
            .from('poll_absence')
            .delete()
            .eq('poll_id', id)
            .eq('player_id', targetPlayerId);

        if (err) {
            console.error(err);
            return error(500, 'Database error');
        }
    }

    return json({ success: true });
};
