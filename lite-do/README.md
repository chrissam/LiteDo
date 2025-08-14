# LiteDo — To‑Do App

> **Built as a side‑project to explore and experiment with [Cursor](https://cursor.sh), the AI‑powered code editor.**  
> LiteDo is a modern, lightweight, and aesthetically pleasing to‑do application with advanced features — all running entirely in the browser without requiring any server or database.

---

## Overview

LiteDo is a feature‑rich to‑do app designed for **simplicity in usage and deployment**.  
It stores all your task data in a single JSON file on your local system or cloud‑synced folder (e.g., Dropbox, Google Drive, OneDrive), enabling seamless syncing across devices.

### Key Highlights

- **No server required** – Fully client‑side single‑page app (SPA) that runs directly in your browser.
- **No database needed** – All tasks are stored in a readable flat JSON file.
- **Cross‑device sync** – Place your JSON file inside a cloud‑sync service folder to share your tasks across devices.
- **Modern UI** – Pastel‑themed, responsive, and intuitive interface with light/dark mode.
- **Rich features** – Filters, advanced search, subtasks, priorities, due dates, tags, bulk actions, analytics, and keyboard shortcuts.
- **Advanced analytics** – Completion trends, tag usage, and productivity metrics.
- **File management** – Open, save, auto‑save, import, and export tasks with ease (full support in Chromium browsers).

---

## How to Use

1. **Open the App**
   - Launch `index.html` in a supported browser (**Chrome, Edge, or other Chromium‑based browsers** recommended).

2. **Load Existing Data**
   - If your browser supports the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (Chromium):
     - Use **File → Open File** to bind an existing JSON file (can be in Dropbox/Google Drive folder).
   - Or manually **Import JSON** via `File → Import` in any browser.

3. **Manage Tasks**
   - Click **➕ Add New Task** or press **`N`**.
   - Enter title (required), plus optional **description**, **due date**, **priority**, **tags** (max 5), and **subtasks**.
   - Edit tasks via the ✏️ button, or mark them done via the ✅ checkboxes.
   - Bulk select tasks using the left checkboxes for completion or deletion.
   - Use sidebar filters (`All`, `Today`, `Upcoming`, `Overdue`, `Completed`) or **Advanced Filters** (`F`).

4. **Search**
   - Free‑text search across title/description/tags.
   - Supports **advanced operators**:
     ```
     tag:work
     priority:High
     completed:true|false
     is:today|upcoming|overdue|completed
     due:YYYY-MM-DD
     before:YYYY-MM-DD
     after:YYYY-MM-DD
     created:YYYY-MM-DD|today|yesterday
     createdBefore:YYYY-MM-DD
     createdAfter:YYYY-MM-DD
     text:"exact phrase"
     ```

5. **File Management**
   - **New File**, **Open File**, **Save**, **Save As** available in Chromium browsers.
   - **Auto‑save** and **Auto‑reload** detect and sync changes automatically.
   - In **Firefox/Safari**: use manual **Import/Export JSON**.
   - **Export Markdown** lets you generate a MD‑formatted task list.

6. **Analytics**
   - Press **Shift+?** or click the Analytics icon.
   - View **priority distribution**, **completion trends**, **most used tags**, and **productivity metrics**.
   - Filter analytics by date range (**7d**, **30d**, **90d**, **1y**, or custom).

7. **Customization**
   - Built‑in dark/light/auto theme selection.
   - Pastel colors with high legibility.
   - Mobile‑responsive layout for small screens.
   - Keyboard shortcuts for super‑fast task handling.

---

## Technical Details & Caveats

### Data Storage
- Uses **localStorage** by default for immediate persistence.
- In Chromium browsers, if you open a file via File System Access API, **that file is the source of truth** for all subsequent saves/loads.
- For cross‑device sync, place your JSON file in a **cloud‑synced folder** and open it in LiteDo on all devices.

### Browser Support

| Feature                  | Chrome / Edge / Opera | Firefox | Safari |
| ------------------------ | --------------------- | ------- | ------ |
| Open/Save JSON directly  | ✅                     | ❌      | ❌     |
| Auto‑save to file        | ✅                     | ❌      | ❌     |
| Auto‑reload from file    | ✅                     | ❌      | ❌     |
| Import/Export JSON       | ✅                     | ✅      | ✅     |
| Markdown export          | ✅                     | ✅      | ✅     |

⚠ **Important:** Firefox and Safari do **not** support direct file editing.  
You will need to **Import/Export manually** to share data between devices in those browsers.

### Data Integrity
- Input validation (title required, max 5 tags).
- States are XSS‑protected by escaping user‑provided text before rendering.
- Invalid imports show error messages but preserve current tasks.

---

## Tips for Cross‑Device Usage
1. Keep your tasks file in a **Dropbox / Google Drive / OneDrive‑synced folder** that is mounted locally.
2. In Chromium browsers, open that file directly via **File → Open File**.
3. Enable **Auto‑save** for instant writes and **Auto‑reload** to catch changes from other devices.
4. If using Firefox/Safari, regularly **Export** after work and **Import** before continuing work on another machine.

---

## Keyboard Shortcuts

| Key / Combo        | Action                                |
| ------------------ | ------------------------------------- |
| `/`                | Focus search bar                      |
| `N`                | Open Add Task modal                   |
| `F`                | Open Advanced Filters modal           |
| `Shift+?`          | Open Analytics                        |
| `Cmd/Ctrl+Enter`   | Submit new task form                   |
| `Esc`              | Close modals OR clear search          |
| `Cmd/Ctrl+S`       | Save file (Chromium only)              |

---

## Security & Accessibility
- Accessible with tab navigation and ARIA labels for modals.
- Proper color contrast for light/dark modes.
- Touch‑friendly tap targets.
- Pastel color palette optimized for readability.

---

## Getting Started Quickly

1. Download or clone the repository.
2. Open `index.html` in Chrome or Edge.
3. Create a new file or open an existing one from your Dropbox/Google Drive folder.
4. Start adding and managing tasks — **no server, no install — just your browser**.

---

## License
MIT License — free to use and modify.

---

Enjoy **managing your tasks beautifully and effortlessly** with **LiteDo**! 🎨 ✅

