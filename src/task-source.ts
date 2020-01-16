import { compareStrings } from "./helpers";
import { TaskScope } from "./task-scope";

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