# Ticket Signal MVP Implementation Plan

**Goal:** Deliver a hosted Korean demo of a four-platform ticket opening board and email keyword subscriptions.
**Architecture:** Buildless browser application. Fixture repository and local subscription repository are separate from rendering; future server APIs replace those repositories. No email delivery, crawler, or Brevo credentials in MVP.
**Tech Stack:** HTML, CSS, ES modules, Node test runner, Sites static hosting.
**Spec:** User approved Brevo direction and explicitly requested a non-operational extensible MVP. All shows and dates are fictional, visibly marked. Email is saved only after consent in the current browser.

- [x] Domain: test keyword normalization, combined filters, input validation and safe local storage recovery; implement core.mjs and repositories.mjs.
- [x] Experience: responsive schedule board, saved shows, platform/date/category filters, subscription dialog, editing/deletion, email preview and empty states.
- [ ] Verify: unit tests, browser interaction when available, syntax checks; publish via Sites and return deployed URL.

Review focus: no implied real delivery; stale fixture dates; malformed storage; unsafe rendering of user input; notification consent and deletion.
