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
        
        // Advanced filter properties
        this.advancedFilters = {
            fromDate: null,
            toDate: null,
            priority: '',
            status: '',
            tags: [],
            createdDate: '',
            dueDate: '',
            customCreatedFrom: null,
            customCreatedTo: null
        };
        this.filterPresets = [];
        this.activePreset = null;
        this._filterDebounceTimer = null;
        
        // Analytics date range
        this.analyticsDateRange = {
            from: null,
            to: null
        };
        
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
        
        // Handle window resize to clean up modal-open class and update file support UI
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.body.classList.remove('modal-open');
                document.body.classList.remove('sidebar-open');
                this.enableBodyScroll();
            }
            // Update file support UI when switching between mobile/desktop
            this.setupFileSupportUI();
        });
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
        // Add task modal
        const openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
        if (openAddTaskModalBtn) {
            openAddTaskModalBtn.addEventListener('click', () => {
                this.showAddTaskModal();
            });
        }

        const closeAddTaskBtn = document.getElementById('closeAddTaskBtn');
        if (closeAddTaskBtn) {
            closeAddTaskBtn.addEventListener('click', () => {
                this.hideModal('addTaskModal');
                this.resetAddTaskForm();
            });
        }

        const cancelAddTaskBtn = document.getElementById('cancelAddTaskBtn');
        if (cancelAddTaskBtn) {
            cancelAddTaskBtn.addEventListener('click', () => {
                this.hideModal('addTaskModal');
                this.resetAddTaskForm();
            });
        }

        // Close add task modal on backdrop click
        const addTaskModal = document.getElementById('addTaskModal');
        if (addTaskModal) {
            addTaskModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideModal('addTaskModal');
                    this.resetAddTaskForm();
                }
            });
        }

        // Add task form
        const addTaskForm = document.getElementById('addTaskForm');
        if (addTaskForm) {
            console.log('Add task form found and event listener bound'); // Debug log
            addTaskForm.addEventListener('submit', (e) => {
                console.log('Form submit event triggered'); // Debug log
                e.preventDefault();
                this.addTask();
            });
        } else {
            console.error('Add task form not found!'); // Debug log
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

        // Tags modal
        const openTagsModalBtn = document.getElementById('openTagsModalBtn');
        if (openTagsModalBtn) {
            openTagsModalBtn.addEventListener('click', () => {
                this.showTagsModal();
            });
        }

        const closeTagsBtn = document.getElementById('closeTagsBtn');
        if (closeTagsBtn) {
            closeTagsBtn.addEventListener('click', () => {
                this.hideModal('tagsModal');
            });
        }

        // Close tags modal on backdrop click
        const tagsModal = document.getElementById('tagsModal');
        if (tagsModal) {
            tagsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideModal('tagsModal');
                }
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

        // Analytics modal - handle both mobile and desktop buttons
        const analyticsBtn = document.getElementById('analyticsBtn');
        const desktopAnalyticsBtn = document.getElementById('desktopAnalyticsBtn');
        
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', () => {
                this.showAnalytics();
            });
        }
        
        if (desktopAnalyticsBtn) {
            desktopAnalyticsBtn.addEventListener('click', () => {
                this.showAnalytics();
            });
        }
        
        // Analytics date range controls
        this.bindAnalyticsDateRangeEvents();

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

        // File Management Dropdown
        const fileDropdownToggle = document.getElementById('fileDropdownToggle');
        const fileDropdownMenu = document.getElementById('fileDropdownMenu');
        if (fileDropdownToggle && fileDropdownMenu) {
            fileDropdownToggle.addEventListener('click', () => {
                fileDropdownMenu.classList.toggle('show');
                fileDropdownToggle.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!fileDropdownToggle.contains(e.target) && !fileDropdownMenu.contains(e.target)) {
                    fileDropdownMenu.classList.remove('show');
                    fileDropdownToggle.classList.remove('active');
                }
            });
        }

        // File Management Actions
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

        // Advanced Filters
        this.bindAdvancedFilterEvents();

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
                e.preventDefault(); 
                this.showAddTaskModal();
            }
            // Open filters modal
            if ((e.key === 'f' || e.key === 'F') && !isInput) {
                e.preventDefault(); 
                this.showModal('filtersModal');
                // Focus on first filter input after modal opens
                setTimeout(() => {
                    const filterFromDate = document.getElementById('filterFromDate');
                    if (filterFromDate) filterFromDate.focus();
                }, 100);
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
        
        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;
        
        if (!this.isFileSystemSupported || isMobile) {
            // Hide Save/Save As for non-Chromium or mobile devices
            if (saveBtn) { saveBtn.style.display = 'none'; }
            if (saveAsBtn) { saveAsBtn.style.display = 'none'; }
            if (autoSaveToggle) { 
                autoSaveToggle.disabled = true; 
                autoSaveToggle.title = isMobile ? 'Auto-save not supported on mobile devices' : 'Auto-save not supported in this browser'; 
            }
            if (quickDlToggle) { quickDlToggle.parentElement.style.display = 'none'; }
            
            const status = document.getElementById('fileStatus');
            if (status) {
                if (isMobile) {
                    status.textContent = 'Mobile: Use Export/Import for data backup.';
                } else {
                    status.textContent = 'Firefox: using download-based saving. Consider Chrome for direct file editing.';
                }
            }
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
        console.log('addTask method called'); // Debug log
        
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
        
        console.log('Form validation passed, creating task...'); // Debug log

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
        console.log('Task added to array, total tasks:', this.tasks.length); // Debug log
        
        this.saveData();
        console.log('Data saved'); // Debug log
        
        this.render();
        console.log('Rendered'); // Debug log
        
        this.updateCounts();
        console.log('Counts updated'); // Debug log
        
        // Close modal and reset form
        console.log('Attempting to close modal...'); // Debug log
        this.hideModal('addTaskModal');
        console.log('Modal hidden'); // Debug log
        
        this.resetAddTaskForm();
        console.log('Form reset'); // Debug log
        
        // Show success message
        this.showTaskCreatedMessage();
        console.log('Success message shown'); // Debug log
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

    // Show add task modal
    showAddTaskModal() {
        this.showModal('addTaskModal');
        // Focus on title input
        setTimeout(() => {
            const titleInput = document.getElementById('taskTitle');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    // Reset add task form
    resetAddTaskForm() {
        const form = document.getElementById('addTaskForm');
        const subtasksContainer = document.getElementById('subtasksContainer');
        const subtasksCount = document.getElementById('subtasksCount');
        
        if (form) {
            form.reset();
        }
        
        if (subtasksContainer) {
            subtasksContainer.style.display = 'none';
            subtasksContainer.innerHTML = '';
        }
        
        if (subtasksCount) {
            subtasksCount.textContent = '0 subtasks';
        }
        
        this.subtasks = [];
    }

    // Show task created success message
    showTaskCreatedMessage() {
        // Create a temporary success message
        const message = document.createElement('div');
        message.className = 'task-created-message';
        message.innerHTML = `
            <div class="message-content">
                <span class="message-icon">✅</span>
                <span class="message-text">Task created successfully!</span>
            </div>
        `;
        
        document.body.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
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
            
            // Prevent body scrolling on mobile when modal is open
            if (window.innerWidth <= 768) {
                document.body.classList.add('modal-open');
                this.disableBodyScroll();
            }
            
            // Special handling for filters modal
            if (modalId === 'filtersModal') {
                this.updateCurrentFiltersDisplay();
            }
        }
    }

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            
            // Re-enable body scrolling on mobile when modal is closed
            if (window.innerWidth <= 768) {
                document.body.classList.remove('modal-open');
                this.enableBodyScroll();
            }
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
        
        // Update mobile select all checkbox
        const mobileSelectAllCheckbox = document.getElementById('mobileSelectAllCheckbox');
        if (mobileSelectAllCheckbox) {
            mobileSelectAllCheckbox.checked = checked;
        }
    }

    // Toggle task selection
    toggleTaskSelection(taskId, checked) {
        if (checked) {
            this.selectedTasks.add(taskId);
        } else {
            this.selectedTasks.delete(taskId);
        }
        this.updateSelectedCount();
        
        // Update task item classes to show/hide actions
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskItem) {
            if (checked) {
                taskItem.classList.add('selected');
            } else {
                taskItem.classList.remove('selected');
            }
        }
    }

    // Update selected count
    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        const mobileSelectedCount = document.getElementById('mobileSelectedCount');
        
        if (selectedCount) {
            selectedCount.textContent = `Selected ${this.selectedTasks.size}`;
        }
        
        if (mobileSelectedCount) {
            const count = this.selectedTasks.size;
            if (count > 0) {
                mobileSelectedCount.textContent = `${count} selected`;
                mobileSelectedCount.style.color = 'var(--color-primary)';
                mobileSelectedCount.style.fontWeight = 'var(--font-weight-medium)';
            } else {
                mobileSelectedCount.textContent = '0 selected';
                mobileSelectedCount.style.color = 'var(--color-text-secondary)';
                mobileSelectedCount.style.fontWeight = 'normal';
            }
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

        // Apply advanced filters
        filtered = this.applyAdvancedFilters(filtered);

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

    // Apply advanced filters to tasks
    applyAdvancedFilters(tasks) {
        let filtered = [...tasks];

        // Date range filter
        if (this.advancedFilters.fromDate) {
            filtered = filtered.filter(task => {
                const taskDate = task.dueDate || task.createdDate;
                return taskDate && taskDate >= this.advancedFilters.fromDate;
            });
        }

        if (this.advancedFilters.toDate) {
            filtered = filtered.filter(task => {
                const taskDate = task.dueDate || task.createdDate;
                return taskDate && taskDate <= this.advancedFilters.toDate;
            });
        }

        // Priority filter
        if (this.advancedFilters.priority) {
            filtered = filtered.filter(task => task.priority === this.advancedFilters.priority);
        }

        // Status filter
        if (this.advancedFilters.status) {
            const today = this.getCurrentDate();
            switch (this.advancedFilters.status) {
                case 'active':
                    filtered = filtered.filter(task => !task.completed);
                    break;
                case 'completed':
                    filtered = filtered.filter(task => task.completed);
                    break;
                case 'overdue':
                    filtered = filtered.filter(task => task.dueDate && task.dueDate < today && !task.completed);
                    break;
            }
        }

        // Tags filter
        if (this.advancedFilters.tags.length > 0) {
            filtered = filtered.filter(task => 
                this.advancedFilters.tags.every(tag => task.tags.includes(tag))
            );
        }

        // Created date filter
        if (this.advancedFilters.createdDate) {
            const today = this.getCurrentDate();
            const yesterday = this.getDateOffset(-1);
            const weekStart = this.getWeekStart();
            const monthStart = this.getMonthStart();

            switch (this.advancedFilters.createdDate) {
                case 'today':
                    filtered = filtered.filter(task => task.createdDate === today);
                    break;
                case 'yesterday':
                    filtered = filtered.filter(task => task.createdDate === yesterday);
                    break;
                case 'week':
                    filtered = filtered.filter(task => task.createdDate >= weekStart);
                    break;
                case 'month':
                    filtered = filtered.filter(task => task.createdDate >= monthStart);
                    break;
                case 'custom':
                    if (this.advancedFilters.customCreatedFrom) {
                        filtered = filtered.filter(task => 
                            task.createdDate >= this.advancedFilters.customCreatedFrom
                        );
                    }
                    if (this.advancedFilters.customCreatedTo) {
                        filtered = filtered.filter(task => 
                            task.createdDate <= this.advancedFilters.customCreatedTo
                        );
                    }
                    break;
            }
        }

        // Due date filter
        if (this.advancedFilters.dueDate) {
            const today = this.getCurrentDate();
            const tomorrow = this.getDateOffset(1);
            const weekEnd = this.getWeekEnd();

            switch (this.advancedFilters.dueDate) {
                case 'today':
                    filtered = filtered.filter(task => task.dueDate === today);
                    break;
                case 'tomorrow':
                    filtered = filtered.filter(task => task.dueDate === tomorrow);
                    break;
                case 'week':
                    filtered = filtered.filter(task => task.dueDate && task.dueDate <= weekEnd);
                    break;
                case 'overdue':
                    filtered = filtered.filter(task => task.dueDate && task.dueDate < today && !task.completed);
                    break;
                case 'no-due-date':
                    filtered = filtered.filter(task => !task.dueDate);
                    break;
            }
        }

        return filtered;
    }

    // Get date offset from today
    getDateOffset(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return this.formatDateForFilter(date);
    }

    // Get week start (Monday)
    getWeekStart() {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        return this.formatDateForFilter(date);
    }

    // Get week end (Sunday)
    getWeekEnd() {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? 0 : 7);
        date.setDate(diff);
        return this.formatDateForFilter(date);
    }

    // Get month start
    getMonthStart() {
        const date = new Date();
        date.setDate(1);
        return this.formatDateForFilter(date);
    }

    // Format date for filter (YYYY-MM-DD)
    formatDateForFilter(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
                <div class="task-item ${task.completed ? 'completed' : ''} ${this.selectedTasks.has(task.id) ? 'selected' : ''} ${task.subtasks && task.subtasks.length > 0 ? 'has-subtasks' : ''}" data-task-id="${task.id}">
                    <label class="checkbox-label task-checkbox">
                        <input type="checkbox" ${this.selectedTasks.has(task.id) ? 'checked' : ''} 
                               onchange="window.app.toggleTaskSelection('${task.id}', this.checked)">
                        <span class="checkbox-custom"></span>
                    </label>
                    
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        ${task.description ? this.renderTaskDescription(task.description, task.id) : ''}
                        
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
                            ${task.completed ? '↺' : '✓'}
                        </button>
                        <button class="task-action-btn edit" onclick="window.app.editTask('${task.id}')" title="Edit task">
                            ✏️
                        </button>
                        <button class="task-action-btn delete" onclick="window.app.deleteTask('${task.id}')" title="Delete task">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');
        }

        this.renderTags();
        this.updateStats();
        this.initMobileMenu();
    }

    // Initialize mobile menu functionality
    initMobileMenu() {
        // Prevent duplicate initialization
        if (this.mobileMenuInitialized) {
            return;
        }
        
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');

        console.log('Mobile menu elements:', { mobileMenuToggle, sidebar, mobileOverlay });

        if (mobileMenuToggle && sidebar && mobileOverlay) {
            // Toggle sidebar
            mobileMenuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile menu toggle clicked');
                
                // Force the classes to be applied
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    mobileOverlay.classList.remove('open');
                    // Re-enable body scrolling when sidebar is closed
                    document.body.classList.remove('sidebar-open');
                    this.enableBodyScroll();
                } else {
                    sidebar.classList.add('open');
                    mobileOverlay.classList.add('open');
                    // Prevent body scrolling when sidebar is open
                    document.body.classList.add('sidebar-open');
                    this.disableBodyScroll();
                }
                
                console.log('Sidebar classes after toggle:', sidebar.classList.toString());
                console.log('Overlay classes after toggle:', mobileOverlay.classList.toString());
            });

            // Close sidebar when clicking overlay
            mobileOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Overlay clicked - closing sidebar');
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('open');
                // Re-enable body scrolling when sidebar is closed
                document.body.classList.remove('sidebar-open');
                this.enableBodyScroll();
            });

            // Close sidebar when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                    mobileOverlay.classList.remove('open');
                }
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('open');
                    mobileOverlay.classList.remove('open');
                }
            });
            
            // Initialize mobile action buttons
            this.initMobileActionButtons();
            
            // Optimize search input for mobile
            this.optimizeSearchInputForMobile();
            
            // Mark as initialized
            this.mobileMenuInitialized = true;
            console.log('Mobile menu initialized successfully');
        } else {
            console.error('Mobile menu elements not found:', { mobileMenuToggle, sidebar, mobileOverlay });
        }
    }
    
    // Force close mobile menu (for debugging)
    forceCloseMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (mobileOverlay) {
            mobileOverlay.classList.remove('open');
        }
        
        console.log('Mobile menu force closed');
    }
    
    // Check mobile menu state (for debugging)
    checkMobileMenuState() {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        console.log('Mobile menu state:', {
            sidebar: sidebar ? sidebar.classList.toString() : 'not found',
            overlay: mobileOverlay ? mobileOverlay.classList.toString() : 'not found',
            toggle: mobileMenuToggle ? mobileMenuToggle.classList.toString() : 'not found',
            initialized: this.mobileMenuInitialized
        });
    }
    
    // Optimize search input for mobile devices
    optimizeSearchInputForMobile() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && window.innerWidth <= 768) {
            // Change placeholder to shorter text on mobile
            searchInput.placeholder = 'Search tasks...';
            
            // Add mobile-specific class for additional styling if needed
            searchInput.classList.add('mobile-search');
            
            // Also add mobile class to the wrapper for icon positioning
            const searchWrapper = searchInput.closest('.search-input-wrapper');
            if (searchWrapper) {
                searchWrapper.classList.add('mobile-search-wrapper');
            }
        }
    }
    
    // Toggle mobile bulk actions panel
    toggleMobileBulkPanel() {
        const bulkPanel = document.getElementById('mobileBulkPanel');
        if (bulkPanel) {
            const isVisible = bulkPanel.style.display !== 'none';
            bulkPanel.style.display = isVisible ? 'none' : 'block';
            
            // Update button text/icon to indicate state
            const bulkToggleBtn = document.getElementById('mobileBulkToggleBtn');
            if (bulkToggleBtn) {
                bulkToggleBtn.innerHTML = isVisible ? '☑️' : '✕';
                bulkToggleBtn.title = isVisible ? 'Bulk Actions' : 'Close Bulk Actions';
            }
        }
    }
    
    // Simple body scroll prevention for mobile
    disableBodyScroll() {
        // Just add the class - CSS handles the rest
        document.body.classList.add('no-scroll');
    }
    
    // Re-enable body scrolling
    enableBodyScroll() {
        document.body.classList.remove('no-scroll');
    }
    
    // Initialize mobile action buttons functionality
    initMobileActionButtons() {
        const mobileAddTaskBtn = document.getElementById('mobileAddTaskBtn');
        const mobileFiltersBtn = document.getElementById('mobileFiltersBtn');
        const mobileBulkToggleBtn = document.getElementById('mobileBulkToggleBtn');
        
        console.log('Mobile action button elements:', { mobileAddTaskBtn, mobileFiltersBtn, mobileBulkToggleBtn });
        
        if (mobileAddTaskBtn) {
            mobileAddTaskBtn.addEventListener('click', () => {
                console.log('Mobile add task button clicked');
                // Open add task modal
                const addTaskModal = document.getElementById('addTaskModal');
                if (addTaskModal) {
                    addTaskModal.classList.remove('hidden');
                }
            });
        }
        
        if (mobileFiltersBtn) {
            mobileFiltersBtn.addEventListener('click', () => {
                console.log('Mobile filters button clicked');
                // Open filters modal
                const filtersModal = document.getElementById('filtersModal');
                if (filtersModal) {
                    filtersModal.classList.remove('hidden');
                }
            });
        }
        
        if (mobileBulkToggleBtn) {
            mobileBulkToggleBtn.addEventListener('click', () => {
                console.log('Mobile bulk toggle button clicked');
                this.toggleMobileBulkPanel();
            });
        }
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
        
        const filteredTasks = this.getFilteredTasks();
        const filteredCount = filteredTasks.length;
        
        const taskStats = document.getElementById('taskStats');
        if (taskStats) {
            if (filteredCount === total) {
                taskStats.textContent = `${total} tasks, ${percentage}% complete`;
            } else {
                taskStats.textContent = `${filteredCount} of ${total} tasks, ${percentage}% complete`;
            }
        }
    }
    
    // Get tasks filtered by analytics date range
    getAnalyticsFilteredTasks() {
        let filteredTasks = this.tasks;
        
        if (this.analyticsDateRange.from || this.analyticsDateRange.to) {
            console.log('Filtering tasks by date range:', this.analyticsDateRange);
            console.log('Total tasks before filtering:', this.tasks.length);
            
            filteredTasks = this.tasks.filter(task => {
                const taskDate = task.createdDate;
                if (!taskDate) return false;
                
                // Convert dates to Date objects for proper comparison
                const taskDateObj = new Date(taskDate);
                const fromDateObj = this.analyticsDateRange.from ? new Date(this.analyticsDateRange.from) : null;
                const toDateObj = this.analyticsDateRange.to ? new Date(this.analyticsDateRange.to) : null;
                
                if (fromDateObj && taskDateObj < fromDateObj) {
                    return false;
                }
                
                if (toDateObj && taskDateObj > toDateObj) {
                    return false;
                }
                
                return true;
            });
            
            console.log('Tasks after filtering:', filteredTasks.length);
        }
        
        return filteredTasks;
    }

    // Show analytics
    showAnalytics() {
        // Initialize date range if not set
        if (!this.analyticsDateRange.from && !this.analyticsDateRange.to) {
            this.setDateRangePreset('30d');
        }
        
        const filteredTasks = this.getAnalyticsFilteredTasks();
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const overdue = filteredTasks.filter(t => t.dueDate && t.dueDate < this.getCurrentDate() && !t.completed).length;
        const today = filteredTasks.filter(t => t.dueDate === this.getCurrentDate() && !t.completed).length;
        const daysAgo = (n) => {
            const d = new Date();
            d.setDate(d.getDate() - n);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        const completed7d = filteredTasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(7)).length;
        const completed30d = filteredTasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(30)).length;

        // Update basic stats
        const elements = {
            completionRate: document.getElementById('completionRate'),
            overdueTasksCount: document.getElementById('overdueTasksCount'),
            todayTasksCount: document.getElementById('todayTasksCount'),
            totalTasksCount: document.getElementById('totalTasksCount'),
            completed7d: document.getElementById('completed7d'),
            completed30d: document.getElementById('completed30d')
        };

        if (elements.completionRate) elements.completionRate.textContent = `${completionRate}%`;
        if (elements.overdueTasksCount) elements.overdueTasksCount.textContent = overdue;
        if (elements.todayTasksCount) elements.todayTasksCount.textContent = today;
        if (elements.totalTasksCount) elements.totalTasksCount.textContent = total;
        if (elements.completed7d) elements.completed7d.textContent = completed7d;
        if (elements.completed30d) elements.completed30d.textContent = completed30d;

        // Update enhanced charts and analytics
        this.updatePriorityChart();
        this.updateTrendChart();
        this.updateTagsChart();
        this.updateProductivityMetrics();

        this.showModal('analyticsModal');
    }

    // Update priority distribution chart
    updatePriorityChart() {
        const filteredTasks = this.getAnalyticsFilteredTasks();
        const priorityCounts = {
            High: filteredTasks.filter(t => t.priority === 'High').length,
            Med: filteredTasks.filter(t => t.priority === 'Med').length,
            Low: filteredTasks.filter(t => t.priority === 'Low').length
        };

        const maxCount = Math.max(...Object.values(priorityCounts));
        const maxWidth = 100; // Maximum width percentage

        // Update High priority
        const priorityHighFill = document.getElementById('priorityHighFill');
        const priorityHighValue = document.getElementById('priorityHighValue');
        if (priorityHighFill && priorityHighValue) {
            const width = maxCount > 0 ? (priorityCounts.High / maxCount) * maxWidth : 0;
            priorityHighFill.style.width = `${width}%`;
            priorityHighValue.textContent = priorityCounts.High;
        }

        // Update Medium priority
        const priorityMedFill = document.getElementById('priorityMedFill');
        const priorityMedValue = document.getElementById('priorityMedValue');
        if (priorityMedFill && priorityMedValue) {
            const width = maxCount > 0 ? (priorityCounts.Med / maxCount) * maxWidth : 0;
            priorityMedFill.style.width = `${width}%`;
            priorityMedValue.textContent = priorityCounts.Med;
        }

        // Update Low priority
        const priorityLowFill = document.getElementById('priorityLowFill');
        const priorityLowValue = document.getElementById('priorityLowValue');
        if (priorityLowFill && priorityLowValue) {
            const width = maxCount > 0 ? (priorityCounts.Low / maxCount) * maxWidth : 0;
            priorityLowFill.style.width = `${width}%`;
            priorityLowValue.textContent = priorityCounts.Low;
        }
    }

    // Update completion trend chart
    updateTrendChart() {
        const trendChartBars = document.getElementById('trendChartBars');
        const trendChartLabels = document.getElementById('trendChartLabels');
        
        if (!trendChartBars || !trendChartLabels) return;

        const days = 30;
        const trendData = [];
        const labels = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDateForFilter(date);
            
            const filteredTasks = this.getAnalyticsFilteredTasks();
            const completedCount = filteredTasks.filter(t => 
                t.completed && t.completedDate === dateStr
            ).length;
            
            trendData.push(completedCount);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }

        const maxCompleted = Math.max(...trendData, 1);
        const maxHeight = 140; // Maximum height in pixels

        // Generate trend bars
        trendChartBars.innerHTML = trendData.map(count => {
            const height = (count / maxCompleted) * maxHeight;
            return `<div class="trend-bar" style="height: ${height}px;" title="${count} tasks completed"></div>`;
        }).join('');

        // Generate labels
        trendChartLabels.innerHTML = labels.map((label, index) => {
            if (index % 7 === 0) { // Show label every 7 days
                return `<span>${label}</span>`;
            }
            return '<span></span>';
        }).join('');
    }

    // Update tags usage chart
    updateTagsChart() {
        const tagsChartItems = document.getElementById('tagsChartItems');
        if (!tagsChartItems) return;

        const filteredTasks = this.getAnalyticsFilteredTasks();
        const tagCounts = filteredTasks.flatMap(t => t.tags).reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {});

        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        if (topTags.length === 0) {
            tagsChartItems.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center;">No tags used yet</p>';
            return;
        }

        const maxCount = Math.max(...topTags.map(([_, count]) => count));
        const maxWidth = 100; // Maximum width percentage

        tagsChartItems.innerHTML = topTags.map(([tag, count]) => {
            const width = maxCount > 0 ? (count / maxCount) * maxWidth : 0;
            return `
                <div class="tag-chart-item">
                    <div class="tag-chart-name">${this.escapeHtml(tag)}</div>
                    <div class="tag-chart-bar">
                        <div class="tag-chart-fill" style="width: ${width}%"></div>
                    </div>
                    <div class="tag-chart-count">${count}</div>
                </div>
            `;
        }).join('');
    }

    // Update productivity metrics
    updateProductivityMetrics() {
        // Average tasks per day
        const avgTasksPerDay = document.getElementById('avgTasksPerDay');
        if (avgTasksPerDay) {
            const totalDays = this.getDaysSinceFirstTask();
            const filteredTasks = this.getAnalyticsFilteredTasks();
            const avg = totalDays > 0 ? (filteredTasks.length / totalDays).toFixed(1) : '0';
            avgTasksPerDay.textContent = avg;
        }

        // Completion streak
        const completionStreak = document.getElementById('completionStreak');
        if (completionStreak) {
            const streak = this.getCompletionStreak();
            completionStreak.textContent = `${streak} days`;
        }

        // Busiest day
        const busiestDay = document.getElementById('busiestDay');
        if (busiestDay) {
            const busiest = this.getBusiestDay();
            busiestDay.textContent = busiest;
        }

        // Most productive time
        const mostProductiveTime = document.getElementById('mostProductiveTime');
        if (mostProductiveTime) {
            const time = this.getMostProductiveTime();
            mostProductiveTime.textContent = time;
        }
    }

    // Helper methods for productivity metrics
    getDaysSinceFirstTask() {
        const filteredTasks = this.getAnalyticsFilteredTasks();
        if (filteredTasks.length === 0) return 0;
        
        const firstTask = filteredTasks.reduce((earliest, task) => {
            return task.createdDate < earliest.createdDate ? task : earliest;
        });
        
        const firstDate = new Date(firstTask.createdDate);
        const today = new Date();
        const diffTime = Math.abs(today - firstDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getCompletionStreak() {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDateForFilter(date);
            
            const filteredTasks = this.getAnalyticsFilteredTasks();
            const completedCount = filteredTasks.filter(t => 
                t.completed && t.completedDate === dateStr
            ).length;
            
            if (completedCount > 0) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    getBusiestDay() {
        const filteredTasks = this.getAnalyticsFilteredTasks();
        const dayCounts = {};
        
        filteredTasks.forEach(task => {
            if (task.createdDate) {
                const date = new Date(task.createdDate);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
            }
        });
        
        if (Object.keys(dayCounts).length === 0) return 'None';
        
        const busiestDay = Object.entries(dayCounts).reduce((a, b) => 
            dayCounts[a[0]] > dayCounts[b[0]] ? a : b
        );
        
        return busiestDay[0];
    }

    getMostProductiveTime() {
        // This is a placeholder - you could implement time-based analysis
        // For now, return a default value
        return 'N/A';
    }

    // Show tags management modal
    showTagsModal() {
        this.renderTagsModal();
        this.showModal('tagsModal');
        
        // Bind tags modal events
        this.bindTagsModalEvents();
    }

    // Render tags modal content
    renderTagsModal() {
        const tagsModalList = document.getElementById('tagsModalList');
        const tagsCount = document.getElementById('tagsCount');
        
        if (!tagsModalList || !tagsCount) return;

        const allTags = this.getAllTags();
        const tagCounts = this.getTagCounts();
        
        tagsCount.textContent = `${allTags.length} tags`;

        if (allTags.length === 0) {
            tagsModalList.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: var(--space-20);">No tags created yet</p>';
            return;
        }

        tagsModalList.innerHTML = allTags.map(tag => {
            const count = tagCounts[tag] || 0;
            const isUsed = count > 0;
            return `
                <div class="tag-list-item" data-tag="${this.escapeHtml(tag)}">
                    <input type="checkbox" class="tag-list-checkbox" id="tag-${this.escapeHtml(tag)}">
                    <div class="tag-list-color" style="background-color: var(--color-primary);"></div>
                    <div class="tag-list-name">${this.escapeHtml(tag)}</div>
                    <div class="tag-list-count">${count}</div>
                    <div class="tag-list-actions">
                        <button class="tag-action-btn edit" title="Edit tag" onclick="window.app.editTag('${this.escapeHtml(tag)}')">✎</button>
                        <button class="tag-action-btn delete" title="Delete tag" onclick="window.app.deleteTag('${this.escapeHtml(tag)}')">🗑</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get tag counts
    getTagCounts() {
        const counts = {};
        this.tasks.forEach(task => {
            task.tags.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return counts;
    }

    // Bind tags modal events
    bindTagsModalEvents() {
        // Tag search
        const tagsModalSearchInput = document.getElementById('tagsModalSearchInput');
        if (tagsModalSearchInput) {
            tagsModalSearchInput.addEventListener('input', (e) => {
                this.filterTagsInModal(e.target.value);
            });
        }

        // Filter options
        const showUnusedTags = document.getElementById('showUnusedTags');
        const showUsedTags = document.getElementById('showUsedTags');
        
        if (showUnusedTags) {
            showUnusedTags.addEventListener('change', () => {
                this.applyTagFilters();
            });
        }
        
        if (showUsedTags) {
            showUsedTags.addEventListener('change', () => {
                this.applyTagFilters();
            });
        }

        // Add new tag
        const addNewTagBtn = document.getElementById('addNewTagBtn');
        if (addNewTagBtn) {
            addNewTagBtn.addEventListener('click', () => {
                this.showAddTagForm();
            });
        }

        // Save tag
        const saveTagBtn = document.getElementById('saveTagBtn');
        if (saveTagBtn) {
            saveTagBtn.addEventListener('click', () => {
                this.saveNewTag();
            });
        }

        // Cancel tag
        const cancelTagBtn = document.getElementById('cancelTagBtn');
        if (cancelTagBtn) {
            cancelTagBtn.addEventListener('click', () => {
                this.hideAddTagForm();
            });
        }

        // Bulk delete
        const bulkDeleteTagsBtn = document.getElementById('bulkDeleteTagsBtn');
        if (bulkDeleteTagsBtn) {
            bulkDeleteTagsBtn.addEventListener('click', () => {
                this.bulkDeleteTags();
            });
        }
    }

    // Filter tags in modal
    filterTagsInModal(searchTerm) {
        const tagItems = document.querySelectorAll('.tag-list-item');
        const searchLower = searchTerm.toLowerCase();

        tagItems.forEach(item => {
            const tagName = item.querySelector('.tag-list-name').textContent.toLowerCase();
            if (tagName.includes(searchLower)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Apply tag filters
    applyTagFilters() {
        const showUnused = document.getElementById('showUnusedTags')?.checked;
        const showUsed = document.getElementById('showUsedTags')?.checked;
        const tagItems = document.querySelectorAll('.tag-list-item');

        tagItems.forEach(item => {
            const count = parseInt(item.querySelector('.tag-list-count').textContent);
            const isUsed = count > 0;

            if ((isUsed && showUsed) || (!isUsed && showUnused)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Show add tag form
    showAddTagForm() {
        const addTagForm = document.getElementById('addTagForm');
        if (addTagForm) {
            addTagForm.style.display = 'block';
        }
    }

    // Hide add tag form
    hideAddTagForm() {
        const addTagForm = document.getElementById('addTagForm');
        if (addTagForm) {
            addTagForm.style.display = 'none';
            
            // Clear form
            const newTagName = document.getElementById('newTagName');
            if (newTagName) newTagName.value = '';
        }
    }

    // Save new tag
    saveNewTag() {
        const newTagName = document.getElementById('newTagName');
        if (!newTagName || !newTagName.value.trim()) return;

        const tagName = newTagName.value.trim();
        
        // Check if tag already exists
        if (this.getAllTags().includes(tagName)) {
            alert('Tag already exists!');
            return;
        }

        // Add tag to all tasks (optional - you could make this configurable)
        // For now, just create the tag without assigning it to tasks
        
        this.hideAddTagForm();
        this.renderTagsModal();
        this.renderTags(); // Update sidebar tags
    }

    // Edit tag
    editTag(tagName) {
        // This could open an edit form or allow inline editing
        // For now, just show an alert
        alert(`Edit functionality for tag "${tagName}" would go here.`);
    }

    // Delete tag
    deleteTag(tagName) {
        if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from all tasks.`)) {
            return;
        }

        // Remove tag from all tasks
        this.tasks.forEach(task => {
            task.tags = task.tags.filter(tag => tag !== tagName);
        });

        // Save and update
        this.saveData();
        this.render();
        this.renderTags();
        this.renderTagsModal();
    }

    // Bulk delete selected tags
    bulkDeleteTags() {
        const selectedTags = Array.from(document.querySelectorAll('.tag-list-checkbox:checked'))
            .map(checkbox => checkbox.closest('.tag-list-item').dataset.tag);

        if (selectedTags.length === 0) {
            alert('Please select tags to delete.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedTags.length} tags? This will remove them from all tasks.`)) {
            return;
        }

        // Remove selected tags from all tasks
        selectedTags.forEach(tagName => {
            this.tasks.forEach(task => {
                task.tags = task.tags.filter(tag => tag !== tagName);
            });
        });

        // Save and update
        this.saveData();
        this.render();
        this.renderTags();
        this.renderTagsModal();
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

    // Bind analytics date range events
    bindAnalyticsDateRangeEvents() {
        // Date range inputs
        const fromDateInput = document.getElementById('analyticsFromDate');
        const toDateInput = document.getElementById('analyticsToDate');
        
        if (fromDateInput && toDateInput) {
            fromDateInput.addEventListener('change', () => {
                console.log('From date changed to:', fromDateInput.value);
                this.analyticsDateRange.from = fromDateInput.value;
                this.updateAnalyticsForDateRange();
            });
            
            toDateInput.addEventListener('change', () => {
                console.log('To date changed to:', toDateInput.value);
                this.analyticsDateRange.to = toDateInput.value;
                this.updateAnalyticsForDateRange();
            });
        }
        
        // Date range preset buttons
        const presetButtons = document.querySelectorAll('.date-range-presets .btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Preset button clicked:', btn.dataset.range);
                this.setDateRangePreset(btn.dataset.range);
            });
        });
    }
    
    // Set date range preset
    setDateRangePreset(range) {
        const fromDateInput = document.getElementById('analyticsFromDate');
        const toDateInput = document.getElementById('analyticsToDate');
        
        if (!fromDateInput || !toDateInput) return;
        
        const today = new Date();
        let fromDate = new Date();
        
        // Remove active class from all buttons
        document.querySelectorAll('.date-range-presets .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        const clickedBtn = document.querySelector(`[data-range="${range}"]`);
        if (clickedBtn) {
            clickedBtn.classList.add('active');
        }
        
        switch (range) {
            case '7d':
                fromDate.setDate(today.getDate() - 7);
                break;
            case '30d':
                fromDate.setDate(today.getDate() - 30);
                break;
            case '90d':
                fromDate.setDate(today.getDate() - 90);
                break;
            case '1y':
                fromDate.setFullYear(today.getFullYear() - 1);
                break;
            case 'all':
                fromDate = null;
                break;
        }
        
        if (fromDate) {
            fromDateInput.value = this.formatDateForInput(fromDate);
            this.analyticsDateRange.from = fromDateInput.value;
        } else {
            fromDateInput.value = '';
            this.analyticsDateRange.from = null;
        }
        
        toDateInput.value = this.formatDateForInput(today);
        this.analyticsDateRange.to = toDateInput.value;
        
        console.log('Date range preset set:', range, 'From:', this.analyticsDateRange.from, 'To:', this.analyticsDateRange.to);
        this.updateAnalyticsForDateRange();
    }
    
    // Format date for input field
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Update analytics for current date range
    updateAnalyticsForDateRange() {
        console.log('Updating analytics for date range:', this.analyticsDateRange);
        // Update basic stats in analytics modal
        this.updateAnalyticsStats();
        this.updatePriorityChart();
        this.updateTrendChart();
        this.updateTagsChart();
        this.updateProductivityMetrics();
    }
    
    // Update basic stats in analytics modal
    updateAnalyticsStats() {
        const filteredTasks = this.getAnalyticsFilteredTasks();
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const overdue = filteredTasks.filter(t => t.dueDate && t.dueDate < this.getCurrentDate() && !t.completed).length;
        const today = filteredTasks.filter(t => t.dueDate === this.getCurrentDate() && !t.completed).length;
        
        const daysAgo = (n) => {
            const d = new Date();
            d.setDate(d.getDate() - n);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        
        const completed7d = filteredTasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(7)).length;
        const completed30d = filteredTasks.filter(t => t.completed && t.completedDate && t.completedDate >= daysAgo(30)).length;

        console.log('Updating analytics stats:', {
            total,
            completed,
            completionRate,
            overdue,
            today,
            completed7d,
            completed30d
        });

        // Update basic stats elements
        const elements = {
            completionRate: document.getElementById('completionRate'),
            overdueTasksCount: document.getElementById('overdueTasksCount'),
            todayTasksCount: document.getElementById('todayTasksCount'),
            totalTasksCount: document.getElementById('totalTasksCount'),
            completed7d: document.getElementById('completed7d'),
            completed30d: document.getElementById('completed30d')
        };

        if (elements.completionRate) elements.completionRate.textContent = `${completionRate}%`;
        if (elements.overdueTasksCount) elements.overdueTasksCount.textContent = overdue;
        if (elements.totalTasksCount) elements.totalTasksCount.textContent = total;
        if (elements.todayTasksCount) elements.todayTasksCount.textContent = today;
        if (elements.completed7d) elements.completed7d.textContent = completed7d;
        if (elements.completed30d) elements.completed30d.textContent = completed30d;
    }

    // Bind advanced filter events
    bindAdvancedFilterEvents() {
        // Open filters modal
        const openFiltersBtn = document.getElementById('openFiltersBtn');
        if (openFiltersBtn) {
            openFiltersBtn.addEventListener('click', () => {
                this.showModal('filtersModal');
            });
        }

        // Close filters modal
        const closeFiltersBtn = document.getElementById('closeFiltersBtn');
        if (closeFiltersBtn) {
            closeFiltersBtn.addEventListener('click', () => {
                this.hideModal('filtersModal');
            });
        }

        // Close modal on backdrop click
        const filtersModal = document.getElementById('filtersModal');
        if (filtersModal) {
            filtersModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideModal('filtersModal');
                }
            });
        }

        // Date range filters
        const filterFromDate = document.getElementById('filterFromDate');
        const filterToDate = document.getElementById('filterToDate');
        if (filterFromDate) {
            filterFromDate.addEventListener('change', (e) => {
                this.advancedFilters.fromDate = e.target.value || null;
                this.debouncedApplyFilters();
            });
        }
        if (filterToDate) {
            filterToDate.addEventListener('change', (e) => {
                this.advancedFilters.toDate = e.target.value || null;
                this.debouncedApplyFilters();
            });
        }

        // Priority filter
        const filterPriority = document.getElementById('filterPriority');
        if (filterPriority) {
            filterPriority.addEventListener('change', (e) => {
                this.advancedFilters.priority = e.target.value;
                this.debouncedApplyFilters();
            });
        }

        // Status filter
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.advancedFilters.status = e.target.value;
                this.debouncedApplyFilters();
            });
        }

        // Tags filter
        const filterTags = document.getElementById('filterTags');
        if (filterTags) {
            filterTags.addEventListener('input', (e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                this.advancedFilters.tags = tags;
                this.showTagSuggestions(e.target.value);
                this.debouncedApplyFilters();
            });
        }

        // Created date filter
        const filterCreatedDate = document.getElementById('filterCreatedDate');
        if (filterCreatedDate) {
            filterCreatedDate.addEventListener('change', (e) => {
                this.advancedFilters.createdDate = e.target.value;
                this.handleCreatedDateFilterChange(e.target.value);
                this.debouncedApplyFilters();
            });
        }

        // Due date filter
        const filterDueDate = document.getElementById('filterDueDate');
        if (filterDueDate) {
            filterDueDate.addEventListener('change', (e) => {
                this.advancedFilters.dueDate = e.target.value;
                this.debouncedApplyFilters();
            });
        }

        // Filter action buttons
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        const saveFiltersBtn = document.getElementById('saveFiltersBtn');
        if (saveFiltersBtn) {
            saveFiltersBtn.addEventListener('click', () => {
                this.saveFilterPreset();
            });
        }

        // Load saved presets
        this.loadFilterPresets();
        this.renderFilterPresets();
        
        // Initialize filter form with defaults
        this.initializeFilterForm();
        
        // Initialize mobile bulk action buttons
        this.initMobileBulkActions();
    }
    
    // Toggle mobile bulk actions visibility (legacy method - now calls new method)
    toggleMobileBulkActions() {
        this.toggleMobileBulkPanel();
    }
    
    // Initialize mobile bulk action buttons
    initMobileBulkActions() {
        const mobileMarkDoneBtn = document.getElementById('mobileMarkDoneBtn');
        const mobileDeleteSelectedBtn = document.getElementById('mobileDeleteSelectedBtn');
        const mobileSelectAllCheckbox = document.getElementById('mobileSelectAllCheckbox');
        
        if (mobileMarkDoneBtn) {
            mobileMarkDoneBtn.addEventListener('click', () => {
                this.markSelectedDone();
            });
        }
        
        if (mobileDeleteSelectedBtn) {
            mobileDeleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelected();
            });
        }
        
        if (mobileSelectAllCheckbox) {
            mobileSelectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }
    }

    // Show tag suggestions
    showTagSuggestions(inputValue) {
        const suggestionsContainer = document.getElementById('tagSuggestions');
        if (!suggestionsContainer) return;

        const input = inputValue.toLowerCase();
        if (!input) {
            suggestionsContainer.classList.remove('show');
            return;
        }

        const allTags = this.getAllTags();
        const matchingTags = allTags.filter(tag => 
            tag.toLowerCase().includes(input) && 
            !this.advancedFilters.tags.includes(tag)
        );

        if (matchingTags.length === 0) {
            suggestionsContainer.classList.remove('show');
            return;
        }

        suggestionsContainer.innerHTML = matchingTags.map(tag => 
            `<div class="tag-suggestion-item" onclick="window.app.selectTagSuggestion('${tag}')">${this.escapeHtml(tag)}</div>`
        ).join('');
        suggestionsContainer.classList.add('show');
    }

    // Select tag suggestion
    selectTagSuggestion(tag) {
        const filterTags = document.getElementById('filterTags');
        const suggestionsContainer = document.getElementById('tagSuggestions');
        
        if (filterTags) {
            const currentTags = filterTags.value.split(',').map(t => t.trim()).filter(t => t);
            if (!currentTags.includes(tag)) {
                currentTags.push(tag);
                filterTags.value = currentTags.join(', ');
                this.advancedFilters.tags = currentTags;
            }
        }
        
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('show');
        }
    }

    // Handle created date filter change
    handleCreatedDateFilterChange(value) {
        if (value === 'custom') {
            // Show custom date inputs (you can implement this if needed)
            console.log('Custom date range selected');
        }
    }

    // Apply all filters
    applyFilters() {
        this.render();
        this.updateCounts();
        this.showFilterStatus();
        this.showFilterSummary();
        this.updateCurrentFiltersDisplay();
    }
    
    // Update current filters display
    updateCurrentFiltersDisplay() {
        const currentFiltersList = document.getElementById('currentFiltersList');
        if (!currentFiltersList) return;
        
        const activeFilters = [];
        
        // Check date range filters
        if (this.advancedFilters.fromDate || this.advancedFilters.toDate) {
            const dateRange = `${this.advancedFilters.fromDate || 'Any'} to ${this.advancedFilters.toDate || 'Any'}`;
            activeFilters.push({
                type: 'Date Range',
                value: dateRange,
                id: 'dateRange'
            });
        }
        
        // Check priority filter
        if (this.advancedFilters.priority) {
            activeFilters.push({
                type: 'Priority',
                value: this.advancedFilters.priority,
                id: 'priority'
            });
        }
        
        // Check status filter
        if (this.advancedFilters.status) {
            activeFilters.push({
                type: 'Status',
                value: this.advancedFilters.status,
                id: 'status'
            });
        }
        
        // Check tags filter
        if (this.advancedFilters.tags && this.advancedFilters.tags.length > 0) {
            this.advancedFilters.tags.forEach(tag => {
                activeFilters.push({
                    type: 'Tag',
                    value: tag,
                    id: `tag-${tag}`
                });
            });
        }
        
        // Check created date filter
        if (this.advancedFilters.createdDate && this.advancedFilters.createdDate !== '') {
            activeFilters.push({
                type: 'Created',
                value: this.advancedFilters.createdDate,
                id: 'createdDate'
            });
        }
        
        // Check due date filter
        if (this.advancedFilters.dueDate && this.advancedFilters.dueDate !== '') {
            activeFilters.push({
                type: 'Due Date',
                value: this.advancedFilters.dueDate,
                id: 'dueDate'
            });
        }
        
        if (activeFilters.length === 0) {
            currentFiltersList.innerHTML = '<p class="no-filters-message">No filters currently applied</p>';
        } else {
            currentFiltersList.innerHTML = activeFilters.map(filter => `
                <div class="current-filter-item">
                    <span>${filter.type}: ${filter.value}</span>
                    <button class="remove-filter" onclick="window.app.removeFilter('${filter.id}')" title="Remove filter">×</button>
                </div>
            `).join('');
        }
        
        // Also update the filter summary
        this.showFilterSummary();
    }
    
    // Remove individual filter
    removeFilter(filterId) {
        if (filterId === 'dateRange') {
            this.advancedFilters.fromDate = '';
            this.advancedFilters.toDate = '';
        } else if (filterId === 'priority') {
            this.advancedFilters.priority = '';
        } else if (filterId === 'createdDate') {
            this.advancedFilters.createdDate = '';
        } else if (filterId === 'dueDate') {
            this.advancedFilters.dueDate = '';
        } else if (filterId.startsWith('tag-')) {
            const tagToRemove = filterId.replace('tag-', '');
            this.advancedFilters.tags = this.advancedFilters.tags.filter(tag => tag !== tagToRemove);
        }
        
        // Update the form inputs and display
        this.updateFilterFormInputs();
        this.updateCurrentFiltersDisplay();
        this.applyFilters();
    }

    // Debounced version of applyFilters for better performance
    debouncedApplyFilters() {
        if (this._filterDebounceTimer) {
            clearTimeout(this._filterDebounceTimer);
        }
        this._filterDebounceTimer = setTimeout(() => {
            this.applyFilters();
        }, 300); // 300ms delay
    }

    // Clear all filters
    clearAllFilters() {
        this.advancedFilters = {
            fromDate: null,
            toDate: null,
            priority: '',
            status: '',
            tags: [],
            createdDate: '',
            dueDate: '',
            customCreatedFrom: null,
            customCreatedTo: null
        };

        // Reset form inputs
        const filterFromDate = document.getElementById('filterFromDate');
        const filterToDate = document.getElementById('filterToDate');
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const filterTags = document.getElementById('filterTags');
        const filterCreatedDate = document.getElementById('filterCreatedDate');
        const filterDueDate = document.getElementById('filterDueDate');

        if (filterFromDate) filterFromDate.value = '';
        if (filterToDate) filterToDate.value = '';
        if (filterPriority) filterPriority.value = '';
        if (filterStatus) filterStatus.value = '';
        if (filterTags) filterTags.value = '';
        if (filterCreatedDate) filterCreatedDate.value = '';
        if (filterDueDate) filterDueDate.value = '';

        this.render();
        this.updateCounts();
        this.hideFilterStatus();
        this.hideFilterSummary();
        
        // Update the current filters display to show "No filters currently applied"
        this.updateCurrentFiltersDisplay();
    }

    // Show filter status
    showFilterStatus() {
        const openFiltersBtn = document.getElementById('openFiltersBtn');
        const filterCountBadge = document.getElementById('filterCountBadge');
        
        if (!openFiltersBtn || !filterCountBadge) return;

        const activeFilters = this.getActiveFiltersCount();
        if (activeFilters > 0) {
            filterCountBadge.textContent = activeFilters;
            filterCountBadge.style.display = 'inline-block';
            openFiltersBtn.classList.add('has-active-filters');
        } else {
            filterCountBadge.style.display = 'none';
            openFiltersBtn.classList.remove('has-active-filters');
        }
    }

    // Hide filter status
    hideFilterStatus() {
        const filterCountBadge = document.getElementById('filterCountBadge');
        const openFiltersBtn = document.getElementById('openFiltersBtn');
        
        if (filterCountBadge) {
            filterCountBadge.style.display = 'none';
        }
        if (openFiltersBtn) {
            openFiltersBtn.classList.remove('has-active-filters');
        }
    }

    // Hide filter summary
    hideFilterSummary() {
        const summaryElement = document.querySelector('#filtersModal .filter-summary');
        if (summaryElement) {
            summaryElement.remove();
        }
    }

    // Get count of active filters
    getActiveFiltersCount() {
        let count = 0;
        if (this.advancedFilters.fromDate) count++;
        if (this.advancedFilters.toDate) count++;
        if (this.advancedFilters.priority) count++;
        if (this.advancedFilters.status) count++;
        if (this.advancedFilters.tags.length > 0) count++;
        if (this.advancedFilters.createdDate) count++;
        if (this.advancedFilters.dueDate) count++;
        return count;
    }

    // Save filter preset
    saveFilterPreset() {
        const name = prompt('Enter a name for this filter preset:');
        if (!name) return;

        const preset = {
            id: Date.now().toString(),
            name: name,
            filters: { ...this.advancedFilters }
        };

        this.filterPresets.push(preset);
        this.saveFilterPresets();
        this.renderFilterPresets();
    }

    // Load filter presets
    loadFilterPresets() {
        const stored = localStorage.getItem('fancyTasks_filterPresets');
        if (stored) {
            try {
                this.filterPresets = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing filter presets:', e);
                this.filterPresets = [];
            }
        }
    }

    // Save filter presets to localStorage
    saveFilterPresets() {
        try {
            localStorage.setItem('fancyTasks_filterPresets', JSON.stringify(this.filterPresets));
        } catch (e) {
            console.error('Error saving filter presets:', e);
        }
    }

    // Render filter presets
    renderFilterPresets() {
        const presetsList = document.getElementById('presetsList');
        if (!presetsList) return;

        if (this.filterPresets.length === 0) {
            presetsList.innerHTML = '<p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">No saved presets</p>';
            return;
        }

        presetsList.innerHTML = this.filterPresets.map(preset => `
            <div class="preset-tag ${this.activePreset === preset.id ? 'active' : ''}" 
                 onclick="window.app.loadFilterPreset('${preset.id}')">
                ${this.escapeHtml(preset.name)}
                <button class="preset-remove" onclick="event.stopPropagation(); window.app.deleteFilterPreset('${preset.id}')">×</button>
            </div>
        `).join('');
    }

    // Load filter preset
    loadFilterPreset(presetId) {
        const preset = this.filterPresets.find(p => p.id === presetId);
        if (!preset) return;

        this.advancedFilters = { ...preset.filters };
        this.activePreset = presetId;

        // Update form inputs
        this.updateFilterFormInputs();
        this.render();
        this.updateCounts();
        this.renderFilterPresets();
        this.showFilterStatus();
        this.showFilterSummary();
        
        // Update the current filters display
        this.updateCurrentFiltersDisplay();
    }

    // Delete filter preset
    deleteFilterPreset(presetId) {
        if (confirm('Are you sure you want to delete this filter preset?')) {
            this.filterPresets = this.filterPresets.filter(p => p.id !== presetId);
            if (this.activePreset === presetId) {
                this.activePreset = null;
            }
            this.saveFilterPresets();
            this.renderFilterPresets();
        }
    }

    // Update filter form inputs
    updateFilterFormInputs() {
        const filterFromDate = document.getElementById('filterFromDate');
        const filterToDate = document.getElementById('filterToDate');
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const filterTags = document.getElementById('filterTags');
        const filterCreatedDate = document.getElementById('filterCreatedDate');
        const filterDueDate = document.getElementById('filterDueDate');

        if (filterFromDate) filterFromDate.value = this.advancedFilters.fromDate || '';
        if (filterToDate) filterToDate.value = this.advancedFilters.toDate || '';
        if (filterPriority) filterPriority.value = this.advancedFilters.priority;
        if (filterStatus) filterStatus.value = this.advancedFilters.status;
        if (filterTags) filterTags.value = this.advancedFilters.tags.join(', ');
        if (filterCreatedDate) filterCreatedDate.value = this.advancedFilters.createdDate;
        if (filterDueDate) filterDueDate.value = this.advancedFilters.dueDate;
    }

    // Initialize filter form with sensible defaults
    initializeFilterForm() {
        // Set default date range to current month
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const filterFromDate = document.getElementById('filterFromDate');
        const filterToDate = document.getElementById('filterToDate');
        
        if (filterFromDate) {
            filterFromDate.value = this.formatDateForFilter(firstDayOfMonth);
            this.advancedFilters.fromDate = this.formatDateForFilter(firstDayOfMonth);
        }
        if (filterToDate) {
            filterToDate.value = this.formatDateForFilter(lastDayOfMonth);
            this.advancedFilters.toDate = this.formatDateForFilter(lastDayOfMonth);
        }
        
        // Update the current filters display after setting defaults
        this.updateCurrentFiltersDisplay();
    }

    // Render task description with word limit
    renderTaskDescription(description, taskId) {
        const maxWords = 25; // Limit to 25 words
        const words = description.trim().split(/\s+/);
        
        if (words.length <= maxWords) {
            return `<div class="task-description">${this.escapeHtml(description)}</div>`;
        }
        
        const truncatedText = words.slice(0, maxWords).join(' ');
        const remainingWords = words.length - maxWords;
        
        return `
            <div class="task-description">
                <span class="description-excerpt">${this.escapeHtml(truncatedText)}...</span>
                <button class="read-more-btn" onclick="window.app.toggleDescription('${taskId}')" title="Show full description">
                    Read more (${remainingWords} more words)
                </button>
                <span class="description-full" style="display: none;">${this.escapeHtml(description)}</span>
                <button class="read-less-btn" onclick="window.app.toggleDescription('${taskId}')" title="Show excerpt" style="display: none;">
                    Show less
                </button>
            </div>
        `;
    }
    
    // Toggle between description excerpt and full text
    toggleDescription(taskId) {
        const taskItem = document.querySelector(`[data-task-id="${taskId}"]`) || 
                        document.querySelector(`.task-item:has(.task-description button[onclick*="${taskId}"])`);
        
        if (!taskItem) return;
        
        const excerpt = taskItem.querySelector('.description-excerpt');
        const full = taskItem.querySelector('.description-full');
        const readMoreBtn = taskItem.querySelector('.read-more-btn');
        const readLessBtn = taskItem.querySelector('.read-less-btn');
        
        if (excerpt && full && readMoreBtn && readLessBtn) {
            if (excerpt.style.display !== 'none') {
                // Show full description
                excerpt.style.display = 'none';
                full.style.display = 'inline';
                readMoreBtn.style.display = 'none';
                readLessBtn.style.display = 'inline';
            } else {
                // Show excerpt
                excerpt.style.display = 'inline';
                full.style.display = 'none';
                readMoreBtn.style.display = 'inline';
                readLessBtn.style.display = 'none';
            }
        }
    }
    
    // Get filter summary for display
    getFilterSummary() {
        const summary = [];
        
        if (this.advancedFilters.fromDate && this.advancedFilters.toDate) {
            summary.push(`Date: ${this.advancedFilters.fromDate} to ${this.advancedFilters.toDate}`);
        }
        
        if (this.advancedFilters.priority) {
            summary.push(`Priority: ${this.advancedFilters.priority}`);
        }
        
        if (this.advancedFilters.status) {
            summary.push(`Status: ${this.advancedFilters.status}`);
        }
        
        if (this.advancedFilters.tags.length > 0) {
            summary.push(`Tags: ${this.advancedFilters.tags.join(', ')}`);
        }
        
        if (this.advancedFilters.createdDate) {
            summary.push(`Created: ${this.advancedFilters.createdDate}`);
        }
        
        if (this.advancedFilters.dueDate) {
            summary.push(`Due: ${this.advancedFilters.dueDate}`);
        }
        
        return summary;
    }

    // Show filter summary in the dedicated component
    showFilterSummary() {
        const summaryElement = document.getElementById('filterSummaryComponent');
        if (!summaryElement) return;

        const summary = this.getFilterSummary();
        if (summary.length > 0) {
            summaryElement.innerHTML = `<small>${summary.join(' • ')}</small>`;
            summaryElement.style.display = 'block';
        } else {
            summaryElement.style.display = 'none';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});