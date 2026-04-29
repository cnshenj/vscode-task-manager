import * as path from "path";
import { TextDecoder } from "util";

import {
  findNodeAtLocation,
  getNodeValue,
  type Node as JsonNode,
  parseTree,
} from "jsonc-parser";
import * as vscode from "vscode";

import { compareStrings } from "./helpers";
import { TaskScope } from "./task-scope";
import { TwoLevelCache } from "./two-level-cache";

export const taskSourceMappings: { [key: string]: string } = {
  ant: "build.xml",
  gradle: "build.gradle",
  grunt: "Gruntfile.js",
  gulp: "gulpfile.js",
  jake: "jakefile.js",
  maven: "pom.xml",
  npm: "package.json",
  rake: "Rakefile",
  rust: "main.rs",
  tsc: "tsconfig.json",
  workspace: "tasks.json",
};

const taskFilePatterns = [
  /build\.xml/, // Ant
  /build\.gradle/, //Gradle
  /Gruntfile\.(?:coffee|js)/, // Grunt
  /gulpfile\.js/, // Gulp
  /Jakefile(?:\.js)?/, // Jake
  /pom\.xml/, // Maven
  /package\.json/, // NPM
  /Rakefile/, // Rake
  /Cargo\.toml/, // Rust Cargo
  /tsconfig(?:\.[^.]+)*\.json/, // TypeScript
  /\.vscode[\\/]tasks\.json/, // Workspace
];

export const taskFileRegExp = new RegExp(
  `/(?:${taskFilePatterns.map((p) => p.source).join("|")})$`,
  "i",
);

export interface TaskSourceDocument {
  document: vscode.TextDocument;
  position: vscode.Position;
}

export interface WorkspaceTaskSourceFile {
  uri: vscode.Uri;
  text: string;
}

const workspaceTaskSourceFilesByWorkspace = new TwoLevelCache<
  string,
  string,
  WorkspaceTaskSourceFile
>();

export function invalidateWorkspaceTaskSourceFileCache(uri: vscode.Uri): void {
  const uriKey = uri.toString(true);
  if (workspaceTaskSourceFilesByWorkspace.deleteLayer(uriKey)) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    return;
  }

  const workspaceKey = workspaceFolder.uri.toString(true);
  workspaceTaskSourceFilesByWorkspace.updateValue(
    workspaceKey,
    uriKey,
    async () => await readWorkspaceTaskSourceFile(uri),
  );
}

export class TaskSource {
  public static readonly defaultName = "Workspace";

  public readonly name: string;
  public readonly taskScope: TaskScope | undefined;

  constructor(name: string, taskScope?: TaskScope) {
    this.name = name;
    this.taskScope = taskScope;
  }

  public static compare(a: TaskSource, b: TaskSource): number {
    if (a.name === TaskSource.defaultName) {
      return b.name === TaskSource.defaultName ? 0 : -1;
    } else if (b.name === TaskSource.defaultName) {
      return 1;
    }

    return compareStrings(a.name, b.name);
  }
}

