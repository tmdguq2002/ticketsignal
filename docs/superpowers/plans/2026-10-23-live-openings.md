# Live ticket openings implementation plan

Goal: Replace fictional events with official upcoming opening notices, real posters and source-specific URLs, use official logo assets, refresh at 06:00 Asia/Seoul.
Scope: 14 calendar dates including today (KST midnight inclusive, midnight day14 exclusive); ticket-opening date rather than performance date. Email remains demo as previously authorized.
Architecture: Preserve vanilla UI under public assets, add Vinext server with R2 snapshot storage. Each public source adapter paginates official lists and reports its own success/failure. Never erase successful prior data on a failed source. Owner-authenticated MCP refresh tool and linked daily Sites schedule. Source failures and timestamps visible to visitors.
Tasks:
- [ ] Verify source routes, original logo assets and image sources. Respect blocks; do not call a source complete when unavailable.
- [ ] Add parsers and KST window normalization, tests for boundaries, presales, pagination and failures.
- [ ] Add snapshot service, owner-restricted refresh MCP, public read API with no subscriber information.
- [ ] Replace fixtures, show posters with fallback and direct official links; keep email clearly demo.
- [ ] Test/build/publish public site, execute deployed refresh/readback, verify next cloud task can access tools, create daily 06:00 schedule once.
