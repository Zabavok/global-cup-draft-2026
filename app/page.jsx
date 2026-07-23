"use client";

import { useEffect, useMemo, useState } from "react";
import gameData from "@/data/game-data.json";
import {
  buildGroupFixtures,
  calculateTables,
  createKnockoutRound,
  playUserFixture,
  qualificationFromTables,
  winnerOf,
} from "./tournament";

const BUDGET = 120;
const MAX_PER_TEAM = 3;
const STORAGE_KEY = "global-cup-draft-v2";

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

function flag(code) {
  return [...(flagIso[code] ?? "UN")].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt())).join("");
}

function teamName(team) {
  return countryNames[team?.code] ?? team?.name ?? "—";
}

function formatMoney(value) {
  return `${Number(value.toFixed(1)).toLocaleString("ru-RU")} млн`;
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
      <span>{flag(home.code)} {teamName(home)}</span>
      <strong>{result ? `${result.homeGoals} : ${result.awayGoals}` : "— : —"}</strong>
      <span>{teamName(away)} {flag(away.code)}</span>
      {result?.penalties && <small>пен. {result.penalties[0]}:{result.penalties[1]}</small>}
    </div>
  );
}

function NationSelect({ onSelect }) {
  const [query, setQuery] = useState("");
  const teams = gameData.teams.filter((team) => `${teamName(team)} ${team.code}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <main className="nation-screen">
      <header className="topbar"><Brand /><div className="topbar-note">Новый режим · полный чемпионат мира</div></header>
      <section className="nation-hero">
        <span className="hero-label">Шаг 1 из 3 · выбери путь</span>
        <h1>За какую сборную<br /><em>ты возьмёшь кубок?</em></h1>
        <p>Выбери любую из 48 стран. Потом соберёшь для неё звёздный состав и сыграешь все матчи — от группы до финала.</p>
        <label className="nation-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти сборную" /></label>
      </section>
      <section className="nation-grid">
        {teams.map((team) => (
          <button className="nation-card" key={team.id} onClick={() => onSelect(team.id)}>
            <span className="nation-flag">{flag(team.code)}</span>
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
              <span><strong>{team.coach.name}</strong><small>{flag(team.code)} {teamName(team)}</small></span>
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
        <p>{flag(nation.code)} {teamName(nation)} · схема {formation} · тренер {coach.name}. Потрачено {formatMoney(spent)}.</p>
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

function Tournament({ state, setState, teams, userTeam, userRating, onBackToDraft, onNewGame }) {
  const [tactic, setTactic] = useState("balanced");
  const groupFixtures = state.fixtures?.filter((fixture) => fixture.group === userTeam.group) ?? [];
  const userGroupFixtures = groupFixtures.filter((fixture) => fixture.homeId === userTeam.id || fixture.awayId === userTeam.id);
  const nextGroupFixture = userGroupFixtures.find((fixture) => !fixture.result);
  const currentKnockoutFixture = state.round?.matches.find((fixture) => !fixture.result && (fixture.homeId === userTeam.id || fixture.awayId === userTeam.id));
  const tables = state.tables ?? (state.fixtures ? calculateTables(teams, state.fixtures) : {});
  const userRow = tables[userTeam.group]?.find((row) => row.teamId === userTeam.id);

  function playGroup() {
    if (!nextGroupFixture) return;
    const played = playUserFixture(nextGroupFixture, teams, userTeam.id, userRating, state.seed, tactic);
    const fixtures = state.fixtures.map((fixture) => fixture.id === played.id ? played : fixture);
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
    const played = playUserFixture(currentKnockoutFixture, teams, userTeam.id, userRating, state.seed, tactic, true);
    const matches = state.round.matches.map((match) => match.id === played.id ? played : match);
    setState({
      ...state,
      stage: "knockout-summary",
      round: { ...state.round, matches },
      history: [...(state.history ?? []), { stage: state.round.name, ...played }],
    });
  }

  function advanceRound() {
    const winners = state.round.matches.map(winnerOf);
    if (!winners.includes(userTeam.id)) {
      setState({ ...state, stage: "eliminated", message: `Путь завершён: ${state.round.name}` });
      return;
    }
    if (state.round.index === 4) {
      setState({ ...state, stage: "champion", message: "Ты выиграл чемпионат мира!" });
      return;
    }
    const round = createKnockoutRound(winners, teams, userTeam.id, userRating, state.seed, state.round.index + 1);
    setState({ ...state, stage: "knockout", round });
  }

  const focusFixture = nextGroupFixture ?? currentKnockoutFixture;
  const opponentId = focusFixture && (focusFixture.homeId === userTeam.id ? focusFixture.awayId : focusFixture.homeId);
  const opponent = teams.find((team) => team.id === opponentId);
  const stageTitle = state.stage.startsWith("group") ? `Группа ${userTeam.group}` : state.round?.name ?? "Турнир";

  return (
    <main className="tournament-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-note">{flag(userTeam.code)} {teamName(userTeam)} · сила состава {userRating}</div>
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

      {(state.stage === "group" || state.stage === "knockout") && focusFixture && (
        <section className="match-center">
          <div className="match-card">
            <span className="match-kicker">{state.stage === "group" ? `Матч ${userGroupFixtures.filter((item) => item.result).length + 1} из 3` : state.round.name}</span>
            <div className="versus">
              <div><span>{flag(userTeam.code)}</span><strong>{teamName(userTeam)}</strong><small>Твой состав · {userRating}</small></div>
              <b>VS</b>
              <div><span>{flag(opponent.code)}</span><strong>{teamName(opponent)}</strong><small>Сила сборной · {opponent.rating}</small></div>
            </div>
            <h2>Выбери план на матч</h2>
            <div className="tactic-grid">
              {Object.entries(tactics).map(([id, item]) => (
                <button className={tactic === id ? "active" : ""} key={id} onClick={() => setTactic(id)}>
                  <i>{item.icon}</i><strong>{item.title}</strong><small>{item.text}</small>
                </button>
              ))}
            </div>
            <button className="play-button" onClick={state.stage === "group" ? playGroup : playKnockout}>Сыграть матч <Icon name="arrow" /></button>
          </div>

          <aside className="tournament-side">
            {state.stage === "group" && (
              <>
                <h3>Таблица группы {userTeam.group}</h3>
                <GroupTable rows={tables[userTeam.group]} teams={teams} userId={userTeam.id} />
                <h3>Твои матчи</h3>
                <div className="fixture-list">{userGroupFixtures.map((fixture) => <Scoreline key={fixture.id} fixture={fixture} teams={teams} />)}</div>
              </>
            )}
            {state.stage === "knockout" && (
              <>
                <h3>Сетка · {state.round.name}</h3>
                <div className="fixture-list">{state.round.matches.map((fixture) => <Scoreline key={fixture.id} fixture={fixture} teams={teams} />)}</div>
              </>
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
          <button className="play-button" onClick={advanceRound}>Продолжить <Icon name="arrow" /></button>
        </section>
      )}

      {(state.stage === "eliminated" || state.stage === "champion") && (
        <section className={`ending-screen ${state.stage}`}>
          <div className="ending-cup"><Icon name="trophy" size={82} /></div>
          <span className="hero-label">{state.stage === "champion" ? "Новый чемпион мира" : "Турнир окончен"}</span>
          <h1>{state.stage === "champion" ? `${teamName(userTeam)} — чемпион!` : state.message}</h1>
          <p>Матчей сыграно: {state.history?.length ?? 0}. Твой состав сохранён — можно вернуться, усилить его и начать заново.</p>
          <div className="ending-actions"><button className="secondary-button" onClick={onBackToDraft}>Изменить состав</button><button className="primary-button" onClick={onNewGame}>Выбрать другую страну</button></div>
        </section>
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
            <em>{index + 1}</em><span>{flag(team.code)} {teamName(team)}</span><b>{row.played}</b><b>{row.gd > 0 ? `+${row.gd}` : row.gd}</b><strong>{row.points}</strong>
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
  const spent = selectedPlayers.reduce((sum, player) => sum + player.price, 0) + (coach?.price ?? 0);
  const remaining = BUDGET - spent;
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
      if (saved?.tournament) setTournament(saved.tournament);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formation, squad, coachId, selectedNationId, tournament }));
  }, [formation, squad, coachId, selectedNationId, tournament, hydrated]);

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
    if (nextSpent > BUDGET) return setNotice(`Не хватает ${formatMoney(nextSpent - BUDGET)}`);
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
    if (nextSpent > BUDGET) return setNotice("Этот тренер не помещается в бюджет");
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
        .sort((a, b) => (b.rating - b.price * 0.72) - (a.rating - a.price * 0.72));
      const pick = candidates.find((candidate) => {
        const minimumRest = remainingSlots.reduce((sum, [, pos]) => {
          const cheapest = gameData.players
            .filter((player) => player.position === pos && !used.has(player.id) && player.id !== candidate.id)
            .reduce((minimum, player) => Math.min(minimum, player.price), 99);
          return sum + cheapest;
        }, 0);
        return total + candidate.price + minimumRest <= BUDGET;
      }) ?? candidates.sort((a, b) => a.price - b.price)[0];
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
    setTournament(null);
    setShowResult(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (!hydrated) return <main className="loading-screen"><Brand /><span>Загружаем турнир…</span></main>;
  if (!selectedNation) return <NationSelect onSelect={(id) => setSelectedNationId(id)} />;
  if (tournament) return <Tournament state={tournament} setState={setTournament} teams={gameData.teams} userTeam={selectedNation} userRating={userRating} onBackToDraft={() => setTournament(null)} onNewGame={resetAll} />;

  return (
    <main className="game-shell">
      <header className="topbar">
        <Brand />
        <div className="topbar-note">{flag(selectedNation.code)} Ты играешь за {teamName(selectedNation)} · группа {selectedNation.group}</div>
        <div className="top-actions"><button className="ghost-button" onClick={resetAll}>Другая страна</button><button className="score-pill" onClick={() => complete && setShowResult(true)}><span>Сила</span><strong>{complete ? userRating : "—"}</strong></button></div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Шаг 2 из 3 · собери состав</span><b>48 сборных · 1 248 игроков</b></div>
        <div className="hero-row">
          <div><h1>Собери команду,<br /><em>а потом выиграй ЧМ.</em></h1><p>У тебя 120 млн на 11 игроков и тренера. После драфта ты сыграешь группу и весь плей-офф за {teamName(selectedNation)}.</p></div>
          <div className="budget-card">
            <div className="budget-head"><span><Icon name="wallet" /> Осталось</span><small>из {BUDGET} млн</small></div>
            <strong>{formatMoney(Math.max(0, remaining))}</strong>
            <div className="budget-track"><i style={{ width: `${Math.min(100, (spent / BUDGET) * 100)}%` }} /></div>
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
            <span className="coach-copy"><small>Главный тренер</small><strong>{coach?.name ?? "Нажми и выбери тренера"}</strong>{coachTeam && <span>{flag(coachTeam.code)} {teamName(coachTeam)} · рейтинг {coach.rating}</span>}</span>
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
                    <span className="player-main"><strong>{player.name}</strong><small>{flag(player.code)} {teamName(gameData.teams.find((team) => team.id === player.teamId))} · {player.club}</small></span>
                    <span className="position-tag">{shortPositionNames[player.position]}</span><span className="player-price">{player.price} млн</span><span className="add-state">{chosen ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
            {limit < filteredPlayers.length && <button className="load-more" onClick={() => setLimit((value) => value + 72)}>Показать ещё</button>}
          </div>
        </aside>
      </section>

      <section className="rules-strip"><span>Правила драфта</span><p><b>120</b>млн бюджет</p><p><b>11+1</b>игроки и тренер</p><p><b>≤ 3</b>из одной сборной</p><p><b>8</b>матчей до кубка</p></section>
      <footer><Brand /><p>Фанатский проект. Не связан с FIFA или EA SPORTS.</p><button onClick={resetAll}>Начать сначала</button></footer>
      {showCoachPicker && <CoachPicker currentId={coachId} onChoose={selectCoach} onClose={() => setShowCoachPicker(false)} />}
      {showResult && <ResultModal score={score} formation={formation} spent={spent} coach={coach} nation={selectedNation} onClose={() => setShowResult(false)} onStart={startTournament} />}
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}
