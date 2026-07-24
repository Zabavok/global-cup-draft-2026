"use client";

import { useEffect, useMemo, useState } from "react";
import gameData from "@/data/game-data.json";
import {
  buildGroupFixtures,
  calculateTables,
  createKnockoutRound,
  playUserFixture,
  qualificationFromTables,
  simulateMatch,
  winnerOf,
} from "./tournament";

const MAX_PER_TEAM = 3;
const STORAGE_KEY = "global-cup-draft-v3";
const difficulties = {
  easy: { title: "Лёгкая", budget: 200, icon: "●", text: "Можно собрать почти звёздный состав" },
  normal: { title: "Обычная", budget: 120, icon: "◆", text: "Нужно выбирать между ценой и силой" },
  hard: { title: "Сложная", budget: 85, icon: "▲", text: "Каждый потраченный миллион важен" },
};

const formations = {
  "4-3-3": [
    ["gk", "GK", 50, 87],
    ["lb", "DEF", 14, 68], ["cb1", "DEF", 38, 72], ["cb2", "DEF", 62, 72], ["rb", "DEF", 86, 68],
    ["cm1", "MID", 23, 43], ["cm2", "MID", 50, 49], ["cm3", "MID", 77, 43],
    ["lw", "FWD", 18, 17], ["st", "FWD", 50, 12], ["rw", "FWD", 82, 17],
  ],
  "4-4-2": [
    ["gk", "GK", 50, 87],
    ["lb", "DEF", 14, 68], ["cb1", "DEF", 38, 72], ["cb2", "DEF", 62, 72], ["rb", "DEF", 86, 68],
    ["lm", "MID", 14, 41], ["cm1", "MID", 38, 47], ["cm2", "MID", 62, 47], ["rm", "MID", 86, 41],
    ["st1", "FWD", 36, 15], ["st2", "FWD", 64, 15],
  ],
  "3-5-2": [
    ["gk", "GK", 50, 87],
    ["cb1", "DEF", 22, 70], ["cb2", "DEF", 50, 73], ["cb3", "DEF", 78, 70],
    ["lm", "MID", 10, 42], ["cm1", "MID", 30, 48], ["cm2", "MID", 50, 43], ["cm3", "MID", 70, 48], ["rm", "MID", 90, 42],
    ["st1", "FWD", 36, 15], ["st2", "FWD", 64, 15],
  ],
  "4-2-3-1": [
    ["gk", "GK", 50, 88],
    ["lb", "DEF", 14, 70], ["cb1", "DEF", 38, 73], ["cb2", "DEF", 62, 73], ["rb", "DEF", 86, 70],
    ["dm1", "MID", 35, 53], ["dm2", "MID", 65, 53],
    ["am1", "MID", 18, 34], ["am2", "MID", 50, 31], ["am3", "MID", 82, 34],
    ["st", "FWD", 50, 12],
  ],
};

const countryNames = {
  MEX: "Мексика", RSA: "ЮАР", KOR: "Южная Корея", CZE: "Чехия",
  CAN: "Канада", BIH: "Босния и Герцеговина", QAT: "Катар", SUI: "Швейцария",
  BRA: "Бразилия", MAR: "Марокко", HAI: "Гаити", SCO: "Шотландия",
  USA: "США", PAR: "Парагвай", AUS: "Австралия", TUR: "Турция",
  GER: "Германия", CUW: "Кюрасао", CIV: "Кот-д’Ивуар", ECU: "Эквадор",
  NED: "Нидерланды", JPN: "Япония", SWE: "Швеция", TUN: "Тунис",
  BEL: "Бельгия", EGY: "Египет", IRN: "Иран", NZL: "Новая Зеландия",
  ESP: "Испания", CPV: "Кабо-Верде", KSA: "Саудовская Аравия", URU: "Уругвай",
  FRA: "Франция", SEN: "Сенегал", IRQ: "Ирак", NOR: "Норвегия",
  ARG: "Аргентина", ALG: "Алжир", AUT: "Австрия", JOR: "Иордания",
  POR: "Португалия", COD: "ДР Конго", UZB: "Узбекистан", COL: "Колумбия",
  ENG: "Англия", CRO: "Хорватия", GHA: "Гана", PAN: "Панама",
};

const flagIso = {
  MEX: "MX", RSA: "ZA", KOR: "KR", CZE: "CZ", CAN: "CA", BIH: "BA", QAT: "QA", SUI: "CH",
  BRA: "BR", MAR: "MA", HAI: "HT", SCO: "GB", USA: "US", PAR: "PY", AUS: "AU", TUR: "TR",
  GER: "DE", CUW: "CW", CIV: "CI", ECU: "EC", NED: "NL", JPN: "JP", SWE: "SE", TUN: "TN",
  BEL: "BE", EGY: "EG", IRN: "IR", NZL: "NZ", ESP: "ES", CPV: "CV", KSA: "SA", URU: "UY",
  FRA: "FR", SEN: "SN", IRQ: "IQ", NOR: "NO", ARG: "AR", ALG: "DZ", AUT: "AT", JOR: "JO",
  POR: "PT", COD: "CD", UZB: "UZ", COL: "CO", ENG: "GB", CRO: "HR", GHA: "GH", PAN: "PA",
};

const positionNames = { GK: "Вратарь", DEF: "Защитник", MID: "Полузащитник", FWD: "Нападающий" };
const shortPositionNames = { GK: "ВРТ", DEF: "ЗАЩ", MID: "ПЗ", FWD: "НАП" };
const tactics = {
  balanced: { title: "Баланс", text: "Без лишнего риска", icon: "◆" },
  attack: { title: "Атака", text: "Больше шансов и риска", icon: "▲" },
  defensive: { title: "Оборона", text: "Надёжнее сзади", icon: "▼" },
};

function flagAsset(code) {
  if (code === "SCO") return "gb-sct";
  if (code === "ENG") return "gb-eng";
  return (flagIso[code] ?? "un").toLowerCase();
}

function Flag({ code, className = "" }) {
  return <img className={`flag-image ${className}`} src={`./flags/${flagAsset(code)}.png`} alt="" loading="lazy" />;
}

function teamName(team) {
  return countryNames[team?.code] ?? team?.name ?? "—";
}

