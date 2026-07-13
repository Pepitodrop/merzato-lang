import { readFile } from 'node:fs/promises';
import { VERSION } from '../src/version.js';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (packageJson.version !== VERSION) {
  throw new Error(`Version mismatch: package.json=${packageJson.version}, src/version.js=${VERSION}`);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(VERSION)) {
  throw new Error(`Invalid semantic version '${VERSION}'`);
}
console.log(`Version OK: ${VERSION}`);
