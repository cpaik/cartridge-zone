import sys
t = open('src/template.html').read()
out = t.replace('/*RULES*/', open('src/rules.js').read()).replace('/*CARTS*/', open('src/carts.js').read()).replace('/*APP*/', open('src/app.js').read())
open(sys.argv[1] if len(sys.argv) > 1 else 'dev.html', 'w').write(out)
print('built', len(out))
