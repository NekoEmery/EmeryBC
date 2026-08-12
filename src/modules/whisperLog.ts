// Session whisper log — in-memory only, clears on reload.
// Captures both incoming and outgoing room whispers this session.

export interface WhisperEntry {
    ts: number;
    direction: "in" | "out";
    partnerNum: number;
    partnerName: string;
    message: string;
}

const MAX_ENTRIES = 400;
const _log: WhisperEntry[] = [];
let _onUpdate: (() => void) | null = null;

export function setWhisperUpdateCallback(cb: (() => void) | null): void {
    _onUpdate = cb;
}

export function addWhisperEntry(entry: WhisperEntry): void {
    _log.push(entry);
    if (_log.length > MAX_ENTRIES) _log.splice(0, _log.length - MAX_ENTRIES);
    try { _onUpdate?.(); } catch { /* ignore */ }
}

export function getWhisperLog(): WhisperEntry[] {
    return _log;
}

/**
 * The session's whispers as a plain text transcript.
 *
 * This log lives in memory and dies with the tab, which is fine for looking
 * something up mid-scene and useless for keeping anything. Plain text rather
 * than JSON because what people want to keep is the writing, not the data.
 */
export function whisperTranscript(): string {
    const stamp = (ts: number): string => {
        const d = new Date(ts);
        const p = (n: number): string => String(n).padStart(2, "0");
        return `${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const me = Player?.Name ?? "You";
    const lines = _log.map(e => {
        const who = e.direction === "out" ? `${me} -> ${e.partnerName}` : `${e.partnerName} -> ${me}`;
        return `[${stamp(e.ts)}] ${who}: ${e.message}`;
    });
    return [
        `EmeryBC whisper log - ${new Date().toLocaleString()}`,
        `${_log.length} message${_log.length === 1 ? "" : "s"} this session`,
        "",
        ...lines,
    ].join("\r\n");
}

/** Offers the transcript as a file. Returns false when there is nothing to save. */
export function saveWhisperTranscript(): boolean {
    if (_log.length === 0) return false;
    try {
        const blob = new Blob([whisperTranscript()], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const d = new Date();
        const p = (n: number): string => String(n).padStart(2, "0");
        a.href = url;
        a.download = `ebc-whispers-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
            + `-${p(d.getHours())}${p(d.getMinutes())}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        return true;
    } catch { return false; }
}

export function getWhisperConversation(partnerNum: number): WhisperEntry[] {
    return _log.filter(e => e.partnerNum === partnerNum);
}

export function getWhisperPartners(): number[] {
    const seen = new Set<number>();
    const out: number[] = [];
    for (let i = _log.length - 1; i >= 0; i--) {
        const n = _log[i].partnerNum;
        if (!seen.has(n)) { seen.add(n); out.push(n); }
    }
    return out;
}

export function clearWhisperLog(): void {
    _log.length = 0;
    try { _onUpdate?.(); } catch { /* ignore */ }
}
