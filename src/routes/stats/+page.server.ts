import { supabase } from "$lib/supabaseClient";

function normalizeSeasonFilter(raw: string | null, seasonValues: string[]) {
    if (!raw || raw === "all") return "all";
    if (raw === "__none__") return "__none__";
    return seasonValues.includes(raw) ? raw : "all";
}

function matchSeasonForRow(row: any) {
    const matchRow = Array.isArray(row?.match) ? row.match[0] : row?.match;
    return matchRow?.season?.trim?.() || matchRow?.season || null;
}

function playerForRow(row: any) {
    return Array.isArray(row?.player) ? row.player[0] : row?.player;
}

export async function load({ locals, url }: { locals: any; url: URL }) {
    const { data: seasonRows } = await supabase
        .from("matches")
        .select("season, match_date")
        .order("match_date", { ascending: false });

    const seasonOptions = Array.from(
        new Set(
            (seasonRows ?? [])
                .map((row) => row.season?.trim())
                .filter((season): season is string => Boolean(season))
        )
    ).map((season) => ({ value: season, label: season }));

    const selectedSeason = normalizeSeasonFilter(
        url.searchParams.get("season"),
        seasonOptions.map((season) => season.value)
    );

    const statsPromise = Promise.all([
        supabase.from("players").select("*"),
        supabase.from("player_match").select(`
            goals,
            is_winner,
            autogol,
            player:players(name, player_id, is_temporary),
            match:matches(match_date, luogo, season)
        `)
    ]).then(([playersRes, matchesRes]) => {
        const players = playersRes.data ?? [];
        const playerMatchesAll = (matchesRes.data ?? []).map((pm) => ({
            ...pm,
            player: playerForRow(pm),
            match: Array.isArray(pm?.match) ? pm.match[0] : pm?.match,
        }));

        const playerMatches =
            selectedSeason === "all"
                ? playerMatchesAll
                : playerMatchesAll.filter((pm) => {
                      const season = matchSeasonForRow(pm);
                      if (selectedSeason === "__none__") return !season;
                      return season === selectedSeason;
                  });

        const playersWithStats = players.map((player) => {
            const playerPMs = playerMatches.filter(
                (pm) => playerForRow(pm)?.player_id === player.player_id
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

    let isAuthenticated = false;
    if (locals && locals.user) {
        isAuthenticated = true;
    }

    return {
        streamed: {
            stats: statsPromise
        },
        seasonOptions,
        selectedSeason,
        isAuthenticated,
        error: null,
    };
}
