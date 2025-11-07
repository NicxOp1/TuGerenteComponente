// Main application logic
const { ipcRenderer } = require('electron');

let currentList = 'inbox';
let allTasks = [];
let currentTaskDetail = null;
let commandNavigator = null;

// Initialize the application
async function init() {
    console.log('Initializing application...');

    // Try to connect to Airtable
    const connected = await airtableService.initialize();

    if (!connected) {
        showNotification('Please configure Airtable settings', 'error');
        setTimeout(() => {
            showModal('settings-modal');
        }, 1000);
    } else {
        await loadTasks();
        await loadLabels();
    }

    setupEventListeners();
    setupKeyboardShortcuts();
}

// Load tasks from Airtable
async function loadTasks() {
    const container = document.getElementById('tasks-container');
    showLoading(container);

    try {
        allTasks = await airtableService.getTasks();
        renderTasks();
        updateTaskCounts(allTasks);
        showNotification(`Loaded ${allTasks.length} tasks`);
    } catch (error) {
        console.error('Failed to load tasks:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load tasks. Check your Airtable connection.</div></div>';
        showNotification('Failed to load tasks', 'error');
    }
}

// Load labels from tasks
async function loadLabels() {
    try {
        const labels = await airtableService.getLabels();
        renderLabels(labels);
    } catch (error) {
        console.error('Failed to load labels:', error);
    }
}

// Render tasks based on current list filter
function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';

    let filteredTasks = [];

    if (currentList === 'inbox') {
        filteredTasks = allTasks.filter(task => !task.completed);
    } else if (currentList === 'today') {
        filteredTasks = allTasks.filter(task => !task.completed && airtableService.isToday(task));
    } else if (currentList === 'upcoming') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredTasks = allTasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate > today;
        });
    } else if (currentList === 'completed') {
        filteredTasks = allTasks.filter(task => task.completed);
    }

    if (filteredTasks.length === 0) {
        container.appendChild(renderEmptyState(currentList));
        return;
    }

    filteredTasks.forEach(task => {
        const taskElement = renderTask(task);

        // Checkbox handler
        taskElement.querySelector('.task-checkbox').addEventListener('change', async (e) => {
            await toggleTaskComplete(task.id, e.target.checked);
        });

        // Click handler to open task details
        taskElement.addEventListener('click', () => {
            openTaskDetail(task);
        });

        container.appendChild(taskElement);
    });
}

// Toggle task completion
async function toggleTaskComplete(taskId, completed) {
    try {
        await airtableService.updateTask(taskId, { completed });
        await loadTasks();
        showNotification(completed ? 'Task completed!' : 'Task reopened');
    } catch (error) {
        console.error('Failed to update task:', error);
        showNotification('Failed to update task', 'error');
    }
}

// Open task detail modal
function openTaskDetail(task) {
    currentTaskDetail = task;

    document.getElementById('task-detail-checkbox').checked = task.completed;
    document.getElementById('task-detail-title').value = task.title;
    document.getElementById('task-detail-date').value = task.dueDate ? airtableService.formatDate(task.dueDate) : '';
    document.getElementById('task-detail-labels').value = task.labels.join(', ');
    document.getElementById('task-detail-notes').value = task.notes;

    showModal('task-detail-modal');
    document.getElementById('task-detail-title').focus();
}

