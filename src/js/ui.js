// UI helper functions and utilities

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
}

function renderTask(task) {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item' + (task.completed ? ' completed' : '');
    taskItem.dataset.taskId = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const content = document.createElement('div');
    content.className = 'task-content';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    if (task.dueDate) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'task-date';

        if (airtableService.isOverdue(task)) {
            dateSpan.classList.add('overdue');
            dateSpan.innerHTML = '🔴 ' + airtableService.formatDate(task.dueDate);
        } else if (airtableService.isToday(task)) {
            dateSpan.classList.add('today');
            dateSpan.innerHTML = '🟢 ' + airtableService.formatDate(task.dueDate);
        } else {
            dateSpan.innerHTML = '📅 ' + airtableService.formatDate(task.dueDate);
        }

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

    content.appendChild(title);
    content.appendChild(meta);

    taskItem.appendChild(checkbox);
    taskItem.appendChild(content);

    return taskItem;
}

function renderEmptyState(listName) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';

    const icons = {
        inbox: '📥',
        today: '📅',
        upcoming: '🗓️',
        completed: '✅'
    };

    icon.textContent = icons[listName] || '📋';

    const text = document.createElement('div');
    text.className = 'empty-state-text';

    const messages = {
        inbox: 'No tasks in your inbox. Add one above!',
        today: 'No tasks due today. Enjoy your free time!',
        upcoming: 'No upcoming tasks. You\'re all caught up!',
        completed: 'No completed tasks yet. Get to work!'
    };

    text.textContent = messages[listName] || 'No tasks found.';

    emptyState.appendChild(icon);
    emptyState.appendChild(text);

    return emptyState;
}

function renderCommandItem(command) {
    const item = document.createElement('div');
    item.className = 'command-item';
    item.dataset.commandId = command.id;

    const icon = document.createElement('div');
    icon.className = 'command-icon';
    icon.textContent = command.icon;

    const textContainer = document.createElement('div');
    textContainer.className = 'command-text';

    const name = document.createElement('div');
    name.className = 'command-name';
    name.textContent = command.name;

    const description = document.createElement('div');
    description.className = 'command-description';
    description.textContent = command.description;

    textContainer.appendChild(name);
    textContainer.appendChild(description);

    item.appendChild(icon);
    item.appendChild(textContainer);

    if (command.shortcut) {
        const shortcut = document.createElement('div');
        shortcut.className = 'command-shortcut';
        shortcut.textContent = command.shortcut;
        item.appendChild(shortcut);
    }

    return item;
}

function updateTaskCounts(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = {
        inbox: 0,
        today: 0,
        upcoming: 0,
        completed: 0
    };

    tasks.forEach(task => {
        if (task.completed) {
            counts.completed++;
        } else {
            counts.inbox++;

            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate.getTime() === today.getTime()) {
                    counts.today++;
                } else if (dueDate > today) {
                    counts.upcoming++;
                }
            }
        }
    });

    document.querySelectorAll('.list-item').forEach(item => {
        const listType = item.dataset.list;
        const countSpan = item.querySelector('.task-count');
        if (countSpan && counts[listType] !== undefined) {
            countSpan.textContent = counts[listType];
        }
    });
}

function renderLabels(labels) {
    const labelsContainer = document.getElementById('labels-list');
    labelsContainer.innerHTML = '';

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
        '#ec4899', '#f43f5e'
    ];

    labels.forEach((label, index) => {
        const labelItem = document.createElement('div');
        labelItem.className = 'label-item';
        labelItem.dataset.label = label;

        const dot = document.createElement('div');
        dot.className = 'label-dot';
        dot.style.background = colors[index % colors.length];

        const name = document.createElement('span');
        name.textContent = label;

        labelItem.appendChild(dot);
        labelItem.appendChild(name);
        labelsContainer.appendChild(labelItem);
    });
}

function showLoading(container) {
    container.innerHTML = '<div class="loading">Loading tasks</div>';
}

// Keyboard navigation helper
class KeyboardNavigator {
    constructor(items, onSelect) {
        this.items = items;
        this.selectedIndex = 0;
        this.onSelect = onSelect;
    }

    selectNext() {
        if (this.selectedIndex < this.items.length - 1) {
            this.selectedIndex++;
            this.updateSelection();
        }
    }

    selectPrevious() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.updateSelection();
        }
    }

    selectCurrent() {
        if (this.items[this.selectedIndex]) {
            this.onSelect(this.items[this.selectedIndex]);
        }
    }

    updateSelection() {
        this.items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    reset() {
        this.selectedIndex = 0;
        this.updateSelection();
    }
}
