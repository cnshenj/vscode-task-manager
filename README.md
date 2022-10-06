# vscode-task-manager

Manages tasks in Visual Studio Code in a custom activity view.

## Features

- List all detected tasks grouped by sources, and by root folders
  * The task list is automatically refreshed when a common task file is changed (e.g. gulpfile.js)
- Run/terminate/restart tasks directly in the custom activity view
- Running tasks are indicated by an animated icon
- Total number of running tasks is shown as view badge
- Exclude tasks using a regular expression pattern `taskManager.exclude`

### Screenshot
![Screenshot](images/screenshot.png)

## Release Notes

### 1.0.0
- View badge to indicate how many tasks are running

### 0.7.0
- Organize tasks by scope/folder/source.

### 0.6.0
- Added configuration `taskManager.exclude`.

### 0.5.0
- Added menu item to restart running tasks.

### 0.4.2
- Use built-in codicon in commands.
- Fix a bug that doesn't show icon for tasks in execution.

### 0.4.1
- Bundle the extension using webpack.

### 0.4.0
- Use theme icons provided by vscode instead of custom icons for task sources.

### 0.3.0
- Tasks from different root folders in multi-root workspaces are separated.
- Animated running task icon.

### 0.2.0
Updated icons to match the new vscode style.

### 0.1.0
Initial release.

## Credits
- The extension icon (task.svg) is made by [Pixel perfect](https://www.flaticon.com/authors/pixel-perfect) from [Flaticon](https://www.flaticon.com/).
- The sync icon (sync.svg) is made by [Those Icons](https://www.flaticon.com/authors/those-icons) from [Flaticon](https://www.flaticon.com/).
