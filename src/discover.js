/* ---------- discovery: browse, search, sort, game pages, creator pages, community votes ---------- */
let BROWSE = {q:"", sort:"featured", tag:""};
/* Votes and reviews for community items live on their GitHub submission issues (reactions and comments). */
let VOTES = {};
async function loadVotes(){
  if (PREVIEW || !COMMUNITY_OK) return;
  try { const c = JSON.parse(localStorage.getItem("cz-votes") || "null"); if (c && Date.now() - c.at < 10 * 60e3){ VOTES = c.v; return; } } catch {}
  try {
    const r = await fetch(`https://api.github.com/repos/cpaik/cartridge-zone/issues?labels=submission&state=all&per_page=100`, {headers:{Accept:"application/vnd.github+json"}});
    if (!r.ok) return;
    VOTES = {}; for (const i of await r.json()) VOTES[i.number] = {up:(i.reactions?.["+1"] || 0) + (i.reactions?.heart || 0) + (i.reactions?.hooray || 0), down:i.reactions?.["-1"] || 0, comments:Math.max(0, (i.comments || 0) - 2)};
    try { localStorage.setItem("cz-votes", JSON.stringify({at:Date.now(), v:VOTES})); } catch {}
  } catch (e) { console.warn("votes unavailable", e); }
}
const votesOf = it => it.issue ? VOTES[it.issue] : null;
const voteScore = it => { const v = votesOf(it); return v ? v.up - v.down : 0; };

/* Everything playable, as one list */
function catalog(){
  const items = [];
  BUILTIN.forEach((c, i) => items.push({kind:"cart", src:"Featured", it:c, order:i, added:"2026-11-23"}));
  COMMUNITY_CARTS.forEach(c => items.push({kind:"cart", src:"Community", it:c, order:50, added:c.added || ""}));
  COMMUNITY_GAMES.forEach(g => items.push({kind:"game", src:"Community", it:g, order:50, added:g.added || ""}));
  BUNDLED_GAMES.filter(g => !g.hidden).forEach(g => items.push({kind:"game", src:"Example", it:{...g, bundled:true}, order:40, added:"2026-11-24"}));
  return items;
}
const tagsOf = it => it.tags || [];
function matches(x, q){ if (!q) return true; const it = x.it; return [it.title, it.blurb, it.author, it.character, it.login, genreName(it.genre), ...tagsOf(it)].join(" ").toLowerCase().includes(q.toLowerCase()); }
function sorted(list){
  const by = {featured:(a, b) => a.order - b.order || voteScore(b.it) - voteScore(a.it), new:(a, b) => String(b.added).localeCompare(String(a.added)), top:(a, b) => voteScore(b.it) - voteScore(a.it) || (DB.rate[b.it.id] || 0) - (DB.rate[a.it.id] || 0), played:(a, b) => (DB.plays[b.it.id] || 0) - (DB.plays[a.it.id] || 0), unplayed:(a, b) => (DB.plays[a.it.id] ? 1 : 0) - (DB.plays[b.it.id] ? 1 : 0) || a.order - b.order};
  return [...list].sort(by[BROWSE.sort] || by.featured);
}
function browseCard(x){
  const it = x.it, v = votesOf(it), best = PR().best[it.id], ms = x.kind === "cart" ? medalsOf(it) : null, got = ms ? ms.filter(m => PR().medals[`${it.id}:${m.id}`]).length : 0;
  const href = x.kind === "cart" ? `#play-${esc(it.id)}` : `#game-${esc(it.id)}`;
  return `<article class="card"><a class="art" href="#info-${esc(it.id)}" aria-label="${esc(it.title)} details">${art(x.kind === "cart" ? it : {title:it.title, motif:it.motif || "disk", colors:it.colors})}</a><div class="bd">
    <div class="row" style="gap:6px"><span class="tag ${esc(it.genre)}">${esc(genreName(it.genre))}</span>${x.src !== "Featured" ? `<span class="tag up">${x.src}${it.author ? " · " + esc(it.author) : ""}</span>` : ""}${x.kind === "game" ? '<span class="tag">HTML game</span>' : ""}${DB.best[it.id] === "won" ? '<span class="tag" style="background:#0005;color:var(--lime)">Cleared</span>' : ""}</div>
    <h3><a href="#info-${esc(it.id)}">${esc(it.title)}</a></h3><p>${esc(it.blurb)}</p>
    <div class="meta">${v ? `<span class="votes">▲ ${v.up} ▼ ${v.down}</span><span>${v.comments} ${v.comments === 1 ? "review" : "reviews"}</span>` : ""}${ms ? `<span>${got}/${ms.length} medals</span>` : ""}${best != null ? `<span>best ${best}</span>` : ""}<span>${DB.plays[it.id] || 0} plays</span></div>
    <div class="row"><a href="${DB.saves[it.id] ? `#continue-${esc(it.id)}` : href}"><button class="go" tabindex="-1">${DB.saves[it.id] ? "Continue" : "Play"}</button></a><a href="#info-${esc(it.id)}"><button class="ghost" tabindex="-1">Details</button></a></div>
  </div></article>`;
}
function renderBrowse(){
  const all = catalog(), tags = [...new Set(all.flatMap(x => tagsOf(x.it)))].sort();
  const list = sorted(all.filter(x => (filter === "all" || x.it.genre === filter) && matches(x, BROWSE.q) && (!BROWSE.tag || tagsOf(x.it).includes(BROWSE.tag))));
  $("#tagRow").innerHTML = tags.map(t => `<button type="button" class="tagb ${BROWSE.tag === t ? "on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("");
  $("#browseCount").textContent = `${list.length} ${list.length === 1 ? "game" : "games"}${BROWSE.q ? ` matching “${BROWSE.q}”` : ""}${BROWSE.tag ? ` tagged #${BROWSE.tag}` : ""}`;
  $("#grid").innerHTML = list.length ? list.map(browseCard).join("") : `<div class="empty">Nothing matches. Try another word, or <a href="#make">make the game you were looking for</a>.</div>`;
  const cont = Object.entries(DB.saves).sort((a, b) => b[1].at - a[1].at).map(([id, sv]) => ({sv, c:cartById(id)})).filter(x => x.c);
  $("#contSec").hidden = !cont.length;
  $("#contRow").innerHTML = cont.slice(0, 6).map(({sv, c}) => `<a class="contc" href="#continue-${esc(c.id)}"><span class="nart">${art(c)}</span><span><b>${esc(c.title)}</b><small>Turn ${sv.turn} of ${c.turns} · ${new Date(sv.at).toLocaleDateString()}</small></span></a>`).join("");
}
$("#browseQ").addEventListener("input", e => { BROWSE.q = e.target.value.trim(); renderBrowse(); });
$("#browseSort").onchange = e => { BROWSE.sort = e.target.value; renderBrowse(); };
$("#tagRow").onclick = e => { const t = e.target.dataset.tag; if (t != null){ BROWSE.tag = BROWSE.tag === t ? "" : t; renderBrowse(); } };

