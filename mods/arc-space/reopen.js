import { spaces, panes, terminals, exec, shared, setShared } from "herdr";

const CLOSED = "arc-space.closed";
const KEEP = 20;

const RESUME = [
  { match: /oh-my-pi|\bomp\b/, argv: ["omp", "--continue"], help: ["omp", "--help"], flag: "--continue" },
  { match: /claude/, argv: ["claude", "--continue"], help: ["claude", "--help"], flag: "--continue" },
  { match: /codex/, argv: ["codex", "--no-daemon", "resume", "--last"], help: ["codex", "resume", "--help"], flag: "--last" },
  { match: /gemini/, argv: ["gemini", "--resume", "latest"], help: ["gemini", "--help"], flag: "--resume" },
  { match: /opencode/, argv: ["opencode", "--continue"], help: ["opencode", "--help"], flag: "--continue" },
  { match: /antigravity|\bagy\b/, argv: ["agy", "--continue"], help: ["agy", "--help"], flag: "--continue" },
  { match: /goose/, argv: ["goose", "session", "--resume"], help: ["goose", "session", "--help"], flag: "--resume" },
  { match: /crush/, argv: ["crush", "--continue"], help: ["crush", "--help"], flag: "--continue" },
  { match: /qwen/, argv: ["qwen", "--continue"], help: ["qwen", "--help"], flag: "--continue" },
  { match: /copilot/, argv: ["copilot", "--continue"], help: ["copilot", "--help"], flag: "--continue" },
  { match: /\bpi\b/, argv: ["pi", "--continue"], help: ["pi", "--help"], flag: "--continue" },
];

const supported = new Map();

function describe(p) {
  const t = terminals().find((x) => x.address === p.terminal);
  return {
    terminal: p.terminal,
    cwd: p.cwd,
    agent: Boolean(p.program?.agent),
    who: [p.program?.key, p.program?.name, p.app, t?.agent].filter(Boolean).join(" ").toLowerCase(),
  };
}

export function snapshot() {
  const all = panes();
  const out = {};
  for (const s of spaces()) {
    for (const tab of s.tabs) {
      const mine = all.filter((p) => p.tab === tab.id && p.terminal);
      if (mine.length) out[tab.id] = { space: s.id, name: tab.name, named: tab.named, panes: mine.map(describe) };
    }
  }
  return out;
}

export function recordClosed(before, after) {
  const live = new Set(panes().map((p) => p.terminal));
  const kept = new Set(spaces().map((s) => s.id));
  const gone = Object.entries(before)
    .filter(([id, tab]) => !after[id] && kept.has(tab.space) && !tab.panes.some((p) => live.has(p.terminal)))
    .map(([, tab]) => tab);
  if (gone.length) setShared(CLOSED, [...gone.reverse(), ...(shared(CLOSED) ?? [])].slice(0, KEEP));
}

async function resumeArgv(pane) {
  const rule = RESUME.find((r) => r.match.test(pane.who));
  if (!rule) return null;
  if (!supported.has(rule.argv[0])) {
    try {
      const r = await exec(rule.help[0], rule.help.slice(1), { cwd: pane.cwd ?? undefined, timeout: 8000 });
      supported.set(rule.argv[0], `${r.stdout}${r.stderr}`.includes(rule.flag));
    } catch {
      // The probe is a question, not an action: an agent that doesn't know
      // `--continue`/`--resume` fails here, so silence is the answer. The
      // reopen itself reports through its caller.
      supported.set(rule.argv[0], false);
    }
  }
  return supported.get(rule.argv[0]) ? rule.argv : null;
}

async function argvFor(pane) {
  if (!pane.agent) return null;
  const rule = RESUME.find((r) => r.match.test(pane.who));
  return (await resumeArgv(pane)) ?? (rule ? [rule.argv[0]] : null);
}

async function herdr(command, args) {
  const r = await exec("herdr-app", ["do", command, JSON.stringify(args)]);
  return JSON.parse(r.stdout);
}

export async function reopenLast() {
  const stack = shared(CLOSED) ?? [];
  const tab = stack[0];
  if (!tab) return false;
  setShared(CLOSED, stack.slice(1));
  const [first, ...rest] = tab.panes;
  const argv = await argvFor(first);
  const base = { folder: first.cwd ?? undefined, ...(argv ? { argv } : {}) };
  if (spaces().some((s) => s.id === tab.space)) {
    await herdr("tab.new", { space: tab.space, ...base, ...(tab.named ? { name: tab.name } : {}) });
  } else {
    await herdr("space.new", base);
  }
  for (const p of rest) {
    const a = await argvFor(p);
    await herdr("terminal.open", { place: "right", folder: p.cwd ?? undefined, ...(a ? { argv: a } : {}) });
  }
  return true;
}
