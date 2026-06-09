// Creator-only DOM tools — visible exclusively to member #130267.
// Supports multiple named restraint sets, each with its own items,
// chat command, and announce text template.

import { SerializedItem, RESTRAINT_GROUPS } from "./outfitManager";
import { callBC, getDisplayName, getSettings, syncSettings } from "./bcUtils";
import { getDomSetAnnounce } from "./settings";

export const DOM_CREATOR_ID = 130267;

export interface DomTarget {
    id: number;
    name: string;
}

export interface DomRestraintSet {
    id: string;
    name: string;             // e.g. "Gagged"
    command: string;          // without /, e.g. "gag"
    announceTemplate: string; // e.g. "snaps her fingers as {name} appears on {targets}~"
    items: SerializedItem[];
    targetId?: number;        // optional bound target — set always applies to this person
    targetName?: string;      // cached display name for the bound target
}

export interface DomConfig {
    targets: DomTarget[];
    sets: DomRestraintSet[];
}

const DEFAULT_TARGETS: DomTarget[] = [
    { id: 230466, name: "Lucy" },
    { id: 124264, name: "Lara" },
];

const DEFAULT_ANNOUNCE = "snaps her fingers as {name} appears on {targets}~";

// ── Internal ─────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }


function loadConfig(): DomConfig {
    try {
        const v = getSettings().domConfig as Partial<DomConfig> | undefined;
        if (v && Array.isArray(v.targets)) {
            return {
                targets: v.targets as DomTarget[],
                sets: Array.isArray(v.sets) ? v.sets as DomRestraintSet[] : [],
            };
        }
    } catch { /* ignore */ }
    return { targets: [...DEFAULT_TARGETS], sets: [] };
}

