// Shared restraint/lock removal logic used by both /ebc commands and the drawer.

import { UI } from "./ui";

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
    div.textContent = "[EmeryBC] " + msg;
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

    CharacterRefresh(Player, false);
    ChatRoomCharacterUpdate(Player);
    ServerPlayerAppearanceSync();
    localNotice(`Released ${toRemove.length} restraint(s).`, UI.gold);
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

    CharacterRefresh(Player, false);
    ChatRoomCharacterUpdate(Player);
    ServerPlayerAppearanceSync();
    localNotice(`Removed ${unlocked} lock(s).`, UI.gold);
}
