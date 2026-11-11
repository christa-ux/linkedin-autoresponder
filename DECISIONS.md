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