// Setup event listeners
function setupEventListeners() {
    // Quick entry
    const quickEntryInput = document.getElementById('quick-entry-input');
    quickEntryInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && quickEntryInput.value.trim()) {
            await createTask(quickEntryInput.value);
            quickEntryInput.value = '';
        }
    });

    // List navigation
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentList = item.dataset.list;
            document.getElementById('current-list-title').textContent = item.querySelector('.list-name').textContent;
            renderTasks();
        });
    });

    // Label filtering
    document.addEventListener('click', (e) => {
        if (e.target.closest('.label-item')) {
            const label = e.target.closest('.label-item').dataset.label;
            filterByLabel(label);
        }
    });

    // Command palette
    document.getElementById('cmd-palette-btn').addEventListener('click', openCommandPalette);
    document.getElementById('command-input').addEventListener('input', filterCommands);
    document.getElementById('command-input').addEventListener('keydown', handleCommandKeydown);

    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    const userSettingsBtn = document.getElementById('settings-btn-user');
    if (userSettingsBtn) {
        userSettingsBtn.addEventListener('click', openSettings);
    }
    document.getElementById('close-settings').addEventListener('click', () => hideModal('settings-modal'));
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Task detail
    document.getElementById('close-task-detail').addEventListener('click', () => hideModal('task-detail-modal'));
    document.getElementById('save-task-detail').addEventListener('click', saveTaskDetail);
    document.getElementById('delete-task').addEventListener('click', deleteCurrentTask);

    document.getElementById('task-detail-checkbox').addEventListener('change', async (e) => {
        if (currentTaskDetail) {
            await toggleTaskComplete(currentTaskDetail.id, e.target.checked);
        }
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    // IPC listeners
    ipcRenderer.on('trigger-quick-entry', () => {
        quickEntryInput.focus();
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Command+K or Ctrl+K for command palette
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCommandPalette();
        }

        // S for settings
        if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea')) {
            e.preventDefault();
            openSettings();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }

        // Number keys for list navigation (1-4)
        if (!e.target.matches('input, textarea')) {
            const listMap = { '1': 'inbox', '2': 'today', '3': 'upcoming', '4': 'completed' };
            if (listMap[e.key]) {
                const listItem = document.querySelector(`[data-list="${listMap[e.key]}"]`);
                if (listItem) listItem.click();
            }
        }
    });
}

// Create a new task
async function createTask(input) {
    const parsed = airtableService.parseTaskInput(input);

    if (!parsed.title) {
        showNotification('Please enter a task title', 'error');
        return;
    }

    try {
        await airtableService.createTask(parsed);
        await loadTasks();
        await loadLabels();
        showNotification('Task created!');
    } catch (error) {
        console.error('Failed to create task:', error);
        showNotification('Failed to create task', 'error');
    }
}

// Command palette
function openCommandPalette() {
    showModal('command-palette');
    const input = document.getElementById('command-input');
    input.value = '';
    input.focus();
    renderCommands();
}

function getCommands() {
    return [
        {
            id: 'refresh',
            name: 'Refresh Tasks',
            description: 'Reload all tasks from Airtable',
            icon: '🔄',
            action: () => loadTasks()
        },
        {
            id: 'settings',
            name: 'Open Settings',
            description: 'Configure Airtable connection',
            icon: '⚙️',
            shortcut: 'S',
            action: openSettings
        },
        {
            id: 'inbox',
            name: 'Go to Inbox',
            description: 'View all active tasks',
            icon: '📥',
            shortcut: '1',
            action: () => document.querySelector('[data-list="inbox"]').click()
        },
        {
            id: 'today',
            name: 'Go to Today',
            description: 'View tasks due today',
            icon: '📅',
            shortcut: '2',
            action: () => document.querySelector('[data-list="today"]').click()
        },
        {
            id: 'upcoming',
            name: 'Go to Upcoming',
            description: 'View upcoming tasks',
            icon: '🗓️',
            shortcut: '3',
            action: () => document.querySelector('[data-list="upcoming"]').click()
        },
        {
            id: 'completed',
            name: 'Go to Completed',
            description: 'View completed tasks',
            icon: '✅',
            shortcut: '4',
            action: () => document.querySelector('[data-list="completed"]').click()
        }
    ];
}

