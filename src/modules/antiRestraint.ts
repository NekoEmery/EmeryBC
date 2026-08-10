// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a glare emote is sent.
// Whitelisted items are always kept even if applied by others.
// Whitelist entries are item keys: "AssetName" or "AssetName|CraftName".
// Removal is attempted up to 2 times per group before giving up (locked items).

import { getAntiRestraintEnabled, getAntiRestraintWhitelist, getAntiRestraintAnnounce, getEscapeEmoteText } from "./settings";
import { callBC } from "./bcUtils";
import { RESTRAINT_GROUPS } from "./outfitManager";

// Compute a stable identity key for a restraint item.
// Uses asset name + craft name (if any) so that e.g. two different crafted
// collars in the same slot can be whitelisted independently.
export function getItemKey(item: Item): string {
    const craft = item.Craft as { Name?: string } | undefined;
    const craftName = craft?.Name?.trim();
    return craftName ? `${item.Asset.Name}|${craftName}` : item.Asset.Name;
}

// Human-readable label for a restraint item (shown in whitelist chips).
export function getItemDisplayName(item: Item): string {
    const craft = item.Craft as { Name?: string } | undefined;
    const craftName = craft?.Name?.trim();
    const baseName = (item.Asset as unknown as { Description?: string }).Description || item.Asset.Name;
    return craftName ? `${craftName} (${baseName})` : baseName;
}

// Show a custom in-game overlay rather than window.confirm (which can be
// suppressed by some browsers / userscript sandboxes).
function showEscapePrompt(
    itemName: string,
    restrainer: string | null,
    onKeep: () => void,
    onEscape: () => void,
): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = [
        "position:fixed", "top:50%", "left:50%",
        "transform:translate(-50%,-50%)",
        "background:#130810", "border:2px solid #cf6f98",
        "border-radius:10px", "padding:18px 22px",
        "z-index:999999", "font-family:'Trebuchet MS',serif",
        "min-width:250px", "max-width:320px",
        "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
        "display:flex", "flex-direction:column", "gap:12px",
    ].join(";");

    const who = restrainer ? `<b style="color:#f7e6ee">${restrainer}</b> is` : "Someone is";
    const msg = document.createElement("div");
    msg.style.cssText = "font-size:12px;color:#cf6f98;line-height:1.55;";
    msg.innerHTML = `${who} applying <b style="color:#f7e6ee">${itemName}</b> on you.<br>What would you like to do?`;
    overlay.appendChild(msg);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:8px;";

    const keepBtn = document.createElement("button");
    keepBtn.textContent = "Keep it";
    keepBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #79a885;background:#0f2a1a;color:#79a885;";
    keepBtn.addEventListener("click", () => { overlay.remove(); onKeep(); });

    const escBtn = document.createElement("button");
    escBtn.textContent = "Escape!";
    escBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
    escBtn.addEventListener("click", () => { overlay.remove(); onEscape(); });

    btns.appendChild(keepBtn);
    btns.appendChild(escBtn);
    overlay.appendChild(btns);
    document.body.appendChild(overlay);
}

let lastRestrainerName: string | null = null;

export function getLastRestrainerName(): string | null { return lastRestrainerName; }

export function recordRestrainer(sourceMemberNumber: number): void {
    try {
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<Record<string, unknown>> | undefined;
        const char = room?.find(c => c.MemberNumber === sourceMemberNumber);
        if (!char) return;
        lastRestrainerName =
            (char.Nickname as string | undefined)?.trim() ||
            (char.Name as string | undefined) ||
            null;
    } catch { /* ignore */ }
}

let knownRestraints = new Set<string>();
let escaping = false;
// Rate-limit anti-restraint server syncs.  The 200 ms re-entry guard already
// limits how often doEscape() fires, but if someone repeatedly re-applies
// restraints they can drive the sync rate to 5×/s.  Cap server syncs to once
// every 2 s so the room still sees the change quickly while staying well
// below BC's server rate limits.
let lastEscapeSync = 0;
const ESCAPE_SYNC_INTERVAL_MS = 2000;

// Tracks failed removal attempts per group. Items here are NOT merged into
// knownRestraints so they remain detectable for a retry.
const failAttempts = new Map<string, number>();

/**
 * Identity of a worn restraint: the slot AND which item is in it.
 *
 * This used to be the slot name alone, which meant swapping the rope on your
 * arms for cuffs read as the same restraint and was never escaped.
 */
function wornKey(item: Item): string {
    return item.Asset.Group.Name + "\u0000" + getItemKey(item);
}

