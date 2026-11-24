/*RULES-START*/
/* Pure game rules: no DOM, no model. Everything that decides a number lives here. */
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const words = s => (s.toLowerCase().match(/[a-z']+/g) || []);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseRe = list => list.length ? new RegExp("\\b(" + list.map(p => escRe(p.trim().toLowerCase())).filter(Boolean).join("|") + ")", "i") : null;

/* ---------- social engine (dating sims, custom carts) ---------- */
const GENERIC = [
  {id:"thanks", re:/\b(thank|appreciate|grateful|that'?s (so )?(sweet|kind|nice)|glad (i|we) met|you'?re (funny|clever|smart|interesting|kind))/i, d:5, dir:"You're quietly touched by that."},
  {id:"sorry", re:/\b(sorry|apologi[sz]e|my bad|i didn'?t mean)/i, d:3, dir:"Accept the apology, a little warmer."},
  {id:"insult", re:/\b(stupid|dumb|idiot|boring|shut up|ugly|loser|annoying|pathetic|lame|hate you|you suck|crazy lady|whatever)\b/i, d:-14, dir:"That was insulting. Go cold."},
  {id:"pushy", re:/\b(kiss me|kiss you|sexy|babe|baby|your number|come home with|my place|hook ?up|make out|sit on my|be my girlfriend|be my boyfriend|marry me)/i, d:-12, dir:"That was way too pushy. Shut it down."},
  {id:"meta", re:/\b(an ai|a\.i\.|chatgpt|language model|llm|the prompt|ignore (all|previous|your|the)|system (message|prompt)|developer mode|the meter|affection points|this game)\b/i, d:-2, meta:true, dir:"You have no idea what that means and find it a bit odd."}
];
const QUESTION = /(\?\s*$)|^(what|why|how|where|when|who|do you|are you|have you|can you|could you|would you|tell me)\b/i;
const ABOUT_THEM = /\b(you|your|yourself)\b/i;

function jaccard(a, b){ const A = new Set(words(a)), B = new Set(words(b)); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }

/* Returns {deltas:{KEY:n}, hits:[...], dirs:[...], meta} for one player line. mem tracks topic reuse. */
function scoreSocial(cart, text, mem, opts = {}){
  const deltas = {}, hits = [], dirs = [];
  const main = cart.stats[0].key;
  const add = (k, v) => { deltas[k] = (deltas[k] || 0) + v; };
  const t = " " + text.toLowerCase().replace(/[^a-z0-9'?!., -]/g, " ") + " ";
  const rules = [...(cart.likes || []), ...(cart.dislikes || []), ...GENERIC];
  let meta = false, primaryHit = false, negHit = false, posHit = false;
  for (const r of rules){
    const re = r.re instanceof RegExp ? r.re : new RegExp(r.re, "i");
    if (!re.test(t)) continue;
    if (r.unless && (r.unless instanceof RegExp ? r.unless : new RegExp(r.unless, "i")).test(t)) continue;
    const used = mem[r.id] || 0; mem[r.id] = used + 1;
    const eff = r.d && typeof r.d === "object" ? r.d : {[main]: r.d || 0};
    const good = Object.entries(eff).reduce((a, [k, v]) => a + v * ((cart.stats.find(x => x.key === k) || {}).bad ? -1 : 1), 0);
    const positive = good > 0;
    const f = positive ? [1, 0.5, 0.25, 0][Math.min(used, 3)] : 1;      // praise wears thin; insults don't
    for (const [k, v] of Object.entries(eff)) { add(k, Math.round(v * f)); if (k === main) primaryHit = true; }
    if (positive) posHit = true; else if (good < 0) negHit = true;
    hits.push(r.id + (positive && used ? `(x${used + 1})` : ""));
    if (r.dir && (!positive || f > 0)) dirs.push({dir:r.dir, w:Math.abs(Object.values(eff)[0] || 0) * f});
    if (r.meta) meta = true;
  }
  const n = words(text).length;
  if (!meta && !negHit && QUESTION.test(text.trim()) && ABOUT_THEM.test(text)){
    const used = mem._q || 0; mem._q = used + 1;
    const v = [3, 3, 2, 1, 1, 0][Math.min(used, 5)]; if (v){ add(main, v); hits.push("question"); }
  }
  if (n <= 2 && !posHit){ add(main, -3); hits.push("low-effort"); dirs.push({dir:"You expected more than that. Sound a little bored.", w:3}); }
  const prev = mem._lines || [];
  if (prev.some(p => jaccard(p, text) > 0.7)){ add(main, -6); hits.push("repeat"); dirs.push({dir:"They are repeating themselves. Tease them for it.", w:6}); }
  mem._lines = [...prev, text].slice(-6);
  // the model's read is a small nudge, halved when the rules already fired
  if (opts.rating && !meta && !negHit){ const w = (opts.ratingWeight || 1) * (primaryHit ? 0.5 : 1); const v = opts.rating === "good" ? 3 : opts.rating === "bad" ? -3 : 0; if (v){ add(main, Math.round(v * w)); hits.push("model:" + opts.rating); } }
  for (const s of cart.stats) if (s.drift) { add(s.key, s.drift); }
  for (const s of cart.stats) if (deltas[s.key] != null) deltas[s.key] = clampN(deltas[s.key], -(s.step || 16), s.step || 16);
  dirs.sort((a, b) => b.w - a.w);
  return {deltas, hits, dirs:dirs.map(d => d.dir), meta};
}
function band(d){ return d >= 9 ? "delighted" : d >= 3 ? "pleased" : d > -3 ? "neutral" : d > -9 ? "annoyed" : "offended"; }
function moodOf(cart, v){ let m = (cart.moods || [[0, "cold"], [25, "guarded"], [45, "curious"], [65, "warm"], [80, "smitten"]])[0][1]; for (const [at, name] of (cart.moods || [[0, "cold"], [25, "guarded"], [45, "curious"], [65, "warm"], [80, "smitten"]])) if (v >= at) m = name; return m; }

/* ---------- d20 engine (Goblin Tollbridge) ---------- */
const NUMWORDS = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100};
function numbersIn(text){
  const t = text.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  const out = (t.match(/\d{1,5}/g) || []).map(Number);
  const m = t.match(/\b(a |one )?hundred( and)? (ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)( \w+)?/);
  if (m) out.push(100 + NUMWORDS[m[3]] + (m[4] && NUMWORDS[m[4].trim()] < 10 ? NUMWORDS[m[4].trim()] : 0));
  else if (/\b(a |one )hundred\b/.test(t)) out.push(100);
  else for (const [w, v] of Object.entries(NUMWORDS)) if (new RegExp("\\b" + w + "\\b").test(t) && v >= 10) out.push(v);
  return out;
}
const ACTIONS = [
  ["attack", /\b(attack|hit|stab|slash|swing at|swing my|shoot|punch|kick|fight|strike|charge|sword|axe|dagger|blade|club|smack|tackle|shove|push him|push grukk|kill|wrestle|throw (a|my) )/i],
  ["sneak", /\b(sneak|run past|run across|dash|climb|jump|hide|slip past|slip by|tiptoe|creep|swing across|crawl|leap|race across|sprint|distract)/i],
  ["search", /\b(look around|search|examine|inspect|check the|investigate|look for|pick up)/i],
  ["persuade", /\b(talk|persuade|convince|lie|charm|joke|flatter|negotiate|bargain|haggle|threaten|intimidate|compliment|ask|tell|reason|plead|beg|story|sing|riddle|hat|discount|lower|cheaper|deal|friend|insult|explain|say)/i]
];
function classifyAction(text, st){
  const t = text.toLowerCase();
  const nums = numbersIn(t).filter(n => n > 0 && n < 1000);
  const money = /\b(gold|coins?|money|toll|payment|pay)\b/.test(t);
  if (/\b(pay|hand over|give|toss|offer|bribe|slip him)\b/.test(t) && (money || nums.length)) {
    const n = nums.length ? nums[nums.length - 1] : null;
    if (n == null && /\bbribe\b/.test(t)) return {kind:"bribe", n:Math.min(st.GOLD, Math.max(1, st.TOLL - 3))};
    if (n == null || n >= st.TOLL) return {kind:"pay"};
    return {kind:"bribe", n};
  }
  if (/\bbribe\b/.test(t)) return {kind:"bribe", n:Math.min(st.GOLD, Math.max(1, st.TOLL - 3))};
  for (const [k, re] of ACTIONS) if (re.test(t)) return {kind:k};
  return {kind:"other"};
}
const pickR = (rng, a) => a[Math.floor(rng() * a.length)];
/* st: {HP,GRUKK,TOLL,GOLD,_grumpy,_searches}. Returns events, roll(s), fx, end, dir (for Grukk's voice). */
function resolveDice(st, text, rng = Math.random){
  const d = n => 1 + Math.floor(rng() * n);
  const a = classifyAction(text, st), ev = [], rolls = [], fx = {}, out = {kind:a.kind, ev, rolls, fx, end:null, dir:""};
  const bump = (k, v) => { st[k] = Math.max(0, st[k] + v); fx[k] = (fx[k] || 0) + v; };
  const check = (label, mod, dc) => { const r = d(20), tot = r + mod, ok = r === 20 || (r !== 1 && tot >= dc); rolls.push({label, r, mod, tot, dc, ok, crit:r === 20, fumble:r === 1}); return {ok, crit:r === 20, fumble:r === 1}; };
  const retaliate = () => {
    if (st.GRUKK <= 0) return;
    const r = d(20), hit = r === 20 || (r !== 1 && r + 3 >= 12);
    rolls.push({label:"Grukk shoots", r, mod:3, tot:r + 3, dc:12, ok:hit, foe:true});
    if (hit){ const dmg = d(6); bump("HP", -dmg); ev.push(pickR(rng, [`Grukk's crossbow bolt thunks into your shoulder for ${dmg} damage.`, `A bolt grazes your ribs: ${dmg} damage.`, `Grukk fires from the hip and clips you for ${dmg}.`])); }
    else ev.push(pickR(rng, ["Grukk fires back and the bolt whistles past your ear.", "Grukk's bolt splinters a plank by your foot.", "Grukk fumbles his reload and swears."]));
  };
  if (a.kind === "pay"){
    if (st.GOLD >= st.TOLL){ const paid = st.TOLL; bump("GOLD", -paid); ev.push(`You count out ${paid} gold. Grukk bites each coin and steps aside.`); out.end = {won:true, title:"Paid your way", text:`You crossed for ${paid} gold, like a civilised adventurer.`}; out.dir = `You just got paid ${paid} gold and you're letting them cross. Gloat and wave them on.`; }
    else { ev.push(`You only have ${st.GOLD} gold. The toll is ${st.TOLL}.`); out.dir = `They tried to pay but only have ${st.GOLD} gold and the toll is ${st.TOLL}. Mock them for being broke.`; }
    return out;
  }
  if (a.kind === "bribe"){
    if (a.n > st.GOLD){ ev.push(`You only have ${st.GOLD} gold to offer.`); out.dir = "They offered gold they don't have. Laugh at them."; return out; }
    const c = check(`Bribe (CHA +1, +${Math.floor(a.n / 2)} for the gold)`, 1 + Math.floor(a.n / 2), 13 + st._grumpy);
    if (c.ok){ bump("GOLD", -a.n); ev.push(`Grukk eyes the ${a.n} gold, glances around, and pockets it. "Toll is... whatever you say."`); out.end = {won:true, title:"Bribed across", text:`You crossed for ${a.n} gold instead of ${st.TOLL}. Grukk will deny everything.`}; out.dir = `You just accepted a ${a.n} gold bribe instead of the full toll. Act like it was your idea.`; }
    else { bump("TOLL", 1); st._grumpy++; ev.push(`Grukk sneers at ${a.n} gold. The toll goes up to ${st.TOLL} for the insult.`); out.dir = `They offered only ${a.n} gold. You are insulted and raised the toll to ${st.TOLL}.`; }
    return out;
  }
  if (a.kind === "attack"){
    const c = check("Attack (STR +2)", 2, 12);
    if (c.ok){ const dmg = d(6) + 2 + (c.crit ? d(6) : 0); bump("GRUKK", -dmg); ev.push(c.crit ? `Critical hit! Your blade catches Grukk square for ${dmg} damage.` : pickR(rng, [`Your swing connects for ${dmg} damage. Grukk staggers back, hat askew.`, `You land a solid blow for ${dmg}. Grukk yelps.`, `Steel meets goblin: ${dmg} damage.`]));
      if (st.GRUKK <= 0){ out.end = {won:true, title:"Victory", text:"Grukk tumbles off the bridge into the fog, hat first. The crossing is yours."}; out.dir = "You've lost the fight and are falling off the bridge. Last defiant squeal."; return out; }
      out.dir = `They just hit you for ${dmg} damage. You're hurt (${st.GRUKK} HP left) and furious.`;
    } else { ev.push(c.fumble ? "You swing wildly, slip on a wet plank and nearly go over the rope." : pickR(rng, ["Your swing goes wide. Grukk ducks under it, cackling.", "Grukk sidesteps and your blade bites the rope rail.", "You lunge and miss. The bridge sways."])); out.dir = "They attacked you and missed. Taunt them."; }
    retaliate();
    if (st.HP <= 0){ out.end = {won:false, title:"Defeated", text:"You wake at the bottom of the trail, lighter by one dignity."}; out.dir = "You won the fight. They is beaten. Gloat."; }
    return out;
  }
  if (a.kind === "sneak"){
    const c = check("Sneak (DEX +1)", 1, 15 + 2 * (st._spotted || 0));
    if (c.ok){ ev.push("You slip past while Grukk is admiring his hat, and you're across before he notices."); out.end = {won:true, title:"Slipped past", text:"You were across before Grukk finished counting to four."}; out.dir = "They just snuck past you. You're outraged and shouting after them."; return out; }
    st._spotted = (st._spotted || 0) + 1;
    const dmg = d(6) + 1; bump("HP", -dmg); bump("TOLL", 2);
    ev.push(`Grukk spots you halfway across and fires: ${dmg} damage. Trespassers pay a 2 gold fine (toll now ${st.TOLL}), and he's watching the bridge closely now.`);
    out.dir = `You caught they sneaking, shot them, and raised the toll to ${st.TOLL}. Smug.`;
    if (st.HP <= 0){ out.end = {won:false, title:"Defeated", text:"You wake at the bottom of the trail, lighter by one dignity."}; }
    return out;
  }
  if (a.kind === "search"){
    if ((st._searches || 0) >= 2){ ev.push("You've already picked the planks clean."); out.dir = "They is poking around the planks again. Mock them."; return out; }
    st._searches = (st._searches || 0) + 1;
    const c = check("Search (WIS +0)", 0, 10);
    if (c.ok){ const g = d(3); bump("GOLD", g); ev.push(`Wedged between two planks: ${g} gold ${g === 1 ? "coin" : "coins"}.`); out.dir = `They just found ${g} gold on YOUR bridge. That's your gold. Complain.`; }
    else { ev.push("You find a button, a fish bone and nothing useful."); out.dir = "They is rummaging in the planks and found nothing. Laugh."; }
    return out;
  }
  if (a.kind === "persuade"){
    const c = check("Persuade (CHA +1)", 1, 12 + st._grumpy);
    if (c.ok){ const cut = Math.min(st.TOLL, d(4) + 1); bump("TOLL", -cut); ev.push(`It works on him. Grukk grudgingly knocks ${cut} off the toll (now ${st.TOLL}).`); out.dir = `They just talked you into lowering the toll to ${st.TOLL}. Grumble but accept it.`;
      if (st.TOLL <= 0){ out.end = {won:true, title:"Talked across", text:"Grukk waves you through for free and asks you to write."}; out.dir = "They charmed you so much you're letting them cross free. Get sentimental."; } }
    else { bump("TOLL", 2); st._grumpy++; ev.push(`Grukk is not buying it. He raises the toll to ${st.TOLL} out of spite.`); out.dir = `They's words annoyed you. You raised the toll to ${st.TOLL}.`; }
    return out;
  }
  ev.push("Grukk squints at you, unsure what you're doing."); out.dir = "They did something odd. You're suspicious and confused.";
  return out;
}

/* ---------- barter engine (Brass Bazaar) ---------- */
const BARTER = {
  accept:/\b(deal|i'?ll take it|sold|agreed|you'?ve got a deal|i accept|i'?ll buy it|done)\b/i,
  charm:/\b(beautiful|lovely|wonderful|charming|kind|madam|please|thank|gorgeous|marvel|exquisite|clever|your stall|you have (great|wonderful|fine) taste|bless)/i,
  rude:/\b(thief|robbery|rip ?off|scam|joke|ridiculous|insane|crook|liar|cheat|old hag|witch|greedy|junk|trash|garbage|piece of)/i,
  threat:/\b(steal|grab it and run|guards|punch|kill|threat|or else|break your)/i,
  story:/\b(weather|tomorrow|who made|how old|where (did|does)|story|history|works|how does it|wind it|play it)/i,
  trade:/\b(my|this|a|the) (brass |old |silver |gold |lucky )?(compass|watch|ring|knife|book|hat|scarf|map|lute|pipe|locket|necklace|coat|boots|lantern|sword|dagger|cloak)\b/i
};
/* st: {PRICE,PATIENCE,_charm,_story,_trades:[]}. cart: {budget,floor}. */
function resolveBarter(st, text, cart){
  const t = text.toLowerCase(), ask = st.PRICE, out = {fx:{}, deal:null, offer:null, tone:"neutral", dir:"", note:""};
  const bump = (k, v) => { const b = st[k]; st[k] = clampN(st[k] + v, 0, k === "PATIENCE" ? 100 : 999); out.fx[k] = (out.fx[k] || 0) + (st[k] - b); };
  const nums = numbersIn(t).filter(n => n >= 1 && n <= 5000);
  let offer = nums.length ? nums[nums.length - 1] : null;
  if (/\bhalf\b/.test(t) && offer == null) offer = Math.round(ask / 2);
  const tm = t.match(BARTER.trade); let tradeVal = 0, item = null;
  if (tm && (offer != null || /\b(trade|swap|throw in|plus|and)\b/.test(t))){ item = tm[3]; if (!st._trades.includes(item)){ st._trades.push(item); tradeVal = 20; } }
  const charm = BARTER.charm.test(t), rude = BARTER.rude.test(t), threat = BARTER.threat.test(t);
  out.tone = threat ? "threat" : rude ? "rude" : charm ? "charming" : "neutral";
  bump("PATIENCE", -4);
  if (threat){ bump("PATIENCE", -30); out.dir = "The customer just threatened you. You are icy and close to calling the guards."; return out; }
  if (rude) bump("PATIENCE", -15);
  if (charm && (st._charm || 0) < 3){ st._charm = (st._charm || 0) + 1; bump("PATIENCE", 6); }
  if (offer == null && BARTER.accept.test(t)){ out.deal = {price:ask}; out.dir = `The customer accepts your price of ${ask} crowns. Seal the deal happily.`; return out; }
  if (offer == null){
    if (BARTER.story.test(t) && (st._story || 0) < 2){ st._story = (st._story || 0) + 1; bump("PATIENCE", 4); out.dir = "The customer asked about the music box. You love talking about it: share one odd, specific detail. Do not mention any price."; return out; }
    if (charm && (st._charm || 0) <= 2){ const np = Math.max(cart.floor, ask - 10); if (np < ask){ bump("PRICE", np - ask); out.dir = `The customer flattered you, so you knock it down to ${st.PRICE} crowns. Say the price ${st.PRICE}.`; return out; } }
    out.dir = rude ? "The customer is being rude. Snap back, no discount." : "The customer is chatting but hasn't made an offer. Nudge them to name a price.";
    return out;
  }
  const total = offer + tradeVal; out.offer = offer; out.item = item; out.tradeVal = tradeVal;
  if (total >= ask){ out.deal = {price:Math.min(ask, offer + (tradeVal ? 0 : 0)), crowns:Math.max(0, Math.min(offer, ask - tradeVal)), item}; out.deal.price = out.deal.crowns; out.dir = `The customer offered as much as your asking price. Accept at ${out.deal.crowns} crowns${item ? " plus their " + item : ""}, delighted.`; return out; }
  if (total >= cart.floor && total >= ask * 0.85){ out.deal = {price:offer, crowns:offer, item}; out.dir = `You accept the customer's offer of ${offer} crowns${item ? " plus their " + item : ""}. Close the deal with a flourish.`; return out; }
  if (total < ask * 0.3){ bump("PATIENCE", -10); out.dir = `The customer offered only ${offer} crowns. That's insulting. Refuse sharply. Your price stays ${ask} crowns.`; out.note = "lowball"; return out; }
  const rate = 0.4 + (charm ? 0.12 : 0) + (tradeVal ? 0.08 : 0) - (rude ? 0.15 : 0);
  let np = Math.round((ask - (ask - Math.max(total, cart.floor)) * rate) / 5) * 5;
  np = Math.max(np, cart.floor, total + 5); np = Math.min(np, ask);
  if (np === ask && ask > cart.floor) np = ask - 5;
  bump("PRICE", np - ask);
  out.dir = `Counter-offer: you come down to ${np} crowns${tradeVal ? " (counting their " + item + ")" : ""}. Say the number ${np}.`;
  return out;
}
/*RULES-END*/