function renderCommands(filter = '') {
    const container = document.getElementById('command-suggestions');
    container.innerHTML = '';

    const commands = getCommands();
    const filtered = filter
        ? commands.filter(cmd =>
            cmd.name.toLowerCase().includes(filter.toLowerCase()) ||
            cmd.description.toLowerCase().includes(filter.toLowerCase())
        )
        : commands;

    filtered.forEach(command => {
        const element = renderCommandItem(command);
        element.addEventListener('click', () => {
            command.action();
            hideModal('command-palette');
        });
        container.appendChild(element);
    });

    // Setup keyboard navigation
    const items = Array.from(container.querySelectorAll('.command-item'));
    if (items.length > 0) {
        commandNavigator = new KeyboardNavigator(items, (item) => {
            const commandId = item.dataset.commandId;
            const command = commands.find(c => c.id === commandId);
            if (command) {
                command.action();
                hideModal('command-palette');
            }
        });
        commandNavigator.reset();
    }
}

function filterCommands(e) {
    renderCommands(e.target.value);
}

function handleCommandKeydown(e) {
    if (!commandNavigator) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        commandNavigator.selectNext();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commandNavigator.selectPrevious();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        commandNavigator.selectCurrent();
    }
}

// Settings
async function openSettings() {
    const settings = await ipcRenderer.invoke('get-settings');

    document.getElementById('airtable-api-key').value = settings.airtableApiKey || '';
    document.getElementById('airtable-base-id').value = settings.airtableBaseId || '';
    document.getElementById('airtable-table-name').value = settings.airtableTableName || 'Tasks';

    showModal('settings-modal');
    document.getElementById('airtable-api-key').focus();
}

async function saveSettings() {
    const settings = {
        airtableApiKey: document.getElementById('airtable-api-key').value,
        airtableBaseId: document.getElementById('airtable-base-id').value,
        airtableTableName: document.getElementById('airtable-table-name').value || 'Tasks'
    };

    await ipcRenderer.invoke('save-settings', settings);
    hideModal('settings-modal');

    // Reconnect with new settings
    const connected = await airtableService.initialize();

    if (connected) {
        showNotification('Settings saved! Reconnecting...');
        await loadTasks();
        await loadLabels();
    } else {
        showNotification('Failed to connect to Airtable', 'error');
    }
}

// Task detail
async function saveTaskDetail() {
    if (!currentTaskDetail) return;

    const title = document.getElementById('task-detail-title').value;
    const dateInput = document.getElementById('task-detail-date').value;
    const labelsInput = document.getElementById('task-detail-labels').value;
    const notes = document.getElementById('task-detail-notes').value;

    const updates = {
        title,
        notes,
        labels: labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : []
    };

    if (dateInput) {
        const date = airtableService.parseNaturalLanguageDate(dateInput);
        if (date) {
            updates.dueDate = date;
        }
    }

    try {
        await airtableService.updateTask(currentTaskDetail.id, updates);
        await loadTasks();
        await loadLabels();
        hideModal('task-detail-modal');
        showNotification('Task updated!');
    } catch (error) {
        console.error('Failed to update task:', error);
        showNotification('Failed to update task', 'error');
    }
}

async function deleteCurrentTask() {
    if (!currentTaskDetail) return;

    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await airtableService.deleteTask(currentTaskDetail.id);
            await loadTasks();
            await loadLabels();
            hideModal('task-detail-modal');
            showNotification('Task deleted');
        } catch (error) {
            console.error('Failed to delete task:', error);
            showNotification('Failed to delete task', 'error');
        }
    }
}

// Filter by label
function filterByLabel(label) {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';

    const filtered = allTasks.filter(task =>
        !task.completed && task.labels.includes(label)
    );

    document.getElementById('current-list-title').textContent = `Label: ${label}`;
    document.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));

    if (filtered.length === 0) {
        container.appendChild(renderEmptyState('inbox'));
        return;
    }

    filtered.forEach(task => {
        const taskElement = renderTask(task);

        taskElement.querySelector('.task-checkbox').addEventListener('change', async (e) => {
            await toggleTaskComplete(task.id, e.target.checked);
        });

        taskElement.addEventListener('click', () => {
            openTaskDetail(task);
        });

        container.appendChild(taskElement);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
