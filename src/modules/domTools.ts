// Creator-only DOM tools — visible exclusively to member #130267.
// Lets the creator configure a set of restraints (imported from a BC outfit code)
// and apply them to a saved list of people.  Only targets currently in the room
// are restrained; everyone else is silently skipped.

import { SerializedItem, RESTRAINT_GROUPS } from "./outfitManager";

export const DOM_CREATOR_ID = 130267;

export interface DomTarget {
    id: number;
    name: string; // display label — stored at add time, may differ from live BC name
}

export interface DomConfig {
    targets: DomTarget[];
    items: SerializedItem[]; // restraints to apply (gag, cuffs, etc.)
}

// Lucy and Lara are always pre-loaded on first use.
const DEFAULT_TARGETS: DomTarget[] = [
    { id: 230466, name: "Lucy"  },
    { id: 124264, name: "Lara"  },
];

// ── Storage ─────────────────────────────────────────────────────────────────

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function loadConfig(): DomConfig {
    try {
        const v = getStore().domConfig as DomConfig | undefined;
        if (v && Array.isArray(v.targets) && Array.isArray(v.items)) {
            return { targets: v.targets, items: v.items };
        }
    } catch { /* ignore */ }
    // First use — seed with defaults
    return { targets: [...DEFAULT_TARGETS], items: [] };
}

function saveConfig(cfg: DomConfig): void {
    try {
        getStore().domConfig = cfg;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isDomEnabled(): boolean {
    try { return Player.MemberNumber === DOM_CREATOR_ID; } catch { return false; }
}

export function getDomConfig(): DomConfig {
    return loadConfig();
}

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

export function setDomItems(items: SerializedItem[]): void {
    const cfg = loadConfig();
    cfg.items = items;
    saveConfig(cfg);
}

export function clearDomItems(): void {
    setDomItems([]);
}

// Room characters not already in the target list (excluding self).
export function getRoomAddable(): Array<{ id: number; name: string }> {
    try {
        const cfg = loadConfig();
        const existing = new Set(cfg.targets.map(t => t.id));
        const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        return room
            .filter(c => c.MemberNumber !== Player.MemberNumber && !existing.has(c.MemberNumber!))
            .map(c => ({
                id: c.MemberNumber!,
                name: ((c as unknown as Record<string, unknown>).Nickname as string | undefined) || c.Name || `#${c.MemberNumber}`,
            }));
    } catch { return []; }
}

// Parse a BC LZString outfit code and store the restraint items found in it.
export function importDomItemsFromCode(code: string): number {
    const LZ = (window as unknown as Record<string, unknown>).LZString as
        { decompressFromBase64?: (s: string) => string | null } | undefined;
    if (!LZ?.decompressFromBase64) throw new Error("LZString not available on this page.");

    const json = LZ.decompressFromBase64(code.trim());
    if (!json) throw new Error("Could not decompress — is this a valid BC outfit code?");

    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Decoded data is not valid JSON."); }
    if (!Array.isArray(raw)) throw new Error("Unexpected format — expected an appearance array.");

    const items: SerializedItem[] = (raw as Record<string, unknown>[])
        .filter(i => typeof i.Group === "string" && RESTRAINT_GROUPS.has(i.Group as string))
        .map(i => ({
            Group:      String(i.Group),
            Name:       String(i.Name ?? ""),
            Color:      i.Color as SerializedItem["Color"],
            Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
            Property:   typeof i.Property === "object" && i.Property !== null
                ? i.Property as Record<string, unknown> : undefined,
            Craft:      i.Craft as CraftingItem | undefined,
        }));

    if (items.length === 0) throw new Error("No restraint items found in this code.");
    setDomItems(items);
    return items.length;
}

// Apply the configured restraints to every target currently in the room.
// Uses BC's own InventoryWear function so all permission checks go through
// the game's normal system — lover/whitelist relationships are respected.
// Returns which targets were restrained and which were skipped (not in room).
export function applyDomRestraints(): { applied: DomTarget[]; skipped: DomTarget[] } {
    const cfg = loadConfig();
    const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
    const InventoryWearFn = (window as unknown as Record<string, unknown>).InventoryWear as
        ((C: Character, AssetName: string, Group: string, Color?: unknown, Difficulty?: number, AssetFamily?: string, Craft?: unknown) => void) | undefined;

    const applied: DomTarget[] = [];
    const skipped: DomTarget[] = [];

    for (const target of cfg.targets) {
        const char = room.find(c => c.MemberNumber === target.id);
        if (!char) {
            skipped.push(target);
            continue;
        }

        let anyApplied = false;
        for (const item of cfg.items) {
            try {
                if (InventoryWearFn) {
                    // Preferred: go through BC's own item application which handles
                    // permission validation for lover / whitelist relationships.
                    InventoryWearFn(
                        char,
                        item.Name,
                        item.Group,
                        item.Color,
                        item.Difficulty ?? 0,
                        Player.AssetFamily,
                        item.Craft,
                    );
                } else {
                    // Fallback: direct array manipulation (no permission bridging)
                    const asset = AssetGet(Player.AssetFamily, item.Group, item.Name);
                    if (!asset) continue;
                    const idx = char.Appearance.findIndex((a: Item) => a.Asset.Group.Name === item.Group);
                    if (idx >= 0) char.Appearance.splice(idx, 1);
                    char.Appearance.push({
                        Asset:    asset,
                        Color:    (item.Color ?? "Default") as string | string[],
                        Property: (item.Property ?? {}) as Record<string, unknown>,
                        Craft:    item.Craft as CraftingItem | undefined,
                    } as Item);
                }
                anyApplied = true;
            } catch { /* skip individual item failures silently */ }
        }

        if (anyApplied) {
            try {
                // Sync the updated character appearance to the server.
                // BC validates the relationship (lover / whitelist) server-side.
                CharacterRefresh(char, true, false);
                applied.push(target);
            } catch {
                skipped.push(target);
            }
        } else {
            skipped.push(target);
        }
    }

    return { applied, skipped };
}
