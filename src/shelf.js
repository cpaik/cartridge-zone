/* ---------- share links and the community shelf ---------- */
const SITE_URL = "https://cpaik.github.io/cartridge-zone/";
const REPO_URL = "https://github.com/cpaik/cartridge-zone";
const siteBase = () => /github\.io$/.test(location.hostname) || location.hostname === "localhost" ? location.origin + location.pathname : SITE_URL;
let COMMUNITY_CARTS = [], COMMUNITY_GAMES = [], TEMP_CARTS = {}, COMMUNITY_OK = false;

/* A cart (or small game) packed into a URL: deflate + base64url. */
const b64u = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64u = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/")); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function pack(obj){
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (!window.CompressionStream) return "j" + b64u(bytes);
  const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  return "z" + b64u(z);
}
async function unpack(s){
  const bytes = unb64u(s.slice(1));
  if (s[0] === "z") return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text());
  return JSON.parse(new TextDecoder().decode(bytes));
}
const hashId = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
async function copyText(t, msg){ try { await navigator.clipboard.writeText(t); toast(msg); return true; } catch { return false; } }
async function shareCartLink(v3){ const c = clone(v3); delete c.id; const url = siteBase() + "#c-" + await pack(c); if (!await copyText(url, `Play link copied (${(url.length / 1024).toFixed(1)} KB). Anyone who opens it can play.`)) prompt2("Copy this play link", url); }
async function shareGameLink(g){
  const url = siteBase() + "#g-" + await pack({title:g.title, author:g.author, blurb:g.blurb, genre:g.genre, html:g.html});
  if (url.length > 60000) return toast("This game is too big for a link. Save it, or submit it to the shelf.");
  if (!await copyText(url, "Play link copied. Anyone who opens it can play.")) prompt2("Copy this play link", url);
}
function prompt2(label, text){ $("#shareDlgT").textContent = label; $("#shareDlgIn").value = text; $("#shareDlg").hidden = false; $("#shareDlgIn").select(); }
$("#shareDlgClose").onclick = () => { $("#shareDlg").hidden = true; };

/* Opening a link someone sent. */
async function openSharedCart(payload){
  try {
    const v3 = sanitizeV3({...await unpack(payload), id:undefined});
    v3.id = "u-shared-" + hashId(payload); const c = runtimeCart(v3); c.shared = true; TEMP_CARTS[c.id] = c;
    show("play"); newGame(c); window.scrollTo(0, 0);
  } catch (e) { console.error(e); toast("That play link is broken or incomplete."); location.hash = "#portal"; }
}
async function openSharedGame(payload){
  try {
    const o = await unpack(payload); if (typeof o.html !== "string") throw 0;
    const g = {id:"shared-" + hashId(payload), title:String(o.title || "Shared game").slice(0, 60), author:String(o.author || "").slice(0, 40), blurb:String(o.blurb || "").slice(0, 160), genre:o.genre || "roleplay", html:o.html.slice(0, MAX_GAME), shared:true, colors:["#1a1d2b", "#7c5cff", "#b6f23a"], motif:"disk", added:Date.now()};
    show("game"); await playGame(g); window.scrollTo(0, 0);
  } catch (e) { console.error(e); toast("That play link is broken or incomplete."); location.hash = "#portal"; }
}
function renderShareBar(c){
  const el = $("#pShare"); if (!el) return;
  if (!c?.shared){ el.hidden = true; return; }
  el.hidden = false; el.innerHTML = `<span>Someone shared this cart with you.</span><button type="button" class="ok sm" data-keep>Save to your carts</button><button type="button" class="ghost sm" data-remix>Remix it</button>`;
}
$("#pShare").onclick = e => {
  const c = G?.cart; if (!c) return;
  if (e.target.dataset.keep != null){ const src = clone(c.src); src.id = "u-" + hashId(JSON.stringify(src)) + "-" + Date.now().toString(36); DB.carts.unshift(src); save(); loadUserCarts(); $("#pShare").hidden = true; toast("Saved to Your carts"); }
  if (e.target.dataset.remix != null){ const src = clone(c.src); delete src.id; show("make"); openEditor(src); history.replaceState(null, "", "#make"); }
};

/* The shelf: community/index.json, written by the GitHub Action when a maintainer approves a submission. */
async function loadCommunity(){
  if (PREVIEW) return;
  try {
    const r = await fetch("community/index.json", {cache:"no-cache"}); if (!r.ok) return;
    const idx = await r.json(); COMMUNITY_OK = true;
    COMMUNITY_CARTS = []; COMMUNITY_GAMES = [];
    for (const it of (idx.items || []).slice(0, 300)){
      try {
        if (it.type === "cart" && it.cart){ const v3 = sanitizeV3({...it.cart, id:/^c-[a-z0-9-]+$/.test(it.id) ? it.id : undefined}); const c = runtimeCart(v3); Object.assign(c, {community:true, author:String(it.author || it.login || "").slice(0, 40), issue:+it.issue || 0}); COMMUNITY_CARTS.push(c); }
        if (it.type === "game" && /^community\/games\/[a-z0-9-]+\.html$/.test(it.path || "")) COMMUNITY_GAMES.push({id:it.id, title:String(it.title).slice(0, 60), author:String(it.author || it.login || "").slice(0, 40), blurb:String(it.blurb || "").slice(0, 160), genre:it.genre || "roleplay", path:it.path, community:true, issue:+it.issue || 0, colors:["#1a1d2b", "#7c5cff", "#b6f23a"], motif:"disk"});
      } catch (e) { console.warn("Skipped a shelf item", it?.id, e); }
    }
  } catch (e) { console.warn("No community shelf", e); }
}

/* Submitting: open a pre-filled GitHub issue form. The Action checks it and comments. */
async function submitCart(v3){
  const v = validateCart(v3);
  if (v.errors.length) return toast("Fix this first: " + v.errors[0]);
  const json = JSON.stringify({...v.cart, id:undefined});
  const base = `${REPO_URL}/issues/new?template=cart.yml&title=${encodeURIComponent("[cart] " + v.cart.title)}`;
  const full = base + "&cart=" + encodeURIComponent(json);
  if (full.length <= 7800) return openOut(full, "Opening GitHub. Submit the issue there; a check will reply in a minute.");
  await copyText(json, "Cart JSON copied. Paste it into the Cart JSON field on GitHub.");
  openOut(base);
}
async function submitGame(g){
  if (new Blob([g.html]).size > 60 * 1024){ toast("Games over 60 KB go in by pull request. Opening the repo."); return openOut(REPO_URL + "/tree/main/community"); }
  const url = `${REPO_URL}/issues/new?template=game.yml&title=${encodeURIComponent("[game] " + g.title)}&pitch=${encodeURIComponent(g.blurb || "")}&credit=${encodeURIComponent(g.author || "")}`;
  await copyText(g.html, "Game HTML copied. Paste it into the Game HTML field on GitHub.");
  openOut(url);
}
function openOut(url, msg){ const w = window.open(url, "_blank"); if (w) w.opener = null; if (msg) toast(msg); if (!w) prompt2("Open this link to submit", url); }
