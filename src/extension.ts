// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { TaskTreeDataProvider } from "./task-tree-data-provider";
import { TaskTreeItem } from './task-tree-item';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const taskTreeDataProvider = new TaskTreeDataProvider();
    const refreshTasksCommand = vscode.commands.registerCommand(
        "task-manager-tasks.refresh",
        () => { taskTreeDataProvider.refresh(); });
    const configureTaskCommand = vscode.commands.registerCommand(
        "task-manager-tasks.configure",
        () => { vscode.commands.executeCommand("workbench.action.tasks.configureTaskRunner"); });
    const terminateAllTasksCommand = vscode.commands.registerCommand(
        "task-manager-tasks.terminateAll",
        () => { vscode.tasks.taskExecutions.slice().forEach(e => e.terminate()); });
    const runTaskCommand = vscode.commands.registerCommand(
        "task-manager-tasks.run",
        (taskTreeItem: TaskTreeItem) => { vscode.tasks.executeTask(taskTreeItem.task!); });
    const terminateTaskCommand = vscode.commands.registerCommand(
        "task-manager-tasks.terminate",
        (taskTreeItem: TaskTreeItem) => {
            if (taskTreeItem.execution) {
                taskTreeItem.execution.terminate();
            }
        });

    context.subscriptions.push(refreshTasksCommand);
    context.subscriptions.push(configureTaskCommand);
    context.subscriptions.push(terminateAllTasksCommand);
    context.subscriptions.push(runTaskCommand);
    context.subscriptions.push(terminateTaskCommand);

    vscode.tasks.onDidStartTask(() => taskTreeDataProvider.refresh());
    vscode.tasks.onDidEndTask(() => taskTreeDataProvider.refresh());
    vscode.window.registerTreeDataProvider("task-manager-tasks", taskTreeDataProvider);
}

// this method is called when your extension is deactivated
export function deactivate() { }