/* Game pages */
function renderInfo(id){
  const c = cartById(id), g = !c && allGames().find(x => x.id === id); if (!c && !g) return false;
  const it = c || g, kind = c ? "cart" : "game", v = votesOf(it), p = PR();
  const ms = c ? medalsOf(c) : Object.entries(DB.gameData[id]?.medals || {}).map(([mid, m]) => ({id:mid, ...m}));
  const how = c ? (c.engine === "social" ? `A conversation. Talk to ${esc(c.character)} in your own words; the cart's rules turn what you say into meter changes, and the model plays the character.` : c.engine === "dice" ? `A d20 encounter with ${esc(c.dice.foe)}. Fight, talk, sneak, search, bribe or pay; real dice decide.` : `A haggle for a ${esc(c.barter.item)}. Get it for ${c.budget} ${esc(c.barter.cur)} or less.`) : "An uploaded HTML game, sandboxed, using the model on your GPU.";
  const playHref = c ? `#play-${esc(id)}` : `#game-${esc(id)}`;
  $("#infoBody").innerHTML = `<div class="ihero"><div class="iart">${art(c || {title:g.title, motif:g.motif || "disk", colors:g.colors})}</div><div class="itext">
    <span class="kick">${esc(genreName(it.genre))}${it.author ? ` · by <a href="#by-${esc(it.login || it.author)}">${esc(it.author)}</a>` : it.community ? "" : " · Cartridge Zone"}</span>
    <h1>${esc(it.title)}</h1><p class="lede">${esc(it.blurb)}</p>
    ${tagsOf(it).length ? `<div class="row" style="gap:6px">${tagsOf(it).map(t => `<a class="tagb" href="#portal" data-gotag="${esc(t)}">#${esc(t)}</a>`).join("")}</div>` : ""}
    <div class="row">${DB.saves[id] ? `<a href="#continue-${esc(id)}"><button class="go" tabindex="-1">Continue (turn ${DB.saves[id].turn})</button></a><a href="${playHref}"><button class="ghost" tabindex="-1">New game</button></a>` : `<a href="${playHref}"><button class="go" tabindex="-1">Play</button></a>`}${c ? `<a href="#fork-${esc(id)}"><button class="ghost" tabindex="-1">Remix</button></a>` : ""}</div>
    <div class="istats"><span><b>${DB.plays[id] || 0}</b> your plays</span><span><b>${p.best[id] ?? "–"}</b> best score</span><span><b>${ms.filter(m => p.medals[`${id}:${m.id}`]).length}/${ms.length}</b> medals</span>${v ? `<span><b>▲ ${v.up} ▼ ${v.down}</b> community</span>` : ""}</div>
  </div></div>
  <div class="icols"><div class="panel"><h4>How to play</h4><p class="small" style="margin:0">${how}</p>${c ? `<p class="small">${c.turns} turns · built for the ${esc(RT[c.runtime]?.name || "Pocket")} runtime (${RT[c.runtime]?.model || ""}).</p>` : ""}</div>
    <div class="panel"><h4>Medals</h4>${ms.length ? ms.map(m => { const has = p.medals[`${id}:${m.id}`]; return `<div class="mrow2 ${has ? "got" : ""}">${medalIcon(m.points)}<span><b>${esc(has || !m.secret ? m.name : "Secret medal")}</b><small>${esc(has || !m.secret ? m.desc || "" : "Keep playing to find out.")} · ${m.points}</small></span></div>`; }).join("") : '<p class="small">This game hasn\'t awarded any medals yet.</p>'}</div>
    <div class="panel" id="reviews"><h4>Reviews</h4>${it.issue ? `<p class="small">Loading reviews…</p>` : `<p class="small">${it.community || kind === "game" && !g?.bundled ? "" : "Built-in games don't take reviews. "}Community games are reviewed on their GitHub submission page.</p>`}</div></div>`;
  $("#infoBody").querySelectorAll("[data-gotag]").forEach(a => a.onclick = () => { BROWSE.tag = a.dataset.gotag; });
  if (it.issue) loadReviews(it.issue);
  return true;
}
async function loadReviews(n){
  const el = $("#reviews"); if (!el) return;
  let list = [];
  try { const r = await fetch(`https://api.github.com/repos/cpaik/cartridge-zone/issues/${n}/comments?per_page=30`); if (r.ok) list = (await r.json()).filter(c => !/\[bot\]$/.test(c.user?.login || "")); } catch {}
  const url = `${REPO_URL}/issues/${n}`;
  el.innerHTML = `<h4>Reviews</h4>${list.length ? list.slice(-8).reverse().map(c => `<div class="review"><b>${esc(c.user.login)}</b> <span class="small">${new Date(c.created_at).toLocaleDateString()}</span><p>${esc(String(c.body).slice(0, 500))}</p></div>`).join("") : '<p class="small">No reviews yet. Be the first.</p>'}
    <div class="row"><a href="${url}" target="_blank" rel="noopener"><button class="ghost sm" tabindex="-1">Vote ▲▼ on GitHub</button></a><a href="${url}#new_comment_field" target="_blank" rel="noopener"><button class="ghost sm" tabindex="-1">Write a review</button></a></div><p class="small">Votes are reactions (▲ is 👍, ❤️ or 🎉; ▼ is 👎) on the game's submission page.</p>`;
}
/* Creator pages */
function renderBy(who){
  const mine = x => (x.login || "").toLowerCase() === who.toLowerCase() || (x.author || "").toLowerCase() === who.toLowerCase();
  const list = catalog().filter(x => x.src === "Community" && mine(x.it));
  const ups = list.reduce((a, x) => a + (votesOf(x.it)?.up || 0), 0);
  $("#infoBody").innerHTML = `<span class="kick">Creator</span><h1>${esc(who)}</h1><p class="lede">${list.length} ${list.length === 1 ? "game" : "games"} on the community shelf · ▲ ${ups} total${list[0]?.it.login ? ` · <a href="https://github.com/${esc(list[0].it.login)}" target="_blank" rel="noopener">GitHub profile</a>` : ""}</p><div class="grid" style="margin-top:18px">${list.map(browseCard).join("") || '<div class="empty">Nothing published yet.</div>'}</div>`;
}

