# V7 A/0/01 — Integration checkpoint

Date: 2026-10-07. State: integrated on the local release branch in the isolated
integration checkout; publication is a separate action. No promotion or release.

- Base: `b06f1f6b4b0c21799f2ba07631137b055c2a3364`.
- Reviewed implementation commit: `adcb90eeebeb65a19853608849b78b07e125261a`.
- Serial no-ff release merge: `bdf7da0ee3e55a6e7566d322ab305c1e95e80011`.
- Both commits have tree `8e2772c002a70e72c1769c7632fc8d609b9fc7a0`.
- Author and committer: Carlos Asensio Pizarro <carlos.aspizc@gmail.com>.
- Independent verdict: [Trial 1 OK](A_0_1-1_reviewed_OK.md).
- [Final manifest](A_0_1-1_candidate_manifest_final.json): 45 reviewed paths,
  SHA-256 `ad124afd818f8e67f424c50188bafec4e9896c449ef7c9013a7f45d569ff700b`.

Root verified every bound Git blob in the real candidate tree. The additional
four files persist the verdict, its index and the exact two manifests. The
merge changes precisely those 49 paths relative to its first parent and has
identical tree bytes to the reviewed implementation commit. No policies change.

The original checkout's .git became read-only. Root used a fresh independent
local clone under /tmp, copied only the explicitly reviewed paths plus review
bookkeeping, and committed with the operator's required email. The protected
original checkout was not a target of these add/commit/merge commands.
Its observed HEAD remains the base above and its working tree is clean;
the integration clone has its own Git/common metadata directory. No whole-.git
before/after byte fingerprint was recorded, so this is not a claim about every
historical metadata byte or other actors. In-flight worktrees were not copied
back or reset. The original branch will need normal synchronization after
metadata writes are available.

The final host gate has 2721 passed, 0 failed, 12 declared infrastructure skips,
2733 total, errors empty, status infrastructure_unavailable. Its exact archived
output and limits are in the verdict. Nine PostgreSQL, two live-Gateway and one
Temporal checks were omitted; optional providers did not run. The original
host exec handle was lost during environment transition, so no final exit-code
observation is invented. The independent sandbox run remains 25 passed and
55 failed because required path ownership is unavailable. Positive runtime
acceptance rests on bound host evidence plus independent code/test review.

This integration adds no runtime/test/schema/manifest changes after that gate;
all 45 reviewed blobs still match. Root therefore preserves the bound host gate
instead of claiming a new sandbox full-gate pass. The following status update
is documentation only, with scoped link/hygiene/inventory checks and independent
review. No new live, OS-memory-enforcement or generic wave-execution claim.

V7 inventory is one integrated leaf and four planned leaves. V6 remains one
integrated leaf and six unfinished leaves. No final 1.1.0 tag is created.
