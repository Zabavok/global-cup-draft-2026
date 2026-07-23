"use client";

import { useEffect, useMemo, useState } from "react";
import gameData from "@/data/game-data.json";

const BUDGET = 120;
const MAX_PER_TEAM = 3;

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

const positionNames = { GK: "Вратарь", DEF: "Защитник", MID: "Полузащитник", FWD: "Нападающий" };
const shortPositionNames = { GK: "ВРТ", DEF: "ЗАЩ", MID: "ПЗ", FWD: "НАП" };

function formatMoney(value) {
  return `${Number(value.toFixed(1)).toLocaleString("ru-RU")} млн`;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function ratingTone(rating) {
  if (rating >= 90) return "elite";
  if (rating >= 82) return "strong";
  return "base";
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    spark: <><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" /><path d="M16 13h2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shuffle: <><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>,
    arrow: <path d="m9 18 6-6-6-6" />,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function DraftGame() {
  const [formation, setFormation] = useState("4-3-3");
  const [squad, setSquad] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [coachId, setCoachId] = useState("");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");
  const [teamId, setTeamId] = useState("ALL");
  const [sort, setSort] = useState("rating");
  const [limit, setLimit] = useState(72);
  const [notice, setNotice] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const slots = formations[formation];
  const playerById = useMemo(() => new Map(gameData.players.map((player) => [player.id, player])), []);
  const selectedPlayers = Object.values(squad).map((id) => playerById.get(id)).filter(Boolean);
  const coachTeam = gameData.teams.find((team) => team.coach.id === coachId);
  const coach = coachTeam?.coach;
  const spent = selectedPlayers.reduce((sum, player) => sum + player.price, 0) + (coach?.price ?? 0);
  const remaining = BUDGET - spent;
  const nationCounts = selectedPlayers.reduce((counts, player) => {
    counts[player.teamId] = (counts[player.teamId] ?? 0) + 1;
    return counts;
  }, {});
  const complete = selectedPlayers.length === 11 && Boolean(coach) && remaining >= 0;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("global-cup-draft") || "null");
      if (saved?.formation && formations[saved.formation]) setFormation(saved.formation);
      if (saved?.squad) setSquad(saved.squad);
      if (saved?.coachId) setCoachId(saved.coachId);
    } catch {
      localStorage.removeItem("global-cup-draft");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("global-cup-draft", JSON.stringify({ formation, squad, coachId }));
  }, [formation, squad, coachId, hydrated]);

  useEffect(() => setLimit(72), [query, position, teamId, sort]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const chosenIds = new Set(Object.values(squad));
  const activeSlot = slots.find(([id]) => id === selectedSlot);
  const effectivePosition = activeSlot?.[1] ?? position;
  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return gameData.players
      .filter((player) => effectivePosition === "ALL" || player.position === effectivePosition)
      .filter((player) => teamId === "ALL" || player.teamId === Number(teamId))
      .filter((player) => !normalized || `${player.name} ${player.club} ${player.team}`.toLocaleLowerCase("ru").includes(normalized))
      .sort((a, b) => sort === "price" ? a.price - b.price : sort === "value" ? (b.rating / b.price) - (a.rating / a.price) : b.rating - a.rating);
  }, [query, effectivePosition, teamId, sort]);

  const score = useMemo(() => {
    if (!selectedPlayers.length) return { total: 0, quality: 0, chemistry: 0, balance: 0, value: 0 };
    const quality = selectedPlayers.reduce((sum, player) => sum + player.rating, 0) / selectedPlayers.length;
    const sameNationLinks = Object.values(nationCounts).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const coachLinks = coachTeam ? (nationCounts[coachTeam.id] ?? 0) : 0;
    const chemistry = Math.min(100, 58 + sameNationLinks * 4 + coachLinks * 7 + (coach?.rating ?? 62) * 0.18);
    const balance = selectedPlayers.length === 11 ? 100 : Math.round((selectedPlayers.length / 11) * 100);
    const value = Math.max(45, Math.min(100, 72 + Math.max(0, remaining) * 0.55));
    const total = Math.round(quality * 0.58 + chemistry * 0.2 + balance * 0.14 + value * 0.08);
    return { total, quality: Math.round(quality), chemistry: Math.round(chemistry), balance, value: Math.round(value) };
  }, [selectedPlayers, nationCounts, coach, coachTeam, remaining]);

  function chooseFormation(next) {
    if (next === formation) return;
    setFormation(next);
    setSquad({});
    setSelectedSlot(null);
    setNotice("Схема изменена — поле очищено");
  }

  function addPlayer(player) {
    let slot = activeSlot;
    if (!slot || slot[1] !== player.position) {
      slot = slots.find(([id, slotPosition]) => slotPosition === player.position && !squad[id]);
    }
    if (!slot) {
      setNotice(`Все места «${positionNames[player.position]}» уже заняты`);
      return;
    }

    const [slotId] = slot;
    const replaced = playerById.get(squad[slotId]);
    const nextSpent = spent - (replaced?.price ?? 0) + player.price;
    const countWithoutReplaced = (nationCounts[player.teamId] ?? 0) - (replaced?.teamId === player.teamId ? 1 : 0);

    if (chosenIds.has(player.id) && squad[slotId] !== player.id) {
      setNotice("Этот игрок уже есть в составе");
      return;
    }
    if (countWithoutReplaced >= MAX_PER_TEAM) {
      setNotice(`Можно взять не больше ${MAX_PER_TEAM} игроков одной сборной`);
      return;
    }
    if (nextSpent > BUDGET) {
      setNotice(`Не хватает ${formatMoney(nextSpent - BUDGET)}`);
      return;
    }

    setSquad((current) => ({ ...current, [slotId]: player.id }));
    const nextEmpty = slots.find(([id, slotPosition]) => slotPosition === player.position && !squad[id] && id !== slotId);
    setSelectedSlot(nextEmpty?.[0] ?? null);
  }

  function removePlayer(slotId) {
    setSquad((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setSelectedSlot(slotId);
  }

  function selectCoach(nextCoachId) {
    const nextTeam = gameData.teams.find((team) => team.coach.id === nextCoachId);
    const nextSpent = selectedPlayers.reduce((sum, player) => sum + player.price, 0) + (nextTeam?.coach.price ?? 0);
    if (nextSpent > BUDGET) {
      setNotice("Этот тренер не помещается в бюджет");
      return;
    }
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
        .sort((a, b) => (b.rating - b.price * 0.62) - (a.rating - a.price * 0.62));

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
    setNotice("Собрали сильный состав — теперь улучшай его сам");
  }

  function resetDraft() {
    setSquad({});
    setCoachId("");
    setSelectedSlot(null);
    setShowResult(false);
    localStorage.removeItem("global-cup-draft");
  }

  async function copySquad() {
    const lines = [
      `GLOBAL CUP DRAFT 2026 — ${score.total}/100`,
      `Схема: ${formation} · Стоимость: ${formatMoney(spent)}`,
      `Тренер: ${coach?.name ?? "не выбран"}`,
      ...slots.map(([id, pos]) => `${shortPositionNames[pos]} — ${playerById.get(squad[id])?.name ?? "пусто"}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setNotice("Состав скопирован");
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Global Cup Draft">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>GLOBAL CUP</b><small>DRAFT 2026</small></span>
        </a>
        <div className="topbar-center">
          <span className="live-dot" />
          <span>турнир завершён · данные обновлены 19.07</span>
        </div>
        <div className="top-actions">
          <button className="ghost-button" onClick={resetDraft}>Новый драфт</button>
          <button className="score-pill" onClick={() => complete && setShowResult(true)}>
            <span>Рейтинг</span><strong>{score.total || "—"}</strong>
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Fantasy squad builder</span><b>48 сборных · 1 248 игроков</b></div>
        <div className="hero-row">
          <div>
            <h1>Собери команду,<br /><em>которая возьмёт кубок.</em></h1>
            <p>Выбери 11 игроков и тренера. Уложись в 120 млн, не бери больше трёх футболистов одной сборной — и проверь рейтинг своего состава.</p>
          </div>
          <div className={`budget-card ${remaining < 0 ? "over" : ""}`}>
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

          <div className="formation-tabs" aria-label="Выбор схемы">
            {Object.keys(formations).map((name) => (
              <button key={name} className={formation === name ? "active" : ""} onClick={() => chooseFormation(name)}>{name}</button>
            ))}
          </div>

          <div className="pitch-wrap">
            <div className="pitch-grain" />
            <div className="pitch-lines"><span className="halfway" /><span className="circle" /><span className="box top" /><span className="box bottom" /></div>
            {slots.map(([slotId, slotPosition, x, y]) => {
              const player = playerById.get(squad[slotId]);
              return (
                <button
                  key={slotId}
                  className={`pitch-slot ${selectedSlot === slotId ? "selected" : ""} ${player ? "filled" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => player ? removePlayer(slotId) : setSelectedSlot(slotId)}
                  aria-label={player ? `Убрать ${player.name}` : `Выбрать: ${positionNames[slotPosition]}`}
                >
                  {player ? (
                    <>
                      <span className={`mini-rating ${ratingTone(player.rating)}`}>{player.rating}</span>
                      <span className="avatar">{initials(player.name)}</span>
                      <span className="slot-name">{player.name.split(" ").at(-1)}</span>
                      <small>{player.code} · {player.price}</small>
                      <span className="remove-hint"><Icon name="close" size={12} /></span>
                    </>
                  ) : (
                    <>
                      <span className="plus">+</span>
                      <b>{shortPositionNames[slotPosition]}</b>
                      <small>выбрать</small>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="coach-card">
            <div className="coach-icon"><Icon name="users" size={22} /></div>
            <div className="coach-copy"><small>Главный тренер</small><strong>{coach?.name ?? "Тренер не выбран"}</strong>{coachTeam && <span>{coachTeam.name} · рейтинг {coach.rating}</span>}</div>
            <label className="coach-select">
              <span>Выбрать</span>
              <select value={coachId} onChange={(event) => selectCoach(event.target.value)}>
                <option value="">48 тренеров</option>
                {[...gameData.teams].sort((a, b) => b.coach.rating - a.coach.rating).map((team) => (
                  <option value={team.coach.id} key={team.coach.id}>{team.coach.name} — {team.name} · {team.coach.price} млн</option>
                ))}
              </select>
            </label>
          </div>

          <div className="readiness-card">
            <div>
              <small>Готовность состава</small>
              <strong>{selectedPlayers.length + (coach ? 1 : 0)} <span>/ 12</span></strong>
            </div>
            <div className="readiness-copy">
              <b>{complete ? "Команда готова к оценке" : selectedPlayers.length < 11 ? `Осталось выбрать ${11 - selectedPlayers.length} игроков` : "Осталось выбрать тренера"}</b>
              <span>{complete ? "Посмотри сильные стороны и итоговый рейтинг." : "Автосохранение включено — можно вернуться позже."}</span>
            </div>
            <button className="primary-button" disabled={!complete} onClick={() => setShowResult(true)}>
              Оценить команду <Icon name="arrow" />
            </button>
          </div>
        </div>

        <aside className="market-column">
          <div className="market-sticky">
            <div className="section-heading market-heading">
              <div><span className="step">02</span><div><h2>Рынок игроков</h2><p>{filteredPlayers.length.toLocaleString("ru-RU")} подходят под фильтры</p></div></div>
            </div>

            {activeSlot && (
              <button className="active-filter" onClick={() => setSelectedSlot(null)}>
                Ищем: {positionNames[activeSlot[1]]} <Icon name="close" size={14} />
              </button>
            )}

            <label className="search-field">
              <Icon name="search" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, клуб или сборная" />
              {query && <button onClick={() => setQuery("")}><Icon name="close" size={15} /></button>}
            </label>

            <div className="filter-row">
              <select value={position} onChange={(event) => setPosition(event.target.value)} disabled={Boolean(activeSlot)}>
                <option value="ALL">Все позиции</option>
                <option value="GK">Вратари</option>
                <option value="DEF">Защитники</option>
                <option value="MID">Полузащитники</option>
                <option value="FWD">Нападающие</option>
              </select>
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                <option value="ALL">Все сборные</option>
                {gameData.teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
              </select>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="rating">По рейтингу</option>
                <option value="value">Цена / качество</option>
                <option value="price">Сначала дешевле</option>
              </select>
            </div>

            <div className="player-list">
              {filteredPlayers.slice(0, limit).map((player) => {
                const chosen = chosenIds.has(player.id);
                const blockedByNation = (nationCounts[player.teamId] ?? 0) >= MAX_PER_TEAM && !chosen;
                const blockedByBudget = remaining < player.price && !chosen;
                return (
                  <button
                    className={`player-row ${chosen ? "chosen" : ""}`}
                    key={player.id}
                    onClick={() => !chosen && addPlayer(player)}
                    disabled={chosen || blockedByNation || blockedByBudget}
                  >
                    <span className={`rating-badge ${ratingTone(player.rating)}`}>{player.rating}</span>
                    <span className="player-avatar">{initials(player.name)}</span>
                    <span className="player-main">
                      <strong>{player.name}</strong>
                      <small>{player.code} · {player.club}</small>
                    </span>
                    <span className="position-tag">{shortPositionNames[player.position]}</span>
                    <span className="player-price">{formatMoney(player.price)}</span>
                    <span className="add-state">{chosen ? <Icon name="check" size={15} /> : "+"}</span>
                  </button>
                );
              })}
              {!filteredPlayers.length && <div className="empty-state">Никого не нашли. Попробуй убрать часть фильтров.</div>}
            </div>

            {limit < filteredPlayers.length && (
              <button className="load-more" onClick={() => setLimit((current) => current + 72)}>Показать ещё 72</button>
            )}
          </div>
        </aside>
      </section>

      <section className="rules-strip">
        <span>Правила драфта</span>
        <p><b>120 млн</b> общий бюджет</p>
        <p><b>11 + 1</b> игроки и тренер</p>
        <p><b>до 3</b> из одной сборной</p>
        <p><b>4 схемы</b> на выбор</p>
      </section>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>GLOBAL CUP</b><small>DRAFT 2026</small></span>
        </div>
        <p>Независимый учебный проект. Не связан с FIFA. Рейтинги и цены — игровая модель, а не официальная оценка.</p>
        <a href="https://huggingface.co/datasets/Mominullptr/fifa-world-cup-2026-dataset" target="_blank" rel="noreferrer">Данные: CC0 dataset ↗</a>
      </footer>

      {notice && <div className="toast">{notice}</div>}

      {showResult && (
        <div className="modal-backdrop" onMouseDown={() => setShowResult(false)}>
          <section className="result-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowResult(false)}><Icon name="close" /></button>
            <div className="result-kicker">Итог драфта</div>
            <div className="result-score"><span>{score.total}</span><small>/ 100</small></div>
            <h2>{score.total >= 90 ? "Команда чемпионского уровня" : score.total >= 84 ? "Серьёзный претендент на кубок" : "Крепкая турнирная команда"}</h2>
            <p>Схема {formation}, тренер {coach.name}. Ты потратил {formatMoney(spent)} и сохранил {formatMoney(remaining)}.</p>
            <div className="score-breakdown">
              {[
                ["Качество игроков", score.quality],
                ["Связи и тренер", score.chemistry],
                ["Баланс состава", score.balance],
                ["Эффективность бюджета", score.value],
              ].map(([label, value]) => (
                <div key={label}><span><b>{label}</b><em>{value}</em></span><i><u style={{ width: `${value}%` }} /></i></div>
              ))}
            </div>
            <div className="result-actions">
              <button className="ghost-button" onClick={copySquad}><Icon name="copy" /> Скопировать состав</button>
              <button className="primary-button" onClick={() => setShowResult(false)}>Продолжить улучшать</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
