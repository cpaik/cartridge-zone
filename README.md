# Cartridge Zone

A prototype "Newgrounds for local AI": a game portal where every game runs on a small open model inside the player's browser, using WebGPU. Nothing runs on a server.

**Play:** https://cpaik.github.io/cartridge-zone/

## How it works

- **The runtime is the console.** One model (via [WebLLM](https://github.com/mlc-ai/web-llm)) downloads once and stays cached in the browser:
  - Pocket: Llama 3.2 1B, about 0.9 GB
  - Desk: Hermes 3 3B, about 2.3 GB
  - Tower: Llama 3.1 8B, about 5 GB
- **Games are cartridges.** Each one is a character, rules and meters in a few KB, so loading a new game is instant.
- **Rules decide, the model voices.** Playtests showed small models can't keep score: a 1B model never emitted stat tags, contradicted dice results, and agreed to prices the game didn't record. So every number comes from code:
  - Dating sims score what you say against each character's likes and dislikes.
  - The d20 game rolls real dice and resolves outcomes.
  - The bazaar parses your offer and runs the merchant's counteroffers.

  The model writes only the character's short reply, given a stage direction. On Desk and up, the model's read of your line adds a small nudge to the score.

## Development

- `src/rules.js`: all game rules (pure functions)
- `src/carts.js`: the four built-in games and the editor templates, in the same v3 format players use
- `src/format.js`: cart format v3 sanitising and validation, shared with the shelf Action
- `src/editor.js`: the cart maker, health check and test bench
- `src/shelf.js`: play links and the community shelf
- `src/player.js`: profile, avatar, XP, medals, scores, autosave, hints
- `src/discover.js`: browse, search, game and creator pages, votes, onboarding
- `scripts/shelf.mjs`, `.github/`: the submission pipeline
- `src/arcade.js`: uploaded games, the sandbox and the OpenAI-compatible bridge
- `games/`: bundled example games
- `src/app.js`: the UI and model calls
- `python3 build.py index.html`: assembles the single-file page
- `node test/sim.js` and `node test/mc.js`: scripted players and Monte Carlo balance checks
- `?dev` in the URL exposes `window.CZ` for scripted playtests against a real model

## Make a cart (no code)

The cart maker at `#make` builds any of three game types from plain data:

- **Conversation:** up to three meters, each with its own direction, win and lose points, drift and per-turn cap. Rules say which phrases move which meters and how the character reacts.
  - Phrase syntax: `astronom*` (any ending), `#k` (any number), `phone .. away` (words in between), plus "unless" exceptions.
  - Personality sliders set how easily the character is won over or offended. You can also edit reaction directions, mood names and built-in instincts (kindness, insults, questions…).
- **Dice encounter:** a d20 standoff. You set the foe, HP, the price to pass, DCs, damage and the player's stats.
- **Haggle:** you set the item, asking price, budget, secret floor, patience and how fast the merchant comes down.

Every cart gets voice controls (persona, example lines, reply length, creativity), a scene narration, endings, suggested lines and cover art.

While you edit, a **health check** simulates a sharp player and a careless one to flag carts that can't be won or lost. For dice games it runs hundreds of simulated games per strategy. A **test bench** shows which rules fire for any line you type. Carts share as a few KB of JSON.

## Upload a game (bring your own code)

Any self-contained HTML game that calls the OpenAI chat API runs at `#upload`, unchanged:

- `POST /v1/chat/completions`, including `stream: true` and `response_format` JSON mode
- `GET /v1/models`
- the official `openai` JS SDK with `baseURL: "https://cartridge.local/v1"`

Calls are answered by the model on the player's GPU, through a bridge from the sandboxed frame. Games run with `sandbox="allow-scripts allow-forms allow-modals"` and a content security policy that blocks all network access except public script CDNs. A game can't read the site's storage or send players' words anywhere. See `games/zoltar.html` (streaming and JSON mode) and `games/starter.html`.

## Players

- **Profiles:** a name, an avatar built from parts, and levels earned through XP from playing, winning and medals. Some avatar items unlock with levels or specific medals (win Ezra's date for the fangs; pay Grukk's toll for his tiny hat).
- **Medals:** each cart defines its own, from 5 to 100 points. They can trigger on a win, a specific ending, a fast win, a rule firing, a meter's final value, a natural 20, a bargain price and more, and can be secret until earned. Carts without medals get three basics.
- **Personal bests and autosave:** every finished game is scored, and an unfinished game appears under *Continue playing*.
- **Hints and how-to-play:** each game shows its goal, and players get two hints per game.
- **Discovery:** one browse grid with search, sorting and tags, game pages with medals and reviews, and creator pages.
- **Community votes and reviews:** community games show votes and reviews read from their GitHub submission issues (reactions and comments), so there's no server to run.

Uploaded games get the same features through `cartridge.player()`, `cartridge.unlockMedal()`, `cartridge.postScore()`, `cartridge.save()` and `cartridge.load()`.

## Share and publish

- **Play links:** the cart maker's Share panel and every play screen offer *Copy play link*. The whole cart is compressed into the URL (about 2 KB), so anyone who opens it can play immediately and save or remix it. Small uploaded games work the same way.
- **The community shelf** is published from this repo, so it needs no server:
  1. *Submit to the shelf* opens a pre-filled GitHub issue (`.github/ISSUE_TEMPLATE/cart.yml` or `game.yml`).
  2. `.github/workflows/shelf.yml` runs `scripts/shelf.mjs`. It validates the submission with the same code the site uses (`src/format.js`) and comments with the result.
  3. A maintainer adds the **approved** label. The Action writes the item to `community/index.json` (games go to `community/games/`), closes the issue and rebuilds the site.

  Games over 60 KB come in by pull request instead.

## Built-in games

- *Last Train to Meridian* (dating sim)
- *Blind Date With a Vampire* (dating sim with two competing meters)
- *The Goblin Tollbridge* (d20 tabletop game)
- *The Brass Bazaar* (haggling roleplay)

The cart maker also offers four templates: a barista dating sim, a murder-mystery interrogation, a troll encounter and a lamp seller. Ratings and plays are stored only in your own browser.

## Requirements

You need a WebGPU browser: Chrome or Edge, Safari 26+, or Firefox 141+ on Windows. Add `?mock` to the URL for a scripted demo that runs without a model.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```
