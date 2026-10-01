# Frontend R11 — execution record

Các bản ghi R10/R9/R7 nằm trong reports/history/FRONTEND-EXECUTION-LOG-R10.vi.md. Không tái ghi HEAD/digest lịch sử.

Intake: ZIP SHA155c9c06b94dafa327350ecc4a9e584a5a35bbdb336d62ad5db9729c62c24403; branch remediation/r11, input HEAD d523d07d423d415ccb341049a1d007ad2b84d3eb. Source gốc không đổi.

N2/N4 RED: malformed manifests/archive corruption/ACL baseline; GREEN strict verifier/extractor and numeric mode tests. N3 RED: empty packages, wrong version/replaced lock, shadow nested dependency, metadata bypass; GREEN graph checks and metadata hashes. Cache concurrency/crash tests exercise actual publisher with controlled installer; not full byte audit.

N5 RED runtime: first six-canary run had five false passes and worker-end errors. Root cause worker-scoped fixture; fixed per-test auto fixture. `browser-r11-canaries-fixed-20260929T090417Z-1` captures six intended assertion failures. Positive browser egress tests passed. Marker requests are denied without external dispatch.

N6 RED native reset failed to clear SFC store; after shared module bridge late catch/finally still changed B. Context fences corrected both. Hold/release endpoint tests take cursor before Save and check writer/peer in memory then peer reload. Export unit RED downloaded HTML and malformed JSON; GREEN refuses invalid representation. Initial browser filename mismatch was missing expose header in fixture; corrected CORS and `browser-r11-export-cors-20260929T100206Z-1` preserves actual bytes.

Local runs `r11-current-unit-20260929T095220Z-1` and `browser-r11-current-browser-20260929T095227Z-1` are intermediate verified source, not final current-source proof. Raw per-run .meta/.log/source manifests/archive preserve exit/count/identity. All R11 discoverable complete runs are merged into run claims without replacing R10 declarations. Historical missing snapshots remain explicitly log-only.

Wrapper RED self-exit124 classified timeout, plus same-label collision revealed by exclusive manifest writes; GREEN supervisor expiry marker and reserved-name collision check, 33 selftests. Test raw logs reside in /workspaces/frontend-r11-session/logs and must be included in final delivery.

Historical note at that stage: no validated checkpoint, rewrite, ZIP or external attestation yet. R7 cancellation remains UNRESOLVED; current npm run had zero cancellations, which is not a causal explanation of historical R7 failure.

2026-09-30 N6 READY: unit7 passed after requiring full backend SHA, local endpoint, capabilities scope and approval reference. Missing fixture runtime skips6, invalid partial main revision fails6 at intended pre-seed assertion. First missing run recorded SOURCE_DRIFT: integration output path tests/browser/test-results was included in identity. Corrected config to ../test-results/integration; moved own first output to session logs; subsequent runs source_drift none. Missing integration remains PENDING. Stable pre-READY unit437/browser48 and HTML200 UI1 evidence retained; direct R7 diagnostic437 does not resolve historical cancellation.

N8 report validation exposed timestamp collision: static/unit runs start in the same second; old resolver chose first timestamp match despite a full run label. Extracted original behavior, two behavioral RED assertions, then exact-label resolution (ambiguous timestamp rejected). READY missing/drift observations are preserved in evidence/r11-ready-diagnostics.json and raw artifacts, not entered as passing-gate claims; validator still refuses skipped or drifting gate claims.

2026-10-01: Full108 input commit review completed (including full behavior diffs and generated evidence provenance). Whole-branch review confirmed two Important issues: redirect bypass and stale async audit export. RED/GREEN preserved. Root also repaired six monotonic deadline probes and vacuous early-timer test. Direct Tailwind3.4.17 pin removes root302; direct-response-only guard refuses redirects before dispatch to target. Full browser53pass3fail exposed route close-order and held-route bypass; lifecycle/drain failures retained, drain attempt reverted. Guard marks context-close start and only handles target-closed cancellation after close; release uses fallback. Targeted3original failures passed. Current full unit457pass, static0 and loopback10pass; six negative canaries CAUGHT. Full browser r11-review-closed-browser still pending at this append. Final candidate v3 is outdated after review fixes; final fold and exact ZIP still pending. READY/owner-policy/R7 observation limits unchanged.

Full browser review-closed completed56/56, exit0. Source gates validated; subsequent handoff/matrix/execution changes are REPORT_ONLY. All earlier red runs retained.

N9 validated checkpoint fc9393aa được bundle/fresh-clone/fsck. Candidate v4 count93/tree19be0ef636844f197beca1e8a881f865f6460a02 bằng checkpoint. G1–G4 own-revision unit244/253/253/311, loopback10each, install0; staticG1/G2 inherited file-size exit1, G3/G4exit0, all no drift. Current map/acceptance documents are SOURCE_CHANGE: new full source gates required before final checkpoint/G5. Raw evidence whitespace preserved deliberately; behavior git diff check clean.

Final source gates r11-source-freeze: {"unit": 460, "loopback": 10, "browser": 56}, static0, same digest add591bd2ab02152504e1f17753ce41708bf4f3f8a7963913213c13391b0966f. Earlier n9-freeze55pass1fail retained; route disposed RED reproduced, three lifecycle regressions added, narrow close-induced disposal handling. Only final G5 changed since G1–G4 validated boundaries. Final checkpoint/fold pins and post-rewrite/postpackage executions external.
