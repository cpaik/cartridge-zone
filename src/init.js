/* ---------- start ---------- */
if (DEV) window.CZ = {PR, award, checkMedals, saveGame, state:() => G, debug:() => G?.debug, S, BR, turn:t => turn(t), load:k => loadRuntime(k), carts:allCarts, games:allGames, editor:() => ED, compileCart, sanitizeV3, scoreSocial, resolveDice, resolveBarter};
$("#demoBar").hidden = !MOCK; $("#tokN").textContent = DB.tokens.toLocaleString();
loadUserCarts(); renderMeChip();
Promise.all([refreshGames(), probe().then(loadCommunity)]).then(() => { route(); renderRt(); loadVotes().then(() => { if (/^#?(portal|cat-|$)/.test(location.hash.slice(1) || "portal")) renderBrowse(); }); if (!PR().onboarded && !location.hash.match(/^#(c|g|profile)-/)) S.checked ? showOnboarding(1) : setTimeout(() => showOnboarding(1), 900); });
document.addEventListener("click", e => { if (e.target.matches("[data-sharecart]")){ e.preventDefault(); if (G) shareCartLink(G.cart.src); } });
probe().then(detect).then(() => { showDl(); S.checked = true; renderRt(); if (G) renderGate(); checkCache().then(() => { if (G) renderGate(); }); });