function wornNow(): Map<string, Item> {
    const out = new Map<string, Item>();
    try {
        for (const i of Player.Appearance) {
            if (RESTRAINT_GROUPS.has(i.Asset.Group.Name)) out.set(wornKey(i), i);
        }
    } catch { /* ignore */ }
    return out;
}

/**
 * What was on you when auto-escape was switched on, by slot.
 *
 * Held as the actual items so they can be put back. Escaping a swapped-in
 * restraint is not enough on its own: the swap has already taken the original
 * off, so removing the replacement just leaves the slot bare and the swap has
 * effectively stripped you - which is the opposite of protecting it.
 */
const protectedBySlot = new Map<string, Item>();

export function snapshotPlayerRestraints(): void {
    try {
        const worn = wornNow();
        knownRestraints = new Set(worn.keys());
        failAttempts.clear();
        protectedBySlot.clear();
        for (const item of worn.values()) protectedBySlot.set(item.Asset.Group.Name, item);
    } catch { /* ignore */ }
}

/**
 * Puts a protected restraint back after something was swapped in over it.
 *
 * Only fires when the slot ended up empty, so it cannot fight a legitimate
 * change - and only for slots that had something at snapshot time.
 */
function restoreProtected(groups: Set<string>): boolean {
    let restored = false;
    for (const group of groups) {
        const original = protectedBySlot.get(group);
        if (!original) continue;
        const occupied = Player.Appearance.some((i: Item) => i.Asset.Group.Name === group);
        if (occupied) continue;
        try {
            Player.Appearance.push(original);
            // Re-protect it under its own key so the next pass leaves it alone.
            knownRestraints.add(wornKey(original));
            restored = true;
        } catch { /* ignore */ }
    }
    return restored;
}

/**
 * Drops anything from the known set that is no longer being worn.
 *
 * Without this the set only ever grew, and that is what broke auto-escape. A
 * restraint that could not be removed - a locked one, most obviously - was
 * given up on after two tries and written into the known set to stop it
 * retrying forever. Nothing ever took it back out, so that slot stayed ignored
 * for the rest of the session: once someone locked your arms, no arm restraint
 * was ever escaped again, including new ones applied long after the lock was
 * gone. Only changing room cleared it, because that re-snapshots from scratch.
 *
 * Forgetting an item the moment it comes off means the give-up is temporary -
 * it lasts as long as the thing that caused it, and no longer.
 */
function forgetRemoved(worn: Map<string, Item>): void {
    for (const key of [...knownRestraints]) {
        if (!worn.has(key)) knownRestraints.delete(key);
    }
    for (const key of [...failAttempts.keys()]) {
        if (!worn.has(key)) failAttempts.delete(key);
    }
    // A protected slot that is now genuinely EMPTY was emptied by you, not
    // swapped - stop guarding it, or a restraint you took off yourself would
    // reappear the next time anyone touched that slot.
    for (const [group] of [...protectedBySlot]) {
        const stillThere = Player.Appearance.some((i: Item) => i.Asset.Group.Name === group);
        if (!stillThere) protectedBySlot.delete(group);
    }
}

// Merge currently worn restraints into knownRestraints, but skip ones that
// still have pending retry attempts - they need to stay detectable.
function mergeCurrentRestraints(): void {
    try {
        for (const [key] of wornNow()) {
            if (!failAttempts.has(key)) knownRestraints.add(key);
        }
    } catch { /* ignore */ }
}

export function antiRestraintOnPlayerRefresh(): void {
    if (escaping) return;
    if (!getAntiRestraintEnabled()) return;

    try {
        const whitelist = getAntiRestraintWhitelist();
        const worn = wornNow();
        // Anything no longer on you is forgotten, so a slot that was given up on
        // becomes eligible again as soon as the item causing it comes off.
        forgetRemoved(worn);

        // Whitelist is item-key based ("AssetName" or "AssetName|CraftName")
        const candidates = [...worn.entries()].filter(([key, i]) =>
            !knownRestraints.has(key) && !whitelist.includes(getItemKey(i))
        );

        // Give up on ones that have hit the retry limit. Still recorded, but the
        // record now disappears with the item rather than lasting the session.
        for (const [key] of candidates.filter(([k]) => (failAttempts.get(k) ?? 0) >= 2)) {
            knownRestraints.add(key);
            failAttempts.delete(key);
        }

        const newItems = candidates
            .filter(([key]) => !knownRestraints.has(key))
            .map(([, i]) => i);

        if (newItems.length === 0) return;

        escaping = true;

        const firstItem = newItems[0];
        // getItemDisplayName, so a crafted item is called what its owner named
        // it. The room's own message says "Mika's cuffs" and the escape replying
        // "Leather Deluxe Leg Cuffs" reads as though it removed something else.
        const itemName: string = getItemDisplayName(firstItem) || "restraint";

        // The name is deliberately NOT read here.
        //
        // Who did it is only known from the chat line BC sends about it, and
        // that arrives as its own message - often after the appearance change
        // that triggers this. Reading it at this point usually found nothing,
        // and then cleared it, so the later message could not help either. That
        // is why the emote kept glaring at nobody. It is read when the emote is
        // actually sent instead, by which point the message has landed.
        doEscape(newItems, itemName);

    } catch {
        escaping = false;
    }
}

