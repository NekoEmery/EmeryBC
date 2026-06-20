// Safeword system — two-word safety protocol.
// Yellow: releases binding restraints + starts grace period (no new restraints for N ms).
// Red:    same as yellow + announces departure + leaves the room after 800 ms.
//
// Grace period enforcement is hooked into CharacterRefresh in main.ts.

import { applyOutfit, getOutfits, RESTRAINT_GROUPS } from "./outfitManager";
import { snapshotPlayerRestraints } from "./antiRestraint";
import { callBC, getSettings, syncSettings } from "./bcUtils";

export interface SafewordConfig {
    enabled: boolean;
    yellowWord: string;           // exact chat input to match (case-insensitive)
    redWord: string;              // exact chat input to match (case-insensitive)
    graceDurationMs: number;      // 0 = indefinite; otherwise milliseconds
    yellowOutfitId: string | null; // outfit to apply on yellow trigger (null = none)
    redOutfitId: string | null;    // outfit to apply on red trigger (null = none)
    // Per-word action toggles
    yellowRelease:  boolean;   // release binding restraints on yellow
    yellowGrace:    boolean;   // start grace period on yellow
    yellowAnnounce: boolean;   // send chat announcement on yellow
    yellowLeave:    boolean;   // leave the room on yellow
    redRelease:     boolean;   // release binding restraints on red
    redGrace:       boolean;   // start grace period on red
    redAnnounce:    boolean;   // send chat announcement on red
    redLeave:       boolean;   // leave the room on red
}

const DEFAULTS: SafewordConfig = {
    enabled: true,
    yellowWord: "yellow",
    redWord: "red",
    graceDurationMs: 300_000,  // 5 minutes
    yellowOutfitId: null,
    redOutfitId: null,
    yellowRelease:  true,
    yellowGrace:    true,
    yellowAnnounce: true,
    yellowLeave:    false,
    redRelease:     true,
    redGrace:       true,
    redAnnounce:    true,
    redLeave:       true,
};

export function getSafewordConfig(): SafewordConfig {
    const raw = getSettings().safeword;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULTS };
    const r = raw as Record<string, unknown>;
    const b = (key: keyof SafewordConfig, def: boolean): boolean =>
        typeof r[key] === "boolean" ? (r[key] as boolean) : def;
    return {
        enabled:         typeof r.enabled          === "boolean" ? r.enabled          : DEFAULTS.enabled,
        yellowWord:      typeof r.yellowWord        === "string"  ? r.yellowWord        : DEFAULTS.yellowWord,
        redWord:         typeof r.redWord           === "string"  ? r.redWord           : DEFAULTS.redWord,
        graceDurationMs: typeof r.graceDurationMs   === "number"  ? r.graceDurationMs   : DEFAULTS.graceDurationMs,
        yellowOutfitId:  typeof r.yellowOutfitId    === "string"  ? r.yellowOutfitId    : DEFAULTS.yellowOutfitId,
        redOutfitId:     typeof r.redOutfitId       === "string"  ? r.redOutfitId       : DEFAULTS.redOutfitId,
        yellowRelease:   b("yellowRelease",  DEFAULTS.yellowRelease),
        yellowGrace:     b("yellowGrace",    DEFAULTS.yellowGrace),
        yellowAnnounce:  b("yellowAnnounce", DEFAULTS.yellowAnnounce),
        yellowLeave:     b("yellowLeave",    DEFAULTS.yellowLeave),
        redRelease:      b("redRelease",     DEFAULTS.redRelease),
        redGrace:        b("redGrace",       DEFAULTS.redGrace),
        redAnnounce:     b("redAnnounce",    DEFAULTS.redAnnounce),
        redLeave:        b("redLeave",       DEFAULTS.redLeave),
    };
}

