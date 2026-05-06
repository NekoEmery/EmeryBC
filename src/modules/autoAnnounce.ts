// Room auto-announce — sends a message when entering a new chatroom.
import { getDisplayName } from "./actionButtons";

export type AnnounceStyle = "action" | "emote";
export type AnnounceMode  = "always" | "friends";

export interface AutoAnnounceSettings {
    enabled:       boolean;
    message:       string;
    style:         AnnounceStyle;
    mode:          AnnounceMode;
    friendNumbers: number[];
}

const DEFAULTS: AutoAnnounceSettings = {
    enabled:       false,
    message:       "slips in quietly.",
    style:         "action",
    mode:          "always",
    friendNumbers: [],
};

// Track last room so we only fire once per genuine room entry
let lastRoomName = "";

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getAnnounceSettings(): AutoAnnounceSettings {
    const raw = getStore().autoAnnounce;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULTS };
    const s = raw as Partial<AutoAnnounceSettings>;
    return {
        enabled:       typeof s.enabled === "boolean" ? s.enabled : false,
        message:       typeof s.message === "string"  ? s.message : DEFAULTS.message,
        style:         s.style  === "emote"   ? "emote"   : "action",
        mode:          s.mode   === "friends" ? "friends" : "always",
        friendNumbers: Array.isArray(s.friendNumbers)
            ? (s.friendNumbers as number[]).filter(n => typeof n === "number")
            : [],
    };
}

export function saveAnnounceSettings(s: AutoAnnounceSettings): void {
    getStore().autoAnnounce = s;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

// syncData is args[0] from the ChatRoomSync hook — the raw server packet which
// already contains the room name before BC processes it into any global.
export function handleRoomEnter(syncData?: unknown): void {
    // Primary: read Name from the sync packet passed directly from the hook
    const data = syncData as Record<string, unknown> | undefined;
    let roomName = typeof data?.Name === "string" ? data.Name : "";

    // Fallback: read from the ChatRoomData global (set by BC after next() runs)
    if (!roomName) {
        try {
            const g = (window as unknown as Record<string, unknown>).ChatRoomData;
            if (g && typeof g === "object") {
                roomName = String((g as Record<string, unknown>).Name ?? "");
            }
        } catch { /* ignore */ }
    }

    // No room name resolved — bail (might not be a room-entry sync)
    if (!roomName) return;

    // Same room as last time — don't re-announce (handles reconnects, room refreshes, etc.)
    if (roomName === lastRoomName) return;
    lastRoomName = roomName;

    const s = getAnnounceSettings();
    if (!s.enabled || !s.message.trim()) return;

    if (s.mode === "friends") {
        if (s.friendNumbers.length === 0) return;
        try {
            const roomChars = (window as unknown as Record<string, unknown>).ChatRoomCharacter;
            if (!Array.isArray(roomChars)) return;
            const friendPresent = s.friendNumbers.some(num =>
                (roomChars as Character[]).some(c => c.MemberNumber === num && c.MemberNumber !== Player.MemberNumber)
            );
            if (!friendPresent) return;
        } catch { return; }
    }

    // Delay so the room fully loads before sending
    window.setTimeout(() => {
        try {
            if (s.style === "emote") {
                ServerSend("ChatRoomChat", { Type: "Emote", Content: s.message.trim(), Dictionary: [] });
            } else {
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: getDisplayName() + " " + s.message.trim(),
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } catch { /* ignore */ }
    }, 1500);
}
