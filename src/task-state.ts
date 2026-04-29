import * as vscode from "vscode";

const taskStateRefreshDelays = [0, 250];

export function createTaskStateChangeHandler(
  onDidChange: () => void,
): () => void {
  let taskStateSignature = getTaskStateSignature();
  const updateIfTaskStatesChanged = () => {
    const nextTaskStateSignature = getTaskStateSignature();
    if (nextTaskStateSignature === taskStateSignature) {
      return;
    }

    taskStateSignature = nextTaskStateSignature;
    onDidChange();
  };

  return () => {
    for (const delay of taskStateRefreshDelays) {
      if (delay === 0) {
        updateIfTaskStatesChanged();
      } else {
        setTimeout(updateIfTaskStatesChanged, delay);
      }
    }
  };
}

function getTaskStateSignature(): string {
  return JSON.stringify(
    vscode.tasks.taskExecutions
      .map((execution) => getTaskId(execution.task))
      .sort(),
  );
}

function getTaskId(task: vscode.Task): string {
  const scope =
    typeof task.scope === "number"
      ? task.scope.toString()
      : task.scope?.uri.toString(true);
  const folderPath = task.definition["path"] as string | undefined;
  return JSON.stringify([
    scope ?? "",
    folderPath ?? "",
    task.source,
    task.name,
  ]);
}
