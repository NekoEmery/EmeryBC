// Safeword system — two-word safety protocol.
// Yellow: releases binding restraints + starts grace period (no new restraints for N ms).
// Red:    same as yellow + announces departure + leaves the room after 800 ms.
//
// Grace period enforcement is hooked into CharacterRefresh in main.ts.

import { applyOutfit, getOutfits } from "./outfitManager";

export interface SafewordConfig {
    enabled: boolean;
    yellowWord: string;           // exact chat input to match (case-insensitive)
    redWord: string;              // exact chat input to match (case-insensitive)
    graceDurationMs: number;      // 0 = indefinite; otherwise milliseconds
    yellowOutfitId: string | null; // outfit to apply on yellow trigger (null = none)
    redOutfitId: string | null;    // outfit to apply on red trigger (null = none)
}

const DEFAULTS: SafewordConfig = {
    enabled: true,
    yellowWord: "yellow",
    redWord: "red",
    graceDurationMs: 300_000,  // 5 minutes
    yellowOutfitId: null,
    redOutfitId: null,
};

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getSafewordConfig(): SafewordConfig {
    const raw = getStore().safeword;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULTS };
    const r = raw as Record<string, unknown>;
    return {
        enabled:         typeof r.enabled          === "boolean" ? r.enabled          : DEFAULTS.enabled,
        yellowWord:      typeof r.yellowWord        === "string"  ? r.yellowWord        : DEFAULTS.yellowWord,
        redWord:         typeof r.redWord           === "string"  ? r.redWord           : DEFAULTS.redWord,
        graceDurationMs: typeof r.graceDurationMs   === "number"  ? r.graceDurationMs   : DEFAULTS.graceDurationMs,
        yellowOutfitId:  typeof r.yellowOutfitId    === "string"  ? r.yellowOutfitId    : DEFAULTS.yellowOutfitId,
        redOutfitId:     typeof r.redOutfitId       === "string"  ? r.redOutfitId       : DEFAULTS.redOutfitId,
    };
}

export function setSafewordConfig(cfg: SafewordConfig): void {
    getStore().safeword = cfg;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

// -- Grace period state (in-memory; resets on page reload) --------------------

// null = inactive; Infinity = indefinite; number = unix-ms expiry timestamp
let gracePeriodEnd: number | null = null;

export function isGraceActive(): boolean {
    if (gracePeriodEnd === null) return false;
    if (gracePeriodEnd === Infinity) return true;
    return Date.now() < gracePeriodEnd;
}

/** Returns ms remaining, or Infinity if indefinite, or null if not active. */
export function getGraceRemaining(): number | null {
    if (gracePeriodEnd === null) return null;
    if (gracePeriodEnd === Infinity) return Infinity;
    const rem = gracePeriodEnd - Date.now();
    return rem > 0 ? rem : null;
}

export function startGrace(durationMs: number): void {
    gracePeriodEnd = durationMs <= 0 ? Infinity : Date.now() + durationMs;
}

export function endGrace(): void {
    gracePeriodEnd = null;
}

export function checkGraceExpiry(): void {
    if (gracePeriodEnd !== null && gracePeriodEnd !== Infinity && Date.now() >= gracePeriodEnd) {
        gracePeriodEnd = null;
    }
}

// -- Restraint helpers ---------------------------------------------------------

// Groups that are never removed by the safeword (collars / neck items)
const NECK_GROUPS = new Set([
    "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
]);

function releaseBindingRestraints(): void {
    const toRemove = Player.Appearance.filter((i: Item) =>
        i.Asset.Group.IsRestraint && !NECK_GROUPS.has(i.Asset.Group.Name),
    );
    for (const item of toRemove) {
        try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
    }
    if (toRemove.length > 0) {
        try {
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        } catch { /* ignore */ }
    }
}

// Guard flag to prevent re-entrant calls during grace enforcement.
let enforcing = false;

/**
 * Called on every CharacterRefresh for the player.
 * If grace is active, strips any binding restraints that were just added.
 */
export function enforceGracePeriod(): void {
    if (enforcing) return;
    checkGraceExpiry();
    if (!isGraceActive()) return;

    const toRemove = Player.Appearance.filter((i: Item) =>
        i.Asset.Group.IsRestraint && !NECK_GROUPS.has(i.Asset.Group.Name),
    );
    if (toRemove.length === 0) return;

    enforcing = true;
    try {
        for (const item of toRemove) {
            try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
        }
        try {
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        } catch { /* ignore */ }
    } finally {
        enforcing = false;
    }
}

// -- Trigger functions ---------------------------------------------------------

export function triggerYellow(): void {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return;
    releaseBindingRestraints();
    startGrace(cfg.graceDurationMs);
    try {
        const graceDesc = cfg.graceDurationMs <= 0
            ? "indefinitely"
            : `for ${Math.round(cfg.graceDurationMs / 60_000)} min`;
        ServerSend("ChatRoomChat", {
            Type: "Action",
            Content: `${Player.Name} calls yellow — taking a moment to breathe. Please give them space (grace period active ${graceDesc}).`,
            Dictionary: [
                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                { SourceCharacter: Player.MemberNumber },
            ],
        });
    } catch { /* ignore */ }
    // Apply outfit after a short delay so the restraint release syncs first
    if (cfg.yellowOutfitId) {
        const id = cfg.yellowOutfitId;
        window.setTimeout(() => {
            try {
                const outfit = getOutfits().find(o => o.id === id);
                if (outfit) applyOutfit(outfit);
            } catch { /* ignore */ }
        }, 150);
    }
}

export function triggerRed(): void {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return;
    releaseBindingRestraints();
    startGrace(cfg.graceDurationMs);
    try {
        ServerSend("ChatRoomChat", {
            Type: "Action",
            Content: `${Player.Name} calls red safeword — they are being escorted to safety. Please respect their exit.`,
            Dictionary: [
                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                { SourceCharacter: Player.MemberNumber },
            ],
        });
    } catch { /* ignore */ }
    // Apply outfit before leaving
    if (cfg.redOutfitId) {
        const id = cfg.redOutfitId;
        window.setTimeout(() => {
            try {
                const outfit = getOutfits().find(o => o.id === id);
                if (outfit) applyOutfit(outfit);
            } catch { /* ignore */ }
        }, 150);
    }
    window.setTimeout(() => {
        // Navigate away from the ChatRoom screen BEFORE ChatRoomLeave() clears
        // the room state. Without this, mods that hook ChatRoomRun (e.g. CRABS)
        // crash on the next render frame because ChatRoomCustomization is null.
        try { (window as unknown as Record<string, unknown>).CommonSetScreen?.("Online", "ChatSearch"); } catch { /* ignore */ }
        try { ChatRoomLeave(); } catch { /* ignore */ }
    }, 800);
}

/**
 * Check the typed chat input against configured safewords.
 * Matches the word alone OR with a trailing "!" (e.g. "red" or "red!").
 * Returns true if a safeword was matched (caller should clear the input and cancel send).
 */
export function checkSafeword(inputValue: string): boolean {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return false;
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return false;

    const matches = (word: string): boolean => {
        const w = word.toLowerCase().trim();
        if (!w) return false;
        return trimmed === w || trimmed === w + "!";
    };

    if (matches(cfg.yellowWord)) { triggerYellow(); return true; }
    if (matches(cfg.redWord))    { triggerRed();    return true; }
    return false;
}
