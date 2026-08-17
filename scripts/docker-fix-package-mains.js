// Every workspace package under packages/* declares "main"/"types" pointing
// at its raw src/index.ts — fine for tsx and Vite, which both transpile TS
// on the fly, but plain `node dist/index.js` (what the production Docker
// images run) can't parse TypeScript. Once a package has been built by
// turbo, this repoints its package.json at the compiled dist/ output
// instead. Docker-image-local only — never touches the real repo files
// dev tooling relies on.
const fs = require('fs');
const path = require('path');

const packagesDir = 'packages';
for (const name of fs.readdirSync(packagesDir)) {
  const dir = path.join(packagesDir, name);
  const distIndex = path.join(dir, 'dist', 'index.js');
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(distIndex) || !fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.main = 'dist/index.js';
  pkg.types = 'dist/index.d.ts';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}