function saveConfig(cfg: DomConfig): void {
    try {
        getSettings().domConfig = cfg;
        syncSettings();
    } catch { /* ignore */ }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isDomEnabled(): boolean {
    try { return Player.MemberNumber === DOM_CREATOR_ID; } catch { return false; }
}

export function getDomConfig(): DomConfig { return loadConfig(); }

// -- Targets --

export function addDomTarget(id: number, name: string): void {
    const cfg = loadConfig();
    if (cfg.targets.some(t => t.id === id)) return;
    cfg.targets.push({ id, name });
    saveConfig(cfg);
}

export function removeDomTarget(id: number): void {
    const cfg = loadConfig();
    cfg.targets = cfg.targets.filter(t => t.id !== id);
    saveConfig(cfg);
}

// Room members not already in the target list (excluding self).
export function getRoomAddable(): Array<{ id: number; name: string }> {
    try {
        const existing = new Set(loadConfig().targets.map(t => t.id));
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        return room
            .filter(c => c.MemberNumber !== Player.MemberNumber && !existing.has(c.MemberNumber!))
            .map(c => ({
                id: c.MemberNumber!,
                name: ((c as unknown as Record<string, unknown>).Nickname as string | undefined)
                    || c.Name || `#${c.MemberNumber}`,
            }));
    } catch { return []; }
}

// -- Restraint sets --

export function createDomSet(name: string, command: string, announceTemplate: string): DomRestraintSet {
    const cfg = loadConfig();
    const set: DomRestraintSet = {
        id: uid(),
        name: name.trim() || "New Set",
        command: command.toLowerCase().trim().replace(/\s+/g, ""),
        announceTemplate: announceTemplate.trim() || DEFAULT_ANNOUNCE,
        items: [],
    };
    cfg.sets.push(set);
    saveConfig(cfg);
    return set;
}

export function updateDomSet(
    id: string,
    name: string,
    command: string,
    announceTemplate: string,
    items: SerializedItem[],
): void {
    const cfg = loadConfig();
    const set = cfg.sets.find(s => s.id === id);
    if (!set) return;
    set.name             = name.trim() || set.name;
    set.command          = command.toLowerCase().trim().replace(/\s+/g, "");
    set.announceTemplate = announceTemplate.trim() || DEFAULT_ANNOUNCE;
    set.items            = items;
    saveConfig(cfg);
}

export function deleteDomSet(id: string): void {
    const cfg = loadConfig();
    cfg.sets = cfg.sets.filter(s => s.id !== id);
    saveConfig(cfg);
}

/** Bind a permanent target to a restraint set (so its command always aims at them).
 *  Pass null to clear the binding and fall back to the standard TARGET selector. */
export function setDomSetTarget(setId: string, targetId: number | null, targetName: string): void {
    const cfg = loadConfig();
    const set = cfg.sets.find(s => s.id === setId);
    if (!set) return;
    if (targetId === null) {
        set.targetId = undefined;
        set.targetName = undefined;
    } else {
        set.targetId = targetId;
        set.targetName = targetName;
    }
    saveConfig(cfg);
}

// Parse a BC outfit code and return ALL items found — does NOT save anything.
// Returns every item that has a Group and Name field; the caller's picker UI
// shows checkboxes and the user decides which items to keep.
// Restraint items (matching RESTRAINT_GROUPS) are flagged so the UI can
// pre-check them by default.
export interface ParsedBCItem extends SerializedItem {
    isRestraint: boolean;
}

export function parseBCCodeItems(code: string): ParsedBCItem[] {
    const LZ = (window as unknown as Record<string, unknown>).LZString as
        { decompressFromBase64?: (s: string) => string | null } | undefined;
    if (!LZ?.decompressFromBase64) throw new Error("LZString not available on this page.");
    const json = LZ.decompressFromBase64(code.trim());
    if (!json) throw new Error("Could not decompress — is this a valid BC outfit code?");
    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Decoded data is not valid JSON."); }
    if (!Array.isArray(raw)) throw new Error("Unexpected format — expected an appearance array.");
    const items = (raw as Record<string, unknown>[])
        .filter(i => typeof i.Group === "string" && typeof i.Name === "string" && (i.Name as string) !== "")
        .map(i => ({
            Group:       String(i.Group),
            Name:        String(i.Name ?? ""),
            Color:       i.Color as SerializedItem["Color"],
            Difficulty:  typeof i.Difficulty === "number" ? i.Difficulty : undefined,
            Property:    typeof i.Property === "object" && i.Property !== null
                ? i.Property as Record<string, unknown> : undefined,
            Craft:       i.Craft as CraftingItem | undefined,
            isRestraint: RESTRAINT_GROUPS.has(String(i.Group)),
        }));
    if (items.length === 0) throw new Error("No items found in this code — is this a valid BC outfit code?");
    return items;
}

// Apply a restraint set to every in-room target, then send the announce emote.
export function applyDomSet(setId: string, targetIds?: Set<number>): { applied: string[]; skipped: string[] } {
    const cfg = loadConfig();
    const set = cfg.sets.find(s => s.id === setId);
    if (!set) return { applied: [], skipped: [] };

    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    const InventoryWearFn = (window as unknown as Record<string, unknown>).InventoryWear as
        ((...a: unknown[]) => void) | undefined;

    const applied: string[] = [];
    const skipped: string[] = [];

    // When explicit IDs are provided (UI button or per-set command), look up those
    // chars directly in the room — no dependency on cfg.targets.
    // When no IDs are given, fall back to the legacy saved-targets list.
    const targets: Array<{ id: number; name: string }> = targetIds && targetIds.size > 0
        ? [...targetIds].map(id => {
            const char = room.find(c => c.MemberNumber === id);
            const name = char
                ? ((char.Nickname as string | undefined)?.trim() || (char.Name as string) || String(id))
                : cfg.targets.find(t => t.id === id)?.name ?? String(id);
            return { id, name };
        })
        : cfg.targets;

    for (const target of targets) {
        const char = room.find(c => c.MemberNumber === target.id);
        if (!char) { skipped.push(target.name); continue; }

        let anyApplied = false;
        for (const item of set.items) {
            try {
                if (InventoryWearFn) {
                    InventoryWearFn(char, item.Name, item.Group,
                        item.Color, item.Difficulty ?? 0, Player.AssetFamily, item.Craft);
                    // InventoryWear has no Property parameter — restore it after the call
                    // so states like tight gag, device settings, etc. are preserved.
                    if (item.Property && Object.keys(item.Property).length > 0) {
                        const worn = char.Appearance.find((a: Item) => a.Asset.Group.Name === item.Group);
                        if (worn) {
                            worn.Property = {
                                ...(worn.Property as Record<string, unknown> ?? {}),
                                ...(item.Property as Record<string, unknown>),
                            } as Record<string, unknown>;
                        }
                    }
                } else {
                    const asset = AssetGet(Player.AssetFamily, item.Group, item.Name);
                    if (!asset) continue;
                    const idx = char.Appearance.findIndex(
                        (a: Item) => a.Asset.Group.Name === item.Group);
                    if (idx >= 0) char.Appearance.splice(idx, 1);
                    char.Appearance.push({
                        Asset: asset,
                        Color: (item.Color ?? "Default") as string | string[],
                        Property: (item.Property ?? {}) as Record<string, unknown>,
                        Craft: item.Craft as CraftingItem | undefined,
                    } as Item);
                }
                anyApplied = true;
            } catch { /* ignore individual item failures */ }
        }

        if (anyApplied) {
            try { syncChar(char); applied.push(target.name); }
            catch { skipped.push(target.name); }
        } else {
            skipped.push(target.name);
        }
    }

    // Send room announce after items have synced
    if (applied.length > 0 && set.announceTemplate.trim() && getDomSetAnnounce()) {
        window.setTimeout(() => {
            try {
                const text = set.announceTemplate
                    .replace(/\{name\}/gi,    set.name)
                    .replace(/\{targets\}/gi, applied.length > 1
                        ? applied.slice(0, -1).join(", ") + " and " + applied[applied.length - 1]
                        : applied[0] ?? "");
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: getDisplayName() + " " + text,
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            } catch { /* ignore */ }
        }, 200);
    }

    return { applied, skipped };
}

// ── Release / rescue helpers ─────────────────────────────────────────────────

/** Send a visible room action emote (e.g. "Neko puts Lucy on all fours."). */
function sendRoomAction(text: string): void {
    try {
        callBC(() => ServerSend("ChatRoomChat", {
            Type: "Action",
            Content: Player.Name + " " + text,
            Dictionary: [
                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                { SourceCharacter: Player.MemberNumber },
            ],
        }));
    } catch { /* ignore */ }
}

/** Resolve the display name of a character (Nickname > Name). */
function charDisplayName(char: Character): string {
    const c = char as unknown as Record<string, unknown>;
    return (c.Nickname as string | undefined)?.trim() || (c.Name as string | undefined) || "them";
}

// Shared sync helper for non-player characters.
function syncChar(char: Character): void {
    // Local visual refresh first (no push)
    callBC(() => CharacterRefresh(char, false, false));
    // Sort layers so the server packet contains the correct layer order
    try {
        const sortFn = (window as unknown as Record<string, unknown>).CharacterAppearanceSortLayers as
            ((c: Character) => Character) | undefined;
        if (sortFn) sortFn(char);
    } catch { /* ignore */ }
    // Push update to server — BC validates relationship permissions server-side
    try {
        const updateFn = (window as unknown as Record<string, unknown>).ChatRoomCharacterUpdate as
            ((c: Character) => void) | undefined;
        if (updateFn) callBC(() => updateFn(char));
        else callBC(() => CharacterRefresh(char, true, false));
    } catch { /* ignore */ }
}

// Returns the restraint items currently worn by each in-room target.
export function getTargetRestraints(): Array<{ target: DomTarget; items: Array<{ group: string; name: string }> }> {
    const cfg = loadConfig();
    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    const out: Array<{ target: DomTarget; items: Array<{ group: string; name: string }> }> = [];
    for (const target of cfg.targets) {
        const char = room.find(c => c.MemberNumber === target.id);
        if (!char) continue;
        const items = char.Appearance
            .filter((a: Item) => a.Asset.Group.IsRestraint)
            .map((a: Item) => ({ group: a.Asset.Group.Name, name: a.Asset.Name }));
        out.push({ target, items });
    }
    return out;
}

// Removes items (by group name) from a single in-room character.
export function removeTargetItems(targetId: number, groups: string[]): { inRoom: boolean; count: number } {
    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    const char = room.find(c => c.MemberNumber === targetId);
    if (!char) return { inRoom: false, count: 0 };

    const InventoryRemoveFn = (window as unknown as Record<string, unknown>).InventoryRemove as
        ((c: Character, group: string, push: boolean) => void) | undefined;

    let count = 0;
    for (const group of groups) {
        try {
            if (InventoryRemoveFn) {
                InventoryRemoveFn(char, group, false);
            } else {
                const idx = char.Appearance.findIndex((a: Item) => a.Asset.Group.Name === group);
                if (idx >= 0) char.Appearance.splice(idx, 1);
            }
            count++;
        } catch { /* ignore */ }
    }
    if (count > 0) syncChar(char);
    return { inRoom: true, count };
}

// Removes ALL restraint items from every in-room target.
export function removeAllTargetRestraints(targetIds?: Set<number>): Array<{ name: string; count: number; inRoom: boolean }> {
    const cfg = loadConfig();
    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    return cfg.targets.map(target => {
        const char = room.find(c => c.MemberNumber === target.id);
        if (!char) return { name: target.name, count: 0, inRoom: false };
        if (targetIds && !targetIds.has(target.id)) return { name: target.name, count: 0, inRoom: false };
        const groups = char.Appearance
            .filter((a: Item) => a.Asset.Group.IsRestraint)
            .map((a: Item) => a.Asset.Group.Name);
        const { count } = removeTargetItems(target.id, groups);
        return { name: target.name, count, inRoom: true };
    });
}

// Unlocks ALL locked items on every in-room target.
export function unlockAllTargetItems(targetIds?: Set<number>): Array<{ name: string; count: number; inRoom: boolean }> {
    const cfg = loadConfig();
    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    return cfg.targets.map(target => {
        const char = room.find(c => c.MemberNumber === target.id);
        if (!char) return { name: target.name, count: 0, inRoom: false };
        if (targetIds && !targetIds.has(target.id)) return { name: target.name, count: 0, inRoom: false };
        let count = 0;
        for (const item of char.Appearance) {
            const prop = item.Property as Record<string, unknown> | undefined;
            if (prop && typeof prop.LockedBy === "string" && prop.LockedBy !== "") {
                prop.LockedBy = "";
                if ("Password" in prop) delete prop.Password;
                count++;
            }
        }
        if (count > 0) syncChar(char);
        return { name: target.name, count, inRoom: true };
    });
}

// Returns every member currently in the room (excluding self).
export function getRoomMembers(): Array<{ id: number; name: string }> {
    try {
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        return room
            .filter(c => c.MemberNumber !== Player.MemberNumber)
            .map(c => ({
                id: c.MemberNumber!,
                name: (c as unknown as Record<string, unknown>).Nickname as string || c.Name || String(c.MemberNumber),
            }));
    } catch { return []; }
}

// Returns a snapshot of what a room member is wearing, split into restraints and locks.
export function getRoomMemberItems(memberId: number): Array<{ group: string; name: string; locked: boolean }> {
    try {
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        const char = room.find(c => c.MemberNumber === memberId);
        if (!char) return [];
        return char.Appearance
            // Guard against unresolved assets (BC drops unknown assets, but mods can inject items
            // where Asset is null — one bad entry would throw and return [] without this filter)
            .filter((item: Item) => item.Asset?.Group?.Name && RESTRAINT_GROUPS.has(item.Asset.Group.Name))
            .map((item: Item) => {
                const prop = item.Property as Record<string, unknown> | undefined;
                const locked = typeof prop?.LockedBy === "string" && prop.LockedBy !== "";
                return { group: item.Asset.Group.Name, name: item.Asset.Name, locked };
            });
    } catch { return []; }
}

/**
 * Full rescue — strips ALL locks and removes ALL restraints from a room member.
 * Bypasses BC's lock checks entirely by writing directly to the character's
 * Appearance array. Returns { found, locksCleared, restraintsRemoved }.
 */
export function rescueRoomMember(memberId: number): { found: boolean; locksCleared: number; restraintsRemoved: number } {
    try {
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        const char = room.find(c => c.MemberNumber === memberId);
        if (!char) return { found: false, locksCleared: 0, restraintsRemoved: 0 };

        // 1. Strip all locks first (so nothing is "locked" when we remove)
        let locksCleared = 0;
        for (const item of char.Appearance) {
            const prop = item.Property as Record<string, unknown> | undefined;
            if (prop && typeof prop.LockedBy === "string" && prop.LockedBy !== "") {
                prop.LockedBy = "";
                if ("Password" in prop) delete prop.Password;
                if ("CombinationNumber" in prop) delete prop.CombinationNumber;
                locksCleared++;
            }
        }

        // 2. Strip all restraints — filter Appearance directly to bypass lock rules
        const before = char.Appearance.length;
        char.Appearance = char.Appearance.filter((item: Item) => !item.Asset.Group.IsRestraint);
        const restraintsRemoved = before - char.Appearance.length;

        if (locksCleared > 0 || restraintsRemoved > 0) {
            syncChar(char);
        }
        return { found: true, locksCleared, restraintsRemoved };
    } catch { return { found: false, locksCleared: 0, restraintsRemoved: 0 }; }
}

/**
 * Clear locks (LockedBy / Password / CombinationNumber) on specific item groups
 * for a room member.  Returns the number of items unlocked.
 */
export function clearLocksOnMember(memberId: number, groups: string[]): number {
    try {
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        const char = room.find(c => c.MemberNumber === memberId);
        if (!char) return 0;
        const groupSet = new Set(groups);
        let count = 0;
        for (const item of char.Appearance) {
            if (!groupSet.has(item.Asset.Group.Name)) continue;
            const prop = item.Property as Record<string, unknown> | undefined;
            if (prop && typeof prop.LockedBy === "string" && prop.LockedBy !== "") {
                prop.LockedBy = "";
                if ("Password" in prop) delete prop.Password;
                if ("CombinationNumber" in prop) delete prop.CombinationNumber;
                count++;
            }
        }
        if (count > 0) syncChar(char);
        return count;
    } catch { return 0; }
}

/**
 * Remove specific item groups from a room member's Appearance, bypassing all
 * BC lock rules (locks on the targeted items are cleared first).
 * Returns the number of items removed.
 */
export function removeItemsFromMember(memberId: number, groups: string[]): number {
    try {
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        const char = room.find(c => c.MemberNumber === memberId);
        if (!char) return 0;
        const groupSet = new Set(groups);
        // Clear locks on targeted items first so the filter below can remove them
        for (const item of char.Appearance) {
            if (!groupSet.has(item.Asset.Group.Name)) continue;
            const prop = item.Property as Record<string, unknown> | undefined;
            if (prop && typeof prop.LockedBy === "string" && prop.LockedBy !== "") {
                prop.LockedBy = "";
                if ("Password" in prop) delete prop.Password;
                if ("CombinationNumber" in prop) delete prop.CombinationNumber;
            }
        }
        const before = char.Appearance.length;
        char.Appearance = char.Appearance.filter((item: Item) => !groupSet.has(item.Asset.Group.Name));
        const removed = before - char.Appearance.length;
        if (removed > 0) syncChar(char);
        return removed;
    } catch { return 0; }
}

// ── Expression control ────────────────────────────────────────────────────────

const EXPR_GROUPS_DOM = ["Eyes", "Eyes2", "Mouth", "Eyebrows", "Blush", "Fluids", "Emoticon"] as const;

function findRoomChar(memberId: number): Character | undefined {
    return ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined)
        ?.find(c => c.MemberNumber === memberId);
}

