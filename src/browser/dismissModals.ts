import type { Page } from 'playwright';
import { SEL, any } from './selectors.js';

/** Closes modal dialogs that block clicks (never the messaging pane). */
export async function dismissModals(page: Page): Promise<number> {
  let closed = 0;
  const buttons = page.locator(any(SEL.modalDismiss));
  const n = await buttons.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    if (await b.isVisible().catch(() => false)) {
      await b.click({ timeout: 1_500 }).then(() => closed++).catch(() => undefined);
    }
  }
  return closed;
}
