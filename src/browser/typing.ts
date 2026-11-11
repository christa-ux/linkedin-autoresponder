import type { Locator, Page } from 'playwright';

/** Inserts the reply in one go: per-key typing lost focus mid-reply on LinkedIn and sent a cut-off message. */
export async function fillComposer(page: Page, box: Locator, text: string, maxPauseMs: number): Promise<void> {
  await box.click();
  // Clear any draft left by a failed attempt.
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(Math.min(maxPauseMs, 300 + text.length * 8));
  await box.focus();
  await page.keyboard.insertText(text);
}

export const normalizeText = (s: string): string => s.replace(/\s+/g, ' ').trim();
