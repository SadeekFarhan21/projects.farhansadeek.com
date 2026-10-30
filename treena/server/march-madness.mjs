#!/usr/bin/env node
/**
 * March Madness Bracket Predictor
 *
 * Uses historical seed-vs-seed upset probabilities to simulate the
 * entire 64-team NCAA tournament.  Run it multiple times for different
 * outcomes — or crank up the CHAOS factor for wilder brackets.
 *
 * Usage:
 *   node march-madness.mjs              # default bracket
 *   node march-madness.mjs --chaos 0.3  # more upsets  (0 = chalk, 1 = coin-flip)
 *   node march-madness.mjs --sims 10000 # Monte-Carlo mode — shows % chance each team wins it all
 */

// ────────────────────────────────────────────
// 1.  CONFIGURATION
// ────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const CHAOS  = parseFloat(flag("chaos") ?? "0.12");   // 0 = pure seed, 1 = coin-flip
const SIMS   = parseInt(flag("sims")  ?? "0", 10);    // 0 = single bracket, >0 = Monte-Carlo

// ────────────────────────────────────────────
// 2.  HISTORICAL SEED-WIN PROBABILITIES (Round 1)
//     Source: aggregated NCAA tournament data 1985-2025
//     Key = "higherSeed-lowerSeed", value = P(higher seed wins)
// ────────────────────────────────────────────
const HISTORICAL_R1 = {
  "1-16": 0.99, "2-15": 0.94, "3-14": 0.85, "4-13": 0.79,
  "5-12": 0.65, "6-11": 0.62, "7-10": 0.61, "8-9":  0.52,
};

/**
 * Returns P(teamA beats teamB) based on seeds + chaos factor.
 * The model blends historical seed-edge toward 0.50 as chaos rises.
 */
function winProbability(seedA, seedB) {
  const better = Math.min(seedA, seedB);
  const worse  = Math.max(seedA, seedB);

  // Start with a base from historical first-round data, or estimate
  const key = `${better}-${worse}`;
  let base = HISTORICAL_R1[key];

  if (base == null) {
    // For later-round matchups not in the table, estimate from seed diff
    const diff = worse - better;
    base = 0.50 + diff * 0.03;           // ~3 % per seed gap
    base = Math.min(base, 0.97);
  }

  // Blend toward coin-flip by CHAOS factor
  const adjusted = base * (1 - CHAOS) + 0.50 * CHAOS;
  return seedA <= seedB ? adjusted : 1 - adjusted;
}

