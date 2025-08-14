# LiteDo Test Cases

This document enumerates end-to-end, functional, and edge-case tests for the LiteDo app. Use it as a manual test plan or to port into an automated harness.

## Core CRUD
- Create task: title only → appears at top, Created date/time set.
- Create task with description, due date, priority, tags (≤5), subtasks → fields persist.
- Edit task: change all fields; edit subtasks (add/remove/edit) → saved.
- Delete task: confirm prompt; item removed.
- Toggle complete: sets/unsets `completed` and `completedDate`.

## Task Creation Modal
- **NEW**: Click "➕ Add New Task" button → opens modal with form.
- **NEW**: Modal contains all task fields (title, description, due date, priority, tags, subtasks).
- **NEW**: Form validation works (title required, max 5 tags).
- **NEW**: Success message appears after task creation.
- **NEW**: Modal closes automatically after successful task creation.
- **NEW**: Form resets after task creation.
- **NEW**: Keyboard shortcut 'N' opens add task modal.

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

## Advanced Filters (Modal-based)
- **NEW**: Click "🔍 Advanced Filters" button → opens filters modal.
- **NEW**: Filter modal contains: search, date range, priority, status, tags, created/due dates.
- **NEW**: Date range filters: from/to dates, quick presets (7d, 30d, 90d, 1y, all).
- **NEW**: Priority filter: High/Medium/Low checkboxes.
- **NEW**: Status filter: All/Completed/Incomplete.
- **NEW**: Tag filter: search and select from available tags.
- **NEW**: Created date filter: today, yesterday, this week, this month, custom range.
- **NEW**: Due date filter: today, tomorrow, this week, this month, overdue, custom range.
- **NEW**: Filter presets: save/load custom filter combinations.
- **NEW**: Active filters show count badge on button.
- **NEW**: Keyboard shortcut 'F' opens filters modal.
- **NEW**: Filters apply automatically with debouncing.
- **NEW**: Clear all filters button resets all selections.

## Filters and sorting
- Sidebar filters: All/Today/Upcoming/Overdue/Completed → list respects due dates and completion.
- Show completed toggle off → hides completed tasks from non-Completed filters.
- Sort by Created, Priority, Due Date.
- Counts update for All/Today/Upcoming/Overdue/Completed.

## Tags Management (Modal-based)
- **NEW**: Click tags section header → opens tags management modal.
- **NEW**: Modal shows all available tags with usage counts.
- **NEW**: Search functionality to find specific tags.
- **NEW**: Filter options: show used/unused tags.
- **NEW**: Add new tag with name and color.
- **NEW**: Edit existing tags.
- **NEW**: Delete individual tags or bulk delete.
- **NEW**: Tag usage statistics in modal.

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

## Enhanced Analytics (Modal-based with Date Range)
- **NEW**: Click analytics button → opens enhanced analytics modal.
- **NEW**: Date range selector at top with from/to inputs.
- **NEW**: Quick preset buttons: Last 7 Days, 30 Days, 90 Days, 1 Year, All Time.
- **NEW**: All stats respect selected date range.
- **NEW**: Enhanced charts: Priority distribution, Completion trend, Tag usage.
- **NEW**: Productivity metrics: Average tasks per day, Completion streak, Busiest day.
- **NEW**: Real-time updates when date range changes.
- **NEW**: Responsive chart layouts.
- **NEW**: Keyboard shortcut 'Shift+?' opens analytics modal.

## File Management (Dropdown-based)
- **NEW**: File management buttons consolidated into dropdown menu.
- **NEW**: Dropdown contains: New file, Open file, Save, Save As, Import, Export, Export MD.
- **NEW**: Dropdown adapts to dark/light theme for visibility.
- **NEW**: Settings section below dropdown: auto-save, auto-reload, reopen on startup, theme.

## Keyboard shortcuts
- `/` focus search; `N` opens add task modal; `F` opens filters modal; `Shift+?` opens analytics modal.
- Cmd/Ctrl+Enter submits new task when focus is in form.
- Esc closes modals; if none open, clears search.
- Cmd/Ctrl+S (Chromium) saves to current file.

## File I/O
- Chromium: Open file… binds a JSON file; Auto-save silently writes; Save overwrites without prompt; Save As prompts; Auto-reload detects external changes (interval configurable).
- Reopen last file on startup (Chromium): on reload, file rebinds or shows "Ready to reopen • filename" if permissions missing.
- Firefox/Safari: Save/Save As hidden; Import/Export JSON used instead.
- Export Markdown groups by tags with checkboxes and metadata.

## Performance
- Load 1k–10k tasks JSON; list renders without lockups; search/filter/sort remain responsive.
- Bulk operations on 500+ tasks applied within a reasonable time (<1s on modern hardware).
- **NEW**: Filter debouncing prevents excessive re-renders during typing.

## Edge cases
- Invalid JSON import → error message; state unchanged.
- localStorage quota exceeded → graceful error logged; UI remains usable.
- Tasks without due date; sorting by due date places undated last.
- Timezone-safe dates: today/overdue computed using local YYYY-MM-DD, not UTC.
- **NEW**: Date range filters handle edge cases (no tasks in range, invalid dates).

## Security & UX
- XSS: user text escaped everywhere (title/description/tags/subtasks).
- Focus management: modals preserve accessible labels and states.
- Dark/light themes: ensure all UI elements have proper contrast and visibility.
- **NEW**: Modal backdrop clicks close modals.
- **NEW**: Form validation with user-friendly error messages.
- **NEW**: Success notifications for user actions.

## Responsive Design
- **NEW**: Mobile-friendly modal layouts.
- **NEW**: Responsive chart and grid layouts.
- **NEW**: Touch-friendly button sizes and spacing.
- **NEW**: Adaptive date range controls for small screens.

---

Automation notes: A simple browser-based harness can mount `index.html`, then programmatically interact with the DOM to assert outcomes. For large-data perf testing, use the generator script in `scripts/` to produce N tasks and Import/Open.

## Recent Major Changes (v2.0+)
- **UI Modernization**: Converted inline sections to modal-based interfaces
- **Advanced Filters**: Comprehensive filtering system with presets and date ranges
- **Enhanced Analytics**: Visual charts, productivity metrics, and date range filtering
- **Tags Management**: Dedicated modal for tag organization and management
- **Task Creation**: Streamlined modal-based task creation with success feedback
- **File Management**: Consolidated dropdown interface for better organization
- **Responsive Design**: Mobile-friendly layouts and touch-optimized controls
- **Performance**: Debounced filtering and optimized rendering
- **Accessibility**: Improved focus management and keyboard navigation
