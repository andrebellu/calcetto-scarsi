import { supabase } from "$lib/supabaseClient";

export async function load({ locals }: { locals: any }) {
    const { data: players, error: playersError } = await supabase
        .from("players")
        .select("*");

    const { data: playerMatches, error: playerMatchesError } = await supabase
        .from("player_match")
        .select(`
            goals,
            is_winner,
            autogol,
            player:players(name, player_id, is_temporary),
            match:matches(match_date, luogo)
        `);

    const { count: totalMatches, error: totalMatchesError } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

    let isAuthenticated = false;
    if (locals && locals.user) {
        isAuthenticated = true;
    }

    const playersWithStats = (players ?? []).map((player) => {
        const playerPMs = (playerMatches ?? []).filter(
            (pm) => pm.player.player_id === player.player_id
        );

        const goals = playerPMs.reduce((sum, pm) => sum + (pm.goals || 0), 0);
        const wins = playerPMs.filter((pm) => pm.is_winner).length;
        const matchesPlayed = playerPMs.length;
        const winRate =
            matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
        const golPerMatch =
            matchesPlayed > 0 ? (goals / matchesPlayed).toFixed(2) : 0;
        const autogols = playerPMs.reduce(
            (sum, pm) => sum + (pm.autogol || 0),
            0
        );

        return {
            ...player,
            goals,
            wins,
            matchesPlayed,
            winRate,
            golPerMatch,
            autogols,
        };
    });

    return {
        players: playersWithStats,
        playerMatches: playerMatches ?? [],
        isAuthenticated,
        error: playersError || playerMatchesError,
    };
}
