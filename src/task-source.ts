import { compareStrings } from "./helpers";
import { TaskScope } from "./task-scope";

export const taskSourceMappings: { [key: string]: string } = {
    "ant": "build.xml",
    "gradle": "build.gradle",
    "grunt": "Gruntfile.js",
    "gulp": "gulpfile.js",
    "jake": "jakefile.js",
    "maven": "pom.xml",
    "npm": "package.json",
    "rake": "Rakefile",
    "rust": "main.rs",
    "tsc": "tsconfig.json",
    "workspace": "tasks.json"
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
    /\.vscode[\\/]tasks\.json/ // Workspace
];

export const taskFileRegExp = new RegExp(`/(?:${taskFilePatterns.map(p => p.source).join("|")})$`, "i");

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