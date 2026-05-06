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

// Track last room so we don't fire on every ChatRoomSync (which fires more than just on entry)
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

export function handleRoomEnter(): void {
    // Detect actual room changes by comparing room name
    const roomData = (window as unknown as Record<string, unknown>).ChatRoomData;
    const roomName = (roomData && typeof roomData === "object")
        ? String((roomData as Record<string, unknown>).Name ?? "")
        : "";
    if (!roomName || roomName === lastRoomName) return;
    lastRoomName = roomName;

    const s = getAnnounceSettings();
    if (!s.enabled || !s.message.trim()) return;

    if (s.mode === "friends") {
        if (s.friendNumbers.length === 0) return;
        const roomChars = (window as unknown as Record<string, unknown>).ChatRoomCharacter;
        if (!Array.isArray(roomChars)) return;
        const friendPresent = s.friendNumbers.some(num =>
            (roomChars as Character[]).some(c => c.MemberNumber === num && c.MemberNumber !== Player.MemberNumber)
        );
        if (!friendPresent) return;
    }

    // Slight delay so the room finishes loading before we send
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
