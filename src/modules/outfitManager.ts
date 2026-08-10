import { UI } from "./ui";
import { getDisplayName, getSettings, syncSettings, LOCAL_OUTFITS_KEY, LOCAL_RESTRAINTS_KEY } from "./bcUtils";
import { getExpressionPresets, applyExpressionPreset } from "./expressions";

export interface SerializedItem {
    Group: string;
    Name: string;
    Color: string | string[] | undefined;
    Difficulty: number | undefined;
    Property: Record<string, unknown> | undefined;
    Craft: CraftingItem | undefined;
}

export interface OutfitTag {
    id: string;
    name: string;
    color: string; // chip background color, e.g. "#cf6f98"
}

export interface ConfiguredOutfit {
    id: string;
    command: string;
    displayName: string;
    announceText: string;
    nickname: string | null;          // optional nickname to set when outfit is worn (null = no change)
    title:    string | null;          // optional title to set when outfit is worn (null = use default / no change)
    tagIds: string[];
    includeRestraints: boolean;
    preserveRestraints: boolean;      // keep existing restraints when applying (default: true)
    preserveClothing: boolean;        // keep existing clothing (non-restraint) when applying (default: false)
    nameInAnnounce: boolean;          // whether to prepend the player name to the announce text (default: true)
    expressionPresetId: string | null; // optional face preset to apply when outfit is worn (null = no change)
    items: SerializedItem[];
    local?: boolean;                  // true = stored in localStorage (this device only, shared across accounts, no account budget)
}

export const RESTRAINT_GROUPS = new Set([
    "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
    "ItemMouth", "ItemMouth2", "ItemMouth3", "ItemMouthAccessory", "ItemHead", "ItemHood",
    "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
    "ItemPelvis", "ItemVulva", "ItemVulvaPiercings", "ItemButt", "ItemBreast",
    "ItemNipples", "ItemNipplesPiercings", "ItemHandheld",
    "ItemTorso", "ItemTorso2", "ItemBody",
    "ItemDevices",  // cages, kennels, lockers, X-crosses, wooden boxes
    "ItemAddon",    // ceiling ropes, ceiling chains
    "ItemEars", "ItemNose", "ItemMisc",
]);

// Returns a warning message if applying this outfit would remove/replace worn restraints,
// or null if no restraints would be affected.
export function getOutfitRestraintWarning(outfit: ConfiguredOutfit): string | null {
    try {
        const currentRestraints = Player.Appearance.filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
        if (!currentRestraints.length) return null;
        const outfitRestraintGroups = new Set(outfit.items.filter(i => RESTRAINT_GROUPS.has(i.Group)).map(i => i.Group));
        let removed = 0, replaced = 0;
        for (const item of currentRestraints) {
            const group = item.Asset.Group.Name;
            if (outfitRestraintGroups.has(group)) replaced++;
            else if (!outfit.preserveRestraints) removed++;
        }
        if (removed === 0 && replaced === 0) return null;
        const parts: string[] = [];
        if (removed > 0) parts.push(`remove ${removed} restraint${removed !== 1 ? "s" : ""}`);
        if (replaced > 0) parts.push(`replace ${replaced} restraint${replaced !== 1 ? "s" : ""}`);
        return `"${outfit.displayName}" will ${parts.join(" and ")}. Continue?`;
    } catch { return null; }
}

// Returns a warning message if applying this restraint set would replace currently worn restraints.
export function getRestraintSetWarning(set: ConfiguredOutfit): string | null {
    try {
        const setGroups = new Set(set.items.map(i => i.Group));
        const clashing = Player.Appearance.filter((i: Item) =>
            RESTRAINT_GROUPS.has(i.Asset.Group.Name) && setGroups.has(i.Asset.Group.Name)
        );
        if (!clashing.length) return null;
        return `"${set.displayName}" will replace ${clashing.length} worn restraint${clashing.length !== 1 ? "s" : ""}. Continue?`;
    } catch { return null; }
}

const MAX_SERIALIZE_DEPTH = 12;
let outfitApplyPending = false;
let refreshScheduled = false;
let cachedOutfits: ConfiguredOutfit[] | null = null;


// -- Local (device) storage ---------------------------------------------------
// Outfits/restraint sets flagged local:true live in localStorage instead of the
// BC account: they use no account storage (so no server budget / relog risk)
// and are visible to EVERY account logged in from this browser.
// Keys live in bcUtils so the backup code can see them too - see the note there.

function readLocalList(key: string): ConfiguredOutfit[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const v = JSON.parse(raw) as unknown;
        return Array.isArray(v)
            ? (v as ConfiguredOutfit[]).map(o => sanitizeOutfit({ ...o, local: true }))
            : [];
    } catch { return []; }
}

function writeLocalList(key: string, list: ConfiguredOutfit[]): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(list.map(sanitizeOutfit)));
        return true;
    } catch {
        // Named clearly as the BROWSER, because the account message looks similar
        // and the fix is completely different - nothing here is on your account.
        localNotice(
            "Not saved. This BROWSER's storage is full - this is not your BC account, " +
            "and nothing on your account has changed. Delete some 💾 This device outfits, " +
            "or clear old site data for this browser.",
            "#ff8a8a",
        );
        return false;
    }
}

function loadOutfitsFromSettings(): ConfiguredOutfit[] {
    const list = getSettings().outfits;
    const account = Array.isArray(list) ? (list as ConfiguredOutfit[]).map(sanitizeOutfit) : [];
    const outfits = [...account, ...readLocalList(LOCAL_OUTFITS_KEY)];
    cachedOutfits = outfits;
    return outfits;
}

export function getOutfits(): ConfiguredOutfit[] {
    return cachedOutfits ?? loadOutfitsFromSettings();
}

/**
 * Drops the in-memory copies so the next read picks the lists up again.
 * Needed after a backup restore, which writes localStorage underneath us - the
 * cache would otherwise keep serving the pre-restore lists until a reload.
 */
export function reloadLocalLists(): void {
    cachedOutfits = null;
    cachedRestraints = null;
}

export function getDefaultNickname(): string {
    const raw = getSettings().defaultNickname;
    return typeof raw === "string" ? raw : "";
}

export function setDefaultNickname(nick: string): void {
    getSettings().defaultNickname = nick.trim();
    syncSettings();
}

export function getDefaultTitle(): string {
    const raw = getSettings().defaultTitle;
    return typeof raw === "string" ? raw : "";
}

export function setDefaultTitle(title: string): void {
    getSettings().defaultTitle = title;
    syncSettings();
}