/* Profile */
function renderMe(){
  const p = PR(), lv = levelOf(p.xp), nextXp = xpFor(lv + 1), pct = Math.round((p.xp - xpFor(lv)) / (nextXp - xpFor(lv)) * 100);
  const part = (k, label) => `<div class="avpart"><label>${label}</label><div class="avopts">${AV[k].map((o, i) => { const req = Array.isArray(o) ? o[2] : null, ok = unlockedReq(req), on = p.avatar[k] === i; const sw = k === "bg" || k === "skin" ? `<span class="sw2" style="background:${o}"></span>` : `<span>${esc(o[0])}</span>`; return `<button type="button" class="avo ${on ? "on" : ""}" data-av="${k}" data-i="${i}" ${ok ? "" : "disabled"} title="${ok ? "" : esc(reqText(req))}">${sw}${ok ? "" : `<small>${esc(reqText(req))}</small>`}</button>`; }).join("")}</div></div>`;
  const medals = Object.entries(p.medals).sort((a, b) => b[1].at - a[1].at);
  $("#meBody").innerHTML = `<div class="mehero"><div class="mebig">${avatarSVG(p.avatar, 128)}</div><div style="flex:1;min-width:0">
      <label for="meName">Player name</label><input id="meName" maxlength="24" value="${esc(p.name)}" placeholder="Choose a name">
      <div class="lvl"><b>Level ${lv}</b> · ${titleOf(lv)} · ${p.xp} XP<div class="mb"><i style="width:${pct}%;background:var(--lime)"></i></div><span class="small">${nextXp - p.xp} XP to level ${lv + 1}. Medals, wins and plays all earn XP.</span></div>
      <div class="istats"><span><b>${p.stats.plays}</b> games</span><span><b>${p.stats.wins}</b> wins</span><span><b>${medals.length}</b> medals</span><span><b>${medalPoints()}</b> medal points</span></div></div></div>
    <div class="icols"><div class="panel"><h4>Avatar</h4>${part("bg", "Background")}${part("skin", "Colour")}${part("shape", "Head")}${part("eyes", "Eyes")}${part("mouth", "Mouth")}${part("hat", "Hat")}${part("acc", "Extra")}</div>
      <div class="panel"><h4>Medal case</h4>${medals.length ? medals.map(([k, m]) => `<div class="mrow2 got">${medalIcon(m.points)}<span><b>${esc(m.name)}</b><small>${esc(m.desc || "")} · ${esc(medalGame(k))} · ${m.points}</small></span></div>`).join("") : '<p class="small">No medals yet. Every game has some; check a game\'s page to see them.</p>'}</div>
      <div class="panel"><h4>Personal bests</h4>${Object.entries(p.best).length ? Object.entries(p.best).map(([id, s]) => { const it = cartById(id) || allGames().find(x => x.id === id); return it ? `<div class="brow"><a href="#info-${esc(id)}">${esc(it.title)}</a><b>${s}</b></div>` : ""; }).join("") : '<p class="small">Finish a game to set a score.</p>'}
        <h4 style="margin-top:16px">Move your profile</h4><p class="small">Your profile lives in this browser. Copy a backup link to move it to another browser.</p><div class="row"><button type="button" class="ghost sm" id="meExport">Copy backup link</button></div></div></div>`;
  $("#meName").oninput = e => { p.name = e.target.value.trim().slice(0, 24); save(); renderMeChip(); };
  $("#meBody").querySelectorAll("[data-av]").forEach(b => b.onclick = () => { p.avatar[b.dataset.av] = +b.dataset.i; save(); renderMeChip(); renderMe(); });
  $("#meExport").onclick = async () => { const url = siteBase() + "#profile-" + await pack({profile:p, plays:DB.plays, rate:DB.rate}); if (!await copyText(url, "Backup link copied. Open it in the other browser.")) prompt2("Copy your backup link", url); };
}
function medalGame(key){ const id = key.split(":")[0]; const it = cartById(id) || allGames().find(x => x.id === id); return it ? it.title : "a game"; }
async function importProfile(payload){
  try { const o = await unpack(payload); if (!o.profile) throw 0;
    if (!confirm2()) return;
    DB.profile = Object.assign(PR(), o.profile); DB.plays = Object.assign(DB.plays, o.plays || {}); DB.rate = Object.assign(DB.rate, o.rate || {}); save(); toast("Profile restored"); renderMeChip(); location.hash = "#me";
  } catch { toast("That backup link is broken."); location.hash = "#portal"; }
}
const confirm2 = () => true;

