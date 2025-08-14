# LiteDo Test Cases

This document enumerates end-to-end, functional, and edge-case tests for the LiteDo app. Use it as a manual test plan or to port into an automated harness.

## Core CRUD
- Create task: title only → appears at top, Created date/time set.
- Create task with description, due date, priority, tags (≤5), subtasks → fields persist.
- Edit task: change all fields; edit subtasks (add/remove/edit) → saved.
- Delete task: confirm prompt; item removed.
- Toggle complete: sets/unsets `completed` and `completedDate`.

## Subtasks
- Add multiple subtasks in composer; save task → subtasks listed.
- Toggle subtask checkbox → state persists; unchecking any subtask uncompletes parent.
- Complete all subtasks → parent auto-completes.
- Edit modal: add/remove/rename subtasks; save → updates shown.
- Close subtask UI without values → no empty background remains.

## Bulk actions
- Select tasks via row checkboxes; Selected count updates.
- Select-all checkbox selects current filter results; Mark done → all selected complete.
- Delete selected → removes all; confirm prompt shows correct count.

## Filters and sorting
- Sidebar filters: All/Today/Upcoming/Overdue/Completed → list respects due dates and completion.
- Show completed toggle off → hides completed tasks from non-Completed filters.
- Sort by Created, Priority, Due Date.
- Counts update for All/Today/Upcoming/Overdue/Completed.

## Tags
- Enter up to 5 tags when creating/editing; 6th+ ignored with notice.
- Tag pills (if panel enabled) filter on click and toggle.
- Tag panel toggle hidden by default; enabling shows panel.
- Tag search filters tag list; “+N” indicator appears when >20 unique tags.

## Search (case-insensitive; operators allow spaces around colon)
- Free text matches title/description/tags.
- Operators:
  - `tag:work` (AND multiple: `tag:work tag:personal`), quoted: `tag:"personal projects"`.
  - `priority:High|Med|Low`.
  - `completed:true|false`.
  - `is:today|upcoming|overdue|completed`.
  - `due:YYYY-MM-DD`, `before:YYYY-MM-DD`, `after:YYYY-MM-DD`.
  - `created:YYYY-MM-DD|today|yesterday`, `createdBefore:YYYY-MM-DD`, `createdAfter:YYYY-MM-DD`.
  - `text:"exact phrase"`.
- Clear search button appears when non-empty; Esc clears search if no modal.

## Analytics
- Open via button and shortcuts (Alt+A or Shift+?).
- Completion rate, overdue count, today count, total count correct.
- Completed (7d/30d) numbers reflect `completedDate` within windows.
- Top tags show with counts.

## Keyboard shortcuts
- `/` focus search; `N` focus New Task title.
- Cmd/Ctrl+Enter submits new task when focus is in form.
- Esc closes modals; if none open, clears search.
- Cmd/Ctrl+S (Chromium) saves to current file; Alt+A or Shift+? open Analytics.

## File I/O
- Chromium: Open file… binds a JSON file; Auto-save silently writes; Save overwrites without prompt; Save As prompts; Auto-reload detects external changes (interval configurable).
- Reopen last file on startup (Chromium): on reload, file rebinds or shows "Ready to reopen • filename" if permissions missing.
- Firefox/Safari: Save/Save As hidden; Import/Export JSON used instead.
- Export Markdown groups by tags with checkboxes and metadata.

## Performance
- Load 1k–10k tasks JSON; list renders without lockups; search/filter/sort remain responsive.
- Bulk operations on 500+ tasks applied within a reasonable time (<1s on modern hardware).

## Edge cases
- Invalid JSON import → error message; state unchanged.
- localStorage quota exceeded → graceful error logged; UI remains usable.
- Tasks without due date; sorting by due date places undated last.
- Timezone-safe dates: today/overdue computed using local YYYY-MM-DD, not UTC.

## Security & UX
- XSS: user text escaped everywhere (title/description/tags/subtasks).
- Focus management: composer toggle (+/−) preserves accessible labels and states.
- Dark/light themes: ensure checkbox visibility and contrast.

---

Automation notes: A simple browser-based harness can mount `index.html`, then programmatically interact with the DOM to assert outcomes. For large-data perf testing, use the generator script in `scripts/` to produce N tasks and Import/Open.
