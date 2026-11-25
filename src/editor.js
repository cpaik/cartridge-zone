/* ---------- cart maker ---------- */
const COMMON = new Set("a an the i you me my your it is are was be to of in on at and or but so if ok okay yes no not do does did have has had what how why who when where this that there here like just really very much can will would could should get got go going know think want need say said tell good bad nice well oh hi hey".split(" "));
let ED = null, benchMem = {}, benchSt = null, edTimer = null;
const RFMT = {};
const newRule = () => ({name:"New rule", phrases:[], unless:[], effects:{}, react:""});

/* ---------- open, switch, save ---------- */
function withDefaults(){ if (ED.engine === "social" && !(ED.moods && ED.moods.length === 5)) ED.moods = DEFAULT_MOODS.map(x => x[1]); }
function openEditor(src){ for (const k in STASH) delete STASH[k]; ED = sanitizeV3(clone(src)); withDefaults(); benchMem = {}; benchSt = null; renderEditor(); }
function startFrom(kind){ const t = clone(TEMPLATES[kind]); t.id = undefined; openEditor(t); toast(`Started from "${t.title}"`); }
const STASH = {};   // each game type's settings survive switching types while editing
const ENGINE_KEYS = {social:["meters","rules","reactions","moods","generic","sens","examples"], dice:["dice"], barter:["barter"]};
function setEngine(e){
  if (ED.engine === e) return;
  STASH[ED.engine] = Object.fromEntries(ENGINE_KEYS[ED.engine].filter(k => ED[k] != null).map(k => [k, clone(ED[k])]));
  ED.engine = e; Object.assign(ED, STASH[e] || {});
  if (e === "social" && !ED.meters) { ED.meters = [newMeter(0)]; ED.rules = []; }
  if (e === "dice" && !ED.dice) ED.dice = {...DICE_DEFAULTS, foe:ED.character};
  if (e === "barter" && !ED.barter) ED.barter = {...BARTER_DEFAULTS};
  ED = sanitizeV3(ED); withDefaults(); benchMem = {}; benchSt = null; renderEditor();
}
function saveED(){ ED = sanitizeV3(ED); withDefaults(); const i = DB.carts.findIndex(x => x.id === ED.id); if (i >= 0) DB.carts[i] = clone(ED); else DB.carts.unshift(clone(ED)); save(); loadUserCarts(); return ED; }

