import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, locals, request }) => {
    const { id: poll_id } = params;
    const { user } = await locals.safeGetSession();
    const { absent } = await request.json();

    if (!user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = locals.supabase;

    if (absent) {
        const { error } = await supabase
            .from("poll_absence")
            .upsert({ poll_id: Number(poll_id), player_id: user.id }, { onConflict: "poll_id, player_id" });

        if (error) {
            console.error("Error declaring absence:", error);
            return json({ error: "Failed to declare absence" }, { status: 500 });
        }
    } else {
        const { error } = await supabase
            .from("poll_absence")
            .delete()
            .eq("poll_id", poll_id)
            .eq("player_id", user.id);

        if (error) {
            console.error("Error removing absence:", error);
            return json({ error: "Failed to remove absence" }, { status: 500 });
        }
    }

    return json({ success: true });
};
