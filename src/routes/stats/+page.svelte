<script lang="ts">
    import {
        BarChart,
        Highlight,
        type ChartContextValue,
        LineChart,
    } from "layerchart";
    import { scaleBand, scalePoint, scaleLinear } from "d3-scale";
    import { curveMonotoneX } from "d3-shape";
    import * as Chart from "$lib/components/ui/chart/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { cubicInOut } from "svelte/easing";
    import { onMount } from "svelte";

    const { data } = $props();
    let context = $state<ChartContextValue>();
    let showTemporary = $state(false);
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

    let maxGoalsRank = 1;
    let maxMatchesRank = 1;

    $effect(() => {
        maxGoalsRank = Math.max(
            1,
            ...filteredPlayers.map((p) => Number(p.goals) || 0)
        );
        maxMatchesRank = Math.max(
            1,
            ...filteredPlayers.map((p) => Number(p.matchesPlayed) || 0)
        );
    });

    const yScale = scaleLinear()
        .domain([0, maxGoalsRank * 1.2])
        .nice();

    let goalsByPlaceData = $state<Array<any>>([]);
    let goalsByPlaceConfig = $state<any>({});

    $effect(() => {
        if (!Array.isArray(playerMatches) || !Array.isArray(filteredPlayers))
            return;

        const places = Array.from(
            new Set(playerMatches.map((pm) => pm.match.luogo))
        );

        goalsByPlaceData = filteredPlayers.map((player) => {
            const playerPMs = playerMatches.filter(
                (pm) => pm.player.player_id === player.player_id
            );

            const goalsPerPlace: Record<string, number> = {};
            for (const place of places) {
                goalsPerPlace[place] = playerPMs
                    .filter((pm) => pm.match.luogo === place)
                    .reduce((sum, pm) => sum + (pm.goals || 0), 0);
            }

            return { name: player.name, ...goalsPerPlace };
        });

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

    let activeSeries = $state<Set<string>>(new Set());

    $effect(() => {
        const keys = Object.keys(lineChartConfig ?? {});
        activeSeries = new Set(keys);
    });

    let visibleSeries = $state<
        Array<{ key: string; label: string; color: string }>
    >([]);
    $effect(() => {
        visibleSeries = Array.from(activeSeries).map((key) => ({
            key,
            label: lineChartConfig[key].label,
            color: lineChartConfig[key].color,
        }));
    });

    function toggleSeries(key: string, e?: MouseEvent) {
        if (!lineChartConfig?.[key]) return;
        if (e?.shiftKey) {
            activeSeries = new Set([key]);
            return;
        }
        const next = new Set(activeSeries);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        activeSeries = next;
    }

    function toggleAllSeries() {
        const keys = Object.keys(lineChartConfig ?? {});
        if (activeSeries.size === keys.length) {
            activeSeries = new Set();
        } else {
            activeSeries = new Set(keys);
        }
    }

    onMount(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("stats:showTemporary");
        if (saved != null) showTemporary = saved === "1";
    });

    $effect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem("stats:showTemporary", showTemporary ? "1" : "0");
    });
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
        <button
            type="button"
            class="px-4 py-2 rounded-2xl font-semibold border transition-all duration-300 hover:bg-primary hover:scale-105 hover:text-white"
            class:bg-primary={showTemporary}
            class:text-white={showTemporary}
            onclick={() => (showTemporary = !showTemporary)}
            aria-pressed={showTemporary}
            title={showTemporary ? "Nascondi temporanei" : "Mostra temporanei"}
        >
            {showTemporary ? "Includi temporanei" : "Escludi temporanei"}
        </button>
    </div>

    {#if selectedTab === "goals"}
        <Card.Root class="mb-6">
            <Card.Header>
                <Card.Title>Classifica Gol</Card.Title>
                <Card.Description>Ranking con progress bar</Card.Description>
            </Card.Header>

            <Card.Content class="p-0 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead
                            class="sticky top-0 bg-background/90 backdrop-blur z-10"
                        >
                            <tr class="text-muted-foreground">
                                <th class="px-4 py-3 w-16">Pos</th>
                                <th class="px-4 py-3">Giocatore</th>
                                <th class="px-4 py-3 text-right w-28">Gol</th>
                            </tr>
                        </thead>

                        <tbody>
                            {#each [...filteredPlayers].sort((a, b) => b.goals - a.goals) as player, i}
                                {@const goals = Number(player.goals) || 0}
                                {@const pct = Math.max(
                                    0,
                                    Math.min(100, (goals / maxGoalsRank) * 100)
                                )}
                                <tr
                                    class="group odd:bg-muted/30 even:bg-background hover:bg-accent/40 transition-colors"
                                >
                                    <td class="px-4 py-3 font-medium">
                                        {#if i === 0}
                                            🥇
                                        {/if}
                                        {#if i === 1}
                                            🥈
                                        {/if}
                                        {#if i === 2}
                                            🥉
                                        {/if}
                                        {#if i > 2}{i + 1}{/if}
                                    </td>

                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs"
                                            >
                                                {player.name?.[0] ?? "?"}
                                            </span>
                                            <div class="min-w-0">
                                                <div class="truncate">
                                                    {player.name}
                                                </div>
                                                <div
                                                    class="mt-1 h-1.5 w-44 rounded bg-muted"
                                                >
                                                    <div
                                                        class="h-1.5 rounded bg-primary transition-all"
                                                        style={`width:${pct}%`}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td
                                        class="px-4 py-3 text-right tabular-nums"
                                    >
                                        {goals}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if selectedTab === "presenze"}
        <Card.Root class="mb-6 w-full">
            <Card.Header>
                <Card.Title>Classifica Presenze</Card.Title>
                <Card.Description
                    >Presenze normalizzate con progress bar</Card.Description
                >
            </Card.Header>

            <Card.Content class="p-0 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead
                            class="sticky top-0 bg-background/90 backdrop-blur z-10"
                        >
                            <tr class="text-muted-foreground">
                                <th class="px-4 py-3 w-16">Pos</th>
                                <th class="px-4 py-3">Giocatore</th>
                                <th class="px-4 py-3 text-right w-32"
                                    >Presenze</th
                                >
                            </tr>
                        </thead>

                        <tbody>
                            {#each [...filteredPlayers].sort((a, b) => b.matchesPlayed - a.matchesPlayed) as player, i}
                                {@const pres =
                                    Number(player.matchesPlayed) || 0}
                                {@const pct = Math.max(
                                    0,
                                    Math.min(100, (pres / maxMatchesRank) * 100)
                                )}
                                <tr
                                    class="group odd:bg-muted/30 even:bg-background hover:bg-accent/40 transition-colors"
                                >
                                    <td class="px-4 py-3 font-medium">
                                        {#if i === 0}
                                            🥇
                                        {/if}
                                        {#if i === 1}
                                            🥈
                                        {/if}
                                        {#if i === 2}
                                            🥉
                                        {/if}
                                        {#if i > 2}{i + 1}{/if}
                                    </td>

                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs"
                                            >
                                                {player.name?.[0] ?? "?"}
                                            </span>
                                            <div class="min-w-0">
                                                <div class="truncate">
                                                    {player.name}
                                                </div>
                                                <div
                                                    class="mt-1 h-1.5 w-44 rounded bg-muted"
                                                >
                                                    <div
                                                        class="h-1.5 rounded bg-primary/70 transition-all"
                                                        style={`width:${pct}%`}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td
                                        class="px-4 py-3 text-right tabular-nums"
                                        >{pres}</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if selectedTab === "winrate"}
        <Card.Root class="mb-6">
            <Card.Header>
                <Card.Title>Classifica Winrate</Card.Title>
                <Card.Description>Percentuali con progress bar</Card.Description
                >
            </Card.Header>

            <Card.Content class="p-0 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead
                            class="sticky top-0 bg-background/90 backdrop-blur z-10"
                        >
                            <tr class="text-muted-foreground">
                                <th class="px-4 py-3 w-16">Pos</th>
                                <th class="px-4 py-3">Giocatore</th>
                                <th class="px-4 py-3 text-right w-32"
                                    >Winrate</th
                                >
                            </tr>
                        </thead>

                        <tbody>
                            {#each [...filteredPlayers].sort((a, b) => b.winRate - a.winRate) as player, i}
                                {@const wr = Math.max(
                                    0,
                                    Math.min(100, Number(player.winRate) || 0)
                                )}
                                <tr
                                    class="group odd:bg-muted/30 even:bg-background hover:bg-accent/40 transition-colors"
                                >
                                    <td class="px-4 py-3 font-medium">
                                        {#if i === 0}
                                            🥇
                                        {/if}
                                        {#if i === 1}
                                            🥈
                                        {/if}
                                        {#if i === 2}
                                            🥉
                                        {/if}
                                        {#if i > 2}{i + 1}{/if}
                                    </td>

                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <span
                                                class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs"
                                            >
                                                {player.name?.[0] ?? "?"}
                                            </span>
                                            <div class="min-w-0">
                                                <div class="truncate">
                                                    {player.name}
                                                </div>
                                                <div
                                                    class="mt-1 h-1.5 w-44 rounded bg-muted"
                                                >
                                                    <div
                                                        class="h-1.5 rounded bg-primary/60 transition-all"
                                                        style={`width:${wr}%`}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td
                                        class="px-4 py-3 text-right tabular-nums"
                                        >{wr}%</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    {#if selectedTab === "graphs"}
        <section
            class="mb-6 w-full max-w-7xl mx-auto border rounded-xl p-6 shadow-sm"
        >
            <h2 class="text-2xl font-bold mb-2">Gol e Autogol (Stacked)</h2>
            <p class="text-muted-foreground mb-6">
                Visualizza i gol totali di ogni giocatore, compresi gli autogol
            </p>
            <div class="w-full max-w-[1200px] mx-auto aspect-[16/9]">
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

        <section
            class="mb-6 w-full max-w-7xl mx-auto border rounded-xl p-6 shadow-sm"
        >
            <h2 class="text-2xl font-bold mb-2">Andamento Gol per Giocatore</h2>
            <p class="text-muted-foreground mb-6">
                Gol segnati nel tempo per ciascun giocatore
            </p>
            <div class="w-full max-w-[1200px] mx-auto aspect-[16/9]">
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
                        series={visibleSeries}
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
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip hideLabel />
                        {/snippet}
                    </LineChart>
                </Chart.Container>
            </div>
            <div class="flex flex-wrap gap-4 justify-center mt-2">
                {#each Object.keys(lineChartConfig) as key}
                    <button
                        type="button"
                        class="flex items-center gap-2 select-none transition-opacity"
                        class:opacity-50={!activeSeries.has(key)}
                        onclick={(e) => toggleSeries(key, e)}
                        onkeydown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            toggleSeries(key, e)}
                        role="switch"
                        aria-checked={activeSeries.has(key)}
                    >
                        <span
                            class="w-4 h-4 rounded"
                            style="background: {lineChartConfig[key].color}"
                        />
                        <span class="text-sm">{lineChartConfig[key].label}</span
                        >
                    </button>
                {/each}

                <button
                    type="button"
                    class="flex items-center gap-2 select-none transition-opacity"
                    role="switch"
                    onclick={toggleAllSeries}
                    aria-pressed={activeSeries.size ===
                        Object.keys(lineChartConfig ?? {}).length}
                >
                    <span class="w-4 h-4 rounded" style="background: black" />
                    <span class="text-sm"
                        >{activeSeries.size ===
                        Object.keys(lineChartConfig ?? {}).length
                            ? "Deseleziona tutti"
                            : "Seleziona tutti"}
                    </span>
                </button>
            </div>
        </section>

        <section
            class="mb-6 w-full max-w-7xl mx-auto border rounded-xl p-6 shadow-sm"
        >
            <h2 class="text-2xl font-bold mb-2">Gol per Giocatore e Luogo</h2>
            <p class="text-muted-foreground mb-6">
                Distribuzione dei gol per ciascun giocatore in base al luogo
                della partita
            </p>
            <div class="w-full max-w-[1200px] mx-auto aspect-[16/9]">
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
                        seriesLayout="stack"
                        props={{
                            bars: {
                                stroke: "none",
                                strokeWidth: 0,
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
</div>
