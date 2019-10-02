# vscode-task-manager

Manages tasks in Visual Studio Code in a custom activity view.

## Features

- List all detected tasks grouped by sources
  * The task list is automatically refreshed when a common task file is changed (e.g. gulpfile.js)
- Run/terminate tasks directly in the custom activity view
- Running tasks are indicated by an icon

### Screenshot
![Screenshot](images/screenshot.png)

## Known Issues

- No number of running tasks badge on the custom activity icon due to lack of VSCode API ([#62783](https://github.com/Microsoft/vscode/issues/62783))

## Release Notes

### 0.2.0
Updated icons to match the new vscode style.

### 0.1.0

Initial release.

## Credits
- The extension icon (task.svg) is made by [Pixel perfect](https://www.flaticon.com/authors/pixel-perfect) from [Flaticon](https://www.flaticon.com/).
- The sync icon (sync.svg) is made by [Those Icons](https://www.flaticon.com/authors/those-icons) from [Flaticon](https://www.flaticon.com/).
