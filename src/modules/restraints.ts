// Shared restraint/lock removal logic used by both /ebc commands and the drawer.

import { UI } from "./ui";
import { callBC } from "./bcUtils";
import { RESTRAINT_GROUPS, getOutfitWhitelist } from "./outfitManager";

// Returns true if the DOGS mod (Devious Obligate Great Stuff) is loaded.
// DOGS intercepts InventoryUnlock and restores padlocked items via server hooks,
// so any item it controls must be treated as untouchable.
function isDogsActive(): boolean {
    try {
        const sdk = (window as unknown as Record<string, unknown>).bcModSdk as
            { getModsInfo?: () => Array<{ name: string }> } | undefined;
        return sdk?.getModsInfo?.().some(m => m.name === "DOGS") ?? false;
    } catch { return false; }
}

// Locks that must never be touched regardless of the operation.
// ExclusivePadlock is included: it is the base lock used by DOGS (Devious Obligate
// Great Stuff) and also semantically should not be bulk-removed — the person who
// applied it intended it to be exclusive to them.
function isProtectedLock(item: Item): boolean {
    const lock = (item.Property?.LockedBy as string | undefined ?? "").toLowerCase();
    if (!lock) return false;
    return lock.includes("owner") || lock.includes("lover") || lock.includes("family")
        || lock.includes("exclusive");
}

// Returns true if this item's slot is in the user's outfit whitelist.
function isWhitelisted(item: Item): boolean {
    try { return getOutfitWhitelist().includes(item.Asset.Group.Name); } catch { return false; }
}

// Combined guard: skip if owner/lover/family locked OR in outfit whitelist.
function isUntouchable(item: Item): boolean {
    return isProtectedLock(item) || isWhitelisted(item);
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
    div.textContent = "[EBC] " + msg;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// /ebc release - removes restraint items, skips protected locks and whitelisted slots
export function releaseRestraints(): void {
    const toRemove = Player.Appearance.filter(
        item => RESTRAINT_GROUPS.has(item.Asset.Group.Name) && !isUntouchable(item)
    );
    const skipped = Player.Appearance.filter(
        item => RESTRAINT_GROUPS.has(item.Asset.Group.Name) && isUntouchable(item)
    );

    if (toRemove.length === 0) {
        const dogsNote = isDogsActive() ? " (DOGS padlocks cannot be removed this way)" : "";
        localNotice(
            skipped.length > 0
                ? `All restraints are locked or protected — none removed.${dogsNote}`
                : "No restraints found to remove.",
            UI.textMuted
        );
        return;
    }

    // Direct array filter bypasses InventoryRemove's internal BC lock checks which
    // can silently refuse removal even for unlocked items (locked room, permissions, etc.).
    const removeGroups = new Set(toRemove.map(item => item.Asset.Group.Name));
    Player.Appearance = Player.Appearance.filter(
        item => !removeGroups.has(item.Asset.Group.Name)
    );

    if (skipped.length > 0) {
        const dogsNote = isDogsActive() ? " (DOGS padlocks are protected)" : "";
        localNotice(`Skipped ${skipped.length} protected item(s).${dogsNote}`, UI.textMuted);
    }

    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
    localNotice(`Released ${toRemove.length} restraint(s).`, UI.gold);
}

// Returns un-protected restraint items currently worn by the player.
export function getPlayerRestraints(): Array<{ group: string; name: string }> {
    return Player.Appearance
        .filter(item => RESTRAINT_GROUPS.has(item.Asset.Group.Name) && !isUntouchable(item))
        .map(item => ({ group: item.Asset.Group.Name, name: item.Asset.Name }));
}

// Returns locked (non-protected) items currently worn by the player.
export function getPlayerLockedItems(): Array<{ group: string; name: string }> {
    return Player.Appearance
        .filter(item => !!(item.Property?.LockedBy) && !isProtectedLock(item))
        .map(item => ({ group: item.Asset.Group.Name, name: item.Asset.Name }));
}

// Removes specific items by group name from the player. Returns count removed.
export function removePlayerSpecificItems(groups: string[]): number {
    const groupSet = new Set(groups);
    const before = Player.Appearance.length;
    Player.Appearance = Player.Appearance.filter(
        item => !groupSet.has(item.Asset.Group.Name)
    );
    const count = before - Player.Appearance.length;
    if (count > 0) {
        try { CharacterRefresh(Player, false); } catch { /* ignore */ }
        try { ChatRoomCharacterUpdate(Player); } catch { /* ignore */ }
        try { ServerPlayerAppearanceSync(); } catch { /* ignore */ }
    }
    return count;
}

// Unlocks specific items by group name on the player. Returns count unlocked.
export function unlockPlayerSpecificItems(groups: string[]): number {
    let count = 0;
    for (const group of groups) {
        const item = Player.Appearance.find(a => a.Asset.Group.Name === group);
        if (!item?.Property || isProtectedLock(item)) continue;
        delete item.Property["LockedBy"];
        delete item.Property["LockMemberNumber"];
        delete item.Property["CombinationNumber"];
        delete item.Property["Password"];
        delete item.Property["MemberNumberListKeys"];
        delete item.Property["RemoveItem"];
        delete item.Property["ShowTimer"];
        delete item.Property["EnableRandomInput"];
        count++;
    }
    if (count > 0) {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    }
    return count;
}

// /ebc unlock - strips lock data from items, skips protected locks and whitelisted slots
export function unlockItems(): void {
    let unlocked = 0;
    let skipped = 0;

    for (const item of Player.Appearance) {
        if (!(item.Property?.LockedBy)) continue;
        if (isUntouchable(item)) { skipped++; continue; }

        if (item.Property) {
            delete item.Property["LockedBy"];
            delete item.Property["LockMemberNumber"];
            delete item.Property["CombinationNumber"];
            delete item.Property["Password"];
            delete item.Property["MemberNumberListKeys"];
            delete item.Property["RemoveItem"];
            delete item.Property["ShowTimer"];
            delete item.Property["EnableRandomInput"];
        }
        unlocked++;
    }

    if (unlocked === 0) {
        const dogsNote = isDogsActive() ? " (DOGS padlocks cannot be removed this way)" : "";
        localNotice(
            skipped > 0
                ? `All locks are protected — none removed.${dogsNote}`
                : "No locks found to remove.",
            UI.textMuted
        );
        return;
    }

    if (skipped > 0) {
        const dogsNote = isDogsActive() ? " (DOGS padlocks are protected)" : "";
        localNotice(`Skipped ${skipped} protected lock(s).${dogsNote}`, UI.textMuted);
    }

    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
    localNotice(`Removed ${unlocked} lock(s).`, UI.gold);
}
