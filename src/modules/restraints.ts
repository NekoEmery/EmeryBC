// Shared restraint/lock removal logic used by both /ebc commands and the drawer.

import { UI } from "./ui";
import { callBC } from "./bcUtils";

// Locks that must never be touched regardless of the operation.
function isProtectedLock(item: Item): boolean {
    const lock = (item.Property?.LockedBy as string | undefined ?? "").toLowerCase();
    if (!lock) return false;
    return lock.includes("owner") || lock.includes("lover") || lock.includes("family");
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

// /ebc release - removes restraint items, skips protected locks
export function releaseRestraints(): void {
    const toRemove = Player.Appearance.filter(
        item => item.Asset.Group.IsRestraint && !isProtectedLock(item)
    );
    const skipped = Player.Appearance.filter(
        item => item.Asset.Group.IsRestraint && isProtectedLock(item)
    );

    if (toRemove.length === 0) {
        localNotice(
            skipped.length > 0
                ? "All restraints are owner/lover/family locked - none removed."
                : "No restraints found to remove.",
            UI.textMuted
        );
        return;
    }

    for (const item of toRemove) {
        InventoryRemove(Player, item.Asset.Group.Name, false);
    }
    if (skipped.length > 0) {
        localNotice(`Skipped ${skipped.length} protected item(s).`, UI.textMuted);
    }

    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
    localNotice(`Released ${toRemove.length} restraint(s).`, UI.gold);
}

// Returns un-protected restraint items currently worn by the player.
export function getPlayerRestraints(): Array<{ group: string; name: string }> {
    return Player.Appearance
        .filter(item => item.Asset.Group.IsRestraint && !isProtectedLock(item))
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
    let count = 0;
    for (const group of groups) {
        try { InventoryRemove(Player, group, false); count++; } catch { /* ignore */ }
    }
    if (count > 0) {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
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

// /ebc unlock - strips lock data from items, skips protected locks
export function unlockItems(): void {
    let unlocked = 0;
    let skipped = 0;

    for (const item of Player.Appearance) {
        if (!(item.Property?.LockedBy)) continue;
        if (isProtectedLock(item)) { skipped++; continue; }

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
        localNotice(
            skipped > 0
                ? "All locks are owner/lover/family protected - none removed."
                : "No locks found to remove.",
            UI.textMuted
        );
        return;
    }

    if (skipped > 0) {
        localNotice(`Skipped ${skipped} protected lock(s).`, UI.textMuted);
    }

    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
    localNotice(`Removed ${unlocked} lock(s).`, UI.gold);
}
