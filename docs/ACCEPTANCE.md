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
| Save/reload | localStorage on save/unload and startup load | Implemented |
| Portable export/reopen | schemaVersion 1 JSON round trip | Implemented |
| Malformed import recovery | validation rejects without replacing current plan | Implemented |
| Usable timetable export | quoted CSV with time, stage, act, audience, budget | Implemented |
| Desktop Chromium journey | Must be recorded during QA | Pending browser QA |
| Narrow mobile journey | Must be recorded during QA | Pending browser QA |
| Safari | Not tested | Unverified |