export async function openTaskSourceDocument(
  task: vscode.Task,
): Promise<TaskSourceDocument | undefined> {
  const uri = await getTaskSourceUri(task);
  if (!uri) {
    return undefined;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  return {
    document,
    position: getTaskSourcePosition(task, document),
  };
}

export async function getTaskSourceUri(
  task: vscode.Task,
): Promise<vscode.Uri | undefined> {
  const taskType = getTaskDefinitionString(task, "type")?.toLocaleLowerCase();
  const taskSource = task.source.toLocaleLowerCase();

  if (taskSource === "workspace") {
    return await getWorkspaceTaskSourceUri(task);
  }

  const workspaceFolder = getTaskWorkspaceFolder(task);
  if (!workspaceFolder) {
    return undefined;
  }

  if (taskType === "npm" || taskSource === "npm") {
    return joinTaskSourcePath(
      workspaceFolder.uri,
      getTaskPath(task),
      "package.json",
    );
  }

  if (
    taskType === "typescript" ||
    taskType === "tsc" ||
    taskSource === "typescript" ||
    taskSource === "tsc"
  ) {
    return joinTaskSourcePath(
      workspaceFolder.uri,
      getTaskPath(task),
      getTaskDefinitionString(task, "tsconfig") ?? "tsconfig.json",
    );
  }

  return undefined;
}

async function getWorkspaceTaskSourceUri(
  task: vscode.Task,
): Promise<vscode.Uri | undefined> {
  if (
    task.scope === vscode.TaskScope.Workspace &&
    vscode.workspace.workspaceFile
  ) {
    return vscode.workspace.workspaceFile;
  }

  const workspaceFolder = getTaskWorkspaceFolder(task);
  if (!workspaceFolder) {
    return undefined;
  }

  return (
    (await findWorkspaceTaskSourceUriInWorkspace(task, workspaceFolder)) ??
    vscode.Uri.joinPath(workspaceFolder.uri, ".vscode", "tasks.json")
  );
}

async function findWorkspaceTaskSourceUriInWorkspace(
  task: vscode.Task,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<vscode.Uri | undefined> {
  return findWorkspaceTaskSourceUri(
    task,
    await getWorkspaceTaskSourceFiles(workspaceFolder),
    workspaceFolder.uri,
  );
}

function getWorkspaceTaskSourceFiles(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<WorkspaceTaskSourceFile[]> {
  const key = workspaceFolder.uri.toString(true);
  return workspaceTaskSourceFilesByWorkspace.getValues(
    key,
    async () => await readWorkspaceTaskSourceFiles(workspaceFolder),
  );
}

async function readWorkspaceTaskSourceFiles(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<Map<string, WorkspaceTaskSourceFile>> {
  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, "**/.vscode/tasks.json"),
  );
  const files = await Promise.all(
    uris.map(async (uri) => await readWorkspaceTaskSourceFile(uri)),
  );

  return new Map(
    files
      .filter((file) => file !== undefined)
      .map((file) => [file.uri.toString(true), file]),
  );
}

async function readWorkspaceTaskSourceFile(
  uri: vscode.Uri,
): Promise<WorkspaceTaskSourceFile | undefined> {
  try {
    const content = await vscode.workspace.fs.readFile(uri);
    return { uri, text: new TextDecoder().decode(content) };
  } catch {
    return undefined;
  }
}

export function findWorkspaceTaskSourceUri(
  task: vscode.Task,
  files: readonly WorkspaceTaskSourceFile[],
  workspaceFolderUri?: vscode.Uri,
): vscode.Uri | undefined {
  const exactMatches = findWorkspaceTaskSourceUriMatches(task, files, true);
  if (exactMatches.length > 0) {
    return chooseWorkspaceTaskSourceUri(exactMatches, task, workspaceFolderUri);
  }

  return chooseWorkspaceTaskSourceUri(
    findWorkspaceTaskSourceUriMatches(task, files, false),
    task,
    workspaceFolderUri,
  );
}

function findWorkspaceTaskSourceUriMatches(
  task: vscode.Task,
  files: readonly WorkspaceTaskSourceFile[],
  exactTaskNameOnly: boolean,
): vscode.Uri[] {
  const matches: vscode.Uri[] = [];
  for (const file of files) {
    const root = parseTree(file.text);
    if (root && findWorkspaceTaskNode(task, root, exactTaskNameOnly)) {
      matches.push(file.uri);
    }
  }

  return matches;
}

function chooseWorkspaceTaskSourceUri(
  uris: readonly vscode.Uri[],
  task: vscode.Task,
  workspaceFolderUri: vscode.Uri | undefined,
): vscode.Uri | undefined {
  if (uris.length <= 1) {
    return uris[0];
  }

  const taskPath = getTaskPath(task);
  if (!taskPath || !workspaceFolderUri) {
    return uris[0];
  }

  const pathUri = joinTaskSourcePath(
    workspaceFolderUri,
    taskPath,
    ".vscode/tasks.json",
  );
  return uris.find((uri) => uri.toString() === pathUri.toString()) ?? uris[0];
}

export function getTaskSourcePosition(
  task: vscode.Task,
  document: vscode.TextDocument,
): vscode.Position {
  try {
    const root = parseTree(document.getText());
    if (!root) {
      return getStartOfDocumentPosition();
    }

    const taskType = getTaskDefinitionString(task, "type")?.toLocaleLowerCase();
    const taskSource = task.source.toLocaleLowerCase();
    const node =
      taskSource === "workspace"
        ? findWorkspaceTaskNode(task, root)
        : taskType === "npm" || taskSource === "npm"
          ? findNpmTaskNode(task, root)
          : undefined;

    return node
      ? getNodePosition(document, node)
      : getStartOfDocumentPosition();
  } catch {
    return getStartOfDocumentPosition();
  }
}

function findNpmTaskNode(
  task: vscode.Task,
  root: JsonNode,
): JsonNode | undefined {
  const script = getTaskDefinitionString(task, "script") ?? task.name;
  return getPropertyNode(findNodeAtLocation(root, ["scripts", script]));
}

function findWorkspaceTaskNode(
  task: vscode.Task,
  root: JsonNode,
  exactTaskNameOnly = false,
): JsonNode | undefined {
  const tasksNode = findTasksNode(root);
  if (!tasksNode?.children) {
    return undefined;
  }

  const taskNames = getWorkspaceTaskNames(task, exactTaskNameOnly);
  for (const taskNode of tasksNode.children) {
    const labelNode = findNodeAtLocation(taskNode, ["label"]);
    const taskNameNode = findNodeAtLocation(taskNode, ["taskName"]);
    if (
      taskNames.has(getOptionalNodeValue(labelNode)) ||
      taskNames.has(getOptionalNodeValue(taskNameNode))
    ) {
      return labelNode ? getPropertyNode(labelNode) : taskNode;
    }
  }

  return undefined;
}

function getWorkspaceTaskNames(
  task: vscode.Task,
  exactTaskNameOnly: boolean,
): Set<unknown> {
  const taskNames = new Set<unknown>([task.name]);
  addTaskDefinitionName(taskNames, task, "label", exactTaskNameOnly);
  addTaskDefinitionName(taskNames, task, "taskName", exactTaskNameOnly);

  return taskNames;
}

function addTaskDefinitionName(
  taskNames: Set<unknown>,
  task: vscode.Task,
  key: string,
  exactTaskNameOnly: boolean,
): void {
  if (exactTaskNameOnly) {
    return;
  }

  const name = getTaskDefinitionString(task, key);
  if (name) {
    taskNames.add(name);
  }
}

function findTasksNode(root: JsonNode): JsonNode | undefined {
  const tasksNode = findNodeAtLocation(root, ["tasks"]);
  return tasksNode?.type === "array"
    ? tasksNode
    : findNodeAtLocation(root, ["tasks", "tasks"]);
}

function getOptionalNodeValue(node: JsonNode | undefined): unknown {
  return node ? getNodeValue(node) : undefined;
}

function getPropertyNode(node: JsonNode | undefined): JsonNode | undefined {
  return node?.parent?.type === "property" ? node.parent : node;
}

function getNodePosition(
  document: vscode.TextDocument,
  node: JsonNode,
): vscode.Position {
  return document.positionAt(node.offset);
}

function getStartOfDocumentPosition(): vscode.Position {
  return new vscode.Position(0, 0);
}

function getTaskWorkspaceFolder(
  task: vscode.Task,
): vscode.WorkspaceFolder | undefined {
  if (typeof task.scope === "object") {
    return task.scope;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  return workspaceFolders?.length === 1 ? workspaceFolders[0] : undefined;
}

function getTaskPath(task: vscode.Task): string | undefined {
  return getTaskDefinitionString(task, "path");
}

function getTaskDefinitionString(
  task: vscode.Task,
  key: string,
): string | undefined {
  const value = task.definition[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function joinTaskSourcePath(
  workspaceFolderUri: vscode.Uri,
  taskPath: string | undefined,
  sourcePath: string,
): vscode.Uri {
  if (path.isAbsolute(sourcePath)) {
    return vscode.Uri.file(sourcePath);
  }

  const sourcePathParts = splitPath(sourcePath);
  if (!taskPath) {
    return vscode.Uri.joinPath(workspaceFolderUri, ...sourcePathParts);
  }

  if (path.isAbsolute(taskPath)) {
    return vscode.Uri.file(path.join(taskPath, ...sourcePathParts));
  }

  return vscode.Uri.joinPath(
    workspaceFolderUri,
    ...splitPath(taskPath),
    ...sourcePathParts,
  );
}

function splitPath(filePath: string): string[] {
  return filePath.split(/[\\/]+/).filter((part) => part.length > 0);
}
