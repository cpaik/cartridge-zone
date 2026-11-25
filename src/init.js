/* ---------- start ---------- */
if (DEV) window.CZ = {state:() => G, debug:() => G?.debug, S, BR, turn:t => turn(t), load:k => loadRuntime(k), carts:allCarts, games:allGames, editor:() => ED, compileCart, sanitizeV3, scoreSocial, resolveDice, resolveBarter};
$("#demoBar").hidden = !MOCK; $("#tokN").textContent = DB.tokens.toLocaleString();
loadUserCarts();
Promise.all([refreshGames(), probe().then(loadCommunity)]).then(() => { route(); renderRt(); });
document.addEventListener("click", e => { if (e.target.matches("[data-sharecart]")){ e.preventDefault(); if (G) shareCartLink(G.cart.src); } });
probe().then(detect).then(() => { showDl(); S.checked = true; renderRt(); if (G) renderGate(); checkCache().then(() => { if (G) renderGate(); }); });
