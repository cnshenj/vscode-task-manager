import * as vscode from 'vscode';

export class TaskScope {
    public readonly data: vscode.TaskScope | vscode.WorkspaceFolder;
    public readonly name: string;
    public readonly index: number;
    public readonly description: string | undefined;

    constructor(data: vscode.TaskScope | vscode.WorkspaceFolder) {
        this.data = data;
        this.name = TaskScope.getScopeName(data);

        if (typeof data === "number") {
            this.index = data;
        } else {
            this.index = 10000 + data.index;
            const uri = data.uri as vscode.Uri;
            this.description = uri.toString(true);
        }
    }

    public static getScopeName(data: vscode.TaskScope | vscode.WorkspaceFolder): string {
        if (typeof data === "number") {
            return vscode.TaskScope[data];
        } else {
            return data.name;
        }
    }

    public static compare(a: TaskScope, b: TaskScope): number {
        return a.index - b.index;
    }

    public equals(data?: vscode.TaskScope | vscode.WorkspaceFolder): boolean {
        if (this.data === data) {
            return true;
        }

        if (typeof this.data === "object" && typeof data === "object") {
            return this.data.uri === data.uri;
        }

        return false;
    }
}
