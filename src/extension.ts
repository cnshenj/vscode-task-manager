// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TaskTreeDataProvider } from "./task-tree-data-provider";
import { TaskTreeItem } from './task-tree-item';

const restartingTasks = new Set<vscode.Task>();
let treeView: vscode.TreeView<TaskTreeItem>;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const taskTreeDataProvider = new TaskTreeDataProvider();
    const updateTreeView = () => {
        taskTreeDataProvider.refresh();
        updateViewBadge();
    };

    const refreshTasksCommand = vscode.commands.registerCommand(
        "task-manager-tasks.refresh",
        updateTreeView);
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
    const restartTaskCommand = vscode.commands.registerCommand(
        "task-manager-tasks.restart",
        (taskTreeItem: TaskTreeItem) => {
            if (taskTreeItem.execution) {
                const task = taskTreeItem.execution.task!;
                restartingTasks.add(task);
                taskTreeItem.execution.terminate();
            }
        });

    context.subscriptions.push(refreshTasksCommand);
    context.subscriptions.push(configureTaskCommand);
    context.subscriptions.push(terminateAllTasksCommand);
    context.subscriptions.push(runTaskCommand);
    context.subscriptions.push(terminateTaskCommand);
    context.subscriptions.push(restartTaskCommand);

    vscode.tasks.onDidStartTask(updateTreeView);
    vscode.tasks.onDidEndTask((event) => {
        updateTreeView();
        const task = event.execution.task;
        if (restartingTasks.has(task)) {
            restartingTasks.delete(task);
            vscode.tasks.executeTask(task);
        }
    });
    treeView = vscode.window.createTreeView(
        "task-manager-tasks",
        {
            treeDataProvider: taskTreeDataProvider,
            showCollapseAll: true
        }
    );
}

// this method is called when your extension is deactivated
export function deactivate() { }

function updateViewBadge() {
    const count = vscode.tasks.taskExecutions.length;
    treeView.badge = {
        value: count,
        tooltip: `${count === 0 ? "No" : count.toString()} running ${count > 1 ? "tasks" : "task"}`
    };
}