// ────────────────────────────────────────────
// 3.  2026 BRACKET (placeholder names — swap in real teams!)
//     Each region has 16 teams ordered 1-seed through 16-seed.
// ────────────────────────────────────────────
const REGIONS = {
  East: [
    { seed: 1,  name: "Duke" },
    { seed: 2,  name: "Alabama" },
    { seed: 3,  name: "Wisconsin" },
    { seed: 4,  name: "Arizona" },
    { seed: 5,  name: "Oregon" },
    { seed: 6,  name: "St. John's" },
    { seed: 7,  name: "Marquette" },
    { seed: 8,  name: "Louisville" },
    { seed: 9,  name: "Georgia" },
    { seed: 10, name: "Vanderbilt" },
    { seed: 11, name: "VCU" },
    { seed: 12, name: "Liberty" },
    { seed: 13, name: "Yale" },
    { seed: 14, name: "Lipscomb" },
    { seed: 15, name: "Robert Morris" },
    { seed: 16, name: "American" },
  ],
  West: [
    { seed: 1,  name: "Florida" },
    { seed: 2,  name: "St. Mary's" },
    { seed: 3,  name: "Baylor" },
    { seed: 4,  name: "Purdue" },
    { seed: 5,  name: "Clemson" },
    { seed: 6,  name: "Illinois" },
    { seed: 7,  name: "UCLA" },
    { seed: 8,  name: "Gonzaga" },
    { seed: 9,  name: "McNeese" },
    { seed: 10, name: "Arkansas" },
    { seed: 11, name: "Drake" },
    { seed: 12, name: "UC San Diego" },
    { seed: 13, name: "High Point" },
    { seed: 14, name: "N. Dakota St." },
    { seed: 15, name: "Omaha" },
    { seed: 16, name: "Norfolk State" },
  ],
  South: [
    { seed: 1,  name: "Auburn" },
    { seed: 2,  name: "Michigan St." },
    { seed: 3,  name: "Iowa State" },
    { seed: 4,  name: "Texas A&M" },
    { seed: 5,  name: "Michigan" },
    { seed: 6,  name: "BYU" },
    { seed: 7,  name: "Mississippi St." },
    { seed: 8,  name: "Ole Miss" },
    { seed: 9,  name: "Memphis" },
    { seed: 10, name: "San Diego St." },
    { seed: 11, name: "Xavier" },
    { seed: 12, name: "Troy" },
    { seed: 13, name: "UNC Wilmington" },
    { seed: 14, name: "Montana" },
    { seed: 15, name: "Colgate" },
    { seed: 16, name: "Alabama State" },
  ],
  Midwest: [
    { seed: 1,  name: "Houston" },
    { seed: 2,  name: "Tennessee" },
    { seed: 3,  name: "Kentucky" },
    { seed: 4,  name: "Texas Tech" },
    { seed: 5,  name: "Maryland" },
    { seed: 6,  name: "Missouri" },
    { seed: 7,  name: "Kansas" },
    { seed: 8,  name: "UConn" },
    { seed: 9,  name: "Creighton" },
    { seed: 10, name: "New Mexico" },
    { seed: 11, name: "Colorado St." },
    { seed: 12, name: "Grand Canyon" },
    { seed: 13, name: "Vermont" },
    { seed: 14, name: "Akron" },
    { seed: 15, name: "Nebraska-Omaha" },
    { seed: 16, name: "SIUE" },
  ],
};

// ────────────────────────────────────────────
// 4.  BRACKET SIMULATION
// ────────────────────────────────────────────

/** Simulate one game. Returns the winner. */
function play(a, b) {
  const p = winProbability(a.seed, b.seed);
  return Math.random() < p ? a : b;
}

/** Standard NCAA bracket ordering: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15 */
function bracketOrder(teams) {
  const s = (n) => teams.find((t) => t.seed === n);
  return [
    [s(1), s(16)], [s(8), s(9)],
    [s(5), s(12)], [s(4), s(13)],
    [s(6), s(11)], [s(3), s(14)],
    [s(7), s(10)], [s(2), s(15)],
  ];
}

/** Simulate a region through the Elite Eight. Returns [winner, roundResults]. */
function simRegion(teams) {
  const rounds = [];
  let matchups = bracketOrder(teams);

  for (let round = 0; round < 4; round++) {
    const winners = [];
    const results = [];
    for (const [a, b] of matchups) {
      const w = play(a, b);
      const l = w === a ? b : a;
      winners.push(w);
      results.push({ winner: w, loser: l });
    }
    rounds.push(results);
    // Pair up winners for next round
    matchups = [];
    for (let i = 0; i < winners.length; i += 2) {
      matchups.push([winners[i], winners[i + 1]]);
    }
  }
  return { champion: matchups.length === 0 ? rounds.at(-1)[0].winner : null, rounds };
}

/** Simulate the full tournament. Returns structured results. */
function simTournament() {
  const regionNames = Object.keys(REGIONS);
  const regionResults = {};
  const finalFour = [];

  for (const name of regionNames) {
    const res = simRegion(REGIONS[name]);
    regionResults[name] = res.rounds;
    finalFour.push(res.rounds.at(-1)[0].winner);
  }

  // Final Four:  East vs West,  South vs Midwest  (standard pairing)
  const semi1 = play(finalFour[0], finalFour[1]);
  const semi1Loser = semi1 === finalFour[0] ? finalFour[1] : finalFour[0];
  const semi2 = play(finalFour[2], finalFour[3]);
  const semi2Loser = semi2 === finalFour[2] ? finalFour[3] : finalFour[2];

  const champion = play(semi1, semi2);
  const runnerUp = champion === semi1 ? semi2 : semi1;

  return {
    regionResults,
    finalFour,
    semis: [
      { winner: semi1, loser: semi1Loser },
      { winner: semi2, loser: semi2Loser },
    ],
    championship: { winner: champion, loser: runnerUp },
  };
}

