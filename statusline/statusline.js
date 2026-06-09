#!/usr/bin/env node
// Claude Code statusline — model · context window · 5h/7d rate limits · reset countdown
// Reads JSON from stdin, writes ANSI to stdout. Exits silently on any error.
// Format: {model} │ {ctx bar} {ctx%} │ S:{bar}{%} W:{bar}{%} ⏱ {countdown} │ ↻${relight}
//
// This file MUST be installed user-level (a plugin cannot set the main statusLine). It also writes the
// budget bridge (_budget.json) that the budget_warn.js hook reads — so the two halves of Forge's
// awareness work together. All paths resolve under ~/.claude/hooks via os.homedir() — portable anywhere.

const os = require('os');
const path = require('path');
const fs = require('fs');
const HOOKS_DIR = path.join(os.homedir(), '.claude', 'hooks');

const timeout = setTimeout(() => process.exit(0), 3000);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
    clearTimeout(timeout);
    try { render(JSON.parse(raw)); } catch (_) {}
    process.exit(0);
});
process.stdin.on('error', () => process.exit(0));

// ── ANSI helpers ────────────────────────────────────────────────────────────
const R     = '\x1b[0m';
const DIM   = '\x1b[2m';
const BLINK = '\x1b[5m';
function fg(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }
const GREEN  = fg(80,  200, 80);
const YELLOW = fg(220, 200, 0);
const ORANGE = fg(230, 140, 0);
const RED    = fg(220, 50,  50);
const SKULL  = '💀';

// Context bar: green <50 · yellow <65 · orange <80 · red ≥80 (+ blinking skull).
function colorForCtx(pct) {
    if (pct >= 80) return RED;
    if (pct >= 65) return ORANGE;
    if (pct >= 50) return YELLOW;
    return GREEN;
}
// Rate bars: green <50 · yellow <80 · red ≥80 (+ skull ≥95).
function colorForRate(pct) {
    if (pct >= 80) return RED;
    if (pct >= 50) return YELLOW;
    return GREEN;
}

// ── Bar builder ──────────────────────────────────────────────────────────────
const FILLED = '█';
const EMPTY  = '░';

function bar(pct, segs, color) {
    const p = Math.max(0, Math.min(100, pct));
    const filled = Math.round((p / 100) * segs);
    return color + FILLED.repeat(filled) + DIM + EMPTY.repeat(segs - filled) + R;
}

// ── Countdown ────────────────────────────────────────────────────────────────
function countdown(resetsAt) {
    if (resetsAt == null) return '';
    let target;
    if (typeof resetsAt === 'number') {
        // Claude Code sends epoch *seconds* (10 digits); guard against ms (13 digits) too.
        target = resetsAt < 1e12 ? resetsAt * 1000 : resetsAt;
    } else {
        target = new Date(resetsAt).getTime();
    }
    const ms = target - Date.now();
    if (!isFinite(ms) || ms <= 0) return '';
    const totalMin = Math.ceil(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}

// ── Main render ──────────────────────────────────────────────────────────────
function render(data) {
    const parts = [];
    let bC = null, bS = null, bW = null, bReset = null; // captured for the budget-bridge file

    // Model (dimmed)
    const model = data?.model?.display_name;
    if (model) parts.push(`${DIM}${model}${R}`);

    // Context window — 10-seg bar of USED %, color-coded, blinking skull at ≥80.
    const ctx = data?.context_window;
    if (ctx != null) {
        let used = null;
        if (typeof ctx.remaining_percentage === 'number') used = 100 - ctx.remaining_percentage;
        else if (typeof ctx.used_percentage === 'number')  used = ctx.used_percentage;
        if (used != null) {
            used = Math.max(0, Math.min(100, used));
            bC = Math.round(used);
            const col = colorForCtx(used);
            let seg = `C:${bar(used, 10, col)} ${col}${Math.round(used)}%${R}`;
            if (used >= 80) seg += ` ${RED}${BLINK}${SKULL}${R}`;
            parts.push(seg);
        }
    }

    // Rate limits — 5-seg bars, skull at ≥95; countdown to 5h reset at the very end.
    const five = data?.rate_limits?.five_hour;
    const week = data?.rate_limits?.seven_day;

    if (five != null || week != null) {
        const rateParts = [];
        let timerStr = '';

        if (five != null) {
            const pct = Math.round(five.used_percentage ?? 0);
            bS = pct;
            const col = colorForRate(pct);
            let s = `S:${bar(pct, 5, col)}${col}${pct}%${R}`;
            if (pct >= 95) s += `${RED}${SKULL}${R}`;
            rateParts.push(s);
            const timer = countdown(five.resets_at);
            bReset = timer || null;
            if (timer) timerStr = ` ${DIM}⏱ ${timer}${R}`;
        }

        if (week != null) {
            const pct = Math.round(week.used_percentage ?? 0);
            bW = pct;
            const col = colorForRate(pct);
            let s = `W:${bar(pct, 5, col)}${col}${pct}%${R}`;
            if (pct >= 95) s += `${RED}${SKULL}${R}`;
            rateParts.push(s);
        }

        if (rateParts.length) parts.push(rateParts.join(' ') + timerStr);
    }

    // Cold-relight gauge (↻$X): what re-warming this thread from a COLD cache would cost right now —
    // shown always-on so you see it BEFORE a /quit, a window close, or a ~5min idle drops the warm
    // cache. cost_meter writes the estimate each turn; we just display it. Green <$1 · orange <$3 · red ≥$3.
    try {
        const rl = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, '_relight.json'), 'utf8'));
        if (rl && typeof rl.cost === 'number') {
            const c = rl.cost;
            const col = c >= 3 ? RED : c >= 1 ? ORANGE : GREEN;
            parts.push(`${col}↻$${c.toFixed(2)}${R}`);
        }
    } catch (_) {}

    // Budget bridge: persist the latest reading so the UserPromptSubmit hook can warn Forge when a
    // threshold is crossed (hooks don't receive context_window/rate_limits — verified via probe).
    try {
        fs.writeFileSync(path.join(HOOKS_DIR, '_budget.json'),
            JSON.stringify({ c: bC, s: bS, w: bW, reset: bReset }));
    } catch (_) {}

    if (parts.length) process.stdout.write(parts.join(` ${DIM}│${R} `) + '\n');
}