/** Apply an array of [group, exprName|null] pairs to a character all at once, then sync once. */
export function applyTargetExpressionPreset(
    targetId: number,
    groups: ReadonlyArray<readonly [string, string | null]>,
): void {
    try {
        const char = findRoomChar(targetId);
        if (!char) return;
        const setFn = (window as unknown as Record<string, unknown>).CharacterSetFacialExpression as
            ((c: Character, g: string, e: string | null) => void) | undefined;
        if (typeof setFn === "function") {
            for (const [group, expr] of groups) { try { setFn(char, group, expr); } catch { /* ignore */ } }
        } else {
            const assetGetFn = (window as unknown as Record<string, unknown>).AssetGet as
                ((fam: string, grp: string, name: string) => unknown) | undefined;
            for (const [group, exprName] of groups) {
                try {
                    const app = char.Appearance as Item[];
                    const idx = app.findIndex(i => i.Asset.Group.Name === group);
                    if (idx !== -1) app.splice(idx, 1);
                    if (exprName && typeof assetGetFn === "function") {
                        const asset = assetGetFn(char.AssetFamily ?? "Female3DCG", group, exprName);
                        if (asset) app.push({ Asset: asset, Color: "Default", Difficulty: 0, Property: { Expression: exprName } } as unknown as Item);
                    }
                } catch { /* ignore */ }
            }
        }
        syncChar(char);
    } catch { /* ignore */ }
}

