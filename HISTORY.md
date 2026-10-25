# Curated Git history

[Tiếng Việt](HISTORY.vi.md)

This branch presents a responsibility-based history of the application. It was curated on **2026-10-25**. It is not an untouched, chronological recording of when every line was written.

## What changed

- Corrections were folded into their owning changes, including browser session policy and backend contract handling.
- Account editing and deletion now form one complete commit: the confirmation dialog appears with its first consumer.
- Registration uses the backend endpoint from the commit that introduces the endpoint map.
- Messages describe the actual scope of page/composable migrations. Superseded statements about pending browser policy were removed.
- Generated historical reports occupy a dedicated archive commit before the verification harness that consumes them.

The pre-curation branch remains available as [`archive/frontend-before-professionalization-20261025`](https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker/tree/archive/frontend-before-professionalization-20261025). The [commit map](documents/history/COMMIT-MAP.tsv) records retained and folded commits. The additional evidence-archive commit is a split of the original verification checkpoint, not an extra product feature.

## Date semantics

Retained commits preserve their original **author and committer identities, dates and timezone offsets**. The archive split inherits its source checkpoint's metadata. New verification, CI and documentation work is recorded at its actual maintenance date.

Preserved dates can run backwards across parent edges. Some reconstructed commits have the same timestamp; some contain a later accepted decision folded into an earlier owner. Read them as curated snapshots and use the mapping to trace origins. Do not infer that all content in a snapshot existed on its displayed date.

The broad sequence remains UI/localization, authentication, administration/audit, component extraction, session/contract hardening and staging tooling. Gaps in commit dates do not establish whether development occurred elsewhere.

## Evidence and verification

Historical logs, manifests, snapshots and recorded outcomes retain their original bytes. The original source-comparison document is preserved at `reports/evidence/historical-source-comparisons.json`.

`reports/HISTORY-CHECKPOINTS.json` pins a local Git bundle containing the seven checkpoint commits referenced by those records. `npm --prefix tests run setup:verification` checks the bundle checksum, advertised refs and Git pack, then restores only `refs/history-audit/*`. It does not fetch from the network or update HEAD, main, branches or remote-tracking refs.

The current `FRONTEND-SOURCE-COMPARISONS.json` is **derived data comparing old manifests with today's source**. It does not relabel old test outcomes as current acceptance. After source changes, refresh it explicitly with `npm --prefix tests run reports:refresh`, review the diff and run the gates. Validation never silently refreshes it.

The checkpoint bundle and raw evidence are intentionally excluded from source snapshots; their catalog and verification tools remain source inputs. A source-only historical snapshot is not a full audit distribution: it needs the pinned bundle and original evidence directory to run the archive validator.

## Publication boundary

The root commit message was rewritten, so this curated lineage has a different root from the previous main. A normal merge would retain both histories and is not the publication method for this rewrite.

On **2026-10-25**, the owner authorized replacing main after the technical home redesign and verification. The exact previous main, `240165f756afd156f150f4722e309c1beeabb7ad`, is preserved on [`archive/frontend-main-before-cutover-20261025`](https://github.com/dangkhoa2016/Vue-3-Browser-Hono-Auth-API-Cloudflare-Worker/tree/archive/frontend-main-before-cutover-20261025). Publication uses an explicit expected-SHA lease and a controlled protection-rule change, followed by protection restoration and verification. Use ordinary PRs for subsequent work on the maintained lineage.

## Maintenance policy

Use feature branches and reviewed pull requests. Keep dependencies with their consumers, messages consistent with the diff, and regression tests with behavior changes. A clear `fix` commit is welcome after publication; do not rewrite published main merely to remove that word.
