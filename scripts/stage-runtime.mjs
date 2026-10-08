import { mkdir, mkdtemp, cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const destination = resolve(process.env.ULYSSES_RUNTIME_PATH ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'servers/ulysses-mcp'));
await mkdir(join(root, 'work/staged'), { recursive: true });
const stage = await mkdtemp(join(root, 'work/staged/runtime-'));
await cp(join(root, 'build'), join(stage, 'build'), { recursive: true });
await mkdir(join(stage, 'helper-app'), { recursive: true });
await cp(join(root, 'build/UlyssesMCPHelper.app'), join(stage, 'helper-app/UlyssesMCPHelper.app'), { recursive: true });
await cp(join(root, 'helper-app/UlyssesMCPHelper.swift'), join(stage, 'helper-app/UlyssesMCPHelper.swift'));
for (const name of ['package.json', 'package-lock.json']) await cp(join(root, name), join(stage, name));
execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: stage, stdio: 'inherit' });
const files = [];
async function visit(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const name = join(prefix, entry.name), path = join(directory, entry.name);
    if (entry.isDirectory()) await visit(path, name);
    else if (entry.isFile()) files.push({ path: name, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
  }
}
await visit(stage);
await writeFile(join(stage, 'runtime-manifest.json'), JSON.stringify({ created: new Date().toISOString(), destination, files, note: 'Staged only. Back up and request per-instance approval before replacing the configured runtime. Preserve local configuration and secrets.' }, null, 2), { flag: 'wx' });
console.log(`Staged runtime: ${stage}`);