export function setSafewordConfig(cfg: SafewordConfig): void {
    try {
        const store = getSettings();
        store.safeword = cfg;
        // Use callBC to handle async rejections — mod hooks on ServerPlayerExtensionSettingsSync
        // may return a rejecting Promise that a bare call would silently swallow.
        syncSettings();
    } catch { /* ignore */ }
}

// -- Safeword double-fire guard ------------------------------------------------
// checkSafeword is called from three hook points (capture keydown, ChatRoomKeyDown,
// ChatRoomSendChat).  On some BC builds all three fire for the same Enter press,
// which causes triggerRed/Yellow to fire twice — double announcement in chat,
// two ChatRoomLeave calls scheduled, etc.
// A 2-second debounce collapses all three into a single trigger.
let lastSafewordTriggerTs = 0;
const SAFEWORD_DEBOUNCE_MS = 2000;

// -- Grace period state (in-memory; resets on page reload) --------------------
// Rate-limit grace-enforcement server syncs.  The enforcement itself (item
// removal + CharacterRefresh) runs every time it's needed, but the expensive
// ChatRoomCharacterUpdate + ServerPlayerAppearanceSync pair is capped to once
// every 2 s so a burst of rapid CharacterRefresh calls (from other mods or BC's
// own animation system) can't flood the server.
let lastGraceEnforceSync = 0;
const GRACE_SYNC_INTERVAL_MS = 2000;

// null = inactive; Infinity = indefinite; number = unix-ms expiry timestamp
let gracePeriodEnd: number | null = null;

// Snapshot of binding-restraint groups present when grace STARTED.
// enforceGracePeriod() only strips groups that appeared AFTER this snapshot,
// so Release=OFF + Grace=ON doesn't remove existing restraints.
let graceStartGroups: Set<string> = new Set();

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
    // Snapshot current restraint groups so grace enforcement only strips
    // items added DURING the grace window, not items that were already on.
    graceStartGroups = new Set(
        Player.Appearance
            .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name) && !NECK_GROUPS.has(i.Asset.Group.Name))
            .map((i: Item) => i.Asset.Group.Name),
    );
    gracePeriodEnd = durationMs <= 0 ? Infinity : Date.now() + durationMs;
}

