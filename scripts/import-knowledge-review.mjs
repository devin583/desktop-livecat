import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const memoryPath = expandHome(
  args.memory ?? "~/.codex/automations/desktop-livecat-pet-knowledge-review/memory.md",
);
const worktreePath = expandHome(args.worktree ?? "~/.codex/worktrees/eda4/pets");
const outPath = path.resolve(root, args.out ?? "docs/pet-knowledge-automation.md");
const importedAt = new Date().toISOString();

const memory = readText(memoryPath);
const status = gitOutput(worktreePath, ["status", "--short"]);
const diffStat = gitOutput(worktreePath, ["diff", "--stat"]);
const diffNames = gitOutput(worktreePath, ["diff", "--name-only"]);
const entry = renderEntry({
  diffNames,
  diffStat,
  importedAt,
  memory,
  memoryPath,
  status,
  worktreePath,
});
const next = mergeEntry(readText(outPath), entry);

if (args["dry-run"]) {
  process.stdout.write(next);
} else {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, next, "utf8");
  console.log(`Imported knowledge review into ${path.relative(root, outPath)}`);
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value =
      rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--") ? rawArgs[++index] : "true";
    parsed[key] = value;
  }
  return parsed;
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.resolve(root, value);
}

function readText(filePath) {
  if (!existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8").trimEnd();
}

function gitOutput(cwd, gitArgs) {
  if (!existsSync(cwd)) return `missing worktree: ${cwd}`;
  const result = spawnSync("git", ["-C", cwd, ...gitArgs], { encoding: "utf8" });
  if (result.status !== 0) {
    return (result.stderr || result.stdout || `git ${gitArgs.join(" ")} failed`).trim();
  }
  return (result.stdout || "(clean)").trim();
}

function renderEntry(input) {
  return `## Imported Review - ${input.importedAt}

- Source memory: \`${input.memoryPath}\`
- Source worktree: \`${input.worktreePath}\`
- Changed files:

${indentBlock(input.diffNames || "(none)")}

### Automation Memory

${fenced(input.memory || "(memory file missing or empty)")}

### Source Worktree Status

${fenced(input.status || "(clean)")}

### Source Worktree Diff Stat

${fenced(input.diffStat || "(none)")}
`;
}

function mergeEntry(previous, entry) {
  const header = `# Desktop LiveCat Knowledge Automation Ledger

This file makes the five-hour Codex pet-knowledge review visible in the main
repository. Each imported entry records the automation memory and the source
worktree diff/status that would otherwise stay inside Codex's isolated runtime.

Run:

\`\`\`bash
npm run knowledge:import
\`\`\`
`;

  if (!previous.trim()) return `${header}\n${entry}\n`;

  const oldEntries = previous
    .split(/\n(?=## Imported Review - )/g)
    .filter((section) => section.startsWith("## Imported Review - "))
    .slice(0, 11);
  return `${header}\n${entry}\n${oldEntries.join("\n")}${oldEntries.length ? "\n" : ""}`;
}

function fenced(value) {
  return `\`\`\`text\n${value.replaceAll("```", "` ` `")}\n\`\`\``;
}

function indentBlock(value) {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}
