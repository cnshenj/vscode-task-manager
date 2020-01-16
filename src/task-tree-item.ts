import * as path from "path";
import * as vscode from 'vscode';
import { TaskScope } from "./task-scope";
import { TaskSource } from "./task-source";

type TaskData = vscode.Task | TaskSource | TaskScope;

const basePath = path.join(__dirname, "..", "resources");
const taskSourcePath = path.join(basePath, "task-sources");
const taskSourceIcons = new Set<string>(["grunt", "gulp", "npm", "tsc"]);

export class TaskTreeItem extends vscode.TreeItem {
    public readonly taskScope: TaskScope | undefined;
    public readonly taskSource: TaskSource | undefined;
    public readonly task: vscode.Task | undefined;
    public readonly execution: vscode.TaskExecution | undefined;

    constructor(data: TaskData) {
        super(TaskTreeItem.getItemName(data), TaskTreeItem.getInitialCollapsibleState(data));

        if (data instanceof TaskScope) {
            this.taskScope = data;
            this.tooltip = data.description;
        } else if (data instanceof TaskSource) {
            this.taskSource = data;
            const taskSourceName = this.taskSource.name;
            const iconName = taskSourceIcons.has(taskSourceName)
                ? taskSourceName
                : (taskSourceName === TaskSource.defaultName ? "vscode" : "default");
            const iconPath = path.join(taskSourcePath, `task-source-${iconName}.svg`);
            this.iconPath = { dark: iconPath, light: iconPath };
        } else {
            this.task = data;
            this.execution = vscode.tasks.taskExecutions.find(
                e => e.task.name === data.name && e.task.source === data.source);
            this.contextValue = this.execution ? "runningTask" : "task";
            this.tooltip = data.name;

            if (this.execution) {
                this.iconPath = {
                    dark: path.join(basePath, `sync-dark.svg`),
                    light: path.join(basePath, `sync-light.svg`)
                };
            }
        }
    }

    private static getItemName(data: TaskData): string {
        if (typeof data === "string") {
            return data;
        } else if (typeof data === "object" && "name" in data) {
            return data.name;
        } else {
            return "";
        }
    }

    private static getInitialCollapsibleState(data: TaskData): vscode.TreeItemCollapsibleState {
        return data instanceof vscode.Task
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Expanded;
    }
}
