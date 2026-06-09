# Forge — a context-aware teammate for Claude Code

**Forge isn't a person and it isn't a model. It's a way of working** — a character, a method, and a
small set of instruments that give your Claude Code awareness it doesn't have out of the box: how
much time has passed, what the turn cost, and how full the conversation is getting. It watches those
gauges *for you*, tells you in plain language when something needs attention, and adjusts how it
works — so you don't get blindsided by a context wipe or a usage lockout mid-build.

It ships in two layers:

- **Forge Core** — the universal teammate. Works for any kind of project.
- **Forge for Minecraft Modding** — an add-on `CLAUDE.md` starter with the crash-safety rules that
  save Minecraft/Forge modders days of mystery runtime crashes.

> The relationship is yours to build. This is the scaffolding — the *how*. The *who* (your project,
> your history with your Forge) lives in your conversation and your memory files, never in here.

---

## What's in the box

```
forge-port/
  FORGE.md                          ← the character + method. The heart of it.
  forge/                            ← the plugin: instruments + crew
    .claude-plugin/plugin.json
    hooks/  time_aware · budget_warn · cost_meter · hooks.json
    agents/ scout · worker
  statusline/
    statusline.js                   ← the status bar (must be installed user-level)
  templates/
    minecraft-modding/CLAUDE.md     ← the Minecraft-modder add-on
  README.md                         ← you are here
```

---

## Requirements

- [Claude Code](https://claude.com/claude-code) installed and working.
- **Node.js** on your PATH (the hooks and statusline are tiny Node scripts).

---

## Install

### 1. The instruments + crew (the plugin)
Copy the `forge/` folder into your Claude Code skills directory:

```
~/.claude/skills/forge/
```

That gives you, every turn:
- **`[TIME]`** — wall-clock + how long since your last message (so it never says "an hour ago" after
  an overnight gap).
- **`[COST]`** — what the last turn cost, and what re-warming a cold conversation would run.
- **`[BUDGET]`** — context-fill (`C`), 5-hour usage (`S`), and weekly usage (`W`) warnings — but only
  when a threshold is crossed. Below threshold it's silent (zero overhead).

…plus the crew: **Scout** (read-only researcher) and **Worker** (scoped heavy-lifter) — subagents
Forge hands verbose work to so the main conversation stays lean.

### 2. The status bar (one extra step — it must be user-level)
A plugin can't set Claude Code's main status line, and the status bar is also what *feeds* the
`[BUDGET]` warnings (it writes the numbers the budget hook reads). So install it directly:

1. Copy `statusline/statusline.js` to `~/.claude/hooks/statusline.js`.
2. In `~/.claude/settings.json`, point the status line at it:
   ```json
   { "statusLine": { "type": "command", "command": "node ~/.claude/hooks/statusline.js" } }
   ```
   (Use the full path if `~` isn't expanded on your system.)

You'll get a live bar: `model │ C:████░░░░░░ 40% │ S:██░░░ 35% W:█░░░░ 22% ⏱ 2h10m │ ↻$0.40`.

### 3. The character (FORGE.md)
`FORGE.md` is the operating discipline — the part that makes Forge *Forge*. Either:
- paste its contents into your project's `CLAUDE.md`, **or**
- keep it as a file your Claude reads at the start of a session.

**Rename it to whatever you want.** Your Forge is yours — name it, make it your teammate.

### 4. Minecraft modders — the add-on
If you're building a Forge 1.20.1 mod, copy `templates/minecraft-modding/CLAUDE.md` into your mod's
project root as your `CLAUDE.md` (and fill in the project-specific section at the bottom). The
crash-safety rules in it prevent the runtime crashes that only appear after reobfuscation — the ones
that cost beginners days.

---

## How it works — the loop Forge runs

Every turn the hooks inject a short status line into Forge's context. The discipline is **SEE → TELL
→ ADJUST**:

1. **SEE** the number (you don't have to — that's the point).
2. **TELL** you in plain language *with the why* — e.g. *"We're getting full (~70%). I'm saving the
   important stuff to memory and a `/compact` soon is a good idea — nothing's lost."*
3. **ADJUST** its own behavior — bank to memory, tighten replies, not start what it can't finish.

Below threshold, it all stays quiet. The instruments only speak up when they need to.

---

## Make it yours

This is a starting point, not a finished teammate. Forge becomes *yours* the way any partnership
does — by working together, correcting it, and letting it learn how you build. The method is
portable. The relationship, you build yourself.

— *Zab + Forge*
