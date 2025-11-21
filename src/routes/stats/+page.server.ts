import { supabase } from "$lib/supabaseClient";

export async function load({ locals }: { locals: any }) {
    const statsPromise = Promise.all([
        supabase.from("players").select("*"),
        supabase.from("player_match").select(`
            goals,
            is_winner,
            autogol,
            player:players(name, player_id, is_temporary),
            match:matches(match_date, luogo)
        `)
    ]).then(([playersRes, matchesRes]) => {
        const players = playersRes.data ?? [];
        const playerMatches = matchesRes.data ?? [];

        const playersWithStats = players.map((player) => {
            const playerPMs = playerMatches.filter(
                (pm) => pm.player && pm.player.player_id === player.player_id
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
            playerMatches
        };
    });

    const { count: totalMatches, error: totalMatchesError } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true });

    let isAuthenticated = false;
    if (locals && locals.user) {
        isAuthenticated = true;
    }

    return {
        streamed: {
            stats: statsPromise
        },
        isAuthenticated,
        error: null,
    };
}