function doEscape(newItems: Item[], itemName: string): void {
    // Direct array filter, not InventoryRemove.
    //
    // InventoryRemove runs BC's own lock checks and silently refuses anything it
    // does not think you may take off - a locked item, most obviously. That is
    // the wrong behaviour for this feature: auto-escape is a switch you set on
    // your own body meaning "nothing gets put on me", so a lock is exactly the
    // case it has to handle rather than the case it gives up on. Refusing
    // quietly is also why it looked broken - the item stayed on with no error.
    //
    // This is the same technique /ebc release already uses, for the same reason.
    const removeGroups = new Set(newItems.map(i => i.Asset.Group.Name));
    // Worked out before the removal, while the swapped-in item is still there.
    const swappedSlots = new Set(
        [...removeGroups].filter(g => protectedBySlot.has(g)),
    );
    try {
        Player.Appearance = Player.Appearance.filter(
            (item: Item) => !removeGroups.has(item.Asset.Group.Name),
        );
    } catch { /* ignore */ }

    // Put back anything that was swapped out from under a protected slot.
    restoreProtected(swappedSlots);

    const stillPresent = new Set(
        Player.Appearance
            .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
            .map((i: Item) => i.Asset.Group.Name)
    );
    // A restored slot is occupied again, so it must not count as a failure -
    // the removal did work, the original simply took its place.
    for (const g of swappedSlots) stillPresent.delete(g);

    let anySucceeded = false;
    for (const item of newItems) {
        const key = wornKey(item);
        if (stillPresent.has(item.Asset.Group.Name)) {
            failAttempts.set(key, (failAttempts.get(key) ?? 0) + 1);
        } else {
            anySucceeded = true;
            failAttempts.delete(key);
        }
    }

    callBC(() => CharacterRefresh(Player, false));
    // Rate-limit server syncs — always refresh locally, but cap the
    // ChatRoomCharacterUpdate + ServerPlayerAppearanceSync pair to avoid
    // flooding BC's server when restraints are re-applied in rapid succession.
    const syncNow = Date.now();
    if (syncNow - lastEscapeSync >= ESCAPE_SYNC_INTERVAL_MS) {
        lastEscapeSync = syncNow;
        callBC(() => ChatRoomCharacterUpdate(Player));
        callBC(() => ServerPlayerAppearanceSync());
    }
    mergeCurrentRestraints();

    const announce = (restrainer: string | null): void => {
        try {
            if (anySucceeded && getAntiRestraintAnnounce()) {
                const customEmote = getEscapeEmoteText();
                let text: string;
                if (customEmote.trim()) {
                    // Square brackets are accepted alongside braces - the hint
                    // and the placeholder have not always agreed, so saved text
                    // exists in both forms. Global so a token can repeat.
                    text = customEmote
                        .replace(/[{[]item[}\]]/g, itemName)
                        .replace(/[{[]restrainer[}\]]/g, restrainer ?? "");
                } else {
                    text = restrainer
                        ? `glares at ${restrainer} as the ${itemName} falls away.`
                        : `glares ahead as the ${itemName} falls away.`;
                }
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: Player.Name + " " + text,
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } catch { /* ignore */ }
        escaping = false;
    };

    // Give the chat line a moment to arrive, then one more short wait if it
    // still has not - a slow server should not cost you the name. Whatever it
    // is by then is what gets used, and it is cleared so it cannot leak into
    // the next escape by someone else.
    window.setTimeout(() => {
        if (lastRestrainerName === null) {
            window.setTimeout(() => {
                const who = lastRestrainerName;
                lastRestrainerName = null;
                announce(who);
            }, 300);
            return;
        }
        const who = lastRestrainerName;
        lastRestrainerName = null;
        announce(who);
    }, 200);
}