// Budget for the serialized outfit list inside EBC's settings. A full set of
// crafted restraints with long descriptions can hit several KB per outfit -
// unbounded growth eventually blows BC's ~180 KB account cap and the server
// starts dropping the connection on every sync (infinite relog loop).
export const OUTFITS_BUDGET = 60_000;

/** Persists the outfit list. Account-stored outfits go to the BC account (60 KB
 *  budget); local:true outfits go to this device's localStorage. Returns false
 *  (keeping the previous list) when the account part would exceed the budget. */
function saveOutfits(list: ConfiguredOutfit[]): boolean {
    const sanitized  = list.map(sanitizeOutfit);
    const account    = sanitized.filter(o => !o.local);
    const localList  = sanitized.filter(o => o.local === true);
    try {
        const size = JSON.stringify(account).length;
        // Refuse only a save that makes the account portion BIGGER. Refusing
        // every save while over budget also refused deleting one and moving one
        // to this device - the exact two actions the message tells you to take.
        // The first attempt at this used >=, which still refused any save that
        // left the account portion the same size: deleting a device-stored
        // outfit, or renaming one, neither of which touches the account at all.
        const storedAccount = getSettings().outfits;
        const prevSize = Array.isArray(storedAccount) ? JSON.stringify(storedAccount).length : 0;
        if (size > OUTFITS_BUDGET && size > prevSize) {
            localNotice(
                `Not saved. Your BC ACCOUNT outfit space is full - ${Math.round(size / 1000)} KB of ${OUTFITS_BUDGET / 1000} KB. ` +
                "This is your account, not this device. " +
                "Deleting an outfit and moving one to 💾 This device both still work while it is full - they make it smaller.",
                "#ff8a8a",
            );
            return false;
        }
    } catch { /* size check best-effort */ }
    if (!writeLocalList(LOCAL_OUTFITS_KEY, localList)) return false;
    cachedOutfits = sanitized;
    getSettings().outfits = account;
    syncSettings();
    return true;
}

/**
 * Moves EVERY outfit to or from this-device storage in one save.
 *
 * The storage manager's category switch used to go through the generic
 * device-key mechanism, which relocates the `outfits` settings key and leaves
 * each outfit's own `local` flag untouched - but the size bar, the per-item
 * Account/Local pills and the budget check all read that flag, so the switch
 * went green while nothing they measure actually moved. This drives the flag
 * they all agree on.
 *
 * One save rather than one per outfit: each save re-serialises the whole list,
 * and doing that per item over a library big enough to hit the limit is exactly
 * where it would be slowest.
 */
export function setAllOutfitsStorage(local: boolean): boolean {
    const list = getOutfits().map(o => ({ ...o, local: local ? true as const : undefined }));
    const ok = saveOutfits(list);
    if (ok) localNotice(local
        ? `All ${list.length} outfits moved to THIS DEVICE - they use no account storage now.`
        : `All ${list.length} outfits moved to your BC ACCOUNT - synced across devices.`);
    return ok;
}

/** Moves an outfit between account storage (synced) and this-device storage. */
export function setOutfitStorage(id: string, local: boolean): boolean {
    const outfits = getOutfits().map(o => o.id === id ? { ...o, local: local ? true : undefined } : o);
    const ok = saveOutfits(outfits);
    if (ok) localNotice(local
        ? "Outfit moved to THIS DEVICE - no account storage used; visible to every account in this browser."
        : "Outfit moved to your BC ACCOUNT - synced across devices.");
    return ok;
}

function sanitizeSerializable(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
    if (value == null) return value;
    if (depth > MAX_SERIALIZE_DEPTH) return undefined;

    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map(entry => sanitizeSerializable(entry, seen, depth + 1))
            .filter(entry => entry !== undefined);
    }

    if (valueType !== "object") return undefined;

    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return undefined;
    seen.add(obj);

    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
        seen.delete(obj);
        return undefined;
    }

    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
        const sanitized = sanitizeSerializable(entry, seen, depth + 1);
        if (sanitized !== undefined) {
            clone[key] = sanitized;
        }
    }

    seen.delete(obj);
    return clone;
}

function sanitizeColor(color: SerializedItem["Color"]): SerializedItem["Color"] {
    if (typeof color === "string") return color;
    if (Array.isArray(color)) {
        return color.filter((entry): entry is string => typeof entry === "string");
    }
    return undefined;
}

function sanitizeCraft(craft: CraftingItem | undefined): CraftingItem | undefined {
    const sanitized = sanitizeSerializable(craft);
    return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? sanitized as CraftingItem
        : undefined;
}

function sanitizeProperty(property: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    const sanitized = sanitizeSerializable(property);
    return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? sanitized as Record<string, unknown>
        : undefined;
}

function sanitizeItem(item: SerializedItem): SerializedItem {
    return {
        Group: item.Group,
        Name: item.Name,
        Color: sanitizeColor(item.Color),
        Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
        Property: sanitizeProperty(item.Property),
        Craft: sanitizeCraft(item.Craft),
    };
}

function sanitizeOutfit(outfit: ConfiguredOutfit): ConfiguredOutfit {
    return {
        id: outfit.id,
        command: outfit.command,
        displayName: outfit.displayName,
        announceText: outfit.announceText,
        nickname: typeof outfit.nickname === "string" ? outfit.nickname.trim() || null : null,
        title:    typeof outfit.title    === "string" ? outfit.title.trim()    || null : null,
        tagIds: Array.isArray(outfit.tagIds) ? outfit.tagIds.filter((t: unknown) => typeof t === "string") : [],
        includeRestraints: !!outfit.includeRestraints,
        // Default true (preserve) for existing outfits that don't have this field yet
        preserveRestraints: typeof outfit.preserveRestraints === "boolean" ? outfit.preserveRestraints : true,
        // Default false — opt-in; restraints-only imports set this to true automatically
        preserveClothing: typeof outfit.preserveClothing === "boolean" ? outfit.preserveClothing : false,
        // Default true — existing outfits always included the name
        nameInAnnounce: typeof outfit.nameInAnnounce === "boolean" ? outfit.nameInAnnounce : true,
        // null = no expression change; string = preset ID to apply when worn
        expressionPresetId: typeof outfit.expressionPresetId === "string" && outfit.expressionPresetId ? outfit.expressionPresetId : null,
        items: Array.isArray(outfit.items) ? outfit.items.map(sanitizeItem) : [],
        local: outfit.local === true ? true : undefined,
    };
}