/** Clear all expression groups on an in-room character. */
export function clearTargetExpressions(targetId: number): void {
    applyTargetExpressionPreset(targetId, EXPR_GROUPS_DOM.map(g => [g, null] as const));
}

// ── Pose control ──────────────────────────────────────────────────────────────

/** Set the active pose on an in-room character. Pass empty array to clear all poses. */
export function setTargetPoses(targetId: number, poses: string[], poseName?: string): void {
    try {
        const char = findRoomChar(targetId);
        if (!char) return;
        // Set ActivePose directly - works for single and multi-pose combinations
        // across all BC versions (CharacterSetActivePose only accepts a single string
        // in many versions and breaks multi-pose combos like Kneel+OverTheHead).
        (char as unknown as Record<string, unknown>).ActivePose = poses.length ? poses : [];
        syncChar(char);
        // Send a visible room emote so others know what's happening
        const name = charDisplayName(char);
        const label = poseName ?? (poses.length ? poses.join("+") : "stand");
        const desc = poses.length
            ? `guides ${name} into the ${label} position.`
            : `lets ${name} return to a comfortable position.`;
        sendRoomAction(desc);
    } catch { /* ignore */ }
}

// ── Toy control ───────────────────────────────────────────────────────────────

/** Returns vibrating items currently worn by an in-room character. */
export function getTargetVibratingItems(targetId: number): Array<{ group: string; name: string; mode: string }> {
    try {
        const char = findRoomChar(targetId);
        if (!char) return [];
        return char.Appearance
            .filter((item: Item) => {
                const prop = item.Property as Record<string, unknown> | undefined;
                const asset = item.Asset as unknown as Record<string, unknown>;
                return asset.Archetype === "VibratingItem" || (prop && typeof prop.Mode === "string");
            })
            .map((item: Item) => ({
                group: item.Asset.Group.Name,
                name: item.Asset.Name,
                mode: String((item.Property as Record<string, unknown> | undefined)?.Mode ?? "Off"),
            }));
    } catch { return []; }
}

