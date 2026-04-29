import * as assert from "assert";

import * as vscode from "vscode";

import {
  findWorkspaceTaskSourceUri,
  getTaskSourcePosition,
  getTaskSourceUri,
} from "../task-source";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test("gets root workspace task source URI", async () => {
    const workspaceFolder = createWorkspaceFolder();
    const task = new vscode.Task(
      { type: "shell" },
      workspaceFolder,
      "build",
      "Workspace",
    );

    assert.strictEqual(
      (await getTaskSourceUri(task))?.toString(),
      vscode.Uri.joinPath(
        workspaceFolder.uri,
        ".vscode",
        "tasks.json",
      ).toString(),
    );
  });

  test("finds nested workspace task source URI without using task path", () => {
    const workspaceFolder = createWorkspaceFolder();
    const nestedTasksJsonUri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "packages",
      "api",
      ".vscode",
      "tasks.json",
    );
    const task = new vscode.Task(
      { type: "shell" },
      workspaceFolder,
      "build - tools/build-root",
      "Workspace",
    );
    task.definition["label"] = "build";
    task.definition["path"] = "tools/build-root";

    assert.strictEqual(
      findWorkspaceTaskSourceUri(task, [
        {
          uri: nestedTasksJsonUri,
          text: JSON.stringify({
            version: "2.0.0",
            tasks: [{ label: "build", type: "shell", command: "pnpm build" }],
          }),
        },
      ])?.toString(),
      nestedTasksJsonUri.toString(),
    );
  });

  test("finds workspace task source position for npm task", async () => {
    const workspaceFolder = createWorkspaceFolder();
    const task = new vscode.Task(
      { type: "npm" },
      workspaceFolder,
      "build",
      "Workspace",
    );
    task.definition["label"] = "build";
    task.definition["path"] = "packages/api";
    const document = await vscode.workspace.openTextDocument({
      language: "jsonc",
      content: JSON.stringify(
        {
          version: "2.0.0",
          tasks: [{ label: "build", type: "npm", script: "build" }],
        },
        undefined,
        2,
      ),
    });

    assert.strictEqual(getTaskSourcePosition(task, document).line, 4);
  });
});

function createWorkspaceFolder(): vscode.WorkspaceFolder {
  return {
    index: 0,
    name: "workspace",
    uri: vscode.Uri.file("/workspace"),
  };
}
