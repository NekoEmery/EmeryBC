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

export function snapshotPlayerRestraints(): void {
    try {
        knownRestraints = new Set(
            Player.Appearance
                .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
                .map((i: Item) => i.Asset.Group.Name)
        );
        failAttempts.clear();
    } catch { /* ignore */ }
}

// Merge currently worn restraint groups into knownRestraints, but skip groups
// that still have pending retry attempts — they need to stay detectable.
function mergeCurrentRestraints(): void {
    try {
        Player.Appearance
            .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name) && !failAttempts.has(i.Asset.Group.Name))
            .forEach((i: Item) => knownRestraints.add(i.Asset.Group.Name));
    } catch { /* ignore */ }
}

export function antiRestraintOnPlayerRefresh(): void {
    if (escaping) return;
    if (!getAntiRestraintEnabled()) return;

    try {
        const whitelist = getAntiRestraintWhitelist();
        const current = Player.Appearance.filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
        // Whitelist is now item-key based ("AssetName" or "AssetName|CraftName")
        const candidates = current.filter((i: Item) =>
            !knownRestraints.has(i.Asset.Group.Name) &&
            !whitelist.includes(getItemKey(i))
        );

        // Promote items that have hit the retry limit: add to known and drop them.
        for (const item of candidates.filter(i => (failAttempts.get(i.Asset.Group.Name) ?? 0) >= 2)) {
            knownRestraints.add(item.Asset.Group.Name);
            failAttempts.delete(item.Asset.Group.Name);
        }

        const newItems = candidates.filter((i: Item) =>
            !knownRestraints.has(i.Asset.Group.Name)
        );

        if (newItems.length === 0) return;

        escaping = true;

        const firstItem = newItems[0];
        const itemName: string =
            (firstItem.Asset as unknown as Record<string, unknown>).Description as string
            || firstItem.Asset.Name
            || "restraint";

        const restrainer = lastRestrainerName;
        lastRestrainerName = null;

        doEscape(newItems, restrainer, itemName);

    } catch {
        escaping = false;
    }
}

function doEscape(newItems: Item[], restrainer: string | null, itemName: string): void {
    for (const item of newItems) {
        try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
    }

    const stillPresent = new Set(
        Player.Appearance
            .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
            .map((i: Item) => i.Asset.Group.Name)
    );

    let anySucceeded = false;
    for (const item of newItems) {
        const group = item.Asset.Group.Name;
        if (stillPresent.has(group)) {
            failAttempts.set(group, (failAttempts.get(group) ?? 0) + 1);
        } else {
            anySucceeded = true;
            failAttempts.delete(group);
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

    window.setTimeout(() => {
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
    }, 200);
}
