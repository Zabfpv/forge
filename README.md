# Forge — a context-aware teammate for Claude Code

Forge gives your Claude Code a **character, a method, and a set of instruments** it doesn't have out
of the box: it knows how much time has passed, what each turn costs, and how full the conversation is
getting — and it watches those gauges *for you*, tells you in plain language when something needs
attention, and adjusts how it works. So you never get blindsided by a wiped conversation or a usage
lockout in the middle of a build.

It comes in two layers:
- **Forge Core** — the universal teammate. Any project.
- **Forge for Minecraft Modding** — an add-on with the crash-safety rules that save Minecraft/Forge
  modders days of mysterious runtime crashes.

---

## 🚀 How to install it — you don't. Your AI does.

**You do not need to understand any of this.** You don't need to know what a terminal, a config file,
or a "directory" is. If you've got Claude Code open (the setup videos show you how, start to finish),
that's all you need.

**Download this whole folder, open Claude Code inside it, and paste this one line:**

> **Set up Forge for me using the files in this folder. Walk me through each step in plain English,
> and back up anything before you change it.**

That's the entire job. Claude reads the rest of this file (the part written for *it*, below), installs
everything — the instruments, the crew, the status bar — and explains what it's doing as it goes.
Sit back and let your teammate set itself up.

> **Don't have Claude Code yet?** Start with the setup videos — they take you from a blank computer to
> a working Claude Code in a few minutes. Then come back and paste the line above.

---

## What you just installed (the plain-English version)

Once it's done, every time you work you'll have a teammate that quietly tracks three things and only
speaks up when one needs you:

- **A status bar** at the bottom showing how full the conversation is, how much of your usage limits
  are left, and a little cost gauge.
- **Time awareness** — it knows if you've been gone five minutes or overnight, so it picks back up
  like a real person instead of a goldfish.
- **Budget warnings** — when the conversation's getting full (and would otherwise get "compacted" and
  lose detail), or when you're near a usage limit, it tells you in plain words and saves the important
  stuff first. No nasty surprises.

Plus a **character** (`FORGE.md`) — a way of working built on honesty, checking instead of guessing,
and recovering clean when the first try misses. Rename it, make it yours.

---

## ⚙️ For the AI performing the install — execution spec

> **If you're a human, you can stop reading here.** Everything below is instructions for the Claude
> Code agent doing the setup. It's not for you — your AI handles it.

**You are installing Forge for a user who may know nothing about Claude Code internals, terminals, or
config files. Two hard rules: (1) narrate every step in plain, friendly language — no jargon without
explaining it. (2) NEVER destroy existing configuration — back up before you touch anything.**

Work through these in order. After each, tell the user what you did in one plain sentence.

### Step 0 — confirm you can see the files
You should be running in (or have access to) the Forge folder. Confirm these exist before proceeding:
`FORGE.md`, `forge/`, `statusline/statusline.js`, `templates/`. If you can't find them, stop and ask
the user where they downloaded the folder.

### Step 1 — find (or create) the Claude home directory
Resolve the user's Claude config dir:
- macOS / Linux: `$HOME/.claude`
- Windows: `%USERPROFILE%\.claude`

Create `~/.claude/skills/` and `~/.claude/hooks/` if they don't already exist.

### Step 2 — install the plugin (the instruments + the crew)
Copy the **entire `forge/` folder** into `~/.claude/skills/forge/`. Verify the files arrived
(`forge/hooks/*.js`, `forge/agents/*.md`, `forge/.claude-plugin/plugin.json`).

### Step 3 — install the status bar
Copy `statusline/statusline.js` to `~/.claude/hooks/statusline.js`. (It must live here, user-level — a
plugin cannot set the main status line, and this file also feeds the budget warnings.)

### Step 4 — wire the status bar into settings.json  ⚠️ THE CAREFUL STEP
The user very likely **already has** `~/.claude/settings.json` with their own settings. Do **NOT**
overwrite it.
1. If it exists: read it, **make a backup copy at `settings.json.bak` first**, then parse the JSON.
2. Add or replace **only** the `statusLine` key — preserve every other key exactly:
   ```json
   "statusLine": { "type": "command", "command": "node <ABSOLUTE-PATH>/.claude/hooks/statusline.js" }
   ```
   Use the **absolute path** to the file you copied in Step 3 (`~` may not expand in this context).
3. Write the merged JSON back.
4. If `settings.json` did not exist: create it containing just the `statusLine` key.

### Step 5 — install the character (FORGE.md)
Explain to the user that `FORGE.md` is the teammate's personality and method. Offer two options and do
whichever they pick:
- (a) copy its contents into their project's `CLAUDE.md`, or
- (b) place `FORGE.md` somewhere their Claude will read it at session start.
Mention they can rename it to anything they like — their Forge is theirs.

### Step 6 — Minecraft modders only (ask first)
Ask: "Are you here to build a Minecraft mod?" If **yes**, copy
`templates/minecraft-modding/CLAUDE.md` into their mod project's root as `CLAUDE.md`, and tell them to
fill in the project-specific section at the bottom. If no, skip this.

### Step 7 — verify, then report
Confirm all of the following, and fix or report anything that's off:
- `~/.claude/skills/forge/` contains the hooks and agents.
- `~/.claude/hooks/statusline.js` exists.
- `settings.json` has the `statusLine` key **and still contains all its original keys**.

Then tell the user, in plain English:
- what changed,
- that their previous settings were backed up to `settings.json.bak`,
- that they should **restart Claude Code** to see the new status bar,
- and a one-line meaning for each bar: **C** = how full the conversation is, **S** = 5-hour usage
  limit, **W** = weekly usage limit.

If any step failed, say exactly what failed and how to undo it (restore `settings.json.bak`). Never
leave the user with a broken config and no explanation.

---

## Make it yours

This is a starting point, not a finished teammate. Forge becomes *yours* the way any partnership does
— by working together, correcting it, and letting it learn how you build. The method is portable. The
relationship, you build yourself.

— *Zab + Forge*
