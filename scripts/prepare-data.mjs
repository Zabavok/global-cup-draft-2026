import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = path.join(root, "data", "raw");
const output = path.join(root, "data", "game-data.json");

function parseCsv(filename) {
  const input = fs.readFileSync(path.join(raw, filename), "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

const toNumber = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

const sourceTeams = parseCsv("teams.csv");
const sourcePlayers = parseCsv("squads_and_players.csv");
const sourceStats = parseCsv("player_stats.csv");
const statsById = new Map(sourceStats.map((row) => [row.player_id, row]));

const teams = sourceTeams.map((row) => {
  const ranking = toNumber(row.fifa_ranking_pre_tournament, 100);
  const elo = toNumber(row.elo_rating, 1500);
  const teamRating = Math.round(Math.max(64, Math.min(92, 64 + (elo - 1500) / 24)));
  const coachRating = Math.round(Math.max(64, Math.min(90, teamRating - 1 + Math.max(0, 30 - ranking) / 20)));
  const coachPrice = Number(Math.max(3.5, Math.min(10, 3.5 + (coachRating - 62) * 0.2)).toFixed(1));
  return {
    id: toNumber(row.team_id),
    name: row.team_name,
    code: row.fifa_code,
    group: row.group_letter,
    confederation: row.confederation,
    ranking,
    elo,
    rating: teamRating,
    coach: {
      id: `coach-${row.team_id}`,
      name: row.manager_name,
      price: coachPrice,
      rating: coachRating,
    },
  };
});

const teamById = new Map(teams.map((team) => [team.id, team]));
const normalizeName = (value) => value
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase();

// Ключевые звёзды закреплены по шкале EA SPORTS FC 26.
// Остальные игроки рассчитываются по рыночной стоимости, опыту и свежей форме.
const ratingOverrides = [
  ["thibaut nicolas courtois", 89],
  ["ferran torres", 83],
  ["kylian mbappe", 91],
  ["erling braut haaland", 91],
  ["jude victor william bellingham", 90],
  ["rodrigo rodri", 90],
  ["virgil van dijk", 90],
  ["hamed mahrous mohamed salah", 91],
  ["lamine yamal", 89],
  ["masour ousmane dembele", 90],
  ["achraf hakimi", 89],
  ["florian richard wirtz", 89],
  ["pedro pedri", 89],
  ["declan rice", 89],
  ["harry edward kane", 89],
  ["lautaro javier martinez", 88],
  ["bukayo ayoyinka saka", 88],
  ["alexander isak", 88],
  ["kevin de bruyne", 87],
  ["lionel andres messi", 86],
  ["cristiano ronaldo", 85],
];

const players = sourcePlayers.map((row) => {
  const stats = statsById.get(row.player_id) ?? {};
  const marketValue = toNumber(row.market_value_eur);
  const marketM = marketValue / 1_000_000;
  const caps = toNumber(row.caps);
  const internationalGoals = toNumber(row.goals);
  const matches = toNumber(stats.matches_played);
  const starts = toNumber(stats.matches_started);
  const minutes = toNumber(stats.minutes_played);
  const tournamentGoals = toNumber(stats.goals);
  const assists = toNumber(stats.assists);
  const cleanSheets = toNumber(stats.clean_sheets);
  const saves = toNumber(stats.saves);
  const position = row.position;
  const team = teamById.get(toNumber(row.team_id));

  const valueSignal = 63 + Math.log10(Math.max(marketM, 0) + 1) * 8.8;
  const experience = Math.min(2.2, Math.log10(caps + 1) * 1.15);
  let form = Math.min(2.2, matches * 0.12 + starts * 0.09 + minutes / 1800 + tournamentGoals * 0.35 + assists * 0.25);
  if (position === "GK") form += Math.min(1.2, cleanSheets * 0.18 + saves * 0.012);
  const international = Math.min(1.2, Math.sqrt(Math.max(internationalGoals, 0)) * 0.13);
  const positionAdjustment = position === "GK" ? 3.5 : position === "DEF" ? 0.8 : 0;
  const calculatedRating = Math.round(Math.max(62, Math.min(90, valueSignal + experience + form + international + positionAdjustment)));
  const normalizedName = normalizeName(row.player_name);
  const override = ratingOverrides.find(([name]) => normalizedName.includes(name));
  const rating = override?.[1] ?? calculatedRating;
  const price = Number(Math.max(1.5, Math.min(20, 1.2 + (rating - 62) * 0.45 + Math.sqrt(Math.max(marketM, 0.1)) * 0.28)).toFixed(1));

  return {
    id: toNumber(row.player_id),
    name: row.player_name,
    teamId: team.id,
    team: team.name,
    code: team.code,
    position,
    club: row.club_team,
    price,
    rating,
    caps,
    internationalGoals,
    matches,
    minutes,
    tournamentGoals,
    assists,
  };
});

const payload = {
  meta: {
    title: "Global Cup Draft 2026",
    budget: 120,
    currency: "млн",
    players: players.length,
    teams: teams.length,
    updated: "2026-07-19",
    source: "Mominullptr/fifa-world-cup-2026-dataset",
    license: "CC0-1.0",
  },
  teams,
  players,
};

fs.writeFileSync(output, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Prepared ${players.length} players and ${teams.length} coaches (${Math.round(fs.statSync(output).size / 1024)} KiB).`);