function sanitizeLiveAppearance(): void {
    for (const item of Player.Appearance) {
        item.Color = sanitizeColor(item.Color);
        item.Property = sanitizeProperty(item.Property);
        item.Craft = sanitizeCraft(item.Craft);
    }
}

function cloneAppearanceItem(item: Item): Item | null {
    const asset = AssetGet(Player.AssetFamily, item.Asset.Group.Name, item.Asset.Name);
    if (!asset) return null;
    return {
        Asset: asset,
        Color: sanitizeColor(item.Color),
        Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
        Property: sanitizeProperty(item.Property),
        Craft: sanitizeCraft(item.Craft),
    };
}

function buildAppearanceItem(saved: SerializedItem): Item | null {
    const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
    if (!asset) return null;

    const property = saved.Property ? { ...saved.Property } : undefined;
    if (property) {
        delete property["LockedBy"];
        delete property["LockMemberNumber"];
        delete property["CombinationNumber"];
        delete property["Password"];
        delete property["MemberNumberListKeys"];
    }

    return {
        Asset: asset,
        Color: saved.Color,
        Difficulty: saved.Difficulty,
        Property: property,
        Craft: saved.Craft ? { ...saved.Craft } : undefined,
    };
}

function sendRoomAppearanceUpdate(): void {
    if (Player.OnlineID == null) return;
    ServerSend("ChatRoomCharacterUpdate", {
        ID: Player.OnlineID,
        ActivePose: Player.ActivePose ?? null,
        Appearance: ServerAppearanceBundle(Player.Appearance),
    });
}

function scheduleAppearanceRefresh(): void {
    if (refreshScheduled) return;
    refreshScheduled = true;
    window.setTimeout(() => {
        try {
            CharacterRefresh(Player, false, false);
        } finally {
            refreshScheduled = false;
        }
    }, 0);
}

function captureAppearance(includeRestraints: boolean): SerializedItem[] {
    return Player.Appearance
        .filter(item => includeRestraints || !RESTRAINT_GROUPS.has(item.Asset.Group.Name))
        .map(item => sanitizeItem({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property,
            Craft: item.Craft,
        }));
}

