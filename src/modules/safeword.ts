// Safeword system — two-word safety protocol.
// Yellow: releases binding restraints + starts grace period (no new restraints for N ms).
// Red:    same as yellow + announces departure + leaves the room after 800 ms.
//
// Grace period enforcement is hooked into CharacterRefresh in main.ts.

export interface SafewordConfig {
    enabled: boolean;
    yellowWord: string;       // exact chat input to match (case-insensitive)
    redWord: string;          // exact chat input to match (case-insensitive)
    graceDurationMs: number;  // 0 = indefinite; otherwise milliseconds
}

const DEFAULTS: SafewordConfig = {
    enabled: false,
    yellowWord: "yellow",
    redWord: "red",
    graceDurationMs: 300_000,  // 5 minutes
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
        enabled:        typeof r.enabled        === "boolean" ? r.enabled        : DEFAULTS.enabled,
        yellowWord:     typeof r.yellowWord     === "string"  ? r.yellowWord     : DEFAULTS.yellowWord,
        redWord:        typeof r.redWord        === "string"  ? r.redWord        : DEFAULTS.redWord,
        graceDurationMs:typeof r.graceDurationMs === "number" ? r.graceDurationMs : DEFAULTS.graceDurationMs,
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
    window.setTimeout(() => {
        try { ChatRoomLeave(); } catch { /* ignore */ }
    }, 800);
}

/**
 * Check the typed chat input against configured safewords.
 * Returns true if a safeword was matched (caller should clear the input and cancel send).
 */
export function checkSafeword(inputValue: string): boolean {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return false;
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return false;
    if (cfg.yellowWord && trimmed === cfg.yellowWord.toLowerCase().trim()) {
        triggerYellow();
        return true;
    }
    if (cfg.redWord && trimmed === cfg.redWord.toLowerCase().trim()) {
        triggerRed();
        return true;
    }
    return false;
}
