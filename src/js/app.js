// Godspeed - Premium Minimalist Task Manager
const { ipcRenderer } = require('electron');

let allTasks = [];
let currentPriority = 'Alta';
let currentType = 'Tarea';
let currentArea = '';
let currentAssignedTo = null;
let currentFilter = 'all';
let discordUsers = [];
let currentUserDiscordId = null;
let currentTags = [];

// Initialize
async function init() {
    console.log('Initializing Godspeed...');

    // Load current user Discord ID from settings
    const settings = await ipcRenderer.invoke('get-settings');
    currentUserDiscordId = settings.currentUserDiscordId || null;

    const connected = await airtableService.initialize();

    if (!connected) {
        showNotification('Configura Airtable en ajustes', 'error');
    } else {
        // Load Discord Users
        discordUsers = airtableService.getDiscordUsers();
        populateUserSelect();

        await loadTasks();
    }

    setupEventListeners();
    setupKeyboardShortcuts();

    // Auto-focus command input
    document.getElementById('command-input').focus();
}

// Populate user selector
function populateUserSelect() {
    const select = document.getElementById('assigned-to-select');

    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }

    discordUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (${user.role})`;
        select.appendChild(option);
    });
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
    let activeTasks = allTasks.filter(t => !t.completed);

    // Apply current filter
    if (currentFilter === 'Tarea') {
        activeTasks = activeTasks.filter(t => t.type === 'Tarea');
    } else if (currentFilter === 'Ticket') {
        activeTasks = activeTasks.filter(t => t.type === 'Ticket');
    } else if (currentFilter === 'mine') {
        // Filter by current user's Discord ID
        if (currentUserDiscordId) {
            const currentUser = airtableService.getUserByDiscordId(currentUserDiscordId);
            if (currentUser) {
                activeTasks = activeTasks.filter(t => t.assignedTo === currentUser.id);
            }
        }
    }

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

    // Task header with type badge
    const header = document.createElement('div');
    header.className = 'task-header';

    const typeBadge = document.createElement('span');
    typeBadge.className = `task-type-badge ${task.type}`;
    typeBadge.textContent = task.type;
    header.appendChild(typeBadge);

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    // Add assignee if exists
    if (task.assignedToUser) {
        const assigneeSpan = document.createElement('span');
        assigneeSpan.className = 'task-assignee';
        assigneeSpan.textContent = `👤 ${task.assignedToUser.name}`;
        meta.appendChild(assigneeSpan);
    }

    // Add area if exists
    if (task.area) {
        const areaSpan = document.createElement('span');
        areaSpan.className = 'task-area';
        areaSpan.textContent = `📁 ${task.area}`;
        meta.appendChild(areaSpan);
    }

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

    div.appendChild(header);
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
        const updatedTask = await airtableService.updateTask(taskId, { completed: !task.completed });

        // Send Discord notification when completed
        if (!task.completed) {
            await airtableService.sendDiscordNotification(updatedTask, 'completed');
        }

        await loadTasks();
        showNotification(task.completed ? 'Tarea reabierta' : '¡Tarea completada!', 'success');
    } catch (error) {
        console.error('Failed to toggle task:', error);
        showNotification('Error al actualizar tarea', 'error');
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

    // Update filter counts
    const countAll = allTasks.filter(t => !t.completed).length;
    const countTareas = allTasks.filter(t => !t.completed && t.type === 'Tarea').length;
    const countTickets = allTasks.filter(t => !t.completed && t.type === 'Ticket').length;

    let countMine = 0;
    if (currentUserDiscordId) {
        const currentUser = airtableService.getUserByDiscordId(currentUserDiscordId);
        if (currentUser) {
            countMine = allTasks.filter(t => !t.completed && t.assignedTo === currentUser.id).length;
        }
    }

    document.getElementById('count-all').textContent = countAll;
    document.getElementById('count-tareas').textContent = countTareas;
    document.getElementById('count-tickets').textContent = countTickets;
    document.getElementById('count-mine').textContent = countMine;
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
            // Apply predictions when panel opens
            applyPredictions();
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

    // Type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            // Apply smart suggestions when type changes
            applySmartSuggestions();
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

    // Area selector
    document.getElementById('area-select').addEventListener('change', (e) => {
        currentArea = e.target.value;
        // Apply smart suggestions when area changes
        applySmartSuggestions();
    });

    // Assigned to selector
    document.getElementById('assigned-to-select').addEventListener('change', (e) => {
        currentAssignedTo = e.target.value || null;
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Create task button
    document.getElementById('create-task').addEventListener('click', createTaskFromPanel);

    // Cancel button
    document.getElementById('cancel-task').addEventListener('click', () => {
        resetForm();
    });

    // Close app button - solo oculta
    document.getElementById('close-app').addEventListener('click', () => {
        ipcRenderer.send('hide-window');
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

    // Tags system - Enter to add tag
    const labelsInput = document.getElementById('labels-input');
    labelsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = labelsInput.value.trim();
            if (value) {
                addTag(value);
                labelsInput.value = '';
            }
        }
    });

    // Click outside to hide time picker
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.date-time-picker')) {
            timePickerDropdown.classList.add('hidden');
        }
    });
}

// Tags management
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DFE6E9', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E',
        '#6C5CE7', '#00B894', '#00CEC9', '#0984E3', '#E17055',
        '#E84393', '#2D3436', '#636E72', '#B2BEC3', '#55EFC4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function addTag(label) {
    if (currentTags.includes(label)) return; // No duplicados

    currentTags.push(label);
    const color = getRandomColor();

    const tagsContainer = document.getElementById('tags-container');
    const tagEl = document.createElement('div');
    tagEl.className = 'tag';
    tagEl.style.backgroundColor = color;
    tagEl.innerHTML = `
        <span>${label}</span>
        <span class="tag-remove" onclick="removeTag('${label.replace(/'/g, "\\'")}')">×</span>
    `;

    tagsContainer.appendChild(tagEl);
}

function removeTag(label) {
    currentTags = currentTags.filter(t => t !== label);
    renderTags();
}

function renderTags() {
    const tagsContainer = document.getElementById('tags-container');
    tagsContainer.innerHTML = '';
    currentTags.forEach(label => {
        const color = getRandomColor();
        const tagEl = document.createElement('div');
        tagEl.className = 'tag';
        tagEl.style.backgroundColor = color;
        tagEl.innerHTML = `
            <span>${label}</span>
            <span class="tag-remove" onclick="removeTag('${label.replace(/'/g, "\\'")}')">×</span>
        `;
        tagsContainer.appendChild(tagEl);
    });
}

// Apply predictions based on user history
function applyPredictions() {
    if (allTasks.length === 0) return;

    const predictions = airtableService.getPredictions(allTasks, currentUserDiscordId);

    // Only apply if confidence is high enough (> 50%)
    if (predictions.confidence < 0.5) return;

    // Apply predicted type
    if (predictions.type) {
        currentType = predictions.type;
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        const typeBtn = document.querySelector(`.type-btn[data-type="${predictions.type}"]`);
        if (typeBtn) typeBtn.classList.add('active');
    }

    // Apply predicted area
    if (predictions.area) {
        currentArea = predictions.area;
        document.getElementById('area-select').value = predictions.area;
    }

    // Apply predicted priority
    if (predictions.priority) {
        currentPriority = predictions.priority;
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        const priorityBtn = document.querySelector(`.priority-btn[data-priority="${predictions.priority}"]`);
        if (priorityBtn) priorityBtn.classList.add('active');
    }

    // Apply predicted assignee
    if (predictions.assignedTo) {
        currentAssignedTo = predictions.assignedTo;
        document.getElementById('assigned-to-select').value = predictions.assignedTo;
    }

    // Show prediction indicator
    showPredictionIndicator(predictions.confidence);
}

// Apply smart suggestions based on current type and area
function applySmartSuggestions() {
    const suggestions = airtableService.getSmartSuggestions(currentType, currentArea);

    // Update priority suggestion
    if (suggestions.priority && !currentPriority) {
        currentPriority = suggestions.priority;
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        const priorityBtn = document.querySelector(`.priority-btn[data-priority="${suggestions.priority}"]`);
        if (priorityBtn) priorityBtn.classList.add('active');
    }

    // Highlight suggested assignees in dropdown
    const assigneeSelect = document.getElementById('assigned-to-select');
    Array.from(assigneeSelect.options).forEach(option => {
        const userId = option.value;
        if (!userId) return;

        const isSuggested = suggestions.assignees.some(u => u.id === userId);
        if (isSuggested) {
            option.style.background = 'rgba(255, 204, 0, 0.15)';
            option.style.color = 'var(--accent)';
        } else {
            option.style.background = '';
            option.style.color = '';
        }
    });
}

// Show prediction indicator
function showPredictionIndicator(confidence) {
    const percentage = Math.round(confidence * 100);
    if (percentage >= 50) {
        showNotification(`Predicciones aplicadas (${percentage}% de confianza)`, 'info');
    }
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
    const notesText = document.getElementById('notes-input').value.trim();

    if (!title) {
        showNotification('Por favor ingresa un título', 'error');
        return;
    }

    let dueDate = null;
    if (dateText) {
        dueDate = airtableService.parseNaturalLanguageDate(dateText);
    }

    // Use currentTags instead of labelsText
    const labels = [...currentTags];

    // Get current user as requestedBy
    let requestedBy = null;
    if (currentUserDiscordId) {
        const currentUser = airtableService.getUserByDiscordId(currentUserDiscordId);
        if (currentUser) {
            requestedBy = currentUser.id;
        }
    }

    // Prevenir auto-asignación si el usuario se está asignando a sí mismo
    let finalAssignedTo = currentAssignedTo;
    if (currentUserDiscordId && requestedBy && currentAssignedTo === requestedBy) {
        showNotification('No puedes asignarte tareas a ti mismo', 'error');
        return;
    }

    console.log('Creating task with data:', {
        title,
        type: currentType,
        area: currentArea,
        assignedTo: finalAssignedTo,
        requestedBy,
        priority: currentPriority,
        labels,
        dueDate,
        notes: notesText
    });

    try {
        const newTask = await airtableService.createTask({
            title,
            type: currentType,
            area: currentArea || null,
            assignedTo: finalAssignedTo,
            requestedBy: requestedBy,
            priority: currentPriority,
            labels,
            dueDate,
            notes: notesText || null
        });

        // Send Discord notification
        await airtableService.sendDiscordNotification(newTask, 'created');

        await loadTasks();
        resetForm();
        showNotification('¡Tarea creada!', 'success');
    } catch (error) {
        console.error('Failed to create task:', error);
        showNotification('Error al crear tarea: ' + error.message, 'error');
    }
}

// Reset form
function resetForm() {
    document.getElementById('command-input').value = '';
    document.getElementById('quick-date').value = '';
    document.getElementById('labels-input').value = '';
    document.getElementById('notes-input').value = '';
    document.getElementById('area-select').value = '';
    document.getElementById('assigned-to-select').value = '';
    document.getElementById('task-panel').classList.add('hidden');

    // Reset to defaults
    currentType = 'Tarea';
    currentArea = '';
    currentAssignedTo = null;
    currentPriority = 'Alta';
    currentTags = [];

    // Clear tags
    document.getElementById('tags-container').innerHTML = '';

    // Reset type buttons
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    const tareaBtn = document.querySelector('.type-btn[data-type="Tarea"]');
    if (tareaBtn) tareaBtn.classList.add('active');

    // Reset priority buttons
    document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
    const altaBtn = document.querySelector('.priority-btn[data-priority="Alta"]');
    if (altaBtn) altaBtn.classList.add('active');

    document.getElementById('command-input').focus();
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape to hide (no cerrar)
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            if (modals.length > 0) {
                modals.forEach(m => m.classList.add('hidden'));
            } else {
                ipcRenderer.send('hide-window');
            }
        }

        // Ctrl+Shift+Q para cerrar completamente
        if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
            e.preventDefault();
            if (confirm('¿Cerrar completamente la aplicación? (Se ocultará la ventana, usa Alt+L para volver a mostrarla)')) {
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
    document.getElementById('current-user-discord-id').value = settings.currentUserDiscordId || '';

    showModal('settings-modal');
}

async function saveSettings() {
    const settings = {
        airtableApiKey: document.getElementById('airtable-api-key').value,
        airtableBaseId: document.getElementById('airtable-base-id').value,
        airtableTableName: document.getElementById('airtable-table-name').value || 'tasks',
        currentUserDiscordId: document.getElementById('current-user-discord-id').value
    };

    await ipcRenderer.invoke('save-settings', settings);
    currentUserDiscordId = settings.currentUserDiscordId || null;
    hideModal('settings-modal');

    const connected = await airtableService.initialize();

    if (connected) {
        // Reload Discord Users
        discordUsers = airtableService.getDiscordUsers();
        populateUserSelect();

        showNotification('¡Configuración guardada!', 'success');
        await loadTasks();
    } else {
        showNotification('Error al conectar con Airtable', 'error');
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
document.addEventListener('DOMContentLoaded', () => {
    init();

    // Initialize wheel picker
    if (typeof wheelPickerManager !== 'undefined') {
        wheelPickerManager.init();
    }
});

// Listen for trigger from main process
ipcRenderer.on('trigger-quick-entry', () => {
    document.getElementById('command-input').focus();
});