/** Set the vibrator mode on all vibrating items worn by an in-room character. */
export function setTargetToyMode(targetId: number, mode: string): void {
    try {
        const char = findRoomChar(targetId);
        if (!char) return;
        let changed = false;

        // If BC's ExtendedItemSetValue is available, use it with publish=true so BC handles
        // derived-state updates (Effect, Intensity …) AND the server push in one call.
        // We must NOT call syncChar afterwards — CharacterRefresh inside syncChar can
        // overwrite in-flight property changes before ChatRoomCharacterUpdate fires.
        const extSetFn = (window as unknown as Record<string, unknown>).ExtendedItemSetValue as
            ((c: Character, i: Item, v: Record<string, unknown>, push: boolean) => void) | undefined;
        // Also grab InventoryGet so we work on BC's live item reference (not a stale copy).
        const invGetFn = (window as unknown as Record<string, unknown>).InventoryGet as
            ((c: Character, group: string) => Item | null | undefined) | undefined;
        const updateFn = (window as unknown as Record<string, unknown>).ChatRoomCharacterUpdate as
            ((c: Character) => void) | undefined;

        let usedExtSet = false;

        for (const item of char.Appearance) {
            const asset = item.Asset as unknown as Record<string, unknown>;
            const prop = item.Property as Record<string, unknown> | undefined;
            // Detect vibrating items: exact archetype match OR existing Mode property
            if (asset.Archetype !== "VibratingItem" && !(prop && typeof prop.Mode === "string")) continue;
            try {
                if (extSetFn) {
                    // publish=true → BC updates derived state + pushes ChatRoomCharacterUpdate itself
                    extSetFn(char, item, { Mode: mode }, true);
                    changed = true;
                    usedExtSet = true;
                } else {
                    // Fallback: use InventoryGet for the canonical live reference, then mutate in-place
                    const liveItem = invGetFn ? (invGetFn(char, item.Asset.Group.Name) ?? item) : item;
                    if (!liveItem.Property) (liveItem as unknown as Record<string, unknown>).Property = {};
                    (liveItem.Property as Record<string, unknown>).Mode = mode;
                    changed = true;
                }
            } catch { /* ignore */ }
        }

        if (changed) {
            if (!usedExtSet) {
                // Manual push — bypass CharacterRefresh entirely to preserve our in-place changes
                callBC(() => updateFn ? updateFn(char) : CharacterRefresh(char, true, false));
            }
            const name = charDisplayName(char);
            const desc = mode === "Off"
                ? `turns ${name}'s toy off.`
                : `sets ${name}'s toy to ${mode}.`;
            sendRoomAction(desc);
        }
    } catch { /* ignore */ }
}

