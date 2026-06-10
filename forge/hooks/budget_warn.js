// UserPromptSubmit hook — warns Forge when the context window (C) or 5-hour budget (S) crosses a
// threshold, so it knows to bank state / conserve outputs WITHOUT the user having to paste the statusline.
//
// Hooks don't receive context_window/rate_limits directly (verified via probe), so the data is bridged:
// statusline.js writes the latest reading to _budget.json on every render; this hook reads it.
// A UserPromptSubmit hook's stdout is injected into the model's context — so below threshold we print
// NOTHING (zero overhead), and above threshold we print one short line.
//
// PORTABLE: resolves _budget.json under the user's home (~/.claude/hooks/) via os.homedir(), so this exact
// file works on any machine with no hardcoded path. statusline.js (which stays user-level — a plugin can't
// set the main statusLine) is what writes that bridge file.
//
// Thresholds are intentionally easy to tune:
const C_WARN = 70;   // context %: compact approaching → bank state
const C_CRIT = 85;   // context %: compact NOW
const S_WARN = 70;   // 5-hour %: start conserving
const S_CRIT = 90;   // 5-hour %: near lockout
const W_WARN = 80;   // weekly %: the longer-horizon ceiling is getting tight
const W_CRIT = 92;   // weekly %: weekly lockout is the real risk now

// Staleness guard: statusline.js stamps `t` (epoch ms) on every bridge write. If the reading is older
// than STALE_MS, the statusline hasn't refreshed it recently (e.g. right after an account swap or a
// 5-hour reset) and the numbers can't be trusted — so warn off NOTHING rather than relay a stale value.
// Backward-compatible: if `t` is absent (older statusline that doesn't stamp), fall back to old behavior
// rather than silently disabling warnings.
const STALE_MS = 120000; // 2 min

const fs = require('fs');
const path = require('path');
const os = require('os');
setTimeout(() => process.exit(0), 3000);

const budgetFile = path.join(os.homedir(), '.claude', 'hooks', '_budget.json');

try {
    const b = JSON.parse(fs.readFileSync(budgetFile, 'utf8'));
    if (b.t && (Date.now() - b.t) > STALE_MS) process.exit(0); // provably stale → stay silent
    const warns = [];

    if (b.c != null && b.c >= C_CRIT) {
        warns.push(`context window at ${b.c}% — COMPACT NOW; bank state (memory, ROADMAP, green build) first, then tell the user to /compact`);
    } else if (b.c != null && b.c >= C_WARN) {
        warns.push(`context window at ${b.c}% — a compact is approaching; bank state (memory, ROADMAP, green build) as you go and suggest the user /compact soon`);
    }
    if (b.s != null && b.s >= S_CRIT) {
        warns.push(`5-hour budget at ${b.s}% (resets in ${b.reset || '?'}) — near lockout; minimize output, don't start heavy tasks, tell the user`);
    } else if (b.s != null && b.s >= S_WARN) {
        warns.push(`5-hour budget at ${b.s}% (resets in ${b.reset || '?'}) — start conserving outputs and let the user know to wrap up heavy work`);
    }
    if (b.w != null && b.w >= W_CRIT) {
        warns.push(`weekly budget at ${b.w}% — the weekly ceiling is the real constraint now; minimize and tell the user`);
    } else if (b.w != null && b.w >= W_WARN) {
        warns.push(`weekly budget at ${b.w}% — the weekly limit is getting tight; mention it's the longer-horizon constraint`);
    }

    if (warns.length) {
        process.stdout.write('[BUDGET] ' + warns.join('; ') + '.');
    }
} catch (_) { /* no file yet or unreadable → silent */ }

process.exit(0);
