<script lang="ts">
    import {
        BarChart,
        Highlight,
        type ChartContextValue,
        LineChart,
    } from "layerchart";
    import { scaleBand, scalePoint } from "d3-scale";
    import { curveMonotoneX } from "d3-shape";
    import * as Chart from "$lib/components/ui/chart/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { cubicInOut } from "svelte/easing";
    import { scaleLinear } from "d3-scale";

    const { data } = $props();
    let context = $state<ChartContextValue>();
    let showTemporary = false;
    let filteredPlayers = $state<Array<any>>([]);
    let playerMatches = data.playerMatches;

    $effect(() => {
        filteredPlayers = Array.isArray(data?.players)
            ? data.players.filter((p) => showTemporary || !p.is_temporary)
            : [];
    });

    $effect(() => {
        barChartData = filteredPlayers.map((p) => ({
            name: p.name,
            goals: p.goals,
            autogols: p.autogols,
        }));
    });

    let barChartData = $state<
        Array<{ name: string; goals: number; autogols: number }>
    >([]);

    const barChartConfig = {
        goal: { label: "goal", color: "var(--chart-1)" },
        autogol: { label: "autogol", color: "var(--chart-2)" },
    } satisfies Chart.ChartConfig;

    let lineChartData = $state<Array<any>>([]);
    let lineChartConfig = $state<any>({});

    $effect(() => {
        if (!Array.isArray(playerMatches) || !Array.isArray(filteredPlayers))
            return;

        const dateSet = new Set<string>();
        for (const pm of playerMatches) {
            const pmDate = new Date(pm.match.match_date);
            const dStr = pmDate.toISOString().split("T")[0];
            dateSet.add(dStr);
        }
        const sortedDates = Array.from(dateSet).sort((a, b) =>
            a.localeCompare(b)
        );

        const cumulative = new Map<string, number>();
        const rows: Array<any> = [];

        const matchesByDate = new Map<string, Array<any>>();
        for (const pm of playerMatches) {
            const matchObj = Array.isArray(pm.match) ? pm.match[0] : pm.match;
            const dStr = new Date(matchObj.match_date)
                .toISOString()
                .split("T")[0];
            if (!matchesByDate.has(dStr)) matchesByDate.set(dStr, []);
            matchesByDate.get(dStr)!.push(pm);
        }

        for (const dStr of sortedDates) {
            const row: any = { date: new Date(dStr) };
            const matchesToday = matchesByDate.get(dStr) ?? [];

            for (const p of filteredPlayers) {
                const name = p.name;
                const prev = cumulative.get(name) ?? 0;

                const sumToday = matchesToday
                    .filter((m) => m.player && m.player.name === name)
                    .reduce((s, m) => s + (Number(m.goals) || 0), 0);

                const newTotal = prev + sumToday;
                row[name] = newTotal;
                cumulative.set(name, newTotal);
            }
            rows.push(row);
        }

        lineChartData = rows;

        const colors = [
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
        ];

        lineChartConfig = Object.fromEntries(
            filteredPlayers.map((p, i) => [
                p.name,
                { label: p.name, color: colors[i % colors.length] },
            ])
        );
    });

    const maxGoals = Math.max(
        ...lineChartData.flatMap((row) =>
            Object.keys(lineChartConfig).map((k) => row[k] ?? 0)
        )
    );

    const yScale = scaleLinear()
        .domain([0, maxGoals * 1.2])
        .nice();

    let goalsByPlaceData = $state<Array<any>>([]);
    let goalsByPlaceConfig = $state<any>({});

    $effect(() => {
        if (!Array.isArray(playerMatches) || !Array.isArray(filteredPlayers))
            return;

        // Prendo tutti i luoghi unici
        const places = Array.from(
            new Set(playerMatches.map((pm) => pm.match.luogo))
        );

        // Costruisco righe: una per giocatore
        goalsByPlaceData = filteredPlayers.map((player) => {
            const playerPMs = playerMatches.filter(
                (pm) => pm.player.player_id === player.player_id
            );

            // Per ogni luogo conto i gol
            const goalsPerPlace: Record<string, number> = {};
            for (const place of places) {
                goalsPerPlace[place] = playerPMs
                    .filter((pm) => pm.match.luogo === place)
                    .reduce((sum, pm) => sum + (pm.goals || 0), 0);
            }

            return { name: player.name, ...goalsPerPlace };
        });

        // Config per colori
        const colors = [
            "#1f77b4",
            "#ff7f0e",
            "#2ca02c",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
        ];

        goalsByPlaceConfig = Object.fromEntries(
            places.map((place, i) => [
                place,
                { label: place, color: colors[i % colors.length] },
            ])
        );
    });

    let selectedTab = $state("goals");
