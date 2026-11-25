// Community shelf pipeline, run by .github/workflows/shelf.yml.
//   node scripts/shelf.mjs validate   check a submission issue and write a comment
//   node scripts/shelf.mjs publish    validate, then add it to community/ (on the "approved" label)
// Reads the issue from $GITHUB_EVENT_PATH (or a file passed as the 3rd argument, for local tests).
// Writes shelf-comment.md and, for GitHub Actions, the outputs ok/published/id.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = f => fs.readFileSync(path.join(root, "src", f), "utf8");
const F = new Function(src("rules.js") + src("carts.js") + src("format.js") + "; return {sanitizeV3, validateCart, compileCart};")();

const SITE = process.env.SITE_URL || "https://cpaik.github.io/cartridge-zone/";
const MAX_GAME = 60 * 1024;            // games through issues; bigger ones come in by pull request
const mode = process.argv[2] || "validate";
const event = JSON.parse(fs.readFileSync(process.argv[3] || process.env.GITHUB_EVENT_PATH, "utf8"));
const issue = event.issue;
const out = {ok:false, published:false, id:""};
const lines = [];
const say = (...s) => lines.push(...s);

/* Issue forms render as "### Label\n\nvalue" sections; code fields arrive fenced. */
function fields(body){
  const f = {}; const parts = String(body || "").split(/^###\s+(.+)$/m);
  for (let i = 1; i < parts.length; i += 2) f[parts[i].trim().toLowerCase()] = parts[i + 1].trim();
  return f;
}
const unfence = s => { const m = String(s || "").match(/```[a-z]*\n([\s\S]*?)\n```/); return (m ? m[1] : String(s || "")).trim(); };
const clean = (s, n) => String(s || "").replace(/^_No response_$/i, "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "item";

function finish(){
  fs.writeFileSync(path.join(root, "shelf-comment.md"), lines.join("\n") + "\n");
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(out).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
  console.log(lines.join("\n"));
}

const title = String(issue.title || "");
const kind = /^\[game\]/i.test(title) ? "game" : /^\[cart\]/i.test(title) ? "cart" : null;
const f = fields(issue.body);
const login = issue.user?.login || "someone";
const credit = clean(f["credit as"] || f["your name"], 40) || login;

if (!kind){ say("This doesn't look like a shelf submission. Start the title with [cart] or [game]."); finish(); process.exit(0); }

let item = null;
if (kind === "cart"){
  let raw; try { raw = JSON.parse(unfence(f["cart json"])); } catch { say("**Couldn't read the cart.** Paste the JSON from the cart maker's Share panel into the Cart JSON field."); finish(); process.exit(0); }
  const v = F.validateCart(raw);
  if (v.errors.length){ say("**This cart can't go on the shelf yet:**", ...v.errors.map(e => "- " + e)); finish(); process.exit(0); }
  const cart = v.cart; cart.id = `c-${slug(cart.title)}-${issue.number}`;
  item = {id:cart.id, type:"cart", title:cart.title, author:credit, login, blurb:cart.blurb, genre:cart.genre, issue:issue.number, cart};
  say(`**Looks good.** “${cart.title}” is a valid ${cart.engine === "social" ? "conversation" : cart.engine === "dice" ? "dice encounter" : "haggle"} cart (${(JSON.stringify(cart).length / 1024).toFixed(1)} KB).`);
  if (v.warnings.length) say("", "Worth a look before it goes live:", ...v.warnings.map(w => "- " + w));
} else {
  const html = unfence(f["game html"]);
  const gtitle = clean(title.replace(/^\[game\]\s*/i, ""), 60);
  if (!gtitle){ say("**Give the game a title** after [game] in the issue title."); finish(); process.exit(0); }
  if (!/<(html|body|script|canvas|div)/i.test(html)){ say("**Couldn't find the game's HTML.** Paste the whole .html file into the Game HTML field."); finish(); process.exit(0); }
  if (Buffer.byteLength(html) > MAX_GAME){ say(`**This game is ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB.** Issues take games up to 60 KB; open a pull request adding it to community/games/ instead.`); finish(); process.exit(0); }
  const genre = ["dating", "mystery", "tabletop", "roleplay"].find(g => (f["category"] || "").toLowerCase().includes(g === "dating" ? "dating" : g)) || "roleplay";
  const id = `g-${slug(gtitle)}-${issue.number}`;
  item = {id, type:"game", title:gtitle, author:credit, login, blurb:clean(f["one-line pitch"], 160), genre, issue:issue.number, path:`community/games/${id}.html`, html};
  const usesApi = /v1\/chat\/completions|cartridge\.(chat|stream)|baseURL/.test(html);
  say(`**Looks good.** “${gtitle}” is ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB${usesApi ? " and calls the model API" : ", though it doesn't seem to call the model API"}.`, "", "It will run sandboxed with no network access, like every uploaded game.");
}
out.ok = true; out.id = item.id;

if (mode === "publish"){
  const dir = path.join(root, "community");
  fs.mkdirSync(path.join(dir, "games"), {recursive:true});
  const idxPath = path.join(dir, "index.json");
  const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : {items:[]};
  if (item.type === "game"){ fs.writeFileSync(path.join(root, item.path), item.html); delete item.html; }
  item.added = new Date().toISOString().slice(0, 10);
  idx.items = [item, ...idx.items.filter(x => x.id !== item.id && !(item.issue && x.issue === item.issue))];
  idx.updated = new Date().toISOString();
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 1) + "\n");
  out.published = true;
  lines.length = 0;
  say(`**Published to the community shelf.** Play it at ${SITE}#${item.type === "cart" ? "play" : "game"}-${item.id}`, "", "It appears on the site within a minute or two. Thanks for making something!");
} else {
  say("", "_A maintainer will review it. Adding the **approved** label publishes it to the shelf._");
}
finish();
