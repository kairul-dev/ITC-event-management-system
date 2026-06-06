# High Council Queue Audit Report

## Root Cause

The High Council dashboard used a narrower status filter than the Review Paperwork page.

- High Council dashboard cards and Paperwork Queue were filtering only `Pending High Council Approval`.
- Review Paperwork page was filtering both `Pending Approval` and `Pending High Council Approval`.
- The live database currently stores High Council queue items as `Pending Approval`, so the dashboard queue incorrectly showed `No paperwork is waiting for High Council review.`

No database migration was required because the live `events_status_check` constraint already allows both statuses.

## Files Changed

- `app/high-council/page.tsx`

## Query Comparison

| Area | Previous Query Status Filter | Updated / Existing Query Status Filter | Result |
| --- | --- | --- | --- |
| High Council Dashboard card | `Pending High Council Approval` | `Pending Approval`, `Pending High Council Approval` | Fixed |
| Review Distribution section | Dashboard `stats.pendingEvents` | Same shared dashboard pending count | Fixed |
| Paperwork Queue table | `Pending High Council Approval` | `Pending Approval`, `Pending High Council Approval` | Fixed |
| Review Paperwork page | `Pending Approval`, `Pending High Council Approval` | Unchanged | Already correct |

## Status Mapping Table

| Database Status | Visible Page | Responsible Role |
| --- | --- | --- |
| `Draft` | Committee create/edit event paperwork | Club Committee |
| `Pending Approval` | High Council Dashboard, High Council Review Paperwork | High Council |
| `Pending High Council Approval` | High Council Dashboard, High Council Review Paperwork | High Council |
| `Pending Club Advisor Approval` | Club Advisor Review Paperwork, High Council forwarded summary | Club Advisor |
| `Approved` | Committee approved/ready-to-publish views | Club Committee |
| `Rejected` | Committee approval status, High Council/Advisor rejected summaries | Club Committee to revise |
| `Published` | Public event listing, student event registration | Student / Public |
| `Closed` | Completed/closed operational event state | Club Committee |
| `Completed` | Feedback/certificate release workflow | Student / Club Committee |

## Live Constraint Verification

Read-only Supabase CLI query confirmed `events_status_check` allows:

`Draft`, `Pending Approval`, `Pending High Council Approval`, `Pending Club Advisor Approval`, `Approved`, `Rejected`, `Published`, `Closed`, `Completed`

## Debugging Counts

Live event status distribution before the code fix:

| Metric | Count |
| --- | ---: |
| Total events | 42 |
| Events awaiting High Council review | 3 |
| Events awaiting Club Advisor review | 1 |
| Published events | 18 |

Live status distribution:

| Status | Count |
| --- | ---: |
| `Rejected` | 5 |
| `Completed` | 11 |
| `Pending Approval` | 3 |
| `Published` | 18 |
| `Pending Club Advisor Approval` | 1 |
| `Draft` | 4 |

## Before / After Counts

| Check | Before | After |
| --- | ---: | ---: |
| High Council dashboard pending count | 0 | 3 |
| High Council dashboard Paperwork Queue rows | 0 | 3 |
| Review Paperwork page queue rows | 3 | 3 |
| Club Advisor forwarded count | 1 | 1 |
| Published events count | 18 | 18 |

## Queued High Council Items

| Event | Status | Route |
| --- | --- | --- |
| Codex Workflow Run 202605210341 Happy Path | `Pending Approval` | `/high-council/events` |
| fifa | `Pending Approval` | `/high-council/events` |
| Codex Workflow Test HC Reject 20260519093900 | `Pending Approval` | `/high-council/events` |

## Validation Results

- Dashboard count matches queue count: Pass (`3` = `3`)
- Queue count matches Review Paperwork page count: Pass (`3` = `3`)
- High Council dashboard no longer shows the empty queue message when paperwork exists: Pass
- High Council can open queued paperwork on the Review Paperwork page: Pass
- Example opened item: `fifa`
- `npm.cmd run lint`: Pass with existing warnings only
- `npm.cmd run build`: Pass

## Migration Result

- Migration needed: No
- `supabase db push` run: No
- Database data modified: No

