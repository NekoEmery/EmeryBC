// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a glare emote is sent.
// Whitelisted groups are always kept even if applied by others.
// Removal is attempted up to 2 times per group before giving up (locked items).

import { getAntiRestraintEnabled, getAntiRestraintWhitelist, getAntiRestraintConfirm } from "./settings";

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

// Tracks failed removal attempts per group. Items here are NOT merged into
// knownRestraints so they remain detectable for a retry.
const failAttempts = new Map<string, number>();

export function snapshotPlayerRestraints(): void {
    try {
        knownRestraints = new Set(
            Player.Appearance
                .filter((i: Item) => i.Asset.Group.IsRestraint)
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
            .filter((i: Item) => i.Asset.Group.IsRestraint && !failAttempts.has(i.Asset.Group.Name))
            .forEach((i: Item) => knownRestraints.add(i.Asset.Group.Name));
    } catch { /* ignore */ }
}

export function antiRestraintOnPlayerRefresh(): void {
    if (escaping) return;
    if (!getAntiRestraintEnabled()) return;

    try {
        const whitelist = getAntiRestraintWhitelist();
        const current = Player.Appearance.filter((i: Item) => i.Asset.Group.IsRestraint);
        const candidates = current.filter((i: Item) =>
            !knownRestraints.has(i.Asset.Group.Name) &&
            !whitelist.includes(i.Asset.Group.Name)
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

        // Confirm dialog — show a custom overlay and handle accept/escape via callbacks.
        if (getAntiRestraintConfirm()) {
            showEscapePrompt(
                itemName,
                restrainer,
                () => {
                    // Keep — add to known so anti-escape ignores them
                    for (const item of newItems) knownRestraints.add(item.Asset.Group.Name);
                    escaping = false;
                },
                () => {
                    // Escape — proceed with removal
                    doEscape(newItems, restrainer, itemName);
                },
            );
            return; // escaping stays true until one of the callbacks fires
        }

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
            .filter((i: Item) => i.Asset.Group.IsRestraint)
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

    CharacterRefresh(Player, false);
    ChatRoomCharacterUpdate(Player);
    ServerPlayerAppearanceSync();
    mergeCurrentRestraints();

    window.setTimeout(() => {
        try {
            if (anySucceeded) {
                const text = restrainer
                    ? `glares at ${restrainer} as the ${itemName} falls away.`
                    : `glares ahead as the ${itemName} falls away.`;
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
