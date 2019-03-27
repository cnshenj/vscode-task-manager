import * as path from "path";
import * as vscode from 'vscode';

const basePath = path.join(__dirname, "..", "resources");
const taskSourcePath = path.join(basePath, "task-sources");
const taskSourceIcons = new Set<string>(["grunt", "gulp", "npm", "tsc"]);

export class TaskTreeItem extends vscode.TreeItem {
    public static readonly defaultSource = "Workspace";

    public readonly task: vscode.Task | undefined;
    public readonly taskSource: string;
    public readonly execution: vscode.TaskExecution | undefined;

    constructor(task: vscode.Task | string) {
        super(
            typeof task === "string" ? (task === TaskTreeItem.defaultSource ? "tasks.json" : task) : task.name,
            typeof task === "string" ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);


        if (typeof task === "string") {
            const taskSource = this.taskSource = task;
            const iconName = taskSourceIcons.has(taskSource)
                ? taskSource
                : (taskSource === TaskTreeItem.defaultSource ? "vscode" : "default");
            const iconPath = path.join(taskSourcePath, `task-source-${iconName}.svg`);
            this.iconPath = { dark: iconPath, light: iconPath };
            return;
        }

        this.task = task;
        this.taskSource = task.source;
        this.execution = vscode.tasks.taskExecutions.find(
            e => e.task.name === task.name && e.task.source === task.source);
        this.contextValue = this.execution ? "runningTask" : "task";
        this.tooltip = task.name;

        if (this.execution) {
            this.iconPath = {
                dark: path.join(basePath, `sync-inverse.svg`),
                light: path.join(basePath, `sync.svg`)
            };
        }
    }
}