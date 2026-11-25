/* ---------- the player: profile, avatar, XP, medals, bests, saves (all in this browser) ---------- */
DB.profile = Object.assign({name:"", xp:0, medals:{}, best:{}, onboarded:false, stats:{plays:0, wins:0, turns:0, hints:0}}, DB.profile || {});
DB.profile.avatar = Object.assign({bg:0, skin:1, shape:0, eyes:0, mouth:0, hat:0, acc:0}, DB.profile.avatar || {});
DB.profile.stats = Object.assign({plays:0, wins:0, turns:0, hints:0}, DB.profile.stats);
DB.saves = DB.saves || {}; DB.gameData = DB.gameData || {};
const PR = () => DB.profile;
const levelOf = xp => Math.floor(Math.sqrt(xp / 25)) + 1;
const xpFor = lv => 25 * (lv - 1) ** 2;
const TITLES = [[1, "Newbie"], [2, "Button Masher"], [3, "Regular"], [5, "Veteran"], [8, "Cart Collector"], [12, "Legend"], [20, "Grand Master"]];
const titleOf = lv => TITLES.filter(([l]) => lv >= l).at(-1)[1];
const medalPoints = () => Object.values(PR().medals).reduce((a, m) => a + (m.points || 0), 0);

/* Avatar: layered SVG parts. Some items unlock with levels, plays or specific medals. */
const AV = {
  bg:["#ff5b1f", "#7c5cff", "#b6f23a", "#ff4f9a", "#2bb3ff", "#ffd166", "#3b3f49"],
  skin:["#f6d1b1", "#e8b08a", "#c68a5e", "#8d5a3b", "#5b3a26", "#9fd38a", "#b7a3ff"],
  shape:[["Round", "M32 12c11 0 18 8 18 19s-7 21-18 21-18-10-18-21 7-19 18-19z"], ["Square", "M15 14h34v34c0 4-3 6-6 6H21c-3 0-6-2-6-6z"], ["Egg", "M32 10c10 0 16 12 16 23S41 54 32 54 16 44 16 33s6-23 16-23z"]],
  eyes:[["Dots", e => `<circle cx="25" cy="31" r="2.6" fill="#111"/><circle cx="39" cy="31" r="2.6" fill="#111"/>`], ["Wide", e => `<circle cx="25" cy="31" r="5" fill="#fff"/><circle cx="39" cy="31" r="5" fill="#fff"/><circle cx="26" cy="32" r="2.4" fill="#111"/><circle cx="40" cy="32" r="2.4" fill="#111"/>`], ["Sleepy", e => `<path d="M21 31h8M35 31h8" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>`], ["Visor", e => `<rect x="18" y="27" width="28" height="8" rx="4" fill="#111"/><rect x="21" y="29" width="22" height="3" rx="1.5" fill="#2bb3ff"/>`, {level:4}], ["Stars", e => `<path d="M25 27l1.4 3h3l-2.4 2 1 3-3-2-3 2 1-3-2.4-2h3zM39 27l1.4 3h3l-2.4 2 1 3-3-2-3 2 1-3-2.4-2h3z" fill="#ffd166" stroke="#111" stroke-width=".6"/>`, {medals:10}]],
  mouth:[["Smile", () => `<path d="M26 42c4 4 8 4 12 0" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>`], ["Flat", () => `<path d="M26 43h12" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>`], ["Grin", () => `<path d="M24 40h16c0 6-4 8-8 8s-8-2-8-8z" fill="#111"/><path d="M26 40h12v2H26z" fill="#fff"/>`], ["Oh", () => `<circle cx="32" cy="43" r="3" fill="#111"/>`], ["Fangs", () => `<path d="M26 41h12" stroke="#111" stroke-width="2.5" stroke-linecap="round"/><path d="M28 42l1.5 4 1.5-4M33 42l1.5 4 1.5-4" fill="#fff" stroke="#111" stroke-width=".6"/>`, {medal:"fang:win"}]],
  hat:[["None", () => ""], ["Beanie", () => `<path d="M16 22c0-9 7-14 16-14s16 5 16 14z" fill="#ff5b1f"/><rect x="14" y="20" width="36" height="5" rx="2.5" fill="#c44514"/><circle cx="32" cy="7" r="3" fill="#ffd166"/>`], ["Cap", () => `<path d="M16 22c0-8 7-13 16-13s16 5 16 13z" fill="#2bb3ff"/><path d="M44 21h12c0 2-2 3-4 3H44z" fill="#1a7fb8"/>`, {plays:3}], ["Tiny hat", () => `<rect x="27" y="4" width="10" height="9" rx="1" fill="#3b2a1a"/><rect x="23" y="12" width="18" height="3" rx="1.5" fill="#3b2a1a"/><rect x="27" y="10" width="10" height="2" fill="#b6f23a"/>`, {medal:"tollbridge:paid"}], ["Crown", () => `<path d="M18 18l4-11 6 7 4-9 4 9 6-7 4 11z" fill="#ffd166" stroke="#b8860b" stroke-width="1"/>`, {level:5}], ["Wizard", () => `<path d="M14 20L32 0l18 20z" fill="#7c5cff"/><circle cx="28" cy="11" r="1.5" fill="#ffd166"/><circle cx="36" cy="15" r="1.2" fill="#ffd166"/>`, {level:8}], ["Headphones", () => `<path d="M12 32c0-14 9-22 20-22s20 8 20 22" stroke="#222" stroke-width="4" fill="none"/><rect x="8" y="28" width="8" height="12" rx="3" fill="#ff4f9a"/><rect x="48" y="28" width="8" height="12" rx="3" fill="#ff4f9a"/>`, {plays:10}]],
  acc:[["None", () => ""], ["Glasses", () => `<circle cx="25" cy="31" r="6" fill="none" stroke="#111" stroke-width="2"/><circle cx="39" cy="31" r="6" fill="none" stroke="#111" stroke-width="2"/><path d="M31 31h2" stroke="#111" stroke-width="2"/>`], ["Monocle", () => `<circle cx="39" cy="31" r="6" fill="none" stroke="#b8860b" stroke-width="2"/><path d="M45 33l3 12" stroke="#b8860b" stroke-width="1.2"/>`, {medals:3}], ["Scarf", () => `<path d="M18 52h28v6H18z" fill="#ff4f9a"/><path d="M38 56h6v8h-6z" fill="#d63a7e"/>`, {medal:"meridian:win"}], ["Magnifier", () => `<circle cx="50" cy="48" r="6" fill="#ffffff55" stroke="#c9a227" stroke-width="2.5"/><path d="M54 53l6 6" stroke="#c9a227" stroke-width="3"/>`, {medalPoints:100}]]
};
function unlockedReq(req){
  if (!req) return true; const p = PR();
  if (req.level && levelOf(p.xp) < req.level) return false;
  if (req.plays && p.stats.plays < req.plays) return false;
  if (req.medals && Object.keys(p.medals).length < req.medals) return false;
  if (req.medalPoints && medalPoints() < req.medalPoints) return false;
  if (req.medal && !p.medals[req.medal]) return false;
  return true;
}
const reqText = req => !req ? "" : req.level ? `Reach level ${req.level}` : req.plays ? `Play ${req.plays} games` : req.medals ? `Earn ${req.medals} medals` : req.medalPoints ? `Earn ${req.medalPoints} medal points` : req.medal ? `Medal: ${medalName(req.medal)}` : "";
function avatarSVG(a = PR().avatar, size = 64){
  const pick2 = (arr, i) => arr[Math.min(i | 0, arr.length - 1)];
  const sh = pick2(AV.shape, a.shape)[1], eyes = pick2(AV.eyes, a.eyes)[1], mouth = pick2(AV.mouth, a.mouth)[1], hat = pick2(AV.hat, a.hat)[1], acc = pick2(AV.acc, a.acc)[1];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><rect width="64" height="64" rx="12" fill="${pick2(AV.bg, a.bg)}"/><path d="${sh}" fill="${pick2(AV.skin, a.skin)}" stroke="#0003" stroke-width="1.5"/>${eyes()}${mouth()}${acc()}${hat()}</svg>`;
}
function renderMeChip(){ const p = PR(), lv = levelOf(p.xp); $("#meChip").innerHTML = `${avatarSVG(p.avatar, 34)}<span><b>${esc(p.name || "Player")}</b><small>Lv ${lv} · ${titleOf(lv)}</small></span>`; }

/* XP and medal toasts */
function addXP(n){
  const p = PR(), before = levelOf(p.xp); p.xp += Math.max(0, Math.round(n)); save();
  const after = levelOf(p.xp); if (after > before) popMedal({name:`Level ${after}: ${titleOf(after)}`, desc:"New avatar items may have unlocked.", points:0, level:true});
  renderMeChip(); return after > before ? after : 0;
}
function popMedal(m){
  const el = document.createElement("div"); el.className = "mtoast" + (m.level ? " lv" : "");
  el.innerHTML = `${medalIcon(m.points, !!m.level)}<div><small>${m.level ? "Level up" : "Medal unlocked"}</small><b>${esc(m.name)}</b><span>${esc(m.desc || "")}${m.points ? ` · +${m.points}` : ""}</span></div>`;
  $("#mtoasts").append(el); setTimeout(() => el.classList.add("on"), 20); setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 400); }, 4200);
}
const MEDAL_COLORS = {5:"#c68a5e", 10:"#c0c6cf", 25:"#ffd166", 50:"#2bb3ff", 100:"#ff4f9a"};
function medalIcon(points, level){ const c = level ? "#b6f23a" : MEDAL_COLORS[points] || "#c0c6cf"; return `<svg viewBox="0 0 40 40" class="micon" aria-hidden="true"><path d="M12 2h6l2 10-5 3zM28 2h-6l-2 10 5 3z" fill="${c}" opacity=".6"/><circle cx="20" cy="25" r="12" fill="${c}" stroke="#0006" stroke-width="2"/><path d="M20 18l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z" fill="#0005"/></svg>`; }

/* Medals: a cart can define its own; every cart gets the basics. */
const DEFAULT_MEDALS = c => [{id:"finish", name:"Showed Up", desc:"Reach any ending.", points:5, when:{type:"finish"}}, {id:"win", name:"Winner", desc:"Win the game.", points:10, when:{type:"win"}}, {id:"fast", name:"Speedrun", desc:`Win within ${Math.max(2, Math.ceil(c.turns / 2))} turns.`, points:25, when:{type:"fast", value:Math.max(2, Math.ceil(c.turns / 2))}}];
const medalsOf = c => (c.medals && c.medals.length ? c.medals : DEFAULT_MEDALS(c));
const MEDAL_INDEX = {};
function medalName(key){ if (MEDAL_INDEX[key]) return MEDAL_INDEX[key]; const [cid, mid] = key.split(":"); const c = (typeof cartById === "function") && cartById(cid); const m = c && medalsOf(c).find(x => x.id === mid); return MEDAL_INDEX[key] = m ? m.name : mid; }
function award(cartId, m){
  const key = `${cartId}:${m.id}`, p = PR(); if (p.medals[key]) return false;
  const pts = [5, 10, 25, 50, 100].includes(+m.points) ? +m.points : 10;
  p.medals[key] = {at:Date.now(), points:pts, name:String(m.name).slice(0, 40), desc:String(m.desc || "").slice(0, 120)}; save();
  popMedal({...m, points:pts}); addXP(pts); (G?.medalsRun || []).push({...m, points:pts}); return true;
}
function meterKeyFor(c, ref){ if (!ref) return c.stats[0].key; if (c.stats.some(s => s.key === ref)) return ref; return c.meterIds?.[ref] || ref; }
function checkMedals(c, ev){
  for (const m of medalsOf(c)){
    const w = m.when || {}; let ok = false;
    if (ev.type === "turn"){
      if (w.type === "rule") ok = (ev.hits || []).some(h => h.replace(/ \(x\d+\)$/, "").toLowerCase() === String(w.value).toLowerCase());
      if (w.type === "nat20") ok = (ev.rolls || []).some(r => r.crit && !r.foe);
      if (w.type === "trade") ok = !!ev.trade;
      if (w.type === "story") ok = !!ev.story;
    } else {
      const e = ev.end;
      if (w.type === "finish") ok = true;
      if (w.type === "win") ok = e.won;
      if (w.type === "lose") ok = !e.won && e.key !== "timeout" && e.key !== "good";
      if (w.type === "ending") ok = e.key === w.value || e.method === w.value;
      if (w.type === "fast") ok = e.won && G.turn <= +w.value;
      if (w.type === "nohints") ok = e.won && !G.hints;
      if (w.type === "price") ok = e.won && e.price != null && e.price <= +w.value;
      if (w.type === "meter"){ const v = G.stats[meterKeyFor(c, w.meter)]; ok = v != null && (w.op === "<=" ? v <= +w.value : v >= +w.value); }
    }
    if (ok) award(c.id, m);
  }
}

/* Scores and personal bests */
function scoreOf(c, e){
  if (c.engine === "social"){ const main = c.stats[0], v = G.stats[main.key]; return Math.round((main.bad ? 100 - v : v) + (e.won ? 100 + (c.turns - G.turn) * 10 : 0)); }
  if (c.engine === "dice") return e.won ? 100 + G.stats.HP * 5 + G.stats.GOLD * 3 + (c.turns - G.turn) * 5 : G.stats.HP * 2;
  if (c.engine === "barter") return e.won ? 100 + Math.round((c.budget - e.price) / c.budget * 100) + (c.turns - G.turn) * 5 : 0;
  return 0;
}
function recordScore(id, s){ const p = PR(), prev = p.best[id]; const isBest = prev == null || s > prev; if (isBest) p.best[id] = s; save(); return {best:Math.max(s, prev ?? s), prev, isBest:isBest && prev != null, first:prev == null}; }

/* Autosave: an unfinished game can be continued later. */
function saveGame(){
  if (!G || G.over || !G.turn || G.cart.shared) return;
  DB.saves[G.cart.id] = {at:Date.now(), turn:G.turn, stats:G.stats, history:G.history.slice(-12), mem:G.mem, used:[...G.used], hints:G.hints || 0, log:$("#log").innerHTML.slice(0, 120000)};
  const keys = Object.keys(DB.saves).sort((a, b) => DB.saves[b].at - DB.saves[a].at); for (const k of keys.slice(12)) delete DB.saves[k];
  save();
}
function dropSave(id){ if (DB.saves[id]){ delete DB.saves[id]; save(); } }
function resumeGame(c){
  const sv = DB.saves[c.id]; if (!sv) return newGame(c);
  newGame(c, true);
  Object.assign(G, {turn:sv.turn, stats:sv.stats, history:sv.history || [], mem:sv.mem || {}, used:new Set(sv.used || []), hints:sv.hints || 0});
  $("#log").innerHTML = sv.log || ""; addMsg("sys", "Game resumed where you left off.");
  renderMeters(); renderSugg(); renderHelp(); scroll();
}

/* Hints: a nudge when stuck. Two per game. */
function hint(){
  const c = G.cart; if (G.over || (G.hints || 0) >= 2) return;
  let t = "";
  if (c.engine === "social"){
    const helps = c.likes.filter(r => !G.mem[r.id] && Object.entries(r.d).some(([k, v]) => v * (c.stats.find(s => s.key === k)?.bad ? -1 : 1) > 0));
    const r = helps[Math.floor(Math.random() * helps.length)];
    t = r ? `Hint: ${c.character} might warm to talk about ${r.name.replace(/^clue:\s*/i, "")}.` : `Hint: you've found everything ${c.character} likes. Kindness and questions still help.`;
  } else if (c.engine === "dice"){
    const x = c.dice, st = G.stats, odds = (mod, dc) => clamp(Math.round((21 - clamp(dc - mod, 2, 20)) / 20 * 100), 5, 95);
    t = `Hint: fighting hits ${odds(x.sheet.STR, x.dc.attack)}% of the time but ${x.foe} hits back. Talking works ${odds(x.sheet.CHA, x.dc.persuade + st._grumpy)}%, sneaking ${odds(x.sheet.DEX, x.dc.sneak + 2 * st._spotted)}%. Offering ${x.cur} gives a bonus to bribes, and searching can find more.`;
  } else t = `Hint: ${c.character} warms to compliments and questions about the ${c.barter.item}, comes down faster when you're charming, and won't go below a secret price. Offering something to trade helps.`;
  G.hints = (G.hints || 0) + 1; PR().stats.hints++; save();
  addMsg("sys hint", t); renderHelp(); saveGame();
}
function renderHelp(){
  const c = G.cart, left = 2 - (G.hints || 0);
  const how = c.engine === "social" ? `Talk to ${esc(c.character)}. What you say moves the meters: the rules behind this cart reward some topics and punish others, and repeating a topic counts for less each time. ${c.stats.map(s => s.win != null ? `Get ${esc(s.label)} to ${s.win}` : s.winBelow != null ? `Get ${esc(s.label)} down to ${s.winBelow}` : "").filter(Boolean).join(" or ")} to win.`
    : c.engine === "dice" ? `Get past ${esc(c.dice.foe)}. Say what you do: fight, talk, sneak, search, bribe or pay. Every action is a d20 roll against a difficulty, and ${esc(c.dice.foe)} fights back.`
    : `Buy the ${esc(c.barter.item)} for ${c.budget} ${esc(c.barter.cur)} or less. Name offers, be charming, ask about it, or trade something. Say "deal" to accept the current price. Rudeness drains patience.`;
  $("#howTo").innerHTML = `<p class="small" style="margin:0 0 8px">${how}</p><button type="button" class="ghost sm" id="hintBtn" ${left <= 0 || G.over ? "disabled" : ""}>Get a hint (${Math.max(0, left)} left)</button>`;
  $("#hintBtn").onclick = hint;
  const ms = medalsOf(c), got = ms.filter(m => PR().medals[`${c.id}:${m.id}`]).length;
  $("#medalList").innerHTML = `<div class="small" style="margin-bottom:6px">${got} of ${ms.length} earned</div>` + ms.map(m => { const has = PR().medals[`${c.id}:${m.id}`]; return `<div class="mrow2 ${has ? "got" : ""}" title="${esc(m.desc)}">${medalIcon(m.points)}<span><b>${esc(has || !m.secret ? m.name : "Secret medal")}</b><small>${esc(has || !m.secret ? m.desc : "Keep playing to find out.")} · ${m.points}</small></span></div>`; }).join("");
}

