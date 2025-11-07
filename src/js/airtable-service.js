const Airtable = require('airtable');
const chrono = require('chrono-node');

class AirtableService {
    constructor() {
        this.base = null;
        this.table = null;
        this.discordUsersTable = null;
        this.isConnected = false;
        this.discordUsers = [];
    }

    async initialize() {
        const { ipcRenderer } = require('electron');
        const settings = await ipcRenderer.invoke('get-settings');

        if (!settings.airtableApiKey || !settings.airtableBaseId) {
            return false;
        }

        try {
            Airtable.configure({
                apiKey: settings.airtableApiKey
            });

            this.base = Airtable.base(settings.airtableBaseId);
            this.table = this.base(settings.airtableTableName || 'Tasks');
            this.discordUsersTable = this.base('Discord Users');
            this.isConnected = true;

            // Load Discord Users
            await this.loadDiscordUsers();

            return true;
        } catch (error) {
            console.error('Failed to initialize Airtable:', error);
            this.isConnected = false;
            return false;
        }
    }

    async loadDiscordUsers() {
        if (!this.isConnected) {
            return;
        }

        try {
            const records = [];
            await this.discordUsersTable.select().eachPage((pageRecords, fetchNextPage) => {
                pageRecords.forEach(record => {
                    records.push({
                        id: record.id,
                        name: record.fields.Name || '',
                        discordId: record.fields['Discord ID'] || '',
                        role: record.fields.Role || ''
                    });
                });
                fetchNextPage();
            });

            this.discordUsers = records;
            console.log('Discord Users loaded:', this.discordUsers.length);
        } catch (error) {
            console.error('Failed to load Discord Users:', error);
            this.discordUsers = [];
        }
    }

    getDiscordUsers() {
        return this.discordUsers;
    }

    getUserById(userId) {
        return this.discordUsers.find(u => u.id === userId);
    }

    getUserByDiscordId(discordId) {
        return this.discordUsers.find(u => u.discordId === discordId);
    }

    parseNaturalLanguageDate(text) {
        const results = chrono.parse(text);
        if (results.length > 0) {
            return results[0].start.date();
        }
        return null;
    }

