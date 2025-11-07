# Godspeed Airtable Task Manager

A fast, keyboard-driven task management application built with Electron.js and Airtable, inspired by [Godspeed](https://godspeedapp.com/).

## Features

### ⚡ Lightning Fast & Keyboard-Driven
- 100% keyboard navigation support
- Command palette (⌘K / Ctrl+K) for quick access to all features
- Quick entry for rapid task capture (⌘+Shift+A)
- Instant shortcuts for navigation (1-4 for list switching)

### 📋 Smart Task Management
- **Natural Language Date Parsing**: Use phrases like "tomorrow", "3d", "next monday"
- **Quick Entry Syntax**:
  - Add labels with `@label`
  - Set due dates with `#tomorrow` or `#3d`
  - Example: "Buy groceries @shopping #tomorrow"
- **Smart Lists**: Inbox, Today, Upcoming, Completed
- **Label Organization**: Automatic label extraction and filtering

### 🔄 Airtable Integration
- Real-time sync with your Airtable base
- Store tasks, due dates, labels, and notes
- Works offline with Electron's storage
- Secure API key storage

### 🎨 Beautiful Dark UI
- Sleek, modern dark theme
- Smooth animations and transitions
- Minimal, distraction-free interface
- Visual indicators for overdue and today's tasks

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- An [Airtable](https://airtable.com) account

## Airtable Setup

1. Create a new Airtable base or use an existing one
2. Create a table called "Tasks" with the following fields:

| Field Name | Field Type | Description |
|------------|-----------|-------------|
| Name | Single line text | Task title (required) |
| Status | Single select | Task status (default: Todo) |
| Completed | Checkbox | Whether the task is completed |
| DueDate | Date | When the task is due |
| Labels | Single line text | Comma-separated labels |
| Notes | Long text | Additional task notes |
| Created | Date | When the task was created |
| CompletedDate | Date | When the task was completed |

3. Get your API credentials:
   - **API Key**: Go to https://airtable.com/account and generate a personal access token
   - **Base ID**: Found in your Airtable API docs (starts with "app...")

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TuGerenteComponente
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

4. Configure Airtable:
   - Click the settings icon or press `S`
   - Enter your Airtable API Key
   - Enter your Airtable Base ID
   - Confirm the table name (default: "Tasks")
   - Click "Save Settings"

## Usage

### Quick Entry
- Focus on the input at the top of the screen
- Type your task with optional labels and dates:
  ```
  Complete project report @work #friday
  Call dentist #tomorrow
  Buy groceries @personal @shopping #3d
  ```
- Press Enter to create the task

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + K | Open command palette |
| ⌘/Ctrl + Shift + A | Quick entry (global) |
| S | Open settings |
| 1 | Go to Inbox |
| 2 | Go to Today |
| 3 | Go to Upcoming |
| 4 | Go to Completed |
| Esc | Close modal |
| Enter | Create task (in quick entry) |

### Task Management
- Click a task to view/edit details
- Check the checkbox to complete a task
- Click on labels to filter by that label
- Use natural language for dates: "tomorrow", "next week", "in 3 days"

### Command Palette
- Press ⌘K or Ctrl+K to open
- Search for commands by typing
- Use arrow keys to navigate
- Press Enter to execute

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Project Structure

```
.
├── main.js                 # Electron main process
├── src/
│   ├── index.html         # Main application UI
│   ├── css/
│   │   └── styles.css     # Application styles
│   └── js/
│       ├── airtable-service.js  # Airtable API integration
│       ├── ui.js                # UI helper functions
│       └── app.js               # Main application logic
├── package.json
└── README.md
```

## Features in Detail

### Natural Language Date Parsing
Uses [chrono-node](https://github.com/wanasit/chrono) to parse natural language dates:
- "tomorrow"
- "next friday"
- "in 3 days" or "3d"
- "oct 14 at noon"
- "2 weeks from now"

### Task Syntax
When creating tasks, you can use:
- `@label` - Add a label to the task
- `#date` - Set a due date using natural language
- Multiple labels: `@work @urgent @project`

Example:
```
Review PR for authentication feature @code-review @urgent #today
```

### List Views
- **Inbox**: All incomplete tasks
- **Today**: Tasks due today
- **Upcoming**: Tasks due after today
- **Completed**: All completed tasks

### Label Filtering
- Click any label in the sidebar to filter tasks
- Labels are automatically extracted from all tasks
- Each label gets a unique color

## Troubleshooting

### Can't connect to Airtable
- Verify your API key is correct
- Check that your Base ID starts with "app"
- Ensure the table name matches exactly (case-sensitive)
- Check your internet connection

### Tasks not loading
- Open DevTools (npm run dev) and check console
- Verify Airtable API permissions
- Ensure table structure matches requirements

### Global shortcut not working
- Make sure the app has accessibility permissions (macOS)
- Try restarting the application

## Built With

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [Airtable](https://airtable.com) - Cloud-based database
- [chrono-node](https://github.com/wanasit/chrono) - Natural language date parser
- [electron-store](https://github.com/sindresorhus/electron-store) - Settings storage

## Inspiration

This project is inspired by [Godspeed](https://godspeedapp.com/), a keyboard-driven task manager for macOS and iOS.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
