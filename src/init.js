/* ---------- start ---------- */
if (DEV) window.CZ = {state:() => G, debug:() => G?.debug, S, BR, turn:t => turn(t), load:k => loadRuntime(k), carts:allCarts, games:allGames, editor:() => ED, compileCart, sanitizeV3, scoreSocial, resolveDice, resolveBarter};
$("#demoBar").hidden = !MOCK; $("#tokN").textContent = DB.tokens.toLocaleString();
loadUserCarts();
refreshGames().then(() => { route(); renderRt(); });
probe().then(detect).then(() => { showDl(); S.checked = true; renderRt(); if (G) renderGate(); checkCache().then(() => { if (G) renderGate(); }); });
