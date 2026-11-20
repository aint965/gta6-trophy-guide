// Package Leonida Ledger and its browser captures using the competition's dossier format.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const artifactFolders = ['app', 'screenshots'];

mkdirSync(out, { recursive: true });
for (const folder of artifactFolders) {
  cpSync(join(here, folder), join(out, folder), { recursive: true });
}

const competitionLimits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
};
writeFileSync(join(out, 'dossier.json'), buildDossier(out, competitionLimits));
