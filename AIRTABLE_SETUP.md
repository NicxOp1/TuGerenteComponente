# Airtable Setup Guide

This guide will help you set up your Airtable base for use with the Godspeed Task Manager.

## Step 1: Create an Airtable Account

1. Go to [https://airtable.com](https://airtable.com)
2. Sign up for a free account (or log in if you already have one)

## Step 2: Create a New Base

1. Click "Add a base" on your Airtable home screen
2. Choose "Start from scratch"
3. Name your base (e.g., "Task Manager" or "Personal Tasks")

## Step 3: Set Up the Tasks Table

Your base will come with a default table. Rename it to "Tasks" or keep the default name and update the app settings accordingly.

### Required Fields

Create the following fields in your Tasks table:

#### 1. Name (Single line text)
- **Type**: Single line text
- **Description**: The title of the task
- This field is created by default

#### 2. Status (Single select)
- **Type**: Single select
- **Options**: Todo, In Progress, Done
- **Default**: Todo
- Click the dropdown next to "Name" → "+" → Select "Single select"

#### 3. Completed (Checkbox)
- **Type**: Checkbox
- **Description**: Indicates if the task is complete
- Click "+" → Select "Checkbox"

#### 4. DueDate (Date)
- **Type**: Date
- **Description**: When the task is due
- **Include time**: No
- Click "+" → Select "Date"

#### 5. Labels (Single line text)
- **Type**: Single line text
- **Description**: Comma-separated labels (e.g., "work, urgent")
- Click "+" → Select "Single line text"

#### 6. Notes (Long text)
- **Type**: Long text
- **Description**: Additional notes about the task
- Click "+" → Select "Long text"

#### 7. Created (Date)
- **Type**: Date
- **Description**: When the task was created
- **Include time**: Yes
- Click "+" → Select "Date"

#### 8. CompletedDate (Date)
- **Type**: Date
- **Description**: When the task was marked complete
- **Include time**: No
- Click "+" → Select "Date"

### Table Structure Visual

```
| Name              | Status | Completed | DueDate    | Labels           | Notes | Created            | CompletedDate |
|-------------------|--------|-----------|------------|------------------|-------|-------------------|---------------|
| Single line text  | Select | Checkbox  | Date       | Single line text | Text  | Date (with time)  | Date          |
```

## Step 4: Get Your API Credentials

### Get Your API Key

1. Click on your profile picture in the top right
2. Go to "Account"
3. Scroll to "API" section
4. Click "Generate personal access token"
5. Give it a name (e.g., "Godspeed Task Manager")
6. Set the following scopes:
   - `data.records:read` - Read records
   - `data.records:write` - Create/update records
   - `schema.bases:read` - Read base schema
7. Select the base you just created
8. Click "Create token"
9. **IMPORTANT**: Copy this token immediately! You won't be able to see it again

### Get Your Base ID

1. Go to [https://airtable.com/api](https://airtable.com/api)
2. Click on your base
3. In the introduction section, you'll see your Base ID
   - It looks like: `appXXXXXXXXXXXXXX`
   - Example: `app1234567890abcd`

## Step 5: Configure the App

1. Open the Godspeed Task Manager application
2. Click the settings icon (⚙️) or press `S`
3. Enter your credentials:
   - **Airtable API Key**: Paste the personal access token you created
   - **Airtable Base ID**: Enter the Base ID (starts with "app")
   - **Table Name**: Enter "Tasks" (or whatever you named your table)
4. Click "Save Settings"

## Step 6: Test Your Connection

1. Try adding a task using the quick entry:
   ```
   Test task @test #tomorrow
   ```
2. Press Enter
3. Check your Airtable base - the task should appear!
4. Check the box to complete it - it should update in Airtable

## Troubleshooting

### "Failed to connect to Airtable"

**Possible causes:**
- API key is incorrect or expired
- Base ID is wrong
- Table name doesn't match
- API token doesn't have correct permissions

**Solutions:**
1. Regenerate your API token with correct scopes
2. Double-check your Base ID from the API docs
3. Verify table name is exact match (case-sensitive)
4. Ensure your token has access to the specific base

### "Failed to load tasks"

**Possible causes:**
- Table structure doesn't match requirements
- Network connectivity issues
- API rate limits

**Solutions:**
1. Verify all required fields exist in your table
2. Check field types match the requirements
3. Check your internet connection
4. Wait a moment and try refreshing

### Tasks not syncing

**Possible causes:**
- Airtable field names don't match exactly
- Field types are incorrect

**Solutions:**
1. Field names are case-sensitive - make sure they match exactly
2. Re-create fields with correct types if needed

## Advanced: Views and Filters

You can create custom views in Airtable:

1. **Active Tasks View**: Filter where `Completed` is not checked
2. **Overdue View**: Filter where `DueDate` is before today and `Completed` is not checked
3. **This Week View**: Filter where `DueDate` is within 7 days

The app will sync all records regardless of the view you're looking at in Airtable.

## Tips

- Keep your API key secure - never share it or commit it to version control
- Regularly back up your Airtable base
- Use the Airtable mobile app to access your tasks on the go
- Create automations in Airtable to send reminders for due tasks
- Use Airtable's color coding in views to organize tasks visually

## Example Task Data

Here's how data looks in Airtable:

| Name | Status | Completed | DueDate | Labels | Notes | Created |
|------|--------|-----------|---------|--------|-------|---------|
| Complete project report | Todo | ☐ | 2024-01-15 | work, urgent | Need to include Q4 metrics | 2024-01-10 10:30 AM |
| Buy groceries | Todo | ☐ | 2024-01-12 | personal, shopping | Milk, eggs, bread | 2024-01-11 3:45 PM |
| Call dentist | Done | ☑ | 2024-01-11 | personal, health | Scheduled for next week | 2024-01-10 2:15 PM |

## Need Help?

- [Airtable API Documentation](https://airtable.com/api)
- [Airtable Support](https://support.airtable.com)
- Check the main README.md for app usage instructions
