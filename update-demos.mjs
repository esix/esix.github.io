import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = __dirname;

const demos = [
  {
    name: 'mmheroes',
    src: resolve(SITE_DIR, '../mmheroes'),
    dist: resolve(SITE_DIR, '../mmheroes/dist'),
  },
  {
    name: 'ball-to-goal',
    src: resolve(SITE_DIR, '../ball-to-goal'),
    dist: resolve(SITE_DIR, '../ball-to-goal/dist'),
  },
];

for (const { name, src, dist } of demos) {
  console.log(`\n==> Building ${name}...`);
  execSync('npm run build', { cwd: src, stdio: 'inherit' });

  const dest = resolve(SITE_DIR, 'source/demo', name);
  console.log(`==> Copying ${dist} -> ${dest}`);
  rmSync(dest, { recursive: true, force: true });
  cpSync(dist, dest, { recursive: true });

  console.log(`==> ${name} done.`);
}

console.log('\nAll demos updated. Run "yarn build" to regenerate the site.');
