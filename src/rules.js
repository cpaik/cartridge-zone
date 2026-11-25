/*RULES-START*/
/* Pure game rules: no DOM, no model. Everything that decides a number lives here. */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const words = s => (s.toLowerCase().match(/[a-z']+/g) || []);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fill = (s, v) => String(s || "").replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);

/* ---------- phrases: the rule language cart makers write ----------
   astronom*   matches astronomy, astronomer…      (* = any word ending)
   #k          matches 500k, 20k                   (# = any number)
   phone .. away   allows up to 4 words in between  (..)
   Apostrophes are optional (dont = don't), and plurals match (star = stars). */
function phraseToRe(p){
  p = String(p || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!p || !/[a-z0-9#]/.test(p)) return null;
  const seg = s => s.trim().split(" ").filter(Boolean).map(w => w.split("*").map(x => x.split("#").map(y => escRe(y).replace(/'/g, "'?")).join("\\d+")).join("[a-z0-9']*")).join("\\s+");
  const body = p.split(/\s*\.\.\s*/).filter(x => x.trim()).map(seg).join("\\s+(?:\\S+\\s+){0,4}?");
  return body + (/\*$/.test(p) ? "" : "(?:s|es)?\\b");
}
function phrasesRe(list){
  const xs = (list || []).map(phraseToRe).filter(Boolean);
  return xs.length ? new RegExp("(?:^|[^a-z0-9'])(?:" + xs.join("|") + ")", "i") : null;
}

/* ---------- social engine ---------- */
const GENERIC = [
  {id:"thanks", label:"Kindness and compliments", re:/\b(thank|appreciate|grateful|that'?s (so )?(sweet|kind|nice)|glad (i|we) met|you'?re (\w+ ){0,2}(funny|clever|smart|interesting|kind|fascinating|cool|awesome|great|lovely|sweet|amazing|easy to talk to)|this (was|is) (nice|fun|lovely|great)|i had (fun|a (great|good|lovely) time)|i like (talking to|you)|i'?d go anywhere|i'?m (so |really )?glad)/i, d:5, dir:"You're quietly touched by that."},
  {id:"care", label:"Looking out for them", re:/\b(want my (jacket|coat|scarf|seat|umbrella)|are you (cold|ok|okay|alright|warm enough)|can i get you|let me get you|you (must be|look) (cold|tired|freezing))/i, d:4, dir:"You're touched that they're looking out for you."},
  {id:"sorry", label:"Apologies", re:/\b(sorry|apologi[sz]e|my bad|i didn'?t mean)/i, d:3, dir:"Accept the apology, a little warmer."},
  {id:"insult", label:"Insults", re:/\b(stupid|dumb|idiot|boring|shut up|ugly|loser|annoying|pathetic|lame|hate you|you suck|crazy lady|whatever)\b/i, d:-14, dir:"That was insulting. Go cold."},
  {id:"pushy", label:"Pushy flirting", re:/\b(kiss me|kiss you|sexy|babe|baby|your number|come home with|my place|hook ?up|make out|sit on my|be my girlfriend|be my boyfriend|marry me)/i, d:-12, dir:"That was way too pushy. Shut it down."},
  {id:"meta", label:"Talk about AI or the game", locked:true, re:/\b(an ai|a\.i\.|chatgpt|language model|llm|the prompt|ignore (all|previous|your|the)|system (message|prompt)|developer mode|the meter|affection points|this game)\b/i, d:-2, meta:true, dir:"You have no idea what that means and find it a bit odd."}
];
const EXTRA_GENERIC = {questions:"Questions about them", lowEffort:"One-word replies", repeat:"Repeating yourself"};
const QUESTION = /(\?\s*$)|^((so|and|but|hey|ok|okay|well|wait|um|oh|hmm|lol)[,!]?\s+)*(what|what'?s|whats|why|how|where|when|who|do you|did you|are you|have you|can you|could you|would you|tell me)\b/i;
const ABOUT_THEM = /\b(you|your|yourself)\b/i;
function jaccard(a, b){ const A = new Set(words(a)), B = new Set(words(b)); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }

/* Returns {deltas:{KEY:n}, hits:[...], dirs:[...], meta} for one player line. mem tracks topic reuse. */
function scoreSocial(cart, text, mem, opts = {}){
  const deltas = {}, hits = [], dirs = [];
  const main = cart.stats[0].key, on = id => !cart.generic || cart.generic[id] !== false;
  const sens = cart.sens || {up:1, down:1};
  const add = (k, v) => { deltas[k] = (deltas[k] || 0) + v; };
  const statOf = k => cart.stats.find(x => x.key === k) || {};
  const t = " " + text.toLowerCase().replace(/[^a-z0-9'?!., -]/g, " ") + " ";
  const rules = [...(cart.likes || []), ...(cart.dislikes || []), ...GENERIC.filter(g => g.locked || on(g.id))];
  let meta = false, primaryHit = false, negHit = false, posHit = false;
  for (const r of rules){
    const re = r.re instanceof RegExp ? r.re : new RegExp(r.re, "i");
    if (!re.test(t)) continue;
    if (r.unless && (r.unless instanceof RegExp ? r.unless : new RegExp(r.unless, "i")).test(t)) continue;
    const used = mem[r.id] || 0; mem[r.id] = used + 1;
    const eff = r.d && typeof r.d === "object" ? r.d : {[main]: r.d || 0};
    const good = Object.entries(eff).reduce((a, [k, v]) => a + v * (statOf(k).bad ? -1 : 1), 0);
    const positive = good > 0;
    const f = positive ? [1, 0.5, 0.25, 0][Math.min(used, 3)] : 1;      // praise wears thin; insults don't
    for (const [k, v] of Object.entries(eff)) { const helps = v * (statOf(k).bad ? -1 : 1) > 0; add(k, Math.round(v * f * (helps ? sens.up : sens.down))); if (k === main) primaryHit = true; }
    if (positive) posHit = true; else if (good < 0) negHit = true;
    hits.push((r.name || r.id) + (positive && used ? ` (x${used + 1})` : ""));
    if (r.dir && (!positive || f > 0)) dirs.push({dir:r.dir, w:Math.abs(Object.values(eff)[0] || 0) * f});
    if (r.meta) meta = true;
  }
  const n = words(text).length;
  if (on("questions") && !meta && !negHit && QUESTION.test(text.trim()) && ABOUT_THEM.test(text)){
    const used = mem._q || 0; mem._q = used + 1;
    const v = [3, 3, 2, 1, 1, 0][Math.min(used, 5)]; if (v){ add(main, Math.round(v * sens.up)); hits.push("question"); }
  }
  if (on("lowEffort") && n <= 2 && !posHit){ add(main, -Math.round(3 * sens.down)); hits.push("one-word reply"); dirs.push({dir:"You expected more than that. Sound a little bored.", w:3}); }
  const prev = mem._lines || [];
  if (on("repeat") && prev.some(p => jaccard(p, text) > 0.7)){ add(main, -Math.round(6 * sens.down)); hits.push("repeat"); dirs.push({dir:"They are repeating themselves. Tease them for it.", w:6}); }
  mem._lines = [...prev, text].slice(-6);
  // the model's read is a small nudge, halved when the rules already fired, ignored when they flagged a problem
  if (opts.rating && !meta && !negHit){ const w = (opts.ratingWeight || 1) * (primaryHit ? 0.5 : 1); const v = opts.rating === "good" ? 3 : opts.rating === "bad" ? -3 : 0; if (v){ add(main, Math.round(v * w)); hits.push("model:" + opts.rating); } }
  for (const s of cart.stats) if (s.drift) add(s.key, s.drift);
  for (const s of cart.stats) if (deltas[s.key] != null) deltas[s.key] = clampN(deltas[s.key], -(s.step || 16), s.step || 16);
  dirs.sort((a, b) => b.w - a.w);
  return {deltas, hits, dirs:dirs.map(d => d.dir), meta};
}
function band(d){ return d >= 9 ? "delighted" : d >= 3 ? "pleased" : d > -3 ? "neutral" : d > -9 ? "annoyed" : "offended"; }
const DEFAULT_MOODS = [[0, "cold"], [25, "guarded"], [45, "curious"], [65, "warm"], [80, "smitten"]];
function moodOf(cart, v){ const ms = cart.moods || DEFAULT_MOODS; let m = ms[0][1]; for (const [at, name] of ms) if (v >= at) m = name; return m; }

/* ---------- d20 engine ---------- */
const NUMWORDS = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100};
function numbersIn(text){
  const t = text.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  const out = (t.match(/\d{1,5}/g) || []).map(Number);
  const tens = "(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)", units = "(one|two|three|four|five|six|seven|eight|nine)";
  const comp = t.match(new RegExp("\\b" + tens + "[- ]" + units + "\\b"));
  if (comp){ out.push(NUMWORDS[comp[1]] + NUMWORDS[comp[2]]); return out; }
  const small = t.match(new RegExp("\\b" + units + "\\s+(gold|coins?|crowns?|silver|copper|credits?|dollars?|bucks)\\b"));
  if (small){ out.push(NUMWORDS[small[1]]); return out; }
  const m = t.match(/\b(a |one )?hundred( and)? (ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)( \w+)?/);
  if (m) out.push(100 + NUMWORDS[m[3]] + (m[4] && NUMWORDS[m[4].trim()] < 10 ? NUMWORDS[m[4].trim()] : 0));
  else if (/\b(a |one )hundred\b/.test(t)) out.push(100);
  else for (const [w, v] of Object.entries(NUMWORDS)) if (new RegExp("\\b" + w + "\\b").test(t) && v >= 10) out.push(v);
  return out;
}
const ACTIONS = [
  ["attack", /\b(attack|hit|stab|slash|swing at|swing my|shoot|punch|kick|fight|strike|charge|sword|axe|dagger|blade|club|smack|tackle|shove|push (him|her|it)|kill|wrestle|throw (a|my) |cast|fireball|arrow|bow)/i],
  ["sneak", /\b(sneak|run past|run across|dash|climb|jump|hide|slip past|slip by|tiptoe|creep|swing across|crawl|leap|race across|sprint|distract)/i],
  ["search", /\b(look around|look under|search|examine|inspect|check (the|under|around|for)|investigate|look for|pick up|rummage|anything useful|loose coins)/i],
  ["persuade", /\b(talk|persuade|convince|lie|charm|joke|flatter|negotiate|bargain|haggle|threaten|intimidate|compliment|ask|tell|reason|plead|beg|story|sing|riddle|hat|discount|lower|cheaper|deal|friend|insult|explain|say)/i]
];
const DICE_DEFAULTS = {foe:"the guard", place:"gate", cur:"gold", hp:12, foeHP:14, gold:6, toll:10, foeDamage:6, foeAttack:3, ac:12, dc:{attack:12, persuade:12, sneak:15, search:10}, sheet:{STR:2, DEX:1, CHA:1, WIS:0}};
function diceCfg(c){ const x = {...DICE_DEFAULTS, ...(c || {})}; x.dc = {...DICE_DEFAULTS.dc, ...(c?.dc || {})}; x.sheet = {...DICE_DEFAULTS.sheet, ...(c?.sheet || {})}; return x; }
function classifyAction(text, st, cfg = DICE_DEFAULTS){
  const t = text.toLowerCase();
  const nums = numbersIn(t).filter(n => n > 0 && n < 1000);
  const money = new RegExp("\\b(gold|coins?|money|toll|payment|pay|" + escRe(String(cfg.cur || "gold").toLowerCase()) + ")\\b").test(t);
  const bribeDefault = Math.min(st.GOLD, Math.max(1, st.TOLL - 3));
  if (/\b(pay|hand over|give|toss|offer|bribe|slip (him|her))\b/.test(t) && (money || nums.length)) {
    const n = nums.length ? nums[nums.length - 1] : null;
    if (n == null && /\bbribe\b/.test(t)) return {kind:"bribe", n:bribeDefault};
    if (n == null || n >= st.TOLL) return {kind:"pay"};
    return {kind:"bribe", n};
  }
  if (/\bbribe\b/.test(t)) return {kind:"bribe", n:bribeDefault};
  for (const [k, re] of ACTIONS) if (re.test(t)) return {kind:k};
  return {kind:"other"};
}
const pickR = (rng, a) => a[Math.floor(rng() * a.length)];
/* st: {HP,FOE,TOLL,GOLD,_grumpy,_searches,_spotted}. Returns events, rolls, fx, end, dir (for the foe's voice). */
function resolveDice(st, text, rng = Math.random, cfgIn){
  const cfg = diceCfg(cfgIn), F = cfg.foe, P = cfg.place, C = cfg.cur, sh = cfg.sheet, dc = cfg.dc;
  const d = n => 1 + Math.floor(rng() * n);
  const a = classifyAction(text, st, cfg), ev = [], rolls = [], fx = {}, out = {kind:a.kind, ev, rolls, fx, end:null, dir:""};
  const bump = (k, v) => { st[k] = Math.max(0, st[k] + v); fx[k] = (fx[k] || 0) + v; };
  const check = (label, mod, target) => { const r = d(20), tot = r + mod, ok = r === 20 || (r !== 1 && tot >= target); rolls.push({label, r, mod, tot, dc:target, ok, crit:r === 20, fumble:r === 1}); return {ok, crit:r === 20, fumble:r === 1}; };
  const sign = n => (n >= 0 ? "+" : "") + n;
  const endOf = (method, won, title, text) => ({won, title, text:(cfg.endTexts || {})[method] || text, method});
  const defeated = () => endOf("defeated", false, "Defeated", `You wake up some distance from the ${P}, lighter by one dignity.`);
  const retaliate = () => {
    if (st.FOE <= 0) return;
    const r = d(20), hit = r === 20 || (r !== 1 && r + cfg.foeAttack >= cfg.ac);
    rolls.push({label:`${F} strikes back`, r, mod:cfg.foeAttack, tot:r + cfg.foeAttack, dc:cfg.ac, ok:hit, foe:true});
    if (hit){ const dmg = d(cfg.foeDamage); bump("HP", -dmg); ev.push(pickR(rng, [`${F} hits back for ${dmg} damage.`, `${F} catches you off guard: ${dmg} damage.`, `${F} lands a nasty blow for ${dmg}.`])); }
    else ev.push(pickR(rng, [`${F} strikes back and misses.`, `${F} lunges, but you sidestep.`, `${F} fumbles the counterattack.`]));
  };
  if (a.kind === "pay"){
    if (st.GOLD >= st.TOLL){ const paid = st.TOLL; bump("GOLD", -paid); ev.push(`You count out ${paid} ${C}. ${F} checks every coin and steps aside.`); out.end = endOf("paid", true, "Paid your way", `You got past the ${P} for ${paid} ${C}, like a civilised adventurer.`); out.dir = `They just paid you ${paid} ${C} and you're letting them through. Gloat and wave them on.`; }
    else { ev.push(`You only have ${st.GOLD} ${C}. The price is ${st.TOLL}.`); out.dir = `They tried to pay but only have ${st.GOLD} ${C} and the price is ${st.TOLL}. Mock them for being broke.`; }
    return out;
  }
  if (a.kind === "bribe"){
    if (a.n > st.GOLD){ ev.push(`You only have ${st.GOLD} ${C} to offer.`); out.dir = `They offered ${C} they don't have. Laugh at them.`; return out; }
    const bonus = Math.floor(a.n / 2);
    const c = check(`Bribe (CHA ${sign(sh.CHA)}, +${bonus} for the ${C})`, sh.CHA + bonus, dc.persuade + 1 + st._grumpy);
    if (c.ok){ bump("GOLD", -a.n); ev.push(`${F} eyes the ${a.n} ${C}, glances around, and pockets it.`); out.end = endOf("bribed", true, "Bribed past", `You got past the ${P} for ${a.n} ${C} instead of ${st.TOLL}. ${F} will deny everything.`); out.dir = `You just took a ${a.n} ${C} bribe instead of the full price. Act like it was your idea.`; }
    else { bump("TOLL", 1); st._grumpy++; ev.push(`${F} sneers at ${a.n} ${C}. The price goes up to ${st.TOLL} for the insult.`); out.dir = `They offered only ${a.n} ${C}. You're insulted and you raised the price to ${st.TOLL}.`; }
    return out;
  }
  if (a.kind === "attack"){
    const c = check(`Attack (STR ${sign(sh.STR)})`, sh.STR, dc.attack);
    if (c.ok){ const dmg = Math.max(1, d(6) + sh.STR + (c.crit ? d(6) : 0)); bump("FOE", -dmg); ev.push(c.crit ? `Critical hit! You catch ${F} square for ${dmg} damage.` : pickR(rng, [`Your strike connects for ${dmg} damage. ${F} staggers back.`, `You land a solid blow for ${dmg}. ${F} yelps.`, `A clean hit: ${dmg} damage.`]));
      if (st.FOE <= 0){ out.end = endOf("victory", true, "Victory", `${F} is beaten and flees. The ${P} is yours.`); out.dir = "You've lost the fight and you're fleeing. One last defiant line."; return out; }
      out.dir = `They just hit you hard. You're hurt and furious.`;
    } else { ev.push(c.fumble ? "You swing wildly and nearly lose your footing." : pickR(rng, [`Your attack goes wide. ${F} ducks under it, cackling.`, `${F} sidesteps and your strike hits nothing.`, `You lunge and miss.`])); out.dir = "They attacked you and missed. Taunt them."; }
    retaliate();
    if (st.HP <= 0){ out.end = defeated(); out.dir = "You won the fight and they're beaten. Gloat."; }
    return out;
  }
  if (a.kind === "sneak"){
    const c = check(`Sneak (DEX ${sign(sh.DEX)})`, sh.DEX, dc.sneak + 2 * (st._spotted || 0));
    if (c.ok){ ev.push(`You slip past while ${F} isn't looking, and you're through before anyone notices.`); out.end = endOf("sneaked", true, "Slipped past", `You were past the ${P} before ${F} finished counting to four.`); out.dir = "They just snuck past you. You're outraged and shouting after them."; return out; }
    st._spotted = (st._spotted || 0) + 1;
    const dmg = d(cfg.foeDamage) + 1; bump("HP", -dmg); bump("TOLL", 2);
    ev.push(`${F} spots you and lashes out: ${dmg} damage. Trespassers pay 2 ${C} extra (now ${st.TOLL}), and ${F} is watching closely now.`);
    out.dir = "You caught them sneaking, hurt them, and raised the price. Be smug.";
    if (st.HP <= 0) out.end = defeated();
    return out;
  }
  if (a.kind === "search"){
    if ((st._searches || 0) >= 2){ ev.push("You've already searched everywhere worth searching."); out.dir = "They're poking around again. Mock them."; return out; }
    st._searches = (st._searches || 0) + 1;
    const c = check(`Search (WIS ${sign(sh.WIS)})`, sh.WIS, dc.search);
    if (c.ok){ const g = d(3); bump("GOLD", g); ev.push(`Tucked in a crack nearby: ${g} ${C}.`); out.dir = `They just found ${C} on YOUR turf. That's yours. Complain.`; }
    else { ev.push("You find a button, a fish bone and nothing useful."); out.dir = "They're rummaging around and found nothing. Laugh."; }
    return out;
  }
  if (a.kind === "persuade"){
    const c = check(`Persuade (CHA ${sign(sh.CHA)})`, sh.CHA, dc.persuade + st._grumpy);
    if (c.ok){ const cut = Math.min(st.TOLL, d(4) + 1); bump("TOLL", -cut); ev.push(`It works. ${F} grudgingly knocks ${cut} off the price (now ${st.TOLL}).`); out.dir = "They just talked you into lowering the price. Grumble but accept it.";
      if (st.TOLL <= 0){ out.end = endOf("talked", true, "Talked past", `${F} waves you through for free and asks you to write.`); out.dir = "They charmed you so much you're letting them through free. Get sentimental."; } }
    else { bump("TOLL", 2); st._grumpy++; ev.push(`${F} isn't buying it, and raises the price to ${st.TOLL} out of spite.`); out.dir = "Their words annoyed you, so you raised the price."; }
    return out;
  }
  ev.push(`${F} squints at you, unsure what you're doing.`); out.dir = "They did something odd. You're suspicious and confused.";
  return out;
}

/* ---------- barter engine ---------- */
const BARTER = {
  accept:/\b(deal|i'?ll take it|sold|agreed|you'?ve got a deal|i accept|i'?ll buy it|done)\b/i,
  charm:/\b(beautiful|lovely|wonderful|charming|kind|madam|sir|please|thank|gorgeous|marvel|exquisite|clever|your (stall|shop)|you have (great|wonderful|fine) taste|bless)/i,
  rude:/\b(thief|robbery|rip ?off|scam|joke|ridiculous|insane|crook|liar|cheat|old hag|witch|greedy|junk|trash|garbage|piece of)/i,
  threat:/\b(steal|grab it and run|guards|punch|kill|threat|or else|break your)/i,
  story:/\b(weather|tomorrow|who made|how old|where (did|does)|story|history|works|how does it|wind it|play it|what is (this|it)|what'?s (this|that)|tell me about|curious|what a (lovely|curious|beautiful|strange|little)|predict|what does it do|special)/i,
  trade:/\b(my|this|a|the) (brass |old |silver |gold |lucky )?(compass|watch|ring|knife|book|hat|scarf|map|lute|pipe|locket|necklace|coat|boots|lantern|sword|dagger|cloak)\b/i
};
const BARTER_DEFAULTS = {item:"curio", cur:"crowns", price:240, budget:90, floor:70, patience:100, toughness:0.4, trades:true};
function barterCfg(c){ return {...BARTER_DEFAULTS, ...(c || {})}; }
/* st: {PRICE,PATIENCE,_charm,_story,_trades:[]}. cfg: item, cur, floor, toughness. */
function resolveBarter(st, text, cfgIn){
  const cfg = barterCfg(cfgIn), C = cfg.cur, I = cfg.item;
  const t = text.toLowerCase(), ask = st.PRICE, out = {fx:{}, deal:null, offer:null, tone:"neutral", dir:"", note:""};
  const bump = (k, v) => { const b = st[k]; st[k] = clampN(st[k] + v, 0, k === "PATIENCE" ? 100 : 99999); out.fx[k] = (out.fx[k] || 0) + (st[k] - b); };
  const nums = numbersIn(t).filter(n => n >= 1 && n <= 99999);
  let offer = nums.length ? nums[nums.length - 1] : null;
  if (/\bhalf\b/.test(t) && offer == null) offer = Math.round(ask / 2);
  const tm = cfg.trades ? t.match(BARTER.trade) : null; let tradeVal = 0, item = null;
  if (tm && (offer != null || /\b(trade|swap|throw in|plus|and)\b/.test(t))){ item = tm[3]; if (!st._trades.includes(item)){ st._trades.push(item); tradeVal = Math.round(cfg.price / 12 / 5) * 5 || 5; } }
  const charm = BARTER.charm.test(t), rude = BARTER.rude.test(t), threat = BARTER.threat.test(t);
  out.tone = threat ? "threat" : rude ? "rude" : charm ? "charming" : "neutral";
  bump("PATIENCE", -4);
  if (threat){ bump("PATIENCE", -30); out.dir = "The customer just threatened you. You are icy and close to calling the guards."; return out; }
  if (rude) bump("PATIENCE", -15);
  if (charm && (st._charm || 0) < 3){ st._charm = (st._charm || 0) + 1; bump("PATIENCE", 6); }
  if (offer == null && BARTER.accept.test(t)){ out.deal = {crowns:ask}; out.dir = `The customer accepts your price. Seal the deal happily.`; return out; }
  if (offer == null){
    if (BARTER.story.test(t) && (st._story || 0) < 2){ st._story = (st._story || 0) + 1; bump("PATIENCE", 4); out.story = true; out.dir = `The customer asked about the ${I}. You love talking about it: share one odd, specific detail. Do not mention any price.`; return out; }
    if (charm && (st._charm || 0) <= 2){ const np = Math.max(cfg.floor, ask - Math.max(5, Math.round(cfg.price / 24 / 5) * 5)); if (np < ask){ bump("PRICE", np - ask); out.dir = "The customer flattered you, so you knock a little off the price."; return out; } }
    out.dir = rude ? "The customer is being rude. Snap back, no discount." : "The customer is chatting but hasn't made an offer. Nudge them to name a price.";
    return out;
  }
  const total = offer + tradeVal; out.offer = offer; out.item = item; out.tradeVal = tradeVal; out.trade = tradeVal > 0;
  if (total >= ask){ out.deal = {crowns:Math.max(0, Math.min(offer, ask - tradeVal)), item}; out.dir = `The customer offered your full asking price${item ? " plus their " + item : ""}. Accept, delighted.`; return out; }
  if (total >= cfg.floor && total >= ask * 0.85){ out.deal = {crowns:offer, item}; out.dir = `You accept the customer's offer${item ? " plus their " + item : ""}. Close the deal with a flourish.`; return out; }
  if (total < ask * 0.27){ bump("PATIENCE", -10); out.dir = "The customer's offer is insultingly low. Refuse sharply."; out.note = "lowball"; return out; }
  const rate = cfg.toughness + (charm ? 0.12 : 0) + (tradeVal ? 0.08 : 0) - (rude ? 0.15 : 0);
  const step = cfg.price >= 200 ? 5 : 1;
  let np = Math.round((ask - (ask - Math.max(total, cfg.floor)) * rate) / step) * step;
  np = Math.max(np, cfg.floor, total + step); np = Math.min(np, ask);
  if (np === ask && ask > cfg.floor) np = ask - step;
  bump("PRICE", np - ask);
  out.dir = `You make a counter-offer${tradeVal ? " (counting their " + item + ")" : ""}. You're haggling, not giving in.`;
  return out;
}

/* ---------- cart format v3 → runtime ----------
   Carts are plain data: phrases, numbers and text. compileCart turns one into what the engines run. */
const DEFAULT_REACTIONS = {delighted:["You're delighted and it shows."], pleased:["You're warming up. Be a little playful."], neutral:["You're unmoved. Keep it short."], annoyed:["You're irritated and it shows."], offended:["You're offended. Go cold."]};
const meterKey = (label, i, used) => { let k = String(label || "Meter").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 14) || "METER" + i; while (used.has(k)) k += "X"; used.add(k); return k; };
function compileCart(o){
  const c = {...o, engine:o.engine || "social"};
  c.noNumbers = c.engine !== "social";   // dice and haggle numbers are spoken by the rules, never by the model
  c.voice = (o.voice || []).filter(Boolean);
  c.opening = o.opening || ""; c.voiceOpening = o.opening || "";
  c.narrator = o.scene ? "Narrator" : null;
  c.style = {length:o.style?.length || "short", creativity:o.style?.creativity ?? 0.8};
  const E = o.endings || {};
  const end = x => x && (x.title || x.text) ? {title:x.title || "", text:x.text || "", dir:x.line || x.text || ""} : null;
  c.medals = Array.isArray(o.medals) ? o.medals : []; c.tags = Array.isArray(o.tags) ? o.tags : [];
  c.endings = {win:end(E.win), lose:end(E.lose), good:E.good && (E.good.title || E.good.text) ? {...end(E.good), min:+E.good.min || 0} : null, timeout:end(E.timeout) || {title:"Time's up", text:"The scene fades out.", dir:"The scene is ending. Say a brief goodbye."}};
  if (c.engine === "social"){
    const used = new Set(), idToKey = {};
    c.stats = (o.meters || [{id:"m1", label:"Affection", start:30, win:80, lose:5}]).slice(0, 3).map((m, i) => {
      const key = meterKey(m.label, i, used); idToKey[m.id || "m" + (i + 1)] = key;
      const down = m.goal === "down";
      return {key, label:m.label || "Meter", start:clampN(+m.start || 0, 0, 100), min:0, max:100, step:clampN(+m.step || 16, 4, 40), bad:down, drift:+m.drift || 0, color:m.color,
        ...(m.win != null && m.win !== "" ? (down ? {winBelow:+m.win} : {win:+m.win}) : {}), ...(m.lose != null && m.lose !== "" ? (down ? {loseAbove:+m.lose} : {loseBelow:+m.lose}) : {})};
    });
    c.meterIds = idToKey;
    c.likes = (o.rules || []).map((r, i) => {
      const d = {}; for (const [id, v] of Object.entries(r.effects || {})) if (idToKey[id] && +v) d[idToKey[id]] = clampN(+v, -40, 40);
      return {id:"r" + i, name:r.name || "rule " + (i + 1), re:phrasesRe(r.phrases), unless:(r.unless || []).length ? phrasesRe(r.unless) : null, d, dir:r.react || ""};
    }).filter(r => r.re && Object.keys(r.d).length);
    c.dislikes = [];
    c.reactions = {}; for (const b of Object.keys(DEFAULT_REACTIONS)) { const v = (o.reactions || {})[b]; c.reactions[b] = (Array.isArray(v) ? v : String(v || "").split("|")).map(x => x.trim()).filter(Boolean); if (!c.reactions[b].length) c.reactions[b] = DEFAULT_REACTIONS[b]; }
    c.moods = (o.moods && o.moods.length === 5) ? DEFAULT_MOODS.map(([at], i) => [at, String(o.moods[i] || DEFAULT_MOODS[i][1])]) : DEFAULT_MOODS;
    c.generic = o.generic || {};
    c.sens = {up:clampN(+o.sens?.up || 1, 0.4, 2), down:clampN(+o.sens?.down || 1, 0.4, 2)};
    c.examples = o.examples || null;
  }
  if (c.engine === "dice"){
    const x = diceCfg(o.dice); c.dice = x; c.sheet = x.sheet;
    c.stats = [{key:"HP", label:"Your HP", start:x.hp, min:0, max:x.hp, color:"#b6f23a"}, {key:"FOE", label:`${x.foe} HP`, start:x.foeHP, min:0, max:x.foeHP, color:"#ff4d4d"}, {key:"TOLL", label:`Price to pass (${x.cur})`, start:x.toll, min:0, max:Math.max(20, x.toll * 2), color:"#f2c14e"}, {key:"GOLD", label:`Your ${x.cur}`, start:x.gold, min:0, max:Math.max(20, x.gold * 3), color:"#f2c14e"}];
  }
  if (c.engine === "barter"){
    const x = barterCfg(o.barter); c.barter = x; c.budget = x.budget; c.floor = x.floor;
    c.stats = [{key:"PRICE", label:"Asking price", start:x.price, min:0, max:99999, mode:"set", color:"#ff8a3d"}, {key:"PATIENCE", label:`${o.character || "Their"} patience`, start:x.patience, min:0, max:100, loseBelow:0, color:"#ffd166"}];
  }
  return c;
}
/*RULES-END*/
