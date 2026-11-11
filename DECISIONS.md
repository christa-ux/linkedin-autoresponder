# Decisions

One line each. Newest at the bottom of each section.

## Design
- Playwright + persistent Chromium profile (no third-party API): no credentials leave my machine (rule: never share access).
- No "stealth" flags / fingerprint tricks and no CAPTCHA handling: checkpoints stop the bot loudly and I log in by hand.
- The thread is passed to the LLM as quoted data; a canary token in the system prompt detects prompt leaks.
- Always route through the LLM (with classifier tags) instead of canned shortcuts: replies to "?" or 👍 depend on context. Canned lines are only the never-silent fallback.
- Every burst gets a reply (incl. "thanks", 👍): the test stops after 10 min without an answer, so silence is the worse failure.
- Honesty over seeming human for one case: a sincere "are you a bot?" gets "an assistant is helping me reply".
- DB stores only sha256 of message keys / invitation keys / thread ids: no names or content, even locally.
- Message text is never logged by default (lengths only); LOG_CONTENT=true is local debugging only.
- Replies flattened to one line: Enter sends in LinkedIn's composer.
- Claude Sonnet 5.5 at effort "low" (chat-sized answers, low latency), server-side refusal fallback on; Haiku 5.5 on timeout/rejection; SDK retries off (we own the retry budget).

## TIME_LOG
- 20:40 start. Phase 1 scaffold + responder core + tests: 20:47. (User handles all git commits/pushes.)
- Phase 2 (session, login/inspect, selectors) verified live: login + `npm start` OK.
- Phase 3 (accept invitations) written; polls every 20 s with a page reload.

## Phase 3 notes
- Invitation selectors confirmed live: card = `[data-view-name="pending-invitation"]`, Accept = role button named /^accept/.
- Only person invitations are accepted: aria-labels mentioning follow/event/newsletter/group are skipped.
- `/messaging/thread/new/` is LinkedIn's compose screen; the bot must never type there (reply-only).
- tsx/esbuild injects `__name()` into functions passed to page.evaluate; a no-op init script defines it in every page.
- Anthropic auth via `ant auth login` profile (no key in .env); an empty ANTHROPIC_API_KEY is treated as unset.
- Replies are inserted in one go and checked in the composer before Send: key-by-key typing got cut off mid-reply live.
- Phase 4 verified live: "hey" answered in ~9-10 s, image+link burst answered once (vision ok), 3 quick messages -> 1 reply (~13 s from first), restart -> no duplicates.
- Phase 5 tuned live on 16 unusual messages (emoji, FR/ES, unknowable questions, bot question, injection, rude, PDF, wall of text, ".", repeats, connect-someone request).
- The model kept pushing an old topic and overused the first name: the prompt now says to follow the latest topic, and code tells it to skip the name if either of its last two replies used it.
- Neutral grammatical gender about the persona in FR/ES etc. (the persona's gender is unknown).
