# V1 acceptance matrix

| Check | Evidence | Status |
| --- | --- | --- |
| Example and structured blank | `makeExamplePlan`, `blankPlan`, fresh UI | Implemented |
| Linked schedule/budget/equipment | `calculate()` derives all three from event records | Implemented |
| Edit and pin values | Schedule edits include name/time/stage/duration/audience; budget view edits budgets; equipment view edits assignments | Implemented |
| Supported regenerate | balance, earlier, compact requests | Implemented |
| Pin preservation | 20 alternating edit/regenerate fixture | Implemented |
| Conflict inspection/resolution | conflict panel and force-preserve path | Implemented |
| Accept and undo whole revision | revision snapshot in `lastRevision` | Implemented |
| Rename/delete/duplicate identity | IDs are stable or freshly generated | Implemented |
| Save/reload | Normal save/reload observed in Chromium on the deployed URL; blocked/quota recovery is covered by source handling and tests, not browser-observed | Normal path passed; storage-failure browser evidence pending |
| Portable export/reopen | schemaVersion 1 JSON round trip plus supported paste-JSON reopen path; valid pasted plan reopened and survived reload in Chromium | Passed |
| Malformed import recovery | Invalid `events` and invalid nested `lastRevision.before.events` were rejected through paste UI while the current pasted plan remained unchanged | Passed through paste UI; file-picker path not observed |
| Usable timetable export | quoted CSV with time, stage, act, audience, budget | Implemented |
| Desktop Chromium journey | Final source commit recorded in the owner report: edit, preview gating, accept, whole undo, linked views, save, reload, project/CSV export; isolated port `48106` and production URL | Passed |
| Narrow mobile journey | Effective narrow viewport verified locally at 390x844 and on production; brief, linked views and health surface remained reachable | Passed |
| Safari | Not tested | Unverified |

Browser evidence is intentionally bounded: blocked/quota localStorage behavior and malformed JSON via the native file picker are not claimed as browser-observed. Paste-based valid reopen and malformed/nested-history rejection were observed; strict handling remains covered by source inspection and the automated engine tests.
