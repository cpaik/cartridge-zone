/*FORMAT-START*/
/* Cart format v3: shared by the site and the community-shelf GitHub Action. Pure: no DOM. */
const RUNTIME_IDS = ["pocket", "desk", "tower"];
const okHex = s => /^#[0-9a-f]{6}$/i.test(s || "") ? s : null;
const clampF = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 7);
const GENRE_NAMES = {dating:"Dating sim", mystery:"Mystery", tabletop:"Tabletop", roleplay:"Roleplay"};
const MOTIFS = ["train","fang","bridge","bazaar","cafe","castle","forest","disk"];
const BANDS = [["delighted","Big win"],["pleased","Small win"],["neutral","Nothing much"],["annoyed","Small loss"],["offended","Big loss"]];
const clone = o => JSON.parse(JSON.stringify(o));
const ENGINES = {social:["Conversation", "Win someone over, crack a suspect, talk your way in. Meters move when the player says things your rules recognise."], dice:["Dice encounter", "A d20 standoff with real hit points. Fight, talk, bribe, sneak or search; the dice decide."], barter:["Haggle", "Bargain for one item. Your merchant counters offers, warms to charm and loses patience with insults."]};
const newMeter = i => ({id:"m" + uid(), label:i ? "Suspicion" : "Affection", goal:i ? "down" : "up", start:i ? 20 : 30, win:i ? "" : 80, lose:i ? 85 : 5, drift:i ? -2 : 0, step:16, color:i ? "#9aa3b5" : "#ff4f9a"});
/* old carts (v1 with a raw prompt, v2 with likes/dislikes text) become v3 */
function upgradeOld(o){
  const m = o.meter || (Array.isArray(o.stats) && o.stats[0]) || {};
  const list = v => (Array.isArray(v) ? v : String(v || "").split(/[,\n]/)).map(x => String(x).trim().toLowerCase()).filter(x => x.length > 1).slice(0, 40);
  const rules = [];
  if (list(o.likes).length) rules.push({name:"Likes", phrases:list(o.likes), effects:{m1:7}, react:"You like that and warm up."});
  if (list(o.dislikes).length) rules.push({name:"Dislikes", phrases:list(o.dislikes), effects:{m1:-10}, react:"You dislike that and let it show."});
  return {v:3, id:o.id, title:o.title, genre:o.genre, engine:"social", runtime:o.runtime, look:{motif:"disk", colors:o.colors || []}, character:o.character, blurb:o.blurb,
    persona:o.persona || o.system || "", voice:String(o.voiceLines || "").split("\n").map(x => x.trim()).filter(Boolean), opening:o.opening, turns:o.turns,
    meters:[{id:"m1", label:m.label || "Affection", start:m.start ?? 30, win:m.win ?? 80, lose:m.loseBelow ?? 5}], rules};
}
function sanitizeV3(o){
  if (!o || typeof o !== "object") throw new Error("That isn't a cartridge.");
  if (!(o.v >= 3)) o = upgradeOld(o);
  if (!o.title || !(o.persona || o.character)) throw new Error("A cartridge needs at least a title and a character.");
  const s = (v, n = 2000) => String(v ?? "").slice(0, n);
  const num = (v, a, b, d) => v === "" || v == null || !Number.isFinite(+v) ? d : clampF(Math.round(+v * 100) / 100, a, b);
  const arr = (v, max) => Array.isArray(v) ? v.slice(0, max) : [];
  const strs = (v, max, n) => arr(v, max).map(x => s(x, n).trim()).filter(Boolean);
  const engine = ENGINES[o.engine] ? o.engine : "social";
  const out = {v:3, id:/^[uc]-[a-z0-9-]{1,60}$/.test(o.id || "") ? o.id : "u-" + s(o.title, 30).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
    title:s(o.title, 60), genre:GENRE_NAMES[o.genre] ? o.genre : "roleplay", engine, runtime:RUNTIME_IDS.includes(o.runtime) ? o.runtime : "pocket",
    look:{motif:MOTIFS.includes(o.look?.motif) ? o.look.motif : "disk", colors:[0, 1, 2].map(i => okHex(o.look?.colors?.[i]) || ["#24314f", "#ff4f9a", "#ffd166"][i])},
    character:s(o.character || "Stranger", 40), blurb:s(o.blurb, 160), persona:s(o.persona, 1500), voice:strs(o.voice, 6, 200), scene:s(o.scene, 400), opening:s(o.opening, 400),
    turns:num(o.turns, 3, 30, 10), style:{length:o.style?.length === "medium" ? "medium" : "short", creativity:num(o.style?.creativity, 0.3, 1.2, 0.8)},
    sugg:strs(o.sugg, 16, 160)};
  const end = e => e ? {title:s(e.title, 60), text:s(e.text, 300), line:s(e.line, 300), ...(e.min != null ? {min:num(e.min, 0, 100, 50)} : {})} : undefined;
  out.endings = {}; for (const k of ["win", "lose", "good", "timeout"]) if (o.endings?.[k]) out.endings[k] = end(o.endings[k]);
  if (engine === "social"){
    out.meters = arr(o.meters, 3).map((m, i) => ({id:/^m[a-z0-9]{1,8}$/.test(m?.id || "") ? m.id : "m" + (i + 1), label:s(m?.label || "Meter", 20), goal:m?.goal === "down" ? "down" : "up",
      start:num(m?.start, 0, 100, 30), win:num(m?.win, 0, 100, ""), lose:num(m?.lose, 0, 100, ""), drift:num(m?.drift, -10, 10, 0), step:num(m?.step, 4, 40, 16), color:okHex(m?.color) || "#ff4f9a"}));
    if (!out.meters.length) out.meters = [newMeter(0)];
    const ids = new Set(out.meters.map(m => m.id));
    out.rules = arr(o.rules, 40).map(r => ({name:s(r?.name, 60), phrases:strs(r?.phrases, 80, 60), unless:strs(r?.unless, 40, 60),
      effects:Object.fromEntries(Object.entries(r?.effects || {}).filter(([k, v]) => ids.has(k) && Number.isFinite(+v) && +v).map(([k, v]) => [k, clampF(Math.round(+v), -40, 40)])), react:s(r?.react, 240)}));
    out.reactions = {}; for (const [b] of BANDS) out.reactions[b] = strs(o.reactions?.[b], 4, 200);
    out.moods = strs(o.moods, 5, 20); if (out.moods.length !== 5) delete out.moods;
    out.generic = {}; for (const k of [...GENERIC.filter(g => !g.locked).map(g => g.id), ...Object.keys(EXTRA_GENERIC)]) out.generic[k] = o.generic?.[k] !== false;
    out.sens = {up:num(o.sens?.up, 0.4, 2, 1), down:num(o.sens?.down, 0.4, 2, 1)};
    if (o.examples) out.examples = {good:strs(o.examples.good, 5, 160), bad:strs(o.examples.bad, 5, 160), neutral:strs(o.examples.neutral, 5, 160)};
  }
  if (engine === "dice"){
    const d = o.dice || {};
    out.dice = {foe:s(d.foe || out.character, 30), place:s(d.place || "gate", 30), cur:s(d.cur || "gold", 16), hp:num(d.hp, 1, 99, 12), foeHP:num(d.foeHP, 1, 199, 14), gold:num(d.gold, 0, 999, 6), toll:num(d.toll, 1, 999, 10),
      foeDamage:[4, 6, 8, 10, 12].includes(+d.foeDamage) ? +d.foeDamage : 6, foeAttack:num(d.foeAttack, -2, 10, 3), ac:num(d.ac, 5, 25, 12),
      dc:{attack:num(d.dc?.attack, 2, 30, 12), persuade:num(d.dc?.persuade, 2, 30, 12), sneak:num(d.dc?.sneak, 2, 30, 15), search:num(d.dc?.search, 2, 30, 10)},
      sheet:{STR:num(d.sheet?.STR, -3, 8, 2), DEX:num(d.sheet?.DEX, -3, 8, 1), CHA:num(d.sheet?.CHA, -3, 8, 1), WIS:num(d.sheet?.WIS, -3, 8, 0)},
      endTexts:Object.fromEntries(["victory","paid","bribed","sneaked","talked","defeated"].map(k => [k, s(d.endTexts?.[k], 300)]).filter(([, v]) => v))};
  }
  if (engine === "barter"){
    const b = o.barter || {};
    out.barter = {item:s(b.item || "curio", 40), cur:s(b.cur || "crowns", 16), price:num(b.price, 2, 99999, 240), budget:num(b.budget, 1, 99999, 90), floor:num(b.floor, 1, 99999, 70), patience:num(b.patience, 20, 100, 100), toughness:num(b.toughness, 0.2, 0.6, 0.4), trades:b.trades !== false};
  }
  return out;
}


