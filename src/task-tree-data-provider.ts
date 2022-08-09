import * as vscode from 'vscode';
import { getOrAdd } from './helpers';
import { TaskScope } from './task-scope';
import { taskFileRegExp, TaskSource } from './task-source';
import { TaskTreeItem } from "./task-tree-item";
import { TaskTreeItemType } from './task-tree-item-type';

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _tree: TaskTreeItem[] | undefined;
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
            this._tree = undefined;
            this._onDidChangeTreeData.fire(undefined);
        }
    };

    public getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
        if (element) {
            return element.children;
        } else {
            const treeItems = await this.getTree();
            return treeItems;
        }
    }

    public findTreeItem(task: vscode.Task): TaskTreeItem | undefined {
        if (!this._tree) {
            return undefined;
        }

        return TaskTreeDataProvider.findTreeItem(task, this._tree);
    }

    private static findTreeItem(task: vscode.Task, items: TaskTreeItem[]): TaskTreeItem | undefined {
        for (const child of items) {
            const match = TaskTreeDataProvider.findItemInSubtree(task, child);
            if (match) {
                return match;
            }
        }

        return undefined;
    }

    private static findItemInSubtree(task: vscode.Task, root: TaskTreeItem): TaskTreeItem | undefined {
        if (root.task === task) {
            return root;
        }

        return TaskTreeDataProvider.findTreeItem(task, root.children);
    }

    private static async getTasks(): Promise<vscode.Task[]> {
        const tasks = await vscode.tasks.fetchTasks();
        const excludePattern = vscode.workspace.getConfiguration("taskManager").get("exclude") as string | null;
        if (!excludePattern) {
            return tasks;
        }

        const excludeRegExp = new RegExp(excludePattern);
        return tasks.filter(task => !excludeRegExp.test(task.name));
}
    private static async generateTree(): Promise<TaskTreeItem[]> {
        const treeItemMap = new Map<string, TaskTreeItem>();
        const tasks = await TaskTreeDataProvider.getTasks();
        for (const task of tasks) {
            // Add scope item if not exist
            const scope = task.scope ?? vscode.TaskScope.Global;
            let path = TaskScope.getScopeName(scope);
            let parent = getOrAdd(
                treeItemMap,
                path,
                () => new TaskTreeItem(new TaskScope(scope), TaskTreeItemType.scope, path));

            // Add folder item if not exist
            const folderPath = task.definition.path as string | undefined;
            if (folderPath) {
                path = `${path}/${folderPath}`;
                parent = getOrAdd(
                    treeItemMap,
                    path,
                    () => new TaskTreeItem(folderPath, TaskTreeItemType.folder, path, parent)
                );
            }

            path = `${path}/${task.source}`;
            parent = getOrAdd(
                treeItemMap,
                path,
                () => new TaskTreeItem(task.source, TaskTreeItemType.source, path, parent)
            );

            path = `${path}/${task.name}`;
            new TaskTreeItem(task, TaskTreeItemType.task, path, parent);
        }

        let treeItems = Array
            .from(treeItemMap.values())
            .filter(item => item.type === TaskTreeItemType.scope);
        TaskTreeDataProvider.sortTree(treeItems);

        // If only one scope, lift its children to top level to reduce nesting
        return treeItems.length === 1 ? treeItems[0].children : treeItems;
    }

    private static sortTree(tree: TaskTreeItem[]): void {
        tree.sort(TaskTreeItem.compare);
        for (const item of tree) {
            if (item.children.length > 0) {
                this.sortTree(item.children);
            }
        }
    }

    private async getTree(): Promise<TaskTreeItem[]> {
        if (!this._tree) {
            this._tree = await TaskTreeDataProvider.generateTree();
        }

        return this._tree;
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
