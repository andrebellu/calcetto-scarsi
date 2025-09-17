import { supabase } from "$lib/supabaseClient";

export async function load() {
    const { data: playerMatches, error: playerMatchesError } = await supabase
        .from('matches')
        .select(`
            match_date,
            luogo,
            match_number,
            team_blue_score,
            team_red_score,
            player_match!inner (
                goals,
                autogol,
                is_winner,
                team,
                players (
                    name
                )
            )
        `)
        .order('match_date', { ascending: false })
        .order('match_number', { ascending: false });

    console.log("matches", playerMatches);

    if (playerMatchesError) {
        console.error("Error fetching data:", playerMatchesError);
        return {
            matches: null,
            error: playerMatchesError.message,
        };
    }

    return {
        matches: playerMatches,
        error: null,
    };
}