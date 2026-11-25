/* ---------- uploaded games: any HTML game, talking to the local model through an OpenAI-compatible API ---------- */
const GAME_CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src data: https://fonts.gstatic.com; img-src data: blob:; media-src data: blob:; connect-src 'none'; worker-src blob:; frame-src 'none'; form-action 'none'; base-uri 'none'";
const MAX_GAME = 5 * 1024 * 1024;
/* Runs inside the game's frame. Answers fetch() calls to the OpenAI API path from the player's in-browser model. */
const SHIM = `(() => {
  const BASE = [/^https?:\\/\\/api\\.openai\\.com\\/v1\\//, /^https?:\\/\\/cartridge\\.local\\/v1\\//, /^\\/?v1\\//];
  const pending = new Map(); let n = 0;
  addEventListener("message", e => { if (e.source !== parent) return; const m = e.data; if (!m || m.cz !== 1 || !pending.has(m.id)) return; pending.get(m.id)(m); });
  const call = (path, body, onChunk, signal) => new Promise((res, rej) => {
    const id = ++n;
    pending.set(id, m => { if (m.type === "chunk") return onChunk && onChunk(m.data); pending.delete(id); m.type === "error" ? rej(Object.assign(new Error(m.error.message), {status:m.error.status || 500})) : res(m.data); });
    if (signal) signal.addEventListener("abort", () => parent.postMessage({cz:1, abort:id}, "*"));
    parent.postMessage({cz:1, id, path, body}, "*");
  });
  const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers:{"content-type":"application/json"}});
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const base = BASE.find(r => r.test(url));
    if (!base) return realFetch(input, init);
    const path = url.replace(base, "").split("?")[0];
    let body = init.body; if (body == null && input instanceof Request) body = await input.text();
    try { body = body ? JSON.parse(typeof body === "string" ? body : new TextDecoder().decode(body)) : null; } catch { return json({error:{message:"Body must be JSON"}}, 400); }
    if (/^models/.test(path)) return json(await call("models"));
    if (!/^chat\\/completions/.test(path)) return json({error:{message:"This platform supports /v1/chat/completions and /v1/models."}}, 404);
    if (body && body.stream){
      const enc = new TextEncoder();
      return new Response(new ReadableStream({start(ctrl){
        call("chat", body, c => ctrl.enqueue(enc.encode("data: " + JSON.stringify(c) + "\\n\\n")), init.signal)
          .then(() => { ctrl.enqueue(enc.encode("data: [DONE]\\n\\n")); ctrl.close(); }, err => ctrl.error(err));
      }}), {headers:{"content-type":"text/event-stream"}});
    }
    try { return json(await call("chat", body, null, init.signal)); } catch (e) { return json({error:{message:e.message}}, e.status || 500); }
  };
  window.cartridge = {
    baseURL: "https://cartridge.local/v1",
    async chat(messages, opts = {}){ const r = await fetch("/v1/chat/completions", {method:"POST", body:JSON.stringify({messages, ...opts})}); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.choices[0].message.content; },
    async *stream(messages, opts = {}){
      const q = []; let done = false, wake = null, err = null;
      call("chat", {messages, ...opts, stream:true}, c => { q.push(c.choices?.[0]?.delta?.content || ""); wake && wake(); }).then(() => { done = true; wake && wake(); }, e => { err = e; done = true; wake && wake(); });
      while (true){ if (q.length){ const t = q.shift(); if (t) yield t; continue; } if (done){ if (err) throw err; return; } await new Promise(r => wake = r); wake = null; }
    },
    info: () => call("info"),
    player: () => call("player"),
    unlockMedal: (id, info = {}) => call("medal", {id, ...info}),
    postScore: (value, board = "default") => call("score", {value, board}),
    save: (slot, data) => call("save", {slot, data}),
    load: slot => call("load", {slot})
  };
})();`;
function gameDoc(html){
  const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${GAME_CSP}"><script>${SHIM}<\/script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + head);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + "<head>" + head + "</head>");
  return "<!DOCTYPE html><html><head>" + head + "</head><body>" + html + "</body></html>";
}