export function applyOutfit(outfit: ConfiguredOutfit): void {
    if (outfitApplyPending) {
        localNotice("An outfit swap is already in progress.", "#ffb7c7");
        return;
    }
    outfitApplyPending = true;
    // Watchdog: the normal reset lives inside the deferred setTimeout below. If the
    // synchronous body throws before that timeout is scheduled, the flag would stick
    // true forever and permanently block every future swap. This guarantees the flag
    // clears within 5 s regardless; it is cancelled on the normal success path.
    const applyWatchdog = window.setTimeout(() => { outfitApplyPending = false; }, 5_000);

    const nextAppearance: Item[] = [];
    const outfitGroups = new Set(outfit.items.map(i => i.Group));

    // If preserveClothing is on, carry over all current non-restraint items —
    // but skip any group the outfit itself provides (no conflicts).
    if (outfit.preserveClothing) {
        for (const currentItem of Player.Appearance) {
            const group = currentItem.Asset.Group.Name;
            if (RESTRAINT_GROUPS.has(group) || outfitGroups.has(group)) continue;
            const cloned = cloneAppearanceItem(currentItem);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    // If preserveRestraints is on, copy the player's current restraints across —
    // but skip any group that the outfit itself already has an item for (no conflicts).
    if (outfit.preserveRestraints) {
        for (const currentItem of Player.Appearance) {
            const group = currentItem.Asset.Group.Name;
            if (!RESTRAINT_GROUPS.has(group) || outfitGroups.has(group)) continue;
            const cloned = cloneAppearanceItem(currentItem);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    for (const saved of outfit.items) {
        const built = buildAppearanceItem(saved);
        if (built) nextAppearance.push(built);
    }

    // Enforce outfit whitelist — protected slots always keep their current item
    const _wl = getOutfitWhitelist();
    if (_wl.length) {
        for (const _grp of _wl) {
            const _orig = Player.Appearance.find((i: Item) => i.Asset.Group.Name === _grp);
            if (!_orig) continue;
            const _cloned = cloneAppearanceItem(_orig);
            if (!_cloned) continue;
            const _idx = nextAppearance.findIndex(i => i.Asset.Group.Name === _grp);
            if (_idx >= 0) nextAppearance.splice(_idx, 1, _cloned);
            else nextAppearance.push(_cloned);
        }
    }

    // Respect BC locks — items with a padlock or in an owner/lover-blocked zone must
    // survive the outfit swap.  We collect these from the PRE-swap appearance and
    // force-restore them after everything else has been built, so they always win over
    // outfit items, preserve-flags, and the whitelist above.
    for (const currentItem of Player.Appearance) {
        const group = currentItem.Asset.Group.Name;
        const prop = currentItem.Property as Record<string, unknown> | undefined;
        const isLocked = prop?.LockedBy != null;
        let isBlocked = false;
        if (!isLocked) {
            try {
                const w = window as unknown as Record<string, unknown>;
                isBlocked = !!(w.InventoryGroupIsBlocked as ((c: unknown, g: string) => boolean) | undefined)?.(Player, group);
            } catch { /* ignore */ }
        }
        if (!isLocked && !isBlocked) continue;
        // Force-restore this item verbatim (with its lock properties intact)
        const restoredProp = currentItem.Property ? { ...(currentItem.Property as Record<string, unknown>) } : undefined;
        const restoredItem: Item = {
            Asset: currentItem.Asset,
            Color: currentItem.Color,
            Difficulty: currentItem.Difficulty,
            Property: restoredProp,
            Craft: currentItem.Craft,
        };
        const existingIdx = nextAppearance.findIndex(i => i.Asset.Group.Name === group);
        if (existingIdx >= 0) nextAppearance[existingIdx] = restoredItem;
        else nextAppearance.push(restoredItem);
    }

    Player.Appearance = nextAppearance;
    sanitizeLiveAppearance();
    sendRoomAppearanceUpdate();
    scheduleAppearanceRefresh();

    // Apply linked face expression preset if one is configured for this outfit
    if (outfit.expressionPresetId) {
        try {
            const exprPreset = getExpressionPresets().find(p => p.id === outfit.expressionPresetId);
            if (exprPreset) window.setTimeout(() => {
                try { applyExpressionPreset(exprPreset); } catch { /* ignore */ }
            }, 100);
        } catch { /* ignore */ }
    }

    // Apply nickname — outfit-specific takes priority, falls back to default
    const nickToApply = outfit.nickname || getDefaultNickname();
    if (nickToApply) {
        try {
            (Player as unknown as Record<string, unknown>).Nickname = nickToApply;
            type AccountUpdater = { QueueData(data: Record<string, unknown>): void };
            const updater = (window as unknown as Record<string, unknown>).ServerAccountUpdate as AccountUpdater | undefined;
            if (updater?.QueueData) updater.QueueData({ Nickname: nickToApply });
        } catch { /* ignore */ }
    }

    // Apply title — outfit-specific takes priority, falls back to default title
    // "__clear__" sentinel = explicitly remove the title (set to "")
    // ""  = no preference configured → don't touch the title
    const titleRaw = outfit.title ?? getDefaultTitle() ?? "";
    if (titleRaw) {
        try {
            const bcTitle = titleRaw === "__clear__" ? "" : titleRaw;
            (Player as unknown as Record<string, unknown>).Title = bcTitle;
            type AccountUpdater2 = { QueueData(data: Record<string, unknown>): void };
            const updater2 = (window as unknown as Record<string, unknown>).ServerAccountUpdate as AccountUpdater2 | undefined;
            if (updater2?.QueueData) updater2.QueueData({ Title: bcTitle });
        } catch { /* ignore */ }
    }

    // Let the appearance update hit the send queue before we add the optional emote.
    window.setTimeout(() => {
        try {
            if (outfit.announceText.trim()) {
                // Poison trick: Content won't be found in Interface.csv, so BC prepends
                // "MISSING TEXT IN "Interface.csv": ". We strip that prefix with the poison
                // tag (replaced by a zero-width non-joiner), leaving (​Name text).
                const announceContent = outfit.nameInAnnounce !== false
                    ? getDisplayName() + " " + outfit.announceText.trim()
                    : outfit.announceText.trim();
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: announceContent,
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } finally {
            outfitApplyPending = false;
            window.clearTimeout(applyWatchdog);
        }
    }, 80);

    localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
}

// Called from the drawer to snapshot current appearance into an existing outfit slot
export function saveCurrentAppearanceToOutfit(id: string): boolean {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return false;
    outfit.items = captureAppearance(outfit.includeRestraints);
    saveOutfits(outfits);
    localNotice(`Saved current look to "${outfit.displayName}".`);
    return true;
}

// Called from the drawer to create a brand new outfit from current appearance
export function createOutfitFromCurrent(
    command: string,
    displayName: string,
    announceText: string,
    includeRestraints: boolean,
    preserveRestraints: boolean,
    preserveClothing = false,
    nickname = "",
    title = "",
    expressionPresetId: string | null = null,
): ConfiguredOutfit | null {
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return null;
    // Block duplicate commands
    if (getOutfits().some(o => o.command === cmd)) {
        localNotice(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
        return null;
    }
    const outfit: ConfiguredOutfit = {
        id: uid(),
        command: cmd,
        displayName: displayName.trim(),
        announceText: announceText.trim(),
        nickname: nickname.trim() || null,
        title:    title.trim()    || null,
        tagIds: [],
        includeRestraints,
        preserveRestraints,
        preserveClothing,
        nameInAnnounce: true,
        expressionPresetId: expressionPresetId || null,
        items: captureAppearance(includeRestraints),
    };
    saveOutfits([...getOutfits(), outfit]);
    localNotice(`Created outfit "${outfit.displayName}" (/${outfit.command}).`);
    return outfit;
}

// Toggle preserveRestraints on a saved outfit
export function setOutfitPreserveRestraints(id: string, value: boolean): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return;
    outfit.preserveRestraints = value;
    saveOutfits(outfits);
}

// Toggle preserveClothing on a saved outfit
export function setOutfitPreserveClothing(id: string, value: boolean): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return;
    outfit.preserveClothing = value;
    saveOutfits(outfits);
}

// Toggle nameInAnnounce on a saved outfit OR restraint set
export function setOutfitNameInAnnounce(id: string, value: boolean): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (outfit) {
        outfit.nameInAnnounce = value;
        saveOutfits(outfits);
        return;
    }
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (restraint) {
        restraint.nameInAnnounce = value;
        saveRestraints(restraints);
    }
}


export function getOutfitTags(): OutfitTag[] {
    const raw = getSettings().outfitTags;
    return Array.isArray(raw) ? (raw as OutfitTag[]) : [];
}

function saveOutfitTags(tags: OutfitTag[]): void {
    getSettings().outfitTags = tags;
    syncSettings();
}

export function createOutfitTag(name: string, color: string): OutfitTag {
    const tag: OutfitTag = { id: uid(), name: name.trim() || "Tag", color: color || "#cf6f98" };
    saveOutfitTags([...getOutfitTags(), tag]);
    return tag;
}

export function deleteOutfitTag(tagId: string): void {
    saveOutfitTags(getOutfitTags().filter(t => t.id !== tagId));
    // Remove from all outfits
    const outfits = getOutfits().map(o => ({ ...o, tagIds: (o.tagIds ?? []).filter(id => id !== tagId) }));
    saveOutfits(outfits);
}

export function updateOutfitTag(tagId: string, name: string, color: string): void {
    const tags = getOutfitTags().map(t =>
        t.id === tagId ? { ...t, name: name.trim() || t.name, color: color || t.color } : t
    );
    saveOutfitTags(tags);
}

export function setOutfitTagIds(outfitId: string, tagIds: string[]): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === outfitId);
    if (!outfit) return;
    outfit.tagIds = tagIds;
    saveOutfits(outfits);
}

export function moveOutfit(id: string, direction: "up" | "down"): void {
    const outfits = getOutfits();
    const idx = outfits.findIndex(o => o.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= outfits.length) return;
    [outfits[idx], outfits[newIdx]] = [outfits[newIdx], outfits[idx]];
    saveOutfits(outfits);
}

export function handleOutfitCommand(
    inputValue: string,
    confirmFn?: (msg: string, onConfirm: () => void) => void,
): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const command = trimmed.slice(1).toLowerCase();
    const outfit = getOutfits().find(entry => entry.command.toLowerCase() === command);
    if (!outfit) return false;

    if (!outfit.items.length) {
        localNotice(`Outfit "/${outfit.command}" has no saved appearance yet. Use the EBC drawer to save it.`, "#ffb7c7");
        return true;
    }

    const warning = getOutfitRestraintWarning(outfit);
    if (warning && confirmFn) {
        confirmFn(warning, () => applyOutfit(outfit));
    } else {
        applyOutfit(outfit);
    }
    return true;
}

