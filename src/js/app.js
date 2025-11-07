// Godspeed - Premium Minimalist Task Manager
const { ipcRenderer } = require('electron');

let allTasks = [];
let currentPriority = 'high';

// Initialize
async function init() {
    console.log('Initializing Godspeed...');

    const connected = await airtableService.initialize();

    if (!connected) {
        showNotification('Configure Airtable in settings', 'error');
    } else {
        await loadTasks();
    }

    setupEventListeners();
    setupKeyboardShortcuts();

    // Auto-focus command input
    document.getElementById('command-input').focus();
}

// Load tasks
async function loadTasks() {
    try {
        allTasks = await airtableService.getTasks();
        renderTasks();
        updateStats();
        if (allTasks.length === 0) {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

// Render tasks
function renderTasks() {
    const container = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-state');

    // Filter active tasks only
    const activeTasks = allTasks.filter(t => !t.completed);

    if (activeTasks.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Clear existing tasks
    const existingTasks = container.querySelectorAll('.task-item');
    existingTasks.forEach(t => t.remove());

    // Render tasks
    activeTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        container.appendChild(taskEl);
    });
}

// Create task element
function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.dataset.taskId = task.id;

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    if (task.dueDate) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'task-date';
        dateSpan.textContent = airtableService.formatDate(task.dueDate);
        meta.appendChild(dateSpan);
    }

    if (task.labels && task.labels.length > 0) {
        task.labels.forEach(label => {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'task-label';
            labelSpan.textContent = label;
            meta.appendChild(labelSpan);
        });
    }

    div.appendChild(title);
    div.appendChild(meta);

    // Click to complete
    div.addEventListener('click', async () => {
        await toggleTaskComplete(task.id);
    });

    return div;
}

// Toggle task complete
async function toggleTaskComplete(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    try {
        await airtableService.updateTask(taskId, { completed: !task.completed });
        await loadTasks();
        showNotification(task.completed ? 'Task reopened' : 'Task completed!', 'success');
    } catch (error) {
        console.error('Failed to toggle task:', error);
        showNotification('Failed to update task', 'error');
    }
}

// Update stats
function updateStats() {
    const total = allTasks.filter(t => !t.completed).length;
    const today = allTasks.filter(t => !t.completed && airtableService.isToday(t)).length;
    const completed = allTasks.filter(t => t.completed).length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('today-count').textContent = today;
    document.getElementById('completed-count').textContent = completed;
}

// Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    emptyState.classList.remove('hidden');
}

// Setup event listeners
function setupEventListeners() {
    const commandInput = document.getElementById('command-input');
    const taskPanel = document.getElementById('task-panel');
    const quickDateInput = document.getElementById('quick-date');
    const timePickerDropdown = document.getElementById('time-picker-dropdown');

    // Command input - show panel when typing
    commandInput.addEventListener('input', () => {
        if (commandInput.value.trim().length > 0) {
            taskPanel.classList.remove('hidden');
        } else {
            taskPanel.classList.add('hidden');
        }
    });

    // Command input - Enter to create
    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && commandInput.value.trim()) {
            createTaskFromInput();
        }
    });

    // Date input - show time picker on focus
    quickDateInput.addEventListener('focus', () => {
        timePickerDropdown.classList.remove('hidden');
    });

    // Time presets
    document.querySelectorAll('.time-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const time = preset.dataset.time;
            quickDateInput.value = `${quickDateInput.value || 'today'} at ${time}`;
            timePickerDropdown.classList.add('hidden');
        });
    });

    // Priority buttons
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPriority = btn.dataset.priority;
        });
    });

    // Create task button
    document.getElementById('create-task').addEventListener('click', createTaskFromPanel);

    // Cancel button
    document.getElementById('cancel-task').addEventListener('click', () => {
        resetForm();
    });

    // Close app button
    document.getElementById('close-app').addEventListener('click', () => {
        window.close();
    });

    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings').addEventListener('click', () => {
        hideModal('settings-modal');
    });
    document.getElementById('cancel-settings').addEventListener('click', () => {
        hideModal('settings-modal');
    });
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // Click outside to hide time picker
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.date-time-picker')) {
            timePickerDropdown.classList.add('hidden');
        }
    });
}

// Create task from input
async function createTaskFromInput() {
    const commandInput = document.getElementById('command-input');
    const text = commandInput.value.trim();

    if (!text) return;

    const parsed = airtableService.parseTaskInput(text);

    try {
        await airtableService.createTask({
            title: parsed.title,
            labels: parsed.labels,
            dueDate: parsed.dueDate
        });

        await loadTasks();
        resetForm();
        showNotification('Task created!', 'success');
    } catch (error) {
        console.error('Failed to create task:', error);
        showNotification('Failed to create task', 'error');
    }
}

// Create task from panel
async function createTaskFromPanel() {
    const title = document.getElementById('command-input').value.trim();
    const dateText = document.getElementById('quick-date').value.trim();
    const labelsText = document.getElementById('labels-input').value.trim();

    if (!title) {
        showNotification('Please enter a task title', 'error');
        return;
    }

    let dueDate = null;
    if (dateText) {
        dueDate = airtableService.parseNaturalLanguageDate(dateText);
    }

    const labels = labelsText ? labelsText.split(',').map(l => l.trim()).filter(l => l) : [];

    try {
        await airtableService.createTask({
            title,
            labels,
            dueDate,
            priority: currentPriority
        });

        await loadTasks();
        resetForm();
        showNotification('Task created!', 'success');
    } catch (error) {
        console.error('Failed to create task:', error);
        showNotification('Failed to create task', 'error');
    }
}

// Reset form
function resetForm() {
    document.getElementById('command-input').value = '';
    document.getElementById('quick-date').value = '';
    document.getElementById('labels-input').value = '';
    document.getElementById('task-panel').classList.add('hidden');
    document.getElementById('command-input').focus();
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape to close
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            if (modals.length > 0) {
                modals.forEach(m => m.classList.add('hidden'));
            } else {
                window.close();
            }
        }

        // Cmd/Ctrl+, for settings
        if ((e.metaKey || e.ctrlKey) && e.key === ',') {
            e.preventDefault();
            openSettings();
        }
    });
}

// Settings
async function openSettings() {
    const settings = await ipcRenderer.invoke('get-settings');

    document.getElementById('airtable-api-key').value = settings.airtableApiKey || '';
    document.getElementById('airtable-base-id').value = settings.airtableBaseId || '';
    document.getElementById('airtable-table-name').value = settings.airtableTableName || 'tasks';

    showModal('settings-modal');
}

async function saveSettings() {
    const settings = {
        airtableApiKey: document.getElementById('airtable-api-key').value,
        airtableBaseId: document.getElementById('airtable-base-id').value,
        airtableTableName: document.getElementById('airtable-table-name').value || 'tasks'
    };

    await ipcRenderer.invoke('save-settings', settings);
    hideModal('settings-modal');

    const connected = await airtableService.initialize();

    if (connected) {
        showNotification('Settings saved!', 'success');
        await loadTasks();
    } else {
        showNotification('Failed to connect to Airtable', 'error');
    }
}

// UI Helpers
function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Listen for trigger from main process
ipcRenderer.on('trigger-quick-entry', () => {
    document.getElementById('command-input').focus();
});
