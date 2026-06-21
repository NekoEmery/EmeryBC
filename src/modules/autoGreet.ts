// Auto-greet: show a local alert and/or send an auto-whisper when a watched
// member enters the room. Triggers both when they join while you're in the room
// (ChatRoomSyncMemberJoin) and when you join a room they're already in
// (ChatRoomSync). Fires at most once per room entry per watched member.

import { getSettings, syncSettings } from "./bcUtils";
import { appendLocalLogLine } from "./notify";
import { UI } from "./ui";

export interface AutoGreetEntry {
    id: string;
    memberNumber: number;
    label: string;       // optional display name shown in the UI
    alert: boolean;      // show a local EBC notification
    whisper: boolean;    // send an automatic whisper
    whisperMsg: string;  // whisper message text
}

// Per-room dedup: cleared when leaving so each room gets one trigger per member.
const _greetedThisRoom = new Set<number>();

export function autoGreetOnRoomLeave(): void {
    _greetedThisRoom.clear();
}

export function autoGreetOnMemberLeave(memberNumber: number): void {
    _greetedThisRoom.delete(memberNumber);
}

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function load(): AutoGreetEntry[] {
    const raw = (getSettings() as Record<string, unknown>).autoGreet;
    return Array.isArray(raw) ? (raw as AutoGreetEntry[]) : [];
}

function save(entries: AutoGreetEntry[]): void {
    (getSettings() as Record<string, unknown>).autoGreet = entries;
    syncSettings();
}

export function getAutoGreetEntries(): AutoGreetEntry[] { return load(); }

export function addAutoGreetEntry(
    memberNumber: number, message: string,
    alert: boolean, whisper: boolean,
): AutoGreetEntry | null {
    const list = load();
    if (list.some(e => e.memberNumber === memberNumber)) return null;
    const trimmed = message.trim();
    const entry: AutoGreetEntry = {
        id: uid(), memberNumber,
        label: trimmed, alert, whisper, whisperMsg: trimmed,
    };
    save([...list, entry]);
    return entry;
}

export function removeAutoGreetEntry(id: string): void {
    save(load().filter(e => e.id !== id));
}

export function updateAutoGreetEntry(id: string, patch: Partial<Omit<AutoGreetEntry, "id">>): void {
    const list = load();
    const e = list.find(x => x.id === id);
    if (e) { Object.assign(e, patch); save(list); }
}

// Called from ChatRoomSyncMemberJoin (member joins while we're in the room).
export function checkAutoGreet(memberNumber: number, displayName: string): void {
    if (_greetedThisRoom.has(memberNumber)) return;
    const entry = load().find(e => e.memberNumber === memberNumber);
    if (!entry) return;
    _greetedThisRoom.add(memberNumber);

    const name = displayName || `#${memberNumber}`;
    if (entry.alert) {
        appendLocalLogLine(`[EBC] ${name} (#${memberNumber}) is in the room.`, UI.gold);
    }
    const msg = entry.label || entry.whisperMsg;
    if (entry.whisper && msg) {
        try {
            ServerSend("ChatRoomChat", { Type: "Whisper", Content: msg, Target: memberNumber });
        } catch { /* ignore */ }
    }
}

// Called from ChatRoomSync (we joined a room where watched members already are).
export function checkAutoGreetForRoom(): void {
    const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
        Array<{ MemberNumber?: number; Name?: string; Nickname?: string }> | undefined;
    if (!Array.isArray(chars)) return;
    const selfNum = Player.MemberNumber;
    for (const c of chars) {
        if (typeof c.MemberNumber === "number" && c.MemberNumber !== selfNum) {
            checkAutoGreet(c.MemberNumber, (c.Nickname || c.Name) ?? "");
        }
    }
}