    parseTaskInput(input) {
        let title = input;
        let labels = [];
        let dueDate = null;

        // Extract labels (words starting with @)
        const labelMatches = input.match(/@(\w+)/g);
        if (labelMatches) {
            labels = labelMatches.map(l => l.substring(1));
            title = title.replace(/@\w+/g, '').trim();
        }

        // Extract date (words starting with #)
        const dateMatches = input.match(/#([\w\s]+?)(?=\s*(?:@|$))/g);
        if (dateMatches) {
            const dateText = dateMatches[0].substring(1).trim();
            dueDate = this.parseNaturalLanguageDate(dateText);
            title = title.replace(/#[\w\s]+/g, '').trim();
        }

        return { title, labels, dueDate };
    }

    async createTask(taskData) {
        if (!this.isConnected) {
            throw new Error('Airtable is not connected');
        }

        try {
            const fields = {
                Name: taskData.title,
                Status: 'Todo',
                Completed: false
            };

            if (taskData.type) {
                fields.Type = taskData.type;
            }

            if (taskData.area) {
                fields.Area = taskData.area;
            }

            if (taskData.priority) {
                fields.Priority = taskData.priority;
            }

            if (taskData.assignedTo) {
                fields.AssignedTo = [taskData.assignedTo]; // Array for linked record
            }

            if (taskData.requestedBy) {
                fields.RequestedBy = [taskData.requestedBy]; // Array for linked record
            }

            if (taskData.dueDate) {
                fields.DueDate = taskData.dueDate.toISOString().split('T')[0];
            }

            if (taskData.labels && taskData.labels.length > 0) {
                fields.Labels = taskData.labels.join(', ');
            }

            if (taskData.notes) {
                fields.Notes = taskData.notes;
            }

            const record = await this.table.create([{ fields }]);
            return this.formatRecord(record[0]);
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }

    async getTasks(filter = null) {
        if (!this.isConnected) {
            throw new Error('Airtable is not connected');
        }

        try {
            const records = [];
            let filterFormula = '';

            if (filter === 'today') {
                const today = new Date().toISOString().split('T')[0];
                filterFormula = `AND({Completed} = FALSE(), {DueDate} = '${today}')`;
            } else if (filter === 'upcoming') {
                const today = new Date().toISOString().split('T')[0];
                filterFormula = `AND({Completed} = FALSE(), {DueDate} > '${today}')`;
            } else if (filter === 'completed') {
                filterFormula = '{Completed} = TRUE()';
            } else if (filter === 'inbox') {
                filterFormula = '{Completed} = FALSE()';
            }

            const query = {
                sort: [{ field: 'Created', direction: 'desc' }]
            };

            if (filterFormula) {
                query.filterByFormula = filterFormula;
            }

            await this.table.select(query).eachPage((pageRecords, fetchNextPage) => {
                pageRecords.forEach(record => {
                    records.push(this.formatRecord(record));
                });
                fetchNextPage();
            });

            return records;
        } catch (error) {
            console.error('Failed to get tasks:', error);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        if (!this.isConnected) {
            throw new Error('Airtable is not connected');
        }

        try {
            const fields = {};

            if (updates.title !== undefined) {
                fields.Name = updates.title;
            }

            if (updates.type !== undefined) {
                fields.Type = updates.type;
            }

            if (updates.area !== undefined) {
                fields.Area = updates.area;
            }

            if (updates.priority !== undefined) {
                fields.Priority = updates.priority;
            }

            if (updates.assignedTo !== undefined) {
                fields.AssignedTo = updates.assignedTo ? [updates.assignedTo] : [];
            }

            if (updates.requestedBy !== undefined) {
                fields.RequestedBy = updates.requestedBy ? [updates.requestedBy] : [];
            }

            if (updates.completed !== undefined) {
                fields.Completed = updates.completed;
                if (updates.completed) {
                    fields.CompletedDate = new Date().toISOString().split('T')[0];
                }
            }

            if (updates.dueDate !== undefined) {
                fields.DueDate = updates.dueDate ? updates.dueDate.toISOString().split('T')[0] : null;
            }

            if (updates.labels !== undefined) {
                fields.Labels = updates.labels.join(', ');
            }

            if (updates.notes !== undefined) {
                fields.Notes = updates.notes;
            }

            const record = await this.table.update(taskId, fields);
            return this.formatRecord(record);
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        if (!this.isConnected) {
            throw new Error('Airtable is not connected');
        }

        try {
            await this.table.destroy(taskId);
            return true;
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    }

    async getLabels() {
        if (!this.isConnected) {
            return [];
        }

        try {
            const records = await this.getTasks();
            const labelsSet = new Set();

            records.forEach(record => {
                if (record.labels && record.labels.length > 0) {
                    record.labels.forEach(label => labelsSet.add(label));
                }
            });

            return Array.from(labelsSet).sort();
        } catch (error) {
            console.error('Failed to get labels:', error);
            return [];
        }
    }

    formatRecord(record) {
        const fields = record.fields;

        // Get assigned user info
        let assignedToUser = null;
        if (fields.AssignedTo && fields.AssignedTo.length > 0) {
            assignedToUser = this.getUserById(fields.AssignedTo[0]);
        }

        // Get requested by user info
        let requestedByUser = null;
        if (fields.RequestedBy && fields.RequestedBy.length > 0) {
            requestedByUser = this.getUserById(fields.RequestedBy[0]);
        }

        return {
            id: record.id,
            title: fields.Name || '',
            type: fields.Type || 'Tarea',
            area: fields.Area || '',
            priority: fields.Priority || 'Media',
            assignedTo: fields.AssignedTo && fields.AssignedTo.length > 0 ? fields.AssignedTo[0] : null,
            assignedToUser: assignedToUser,
            requestedBy: fields.RequestedBy && fields.RequestedBy.length > 0 ? fields.RequestedBy[0] : null,
            requestedByUser: requestedByUser,
            completed: fields.Completed || false,
            dueDate: fields.DueDate ? new Date(fields.DueDate) : null,
            labels: fields.Labels ? fields.Labels.split(',').map(l => l.trim()) : [],
            notes: fields.Notes || '',
            created: fields.Created ? new Date(fields.Created) : new Date(),
            completedDate: fields.CompletedDate ? new Date(fields.CompletedDate) : null,
            ticketNumber: fields.TicketNumber || ''
        };
    }

    isOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
    }

    isToday(task) {
        if (!task.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
    }

    formatDate(date) {
        if (!date) return '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const taskDate = new Date(date);
        taskDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (taskDate.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            const options = { month: 'short', day: 'numeric' };
            return taskDate.toLocaleDateString('en-US', options);
        }
    }

    // Prediction Algorithm
    getPredictions(tasks, currentUserDiscordId) {
        if (!tasks || tasks.length === 0) {
            return {
                type: 'Tarea',
                area: '',
                assignedTo: null,
                priority: 'Media',
                confidence: 0
            };
        }

        // Get tasks created by current user (as requestedBy)
        const currentUser = this.getUserByDiscordId(currentUserDiscordId);
        const userTasks = currentUser
            ? tasks.filter(t => t.requestedBy === currentUser.id)
            : tasks;

        // Get recent tasks (last 20)
        const recentTasks = userTasks.slice(-20);

        // Count frequencies
        const typeCount = {};
        const areaCount = {};
        const assigneeCount = {};
        const priorityCount = {};

        recentTasks.forEach(task => {
            // Count types
            typeCount[task.type] = (typeCount[task.type] || 0) + 1;

            // Count areas
            if (task.area) {
                areaCount[task.area] = (areaCount[task.area] || 0) + 1;
            }

            // Count assignees
            if (task.assignedTo) {
                assigneeCount[task.assignedTo] = (assigneeCount[task.assignedTo] || 0) + 1;
            }

            // Count priorities
            if (task.priority) {
                priorityCount[task.priority] = (priorityCount[task.priority] || 0) + 1;
            }
        });

        // Find most common values
        const mostCommonType = this.getMostCommon(typeCount) || 'Tarea';
        const mostCommonArea = this.getMostCommon(areaCount) || '';
        const mostCommonAssignee = this.getMostCommon(assigneeCount) || null;
        const mostCommonPriority = this.getMostCommon(priorityCount) || 'Media';

        // Calculate confidence (0-1)
        const confidence = recentTasks.length / 20;

        return {
            type: mostCommonType,
            area: mostCommonArea,
            assignedTo: mostCommonAssignee,
            priority: mostCommonPriority,
            confidence: confidence
        };
    }

    getMostCommon(countObject) {
        let maxCount = 0;
        let mostCommon = null;

        for (const [key, count] of Object.entries(countObject)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = key;
            }
        }

        return mostCommon;
    }

    // Smart suggestions based on context
    getSmartSuggestions(currentType, currentArea) {
        const suggestions = {
            assignees: [],
            priority: 'Media'
        };

        // Role-based assignee suggestions
        const roleMapping = {
            'Tarea': ['Developer', 'Operations'],
            'Ticket': ['Customer Success', 'Operations'],
            'Bug': ['Developer'],
            'Feature': ['Developer', 'CEO']
        };

        const areaRoleMapping = {
            'IA': ['Developer', 'Prompt Engineer'],
            'Contratos': ['Operations', 'CEO'],
            'Dev': ['Developer'],
            'Operaciones': ['Operations'],
            'Marketing': ['Customer Success', 'CEO']
        };

        // Get relevant roles
        let relevantRoles = roleMapping[currentType] || [];
        if (currentArea && areaRoleMapping[currentArea]) {
            relevantRoles = [...new Set([...relevantRoles, ...areaRoleMapping[currentArea]])];
        }

        // Filter users by relevant roles
        suggestions.assignees = this.discordUsers.filter(user =>
            relevantRoles.includes(user.role)
        );

        // Smart priority suggestion
        if (currentType === 'Bug') {
            suggestions.priority = 'Alta';
        } else if (currentType === 'Ticket') {
            suggestions.priority = 'Alta';
        } else if (currentType === 'Feature') {
            suggestions.priority = 'Media';
        } else {
            suggestions.priority = 'Media';
        }

        return suggestions;
    }
}

// Create a singleton instance
const airtableService = new AirtableService();
