const fs = require('fs');
const src = f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8');
const R = new Function(src('rules.js') + src('carts.js') + '; return {resolveDice,resolveBarter,BUILTIN};')();
const fresh = () => ({HP:12, GRUKK:14, TOLL:10, GOLD:6, _grumpy:0, _searches:0});
const strategies = {
  'all-out attack': st => "I attack Grukk with my sword",
  'talk, then pay': st => st.GOLD >= st.TOLL ? "I pay the toll" : "I compliment his hat and ask for a discount",
  'sneak': st => "I sneak across",
  'bribe 4, then talk': (st, i) => i === 0 ? "I offer Grukk 4 gold" : st.GOLD >= st.TOLL ? "I pay the toll" : "I tell him the bridge looks unsafe so it should be cheaper",
  'search, talk, pay': (st, i) => i < 2 ? "I search the planks" : st.GOLD >= st.TOLL ? "I pay the toll" : "I tell him a riddle",
  'pay immediately': st => "I pay the toll"
};
for (const [name, f] of Object.entries(strategies)){
  let wins = 0, turns = 0, hp = 0, N = 5000, titles = {};
  for (let g = 0; g < N; g++){
    const st = fresh(); let end = null, i = 0;
    for (; i < 12 && !end; i++){ const r = R.resolveDice(st, f(st, i)); end = r.end; }
    const t = end ? end.title : 'Nightfall'; titles[t] = (titles[t]||0)+1;
    if (end && end.won){ wins++; } turns += i; hp += st.HP;
  }
  console.log(name.padEnd(20), 'win', (wins/N*100).toFixed(0)+'%', ' avg turns', (turns/N).toFixed(1), ' avg HP left', (hp/N).toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(titles).map(([k,v])=>[k,Math.round(v/N*100)+'%']))));
}
// barter
const baz = R.BUILTIN.find(c => c.id === 'bazaar');
function haggle(name, lines){
  const st = {PRICE:240, PATIENCE:100, _trades:[]}; let out = [];
  for (const l of lines){ const r = R.resolveBarter(st, l, baz); out.push(`${l.slice(0,44).padEnd(44)} -> ask ${String(st.PRICE).padStart(3)} pat ${String(st.PATIENCE).padStart(3)}${r.deal ? ' DEAL '+JSON.stringify(r.deal) : ''}${r.note?' '+r.note:''}`); if (r.deal || st.PATIENCE <= 0) break; }
  console.log('\n## ' + name + '\n' + out.join('\n'));
}
haggle('steady climber', ["I'll give you 60.","70?","80.","85, that's fair.","90.","90, final offer.","95.","100."]);
haggle('charmer', ["What a beautiful box. Who made it?","You have wonderful taste, madam. Would you take 80?","Please, 85? It's lovely.","Thank you for your patience. 90?","90 then, kind lady."]);
haggle('trader', ["I'll give you 70 and my brass compass.","80 and the compass.","85.","90."]);
haggle('rude lowballer', ["This junk? 20.","30, you old crook.","40, final.","50, scam artist.","60.","Ugh, 70."]);
haggle('instant accept', ["Deal."]);
haggle('story then deal', ["What weather is it humming for tomorrow?","How does it work?","Lovely. 100?","95?","Deal."]);
