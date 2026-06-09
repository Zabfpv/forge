// UserPromptSubmit hook — injects the current wall-clock time AND the elapsed time since the previous
// turn, so Forge can PERCEIVE time passing: a 5-hour gap, an overnight sleep, a day away. Without
// this every turn looks adjacent to the last, so Forge says "an hour ago" whether it was 1 hour or 3 days.
//
// `new Date()` is blocked in workflow scripts (it would break deterministic replay) but a hook is an
// ordinary node process with full clock access. We persist the last turn's epoch ms to a file and diff it
// each turn — the DELTA is the point. Output stays one short line; it's injected into Forge's context.
const fs = require('fs');
const os = require('os');
const path = require('path');

setTimeout(() => process.exit(0), 2000);

// Drain stdin so the process doesn't hang waiting on the hook payload (we don't need its contents).
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => { try { run(); } catch (_) {} process.exit(0); });
process.stdin.on('error', () => process.exit(0));

function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h${String(m % 60).padStart(2, '0')}m`;
    const d = Math.floor(h / 24);
    return `${d}d${h % 24}h`;
}

function run() {
    const now = new Date();
    const stamp = now.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const file = path.join(os.homedir(), '.claude', 'hooks', '_lastturn.json');
    let elapsedStr = '';
    try {
        const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (prev && typeof prev.t === 'number') {
            const delta = now.getTime() - prev.t;
            if (delta > 1000) elapsedStr = ` · ↑${fmtElapsed(delta)} since your last turn`;
        }
    } catch (_) {}

    try { fs.writeFileSync(file, JSON.stringify({ t: now.getTime() })); } catch (_) {}

    process.stdout.write(`[TIME] ${stamp}${elapsedStr}`);
}