/* First visit: a short welcome that sets up a name, recommends a runtime and points at a first game. */
function recommendRuntime(){ const mem = navigator.deviceMemory || 4, mobile = /Android|iPhone|iPad/i.test(navigator.userAgent); return mobile || mem < 8 ? "pocket" : "desk"; }
function showOnboarding(step = 1){
  const p = PR(), k = recommendRuntime(); const o = $("#onb"); o.hidden = false;
  const steps = {
    1:`<div class="kick">Welcome to Cartridge Zone</div><h2>Games that think, on your own GPU</h2><p class="lede">Every game here is played by a small AI model running in your browser. Nothing you type leaves this computer, and nobody pays a server bill.</p><div class="mehero">${avatarSVG(p.avatar, 72)}<div style="flex:1"><label for="onbName">What should we call you?</label><input id="onbName" maxlength="24" value="${esc(p.name)}" placeholder="Player name"><button type="button" class="ghost sm" id="onbRand" style="margin-top:8px">Shuffle avatar</button></div></div><div class="row"><button type="button" class="go" data-step="2">Next</button><button type="button" class="ghost" data-skip>Skip</button></div>`,
    2:`<div class="kick">Step 2 of 3</div><h2>Install the console once</h2><p class="lede">${S.gpu ? `Your browser can run the models. We recommend <b>${RT[k].name}</b> (${RT[k].model}, ${gbOf(k)} GB) for this device. It downloads once and stays cached; you can browse while it installs.` : S.checked ? "This browser can't run the models (no WebGPU). Use Chrome or Edge, Safari 26+, or Firefox 141+ on Windows. You can still browse, make carts and try the scripted demo." : "Checking what your device can run…"}</p><div class="row">${S.gpu ? `<button type="button" class="go" data-install="${k}">Install ${RT[k].name} in the background</button>` : `<a href="?mock#portal"><button type="button" class="ghost" tabindex="-1">Try the scripted demo</button></a>`}<button type="button" class="ghost" data-step="3">${S.gpu ? "Later" : "Next"}</button></div>`,
    3:`<div class="kick">Step 3 of 3</div><h2>Pick your first game</h2><p class="lede">Each game has medals to find and a score to beat. Stuck? Every game gives you two hints.</p><div class="onbpicks">${BUILTIN.slice(0, 3).map(c => `<a class="nextc" href="#info-${esc(c.id)}" data-done><span class="nart">${art(c)}</span><span><b>${esc(c.title)}</b><span class="small">${esc(genreName(c.genre))}</span></span></a>`).join("")}</div><div class="row"><button type="button" class="ghost" data-done>Just let me browse</button></div>`
  };
  $("#onbBody").innerHTML = steps[step];
  $("#onbName")?.addEventListener("input", e => { p.name = e.target.value.trim().slice(0, 24); save(); renderMeChip(); });
  $("#onbRand")?.addEventListener("click", () => { const a = p.avatar; for (const k2 of ["bg", "skin", "shape", "eyes", "mouth"]) a[k2] = Math.floor(Math.random() * AV[k2].length); while (!unlockedReq(AV.eyes[a.eyes][2])) a.eyes = 0; while (!unlockedReq(AV.mouth[a.mouth][2])) a.mouth = 0; save(); renderMeChip(); showOnboarding(1); });
}
$("#onb").addEventListener("click", e => {
  const t = e.target.closest("[data-step],[data-skip],[data-done],[data-install]"); if (!t) return;
  if (t.dataset.step) return showOnboarding(+t.dataset.step);
  if (t.dataset.install){ DB.rt = t.dataset.install; save(); renderRt(); loadRuntime(t.dataset.install); return showOnboarding(3); }
  PR().onboarded = true; save(); $("#onb").hidden = true;
});