</script>

<div class="max-w-3xl mx-auto py-8">
    <h1 class="text-3xl font-bold mb-6 text-primary-500">Statistiche</h1>
    <div class="flex gap-4 mb-6">
        <button
            class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white"
            class:bg-primary={selectedTab === "goals"}
            class:text-white={selectedTab === "goals"}
            class:scale-105={selectedTab === "goals"}
            onclick={() => (selectedTab = "goals")}>Classifica Gol</button
        >
        <button
            class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white"
            class:bg-primary={selectedTab === "presenze"}
            class:text-white={selectedTab === "presenze"}
            class:scale-105={selectedTab === "presenze"}
            onclick={() => (selectedTab = "presenze")}
            >Classifica Presenze</button
        >
        <button
            class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white"
            class:bg-primary={selectedTab === "winrate"}
            class:text-white={selectedTab === "winrate"}
            class:scale-105={selectedTab === "winrate"}
            onclick={() => (selectedTab = "winrate")}>Classifica Winrate</button
        >
        <button
            class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white"
            class:bg-primary={selectedTab === "graphs"}
            class:text-white={selectedTab === "graphs"}
            class:scale-105={selectedTab === "graphs"}
            onclick={() => (selectedTab = "graphs")}>Grafici Giocatore</button
        >
    </div>

    {#if selectedTab === "goals"}
        <Card.Root class="mb-6">
            <Card.Header><Card.Title>Classifica Gol</Card.Title></Card.Header>
            <Card.Content>
                <table class="w-full text-left">
                    <thead><tr><th>Giocatore</th><th>Gol</th></tr></thead>
                    <tbody>
                        {#each [...filteredPlayers].sort((a, b) => b.goals - a.goals) as player, i}
                            <tr>
                                <td>
                                    <span class="inline-block w-8 text-left"
                                        >{i + 1}.</span
                                    >
                                    <span class="pl-2">{player.name}</span>
                                </td>
                                <td>{player.goals}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if selectedTab === "presenze"}
        <Card.Root class="mb-6 w-full">
            <Card.Header
                ><Card.Title>Classifica Presenze</Card.Title></Card.Header
            >
            <Card.Content>
                <table class="w-full text-left">
                    <thead><tr><th>Giocatore</th><th>Presenze</th></tr></thead>
                    <tbody>
                        {#each [...filteredPlayers].sort((a, b) => b.matchesPlayed - a.matchesPlayed) as player, i}
                            <tr>
                                <td>
                                    <span class="inline-block w-8 text-left"
                                        >{i + 1}.</span
                                    >
                                    <span class="pl-2">{player.name}</span>
                                </td>
                                <td>{player.matchesPlayed}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if selectedTab === "graphs"}
        <section class="mb-6 w-full max-w-7xl mx-auto">
            <h2 class="text-2xl font-bold mb-2">Gol e Autogol (Stacked)</h2>
            <p class="text-muted-foreground mb-6">
                Visualizza i gol totali di ogni giocatore, compresi gli autogol
            </p>
            <div class="w-full max-w-[1200px] mx-auto h-[500px]">
                <Chart.Container
                    config={barChartConfig}
                    padding={{ top: 30, right: 20, bottom: 40, left: 50 }}
                >
                    <BarChart
                        bind:context
                        data={barChartData}
                        xScale={scaleBand().padding(0.25)}
                        x="name"
                        axis="x"
                        rule={false}
                        series={[
                            {
                                key: "goals",
                                label: "Goals",
                                color: barChartConfig.goal.color,
                            },
                            {
                                key: "autogols",
                                label: "Autogol",
                                color: barChartConfig.autogol.color,
                            },
                        ]}
                        seriesLayout="stack"
                        props={{
                            bars: {
                                stroke: "none",
                                initialY: context?.height,
                                initialHeight: 0,
                                motion: {
                                    y: {
                                        type: "tween",
                                        duration: 500,
                                        easing: cubicInOut,
                                    },
                                    height: {
                                        type: "tween",
                                        duration: 500,
                                        easing: cubicInOut,
                                    },
                                },
                            },
                            highlight: { area: false },
                        }}
                        legend
                    >
                        {#snippet belowMarks()}
                            <Highlight area={{ class: "fill-muted" }} />
                        {/snippet}
                        {#snippet tooltip()}
                            <Chart.Tooltip />
                        {/snippet}
                    </BarChart>
                </Chart.Container>
            </div>
        </section>

        <section class="mb-6 w-full max-w-7xl mx-auto">
            <h2 class="text-2xl font-bold mb-2">Andamento Gol per Giocatore</h2>
            <p class="text-muted-foreground mb-6">
                Gol segnati nel tempo per ciascun giocatore
            </p>
            <div class="w-full max-w-[1200px] mx-auto h-[500px]">
                <Chart.Container
                    config={lineChartConfig}
                    padding={{ top: 30, right: 20, bottom: 40, left: 50 }}
                >
                    <LineChart
                        data={lineChartData}
                        x="date"
                        xScale={scalePoint().domain(
                            lineChartData.map((d) => d.date)
                        )}
                        {yScale}
                        axis="x"
                        series={Object.keys(lineChartConfig).map((key) => ({
                            key,
                            label: lineChartConfig[key].label,
                            color: lineChartConfig[key].color,
                        }))}
                        props={{
                            spline: {
                                curve: curveMonotoneX,
                                motion: "tween",
                                strokeWidth: 2.5,
                            },
                            highlight: { points: { r: 4 } },
                            xAxis: {
                                format: (v: string) =>
                                    new Date(v).toLocaleDateString("it-IT", {
                                        day: "2-digit",
                                        month: "short",
                                    }),
                            },
                        }}
                        legend
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip hideLabel />
                        {/snippet}
                    </LineChart>
                </Chart.Container>
            </div>
        </section>

        <section class="mb-6 w-full max-w-7xl mx-auto">
            <h2 class="text-2xl font-bold mb-2">Gol per Giocatore e Luogo</h2>
            <p class="text-muted-foreground mb-6">
                Distribuzione dei gol per ciascun giocatore in base al luogo
                della partita
            </p>
            <div class="w-full max-w-[1200px] mx-auto h-[500px]">
                <Chart.Container config={goalsByPlaceConfig}>
                    <BarChart
                        bind:context
                        data={goalsByPlaceData}
                        xScale={scaleBand().padding(0.25)}
                        x="name"
                        axis="x"
                        series={Object.keys(goalsByPlaceConfig).map(
                            (place) => ({
                                key: place,
                                label: goalsByPlaceConfig[place].label,
                                color: goalsByPlaceConfig[place].color,
                            })
                        )}
                        x1Scale={scaleBand().paddingInner(0.2)}
                        seriesLayout="group"
                        props={{
                            bars: {
                                stroke: "none",
                                strokeWidth: 0,
                                rounded: "all",
                                initialY: context?.height,
                                initialHeight: 0,
                                motion: {
                                    y: {
                                        type: "tween",
                                        duration: 500,
                                        easing: cubicInOut,
                                    },
                                    height: {
                                        type: "tween",
                                        duration: 500,
                                        easing: cubicInOut,
                                    },
                                },
                            },
                            highlight: { area: { fill: "none" } },
                        }}
                        legend
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip />
                        {/snippet}
                    </BarChart>
                </Chart.Container>
            </div>
        </section>
    {/if}

    {#if selectedTab === "winrate"}
        <Card.Root class="mb-6">
            <Card.Header
                ><Card.Title>Classifica Winrate</Card.Title></Card.Header
            >
            <Card.Content>
                <table class="w-full text-left">
                    <thead
                        ><tr><th>Giocatore</th><th>Winrate (%)</th></tr></thead
                    >
                    <tbody>
                        {#each [...filteredPlayers].sort((a, b) => b.winRate - a.winRate) as player, i}
                            <tr>
                                <td>
                                    <span class="inline-block w-8 text-left"
                                        >{i + 1}.</span
                                    >
                                    <span class="pl-2">{player.name}</span>
                                </td>
                                <td>{player.winRate}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </Card.Content>
        </Card.Root>
    {/if}
</div>