function localNotice(msg: string, color = UI.accent): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;

    const div = document.createElement("div");
    div.style.cssText = [
        `color:${color}`,
        `background:${UI.cardMuted}`,
        `border-left:3px solid ${UI.accent}`,
        "font-style:italic",
        "font-size:12px",
        "padding:2px 8px",
        "margin:1px 0",
    ].join(";");
    div.textContent = `[EBC] ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

export function deleteOutfit(id: string): void {
    const outfits = getOutfits().filter(o => o.id !== id);
    saveOutfits(outfits);
}

export function editOutfit(
    id: string,
    command: string,
    displayName: string,
    announceText: string,
    includeRestraints: boolean,
    preserveRestraints: boolean,
    preserveClothing = false,
    nickname = "",
    title = "",
    expressionPresetId: string | null = null,
): boolean {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return false;

    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return false;

    // Block duplicate commands (excluding this outfit itself)
    if (outfits.some(o => o.id !== id && o.command === cmd)) {
        localNotice(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
        return false;
    }

    outfit.command             = cmd;
    outfit.displayName         = displayName.trim();
    outfit.announceText        = announceText.trim();
    outfit.nickname            = nickname.trim() || null;
    outfit.title               = title.trim()    || null;
    outfit.includeRestraints   = includeRestraints;
    outfit.preserveRestraints  = preserveRestraints;
    outfit.preserveClothing    = preserveClothing;
    outfit.expressionPresetId  = expressionPresetId || null;

    saveOutfits(outfits);
    localNotice(`Updated "${outfit.displayName}" (/${outfit.command}).`);
    return true;
}

// -- Export / Import -------------------------------------------------------

export function exportOutfitById(id: string): string | null {
    const outfit = getOutfits().find(o => o.id === id);
    if (!outfit) return null;
    return JSON.stringify({ ebc: 1, type: "outfit", outfit: sanitizeOutfit(outfit) });
}

export function importOutfitFromJSON(json: string): ConfiguredOutfit {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (data.ebc !== 1 || data.type !== "outfit") throw new Error("Not a valid EBC outfit export.");
    const raw = data.outfit as ConfiguredOutfit;
    if (!raw?.command || !raw?.displayName) throw new Error("Missing required outfit fields.");

    // Deduplicate command — append suffix until unique
    const existing = getOutfits();
    const baseCmd = raw.command.toLowerCase().trim().replace(/\s+/g, "");
    let finalCmd = baseCmd;
    let suffix = 2;
    while (existing.some(o => o.command === finalCmd)) finalCmd = baseCmd + suffix++;

    let outfit = sanitizeOutfit({ ...raw, id: uid(), command: finalCmd });
    if (!saveOutfits([...existing, outfit])) {
        // Account storage full - fall back to this-device storage automatically.
        outfit = sanitizeOutfit({ ...outfit, local: true });
        if (!saveOutfits([...existing, outfit])) throw new Error("Outfit storage is full - delete some outfits first.");
        localNotice(`Account storage full - "${outfit.displayName}" saved to THIS DEVICE instead (💾).`, "#e8c04a");
    }
    localNotice(`Imported "${outfit.displayName}" (/${outfit.command}).`);
    return outfit;
}

// -- Outfit Schedules ---------------------------------------------------------

export interface OutfitSchedule {
    id: string;
    outfitId: string;
    time: string;   // "HH:MM" 24h
    enabled: boolean;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

export function getSchedules(): OutfitSchedule[] {
    const list = getSettings().outfitSchedules;
    return Array.isArray(list) ? (list as OutfitSchedule[]) : [];
}

function saveSchedules(schedules: OutfitSchedule[]): void {
    getSettings().outfitSchedules = schedules;
    syncSettings();
}

export function addSchedule(outfitId: string, time: string): OutfitSchedule {
    const schedule: OutfitSchedule = { id: uid(), outfitId, time, enabled: true };
    saveSchedules([...getSchedules(), schedule]);
    return schedule;
}

export function removeSchedule(id: string): void {
    saveSchedules(getSchedules().filter(s => s.id !== id));
}

export function toggleSchedule(id: string): void {
    const schedules = getSchedules().map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveSchedules(schedules);
}

// Map of scheduleId -> last-applied HH:MM to avoid re-applying in the same minute
const _lastApplied = new Map<string, string>();

export function checkAndApplySchedules(): void {
    try {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const current = `${hh}:${mm}`;

        for (const schedule of getSchedules()) {
            if (!schedule.enabled) continue;
            if (schedule.time !== current) continue;
            if (_lastApplied.get(schedule.id) === current) continue;

            const outfit = getOutfits().find(o => o.id === schedule.outfitId);
            if (!outfit) continue;

            _lastApplied.set(schedule.id, current);
            applyOutfit(outfit);
        }
    } catch { /* ignore — Player may not be ready */ }
}

export type BCImportMode = "restraints" | "outfit" | "both";

// Import an outfit from BC's native LZString-compressed appearance bundle.
// mode: "restraints" = restraint slots only (⛓)
//       "outfit"     = non-restraint clothing/body slots only
//       "both"       = entire appearance
// -- Restraint Sets -----------------------------------------------------------
let cachedRestraints: ConfiguredOutfit[] | null = null;

function loadRestraintsFromSettings(): ConfiguredOutfit[] {
    const list = getSettings().restraints;
    const account = Array.isArray(list) ? (list as ConfiguredOutfit[]).map(sanitizeOutfit) : [];
    const restraints = [...account, ...readLocalList(LOCAL_RESTRAINTS_KEY)];
    cachedRestraints = restraints;
    return restraints;
}

export function getRestraints(): ConfiguredOutfit[] {
    return cachedRestraints ?? loadRestraintsFromSettings();
}

function saveRestraints(list: ConfiguredOutfit[]): boolean {
    const sanitized  = list.map(sanitizeOutfit);
    const account    = sanitized.filter(o => !o.local);
    const localList  = sanitized.filter(o => o.local === true);
    try {
        const size = JSON.stringify(account).length;
        // Refuse only a save that makes the account portion BIGGER. Refusing
        // every save while over budget also refused deleting one and moving one
        // to this device - the exact two actions the message tells you to take.
        // The first attempt at this used >=, which still refused any save that
        // left the account portion the same size: deleting a device-stored
        // outfit, or renaming one, neither of which touches the account at all.
        const storedAccount = getSettings().restraints;
        const prevSize = Array.isArray(storedAccount) ? JSON.stringify(storedAccount).length : 0;
        if (size > OUTFITS_BUDGET && size > prevSize) {
            localNotice(
                `Account restraint-set storage is full (${Math.round(size / 1000)} KB of ${OUTFITS_BUDGET / 1000} KB). ` +
                "Not saved - delete some sets, or switch sets to 💾 This device storage (no account limit).",
                "#ff8a8a",
            );
            return false;
        }
    } catch { /* size check best-effort */ }
    if (!writeLocalList(LOCAL_RESTRAINTS_KEY, localList)) return false;
    cachedRestraints = sanitized;
    getSettings().restraints = account;
    syncSettings();
    return true;
}

/** Storage usage for the meter in the Outfits tab. Sizes are serialized JSON
 *  lengths (characters ~ bytes). */
export function getOutfitStorageUsage(): { accountOutfits: number; accountRestraints: number; deviceBytes: number } {
    const size = (v: unknown): number => { try { return JSON.stringify(v).length; } catch { return 0; } };
    let deviceBytes = 0;
    try {
        deviceBytes = (localStorage.getItem(LOCAL_OUTFITS_KEY)?.length ?? 0)
                    + (localStorage.getItem(LOCAL_RESTRAINTS_KEY)?.length ?? 0);
    } catch { /* ignore */ }
    return {
        accountOutfits:    size(getOutfits().filter(o => !o.local)),
        accountRestraints: size(getRestraints().filter(o => !o.local)),
        deviceBytes,
    };
}

/** Every restraint set to or from this-device storage - see setAllOutfitsStorage. */
export function setAllRestraintsStorage(local: boolean): boolean {
    const list = getRestraints().map(o => ({ ...o, local: local ? true as const : undefined }));
    const ok = saveRestraints(list);
    if (ok) localNotice(local
        ? `All ${list.length} restraint sets moved to THIS DEVICE - they use no account storage now.`
        : `All ${list.length} restraint sets moved to your BC ACCOUNT - synced across devices.`);
    return ok;
}

/** Moves a restraint set between account storage and this-device storage. */
export function setRestraintStorage(id: string, local: boolean): boolean {
    const sets = getRestraints().map(o => o.id === id ? { ...o, local: local ? true : undefined } : o);
    const ok = saveRestraints(sets);
    if (ok) localNotice(local
        ? "Restraint set moved to THIS DEVICE - no account storage used; visible to every account in this browser."
        : "Restraint set moved to your BC ACCOUNT - synced across devices.");
    return ok;
}

function captureRestraints(): SerializedItem[] {
    return Player.Appearance
        .filter(item => RESTRAINT_GROUPS.has(item.Asset.Group.Name))
        .map(item => sanitizeItem({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property,
            Craft: item.Craft,
        }));
}

export function applyRestraintSet(restraint: ConfiguredOutfit): void {
    if (outfitApplyPending) {
        localNotice("An outfit swap is already in progress.", "#ffb7c7");
        return;
    }
    outfitApplyPending = true;
    // Watchdog: see applyOutfit - guarantees the flag clears even if the synchronous
    // body throws before the deferred reset below is scheduled. Cancelled on success.
    const applyWatchdog = window.setTimeout(() => { outfitApplyPending = false; }, 5_000);

    const restraintGroups = new Set(restraint.items.map(i => i.Group));
    const nextAppearance: Item[] = [];

    // Preserve all current non-restraint items (clothing, body, etc.)
    for (const currentItem of Player.Appearance) {
        const group = currentItem.Asset.Group.Name;
        if (RESTRAINT_GROUPS.has(group)) continue;
        const cloned = cloneAppearanceItem(currentItem);
        if (cloned) nextAppearance.push(cloned);
    }

    // Preserve any current restraints NOT being replaced by this set
    for (const currentItem of Player.Appearance) {
        const group = currentItem.Asset.Group.Name;
        if (!RESTRAINT_GROUPS.has(group) || restraintGroups.has(group)) continue;
        const cloned = cloneAppearanceItem(currentItem);
        if (cloned) nextAppearance.push(cloned);
    }

    // Apply the saved restraint items
    for (const saved of restraint.items) {
        const built = buildAppearanceItem(saved);
        if (built) nextAppearance.push(built);
    }

    // Enforce outfit whitelist — protected slots always keep their current item
    const _wl2 = getOutfitWhitelist();
    if (_wl2.length) {
        for (const _grp of _wl2) {
            const _orig = Player.Appearance.find((i: Item) => i.Asset.Group.Name === _grp);
            if (!_orig) continue;
            const _cloned = cloneAppearanceItem(_orig);
            if (!_cloned) continue;
            const _idx = nextAppearance.findIndex(i => i.Asset.Group.Name === _grp);
            if (_idx >= 0) nextAppearance.splice(_idx, 1, _cloned);
            else nextAppearance.push(_cloned);
        }
    }

    Player.Appearance = nextAppearance;
    sanitizeLiveAppearance();
    sendRoomAppearanceUpdate();
    scheduleAppearanceRefresh();

    window.setTimeout(() => {
        try {
            if (restraint.announceText.trim()) {
                const rAnnounceContent = restraint.nameInAnnounce !== false
                    ? getDisplayName() + " " + restraint.announceText.trim()
                    : restraint.announceText.trim();
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: rAnnounceContent,
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } finally {
            outfitApplyPending = false;
            window.clearTimeout(applyWatchdog);
        }
    }, 80);

    localNotice(`Applied restraint set "${restraint.displayName}" (/${restraint.command})`);
}

export function createRestraintFromCurrent(
    command: string,
    displayName: string,
    announceText: string,
): ConfiguredOutfit | null {
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return null;
    if (getOutfits().some(o => o.command === cmd) || getRestraints().some(r => r.command === cmd)) {
        localNotice(`Command "/${cmd}" is already in use.`, "#ffb7c7");
        return null;
    }
    const restraint: ConfiguredOutfit = {
        id: uid(),
        command: cmd,
        displayName: displayName.trim(),
        announceText: announceText.trim(),
        nickname: null,
        title:    null,
        tagIds: [],
        includeRestraints: true,
        preserveRestraints: false,
        preserveClothing: true,
        nameInAnnounce: true,
        expressionPresetId: null,
        items: captureRestraints(),
    };
    saveRestraints([...getRestraints(), restraint]);
    localNotice(`Created restraint set "${restraint.displayName}" (/${restraint.command}).`);
    return restraint;
}

export function createRestraintFromItems(
    command: string,
    displayName: string,
    announceText: string,
    items: SerializedItem[],
): ConfiguredOutfit | null {
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return null;
    if (getOutfits().some(o => o.command === cmd) || getRestraints().some(r => r.command === cmd)) {
        localNotice(`Command "/${cmd}" is already in use.`, "#ffb7c7");
        return null;
    }
    const restraint: ConfiguredOutfit = {
        id: uid(),
        command: cmd,
        displayName: displayName.trim(),
        announceText: announceText.trim(),
        nickname: null,
        title: null,
        tagIds: [],
        includeRestraints: true,
        preserveRestraints: false,
        preserveClothing: true,
        nameInAnnounce: true,
        expressionPresetId: null,
        items,
    };
    saveRestraints([...getRestraints(), restraint]);
    localNotice(`Created restraint set "${restraint.displayName}" (/${restraint.command}).`);
    return restraint;
}

export function saveCurrentAppearanceToRestraint(id: string): boolean {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return false;
    restraint.items = captureRestraints();
    saveRestraints(restraints);
    localNotice(`Saved current restraints to "${restraint.displayName}".`);
    return true;
}

export function deleteRestraint(id: string): void {
    saveRestraints(getRestraints().filter(r => r.id !== id));
}

export function editRestraint(
    id: string,
    command: string,
    displayName: string,
    announceText: string,
): boolean {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return false;
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return false;
    if (getOutfits().some(o => o.command === cmd) || restraints.some(r => r.id !== id && r.command === cmd)) {
        localNotice(`Command "/${cmd}" is already in use.`, "#ffb7c7");
        return false;
    }
    restraint.command = cmd;
    restraint.displayName = displayName.trim();
    restraint.announceText = announceText.trim();
    saveRestraints(restraints);
    localNotice(`Updated restraint set "${restraint.displayName}" (/${restraint.command}).`);
    return true;
}

export function setRestraintTagIds(id: string, tagIds: string[]): void {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return;
    restraint.tagIds = tagIds;
    saveRestraints(restraints);
}

export function moveRestraint(id: string, direction: "up" | "down"): void {
    const restraints = getRestraints();
    const idx = restraints.findIndex(r => r.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= restraints.length) return;
    [restraints[idx], restraints[newIdx]] = [restraints[newIdx], restraints[idx]];
    saveRestraints(restraints);
}

export function applyColorPresetToRestraint(restraintId: string, fullGroup: string, colors: string | string[]): boolean {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === restraintId);
    if (!restraint) return false;
    const item = restraint.items.find(i => i.Group === fullGroup);
    if (!item) return false;
    item.Color = colors;
    saveRestraints(restraints);
    localNotice(`Updated colours in "${restraint.displayName}".`);
    return true;
}

// -- Outfit protected-items whitelist -----------------------------------------
// Group names (slot keys) whose current item should never be touched by any
// outfit or restraint-set apply. Stored in ExtensionSettings server-side.

export function getOutfitWhitelist(): string[] {
    const raw = getSettings().outfitWhitelist;
    return Array.isArray(raw) ? (raw as string[]) : [];
}

export function setOutfitWhitelist(groups: string[]): void {
    getSettings().outfitWhitelist = groups;
    syncSettings();
}

export function addToOutfitWhitelist(group: string): void {
    const list = getOutfitWhitelist();
    if (!list.includes(group)) setOutfitWhitelist([...list, group]);
}

export function removeFromOutfitWhitelist(group: string): void {
    setOutfitWhitelist(getOutfitWhitelist().filter(g => g !== group));
}

export function handleRestraintCommand(
    inputValue: string,
    confirmFn?: (msg: string, onConfirm: () => void) => void,
): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;
    const command = trimmed.slice(1).toLowerCase();
    const restraint = getRestraints().find(r => r.command.toLowerCase() === command);
    if (!restraint) return false;
    if (!restraint.items.length) {
        localNotice(`Restraint set "/${restraint.command}" has no saved items yet.`, "#ffb7c7");
        return true;
    }
    const warning = getRestraintSetWarning(restraint);
    if (warning && confirmFn) {
        confirmFn(warning, () => applyRestraintSet(restraint));
    } else {
        applyRestraintSet(restraint);
    }
    return true;
}

/**
 * Decodes a BC outfit code into items. Shared so importing a RESTRAINT SET and
 * importing an outfit cannot drift apart in how they read the same code.
 */
export function decodeBCCodeItems(code: string, mode: BCImportMode = "restraints"): SerializedItem[] {
    const LZ = (window as unknown as Record<string, unknown>).LZString as
        { decompressFromBase64?: (s: string) => string | null } | undefined;
    if (!LZ?.decompressFromBase64) throw new Error("LZString not found - make sure you are on the BC page.");
    const json = LZ.decompressFromBase64(code.trim());
    if (!json) throw new Error("Could not decompress - is this a valid BC outfit code?");
    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Decoded data is not valid JSON."); }
    if (!Array.isArray(raw)) throw new Error("Unexpected format - expected an appearance array.");

    const toItem = (i: Record<string, unknown>): SerializedItem => sanitizeItem({
        Group:      String(i.Group ?? ""),
        Name:       String(i.Name ?? ""),
        Color:      i.Color as SerializedItem["Color"],
        Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
        Property:   typeof i.Property === "object" && i.Property !== null
            ? i.Property as Record<string, unknown> : undefined,
        Craft:      i.Craft as CraftingItem | undefined,
    });

    const all = raw as Record<string, unknown>[];
    const items = mode === "restraints"
        ? all.filter(i => typeof i.Group === "string" && RESTRAINT_GROUPS.has(i.Group as string)).map(toItem)
        : mode === "outfit"
            ? all.filter(i => typeof i.Group === "string" && !RESTRAINT_GROUPS.has(i.Group as string)).map(toItem)
            : all.filter(i => typeof i.Group === "string").map(toItem);
    if (items.length === 0) {
        throw new Error(mode === "restraints"
            ? "No restraint items found in this BC outfit code."
            : mode === "outfit"
                ? "No outfit (non-restraint) items found in this BC outfit code."
                : "No items found in this BC outfit code.");
    }
    return items;
}

/**
 * Imports a BC outfit code as a RESTRAINT SET.
 *
 * The Import Restraint Set button used to call importOutfitFromBCCode, which
 * pulls the restraint items out correctly and then files the result under
 * Outfits - so the import appeared to work while Restraint Sets stayed
 * permanently empty and there was no way to put anything in it.
 */
export function importRestraintSetFromBCCode(
    code: string,
    displayName: string,
    command: string,
): ConfiguredOutfit {
    const items = decodeBCCodeItems(code, "restraints");
    const baseCmd = command.toLowerCase().trim().replace(/\s+/g, "") || "imported";
    let finalCmd = baseCmd;
    let sfx = 2;
    while (getOutfits().some(o => o.command === finalCmd) || getRestraints().some(r => r.command === finalCmd)) {
        finalCmd = baseCmd + sfx++;
    }
    const made = createRestraintFromItems(finalCmd, displayName.trim() || "Imported Restraints", "", items);
    if (!made) throw new Error("Could not save the restraint set - the name or command may already be in use.");
    return made;
}

export function importOutfitFromBCCode(
    code: string,
    displayName: string,
    command: string,
    mode: BCImportMode = "restraints",
): ConfiguredOutfit {
    const LZ = (window as unknown as Record<string, unknown>).LZString as
        { decompressFromBase64?: (s: string) => string | null } | undefined;
    if (!LZ?.decompressFromBase64) throw new Error("LZString not found — make sure you are on the BC page.");

    const json = LZ.decompressFromBase64(code.trim());
    if (!json) throw new Error("Could not decompress — is this a valid BC outfit code?");

    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Decoded data is not valid JSON."); }
    if (!Array.isArray(raw)) throw new Error("Unexpected format — expected an appearance array.");

    const toItem = (i: Record<string, unknown>): SerializedItem => sanitizeItem({
        Group:      String(i.Group ?? ""),
        Name:       String(i.Name ?? ""),
        Color:      i.Color as SerializedItem["Color"],
        Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
        Property:   typeof i.Property === "object" && i.Property !== null
            ? i.Property as Record<string, unknown> : undefined,
        Craft:      i.Craft as CraftingItem | undefined,
    });

    const all = raw as Record<string, unknown>[];
    let items: SerializedItem[];
    if (mode === "restraints") {
        items = all.filter(i => typeof i.Group === "string" && RESTRAINT_GROUPS.has(i.Group as string)).map(toItem);
        if (items.length === 0) throw new Error("No restraint items found in this BC outfit code.");
    } else if (mode === "outfit") {
        items = all.filter(i => typeof i.Group === "string" && !RESTRAINT_GROUPS.has(i.Group as string)).map(toItem);
        if (items.length === 0) throw new Error("No outfit (non-restraint) items found in this BC outfit code.");
    } else {
        items = all.filter(i => typeof i.Group === "string").map(toItem);
        if (items.length === 0) throw new Error("No items found in this BC outfit code.");
    }

    const existing = getOutfits();
    const baseCmd  = command.toLowerCase().trim().replace(/\s+/g, "") || "imported";
    let finalCmd   = baseCmd;
    let sfx        = 2;
    while (existing.some(o => o.command === finalCmd)) finalCmd = baseCmd + sfx++;

    const includesRestraints = mode !== "outfit";
    const outfit = sanitizeOutfit({
        id:                uid(),
        command:           finalCmd,
        displayName:       displayName.trim() || "Imported Outfit",
        announceText:      "",
        nickname:          null,
        title:             null,
        tagIds:            [],
        includeRestraints: includesRestraints,
        preserveRestraints: mode === "outfit",      // outfit-only: keep existing restraints
        preserveClothing:   mode === "restraints",  // restraints-only: keep existing clothing
        nameInAnnounce:    true,
        expressionPresetId: null,
        items,
    });
    let saved = outfit;
    if (!saveOutfits([...existing, saved])) {
        // Account storage full - fall back to this-device storage automatically.
        saved = sanitizeOutfit({ ...outfit, local: true });
        if (!saveOutfits([...existing, saved])) throw new Error("Outfit storage is full - delete some outfits first.");
        localNotice(`Account storage full - "${saved.displayName}" saved to THIS DEVICE instead (💾).`, "#e8c04a");
    }
    localNotice(`Imported "${saved.displayName}" (/${saved.command}) — ${items.length} item(s).`);
    return saved;
}

// Copy restraints from a room member onto the player. Lock data is stripped so
// the player owns the items freely. Existing restraints in the copied slots are
// replaced; all other slots are untouched.
export function copyRestraintsFromChar(char: Character): { count: number; names: string[] } {
    const restraintItems = char.Appearance.filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
    if (restraintItems.length === 0) return { count: 0, names: [] };

    const names: string[] = [];
    const slotsBeingCopied = new Set(restraintItems.map((i: Item) => i.Asset.Group.Name));
    const nextAppearance: Item[] = [];

    // Preserve non-restraint items unchanged
    for (const item of Player.Appearance) {
        if (!RESTRAINT_GROUPS.has(item.Asset.Group.Name)) {
            const cloned = cloneAppearanceItem(item);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    // Preserve existing restraints NOT being overwritten
    for (const item of Player.Appearance) {
        const group = item.Asset.Group.Name;
        if (RESTRAINT_GROUPS.has(group) && !slotsBeingCopied.has(group)) {
            const cloned = cloneAppearanceItem(item);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    // Apply copied restraints — strip all lock-related property keys
    for (const item of restraintItems) {
        const asset = AssetGet(Player.AssetFamily, item.Asset.Group.Name, item.Asset.Name);
        if (!asset) continue;

        const rawProp = item.Property
            ? { ...(item.Property as Record<string, unknown>) }
            : undefined;
        if (rawProp) {
            delete rawProp["LockedBy"];
            delete rawProp["LockMemberNumber"];
            delete rawProp["CombinationNumber"];
            delete rawProp["Password"];
            delete rawProp["MemberNumberListKeys"];
            delete rawProp["TimerPasswordPadlock"];
        }

        const craft = item.Craft as { Name?: string } | undefined;
        const craftName = craft?.Name?.trim();
        const baseName = (asset as unknown as Record<string, unknown>).Description as string || asset.Name;
        names.push(craftName ? `${craftName} (${baseName})` : baseName);

        nextAppearance.push({
            Asset: asset,
            Color: sanitizeColor(item.Color),
            Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
            Property: rawProp,
            Craft: item.Craft ? sanitizeCraft(item.Craft as CraftingItem) : undefined,
        });
    }

    Player.Appearance = nextAppearance;
    sanitizeLiveAppearance();
    sendRoomAppearanceUpdate();
    scheduleAppearanceRefresh();

    return { count: names.length, names };
}