export function endGrace(): void {
    gracePeriodEnd = null;
    graceStartGroups = new Set();
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

// Lock asset names that are never removed by safeword (owner / lover / family padlocks).
const PROTECTED_LOCK_NAMES = new Set([
    "OwnerPadlock",
    "OwnerTimerPadlock",
    "ExclusivePadlock",
    "LoversPadlock",
    "LoversTimerPadlock",
    "FamilyPadlock",
]);

function isProtectedLocked(item: Item): boolean {
    try {
        const prop = (item as unknown as { Property?: { LockedBy?: string } }).Property;
        return !!prop?.LockedBy && PROTECTED_LOCK_NAMES.has(prop.LockedBy);
    } catch { return false; }
}

function releaseBindingRestraints(): void {
    const removeGroups = new Set(
        Player.Appearance
            .filter((i: Item) =>
                RESTRAINT_GROUPS.has(i.Asset.Group.Name) &&
                !NECK_GROUPS.has(i.Asset.Group.Name) &&
                !isProtectedLocked(i),
            )
            .map((i: Item) => i.Asset.Group.Name),
    );
    if (removeGroups.size === 0) return;

    // Filter the appearance array directly — InventoryRemove respects BC lock
    // rules and silently fails on owner/exclusive-locked items.
    Player.Appearance = Player.Appearance.filter(
        (i: Item) => !removeGroups.has(i.Asset.Group.Name),
    );

    // Update the anti-restraint snapshot so it treats the now-empty slots as
    // the new baseline and doesn't try to fight the removal.
    snapshotPlayerRestraints();

    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
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

    // Only strip groups added AFTER grace started (graceStartGroups = snapshot at trigger time).
    // This fixes the bug where Grace=ON without Release=ON still removed existing restraints.
    const removeGroups = new Set(
        Player.Appearance
            .filter((i: Item) =>
                RESTRAINT_GROUPS.has(i.Asset.Group.Name) &&
                !NECK_GROUPS.has(i.Asset.Group.Name) &&
                !graceStartGroups.has(i.Asset.Group.Name) &&
                !isProtectedLocked(i),
            )
            .map((i: Item) => i.Asset.Group.Name),
    );
    if (removeGroups.size === 0) return;

    enforcing = true;
    try {
        Player.Appearance = Player.Appearance.filter(
            (i: Item) => !removeGroups.has(i.Asset.Group.Name),
        );
        snapshotPlayerRestraints();
        callBC(() => CharacterRefresh(Player, false));
        // Rate-limit server syncs — local refresh always runs, but the server
        // round-trips are capped to avoid flooding when CharacterRefresh is called
        // in rapid bursts (BC animation loop, other addons, etc.)
        const now = Date.now();
        if (now - lastGraceEnforceSync >= GRACE_SYNC_INTERVAL_MS) {
            lastGraceEnforceSync = now;
            callBC(() => ChatRoomCharacterUpdate(Player));
            callBC(() => ServerPlayerAppearanceSync());
        }
    } finally {
        enforcing = false;
    }
}

// -- Trigger functions ---------------------------------------------------------

export function triggerYellow(): void {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return;
    if (cfg.yellowRelease)  releaseBindingRestraints();
    if (cfg.yellowGrace)    startGrace(cfg.graceDurationMs);
    if (cfg.yellowAnnounce) {
        try {
            const graceDesc = cfg.graceDurationMs <= 0
                ? "indefinitely"
                : `for ${Math.round(cfg.graceDurationMs / 60_000)} min`;
            const gracePart = cfg.yellowGrace ? ` (grace period active ${graceDesc})` : "";
            ServerSend("ChatRoomChat", {
                Type: "Action",
                Content: `${Player.Name} calls yellow — taking a moment to breathe. Please give them space${gracePart}.`,
                Dictionary: [
                    { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                    { SourceCharacter: Player.MemberNumber },
                ],
            });
        } catch { /* ignore */ }
    }
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
    if (cfg.yellowLeave) {
        window.setTimeout(() => {
            // Both CommonSetScreen (async in BC R127) and ChatRoomLeave (potentially
            // hooked async by other mods) must have their Promise returns silenced.
            callBC(() => CommonSetScreen("Online", "ChatSearch"));
            callBC(() => ChatRoomLeave());
        }, 800);
    }
}

export function triggerRed(): void {
    const cfg = getSafewordConfig();
    if (!cfg.enabled) return;
    if (cfg.redRelease)  releaseBindingRestraints();
    if (cfg.redGrace)    startGrace(cfg.graceDurationMs);
    if (cfg.redAnnounce) {
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
    }
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
    if (cfg.redLeave) {
        window.setTimeout(() => {
            // Navigate away BEFORE ChatRoomLeave() clears room state so hooks
            // from other mods (e.g. CRABS) don't crash on the next render frame.
            // Both calls use callBC() to handle async rejections from mod hooks.
            callBC(() => CommonSetScreen("Online", "ChatSearch"));
            callBC(() => ChatRoomLeave());
        }, 800);
    }
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

    if (!matches(cfg.yellowWord) && !matches(cfg.redWord)) return false;

    // Debounce — the same Enter keypress can reach all three hook points
    // (capture keydown, ChatRoomKeyDown hook, ChatRoomSendChat hook) on some
    // BC builds, which would fire the safeword twice.  Silently consume any
    // re-trigger within 2 seconds of the first.
    const now = Date.now();
    if (now - lastSafewordTriggerTs < SAFEWORD_DEBOUNCE_MS) return true;
    lastSafewordTriggerTs = now;

    if (matches(cfg.yellowWord)) { triggerYellow(); return true; }
    if (matches(cfg.redWord))    { triggerRed();    return true; }
    return false;
}