/* End screen: medals, score, best, XP, what to play next */
function upNext(c){
  const played = DB.plays || {}, pool = allCarts().filter(x => x.id !== c.id && !x.shared && !USER_CARTS.some(u => u.id === x.id));
  const fresh = pool.filter(x => !played[x.id]);
  return fresh.find(x => x.genre === c.genre) || fresh[0] || pool.find(x => !DB.best[x.id] || DB.best[x.id] !== "won") || pool[0];
}
function endExtras(c, e){
  const p = PR(); p.stats.plays++; p.stats.turns += G.turn; if (e.won) p.stats.wins++;
  checkMedals(c, {type:"end", end:e});
  const sc = scoreOf(c, e), rec = recordScore(c.id, sc);
  addXP(5 + (e.won ? 20 : 0)); dropSave(c.id);
  const run = G.medalsRun || [], nx = upNext(c);
  $("#endScore").innerHTML = `<div class="scorebig">${sc}</div><div class="small">${rec.isBest ? "New personal best!" : rec.first ? "First score on this cart" : `Your best: ${rec.best}`} · +${5 + (e.won ? 20 : 0) + run.reduce((a, m) => a + m.points, 0)} XP</div>`;
  $("#endMedals").innerHTML = run.length ? run.map(m => `<span class="mchip">${medalIcon(m.points)}${esc(m.name)}</span>`).join("") : `<span class="small">No new medals this time. ${medalsOf(c).filter(m => !p.medals[`${c.id}:${m.id}`]).length} left to find.</span>`;
  $("#endNext").innerHTML = nx ? `<a class="nextc" href="#play-${esc(nx.id)}"><span class="nart">${art(nx)}</span><span><small>Up next</small><b>${esc(nx.title)}</b><span class="small">${esc(genreName(nx.genre))}${nx.community ? " · community" : ""}</span></span></a>` : "";
}
