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
- `src/carts.js`: the four built-in games
- `src/app.js`: the UI and model calls
- `python3 build.py index.html`: assembles the single-file page
- `node test/sim.js` and `node test/mc.js`: scripted players and Monte Carlo balance checks
- `?dev` in the URL exposes `window.CZ` for scripted playtests against a real model

## What's included

- Four games:
  - *Last Train to Meridian* (dating sim)
  - *Blind Date With a Vampire* (dating sim with two competing meters)
  - *The Goblin Tollbridge* (d20 tabletop game)
  - *The Brass Bazaar* (haggling roleplay)
- A cart maker: write a character, set meters and win/lose conditions, then test, save, fork, and share carts as JSON.
- A daily featured game, ratings and play counts. Ratings and plays are stored only in your own browser.

## Requirements

You need a WebGPU browser: Chrome or Edge, Safari 26+, or Firefox 141+ on Windows. Add `?mock` to the URL for a scripted demo that runs without a model.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```