/* Server-side gate for the community shelf: hard errors block publishing; warnings are reported. */
function validateCart(raw){
  const errors = [], warnings = [];
  let c; try { c = sanitizeV3(raw); } catch (e) { return {errors:[e.message || String(e)], warnings, cart:null}; }
  let comp; try { comp = compileCart(c); } catch (e) { errors.push("The cart didn't compile: " + (e.message || e)); return {errors, warnings, cart:c}; }
  if (!c.persona.trim()) errors.push("Describe who the character is.");
  if (c.engine === "social"){
    const helps = comp.likes.filter(r => Object.entries(r.d).some(([k, v]) => v * (comp.stats.find(s => s.key === k)?.bad ? -1 : 1) > 0));
    if (!helps.length) errors.push("No rule helps the player, so the cart can't be played meaningfully.");
    if (comp.stats.every(s => s.win == null && s.winBelow == null)) warnings.push("No meter has a win point.");
  }
  if (c.engine === "dice" && c.dice.gold >= c.dice.toll) warnings.push("The player can pay on turn one.");
  if (c.engine === "barter"){ if (c.barter.budget < c.barter.floor) errors.push("The budget is below the secret lowest price, so it can't be won."); if (c.barter.floor >= c.barter.price) errors.push("The lowest price must be below the asking price."); }
  if (!(c.voice || []).length) warnings.push("No example lines under How they talk.");
  return {errors, warnings, cart:c};
}
/*FORMAT-END*/
