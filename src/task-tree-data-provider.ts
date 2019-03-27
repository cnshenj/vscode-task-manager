import * as vscode from 'vscode';
import { TaskTreeItem } from "./task-tree-item";

const taskFileRegExp = /\/(?:\.vscode\/tasks\.json|Gruntfile\.coffee|Gruntfile\.js|gulpfile\.js|package\.json|tsconfig(?:\.[^.]+)*\.json)$/;

function compareStrings(a: string, b: string): number {
    return a < b ? -1 : (a > b ? 1 : 0);
}

function compareSources(a: string, b: string): number {
    if (a === TaskTreeItem.defaultSource) {
        return b === TaskTreeItem.defaultSource ? 0 : -1;
    } else if (b === TaskTreeItem.defaultSource) {
        return 1;
    }

    return compareStrings(a, b);
}

function compareTasks(a: vscode.Task, b: vscode.Task): number {
    return compareStrings(a.name, b.name);
}

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _watchers: { [key: string]: vscode.FileSystemWatcher[] } = {};
    private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined>();

    public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {
        this.setupWatchers();
        vscode.workspace.onDidChangeWorkspaceFolders(e => {
            this.refresh();
            this.setupWatchers(e.added, e.removed);
        });
    }

    public refresh = (fileUri?: vscode.Uri): void => {
        if (!fileUri || taskFileRegExp.test(fileUri.path)) {
            this._onDidChangeTreeData.fire();
        }
    }

    public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: TaskTreeItem): Thenable<TaskTreeItem[]> {
        const getChildItems = element ? this.getTasks.bind(undefined, element) : this.getTaskSources;
        return vscode.tasks.fetchTasks().then(getChildItems);
    }

    private getTaskSources = (tasks: vscode.Task[]): TaskTreeItem[] => {
        const sources = new Set<string>();
        tasks.forEach(task => sources.add(task.source));
        return Array.from(sources.values()).sort(compareSources).map(source => new TaskTreeItem(source));
    }

    private getTasks = (parent: TaskTreeItem, tasks: vscode.Task[]): TaskTreeItem[] => {
        return tasks
            .filter(task => task.source === parent.taskSource)
            .sort(compareTasks)
            .map(task => new TaskTreeItem(task));
    }

    private setupWatchers(added?: vscode.WorkspaceFolder[], removed?: vscode.WorkspaceFolder[]) {
        if (!added && !removed) {
            added = vscode.workspace.workspaceFolders;
        }

        if (added) {
            for (let workspaceFolder of added) {
                const tasksJsonWatcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(workspaceFolder, ".vscode/tasks.json"));
                tasksJsonWatcher.onDidChange(this.refresh);
                tasksJsonWatcher.onDidCreate(this.refresh);
                tasksJsonWatcher.onDidDelete(this.refresh);
                const otherWatcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(workspaceFolder, "*.*"));
                otherWatcher.onDidChange(this.refresh);
                otherWatcher.onDidCreate(this.refresh);
                otherWatcher.onDidDelete(this.refresh);
                this._watchers[workspaceFolder.uri.toString(true)] = [tasksJsonWatcher, otherWatcher];
            }
        }

        if (removed) {
            for (let workspaceFolder of removed) {
                const key = workspaceFolder.uri.toString(true);
                const watchers = this._watchers[key];
                if (watchers) {
                    watchers.forEach(watcher => watcher.dispose());
                    delete this._watchers[key];
                }
            }
        }
    }
}