// ── Activity control ──────────────────────────────────────────────────────────

/** Activity label -> room action description. */
const ACTIVITY_DESCS: Record<string, (name: string) => string> = {
    "Spank":   n => `gives ${n} a firm spank.`,
    "Pat":     n => `pats ${n} on the head.`,
    "Kiss":    n => `leans in and kisses ${n}.`,
    "Bite":    n => `bites ${n}'s neck.`,
    "Slap":    n => `slaps ${n}.`,
    "Caress":  n => `caresses ${n} gently.`,
    "Massage": n => `massages ${n}.`,
    "Lick":    n => `licks ${n}.`,
};

/**
 * Maps our internal activity label to the native BC ActivityName used for animation/sound triggers.
 * Required when the label doesn't match an activity that BC's engine recognises (e.g. "Pat").
 */
const BC_ACTIVITY_NAME: Record<string, string> = {
    "Pat": "Caress",  // no native "Pat" in BC — use Caress animation on the head
};

/**
 * Perform a quick action on an in-room character.
 * Sends a Type:"Activity" message so BC clients play the matching facial
 * expressions and sounds.  The same Content/MISSING-TEXT trick used by
 * sendRoomAction controls the visible chat text.
 */
export function performActivityOnTarget(targetId: number, activityName: string, zone: string): boolean {
    try {
        const target = findRoomChar(targetId);
        if (!target) return false;
        const name = charDisplayName(target);
        const descFn = ACTIVITY_DESCS[activityName];
        const desc = descFn ? descFn(name) : `${activityName.toLowerCase()}s ${name}.`;
        const displayText = Player.Name + " " + desc;
        // BC activity name for animation (may differ from our internal label, e.g. "Pat"→"Caress")
        const bcActivity = BC_ACTIVITY_NAME[activityName] ?? activityName;
        callBC(() => ServerSend("ChatRoomChat", {
            Type: "Activity",
            Content: displayText,
            Dictionary: [
                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                { Tag: "SourceCharacter",  MemberNumber: Player.MemberNumber },
                { Tag: "TargetCharacter",  MemberNumber: targetId },
                { Tag: "ActivityName",     ActivityName: bcActivity },
                { Tag: "AssetGroupName",   AssetGroupName: zone },
            ],
        }));
        return true;
    } catch { return false; }
}

// Handle a chat command (e.g. /gag → apply the matching set).
export function handleDomCommand(input: string): boolean {
    if (!isDomEnabled()) return false;
    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return false;
    const command = trimmed.slice(1).toLowerCase().trim();
    const set = loadConfig().sets.find(s => s.command && s.command.toLowerCase() === command);
    if (!set) return false;
    // Per-set bound target takes priority; no bound target → fall back to saved targets
    const targetIds = set.targetId ? new Set([set.targetId]) : undefined;
    applyDomSet(set.id, targetIds);
    return true;
}
