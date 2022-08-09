import * as path from "path";
import * as vscode from 'vscode';
import { compareStrings } from "./helpers";
import { TaskScope } from "./task-scope";
import { TaskSource, taskSourceMappings } from "./task-source";
import { TaskTreeItemType } from "./task-tree-item-type";

type TaskData = string | vscode.Task | TaskScope;

const basePath = path.join(__dirname, "..", "resources");

export class TaskTreeItem extends vscode.TreeItem {
    public readonly type: TaskTreeItemType;
    public readonly path: string;
    public readonly taskScope: TaskScope | undefined;
    public readonly task: vscode.Task | undefined;
    public readonly execution: vscode.TaskExecution | undefined;
    public children: TaskTreeItem[] = [];

    constructor(data: TaskData, type: TaskTreeItemType, taskPath: string, parent?: TaskTreeItem) {
        super(TaskTreeItem.getItemLabel(data), TaskTreeItem.getInitialCollapsibleState(data));

        this.type = type;
        this.path = taskPath;
        if (data instanceof TaskScope) {
            this.taskScope = data;
            this.tooltip = data.description;
        } else if (typeof data === "string") {
            const label = !this.label
                ? ""
                : (typeof this.label === "string" ? this.label : this.label.label);
            this.tooltip = label;
            const taskSourceFileName = taskSourceMappings[label.toLocaleLowerCase()];
            if (type === TaskTreeItemType.source && taskSourceFileName) {
                this.iconPath = vscode.ThemeIcon.File;
                this.resourceUri = vscode.Uri.file(`/${taskSourceFileName}`);
            } else {
                this.iconPath = vscode.ThemeIcon.Folder;
            }
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

        if (parent) {
            parent.children.push(this);
        }
    }

    public static compare(x: TaskTreeItem, y: TaskTreeItem): number {
        if (x.type !== y.type) {
            return x.type - y.type;
        }

        if (x.taskScope && y.taskScope) {
            return TaskScope.compare(x.taskScope, y.taskScope);
        }

        return compareStrings(x.label as string, y.label as string);
    }

    private static getItemLabel(data: TaskData): string {
        if (typeof data === "string") {
            return data;
        } else if (typeof data === "object" && "name" in data) {
            if (data instanceof vscode.Task) {
                const folderPath = data.definition.path as string | undefined;
                if (folderPath) {
                    const postfix = ` - ${folderPath}`;
                    if (data.name.endsWith(postfix)) {
                        return data.name.slice(0, -postfix.length);
                    }
    
                }
            }

            return data.name ?? "";
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