// ────────────────────────────────────────────
// 5.  DISPLAY
// ────────────────────────────────────────────
const ROUND_NAMES = ["Round of 64", "Round of 32", "Sweet 16", "Elite Eight"];
const tag = (t) => `(${t.seed}) ${t.name}`;

function printBracket(result) {
  console.log("\n🏀  MARCH MADNESS 2026 — PREDICTED BRACKET");
  console.log("=".repeat(56));
  console.log(`   Chaos factor: ${(CHAOS * 100).toFixed(0)}%\n`);

  for (const [region, rounds] of Object.entries(result.regionResults)) {
    console.log(`\n── ${region.toUpperCase()} REGION ${"─".repeat(38 - region.length)}`);
    for (let r = 0; r < rounds.length; r++) {
      console.log(`\n  ${ROUND_NAMES[r]}:`);
      for (const g of rounds[r]) {
        const upset = g.winner.seed > g.loser.seed;
        console.log(`    ${tag(g.winner)} over ${tag(g.loser)}${upset ? "  ⬆ UPSET" : ""}`);
      }
    }
  }

  console.log(`\n${"═".repeat(56)}`);
  console.log("  FINAL FOUR");
  console.log("═".repeat(56));
  console.log(`  ${result.finalFour.map(tag).join("  |  ")}`);

  console.log("\n  Semifinals:");
  for (const s of result.semis) {
    console.log(`    ${tag(s.winner)} over ${tag(s.loser)}`);
  }

  console.log("\n  🏆 CHAMPIONSHIP:");
  console.log(`    ${tag(result.championship.winner)} over ${tag(result.championship.loser)}`);
  console.log(`\n  👑 NATIONAL CHAMPION:  ${tag(result.championship.winner)}`);
  console.log();
}

// ────────────────────────────────────────────
// 6.  MONTE-CARLO MODE
// ────────────────────────────────────────────
function monteCarlo(n) {
  const wins = {};
  const finalFours = {};

  for (let i = 0; i < n; i++) {
    const r = simTournament();
    const champ = r.championship.winner.name;
    wins[champ] = (wins[champ] || 0) + 1;
    for (const t of r.finalFour) {
      finalFours[t.name] = (finalFours[t.name] || 0) + 1;
    }
  }

  const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  const sortedFF = Object.entries(finalFours).sort((a, b) => b[1] - a[1]);

  console.log(`\n🏀  MARCH MADNESS 2026 — MONTE-CARLO (${n.toLocaleString()} simulations)`);
  console.log(`   Chaos factor: ${(CHAOS * 100).toFixed(0)}%`);
  console.log("=".repeat(56));

  console.log("\n  Championship win probability:");
  for (const [team, count] of sorted.slice(0, 20)) {
    const pct = ((count / n) * 100).toFixed(1).padStart(5);
    const bar = "█".repeat(Math.round((count / n) * 60));
    console.log(`    ${pct}%  ${bar}  ${team}`);
  }

  console.log("\n  Final Four appearance probability (top 16):");
  for (const [team, count] of sortedFF.slice(0, 16)) {
    const pct = ((count / n) * 100).toFixed(1).padStart(5);
    const bar = "▓".repeat(Math.round((count / n) * 40));
    console.log(`    ${pct}%  ${bar}  ${team}`);
  }
  console.log();
}

// ────────────────────────────────────────────
// 7.  RUN
// ────────────────────────────────────────────
if (SIMS > 0) {
  monteCarlo(SIMS);
} else {
  printBracket(simTournament());
}
