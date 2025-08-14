// Todo App JavaScript - Enhanced Version with File System Access, Advanced Search, and Analytics
class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentSort = 'createdDate';
        this.selectedTasks = new Set();
        this.activeTag = null;
        this.showCompleted = true;
        this.subtasks = [];
        this.fileHandle = null; // FileSystemFileHandle when a file is opened
        this.autoSave = false;
        this.isFileSystemSupported = !!(window.showOpenFilePicker && window.showSaveFilePicker);
        this.lastFileModifiedMs = null;
        this._debounceTimer = null;
        this.autoReloadEnabled = false;
        this.quickDownloadEnabled = false; // removed UI, keeping flag unused
        this.autoReloadMs = 5000;
        this._autoReloadTimer = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.render();
        this.updateCounts();
        this.updateFileStatus();
        this.setupFileSupportUI();
        this.setupAutoReloadOnFocus();
        this.tryReopenLastFile();
    }

    // Load data from localStorage or use sample data
    loadData() {
        const storedTasks = localStorage.getItem('fancyTasks');
        if (storedTasks) {
            try {
                this.tasks = JSON.parse(storedTasks);
            } catch (e) {
                console.error('Error parsing stored tasks:', e);
                this.loadSampleData();
            }
        } else {
            this.loadSampleData();
        }
    }

    // Load sample data
    loadSampleData() {
        this.tasks = [
            {
                id: "1",
                title: "Build to-do app in python",
                description: "Build a useful to-do app for your use.",
                completed: false,
                priority: "High",
                dueDate: "2025-08-12",
                tags: ["work", "development"],
                createdDate: "2025-08-10",
                subtasks: []
            },
            {
                id: "2", 
                title: "Review project architecture",
                description: "Prepare resiliency gap analysis",
                completed: false,
                priority: "High", 
                dueDate: "2025-08-12",
                tags: ["work", "autodesk"],
                createdDate: "2025-08-11",
                subtasks: []
            },
            {
                id: "3",
                title: "Refactor billing module", 
                description: "Fix rounding bug and add tests",
                completed: false,
                priority: "Med",
                dueDate: "2025-08-15", 
                tags: ["work"],
                createdDate: "2025-08-12",
                subtasks: []
            }
        ];
        this.saveData();
    }

    // Save data to localStorage and optionally to file if autoSave enabled
    saveData() {
        try {
            localStorage.setItem('fancyTasks', JSON.stringify(this.tasks));
        } catch (e) {
            console.error('Error saving tasks:', e);
        }
        if (this.autoSave && this.fileHandle && this.isFileSystemSupported) {
            this.persistToFileDebounced();
        }
        this.updateFileStatus();
    }

    // Bind event listeners
    bindEvents() {
        // Add task form
        const addTaskForm = document.getElementById('addTaskForm');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        // Collapse composer
        const toggleComposerBtn = document.getElementById('toggleComposerBtn');
        if (toggleComposerBtn) {
            toggleComposerBtn.addEventListener('click', () => {
                const section = document.getElementById('addTaskSection');
                const form = document.getElementById('addTaskForm');
                const expanded = toggleComposerBtn.getAttribute('aria-expanded') === 'true';
                if (expanded) {
                    form.style.display = 'none';
                    toggleComposerBtn.textContent = '+';
                    toggleComposerBtn.setAttribute('aria-expanded', 'false');
                    toggleComposerBtn.setAttribute('aria-label', 'Show composer');
                } else {
                    form.style.display = '';
                    toggleComposerBtn.textContent = '−';
                    toggleComposerBtn.setAttribute('aria-expanded', 'true');
                    toggleComposerBtn.setAttribute('aria-label', 'Hide composer');
                }
            });
        }

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.render();
                this.toggleClearSearch();
            });
        }

        // Clear search
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                }
                this.currentSearch = '';
                this.render();
                this.toggleClearSearch();
            });
        }

        // Navigation filters
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                this.currentFilter = item.dataset.filter;
                this.render();
            });
        });

        // Show completed checkbox
        const showCompleted = document.getElementById('showCompleted');
        if (showCompleted) {
            showCompleted.addEventListener('change', (e) => {
                this.showCompleted = e.target.checked;
                this.render();
            });
        }

        // Show tags panel toggle
        const showTagsPanel = document.getElementById('showTagsPanel');
        if (showTagsPanel) {
            const section = document.getElementById('tagsSection');
            if (section) section.style.display = 'none';
            showTagsPanel.addEventListener('change', (e) => {
                if (!section) return;
                section.style.display = e.target.checked ? '' : 'none';
            });
        }

        // Sort dropdown
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.render();
            });
        }

        // Tag search filter
        const tagSearchInput = document.getElementById('tagSearchInput');
        if (tagSearchInput) {
            tagSearchInput.addEventListener('input', () => {
                this.renderTags();
            });
        }

        // Search help modal
        const searchHelpBtn = document.getElementById('searchHelpBtn');
        if (searchHelpBtn) {
            searchHelpBtn.addEventListener('click', () => this.showModal('searchHelpModal'));
        }
        const closeSearchHelpBtn = document.getElementById('closeSearchHelpBtn');
        if (closeSearchHelpBtn) {
            closeSearchHelpBtn.addEventListener('click', () => this.hideModal('searchHelpModal'));
        }

        // Bulk actions
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        const markDoneBtn = document.getElementById('markDoneBtn');
        if (markDoneBtn) {
            markDoneBtn.addEventListener('click', () => {
                this.markSelectedDone();
            });
        }

        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelected();
            });
        }

        // Add subtask
        const addSubtaskBtn = document.getElementById('addSubtaskBtn');
        if (addSubtaskBtn) {
            addSubtaskBtn.addEventListener('click', () => {
                this.showSubtaskContainer();
            });
        }
        const editAddSubtaskBtn = document.getElementById('editAddSubtaskBtn');
        if (editAddSubtaskBtn) {
            editAddSubtaskBtn.addEventListener('click', () => {
                this.addSubtaskInput(true);
            });
        }

        // Analytics modal
        const analyticsBtn = document.getElementById('analyticsBtn');
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', () => {
                this.showAnalytics();
            });
        }

        const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
        if (closeAnalyticsBtn) {
            closeAnalyticsBtn.addEventListener('click', () => {
                this.hideModal('analyticsModal');
            });
        }

        // Edit modal
        const editTaskForm = document.getElementById('editTaskForm');
        if (editTaskForm) {
            editTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditedTask();
            });
        }

        const closeEditBtn = document.getElementById('closeEditBtn');
        if (closeEditBtn) {
            closeEditBtn.addEventListener('click', () => {
                this.hideModal('editTaskModal');
            });
        }

        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.hideModal('editTaskModal');
            });
        }

        // Export and Reset
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportTasks();
            });
        }
        const exportMdBtn = document.getElementById('exportMdBtn');
        if (exportMdBtn) {
            exportMdBtn.addEventListener('click', () => {
                this.exportMarkdown();
            });
        }
        const importBtn = document.getElementById('importBtn');
        const importFileInput = document.getElementById('importFileInput');
        if (importBtn && importFileInput) {
            importBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', (e) => this.importTasks(e));
        }
        const newFileBtn = document.getElementById('newFileBtn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => this.createNewFile());
        }
        const openFileBtn = document.getElementById('openFileBtn');
        if (openFileBtn) {
            openFileBtn.addEventListener('click', () => this.openFile());
        }
        const saveFileBtn = document.getElementById('saveFileBtn');
        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => this.persistToFile(false));
        }
        const saveAsFileBtn = document.getElementById('saveAsFileBtn');
        if (saveAsFileBtn) {
            saveAsFileBtn.addEventListener('click', () => this.persistToFile(true));
        }
        const autoReloadToggle = document.getElementById('autoReloadToggle');
        if (autoReloadToggle) {
            const saved = localStorage.getItem('fancyTasks_autoReload') === 'true';
            autoReloadToggle.checked = saved;
            this.autoReloadEnabled = saved;
            autoReloadToggle.addEventListener('change', (e) => {
                this.autoReloadEnabled = e.target.checked;
                localStorage.setItem('fancyTasks_autoReload', this.autoReloadEnabled ? 'true' : 'false');
            });
        }

        const reopenToggle = document.getElementById('reopenOnStartupToggle');
        if (reopenToggle) {
            const saved = localStorage.getItem('fancyTasks_reopen') === 'true';
            reopenToggle.checked = saved;
            this.reopenOnStartup = saved;
            reopenToggle.addEventListener('change', (e) => {
                this.reopenOnStartup = e.target.checked;
                localStorage.setItem('fancyTasks_reopen', this.reopenOnStartup ? 'true' : 'false');
                if (!this.reopenOnStartup) {
                    this.deleteStoredHandle().catch(() => {});
                } else if (this.fileHandle) {
                    this.setStoredHandle(this.fileHandle).catch(() => {});
                }
            });
        }

        const autoReloadInterval = document.getElementById('autoReloadInterval');
        if (autoReloadInterval) {
            const saved = parseInt(localStorage.getItem('fancyTasks_autoReloadMs') || '5000', 10);
            if (!Number.isNaN(saved) && saved >= 2000) {
                this.autoReloadMs = saved;
                autoReloadInterval.value = String(Math.round(saved / 1000));
            } else {
                autoReloadInterval.value = String(Math.round(this.autoReloadMs / 1000));
            }
            autoReloadInterval.addEventListener('change', () => {
                const seconds = Math.max(2, parseInt(autoReloadInterval.value || '5', 10));
                this.autoReloadMs = seconds * 1000;
                localStorage.setItem('fancyTasks_autoReloadMs', String(this.autoReloadMs));
                this.resetAutoReloadTimer();
            });
        }
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            const saved = localStorage.getItem('fancyTasks_autoSave') === 'true';
            autoSaveToggle.checked = saved;
            this.autoSave = saved;
            autoSaveToggle.addEventListener('change', (e) => {
                this.autoSave = e.target.checked;
                localStorage.setItem('fancyTasks_autoSave', this.autoSave ? 'true' : 'false');
            });
        }

        // Theme selector
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            const storedTheme = localStorage.getItem('fancyTasks_theme') || 'auto';
            themeSelect.value = storedTheme;
            this.applyTheme(storedTheme);
            themeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                localStorage.setItem('fancyTasks_theme', val);
                this.applyTheme(val);
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // Modal backdrop clicks
        const analyticsModal = document.getElementById('analyticsModal');
        if (analyticsModal) {
            analyticsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideModal('analyticsModal');
                }
            });
        }

        const editTaskModal = document.getElementById('editTaskModal');
        if (editTaskModal) {
            editTaskModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideModal('editTaskModal');
                    const c = document.getElementById('subtasksContainer');
                    if (c) { c.style.display = 'none'; c.innerHTML = ''; this.subtasks = []; }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '');
            // Focus search
            if (e.key === '/' && !isInput) {
                const search = document.getElementById('searchInput');
                if (search) { e.preventDefault(); search.focus(); }
            }
            // Open analytics
            if (((e.altKey && (e.key === 'a' || e.key === 'A')) || (e.shiftKey && (e.key === '?' || e.key === '/'))) && !isInput) {
                e.preventDefault(); this.showAnalytics();
            }
            // New task focus
            if ((e.key === 'n' || e.key === 'N') && !isInput) {
                const title = document.getElementById('taskTitle');
                if (title) { e.preventDefault(); title.focus(); }
            }
            // Submit add task with Cmd/Ctrl+Enter
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                const form = document.getElementById('addTaskForm');
                if (form && document.activeElement && form.contains(document.activeElement)) {
                    e.preventDefault(); this.addTask();
                }
            }
            // Save file with Cmd/Ctrl+S
            if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault(); this.persistToFile(false);
            }
            // Escape closes modals or clears search
            if (e.key === 'Escape') {
                const modals = ['analyticsModal', 'editTaskModal'];
                let closed = false;
                modals.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && !el.classList.contains('hidden')) { this.hideModal(id); closed = true; }
                });
                if (!closed) {
                    const search = document.getElementById('searchInput');
                    if (search && search.value) { search.value = ''; this.currentSearch = ''; this.render(); this.toggleClearSearch(); }
                }
            }
        });
    }

    applyTheme(mode) {
        const root = document.documentElement;
        root.removeAttribute('data-color-scheme');
        if (mode === 'light') root.setAttribute('data-color-scheme', 'light');
        if (mode === 'dark') root.setAttribute('data-color-scheme', 'dark');
        // 'auto' uses system preference via CSS media queries
    }

    setupFileSupportUI() {
        const saveBtn = document.getElementById('saveFileBtn');
        const saveAsBtn = document.getElementById('saveAsFileBtn');
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        const quickDlToggle = document.getElementById('quickDownloadToggle');
        if (!this.isFileSystemSupported) {
            // Hide Save/Save As for non-Chromium to avoid confusion; rely on Export/Import
            if (saveBtn) { saveBtn.style.display = 'none'; }
            if (saveAsBtn) { saveAsBtn.style.display = 'none'; }
            if (autoSaveToggle) { autoSaveToggle.disabled = true; autoSaveToggle.title = 'Auto-save not supported in this browser'; }
            if (quickDlToggle) { quickDlToggle.parentElement.style.display = 'none'; }
            const status = document.getElementById('fileStatus');
            if (status) status.textContent = 'Firefox: using download-based saving. Consider Chrome for direct file editing.';
        }
    }

    setupAutoReloadOnFocus() {
        const maybeReload = async () => {
            if (!this.autoReloadEnabled) return;
            if (this.fileHandle && this.isFileSystemSupported) {
                try {
                    const file = await this.fileHandle.getFile();
                    if (this.lastFileModifiedMs && file.lastModified && file.lastModified > this.lastFileModifiedMs) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const tasks = Array.isArray(data) ? data : data.tasks;
                        if (Array.isArray(tasks)) {
                            this.tasks = tasks;
                            try { localStorage.setItem('fancyTasks', JSON.stringify(this.tasks)); } catch (_) {}
                            this.render();
                            this.updateCounts();
                            this.updateFileStatus('Reloaded');
                        }
                    }
                } catch (_) {
                    // ignore
                }
            }
        };
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') maybeReload();
        });
        this._autoReloadTimer = setInterval(maybeReload, this.autoReloadMs);
    }

    resetAutoReloadTimer() {
        if (this._autoReloadTimer) clearInterval(this._autoReloadTimer);
        const maybeReload = async () => {
            if (!this.autoReloadEnabled) return;
            if (this.fileHandle && this.isFileSystemSupported) {
                try {
                    const file = await this.fileHandle.getFile();
                    if (this.lastFileModifiedMs && file.lastModified && file.lastModified > this.lastFileModifiedMs) {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const tasks = Array.isArray(data) ? data : data.tasks;
                        if (Array.isArray(tasks)) {
                            this.tasks = tasks;
                            try { localStorage.setItem('fancyTasks', JSON.stringify(this.tasks)); } catch (_) {}
                            this.render();
                            this.updateCounts();
                            this.updateFileStatus('Reloaded');
                        }
                    }
                } catch (_) {}
            }
        };
        this._autoReloadTimer = setInterval(maybeReload, this.autoReloadMs);
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // Get current local date in YYYY-MM-DD format (no UTC shift)
    getCurrentDate() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Add new task
    addTask() {
        const titleInput = document.getElementById('taskTitle');
        const descriptionInput = document.getElementById('taskDescription');
        const dueDateInput = document.getElementById('taskDueDate');
        const priorityInput = document.getElementById('taskPriority');
        const tagsInput = document.getElementById('taskTags');

        if (!titleInput || !descriptionInput || !dueDateInput || !priorityInput || !tagsInput) {
            console.error('Form elements not found');
            return;
        }

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const dueDate = dueDateInput.value;
        const priority = priorityInput.value;
        const tagsInputValue = tagsInput.value.trim();
        let tags = tagsInputValue ? tagsInputValue.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        if (tags.length > 5) {
            alert('You can add up to 5 tags. Extra tags will be ignored.');
            tags = tags.slice(0, 5);
        }

        if (!title) {
            alert('Please enter a task title');
            return;
        }

        const newTask = {
            id: this.generateId(),
            title,
            description,
            completed: false,
            priority,
            dueDate,
            tags,
            createdDate: this.getCurrentDate(),
            createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            subtasks: [...this.subtasks],
            subtasksDone: this.subtasks.length ? new Array(this.subtasks.length).fill(false) : []
        };

        this.tasks.unshift(newTask);
        this.saveData();
        this.clearForm();
        this.render();
        this.updateCounts();
    }

    // Clear add task form
    clearForm() {
        const form = document.getElementById('addTaskForm');
        if (form) {
            form.reset();
        }
        this.subtasks = [];
        const subtasksContainer = document.getElementById('subtasksContainer');
        if (subtasksContainer) {
            subtasksContainer.style.display = 'none';
            subtasksContainer.innerHTML = '';
        }
    }

    // Show subtask container
    showSubtaskContainer() {
        const container = document.getElementById('subtasksContainer');
        if (container) {
            container.style.display = 'block';
            this.addSubtaskInput();
        }
    }

    // Add subtask input (newTask = false uses add form; true uses edit modal)
    addSubtaskInput(isEdit = false, initialValue = '') {
        const container = document.getElementById(isEdit ? 'editSubtasksContainer' : 'subtasksContainer');
        if (!container) return;

        container.style.display = 'block';
        const subtaskDiv = document.createElement('div');
        subtaskDiv.className = 'subtask-item';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'subtask-input';
        input.placeholder = 'Enter subtask...';
        input.value = initialValue;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-subtask';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
            subtaskDiv.remove();
            if (isEdit) {
                this.updateEditSubtasks();
            } else {
                this.updateSubtasks();
            }
        });

        input.addEventListener('input', () => {
            if (isEdit) {
                this.updateEditSubtasks();
            } else {
                this.updateSubtasks();
            }
        });
        
        subtaskDiv.appendChild(input);
        subtaskDiv.appendChild(removeBtn);
        container.appendChild(subtaskDiv);
    }

    // Update subtasks array
    updateSubtasks() {
        const inputs = document.querySelectorAll('.subtask-input');
        // Only count inputs in the add form container
        const addContainer = document.getElementById('subtasksContainer');
        const arr = [];
        inputs.forEach(inp => { if (addContainer && addContainer.contains(inp)) arr.push(inp.value.trim()); });
        this.subtasks = arr.filter(text => text);
        // Hide container if no inputs or all empty
        if (addContainer) {
            const hasAny = addContainer.querySelectorAll('.subtask-item').length > 0;
            const anyValue = this.subtasks.length > 0;
            if (!hasAny || !anyValue) {
                addContainer.style.display = 'none';
                addContainer.innerHTML = '';
            }
        }
    }

    updateEditSubtasks() {
        const editContainer = document.getElementById('editSubtasksContainer');
        if (!editContainer) return [];
        const inputs = editContainer.querySelectorAll('.subtask-input');
        return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
    }

    // Toggle task completion
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedDate = task.completed ? this.getCurrentDate() : null;
            this.saveData();
            this.render();
            this.updateCounts();
        }
    }

    // Toggle subtask completion; all complete -> marks task completed
    toggleSubtask(taskId, index) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !Array.isArray(task.subtasks)) return;
        // store per-task subtask state
        if (!Array.isArray(task.subtasksDone)) task.subtasksDone = new Array(task.subtasks.length).fill(false);
        // if subtasks length changed, resize
        if (task.subtasksDone.length !== task.subtasks.length) {
            const newDone = new Array(task.subtasks.length).fill(false);
            for (let i = 0; i < Math.min(task.subtasksDone.length, newDone.length); i++) newDone[i] = !!task.subtasksDone[i];
            task.subtasksDone = newDone;
        }
        task.subtasksDone[index] = !task.subtasksDone[index];
        const allDone = task.subtasks.length > 0 && task.subtasksDone.every(Boolean);
        if (allDone) {
            task.completed = true;
            task.completedDate = this.getCurrentDate();
        } else if (task.completed) {
            // if a subtask gets unchecked, uncomplete parent
            task.completed = false;
            task.completedDate = null;
        }
        this.saveData();
        this.render();
        this.updateCounts();
    }

    // Delete task
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.selectedTasks.delete(taskId);
            this.saveData();
            this.render();
            this.updateCounts();
        }
    }

    // Edit task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const editTaskId = document.getElementById('editTaskId');
            const editTaskTitle = document.getElementById('editTaskTitle');
            const editTaskDescription = document.getElementById('editTaskDescription');
            const editTaskDueDate = document.getElementById('editTaskDueDate');
            const editTaskPriority = document.getElementById('editTaskPriority');
            const editTaskTags = document.getElementById('editTaskTags');

            if (editTaskId) editTaskId.value = task.id;
            if (editTaskTitle) editTaskTitle.value = task.title;
            if (editTaskDescription) editTaskDescription.value = task.description;
            if (editTaskDueDate) editTaskDueDate.value = task.dueDate;
            if (editTaskPriority) editTaskPriority.value = task.priority;
            if (editTaskTags) editTaskTags.value = task.tags.join(', ');

            // Populate subtasks
            const editSubtasksContainer = document.getElementById('editSubtasksContainer');
            if (editSubtasksContainer) {
                editSubtasksContainer.innerHTML = '';
                if (task.subtasks && task.subtasks.length) {
                    editSubtasksContainer.style.display = 'block';
                    task.subtasks.forEach(st => this.addSubtaskInput(true, st));
                } else {
                    editSubtasksContainer.style.display = 'none';
                }
            }

            this.showModal('editTaskModal');
        }
    }

    // Save edited task
    saveEditedTask() {
        const editTaskId = document.getElementById('editTaskId');
        if (!editTaskId) return;

        const taskId = editTaskId.value;
        const task = this.tasks.find(t => t.id === taskId);
        
        if (task) {
            const editTaskTitle = document.getElementById('editTaskTitle');
            const editTaskDescription = document.getElementById('editTaskDescription');
            const editTaskDueDate = document.getElementById('editTaskDueDate');
            const editTaskPriority = document.getElementById('editTaskPriority');
            const editTaskTags = document.getElementById('editTaskTags');

            if (editTaskTitle) task.title = editTaskTitle.value.trim();
            if (editTaskDescription) task.description = editTaskDescription.value.trim();
            if (editTaskDueDate) task.dueDate = editTaskDueDate.value;
            if (editTaskPriority) task.priority = editTaskPriority.value;
            if (editTaskTags) {
                const tagsInputValue = editTaskTags.value.trim();
                let t = tagsInputValue ? tagsInputValue.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
                if (t.length > 5) {
                    alert('You can add up to 5 tags. Extra tags will be ignored.');
                    t = t.slice(0, 5);
                }
                task.tags = t;
            }
            // Update subtasks from edit modal
            const newSubs = this.updateEditSubtasks();
            if (Array.isArray(newSubs)) {
                task.subtasks = newSubs;
                // rebuild subtasksDone aligned to new subtasks
                const newDone = new Array(task.subtasks.length).fill(false);
                if (Array.isArray(task.subtasksDone)) {
                    for (let i = 0; i < Math.min(task.subtasksDone.length, newDone.length); i++) newDone[i] = !!task.subtasksDone[i];
                }
                task.subtasksDone = newDone;
            }
            
            this.saveData();
            this.hideModal('editTaskModal');
            this.render();
            this.updateCounts();
        }
    }

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Toggle select all tasks
    toggleSelectAll(checked) {
        const filteredTasks = this.getFilteredTasks();
        if (checked) {
            filteredTasks.forEach(task => this.selectedTasks.add(task.id));
        } else {
            this.selectedTasks.clear();
        }
        this.updateSelectedCount();
        this.render();
    }

    // Toggle task selection
    toggleTaskSelection(taskId, checked) {
        if (checked) {
            this.selectedTasks.add(taskId);
        } else {
            this.selectedTasks.delete(taskId);
        }
        this.updateSelectedCount();
    }

    // Update selected count
    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = `Selected ${this.selectedTasks.size}`;
        }
    }

    // Mark selected tasks as done
    markSelectedDone() {
        this.selectedTasks.forEach(taskId => {
            const task = this.tasks.find(t => t.id === taskId);
            if (task && !task.completed) {
                task.completed = true;
                task.completedDate = this.getCurrentDate();
            }
        });
        this.selectedTasks.clear();
        this.saveData();
        this.render();
        this.updateCounts();
        this.updateSelectedCount();
    }

    // Delete selected tasks
    deleteSelected() {
        if (this.selectedTasks.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${this.selectedTasks.size} selected tasks?`)) {
            this.tasks = this.tasks.filter(t => !this.selectedTasks.has(t.id));
            this.selectedTasks.clear();
            this.saveData();
            this.render();
            this.updateCounts();
            this.updateSelectedCount();
        }
    }

    // Parse advanced query string into predicate
    parseQuery(query) {
        if (!query) return () => true;
        const tokens = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < query.length; i++) {
            const ch = query[i];
            if (ch === '"') { inQuotes = !inQuotes; current += ch; continue; }
            if (ch === ' ' && !inQuotes) { if (current) { tokens.push(current); current = ''; } }
            else { current += ch; }
        }
        if (current) tokens.push(current);
        const clauses = tokens.map(tok => {
            const m = tok.match(/^\s*([a-zA-Z_\-]+)\s*:\s*(.*)$/);
            if (!m) {
                const needle = tok.replace(/^"|"$/g, '').toLowerCase();
                return task => task.title.toLowerCase().includes(needle) ||
                               task.description.toLowerCase().includes(needle) ||
                               task.tags.some(t => t.toLowerCase().includes(needle));
            }
            const key = (m[1] || '').toLowerCase();
            const normKey = key.replace(/[_-]/g, '');
            let value = (m[2] || '').trim().replace(/^"|"$/g, '');
            switch (normKey) {
                case 'tag': {
                    // support tag:one tag:two (AND)
                    const val = value.toLowerCase();
                    return task => task.tags.some(t => t.toLowerCase() === val);
                }
                case 'priority': return task => (task.priority || '').toLowerCase() === value.toLowerCase();
                case 'completed': {
                    const flag = value.toLowerCase() === 'true';
                    return task => !!task.completed === flag;
                }
                case 'is': {
                    const today = this.getCurrentDate();
                    if (value.toLowerCase() === 'overdue') return task => task.dueDate && task.dueDate < today && !task.completed;
                    if (value.toLowerCase() === 'today') return task => task.dueDate === today && !task.completed;
                    if (value.toLowerCase() === 'upcoming') return task => task.dueDate && task.dueDate > today && !task.completed;
                    if (value.toLowerCase() === 'completed') return task => !!task.completed;
                    return () => true;
                }
                case 'before': return task => task.dueDate && task.dueDate < value;
                case 'after': return task => task.dueDate && task.dueDate > value;
                case 'due': return task => task.dueDate === value;
                case 'created': {
                    const v = value.toLowerCase();
                    const today = this.getCurrentDate();
                    if (v === 'today') return task => task.createdDate === today;
                    if (v === 'yesterday') {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const y = `${yyyy}-${mm}-${dd}`;
                        return task => task.createdDate === y;
                    }
                    return task => task.createdDate === value;
                }
                case 'createdbefore': return task => task.createdDate && task.createdDate < value;
                case 'createdafter': return task => task.createdDate && task.createdDate > value;
                case 'text': {
                    const needle = value.toLowerCase();
                    return task => task.title.toLowerCase().includes(needle) || task.description.toLowerCase().includes(needle);
                }
                default: {
                    const needle = (m[0] || '').toLowerCase();
                    return task => JSON.stringify(task).toLowerCase().includes(needle);
                }
            }
        });
        return task => clauses.every(fn => fn(task));
    }

    // Get filtered and sorted tasks
    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Filter by search (supports advanced operators)
        if (this.currentSearch) {
            const predicate = this.parseQuery(this.currentSearch.trim());
            // For multiple tag: tokens (AND), parse again and pre-filter
            const tagTokens = this.currentSearch.match(/(^|\s)tag\s*:\s*("[^"]+"|'[^']+'|[^\s]+)/gi) || [];
            if (tagTokens.length > 1) {
                const required = tagTokens.map(t => {
                    const raw = t.split(':')[1].trim();
                    return raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '').toLowerCase();
                });
                filtered = filtered.filter(task => required.every(req => task.tags.map(x => x.toLowerCase()).includes(req)));
            }
            filtered = filtered.filter(predicate);
        }

        // Filter by active tag
        if (this.activeTag) {
            filtered = filtered.filter(task => task.tags.includes(this.activeTag));
        }

        // Filter by completion status
        if (!this.showCompleted) {
            filtered = filtered.filter(task => !task.completed);
        }

        // Filter by category
        const today = this.getCurrentDate();
        switch (this.currentFilter) {
            case 'today':
                filtered = filtered.filter(task => task.dueDate === today && !task.completed);
                break;
            case 'upcoming':
                filtered = filtered.filter(task => task.dueDate > today && !task.completed);
                break;
            case 'overdue':
                filtered = filtered.filter(task => task.dueDate && task.dueDate < today && !task.completed);
                break;
            case 'completed':
                filtered = filtered.filter(task => task.completed);
                break;
        }

        // Sort tasks
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'priority':
                    const priorityOrder = { 'High': 3, 'Med': 2, 'Low': 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'createdDate':
                default:
                    return new Date(b.createdDate) - new Date(a.createdDate);
            }
        });

        return filtered;
    }

    // Get all unique tags
    getAllTags() {
        const tags = new Set();
        this.tasks.forEach(task => {
            task.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }

    // Format date for display (local-safe)
    formatDate(dateString) {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-').map(Number);
        const date = new Date(y, (m - 1), d);
        const todayStr = this.getCurrentDate();
        const t = new Date();
        const tomorrowLocal = new Date(t.getFullYear(), t.getMonth(), t.getDate());
        tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
        const tomorrowStr = `${tomorrowLocal.getFullYear()}-${String(tomorrowLocal.getMonth() + 1).padStart(2, '0')}-${String(tomorrowLocal.getDate()).padStart(2, '0')}`;
        if (dateString === todayStr) return 'Today';
        if (dateString === tomorrowStr) return 'Tomorrow';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Get due date class
    getDueDateClass(dueDate) {
        if (!dueDate) return '';
        const today = this.getCurrentDate();
        if (dueDate < today) return 'overdue';
        if (dueDate === today) return 'today';
        return '';
    }

    // Toggle clear search button visibility
    toggleClearSearch() {
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.style.display = this.currentSearch ? 'inline-flex' : 'none';
        }
    }

    // Render task list
    render() {
        const filteredTasks = this.getFilteredTasks();
        const taskList = document.getElementById('taskList');
        
        if (!taskList) return;

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or add a new task.</p>
                </div>
            `;
        } else {
            taskList.innerHTML = filteredTasks.map(task => `
                <div class="task-item ${task.completed ? 'completed' : ''}">
                    <label class="checkbox-label task-checkbox">
                        <input type="checkbox" ${this.selectedTasks.has(task.id) ? 'checked' : ''} 
                               onchange="window.app.toggleTaskSelection('${task.id}', this.checked)">
                        <span class="checkbox-custom"></span>
                    </label>
                    
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                        
                        <div class="task-meta">
                            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="due-date">Created: ${this.escapeHtml(task.createdDate)} ${task.createdTime ? this.escapeHtml(task.createdTime) : ''}</span>
                            ${task.dueDate ? `<span class="due-date ${this.getDueDateClass(task.dueDate)}">${this.formatDate(task.dueDate)}</span>` : ''}
                        </div>
                        
                        ${task.tags.length > 0 ? `
                            <div class="task-tags">
                                ${task.tags.map(tag => `<span class=\"task-tag\">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}

                        ${task.subtasks && task.subtasks.length ? `
                            <ul class=\"subtasks-list\">${task.subtasks.map((st, idx) => {
                                const done = Array.isArray(task.subtasksDone) && task.subtasksDone[idx];
                                return `
                                <li class=\"subtask\">
                                    <label class=\"checkbox-label task-checkbox\">
                                        <input type=\"checkbox\" ${done ? 'checked' : ''} onchange=\"window.app.toggleSubtask('${task.id}', ${idx})\">
                                        <span class=\"checkbox-custom\"></span>
                                        <span class=\"subtask-text\">${this.escapeHtml(st)}</span>
                                    </label>
                                </li>`;}).join('')}
                            </ul>
                        ` : ''}
                    </div>
                    
                    <div class="task-actions">
                        <button class="task-action-btn complete" onclick="window.app.toggleTask('${task.id}')" title="Toggle completion">
                            ${task.completed ? '↶' : '✓'}
                        </button>
                        <button class="task-action-btn edit" onclick="window.app.editTask('${task.id}')" title="Edit task">
                            ✎
                        </button>
                        <button class="task-action-btn delete" onclick="window.app.deleteTask('${task.id}')" title="Delete task">
                            🗑
                        </button>
                    </div>
                </div>
            `).join('');
        }

        this.renderTags();
        this.updateStats();
    }

    // Render tags
    renderTags() {
        const tagSearchInput = document.getElementById('tagSearchInput');
        const q = tagSearchInput ? tagSearchInput.value.trim().toLowerCase() : '';
        let tags = this.getAllTags();
        if (q) tags = tags.filter(t => t.toLowerCase().includes(q));
        const tagsContainer = document.getElementById('tagsContainer');
        
        if (!tagsContainer) return;

        if (tags.length === 0) {
            tagsContainer.innerHTML = '<p style="color: var(--color-text-secondary); font-size: var(--font-size-xs);">No tags yet</p>';
        } else {
            const visible = tags.slice(0, 20);
            const overflow = tags.length - visible.length;
            tagsContainer.innerHTML = visible.map(tag => `
                <button class="tag-pill ${this.activeTag === tag ? 'active' : ''}" onclick="window.app.toggleTag('${tag}')">
                    ${this.escapeHtml(tag)}
                </button>
            `).join('') + (overflow > 0 ? `
                <button class="tag-pill" title="${overflow} more tags hidden">+${overflow}</button>
            ` : '');
        }
    }

    // Toggle tag filter
    toggleTag(tag) {
        this.activeTag = this.activeTag === tag ? null : tag;
        this.render();
    }

    // Update counts
    updateCounts() {
        const today = this.getCurrentDate();
        
        const counts = {
            all: this.tasks.length,
            today: this.tasks.filter(t => t.dueDate === today && !t.completed).length,
            upcoming: this.tasks.filter(t => t.dueDate > today && !t.completed).length,
            overdue: this.tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed).length,
            completed: this.tasks.filter(t => t.completed).length
        };

        Object.entries(counts).forEach(([key, count]) => {
            const element = document.getElementById(`${key}Count`);
            if (element) {
                element.textContent = count;
            }
        });
    }

    // Update stats in header
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const taskStats = document.getElementById('taskStats');
        if (taskStats) {
            taskStats.textContent = `${total} tasks, ${percentage}% complete`;
        }
    }

    // Show analytics
    showAnalytics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const overdue = this.tasks.filter(t => t.dueDate && t.dueDate < this.getCurrentDate() && !t.completed).length;
        const today = this.tasks.filter(t => t.dueDate === this.getCurrentDate() && !t.completed).length;
        const daysAgo = (n) => {
            const d = new Date();
            d.setDate(d.getDate() - n);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        const completed7d = this.tasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(7)).length;
        const completed30d = this.tasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(30)).length;
        const tagCounts = this.tasks.flatMap(t => t.tags).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1; return acc;
        }, {});
        const topTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);

        const elements = {
            completionRate: document.getElementById('completionRate'),
            overdueTasksCount: document.getElementById('overdueTasksCount'),
            todayTasksCount: document.getElementById('todayTasksCount'),
            totalTasksCount: document.getElementById('totalTasksCount'),
            completed7d: document.getElementById('completed7d'),
            completed30d: document.getElementById('completed30d'),
            topTags: document.getElementById('topTags')
        };

        if (elements.completionRate) elements.completionRate.textContent = `${completionRate}%`;
        if (elements.overdueTasksCount) elements.overdueTasksCount.textContent = overdue;
        if (elements.todayTasksCount) elements.todayTasksCount.textContent = today;
        if (elements.totalTasksCount) elements.totalTasksCount.textContent = total;
        if (elements.completed7d) elements.completed7d.textContent = completed7d;
        if (elements.completed30d) elements.completed30d.textContent = completed30d;
        if (elements.topTags) {
            elements.topTags.innerHTML = topTags.map(([tag, count]) => `<span class="task-tag">${this.escapeHtml(tag)} (${count})</span>`).join('');
        }

        this.showModal('analyticsModal');
    }

    // Export tasks
    exportTasks(showPrompt = false) {
        const data = {
            exportDate: new Date().toISOString(),
            tasks: this.tasks
        };
        
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            if (showPrompt && window.showSaveFilePicker) {
                // Chromium: let user pick location
                (async () => {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: `fancy-tasks-export-${this.getCurrentDate()}.json`,
                            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        alert('Exported successfully');
                    } catch (err) {
                        if (err && err.name !== 'AbortError') alert('Export failed: ' + err.message);
                    }
                })();
            } else {
                // Download (Firefox default behavior) — user can choose prompt behavior in browser settings
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fancy-tasks-export-${this.getCurrentDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            alert('Tasks exported successfully!');
        } catch (e) {
            console.error('Export error:', e);
            alert('Export failed. Please try again.');
        }
    }

    async createNewFile() {
        // Clears current tasks and lets user pick a new file location (Chromium) or starts a fresh in-memory set
        if (!confirm('Start fresh? This will clear current tasks (you can Export them first).')) return;
        this.tasks = [];
        this.selectedTasks.clear();
        this.currentSearch = '';
        this.activeTag = null;
        this.currentFilter = 'all';
        this.subtasks = [];
        this.fileHandle = null;
        this.lastFileModifiedMs = null;
        try { localStorage.setItem('fancyTasks', JSON.stringify(this.tasks)); } catch (_) {}
        this.render();
        this.updateCounts();
        this.updateSelectedCount();
        this.toggleClearSearch();
        this.updateFileStatus('Fresh');

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `fancy-tasks-${this.getCurrentDate()}.json`,
                    types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
                });
                this.fileHandle = handle;
                await this.persistToFile(false);
                this.updateFileStatus('New file created');
            } catch (err) {
                if (err && err.name !== 'AbortError') alert('New file creation failed: ' + err.message);
            }
        }
    }

    // Export Markdown for quick review/retros
    exportMarkdown() {
        const lines = [];
        lines.push(`# Fancy Tasks Export (${this.getCurrentDate()})`);
        const byTag = {};
        this.tasks.forEach(t => {
            const key = t.tags.length ? t.tags.join(', ') : 'untagged';
            byTag[key] = byTag[key] || [];
            byTag[key].push(t);
        });
        Object.keys(byTag).sort().forEach(tagKey => {
            lines.push(`\n## ${tagKey}`);
            byTag[tagKey].forEach(t => {
                const status = t.completed ? 'x' : ' ';
                const due = t.dueDate ? ` (due: ${t.dueDate})` : '';
                const pr = t.priority ? ` [${t.priority}]` : '';
                lines.push(`- [${status}] ${t.title}${pr}${due}`);
                if (t.description) lines.push(`  - notes: ${t.description.replace(/\n/g, ' ')}`);
                if (t.subtasks && t.subtasks.length) {
                    t.subtasks.forEach(st => lines.push(`  - sub: ${st}`));
                }
            });
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fancy-tasks-${this.getCurrentDate()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import tasks from JSON file
    importTasks(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                const tasks = Array.isArray(data) ? data : data.tasks;
                if (!Array.isArray(tasks)) throw new Error('Invalid format');
                this.tasks = tasks;
                this.saveData();
                this.render();
                this.updateCounts();
                alert('Import completed');
            } catch (err) {
                console.error('Import failed:', err);
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // File System Access API helpers
    async verifyPermission(fileHandle, readWrite = false) {
        if (!fileHandle) return false;
        try {
            const opts = { mode: readWrite ? 'readwrite' : 'read' };
            if (fileHandle.queryPermission && await fileHandle.queryPermission(opts) === 'granted') return true;
            if (fileHandle.requestPermission && await fileHandle.requestPermission(opts) === 'granted') return true;
        } catch (_) {}
        return true;
    }

    computePayloadString() {
        return JSON.stringify({
            exportDate: new Date().toISOString(),
            // optimistic concurrency token derived from last known modified time
            lastKnownModifiedMs: this.lastFileModifiedMs || null,
            tasks: this.tasks
        }, null, 2);
    }

    persistToFileDebounced() {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.persistToFile().catch(err => console.error('Auto-save failed:', err));
        }, 400);
    }

    async openFile() {
        if (!window.showOpenFilePicker) {
            alert('Your browser does not support opening files directly. Use Import instead.');
            return;
        }
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
            });
            this.fileHandle = handle;
            await this.verifyPermission(this.fileHandle, true);
            const file = await handle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            const tasks = Array.isArray(data) ? data : data.tasks;
            if (!Array.isArray(tasks)) throw new Error('Invalid format');
            this.tasks = tasks;
            this.lastFileModifiedMs = file.lastModified || Date.now();
            this.saveData();
            this.render();
            this.updateCounts();
            this.updateFileStatus();
            // Persist token for reopening on startup (Origin Private File System token)
            try {
                if (this.reopenOnStartup && handle && handle.kind === 'file') {
                    await this.setStoredHandle(handle);
                    localStorage.setItem('fancyTasks_lastFileName', handle.name);
                }
            } catch (_) {}
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('Open failed:', err);
            alert('Open failed: ' + err.message);
        }
    }

    async persistToFile(forceSaveAs = false) {
        if (!window.showSaveFilePicker) {
            // Firefox/Safari fallback: download file; if quickDownloadEnabled, use same filename hint
            const payload = this.computePayloadString();
            const blob = new Blob([payload], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const base = this.fileHandle && this.fileHandle.name ? this.fileHandle.name.replace(/\s+/g, '-') : `fancy-tasks-${this.getCurrentDate()}.json`;
            a.download = base;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.updateFileStatus('Downloaded');
            return;
        }
        try {
            let handle = this.fileHandle;
            if (!handle || forceSaveAs) {
                handle = await window.showSaveFilePicker({
                    suggestedName: `fancy-tasks-${this.getCurrentDate()}.json`,
                    types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
                });
            }
            await this.verifyPermission(handle, true);
            // Concurrency guard: check lastModified before write
            try {
                const curFile = await handle.getFile();
                const curMs = curFile.lastModified || 0;
                if (this.lastFileModifiedMs && curMs > this.lastFileModifiedMs) {
                    const proceed = confirm('The file has changed on disk since you opened it. Overwrite anyway?');
                    if (!proceed) { this.updateFileStatus('Save cancelled'); return; }
                }
            } catch (_) {}
            const writable = await handle.createWritable();
            const payload = this.computePayloadString();
            await writable.write(new Blob([payload], { type: 'application/json' }));
            await writable.close();
            this.fileHandle = handle;
            try {
                const file = await this.fileHandle.getFile();
                this.lastFileModifiedMs = file.lastModified || Date.now();
            } catch (_) {
                this.lastFileModifiedMs = Date.now();
            }
            this.updateFileStatus('Saved');
            // Update reopen flag
            try {
                if (this.reopenOnStartup && handle && handle.kind === 'file') {
                    await this.setStoredHandle(handle);
                    localStorage.setItem('fancyTasks_lastFileName', handle.name);
                }
            } catch (_) {}
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            console.error('Save failed:', err);
            alert('Save failed: ' + err.message);
        }
    }

    updateFileStatus(extra) {
        const el = document.getElementById('fileStatus');
        if (!el) return;
        if (this.fileHandle) {
            const name = this.fileHandle.name || 'Opened file';
            el.textContent = `${name}${extra ? ' • ' + extra : ''}${this.autoSave ? ' • Auto-save' : ''}`;
        } else {
            el.textContent = `No file open${extra ? ' • ' + extra : ''}`;
        }
    }

    async tryReopenLastFile() {
        try {
            if (!this.reopenOnStartup) return;
            if (!this.isFileSystemSupported) return;
            const handle = await this.getStoredHandle();
            if (!handle) {
                const lastName = localStorage.getItem('fancyTasks_lastFileName') || '';
                this.updateFileStatus(`Ready to reopen${lastName ? ' • ' + lastName : ''}`);
                return;
            }
            this.fileHandle = handle;
            await this.verifyPermission(this.fileHandle, true);
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            const tasks = Array.isArray(data) ? data : data.tasks;
            if (Array.isArray(tasks)) {
                this.tasks = tasks;
                this.lastFileModifiedMs = file.lastModified || Date.now();
                try { localStorage.setItem('fancyTasks', JSON.stringify(this.tasks)); } catch (_) {}
                this.render();
                this.updateCounts();
                this.updateFileStatus('Reopened');
            }
        } catch (_) {}
    }

    // Minimal IndexedDB helpers for storing FileSystemFileHandle (Chromium only)
    openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('fancyTasksDB', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async setStoredHandle(handle) {
        const db = await this.openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(handle, 'fileHandle');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }

    async getStoredHandle() {
        const db = await this.openDb();
        const value = await new Promise((resolve, reject) => {
            const tx = db.transaction('kv', 'readonly');
            const req = tx.objectStore('kv').get('fileHandle');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return value || null;
    }

    async deleteStoredHandle() {
        const db = await this.openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').delete('fileHandle');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }

    // Reset app
    resetApp() {
        if (confirm('Are you sure you want to reset all tasks? This will restore the original sample tasks.')) {
            this.loadSampleData();
            this.selectedTasks.clear();
            this.currentSearch = '';
            this.activeTag = null;
            this.currentFilter = 'all';
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }

            // Reset active navigation
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const allNavItem = document.querySelector('.nav-item[data-filter="all"]');
            if (allNavItem) {
                allNavItem.classList.add('active');
            }

            this.render();
            this.updateCounts();
            this.updateSelectedCount();
            this.toggleClearSearch();
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});