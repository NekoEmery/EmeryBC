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