/* ---------- form ---------- */
const field = (label, k, v, o = {}) => {
  const id = "f-" + k.replace(/\W/g, "_"), hint = o.hint ? `<div class="hint">${o.hint}</div>` : "";
  if (o.area) return `<div class="${o.cls || ""}"><label for="${id}">${label}</label><textarea id="${id}" data-k="${k}" data-t="${o.t || "text"}" rows="${o.rows || 3}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""}>${esc(v)}</textarea>${hint}</div>`;
  if (o.sel) return `<div class="${o.cls || ""}"><label for="${id}">${label}</label><select id="${id}" data-k="${k}" data-t="${o.t || "text"}">${o.sel.map(([val, txt]) => `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(txt)}</option>`).join("")}</select>${hint}</div>`;
  if (o.range){ RFMT[k] = o.fmt || (v => v); }
  if (o.range) return `<div class="${o.cls || ""}"><label for="${id}">${label} <b class="rv" data-for="${k}">${o.fmt ? o.fmt(v) : v}</b></label><input id="${id}" type="range" data-k="${k}" data-t="num" min="${o.range[0]}" max="${o.range[1]}" step="${o.range[2]}" value="${v}">${hint}</div>`;
  return `<div class="${o.cls || ""}"><label for="${id}">${label}</label><input id="${id}" data-k="${k}" data-t="${o.t || "text"}" ${o.t === "num" ? 'type="number"' : ""} ${o.t === "color" ? 'type="color" class="sw"' : ""} ${o.min != null ? `min="${o.min}"` : ""} ${o.max != null ? `max="${o.max}"` : ""} value="${esc(v ?? "")}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.len ? `maxlength="${o.len}"` : ""}>${hint}</div>`;
};
const sec = (id, title, sub, body) => `<section class="es" id="es-${id}"><div class="esh"><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ""}</div>${body}</section>`;
const fmtLevel = (labels) => v => labels[Math.min(labels.length - 1, Math.max(0, Math.round((v - 0.4) / 1.6 * (labels.length - 1))))];
function renderEditor(){
  const c = ED, M = c.meters || [];
  const starts = Object.entries(TEMPLATES).map(([k, t]) => `<button type="button" class="tpl" data-tpl="${k}"><span class="tplart">${art({...t, motif:t.look.motif, colors:t.look.colors})}</span><b>${esc(GENRE_NAMES[t.genre])}</b><small>${esc(ENGINES[t.engine][0])}</small></button>`).join("");
  let h = `<div class="starts"><div class="small">Start from a template, or press Fork on any game. Everything is editable.</div><div class="tpls">${starts}</div></div>`;
  h += sec("basics", "Basics", "", `
    <div class="g2">${field("Title", "title", c.title, {len:60})}${field("Category", "genre", c.genre, {sel:Object.entries(GENRE_NAMES)})}</div>
    ${field("One-line pitch", "blurb", c.blurb, {len:160, hint:"Shown on the shelf card."})}
    <label>Game type</label><div class="seg" role="radiogroup">${Object.entries(ENGINES).map(([k, [n, d]]) => `<button type="button" role="radio" aria-checked="${c.engine === k}" class="${c.engine === k ? "on" : ""}" data-engine="${k}"><b>${n}</b><small>${d}</small></button>`).join("")}</div>
    <div class="g2">${field("Turns", "turns", c.turns, {t:"num", min:3, max:30})}${field("Built for", "runtime", c.runtime, {sel:ORDER.map(k => [k, `${RT[k].name} (${RT[k].model})`])})}</div>`);
  h += sec("char", "Character", "The model reads these to play your character. The rules, not the model, decide what changes.", `
    <div class="g2">${field("Name", "character", c.character, {len:40})}${field("Reply length", "style.length", c.style.length, {sel:[["short", "Short: one or two sentences"], ["medium", "Medium: two or three sentences"]]})}</div>
    ${field("Who they are", "persona", c.persona, {area:true, rows:4, ph:"You are…", hint:"Write it as \"You are…\". Say what they want, what they hide, and how they treat the player."})}
    ${field("How they talk", "voice", (c.voice || []).join("\n"), {area:true, t:"lines", rows:3, hint:"Two or three example lines, one per line. Small models copy the style closely, so make these sound exactly right."})}
    ${field("Scene-setting narration (optional)", "scene", c.scene, {area:true, rows:2, hint:"Shown before the character speaks, in the narrator's voice."})}
    ${field("Opening line", "opening", c.opening, {area:true, rows:2})}
    ${field("Creativity", "style.creativity", c.style.creativity, {range:[0.3, 1.2, 0.05], fmt:v => +v < 0.6 ? "steady" : +v < 0.95 ? "balanced" : "wild", hint:"Steady keeps the character predictable. Wild is funnier and more likely to wander."})}`);
  if (c.engine === "social"){
    const meterRows = M.map((m, i) => `<div class="mrow" data-meter="${i}">
      <div class="g6">${field("Meter", `meters.${i}.label`, m.label, {len:20})}${field("Good when", `meters.${i}.goal`, m.goal, {sel:[["up", "higher"], ["down", "lower"]]})}${field("Starts at", `meters.${i}.start`, m.start, {t:"num", min:0, max:100})}${field(m.goal === "down" ? "Win at ≤" : "Win at ≥", `meters.${i}.win`, m.win, {t:"num", min:0, max:100, ph:"none"})}${field(m.goal === "down" ? "Lose at ≥" : "Lose at ≤", `meters.${i}.lose`, m.lose, {t:"num", min:0, max:100, ph:"none"})}${field("Drift / turn", `meters.${i}.drift`, m.drift, {t:"num", min:-10, max:10})}</div>
      <div class="row">${field("Max change / turn", `meters.${i}.step`, m.step, {t:"num", min:4, max:40, cls:"narrow"})}${field("Colour", `meters.${i}.color`, m.color, {t:"color", cls:"narrow"})}${M.length > 1 ? `<button type="button" class="ghost sm" data-delmeter="${i}">Remove meter</button>` : ""}</div></div>`).join("");
    const ruleCards = (c.rules || []).map((r, i) => {
      const eff = M.map(m => `<label class="eff"><span>${esc(m.label)}</span><input type="number" min="-40" max="40" data-k="rules.${i}.effects.${m.id}" data-t="num" value="${r.effects?.[m.id] ?? ""}" placeholder="0"></label>`).join("");
      const sum = M.reduce((a, m) => a + (+r.effects?.[m.id] || 0) * (m.goal === "down" ? -1 : 1), 0);
      return `<div class="rule ${sum > 0 ? "pos" : sum < 0 ? "neg" : ""}" data-rule="${i}">
        <div class="rh"><input class="rname" data-k="rules.${i}.name" value="${esc(r.name)}" aria-label="Rule name" maxlength="60"><span class="rtag">${sum > 0 ? "helps the player" : sum < 0 ? "hurts the player" : "no effect yet"}</span><button type="button" class="ghost sm" data-uprule="${i}" aria-label="Move up" ${i ? "" : "disabled"}>↑</button><button type="button" class="ghost sm" data-delrule="${i}">Remove</button></div>
        ${field("When the player says", `rules.${i}.phrases`, (r.phrases || []).join(", "), {area:true, t:"list", rows:2, ph:"honest, no idea, astronom*, phone .. away"})}
        <details ${r.unless?.length ? "open" : ""}><summary>Unless they also say…</summary>${field("Exceptions", `rules.${i}.unless`, (r.unless || []).join(", "), {area:true, t:"list", rows:2, ph:"phone .. away, no phone"})}</details>
        <div class="effs"><span class="small">Meter change</span>${eff}</div>
        ${field("How the character reacts", `rules.${i}.react`, r.react, {ph:"You love that. Light up and share a detail.", hint:"A stage direction, written to the character (\"You…\"). It is never shown to the player."})}
      </div>`;
    }).join("");
    const gens = [...GENERIC.filter(g => !g.locked).map(g => [g.id, g.label, g.d]), ...Object.entries(EXTRA_GENERIC).map(([k, l]) => [k, l, k === "questions" ? 3 : k === "lowEffort" ? -3 : -6])];
    h += sec("rules", "Meters and rules", "Meters are the scores. Rules say which words move them. Type phrases separated by commas.", `
      <div class="meters">${meterRows}</div>${M.length < 3 ? `<button type="button" class="ghost sm" data-addmeter>+ Add a meter</button>` : ""}
      <div class="syntax"><b>Phrase tricks:</b> <code>astronom*</code> matches any ending · <code>#k</code> matches any number, like 500k · <code>phone .. away</code> allows a few words in between · apostrophes and plurals are optional.</div>
      <div class="rules">${ruleCards || '<div class="empty">No rules yet. Add one: what should your character love, and what should they hate?</div>'}</div>
      <button type="button" class="go sm" data-addrule>+ Add a rule</button>
      <h4>Built-in instincts</h4><p class="note">Every conversation cart can react to these too. Untick any that don't fit your character.</p>
      <div class="toggles">${gens.map(([k, l, d]) => `<label class="tog"><input type="checkbox" data-k="generic.${k}" data-t="bool" ${c.generic?.[k] !== false ? "checked" : ""}> ${esc(l)} <span class="small">(${d > 0 ? "+" : ""}${d})</span></label>`).join("")}</div>
      <h4>Personality</h4>
      <div class="g2">${field("How easily won over", "sens.up", c.sens.up, {range:[0.4, 2, 0.05], fmt:fmtLevel(["very hard", "hard", "normal", "easy", "very easy"])})}${field("How easily offended", "sens.down", c.sens.down, {range:[0.4, 2, 0.05], fmt:fmtLevel(["thick-skinned", "relaxed", "normal", "touchy", "very touchy"])})}</div>
      <h4>Reactions when no rule says otherwise</h4><p class="note">Stage directions for how the character responds to each kind of turn. Separate alternatives with <code>|</code>.</p>
      ${BANDS.map(([b, l]) => field(`${l} (${b})`, `reactions.${b}`, (c.reactions?.[b] || []).join(" | "), {t:"pipes", ph:DEFAULT_REACTIONS[b][0]})).join("")}
      <h4>Mood names</h4><p class="note">How the character feels about the player as ${esc(M[0]?.label || "the first meter")} rises (0, 25, 45, 65, 80). Shown to players and given to the model.</p>
      <div class="g5">${DEFAULT_MOODS.map(([at, nm], i) => field(`From ${at}`, `moods.${i}`, c.moods?.[i] || nm, {len:20})).join("")}</div>`);
  }
  if (c.engine === "dice"){
    const d = c.dice;
    h += sec("rules", "Encounter", "The player needs to get past your character. Every path is a d20 roll against these numbers.", `
      <div class="g3">${field("Foe's name", "dice.foe", d.foe, {len:30})}${field("What they guard", "dice.place", d.place, {len:30, hint:"bridge, stairs, door…"})}${field("Currency", "dice.cur", d.cur, {len:16})}</div>
      <div class="g4">${field("Player HP", "dice.hp", d.hp, {t:"num", min:1, max:99})}${field("Foe HP", "dice.foeHP", d.foeHP, {t:"num", min:1, max:199})}${field("Player starts with", "dice.gold", d.gold, {t:"num", min:0, max:999})}${field("Price to pass", "dice.toll", d.toll, {t:"num", min:1, max:999})}</div>
      <div class="g4">${field("Foe damage", "dice.foeDamage", d.foeDamage, {t:"num", sel:[[4, "d4"], [6, "d6"], [8, "d8"], [10, "d10"], [12, "d12"]]})}${field("Foe attack bonus", "dice.foeAttack", d.foeAttack, {t:"num", min:-2, max:10})}${field("Player armour (AC)", "dice.ac", d.ac, {t:"num", min:5, max:25})}<div></div></div>
      <h4>Difficulty (DC to beat on a d20)</h4><div class="g4">${["attack", "persuade", "sneak", "search"].map(k => field(k[0].toUpperCase() + k.slice(1), `dice.dc.${k}`, d.dc[k], {t:"num", min:2, max:30})).join("")}</div>
      <h4>Player's character sheet</h4><div class="g4">${["STR", "DEX", "CHA", "WIS"].map(k => field(k, `dice.sheet.${k}`, d.sheet[k], {t:"num", min:-3, max:8})).join("")}</div>
      <p class="note">STR adds to attacks and damage, DEX to sneaking, CHA to talking and bribes, WIS to searching. Bribes get +1 for every 2 ${esc(d.cur)} offered.</p>`);
  }
  if (c.engine === "barter"){
    const b = c.barter;
    h += sec("rules", "The deal", "The player wants your item and can't afford the asking price. The rules run the haggle; your merchant only talks.", `
      <div class="g3">${field("Item", "barter.item", b.item, {len:40})}${field("Currency", "barter.cur", b.cur, {len:16})}${field("Trading items", "barter.trades", String(b.trades), {t:"bool2", sel:[["true", "Accepted (+value)"], ["false", "Cash only"]]})}</div>
      <div class="g4">${field("Asking price", "barter.price", b.price, {t:"num", min:2})}${field("Player's budget", "barter.budget", b.budget, {t:"num", min:1})}${field("Secret lowest price", "barter.floor", b.floor, {t:"num", min:1, hint:"Never sells below this."})}${field("Patience", "barter.patience", b.patience, {t:"num", min:20, max:100})}</div>
      ${field("How fast they come down", "barter.toughness", b.toughness, {range:[0.2, 0.6, 0.02], fmt:v => +v < 0.32 ? "stubborn" : +v < 0.47 ? "fair" : "a pushover", hint:"How much of the gap they give up each counteroffer. Charm makes them faster, rudeness slower."})}`);
  }
  const MTYPES = {finish:"Reach any ending", win:"Win", lose:"Lose", ending:"Reach a specific ending", fast:"Win within N turns", nohints:"Win without hints", ...(c.engine === "social" ? {rule:"Trigger a rule", meter:"End with a meter at a value"} : {}), ...(c.engine === "dice" ? {nat20:"Roll a natural 20"} : {}), ...(c.engine === "barter" ? {price:"Win at or under a price", trade:"Offer something in trade", story:"Ask about the item"} : {})};
  const ENDKEYS = c.engine === "social" ? [["win", "Win"], ["lose", "Lose"], ["good", "Good ending"], ["timeout", "Time ran out"]] : c.engine === "dice" ? [["victory", "Defeated the foe"], ["paid", "Paid"], ["bribed", "Bribed"], ["sneaked", "Sneaked past"], ["talked", "Talked past"], ["defeated", "Lost the fight"], ["timeout", "Time ran out"]] : [["deal", "Deal in budget"], ["overpaid", "Overpaid"], ["lose", "Thrown out"], ["timeout", "Time ran out"]];
  const medalCards = (c.medals || []).map((m, i) => {
    const w = m.when || {}, t = MTYPES[w.type] ? w.type : "finish";
    const extra = t === "ending" ? field("Which ending", `medals.${i}.when.value`, w.value, {sel:ENDKEYS})
      : t === "rule" ? field("Which rule", `medals.${i}.when.value`, w.value, {sel:(c.rules || []).map(r => [r.name, r.name])})
      : t === "meter" ? `<div class="g3">${field("Meter", `medals.${i}.when.meter`, w.meter, {sel:(c.meters || []).map(mm => [mm.id, mm.label])})}${field("Is", `medals.${i}.when.op`, w.op, {sel:[[">=", "at least"], ["<=", "at most"]]})}${field("Value", `medals.${i}.when.value`, w.value, {t:"num", min:0, max:100})}</div>`
      : t === "fast" || t === "price" ? field(t === "fast" ? "Turns" : "Price", `medals.${i}.when.value`, w.value, {t:"num", min:1}) : "";
    return `<div class="rule pos" data-medal="${i}"><div class="rh">${medalIcon(m.points)}<input class="rname" data-k="medals.${i}.name" value="${esc(m.name)}" aria-label="Medal name" maxlength="40"><button type="button" class="ghost sm" data-delmedal="${i}">Remove</button></div>
      <div class="g3">${field("Earned when the player…", `medals.${i}.when.type`, t, {sel:Object.entries(MTYPES)})}${field("Points", `medals.${i}.points`, m.points, {t:"num", sel:[[5, "5 (bronze)"], [10, "10 (silver)"], [25, "25 (gold)"], [50, "50 (rare)"], [100, "100 (legendary)"]]})}<label class="tog" style="align-self:end"><input type="checkbox" data-k="medals.${i}.secret" data-t="bool" ${m.secret ? "checked" : ""}> Secret until earned</label></div>
      ${extra}${field("Description", `medals.${i}.desc`, m.desc, {len:120, ph:"What the player did"})}</div>`;
  }).join("");
  h += sec("medals", "Medals and tags", "Medals give players goals beyond winning. Without any, a cart gets three basics: finish, win, and win fast.", `
    ${field("Tags", "tags", (c.tags || []).join(", "), {t:"list", ph:"romance, mystery, cozy", hint:"Up to five, comma-separated. Players can browse by tag."})}
    <div class="rules">${medalCards || '<div class="empty">Using the three basic medals. Add your own to reward secrets, styles of play and near misses.</div>'}</div>
    ${(c.medals || []).length < 12 ? `<button type="button" class="go sm" data-addmedal>+ Add a medal</button>` : ""}`);
  const E = c.endings || {};
  const endBlock = (k, title, note, withMin) => `<div class="endb"><h4>${title}</h4>${note ? `<p class="note">${note}</p>` : ""}<div class="g2">${field("Title", `endings.${k}.title`, E[k]?.title, {len:60})}${withMin ? field("Only if the first meter is at least", `endings.${k}.min`, E[k]?.min ?? 50, {t:"num", min:0, max:100}) : "<div></div>"}</div>${field("What happens (shown on the end screen)", `endings.${k}.text`, E[k]?.text, {area:true, rows:2})}${field("Final line direction", `endings.${k}.line`, E[k]?.line, {ph:"Tell the character what to say as the scene ends.", hint:"The model writes the character's last line from this."})}</div>`;
  let endH = "";
  if (c.engine === "social") endH = endBlock("win", "Win") + endBlock("lose", "Lose") + endBlock("good", "Good ending (time ran out, but close)", "", true) + endBlock("timeout", "Time ran out");
  if (c.engine === "dice") endH = `<p class="note">Each way past the foe has its own ending. Leave one blank to use the default.</p><div class="g2">${[["victory", "Defeated the foe"], ["paid", "Paid the price"], ["bribed", "Bribed them"], ["sneaked", "Sneaked past"], ["talked", "Talked the price to zero"], ["defeated", "Player lost the fight"]].map(([k, l]) => field(l, `dice.endTexts.${k}`, c.dice.endTexts?.[k], {area:true, rows:2})).join("")}</div>` + endBlock("timeout", "Time ran out");
  if (c.engine === "barter") endH = `<p class="note">Deals end the game automatically: under budget wins, over budget loses.</p>` + endBlock("lose", "Patience ran out") + endBlock("timeout", "Time ran out");
  h += sec("endings", "Endings", "", endH);
  h += sec("sugg", "Suggested lines", "Three of these appear as tappable chips each turn. Mix good moves, bad moves and red herrings.", field("One per line", "sugg", (c.sugg || []).join("\n"), {area:true, t:"lines", rows:5}));
  h += sec("look", "Look", "", `<div class="motifs" role="radiogroup">${MOTIFS.map(m => `<button type="button" role="radio" aria-checked="${c.look.motif === m}" class="${c.look.motif === m ? "on" : ""}" data-motif="${m}" aria-label="${m} cover">${art({title:c.title, motif:m, colors:c.look.colors})}</button>`).join("")}</div>
    <div class="g3">${[0, 1, 2].map(i => field(["Background", "Main", "Accent"][i], `look.colors.${i}`, c.look.colors[i], {t:"color"})).join("")}</div>`);
  h += `<div class="edact"><button type="button" class="go" data-testplay>Test play</button><button type="button" class="ok" data-save>Save to your carts</button><span class="small">Saved carts stay in this browser. Share them with the JSON panel.</span></div>`;
  $("#edMain").innerHTML = h;
  renderSide();
}

