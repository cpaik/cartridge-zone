import sys, json
t = open('src/template.html').read()
man = json.load(open('games/manifest.json'))
games = [dict(g, html=open('games/' + g['file']).read()) for g in man]
for g in games: g.pop('file', None)
gjs = 'const BUNDLED_GAMES = ' + json.dumps(games).replace('</', '<\\/') + ';\n'
parts = {'/*RULES*/':'rules.js', '/*CARTS*/':'carts.js', '/*APP*/':'app.js', '/*EDITOR*/':'editor.js', '/*ARCADE*/':'arcade.js', '/*INIT*/':'init.js'}
for k, f in parts.items(): t = t.replace(k, open('src/' + f).read())
t = t.replace('/*GAMES*/', gjs)
open(sys.argv[1] if len(sys.argv) > 1 else 'dev.html', 'w').write(t)
print('built', len(t))