/* ---------- storage: uploads live in this browser (IndexedDB) ---------- */
const GDB = {
  db:null, mem:[],
  open(){ return this.db ? Promise.resolve(this.db) : new Promise(res => { try { const r = indexedDB.open("cz-games", 1); r.onupgradeneeded = () => r.result.createObjectStore("games", {keyPath:"id"}); r.onsuccess = () => res(this.db = r.result); r.onerror = () => res(null); } catch { res(null); } }); },
  async tx(mode, fn){ const db = await this.open(); if (!db) return fn(null); return new Promise(res => { const t = db.transaction("games", mode), s = t.objectStore("games"); const out = fn(s); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => res(null); }); },
  async all(){ const db = await this.open(); if (!db) return this.mem; return new Promise(res => { const r = db.transaction("games").objectStore("games").getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); },
  async put(g){ const db = await this.open(); if (!db){ this.mem = [g, ...this.mem.filter(x => x.id !== g.id)]; return; } await this.tx("readwrite", s => s.put(g)); },
  async del(id){ const db = await this.open(); if (!db){ this.mem = this.mem.filter(x => x.id !== id); return; } await this.tx("readwrite", s => s.delete(id)); }
};
let MY_GAMES = [];
const refreshGames = async () => { MY_GAMES = await GDB.all(); MY_GAMES.sort((a, b) => b.added - a.added); };
const allGames = () => [...BUNDLED_GAMES.map(g => ({...g, bundled:true})), ...COMMUNITY_GAMES, ...MY_GAMES];

/* ---------- the bridge: parent side ---------- */
const BR = {frame:null, game:null, q:Promise.resolve(), running:null, calls:0, tokens:0, waiters:[]};
function waitRuntime(){ if (S.loaded) return Promise.resolve(); showGameGate(true); return new Promise(r => BR.waiters.push(r)); }
function runtimeReady(){ showGameGate(false); BR.waiters.splice(0).forEach(r => r()); }
function showGameGate(on){ const g = $("#gGate"); if (!g) return; g.hidden = !on; if (on){ const k = DB.rt; $("#gGateTxt").textContent = S.gpu ? `This game runs on the ${RT[k].name} runtime: ${RT[k].model}, ${gbOf(k)} GB, downloaded once and cached.` : "This browser doesn't support WebGPU, so the game can't run its model here."; $("#gGateBtn").hidden = !S.gpu; $("#gGateBtn").textContent = S.cached[k] ? "Start runtime" : "Install and play"; } }
function cleanChat(b){
  if (!b || !Array.isArray(b.messages) || !b.messages.length) throw {status:400, message:"messages must be a non-empty array"};
  const text = c => typeof c === "string" ? c : Array.isArray(c) ? c.map(p => typeof p === "string" ? p : p?.text || "").join("\n") : String(c ?? "");
  let msgs = b.messages.slice(-48).map(m => ({role:["system","user","assistant","developer"].includes(m?.role) ? (m.role === "developer" ? "system" : m.role) : "user", content:text(m?.content).slice(0, 12000)})).filter(m => m.content);
  const sys = msgs.filter(m => m.role === "system").map(m => m.content).join("\n\n"); msgs = msgs.filter(m => m.role !== "system");
  while (msgs.reduce((a, m) => a + m.content.length, 0) + sys.length > 14000 && msgs.length > 1) msgs.shift();
  if (!msgs.length || msgs.at(-1).role !== "user") throw {status:400, message:"The last message must be from the user."};
  if (sys) msgs.unshift({role:"system", content:sys.slice(0, 8000)});
  const n = (v, a, z, d) => Number.isFinite(+v) ? clamp(+v, a, z) : d;
  const req = {messages:msgs, temperature:n(b.temperature, 0, 2, 0.7), top_p:n(b.top_p, 0.01, 1, 1), max_tokens:Math.round(n(b.max_tokens ?? b.max_completion_tokens, 1, 1024, 512)),
    presence_penalty:n(b.presence_penalty, -2, 2, 0), frequency_penalty:n(b.frequency_penalty, -2, 2, 0)};
  if (b.stop) req.stop = (Array.isArray(b.stop) ? b.stop : [b.stop]).slice(0, 4).map(String);
  if (b.seed != null && Number.isFinite(+b.seed)) req.seed = +b.seed;
  const rf = b.response_format;
  if (rf && (rf.type === "json_object" || rf.type === "json_schema")){ const schema = rf.schema || rf.json_schema?.schema; req.response_format = {type:"json_object", ...(schema ? {schema:typeof schema === "string" ? schema : JSON.stringify(schema)} : {})}; }
  if (b.stream){ req.stream = true; req.stream_options = {include_usage:true}; }
  return req;
}
function mockCompletion(req){
  const fake = sc => { const o = {}; for (const [k, v] of Object.entries(sc?.properties || {})) o[k] = v.type === "integer" || v.type === "number" ? 7 : v.type === "boolean" ? true : v.type === "array" ? [] : v.type === "object" ? fake(v) : "demo"; return o; };
  if (req.response_format){ let sc = null; try { sc = req.response_format.schema ? JSON.parse(req.response_format.schema) : null; } catch {} return JSON.stringify(sc ? fake(sc) : {demo:true, note:"Scripted reply: no model in this preview."}); }
  const t = pick(["The machine whirs. A scripted fortune rolls out: no model is running in this preview.", "Demo mode: in the playable version, the model on your own GPU writes this reply.", "Somewhere a small model would be thinking very hard right now."]);
  return t;
}
async function bridgeHandle(m, reply){
  if (m.path === "models") return reply("done", {object:"list", data:ORDER.map(k => ({id:k, object:"model", owned_by:"cartridge-zone", model:RT[k].model, ready:S.loaded === k}))});
  if (m.path === "info") return reply("done", {runtime:S.loaded, model:S.loaded ? RT[S.loaded].model : null, demo:MOCK});
  if (["player", "medal", "score", "save", "load"].includes(m.path)) return reply("done", gameApi(m.path, m.body || {}));
  if (m.path !== "chat") return reply("error", {status:404, message:"Unknown endpoint"});
  let req; try { req = cleanChat(m.body); } catch (e) { return reply("error", e); }
  BR.q = BR.q.then(async () => {
    BR.running = m.id; BR.calls++;
    try {
      if (!MOCK) await waitRuntime();
      const created = Math.floor(Date.now() / 1000), model = S.loaded || "demo";
      if (MOCK){
        const t = mockCompletion(req);
        if (req.stream){ for (const w of t.split(/(?<=\s)/)){ await sleep(25); reply("chunk", {id:"cz-" + m.id, object:"chat.completion.chunk", created, model, choices:[{index:0, delta:{content:w}, finish_reason:null}]}); } return reply("done", {}); }
        return reply("done", {id:"cz-" + m.id, object:"chat.completion", created, model, choices:[{index:0, message:{role:"assistant", content:t}, finish_reason:"stop"}], usage:{prompt_tokens:0, completion_tokens:0, total_tokens:0}});
      }
      if (req.stream){
        const stream = await S.engine.chat.completions.create(req);
        for await (const ch of stream){ reply("chunk", {...ch, model}); if (ch.usage){ addTokens(ch.usage.completion_tokens || 0, ch.usage.extra?.decode_tokens_per_s); BR.tokens += ch.usage.completion_tokens || 0; } }
        return reply("done", {});
      }
      const r = await S.engine.chat.completions.create(req);
      addTokens(r.usage?.completion_tokens || 0, r.usage?.extra?.decode_tokens_per_s); BR.tokens += r.usage?.completion_tokens || 0;
      reply("done", {...r, model});
    } catch (e) { console.error(e); reply("error", {status:500, message:String(e?.message || e)}); }
    finally { BR.running = null; renderGameStats(); }
  });
}
/* The Newgrounds.io-style API: player, medals, scoreboards and save slots, kept per game in this browser. */
function gameData(id){ return DB.gameData[id] = DB.gameData[id] || {medals:{}, scores:{}, saves:{}}; }
function gameApi(path, b){
  const g = BR.game; if (!g) return null;
  const gd = gameData(g.id), str = (v, n) => String(v ?? "").slice(0, n);
  if (path === "player"){ const p = PR(); return {name:p.name || "Player", level:levelOf(p.xp), title:titleOf(levelOf(p.xp)), avatar:avatarSVG(p.avatar, 64)}; }
  if (path === "medal"){
    const id = str(b.id, 24).toLowerCase().replace(/[^a-z0-9-]/g, ""); if (!id) return {error:"A medal needs an id"};
    if (!gd.medals[id] && Object.keys(gd.medals).length >= 30) return {error:"This game has reached its 30-medal limit"};
    const meta = {name:str(b.name || id, 40), desc:str(b.desc, 120), points:[5, 10, 25, 50, 100].includes(+b.points) ? +b.points : 10};
    gd.medals[id] = meta; const fresh = award(g.id, {id, ...meta}); save(); return {id, unlocked:fresh};
  }
  if (path === "score"){
    const v = Number(b.value); if (!Number.isFinite(v)) return {error:"Score must be a number"};
    const board = str(b.board || "default", 24), prev = gd.scores[board], isBest = prev == null || v > prev;
    if (isBest) gd.scores[board] = v; if (board === "default") PR().best[g.id] = Math.max(PR().best[g.id] ?? -Infinity, v); save();
    return {board, best:Math.max(v, prev ?? v), isBest};
  }
  if (path === "save"){
    const slot = str(b.slot || "default", 24), json = JSON.stringify(b.data ?? null);
    if (json.length > 100000) return {error:"Save data is limited to 100 KB per slot"};
    if (!(slot in gd.saves) && Object.keys(gd.saves).length >= 10) return {error:"Games get up to 10 save slots"};
    gd.saves[slot] = JSON.parse(json); save(); return {slot, saved:true};
  }
  if (path === "load") return gd.saves[str(b.slot || "default", 24)] ?? null;
}
addEventListener("message", e => {
  if (!BR.frame || e.source !== BR.frame.contentWindow) return;
  const m = e.data; if (!m || m.cz !== 1) return;
  if (m.abort){ if (BR.running === m.abort) try { S.engine?.interruptGenerate(); } catch {} return; }
  const win = e.source;
  bridgeHandle(m, (type, data) => win.postMessage(type === "error" ? {cz:1, id:m.id, type, error:{status:data.status || 500, message:data.message || String(data)}} : {cz:1, id:m.id, type, data}, "*"));
});
function renderGameStats(){ const el = $("#gStats"); if (el) el.textContent = `${BR.calls} model ${BR.calls === 1 ? "call" : "calls"} · ${BR.tokens.toLocaleString()} tokens on this device`; }

/* ---------- playing an uploaded game ---------- */
async function playGame(g){
  if (!g.html && g.path){ try { const r = await fetch(g.path); if (!r.ok) throw 0; g.html = (await r.text()).slice(0, MAX_GAME * 2); } catch { toast("Couldn't load that game."); location.hash = "#portal"; return; } }
  BR.game = g; BR.calls = 0; BR.tokens = 0;
  $("#gActs").innerHTML = (g.shared ? `<button type="button" class="ok sm" data-savegame>Save to your games</button>` : "") + `<button type="button" class="ghost sm" data-sharegame>Copy play link</button>`;
  $("#gTitle").textContent = g.title; $("#gKick").textContent = `Uploaded game${g.author ? " · by " + g.author : ""}`;
  $("#gInfo").textContent = g.blurb || "";
  if (g.community && g.issue) $("#gKick").innerHTML = `Community game · by ${esc(g.author)} · <a href="${REPO_URL}/issues/${g.issue}" target="_blank" rel="noopener">submission</a>`;
  const holder = $("#gFrameWrap"); holder.querySelector("iframe")?.remove();
  const f = document.createElement("iframe");
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-pointer-lock"); f.setAttribute("title", g.title); f.setAttribute("referrerpolicy", "no-referrer");
  f.srcdoc = gameDoc(g.html); holder.prepend(f); BR.frame = f;
  renderGameStats(); showGameGate(false);
}

/* ---------- upload page ---------- */
let DRAFT = null;
function setDraft(html, name){
  if (new Blob([html]).size > MAX_GAME) return toast("That file is over 5 MB. Inline smaller assets or compress them.");
  const t = (html.match(/<title[^>]*>([^<]{1,80})<\/title>/i) || [])[1];
  DRAFT = {html}; $("#uHtml").value = html.length > 200000 ? "" : html; $("#uHtml").placeholder = html.length > 200000 ? `${name || "File"} loaded (${kb(new Blob([html]).size)}). Too large to show here.` : $("#uHtml").placeholder;
  if (t && !$("#uTitle").value) $("#uTitle").value = t.trim();
  $("#uStatus").textContent = `${name ? name + ": " : ""}${kb(new Blob([html]).size)} · ${/v1\/chat\/completions|cartridge\.(chat|stream)/.test(html) ? "uses the model API" : "doesn't call the model API yet"}`;
}
function draftGame(){
  const html = DRAFT?.html || $("#uHtml").value; if (!html.trim()) { toast("Add an HTML file or paste some HTML first"); return null; }
  const title = $("#uTitle").value.trim() || "Untitled game";
  return {id:$("#uForm").dataset.id || "g-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36), title:title.slice(0, 60), author:$("#uAuthor").value.trim().slice(0, 40), blurb:$("#uBlurb").value.trim().slice(0, 160), html, genre:$("#uGenre").value, added:Date.now(), colors:["#1a1d2b", "#7c5cff", "#b6f23a"], motif:"disk"};
}
$("#uFile").onchange = async e => { const f = e.target.files[0]; if (f) setDraft(await f.text(), f.name); e.target.value = ""; };
$("#uDrop").addEventListener("dragover", e => { e.preventDefault(); $("#uDrop").classList.add("over"); });
$("#uDrop").addEventListener("dragleave", () => $("#uDrop").classList.remove("over"));
$("#uDrop").addEventListener("drop", async e => { e.preventDefault(); $("#uDrop").classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) setDraft(await f.text(), f.name); });
$("#uHtml").addEventListener("input", () => { DRAFT = null; if ($("#uHtml").value.trim()) setDraft($("#uHtml").value); });
$("#uTest").onclick = () => { const g = draftGame(); if (!g) return; BR.pendingTest = g; location.hash = "#game-test"; };
$("#uSave").onclick = async () => { const g = draftGame(); if (!g) return; await GDB.put(g); $("#uForm").dataset.id = g.id; await refreshGames(); toast(`"${g.title}" saved to your games`); };
$("#uStarter").onclick = async () => { const t = BUNDLED_GAMES.find(g => g.id === "starter")?.html || ""; try { await navigator.clipboard.writeText(t); toast("Starter template copied"); } catch { setDraft(t, "starter.html"); toast("Starter template loaded into the box"); } };
$("#uLoadExample").onclick = () => { const z = BUNDLED_GAMES.find(g => g.id === "zoltar"); setDraft(z.html, "zoltar.html"); toast("Example loaded. Press Play test."); };
$("#gGateBtn").onclick = () => loadRuntime(DB.rt);
$("#gActs").onclick = async e => {
  const g = BR.game; if (!g) return;
  if (e.target.dataset.sharegame != null) shareGameLink(g);
  if (e.target.dataset.savegame != null){ const copy = {...g, id:"g-" + hashId(g.html) + "-" + Date.now().toString(36), shared:false}; await GDB.put(copy); await refreshGames(); e.target.remove(); toast("Saved to Your games"); }
};
$("#uSubmit").onclick = () => { const g = draftGame(); if (g) submitGame(g); };
$("#uShare").onclick = () => { const g = draftGame(); if (g) shareGameLink(g); };
