import * as vscode from 'vscode';
import { compareStrings } from './helpers';
import { TaskScope } from './task-scope';
import { taskFileRegExp, TaskSource } from './task-source';
import { TaskTreeItem } from "./task-tree-item";

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
            this._onDidChangeTreeData.fire(undefined);
        }
    };

    public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
        const tasks = await vscode.tasks.fetchTasks();
        if (element) {
            if (element.taskSource) {
                return TaskTreeDataProvider.getTasks(tasks, element.taskSource);
            } else {
                return TaskTreeDataProvider.getTaskSources(tasks, element.taskScope);
            }
        } else {
            const scopeNames = new Set<string>();
            tasks.forEach(task => scopeNames.add(TaskScope.getScopeName(task.scope)));
            if (scopeNames.size <= 1) {
                return TaskTreeDataProvider.getTaskSources(tasks);
            } else {
                return TaskTreeDataProvider.getTaskScopes(tasks);
            }
        }
    }

    private static getTaskScopes(tasks: vscode.Task[]): TaskTreeItem[] {
        const scopes: { [name: string]: TaskScope } = {};
        tasks.forEach(task => {
            const scopeName = TaskScope.getScopeName(task.scope);
            if (!(scopeName in scopes)) {
                scopes[scopeName] = new TaskScope(task.scope || vscode.TaskScope.Global);
            }
        });

        return Object.keys(scopes)
            .map(name => scopes[name])
            .sort(TaskScope.compare)
            .map(scope => new TaskTreeItem(scope));
    }

    private static getTaskSources(tasks: vscode.Task[], taskScope?: TaskScope): TaskTreeItem[] {
        const sources: { [name: string]: TaskSource } = {};
        tasks.forEach(task => {
            if ((!taskScope || task.scope === taskScope.data) && !(task.source in sources)) {
                sources[task.source] = new TaskSource(task.source, taskScope);
            }
        });
        return Object.keys(sources)
            .map(name => sources[name])
            .sort(TaskSource.compare)
            .map(source => new TaskTreeItem(source));
    }

    private static getTasks(tasks: vscode.Task[], taskSource: TaskSource): TaskTreeItem[] {
        return tasks
            .filter(task => task.source === taskSource.name && (!taskSource.taskScope || taskSource.taskScope.equals(task.scope)))
            .sort(compareTasks)
            .map(task => new TaskTreeItem(task));
    }

    private setupWatchers(added?: readonly vscode.WorkspaceFolder[], removed?: readonly vscode.WorkspaceFolder[]) {
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
