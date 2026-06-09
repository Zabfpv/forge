// UserPromptSubmit hook — injects the PREVIOUS turn's token cost into Forge's context, so Forge sees its
// own spend every turn WITHOUT the user hand-relaying it ("↓ 4.5k"). The data already exists: Claude Code
// logs per-message usage in the session transcript. The hook gets the transcript path on stdin, tail-reads
// it, and sums usage across the last turn (all assistant messages back to the prior user message — so tool
// rounds + final text are all counted, matching what the user sees).
//
// Output is injected into the model's context, so it MUST stay one short line.
//
// Pricing = Opus 4.8 list rates ($/M tokens). in/out are list price; cacheWrite = 1.25× input (5-min TTL),
// cacheRead = 0.1× input. Update these if you run a different model.
const PRICE = { in: 5, out: 25, cacheWrite: 6.25, cacheRead: 0.5 };

const fs = require('fs');
setTimeout(() => process.exit(0), 2500);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => { try { run(JSON.parse(raw || '{}')); } catch (_) {} process.exit(0); });
process.stdin.on('error', () => process.exit(0));

function readTail(path, bytes) {
    const fd = fs.openSync(path, 'r');
    try {
        const size = fs.fstatSync(fd).size;
        const start = Math.max(0, size - bytes);
        const len = size - start;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, start);
        return buf.toString('utf8');
    } finally { fs.closeSync(fd); }
}

function usageOf(obj) {
    const u = obj && ((obj.message && obj.message.usage) || obj.usage);
    if (!u) return null;
    return {
        in:  u.input_tokens || 0,
        out: u.output_tokens || 0,
        cr:  u.cache_read_input_tokens || 0,
        cw:  u.cache_creation_input_tokens || 0,
    };
}

function isUser(obj) {
    return obj && (obj.type === 'user' || (obj.message && obj.message.role === 'user'));
}

function run(input) {
    const path = input.transcript_path;
    if (!path || !fs.existsSync(path)) return;

    const lines = readTail(path, 2 * 1024 * 1024).split('\n').filter(Boolean); // last 2MB
    let inT = 0, out = 0, cr = 0, cw = 0, found = false;
    // Footprint = the SINGLE most-recent assistant message's context (in+cr+cw) = the true size a
    // cold re-warm rebuilds. NOT the turn sum — a multi-tool turn has many assistant messages each
    // re-reading the whole context, so summing cr/cw multiplies the real footprint several times over.
    let footIn = 0, footCr = 0, footCw = 0, gotFoot = false;

    // Walk from the end, summing assistant usage back to the previous user message.
    for (let i = lines.length - 1; i >= 0; i--) {
        let obj;
        try { obj = JSON.parse(lines[i]); } catch (_) { continue; }
        if (isUser(obj)) { if (found) break; else continue; }
        const u = usageOf(obj);
        if (u) {
            if (!gotFoot) { footIn = u.in; footCr = u.cr; footCw = u.cw; gotFoot = true; } // newest msg
            inT += u.in; out += u.out; cr += u.cr; cw += u.cw; found = true;
        }
    }
    if (!found) return;

    const cost = (inT * PRICE.in + out * PRICE.out + cw * PRICE.cacheWrite + cr * PRICE.cacheRead) / 1e6;
    const k = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n);
    process.stdout.write(
        `[COST] prev turn: ${k(out)} out (the lever) · ${k(inT)} new-in · ${k(cr)} cache-read ≈ $${cost.toFixed(3)}`
    );

    // Also persist a "cold relight" estimate for the statusline's ↻$X gauge: if the warm cache drops
    // — /quit, window close, or ~5 min idle — the next turn re-creates the WHOLE context at the
    // cache_creation rate. Footprint = the newest message's (in+cr+cw), so it tracks the REAL context
    // size and drops the instant a compact takes effect. (Still stale for ONE turn after a /compact —
    // it can't see the smaller post-compact context until a live turn runs.) Always-on, pre-walkaway.
    try {
        const os = require('os'), pathMod = require('path');
        const ctxTokens = footIn + footCr + footCw;
        const relight = ctxTokens * PRICE.cacheWrite / 1e6;
        fs.writeFileSync(pathMod.join(os.homedir(), '.claude', 'hooks', '_relight.json'),
            JSON.stringify({ tokens: ctxTokens, cost: relight }));
    } catch (_) {}
}
