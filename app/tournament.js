const roundNames = ["1/16 финала", "1/8 финала", "Четвертьфинал", "Полуфинал", "Финал"];

function randomFrom(value) {
  let hash = 2166136261;
  const input = String(value);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6D2B79F5;
    let number = hash;
    number = Math.imul(number ^ (number >>> 15), number | 1);
    number ^= number + Math.imul(number ^ (number >>> 7), number | 61);
    return ((number ^ (number >>> 14)) >>> 0) / 4294967296;
  };
}

function goalsFor(rating, opponentRating, random, attackBoost = 0, defensePenalty = 0) {
  const strength = 1.15 + (rating - 74) * 0.045 - (opponentRating - 74) * 0.025 + attackBoost + defensePenalty;
  const expected = Math.max(0.28, Math.min(3.2, strength));
  let goals = 0;
  for (let chance = 0; chance < 5; chance += 1) {
    const threshold = Math.max(0.04, expected / (6.3 + chance * 1.4));
    if (random() < threshold) goals += 1;
  }
  return Math.min(5, goals);
}

export function simulateMatch(homeRating, awayRating, key, tactic = "balanced", knockout = false) {
  const random = randomFrom(key);
  const userAttack = tactic === "attack" ? 0.32 : tactic === "defensive" ? -0.2 : 0.05;
  const userRisk = tactic === "attack" ? 0.23 : tactic === "defensive" ? -0.22 : 0;
  let homeGoals = goalsFor(homeRating, awayRating, random, userAttack, 0);
  let awayGoals = goalsFor(awayRating, homeRating, random, 0, userRisk);
  let penalties = null;

  if (knockout && homeGoals === awayGoals) {
    const homeChance = Math.max(0.3, Math.min(0.7, 0.5 + (homeRating - awayRating) * 0.012));
    const homeWon = random() < homeChance;
    const loserPens = 2 + Math.floor(random() * 3);
    penalties = homeWon ? [loserPens + 1, loserPens] : [loserPens, loserPens + 1];
  }

  return { homeGoals, awayGoals, penalties };
}

export function buildGroupFixtures(teams, userTeamId, seed) {
  const fixtures = [];
  const groups = [...new Set(teams.map((team) => team.group))].sort();
  const pairIndexes = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

  for (const group of groups) {
    const groupTeams = teams.filter((team) => team.group === group);
    pairIndexes.forEach(([homeIndex, awayIndex], matchIndex) => {
      const home = groupTeams[homeIndex];
      const away = groupTeams[awayIndex];
      const hasUser = home.id === userTeamId || away.id === userTeamId;
      const result = hasUser ? null : simulateMatch(home.rating, away.rating, `${seed}-group-${group}-${matchIndex}`);
      fixtures.push({
        id: `${group}-${matchIndex}`,
        group,
        matchday: Math.floor(matchIndex / 2) + 1,
        homeId: home.id,
        awayId: away.id,
        result,
      });
    });
  }
  return fixtures;
}

export function calculateTables(teams, fixtures) {
  const tables = {};
  for (const group of [...new Set(teams.map((team) => team.group))].sort()) {
    const rows = teams
      .filter((team) => team.group === group)
      .map((team) => ({ teamId: team.id, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }));

    for (const fixture of fixtures.filter((item) => item.group === group && item.result)) {
      const home = rows.find((row) => row.teamId === fixture.homeId);
      const away = rows.find((row) => row.teamId === fixture.awayId);
      const { homeGoals, awayGoals } = fixture.result;
      home.played += 1;
      away.played += 1;
      home.gf += homeGoals;
      home.ga += awayGoals;
      away.gf += awayGoals;
      away.ga += homeGoals;
      if (homeGoals > awayGoals) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else if (awayGoals > homeGoals) {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    }

    rows.forEach((row) => { row.gd = row.gf - row.ga; });
    rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId - b.teamId);
    tables[group] = rows;
  }
  return tables;
}

export function qualificationFromTables(tables) {
  const direct = Object.values(tables).flatMap((rows) => rows.slice(0, 2).map((row) => row.teamId));
  const third = Object.values(tables)
    .map((rows) => rows[2])
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    .slice(0, 8)
    .map((row) => row.teamId);
  return [...direct, ...third];
}

export function createKnockoutRound(teamIds, teams, userTeamId, userRating, seed, roundIndex) {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const ordered = [...teamIds].sort((a, b) => {
    const aRating = a === userTeamId ? userRating : byId.get(a).rating;
    const bRating = b === userTeamId ? userRating : byId.get(b).rating;
    return bRating - aRating;
  });
  const matches = [];
  while (ordered.length) {
    const homeId = ordered.shift();
    const awayId = ordered.pop();
    const hasUser = homeId === userTeamId || awayId === userTeamId;
    const homeRating = homeId === userTeamId ? userRating : byId.get(homeId).rating;
    const awayRating = awayId === userTeamId ? userRating : byId.get(awayId).rating;
    matches.push({
      id: `ko-${roundIndex}-${matches.length}`,
      homeId,
      awayId,
      result: hasUser ? null : simulateMatch(homeRating, awayRating, `${seed}-ko-${roundIndex}-${matches.length}`, "balanced", true),
    });
  }
  return { name: roundNames[roundIndex], index: roundIndex, matches };
}

export function winnerOf(match) {
  if (!match.result) return null;
  if (match.result.homeGoals > match.result.awayGoals) return match.homeId;
  if (match.result.awayGoals > match.result.homeGoals) return match.awayId;
  return match.result.penalties[0] > match.result.penalties[1] ? match.homeId : match.awayId;
}

export function playUserFixture(fixture, teams, userTeamId, userRating, seed, tactic, knockout = false) {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const userIsHome = fixture.homeId === userTeamId;
  const opponentId = userIsHome ? fixture.awayId : fixture.homeId;
  const opponentRating = byId.get(opponentId).rating;
  const userResult = simulateMatch(userRating, opponentRating, `${seed}-${fixture.id}-${tactic}`, tactic, knockout);
  const result = userIsHome
    ? userResult
    : {
        homeGoals: userResult.awayGoals,
        awayGoals: userResult.homeGoals,
        penalties: userResult.penalties ? [userResult.penalties[1], userResult.penalties[0]] : null,
      };
  return { ...fixture, result, tactic };
}