function formatMoney(value) {
  return `${Number(value.toFixed(1)).toLocaleString("ru-RU")} млн`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function addMatchReport(fixture, teams, allPlayers, userTeamId, userPlayers, userRating, tactic, knockout) {
  const home = teams.find((team) => team.id === fixture.homeId);
  const away = teams.find((team) => team.id === fixture.awayId);
  const opponent = home.id === userTeamId ? away : home;
  const userIsHome = home.id === userTeamId;
  const duration = fixture.result.penalties || (knockout && Math.random() < 0.24) ? 120 : 90;

  function poolFor(teamId, attacking = false) {
    const source = teamId === userTeamId ? userPlayers : allPlayers.filter((player) => player.teamId === teamId);
    if (!attacking) return source;
    const attackers = source.filter((player) => player.position === "FWD");
    const midfielders = source.filter((player) => player.position === "MID");
    return [...attackers, ...attackers, ...midfielders, ...source.filter((player) => player.position !== "GK")];
  }

  const events = [];
  [[home.id, fixture.result.homeGoals], [away.id, fixture.result.awayGoals]].forEach(([teamId, goals]) => {
    for (let index = 0; index < goals; index += 1) {
      const scorer = randomItem(poolFor(teamId, true));
      const assistants = poolFor(teamId, true).filter((player) => player?.id !== scorer?.id);
      const assistant = Math.random() < 0.72 ? randomItem(assistants) : null;
      events.push({
        minute: 4 + Math.floor(Math.random() * (duration - 7)),
        type: "goal",
        teamId,
        player: scorer?.name ?? teamName(teams.find((team) => team.id === teamId)),
        assistant: assistant?.name ?? null,
        detail: assistant ? `Гол · пас: ${assistant.name}` : "Гол без передачи",
      });
    }
  });

  const cardCount = 1 + Math.floor(Math.random() * 4);
  for (let index = 0; index < cardCount; index += 1) {
    const teamId = Math.random() < 0.5 ? home.id : away.id;
    const player = randomItem(poolFor(teamId));
    const red = Math.random() < 0.08;
    events.push({
      minute: 12 + Math.floor(Math.random() * Math.max(20, duration - 18)),
      type: red ? "red" : "yellow",
      teamId,
      player: player?.name ?? teamName(teams.find((team) => team.id === teamId)),
      detail: red ? "Красная карточка" : "Жёлтая карточка",
    });
  }
  events.sort((a, b) => a.minute - b.minute);

  const userPossession = clamp(Math.round(50 + (userRating - opponent.rating) * 0.55 + (tactic === "attack" ? 4 : tactic === "defensive" ? -4 : 0)), 35, 65);
  const possession = userIsHome ? [userPossession, 100 - userPossession] : [100 - userPossession, userPossession];
  const userShots = clamp(Math.round(9 + (userRating - opponent.rating) * 0.28 + (tactic === "attack" ? 4 : tactic === "defensive" ? -2 : 0) + Math.random() * 4), 4, 22);
  const opponentShots = clamp(Math.round(9 + (opponent.rating - userRating) * 0.22 + (tactic === "attack" ? 2 : tactic === "defensive" ? -2 : 0) + Math.random() * 4), 3, 20);
  const shots = userIsHome ? [userShots, opponentShots] : [opponentShots, userShots];
  const userGoals = userIsHome ? fixture.result.homeGoals : fixture.result.awayGoals;
  const opponentGoals = userIsHome ? fixture.result.awayGoals : fixture.result.homeGoals;
  const userOnTarget = clamp(Math.max(userGoals, Math.round(userShots * (.34 + Math.random() * .16))), userGoals, userShots);
  const opponentOnTarget = clamp(Math.max(opponentGoals, Math.round(opponentShots * (.32 + Math.random() * .16))), opponentGoals, opponentShots);
  const onTarget = userIsHome ? [userOnTarget, opponentOnTarget] : [opponentOnTarget, userOnTarget];
  const winningTeamId = fixture.result.homeGoals >= fixture.result.awayGoals ? home.id : away.id;
  const goalEvents = events.filter((event) => event.type === "goal" && event.teamId === winningTeamId);
  const mvp = randomItem(goalEvents)?.player ?? randomItem(poolFor(winningTeamId, true))?.name ?? teamName(teams.find((team) => team.id === winningTeamId));

  return {
    ...fixture,
    result: {
      ...fixture.result,
      report: { duration, events, possession, shots, onTarget, mvp },
    },
  };
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function ratingTone(rating) {
  if (rating >= 89) return "elite";
  if (rating >= 83) return "strong";
  return "base";
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    spark: <><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 1 3-3.87" /></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" /><path d="M16 13h2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark"><i /><i /><i /></span>
      <span><b>GLOBAL CUP</b><small>DRAFT 2026</small></span>
    </span>
  );
}

function Scoreline({ fixture, teams }) {
  const home = teams.find((team) => team.id === fixture.homeId);
  const away = teams.find((team) => team.id === fixture.awayId);
  const result = fixture.result;
  return (
    <div className="scoreline">
      <span><Flag code={home.code} /> {teamName(home)}</span>
      <strong>{result ? `${result.homeGoals} : ${result.awayGoals}` : "— : —"}</strong>
      <span>{teamName(away)} <Flag code={away.code} /></span>
      {result?.penalties && <small>пен. {result.penalties[0]}:{result.penalties[1]}</small>}
    </div>
  );
}

function MatchEventRows({ events, fixture }) {
  if (!events.length) return <p className="no-events">Без голов и карточек</p>;
  return events.map((event, index) => (
    <div className={event.teamId === fixture.homeId ? "home-event" : "away-event"} key={`${event.minute}-${event.player}-${index}`}>
      <time>{event.minute}′</time>
      <i>{event.type === "goal" ? "⚽" : event.type === "red" ? "🟥" : "🟨"}</i>
      <span><strong>{event.player}</strong><small>{event.detail}</small></span>
    </div>
  ));
}

function MatchReport({ fixture, teams, compact = false }) {
  const report = fixture?.result?.report;
  if (!report) return null;
  const home = teams.find((team) => team.id === fixture.homeId);
  const away = teams.find((team) => team.id === fixture.awayId);
  const firstHalf = report.events.filter((event) => event.minute <= 45);
  const secondHalf = report.events.filter((event) => event.minute > 45 && event.minute <= 90);
  const extraTime = report.events.filter((event) => event.minute > 90);
  const halfGoals = firstHalf.filter((event) => event.type === "goal");
  const halfScore = [
    halfGoals.filter((event) => event.teamId === fixture.homeId).length,
    halfGoals.filter((event) => event.teamId === fixture.awayId).length,
  ];
  return (
    <div className={`match-report ${compact ? "compact" : ""}`}>
      <div className="report-head">
        <span>Протокол матча</span>
        <strong>{report.duration} минут{report.duration === 120 ? " · дополнительное время" : ""}</strong>
      </div>
      <div className="match-stats">
        {[
          ["Владение", `${report.possession[0]}%`, `${report.possession[1]}%`],
          ["Удары", report.shots[0], report.shots[1]],
          ["В створ", report.onTarget[0], report.onTarget[1]],
        ].map(([label, homeValue, awayValue]) => (
          <div key={label}><b>{homeValue}</b><span>{label}</span><b>{awayValue}</b></div>
        ))}
        <small>{teamName(home)}</small><small>{teamName(away)}</small>
      </div>
      <div className="event-list">
        <section className="event-period">
          <div className="period-label"><span>Первый тайм</span><b>0′ — 45′</b></div>
          <MatchEventRows events={firstHalf} fixture={fixture} />
        </section>
        <div className="halftime-line"><span>Перерыв</span><strong>{halfScore[0]} : {halfScore[1]}</strong></div>
        <section className="event-period">
          <div className="period-label"><span>Второй тайм</span><b>46′ — 90′</b></div>
          <MatchEventRows events={secondHalf} fixture={fixture} />
        </section>
        {report.duration === 120 && (
          <>
            <div className="halftime-line extra"><span>Основное время завершено</span><strong>{fixture.result.homeGoals} : {fixture.result.awayGoals}</strong></div>
            <section className="event-period extra-time">
              <div className="period-label"><span>Дополнительное время</span><b>91′ — 120′</b></div>
              <MatchEventRows events={extraTime} fixture={fixture} />
            </section>
          </>
        )}
      </div>
      <div className="mvp-line"><span>⭐ Игрок матча</span><strong>{report.mvp}</strong></div>
    </div>
  );
}

function NationSelect({ difficulty, onDifficulty, onSelect }) {
  const [query, setQuery] = useState("");
  const teams = gameData.teams.filter((team) => `${teamName(team)} ${team.code}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="nation-screen">
      <header className="topbar"><Brand /><div className="topbar-note">Новый режим · полный чемпионат мира</div></header>
      <section className="nation-hero">
        <span className="hero-label">Шаг 1 из 3 · выбери путь</span>
        <h1>За какую сборную<br /><em>ты возьмёшь кубок?</em></h1>
        <p>Выбери любую из 48 стран. Потом соберёшь для неё звёздный состав и сыграешь все матчи — от группы до финала.</p>
        <div className="difficulty-picker">
          <span>Сложность и бюджет</span>
          <div>
            {Object.entries(difficulties).map(([id, item]) => (
              <button className={difficulty === id ? "active" : ""} key={id} onClick={() => onDifficulty(id)}>
                <i>{item.icon}</i>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
                <b>{item.budget} млн</b>
              </button>
            ))}
          </div>
        </div>
        <label className="nation-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти сборную" /></label>
      </section>
      <section className="nation-grid">
        {teams.map((team) => (
          <button className="nation-card" key={team.id} onClick={() => onSelect(team.id)}>
            <span className="nation-flag"><Flag code={team.code} /></span>
            <span><strong>{teamName(team)}</strong><small>Группа {team.group} · сила {team.rating}</small></span>
            <b>{team.code}</b><Icon name="arrow" />
          </button>
        ))}
      </section>
      <p className="data-note">Составы и статистика: открытый датасет ЧМ-2026 · шкала игроков сверена с EA SPORTS FC 26</p>
    </main>
  );
}

function CoachPicker({ currentId, onChoose, onClose }) {
  const [query, setQuery] = useState("");
  const teams = [...gameData.teams]
    .filter((team) => `${team.coach.name} ${teamName(team)}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.coach.rating - a.coach.rating);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="picker-modal">
        <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        <span className="hero-label">48 специалистов</span>
        <h2>Выбери тренера</h2>
        <p>Теперь это обычный игровой список — имена видны на любом браузере.</p>
        <label className="search-field"><Icon name="search" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя тренера или сборная" /></label>
        <div className="coach-list">
          {teams.map((team) => (
            <button className={currentId === team.coach.id ? "selected" : ""} key={team.coach.id} onClick={() => { onChoose(team.coach.id); onClose(); }}>
              <span className="coach-avatar">{initials(team.coach.name)}</span>
              <span><strong>{team.coach.name}</strong><small><Flag code={team.code} /> {teamName(team)}</small></span>
              <span className="coach-rating"><small>Рейтинг</small><b>{team.coach.rating}</b></span>
              <em>{team.coach.price} млн</em>
              {currentId === team.coach.id ? <Icon name="check" /> : <Icon name="arrow" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultModal({ score, formation, spent, coach, nation, onClose, onStart }) {
  return (
    <div className="modal-backdrop">
      <section className="result-modal">
        <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        <span className="hero-label">Состав готов</span>
        <div className="result-score"><span>{score.total}</span><small>/100</small></div>
        <h2>Пора на чемпионат мира</h2>
        <p><Flag code={nation.code} /> {teamName(nation)} · схема {formation} · тренер {coach.name}. Потрачено {formatMoney(spent)}.</p>
        <div className="score-breakdown">
          {[["Качество игроков", score.quality], ["Связи и тренер", score.chemistry], ["Баланс состава", score.balance]].map(([label, value]) => (
            <div key={label}><span>{label}<em>{value}</em></span><i><u style={{ width: `${value}%` }} /></i></div>
          ))}
        </div>
        <div className="result-actions">
          <button className="secondary-button" onClick={onClose}>Ещё изменить состав</button>
          <button className="primary-button" onClick={onStart}>Начать чемпионат <Icon name="trophy" /></button>
        </div>
      </section>
    </div>
  );
}

function TeamLeaders({ history, userTeamId, userPlayers }) {
  const totals = new Map(userPlayers.map((player) => [player.name, {
    name: player.name,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
  }]));

  history.forEach((fixture) => {
    fixture.result?.report?.events?.forEach((event) => {
      if (event.teamId !== userTeamId) return;
      if (!totals.has(event.player)) {
        totals.set(event.player, { name: event.player, goals: 0, assists: 0, yellow: 0, red: 0 });
      }
      const player = totals.get(event.player);
      if (event.type === "goal") player.goals += 1;
      if (event.type === "yellow") player.yellow += 1;
      if (event.type === "red") player.red += 1;
      if (event.assistant) {
        if (!totals.has(event.assistant)) {
          totals.set(event.assistant, { name: event.assistant, goals: 0, assists: 0, yellow: 0, red: 0 });
        }
        totals.get(event.assistant).assists += 1;
      }
    });
  });

  const leaders = [...totals.values()]
    .sort((a, b) => (b.goals * 4 + b.assists * 2 - b.red) - (a.goals * 4 + a.assists * 2 - a.red) || a.name.localeCompare(b.name))
    .slice(0, 5);

  return (
    <section className="team-leaders">
      <div className="leaders-title">
        <div><span className="hero-label">Статистика турнира</span><h3>Лидеры твоей команды</h3></div>
        <strong>{history.length} <small>матчей</small></strong>
      </div>
      <div className="leaders-table">
        <div className="leaders-head"><span>Игрок</span><b>Голы</b><b>Передачи</b><b>Карточки</b></div>
        {leaders.map((player, index) => (
          <div key={player.name}>
            <em>{index + 1}</em>
            <span>{player.name}</span>
            <strong>{player.goals}</strong>
            <strong>{player.assists}</strong>
            <small>{player.yellow ? `🟨 ${player.yellow}` : ""}{player.red ? `  🟥 ${player.red}` : ""}{!player.yellow && !player.red ? "—" : ""}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tournament({ state, setState, teams, allPlayers, userPlayers, userTeam, userRating, onBackToDraft, onNewGame }) {
  const [tactic, setTactic] = useState("balanced");
  const groupFixtures = state.fixtures?.filter((fixture) => fixture.group === userTeam.group) ?? [];
  const userGroupFixtures = groupFixtures.filter((fixture) => fixture.homeId === userTeam.id || fixture.awayId === userTeam.id);
  const nextGroupFixture = userGroupFixtures.find((fixture) => !fixture.result);
  const currentKnockoutFixture = state.round?.matches.find((fixture) => !fixture.result && (fixture.homeId === userTeam.id || fixture.awayId === userTeam.id));
  const currentThirdPlaceFixture = state.thirdPlaceFixture && !state.thirdPlaceFixture.result ? state.thirdPlaceFixture : null;
  const tables = state.tables ?? (state.fixtures ? calculateTables(teams, state.fixtures) : {});
  const userRow = tables[userTeam.group]?.find((row) => row.teamId === userTeam.id);
  const lastUserMatch = state.history?.at(-1);
  const userKnockoutIndex = state.round?.matches.findIndex((fixture) => fixture.homeId === userTeam.id || fixture.awayId === userTeam.id) ?? -1;
  const possibleNextFixture = state.round && state.round.index < 4 && userKnockoutIndex >= 0
    ? state.round.matches[userKnockoutIndex % 2 === 0 ? userKnockoutIndex + 1 : userKnockoutIndex - 1]
    : null;

  function playGroup() {
    if (!nextGroupFixture) return;
    const playedBase = playUserFixture(nextGroupFixture, teams, userTeam.id, userRating, state.seed, tactic);
    const played = addMatchReport(playedBase, teams, allPlayers, userTeam.id, userPlayers, userRating, tactic, false);
    const parallel = state.fixtures.find((fixture) =>
      fixture.group === userTeam.group
      && fixture.matchday === nextGroupFixture.matchday
      && fixture.id !== nextGroupFixture.id
      && !fixture.result
    );
    const parallelResult = parallel
      ? simulateMatch(
          teams.find((team) => team.id === parallel.homeId).rating,
          teams.find((team) => team.id === parallel.awayId).rating,
          `${state.seed}-group-${parallel.group}-${parallel.id}`,
        )
      : null;
    const fixtures = state.fixtures.map((fixture) => {
      if (fixture.id === played.id) return played;
      if (parallel && fixture.id === parallel.id) return { ...fixture, result: parallelResult };
      return fixture;
    });
    const pending = fixtures.filter((fixture) => fixture.group === userTeam.group && (fixture.homeId === userTeam.id || fixture.awayId === userTeam.id) && !fixture.result);
    const history = [...(state.history ?? []), { stage: `Группа ${userTeam.group}`, ...played }];
    if (pending.length) {
      setState({ ...state, fixtures, history });
      return;
    }
    const nextTables = calculateTables(teams, fixtures);
    const qualifiers = qualificationFromTables(nextTables);
    setState({
      ...state,
      fixtures,
      tables: nextTables,
      qualifiers,
      history,
      stage: qualifiers.includes(userTeam.id) ? "group-summary" : "eliminated",
      message: qualifiers.includes(userTeam.id) ? "Ты вышел в плей-офф!" : "Групповой этап стал последним",
    });
  }

  function beginKnockout() {
    const round = createKnockoutRound(state.qualifiers, teams, userTeam.id, userRating, state.seed, 0);
    setState({ ...state, stage: "knockout", round });
  }

  function playKnockout() {
    if (!currentKnockoutFixture) return;
    const playedBase = playUserFixture(currentKnockoutFixture, teams, userTeam.id, userRating, state.seed, tactic, true);
    const played = addMatchReport(playedBase, teams, allPlayers, userTeam.id, userPlayers, userRating, tactic, true);
    const matches = state.round.matches.map((match) => match.id === played.id ? played : match);
    setState({
      ...state,
      stage: "knockout-summary",
      round: { ...state.round, matches },
      history: [...(state.history ?? []), { stage: state.round.name, ...played }],
    });
  }

  function playThirdPlace() {
    if (!currentThirdPlaceFixture) return;
    const playedBase = playUserFixture(currentThirdPlaceFixture, teams, userTeam.id, userRating, state.seed, tactic, true);
    const played = addMatchReport(playedBase, teams, allPlayers, userTeam.id, userPlayers, userRating, tactic, true);
    setState({
      ...state,
      stage: "third-place-summary",
      thirdPlaceFixture: played,
      history: [...(state.history ?? []), { stage: "Матч за 3-е место", ...played }],
    });
  }

  function advanceRound() {
    const winners = state.round.matches.map(winnerOf);
    if (!winners.includes(userTeam.id)) {
      if (state.round.index === 4) {
        setState({ ...state, stage: "runner-up", placement: 2, message: "Серебро чемпионата мира" });
        return;
      }
      if (state.round.index === 3) {
        const otherSemifinal = state.round.matches.find((match) => match.homeId !== userTeam.id && match.awayId !== userTeam.id);
        const otherWinner = winnerOf(otherSemifinal);
        const otherLoser = otherSemifinal.homeId === otherWinner ? otherSemifinal.awayId : otherSemifinal.homeId;
        setState({
          ...state,
          stage: "third-place",
          thirdPlaceFixture: {
            id: "third-place",
            homeId: userTeam.id,
            awayId: otherLoser,
            result: null,
          },
          message: "Впереди матч за бронзовые медали",
        });
        return;
      }
      setState({ ...state, stage: "eliminated", message: `Путь завершён: ${state.round.name}` });
      return;
    }
    if (state.round.index === 4) {
      setState({ ...state, stage: "champion", placement: 1, message: "Ты выиграл чемпионат мира!" });
      return;
    }
    const round = createKnockoutRound(winners, teams, userTeam.id, userRating, state.seed, state.round.index + 1);
    setState({ ...state, stage: "knockout", round });
  }

  function finishThirdPlace() {
    const won = winnerOf(state.thirdPlaceFixture) === userTeam.id;
    setState({
      ...state,
      stage: won ? "bronze" : "fourth",
      placement: won ? 3 : 4,
      message: won ? "Бронза чемпионата мира" : "Четвёртое место на чемпионате мира",
    });
  }

  const focusFixture = nextGroupFixture ?? currentKnockoutFixture ?? currentThirdPlaceFixture;
  const opponentId = focusFixture && (focusFixture.homeId === userTeam.id ? focusFixture.awayId : focusFixture.homeId);
  const opponent = teams.find((team) => team.id === opponentId);
  const stageTitle = state.stage.startsWith("group")
    ? `Группа ${userTeam.group}`
    : state.stage.startsWith("third-place")
      ? "Матч за 3-е место"
      : state.round?.name ?? "Турнир";

  return (
    <main className="tournament-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-note"><Flag code={userTeam.code} /> {teamName(userTeam)} · сила состава {userRating}</div>
        <button className="ghost-button" onClick={onBackToDraft}>Вернуться к составу</button>
      </header>

      <section className="tournament-hero">
        <div><span className="hero-label">Шаг 3 из 3 · чемпионат мира</span><h1>{stageTitle}</h1><p>Три матча в группе, затем пять раундов на вылет. Тактика влияет на риск и количество моментов.</p></div>
        <div className="progress-rail">
          {["Группа", "1/16", "1/8", "1/4", "1/2", "Финал"].map((label, index) => {
            const progress = state.stage.startsWith("group") ? 0 : (state.round?.index ?? 5) + 1;
            return <span className={index <= progress ? "active" : ""} key={label}><i>{index < progress ? "✓" : index + 1}</i><b>{label}</b></span>;
          })}
        </div>
      </section>

      {(state.stage === "group" || state.stage === "knockout" || state.stage === "third-place") && focusFixture && (
        <section className="match-center">
          <div className="match-card">
            <span className="match-kicker">
              {state.stage === "group"
                ? `Матч ${userGroupFixtures.filter((item) => item.result).length + 1} из 3`
                : state.stage === "third-place" ? "Последний матч · борьба за бронзу" : state.round.name}
            </span>
            <div className="versus">
              <div><span><Flag code={userTeam.code} className="versus-flag" /></span><strong>{teamName(userTeam)}</strong><small>Твой состав · {userRating}</small></div>
              <b>VS</b>
              <div><span><Flag code={opponent.code} className="versus-flag" /></span><strong>{teamName(opponent)}</strong><small>Сила сборной · {opponent.rating}</small></div>
            </div>
            <h2>Выбери план на матч</h2>
            <div className="tactic-grid">
              {Object.entries(tactics).map(([id, item]) => (
                <button className={tactic === id ? "active" : ""} key={id} onClick={() => setTactic(id)}>
                  <i>{item.icon}</i><strong>{item.title}</strong><small>{item.text}</small>
                </button>
              ))}
            </div>
            <button className="play-button" onClick={state.stage === "group" ? playGroup : state.stage === "third-place" ? playThirdPlace : playKnockout}>Сыграть матч <Icon name="arrow" /></button>
          </div>

          <aside className="tournament-side">
            {state.stage === "group" && (
              <>
                <h3>Таблица группы {userTeam.group}</h3>
                <GroupTable rows={tables[userTeam.group]} teams={teams} userId={userTeam.id} />
                <h3>Все матчи по турам</h3>
                <div className="round-fixtures">
                  {[1, 2, 3].map((matchday) => (
                    <div key={matchday}>
                      <small>Тур {matchday}</small>
                      {groupFixtures.filter((fixture) => fixture.matchday === matchday).map((fixture) => <Scoreline key={fixture.id} fixture={fixture} teams={teams} />)}
                    </div>
                  ))}
                </div>
                {lastUserMatch?.result?.report && <><h3>Последний матч</h3><MatchReport fixture={lastUserMatch} teams={teams} compact /></>}
              </>
            )}
            {state.stage === "knockout" && (
              <>
                <h3>Сетка · {state.round.name}</h3>
                {possibleNextFixture && (
                  <div className="next-opponent">
                    <span>Кто может попасться дальше</span>
                    <strong>
                      {teamName(teams.find((team) => team.id === possibleNextFixture.homeId))}
                      <em> или </em>
                      {teamName(teams.find((team) => team.id === possibleNextFixture.awayId))}
                    </strong>
                    <small>Победитель соседней пары встретится с победителем твоего матча.</small>
                  </div>
                )}
                <div className="fixture-list">{state.round.matches.map((fixture) => <Scoreline key={fixture.id} fixture={fixture} teams={teams} />)}</div>
              </>
            )}
            {state.stage === "third-place" && (
              <div className="bronze-preview">
                <span>🥉</span>
                <h3>Последний шанс забрать медаль</h3>
                <p>Победитель завершит турнир на третьем месте. Проигравший останется четвёртым.</p>
                <Scoreline fixture={state.thirdPlaceFixture} teams={teams} />
              </div>
            )}
          </aside>
        </section>
      )}

      {state.stage === "group-summary" && (
        <section className="summary-screen">
          <span className="summary-icon">✓</span><span className="hero-label">Групповой этап пройден</span>
          <h2>{state.message}</h2>
          <p>{teamName(userTeam)} заняла {tables[userTeam.group].findIndex((row) => row.teamId === userTeam.id) + 1}-е место: {userRow.points} очков, мячи {userRow.gf}:{userRow.ga}.</p>
          <GroupTable rows={tables[userTeam.group]} teams={teams} userId={userTeam.id} />
          <button className="play-button" onClick={beginKnockout}>Открыть сетку 1/16 <Icon name="arrow" /></button>
        </section>
      )}

      {state.stage === "knockout-summary" && (
        <section className="summary-screen">
          <span className="summary-icon"><Icon name={winnerOf(state.round.matches.find((m) => m.homeId === userTeam.id || m.awayId === userTeam.id)) === userTeam.id ? "check" : "close"} size={31} /></span>
          <span className="hero-label">{state.round.name} завершён</span>
          <h2>{winnerOf(state.round.matches.find((m) => m.homeId === userTeam.id || m.awayId === userTeam.id)) === userTeam.id ? "Идём дальше!" : "На этот раз не получилось"}</h2>
          <Scoreline fixture={state.round.matches.find((m) => m.homeId === userTeam.id || m.awayId === userTeam.id)} teams={teams} />
          <MatchReport fixture={state.round.matches.find((m) => m.homeId === userTeam.id || m.awayId === userTeam.id)} teams={teams} />
          <button className="play-button" onClick={advanceRound}>Продолжить <Icon name="arrow" /></button>
        </section>
      )}

      {state.stage === "third-place-summary" && (
        <section className="summary-screen bronze-summary">
          <span className="summary-icon">{winnerOf(state.thirdPlaceFixture) === userTeam.id ? "🥉" : <Icon name="close" size={31} />}</span>
          <span className="hero-label">Матч за 3-е место завершён</span>
          <h2>{winnerOf(state.thirdPlaceFixture) === userTeam.id ? "Бронзовые медали наши!" : "Останавливаемся в шаге от медалей"}</h2>
          <Scoreline fixture={state.thirdPlaceFixture} teams={teams} />
          <MatchReport fixture={state.thirdPlaceFixture} teams={teams} />
          <button className="play-button" onClick={finishThirdPlace}>Подвести итоги <Icon name="arrow" /></button>
        </section>
      )}

      {["eliminated", "champion", "runner-up", "bronze", "fourth"].includes(state.stage) && (
        <section className={`ending-screen ${state.stage}`}>
          <div className="ending-watermark" aria-hidden="true"><Flag code={userTeam.code} className="ending-flag" /><span>{teamName(userTeam)}</span></div>
          <div className="ending-cup">
            {state.stage === "champion" ? "🥇" : state.stage === "runner-up" ? "🥈" : state.stage === "bronze" ? "🥉" : <Icon name="trophy" size={82} />}
          </div>
          <span className="hero-label">
            {state.stage === "champion" ? "Новый чемпион мира"
              : state.stage === "runner-up" ? "Серебряный призёр"
                : state.stage === "bronze" ? "Бронзовый призёр"
                  : state.stage === "fourth" ? "Четвёрка сильнейших" : "Турнир окончен"}
          </span>
          <h1>
            {state.stage === "champion" ? `${teamName(userTeam)} — чемпион!`
              : state.stage === "runner-up" ? `${teamName(userTeam)} — вице-чемпион!`
                : state.stage === "bronze" ? `${teamName(userTeam)} — с бронзой!`
                  : state.message}
          </h1>
          <p>Матчей сыграно: {state.history?.length ?? 0}. Твой состав сохранён — можно вернуться, усилить его и начать заново.</p>
          <div className="ending-actions"><button className="secondary-button" onClick={onBackToDraft}>Изменить состав</button><button className="primary-button" onClick={onNewGame}>Выбрать другую страну</button></div>
        </section>
      )}

      {state.history?.length > 0 && (
        <TeamLeaders history={state.history} userTeamId={userTeam.id} userPlayers={userPlayers} />
      )}

      {state.history?.length > 0 && (
        <section className="history-strip">
          <h3>Путь команды</h3>
          <div>{state.history.map((fixture, index) => <div key={`${fixture.id}-${index}`}><small>{fixture.stage}</small><Scoreline fixture={fixture} teams={teams} /></div>)}</div>
        </section>
      )}
    </main>
  );
}

function GroupTable({ rows = [], teams, userId }) {
  return (
    <div className="group-table">
      <div className="table-head"><span>Сборная</span><b>И</b><b>РМ</b><b>О</b></div>
      {rows.map((row, index) => {
        const team = teams.find((item) => item.id === row.teamId);
        return (
          <div className={row.teamId === userId ? "user" : ""} key={row.teamId}>
            <em>{index + 1}</em><span><Flag code={team.code} /> {teamName(team)}</span><b>{row.played}</b><b>{row.gd > 0 ? `+${row.gd}` : row.gd}</b><strong>{row.points}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default function DraftGame() {
  const [formation, setFormation] = useState("4-3-3");
  const [squad, setSquad] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [coachId, setCoachId] = useState("");
  const [selectedNationId, setSelectedNationId] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");
  const [teamId, setTeamId] = useState("ALL");
  const [sort, setSort] = useState("rating");
  const [limit, setLimit] = useState(72);
  const [notice, setNotice] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showCoachPicker, setShowCoachPicker] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const slots = formations[formation];
  const playerById = useMemo(() => new Map(gameData.players.map((player) => [player.id, player])), []);
  const selectedPlayers = Object.values(squad).map((id) => playerById.get(id)).filter(Boolean);
  const coachTeam = gameData.teams.find((team) => team.coach.id === coachId);
  const coach = coachTeam?.coach;
  const selectedNation = gameData.teams.find((team) => team.id === selectedNationId);
  const difficultyConfig = difficulties[difficulty] ?? difficulties.normal;
  const budget = difficultyConfig.budget;
  const spent = selectedPlayers.reduce((sum, player) => sum + player.price, 0) + (coach?.price ?? 0);
  const remaining = budget - spent;
  const nationCounts = selectedPlayers.reduce((counts, player) => {
    counts[player.teamId] = (counts[player.teamId] ?? 0) + 1;
    return counts;
  }, {});
  const complete = selectedPlayers.length === 11 && Boolean(coach) && remaining >= 0;

  const score = useMemo(() => {
    if (!selectedPlayers.length) return { total: 0, quality: 0, chemistry: 0, balance: 0 };
    const quality = selectedPlayers.reduce((sum, player) => sum + player.rating, 0) / selectedPlayers.length;
    const sameNationLinks = Object.values(nationCounts).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const coachLinks = coachTeam ? (nationCounts[coachTeam.id] ?? 0) : 0;
    const chemistry = Math.min(100, 58 + sameNationLinks * 4 + coachLinks * 7 + (coach?.rating ?? 62) * 0.18);
    const balance = Math.round((selectedPlayers.length / 11) * 100);
    const total = Math.round(quality * 0.78 + chemistry * 0.12 + (coach?.rating ?? 65) * 0.1);
    return { total, quality: Math.round(quality), chemistry: Math.round(chemistry), balance };
  }, [selectedPlayers, nationCounts, coach, coachTeam]);

  const userRating = Math.max(64, Math.min(92, Math.round(score.quality * 0.82 + score.chemistry * 0.1 + (coach?.rating ?? 65) * 0.08)));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.formation && formations[saved.formation]) setFormation(saved.formation);
      if (saved?.squad) setSquad(saved.squad);
      if (saved?.coachId) setCoachId(saved.coachId);
      if (saved?.selectedNationId) setSelectedNationId(saved.selectedNationId);
      if (saved?.difficulty && difficulties[saved.difficulty]) setDifficulty(saved.difficulty);
      if (saved?.tournament) setTournament(saved.tournament);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formation, squad, coachId, selectedNationId, difficulty, tournament }));
  }, [formation, squad, coachId, selectedNationId, difficulty, tournament, hydrated]);

  useEffect(() => setLimit(72), [query, position, teamId, sort]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const chosenIds = new Set(Object.values(squad));
  const activeSlot = slots.find(([id]) => id === selectedSlot);
  const effectivePosition = activeSlot?.[1] ?? position;
  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...gameData.players]
      .filter((player) => effectivePosition === "ALL" || player.position === effectivePosition)
      .filter((player) => teamId === "ALL" || player.teamId === Number(teamId))
      .filter((player) => !normalized || `${player.name} ${player.club} ${player.team}`.toLowerCase().includes(normalized))
      .sort((a, b) => sort === "price" ? a.price - b.price : sort === "value" ? (b.rating / b.price) - (a.rating / a.price) : b.rating - a.rating);
  }, [query, effectivePosition, teamId, sort]);

  function chooseFormation(next) {
    if (next === formation) return;
    setFormation(next);
    setSquad({});
    setSelectedSlot(null);
    setNotice("Схема изменена — поле очищено");
  }

  function addPlayer(player) {
    let slot = activeSlot;
    if (!slot || slot[1] !== player.position) slot = slots.find(([id, slotPosition]) => slotPosition === player.position && !squad[id]);
    if (!slot) return setNotice(`Все места «${positionNames[player.position]}» уже заняты`);
    const [slotId] = slot;
    const replaced = playerById.get(squad[slotId]);
    const nextSpent = spent - (replaced?.price ?? 0) + player.price;
    const countWithoutReplaced = (nationCounts[player.teamId] ?? 0) - (replaced?.teamId === player.teamId ? 1 : 0);
    if (chosenIds.has(player.id) && squad[slotId] !== player.id) return setNotice("Этот игрок уже есть в составе");
    if (countWithoutReplaced >= MAX_PER_TEAM) return setNotice(`Не больше ${MAX_PER_TEAM} игроков одной сборной`);
    if (nextSpent > budget) return setNotice(`Не хватает ${formatMoney(nextSpent - budget)}`);
    setSquad((current) => ({ ...current, [slotId]: player.id }));
    const nextEmpty = slots.find(([id, slotPosition]) => slotPosition === player.position && !squad[id] && id !== slotId);
    setSelectedSlot(nextEmpty?.[0] ?? null);
  }

  function removePlayer(slotId) {
    setSquad((current) => { const next = { ...current }; delete next[slotId]; return next; });
    setSelectedSlot(slotId);
  }

  function selectCoach(nextCoachId) {
    const nextTeam = gameData.teams.find((team) => team.coach.id === nextCoachId);
    const nextSpent = selectedPlayers.reduce((sum, player) => sum + player.price, 0) + (nextTeam?.coach.price ?? 0);
    if (nextSpent > budget) return setNotice("Этот тренер не помещается в бюджет");
    setCoachId(nextCoachId);
  }

  function autoPick() {
    const selectedCoachTeam = coachTeam ?? [...gameData.teams].sort((a, b) => (b.coach.rating / b.coach.price) - (a.coach.rating / a.coach.price))[0];
    const nextSquad = {};
    const counts = {};
    const used = new Set();
    let total = selectedCoachTeam.coach.price;
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
      const [slotId, wantedPosition] = slots[slotIndex];
      const remainingSlots = slots.slice(slotIndex + 1);
      const candidates = gameData.players
        .filter((player) => player.position === wantedPosition && !used.has(player.id) && (counts[player.teamId] ?? 0) < MAX_PER_TEAM)
        .sort((a, b) => {
          const priceWeight = difficulty === "easy" ? 0.12 : difficulty === "hard" ? 1.05 : 0.72;
          return (b.rating - b.price * priceWeight) - (a.rating - a.price * priceWeight);
        });
      const pick = candidates.find((candidate) => {
        const futureUsed = new Set([...used, candidate.id]);
        const futureCounts = { ...counts, [candidate.teamId]: (counts[candidate.teamId] ?? 0) + 1 };
        let minimumRest = 0;
        for (const [, futurePosition] of remainingSlots) {
          const cheapest = gameData.players
            .filter((player) =>
              player.position === futurePosition
              && !futureUsed.has(player.id)
              && (futureCounts[player.teamId] ?? 0) < MAX_PER_TEAM
            )
            .sort((a, b) => a.price - b.price)[0];
          if (!cheapest) {
            minimumRest = Number.POSITIVE_INFINITY;
            break;
          }
          minimumRest += cheapest.price;
          futureUsed.add(cheapest.id);
          futureCounts[cheapest.teamId] = (futureCounts[cheapest.teamId] ?? 0) + 1;
        }
        return total + candidate.price + minimumRest <= budget;
      });
      if (pick) {
        nextSquad[slotId] = pick.id;
        counts[pick.teamId] = (counts[pick.teamId] ?? 0) + 1;
        used.add(pick.id);
        total += pick.price;
      }
    }
    setSquad(nextSquad);
    setCoachId(selectedCoachTeam.coach.id);
    setSelectedSlot(null);
    setNotice("Сильный состав готов — можешь менять игроков");
  }

  function startTournament() {
    const seed = Date.now();
    setTournament({ stage: "group", seed, fixtures: buildGroupFixtures(gameData.teams, selectedNation.id, seed), history: [] });
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAll() {
    setFormation("4-3-3");
    setSquad({});
    setCoachId("");
    setSelectedSlot(null);
    setSelectedNationId(null);
    setDifficulty("normal");
    setTournament(null);
    setShowResult(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (!hydrated) return <main className="loading-screen"><Brand /><span>Загружаем турнир…</span></main>;
  if (!selectedNation) return <NationSelect difficulty={difficulty} onDifficulty={setDifficulty} onSelect={(id) => setSelectedNationId(id)} />;
  if (tournament) return (
    <Tournament
      state={tournament}
      setState={setTournament}
      teams={gameData.teams}
      allPlayers={gameData.players}
      userPlayers={selectedPlayers}
      userTeam={selectedNation}
      userRating={userRating}
      onBackToDraft={() => setTournament(null)}
      onNewGame={resetAll}
    />
  );

  return (
    <main className="game-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-note"><Flag code={selectedNation.code} /> Ты играешь за {teamName(selectedNation)} · {difficultyConfig.title.toLowerCase()} сложность</div>
        <div className="top-actions"><button className="ghost-button" onClick={resetAll}>Другая страна</button><button className="score-pill" onClick={() => complete && setShowResult(true)}><span>Сила</span><strong>{complete ? userRating : "—"}</strong></button></div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Шаг 2 из 3 · собери состав</span><b>48 сборных · 1 248 игроков</b></div>
        <div className="hero-row">
          <div><h1>Собери команду,<br /><em>а потом выиграй ЧМ.</em></h1><p>У тебя {budget} млн на 11 игроков и тренера. Сложность: {difficultyConfig.title.toLowerCase()}. После драфта ты сыграешь группу и весь плей-офф за {teamName(selectedNation)}.</p></div>
          <div className="budget-card">
            <div className="budget-head"><span><Icon name="wallet" /> Осталось</span><small>{difficultyConfig.title} · из {budget} млн</small></div>
            <strong>{formatMoney(Math.max(0, remaining))}</strong>
            <div className="budget-track"><i style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} /></div>
            <div className="budget-foot"><span>Потрачено {formatMoney(spent)}</span><span>{selectedPlayers.length}/11 игроков</span></div>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="builder-column">
          <div className="section-heading">
            <div><span className="step">01</span><div><h2>Твоя команда</h2><p>Нажми на позицию, затем выбери игрока справа</p></div></div>
            <button className="magic-button" onClick={autoPick}><Icon name="spark" /> Собрать автоматически</button>
          </div>
          <div className="formation-tabs">{Object.keys(formations).map((name) => <button key={name} className={formation === name ? "active" : ""} onClick={() => chooseFormation(name)}>{name}</button>)}</div>
          <div className="pitch-wrap">
            <div className="pitch-lines"><span className="halfway" /><span className="circle" /><span className="box top" /><span className="box bottom" /></div>
            {slots.map(([slotId, slotPosition, x, y]) => {
              const player = playerById.get(squad[slotId]);
              return (
                <button key={slotId} className={`pitch-slot ${selectedSlot === slotId ? "selected" : ""} ${player ? "filled" : ""}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => player ? removePlayer(slotId) : setSelectedSlot(slotId)}>
                  {player ? <><span className={`mini-rating ${ratingTone(player.rating)}`}>{player.rating}</span><span className="avatar">{initials(player.name)}</span><span className="slot-name">{player.name.split(" ").at(-1)}</span><small>{player.code} · {player.price}</small><span className="remove-hint"><Icon name="close" size={12} /></span></> : <><span className="plus">+</span><b>{shortPositionNames[slotPosition]}</b><small>выбрать</small></>}
                </button>
              );
            })}
          </div>

          <button className="coach-card" onClick={() => setShowCoachPicker(true)}>
            <span className="coach-icon"><Icon name="users" size={22} /></span>
            <span className="coach-copy"><small>Главный тренер</small><strong>{coach?.name ?? "Нажми и выбери тренера"}</strong>{coachTeam && <span><Flag code={coachTeam.code} /> {teamName(coachTeam)} · рейтинг {coach.rating}</span>}</span>
            <span className="coach-action">{coach ? `${coach.price} млн` : "48 тренеров"} <Icon name="arrow" /></span>
          </button>

          <div className="readiness-card">
            <div><small>Готовность</small><strong>{selectedPlayers.length + (coach ? 1 : 0)} <span>/ 12</span></strong></div>
            <div className="readiness-copy"><b>{complete ? "Команда готова к турниру" : selectedPlayers.length < 11 ? `Осталось выбрать ${11 - selectedPlayers.length} игроков` : "Осталось выбрать тренера"}</b><span>Всё сохраняется автоматически.</span></div>
            <button className="primary-button" disabled={!complete} onClick={() => setShowResult(true)}>Оценить и играть <Icon name="arrow" /></button>
          </div>
        </div>

        <aside className="market-column">
          <div className="market-sticky">
            <div className="section-heading market-heading"><div><span className="step">02</span><div><h2>Рынок игроков</h2><p>{filteredPlayers.length.toLocaleString("ru-RU")} подходят под фильтры</p></div></div></div>
            {activeSlot && <button className="active-filter" onClick={() => setSelectedSlot(null)}>Ищем: {positionNames[activeSlot[1]]} <Icon name="close" size={14} /></button>}
            <label className="search-field"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, клуб или сборная" />{query && <button onClick={() => setQuery("")}><Icon name="close" size={15} /></button>}</label>
            <div className="filter-row">
              <select value={position} onChange={(event) => setPosition(event.target.value)} disabled={Boolean(activeSlot)}><option value="ALL">Все позиции</option><option value="GK">Вратари</option><option value="DEF">Защитники</option><option value="MID">Полузащитники</option><option value="FWD">Нападающие</option></select>
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="ALL">Все сборные</option>{gameData.teams.map((team) => <option key={team.id} value={team.id}>{teamName(team)}</option>)}</select>
              <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rating">Сильнейшие</option><option value="price">Дешевле</option><option value="value">Цена / качество</option></select>
            </div>
            <div className="player-list">
              {filteredPlayers.slice(0, limit).map((player) => {
                const chosen = chosenIds.has(player.id);
                return (
                  <button className={`player-row ${chosen ? "chosen" : ""}`} disabled={chosen} key={player.id} onClick={() => addPlayer(player)}>
                    <span className={`rating-badge ${ratingTone(player.rating)}`}>{player.rating}</span><span className="player-avatar">{initials(player.name)}</span>
                    <span className="player-main"><strong>{player.name}</strong><small><Flag code={player.code} /> {teamName(gameData.teams.find((team) => team.id === player.teamId))} · {player.club}</small></span>
                    <span className="position-tag">{shortPositionNames[player.position]}</span><span className="player-price">{player.price} млн</span><span className="add-state">{chosen ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
            {limit < filteredPlayers.length && <button className="load-more" onClick={() => setLimit((value) => value + 72)}>Показать ещё</button>}
          </div>
        </aside>
      </section>

      <section className="rules-strip"><span>Правила драфта</span><p><b>{budget}</b>млн бюджет</p><p><b>11+1</b>игроки и тренер</p><p><b>≤ 3</b>из одной сборной</p><p><b>8</b>матчей до кубка</p></section>
      <footer><Brand /><p>Фанатский проект. Не связан с FIFA или EA SPORTS.</p><button onClick={resetAll}>Начать сначала</button></footer>
      {showCoachPicker && <CoachPicker currentId={coachId} onChoose={selectCoach} onClose={() => setShowCoachPicker(false)} />}
      {showResult && <ResultModal score={score} formation={formation} spent={spent} coach={coach} nation={selectedNation} onClose={() => setShowResult(false)} onStart={startTournament} />}
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
