# Cartridge Zone

A prototype "Newgrounds for local AI": a game portal where every game runs on a small open model inside the player's browser, using WebGPU. Nothing runs on a server.

**Play:** https://cpaik.github.io/cartridge-zone/

## How it works

- **The runtime is the console.** One model (via [WebLLM](https://github.com/mlc-ai/web-llm)) downloads once and stays cached in the browser:
  - Pocket: Llama 3.2 1B, about 0.9 GB
  - Desk: Hermes 3 3B, about 2.3 GB
  - Tower: Llama 3.1 8B, about 5 GB
- **Games are cartridges.** Each one is a character, rules and stat meters in a few KB of JSON, so loading a new game is instant.
- **The page owns the numbers.** The model writes the dialogue and suggests stat changes with tags like `[AFFECTION +6]`; the page clamps every change. In the d20 game, the page rolls the dice and the model only narrates the result.

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