/* ---------- side panel: preview, health, test bench, share ---------- */
function renderSide(){
  let comp; try { comp = compileCart(ED); } catch (e) { console.error(e); return; }
  comp.motif = ED.look.motif; comp.colors = ED.look.colors; comp.src = ED;
  $("#edPreview").innerHTML = card(comp, true);
  $("#edHealth").innerHTML = health(ED, comp).map(x => `<li class="h-${x[0]}"><span>${x[0] === "ok" ? "✓" : x[0] === "warn" ? "!" : "✕"}</span>${x[1]}</li>`).join("");
  renderBench(comp);
  $("#eJson").value = JSON.stringify(ED, null, 2);
  $("#eSize").textContent = `${kb(new Blob([JSON.stringify(ED)]).size)} cartridge · plays on the ${gbOf(ED.runtime)} GB ${RT[ED.runtime].name} runtime`;
}
const literal = p => String(p).replace(/\*/g, "").replace(/#/g, "5").replace(/\s*\.\.\s*/g, " ").trim();
function lineFor(p){ const l = literal(p); return `well, ${l}, you know`; }
function simSocial(comp, pickBest, turns){
  const st = Object.fromEntries(comp.stats.map(s => [s.key, s.start])), mem = {}, main = comp.stats[0];
  // a sharp player mixes two topics and asks a question back; a careless one just blurts
  const per = comp.likes.map(r => (ED.rules[+r.id.slice(1)]?.phrases || []).slice(0, 3).map(literal));
  const cands = [];
  per.forEach((ps, i) => ps.forEach(p => { cands.push(pickBest ? `${p}, and what about you?` : `well, ${p}, you know`); if (pickBest) per.forEach((qs, j) => { if (j > i) qs.slice(0, 2).forEach(q => cands.push(`${p} and ${q}. what about you?`)); }); }));
  const value = d => comp.stats.reduce((a, s) => a + (d[s.key] || 0) * (s.bad ? -1 : 1) * (s === main ? 1.5 : 1), 0);
  for (let t = 1; t <= turns; t++){
    let best = null;
    for (const l of cands){ const m2 = JSON.parse(JSON.stringify(mem)); const r = scoreSocial(comp, l, m2); const v = value(r.deltas); if (!best || (pickBest ? v > best.v : v < best.v)) best = {l, v, r, m2}; }
    if (!best) return {turns:null};
    Object.assign(mem, best.m2);
    for (const s of comp.stats) if (best.r.deltas[s.key]) st[s.key] = clamp(st[s.key] + best.r.deltas[s.key], s.min, s.max);
    for (const s of comp.stats){
      if ((s.win != null && st[s.key] >= s.win) || (s.winBelow != null && st[s.key] <= s.winBelow)) return {turns:t, won:true};
      if ((s.loseBelow != null && st[s.key] <= s.loseBelow) || (s.loseAbove != null && st[s.key] >= s.loseAbove)) return {turns:t, won:false};
    }
  }
  return {turns:null, st};
}
function health(c, comp){
  const out = [], ok = t => out.push(["ok", t]), warn = t => out.push(["warn", t]), bad = t => out.push(["bad", t]);
  if (!c.persona.trim()) bad("Write who the character is, so the model knows who to play.");
  else if (!/^\s*you are\b/i.test(c.persona)) warn("Start “Who they are” with “You are…”. Small models follow second-person descriptions much better.");
  else ok("Character description is set.");
  if (!(c.voice || []).length) warn("Add two or three example lines under “How they talk”. It's the strongest lever on how the character sounds.");
  if (c.engine === "social"){
    const M = c.meters, main = M[0];
    if (main.win === "" || main.win == null) warn(`${esc(main.label)} has no win point, so players can't win, only run out of turns.`);
    const pos = comp.likes.filter(r => Object.entries(r.d).some(([k, v]) => v * (comp.stats.find(s => s.key === k)?.bad ? -1 : 1) > 0));
    const neg = comp.likes.filter(r => !pos.includes(r));
    if (!pos.length) bad("Nothing the player says can help them yet. Add a rule with a positive effect.");
    if (!neg.length) warn("Nothing the player says can hurt them. A rule or two with a downside makes choices matter.");
    (c.rules || []).forEach((r, i) => {
      const nm = esc(r.name || "Rule " + (i + 1));
      if (!r.phrases.length) warn(`“${nm}” has no phrases yet.`);
      else if (!Object.keys(r.effects).length) warn(`“${nm}” doesn't change any meter.`);
      const common = r.phrases.filter(p => COMMON.has(literal(p).toLowerCase()) || literal(p).length < 3);
      if (common.length) warn(`“${nm}”: ${common.map(p => `“${esc(p)}”`).join(", ")} ${common.length > 1 ? "are" : "is"} so common it will fire on almost anything.`);
      const blocked = r.phrases.filter(p => r.unless.some(u => u.toLowerCase() === p.toLowerCase()));
      if (blocked.length) warn(`“${nm}”: ${blocked.map(p => `“${esc(p)}”`).join(", ")} is also an exception, so it never fires.`);
    });
    const seen = {}; (c.rules || []).forEach(r => { const s = M.reduce((a, m) => a + (+r.effects[m.id] || 0) * (m.goal === "down" ? -1 : 1), 0); r.phrases.forEach(p => { const k = literal(p).toLowerCase(); if (seen[k] != null && Math.sign(seen[k]) !== Math.sign(s) && s) warn(`“${esc(p)}” appears in rules that pull in opposite directions.`); seen[k] = s; }); });
    if (pos.length){
      const best = simSocial(comp, true, c.turns);
      if (best.turns) ok(best.won ? `A sharp player can win in about ${best.turns} of ${c.turns} turns.` : `Careful: even the best moves end in a loss by turn ${best.turns}. Check drift and lose points.`);
      else if (main.win !== "" && main.win != null) bad(`Can't be won in ${c.turns} turns, even playing perfectly. Add rules, raise effects, lower the win point or add turns.`);
    }
    if (neg.length){ const worst = simSocial(comp, false, c.turns); if (worst.turns && !worst.won) ok(`A careless player loses in about ${worst.turns} turns.`); else if (M.some(m => m.lose !== "" && m.lose != null)) warn("Even the worst moves don't reach a lose point in time. That's fine for a cozy game; otherwise make the downsides bigger."); }
    const sugHits = (c.sugg || []).filter(l => scoreSocial(comp, l, {}).hits.some(h => !/one-word|repeat/.test(h))).length;
    if ((c.sugg || []).length) (sugHits ? ok : warn)(`${sugHits} of ${c.sugg.length} suggested lines trigger a rule.`); else warn("Add a few suggested lines so new players know what to try.");
  }
  if (c.engine === "dice"){
    const d = c.dice;
    if (d.gold >= d.toll) warn(`The player starts with enough ${esc(d.cur)} to pay straight away, so the encounter is over on turn 1.`);
    const res = diceOdds(comp, 300);
    out.push(["ok", `Win rates over 300 simulated games each: ${res.map(([n, w]) => `${n} ${w}%`).join(" · ")}`]);
    if (res.every(([, w]) => w < 25)) bad("Every approach loses most of the time. Lower the DCs or the foe's HP.");
    if (res.some(([, w]) => w > 95)) warn("One approach almost always wins. Raise its DC so the other paths matter.");
  }
  if (c.engine === "barter"){
    const b = c.barter;
    if (b.budget < b.floor) bad(`The budget (${b.budget}) is below the secret lowest price (${b.floor}), so this can't be won.`);
    if (b.budget >= b.price) warn("The budget covers the asking price, so there's nothing to haggle over.");
    if (b.floor >= b.price) bad("The secret lowest price must be below the asking price.");
    const r = barterSim(comp); out.push([r.won ? "ok" : "warn", r.won ? `A charming, steady haggler wins in ${r.turns} turns at ${r.price} ${esc(b.cur)}.` : `A charming, steady haggler ends at ${r.price} ${esc(b.cur)}${r.why ? " (" + r.why + ")" : ""}. Consider a lower floor or a pushover merchant.`]);
  }
  return out;
}
function diceOdds(comp, N){
  const strat = {Fight:() => "I attack", Talk:st => st.GOLD >= st.TOLL ? "I pay" : "I ask nicely for a discount", Sneak:() => "I sneak past", Bribe:(st, i) => i === 0 ? `I offer ${Math.max(1, Math.min(st.GOLD, st.TOLL - 2))} ${comp.dice.cur}` : st.GOLD >= st.TOLL ? "I pay" : "I tell a joke to lower the price"};
  return Object.entries(strat).map(([n, f]) => { let w = 0; for (let g = 0; g < N; g++){ const st = Object.fromEntries(comp.stats.map(s => [s.key, s.start])); Object.assign(st, {_grumpy:0, _searches:0, _spotted:0}); let end = null; for (let i = 0; i < comp.turns && !end; i++) end = resolveDice(st, f(st, i), Math.random, comp.dice).end; if (end?.won) w++; } return [n, Math.round(w / N * 100)]; });
}
function barterSim(comp){
  const b = comp.barter, st = {PRICE:b.price, PATIENCE:b.patience, _trades:[], _charm:0, _story:0};
  for (let t = 1; t <= comp.turns; t++){
    const offer = Math.round(b.budget * (0.6 + 0.4 * Math.min(1, t / 5)));
    const r = resolveBarter(st, `It's lovely, would you take ${offer}?`, b);
    if (r.deal) return {won:r.deal.crowns <= b.budget, turns:t, price:r.deal.crowns, why:r.deal.crowns > b.budget ? "over budget" : ""};
    if (st.PATIENCE <= 0) return {won:false, price:st.PRICE, why:"patience ran out"};
  }
  return {won:false, price:st.PRICE, why:"out of turns"};
}
function renderBench(comp){
  const e = comp.engine;
  $("#benchHint").textContent = e === "social" ? "Type what a player might say. See which rules fire, how the meters move and the direction the model gets. Turns add up until you reset." : e === "dice" ? "Type an action. See how it's classified, the roll it needs and the odds." : "Type an offer or a line. See the parsed offer, the tone and the counteroffer.";
  if (!benchSt){ benchSt = Object.fromEntries(comp.stats.map(s => [s.key, s.start])); Object.assign(benchSt, {_grumpy:0, _searches:0, _spotted:0, _trades:[], _charm:0, _story:0}); }
  $("#benchState").innerHTML = comp.stats.map(s => `<span class="chip">${esc(s.label)} <b>${benchSt[s.key]}</b></span>`).join("");
}
function benchTry(){
  const text = $("#benchIn").value.trim(); if (!text) return;
  const comp = compileCart(ED); let html = "";
  if (comp.engine === "social"){
    const r = scoreSocial(comp, text, benchMem);
    for (const s of comp.stats) if (r.deltas[s.key]) benchSt[s.key] = clamp(benchSt[s.key] + r.deltas[s.key], s.min, s.max);
    const b = band(r.deltas[comp.stats[0].key] || 0);
    const dir = (r.dirs[0] || (comp.reactions[b] || [])[0] || "").replace(/\{n\}/g, comp.character);
    html = `<div><b>Rules fired:</b> ${r.hits.length ? r.hits.map(h => `<span class="tagx">${esc(h)}</span>`).join(" ") : "none"}</div>
      <div><b>Meters:</b> ${comp.stats.map(s => { const d = r.deltas[s.key] || 0; const good = s.bad ? d < 0 : d > 0; return `${esc(s.label)} <span class="${d ? good ? "up" : "dn" : ""}">${d > 0 ? "+" : ""}${d}</span>`; }).join(" · ")} · reaction: <b>${b}</b></div>
      <div><b>Direction to the model:</b> ${esc(dir) || "<i>none</i>"}</div>`;
  } else if (comp.engine === "dice"){
    const a = classifyAction(text, benchSt, comp.dice), x = comp.dice;
    const info = {attack:["STR", x.dc.attack], persuade:["CHA", x.dc.persuade + benchSt._grumpy], sneak:["DEX", x.dc.sneak + 2 * benchSt._spotted], search:["WIS", x.dc.search], bribe:["CHA", x.dc.persuade + 1 + benchSt._grumpy]}[a.kind];
    let odds = ""; if (info){ const mod = x.sheet[info[0]] + (a.kind === "bribe" ? Math.floor(a.n / 2) : 0); const need = info[1] - mod; odds = ` · needs ${info[1]} (${info[0]} ${mod >= 0 ? "+" : ""}${mod}) · <b>${clamp(Math.round((21 - clamp(need, 2, 20)) / 20 * 100), 5, 95)}% chance</b>`; }
    html = `<div><b>Read as:</b> ${esc(a.kind)}${a.n != null ? ` (${a.n} ${esc(x.cur)})` : ""}${odds}</div><div class="small">${a.kind === "pay" ? `Pays the full price if they have ${benchSt.TOLL} ${esc(x.cur)}.` : a.kind === "other" ? "Not recognised: the foe just reacts. Try verbs like attack, sneak, ask, search, offer or pay." : ""}</div>`;
  } else {
    const before = benchSt.PRICE, r = resolveBarter(benchSt, text, comp.barter);
    html = `<div><b>Offer read:</b> ${r.offer != null ? r.offer + " " + esc(comp.barter.cur) : "none"}${r.item ? ` + their ${esc(r.item)} (worth ${r.tradeVal})` : ""} · tone: <b>${esc(r.tone)}</b></div>
      <div><b>Result:</b> ${r.deal ? `deal at ${r.deal.crowns} ${esc(comp.barter.cur)} (${r.deal.crowns <= comp.barter.budget ? "a win" : "over budget"})` : benchSt.PRICE !== before ? `counteroffer ${benchSt.PRICE}` : r.note === "lowball" ? "insulted, price stays " + before : "no change to the price"} · patience ${benchSt.PATIENCE}</div>`;
  }
  $("#benchOut").insertAdjacentHTML("afterbegin", `<div class="bres"><div class="bq">“${esc(text)}”</div>${html}</div>`);
  $("#benchIn").value = ""; renderBench(comp);
}
function benchRunSugg(){
  benchReset(); const comp = compileCart(ED);
  const lines = (ED.sugg || []).slice(0, ED.turns);
  if (!lines.length) return toast("Add some suggested lines first");
  for (const l of lines){ $("#benchIn").value = l; benchTry(); }
}
function benchReset(){ benchMem = {}; benchSt = null; $("#benchOut").innerHTML = ""; renderBench(compileCart(ED)); }

/* ---------- editor events ---------- */
function setPath(obj, path, val){ const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++){ const k = ks[i]; if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; } o[ks.at(-1)] = val; }
function readInput(el){
  const t = el.dataset.t, v = el.type === "checkbox" ? el.checked : el.value;
  if (t === "num") return v === "" ? "" : +v;
  if (t === "list") return String(v).split(",").map(x => x.trim()).filter(Boolean);
  if (t === "lines") return String(v).split("\n").map(x => x.trim()).filter(Boolean);
  if (t === "pipes") return String(v).split("|").map(x => x.trim()).filter(Boolean);
  if (t === "bool") return !!v; if (t === "bool2") return v === "true";
  return v;
}
$("#edMain").addEventListener("input", e => {
  const el = e.target; if (!el.dataset.k) return;
  setPath(ED, el.dataset.k, readInput(el));
  if (el.type === "range"){ const rv = document.querySelector(`.rv[data-for="${el.dataset.k}"]`); if (rv) rv.textContent = (RFMT[el.dataset.k] || (v => v))(el.value); }
  clearTimeout(edTimer); edTimer = setTimeout(renderSide, 200);
});
// changes that reshape the form (a meter renamed or flipped, an effect set) re-render once the field is committed
$("#edMain").addEventListener("change", e => {
  const k = e.target.dataset.k || "";
  if (/^meters\.\d+\.(goal|label)$/.test(k) || /\.effects\./.test(k) || /^look\.colors/.test(k) || /^medals\.\d+\.(when\.type|points)$/.test(k) || /^rules\.\d+\.name$/.test(k)){ const y = scrollY; renderEditor(); scrollTo(0, y); }
});
$("#edMain").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const y = scrollY, D = b.dataset;
  if (D.tpl) return startFrom(D.tpl);
  if (D.engine) return setEngine(D.engine);
  if (D.motif){ ED.look.motif = D.motif; renderEditor(); return scrollTo(0, y); }
  if (D.addmeter != null){ ED.meters.push(newMeter(ED.meters.length)); }
  else if (D.delmeter != null){ const m = ED.meters.splice(+D.delmeter, 1)[0]; ED.rules.forEach(r => delete r.effects[m.id]); }
  else if (D.addrule != null){ ED.rules.push(newRule()); }
  else if (D.addmedal != null){ ED.medals = ED.medals || []; ED.medals.push({id:"m" + uid(), name:"New medal", desc:"", points:10, when:{type:"win"}}); }
  else if (D.delmedal != null){ ED.medals.splice(+D.delmedal, 1); }
  else if (D.delrule != null){ ED.rules.splice(+D.delrule, 1); }
  else if (D.uprule != null){ const i = +D.uprule; [ED.rules[i - 1], ED.rules[i]] = [ED.rules[i], ED.rules[i - 1]]; }
  else if (D.save != null){ saveED(); toast("Saved to Your carts"); return renderSide(); }
  else if (D.testplay != null){ saveED(); location.hash = "#play-" + ED.id; return; }
  else return;
  benchMem = {}; benchSt = null; renderEditor(); scrollTo(0, y);
  if (D.addrule != null) setTimeout(() => document.querySelector(`[data-rule="${ED.rules.length - 1}"] .rname`)?.select(), 30);
});
$("#benchForm").onsubmit = e => { e.preventDefault(); benchTry(); };
$("#benchSugg").onclick = benchRunSugg;
$("#benchReset").onclick = benchReset;
$("#eShareLink").onclick = () => shareCartLink(sanitizeV3(ED));
$("#eSubmit").onclick = () => submitCart(sanitizeV3(ED));
$("#eCopy").onclick = async () => { try { await navigator.clipboard.writeText($("#eJson").value); toast("JSON copied"); } catch { $("#eJson").select(); toast("Selected. Press Ctrl/Cmd+C"); } };
function importText(t){ try { const c = sanitizeV3(JSON.parse(t)); openEditor(c); saveED(); toast(`Imported "${c.title}"`); } catch (e) { toast(e.message || "That isn't valid JSON"); } }
$("#eImport").onclick = () => importText($("#eJson").value);
$("#eFile").onchange = async e => { const f = e.target.files[0]; if (f) importText(await f.text()); e.target.value = ""; };
