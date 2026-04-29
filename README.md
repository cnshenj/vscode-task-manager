# vscode-task-manager

Manages tasks in Visual Studio Code in a custom activity view.

## Features

- List all detected tasks grouped by sources, and by root folders
  - The task list is automatically refreshed when a common task file is changed (e.g. gulpfile.js)
- Run/terminate/restart tasks directly in the custom activity view
- View source files for Workspace, npm, and TypeScript tasks
- Keep frequently used tasks in a top-level Favorites group
- Running tasks are indicated by an animated icon
- Total number of running tasks is shown as view badge
- Exclude tasks using a regular expression pattern
- Automatically collapse large task trees
- Configure task sorting

## Configuration

### `taskManager.exclude`

Regular expression pattern for excluding tasks by name.

Example:

```json
{
  "taskManager.exclude": "^npm:"
}
```

### `taskManager.collapseLargeTaskTree`

Controls whether the task tree automatically collapses top-level groups when there are more than three groups and more than 30 tasks. Enabled by default.

Example:

```json
{
  "taskManager.collapseLargeTaskTree": false
}
```

### `taskManager.taskSortOrder`

Controls how task items are sorted in the task tree. Favorites always keep their default label and origin sort order.

Available values:

- `label` - Sort tasks alphabetically by label. This is the default.
- `group` - Sort tasks by task group, then alphabetically by label. Built-in groups are ordered as build, test, clean, and rebuild; custom groups are sorted by group id after those.
- `provider` - Keep tasks in the order returned by VS Code task providers. This is useful when a provider returns tasks in a meaningful order, but the exact order depends on VS Code and the provider.

Example:

```json
{
  "taskManager.taskSortOrder": "provider"
}
```

### Screenshot

![Screenshot](images/screenshot.png)

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Credits

- The extension icon (task.svg) is made by [Pixel perfect](https://www.flaticon.com/authors/pixel-perfect) from [Flaticon](https://www.flaticon.com/).
- The sync icon (sync.svg) is made by [Those Icons](https://www.flaticon.com/authors/those-icons) from [Flaticon](https://www.flaticon.com/).
