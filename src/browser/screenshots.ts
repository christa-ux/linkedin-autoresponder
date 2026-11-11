import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

const DIR = 'screenshots'; // git-ignored: may contain other people's content
const KEEP = 20;

/** Debug screenshot on failure; keeps only the newest few so personal data doesn't pile up on disk. */
export async function errorScreenshot(page: Page, label: string): Promise<void> {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  await page.screenshot({ path: path.join(DIR, `${Date.now()}-${label}.png`), timeout: 5_000 }).catch(() => undefined);
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.rmSync(path.join(DIR, f), { force: true });
}
