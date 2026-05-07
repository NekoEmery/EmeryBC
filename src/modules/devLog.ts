// DevLog — circular buffer of recent ChatRoomMessage events.
// Enable logging via the DEV tab toggle; disabled by default so it
// doesn't accumulate garbage in rooms where the user never opens DEV.

export interface DevLogEntry {
    timestamp: Date;
    type: string;
    content: string;
    sender?: number;
    dictionary?: unknown;
}

const MAX_ENTRIES = 60;
const _log: DevLogEntry[] = [];
let _enabled = false;

export function isDevLogEnabled(): boolean { return _enabled; }
export function setDevLogEnabled(v: boolean): void { _enabled = v; }

export function logMessage(data: Record<string, unknown>): void {
    if (!_enabled) return;
    try {
        _log.push({
            timestamp: new Date(),
            type:      String(data.Type    ?? "?"),
            content:   String(data.Content ?? ""),
            sender:    typeof data.Sender === "number" ? data.Sender : undefined,
            dictionary: data.Dictionary,
        });
        if (_log.length > MAX_ENTRIES) _log.shift();
    } catch { /* ignore */ }
}

export function getDevLog(): readonly DevLogEntry[] { return _log; }
export function clearDevLog(): void { _log.length = 0; }
