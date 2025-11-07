const Airtable = require('airtable');
const chrono = require('chrono-node');

class AirtableService {
    constructor() {
        this.base = null;
        this.table = null;
        this.isConnected = false;
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
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Airtable:', error);
            this.isConnected = false;
            return false;
        }
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
                Created: new Date().toISOString(),
                Completed: false
            };

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
        return {
            id: record.id,
            title: fields.Name || '',
            completed: fields.Completed || false,
            dueDate: fields.DueDate ? new Date(fields.DueDate) : null,
            labels: fields.Labels ? fields.Labels.split(',').map(l => l.trim()) : [],
            notes: fields.Notes || '',
            created: fields.Created ? new Date(fields.Created) : new Date(),
            completedDate: fields.CompletedDate ? new Date(fields.CompletedDate) : null
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
}

// Create a singleton instance
const airtableService = new AirtableService();
