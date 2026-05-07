// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a glare emote is sent.
// Whitelisted groups are always kept even if applied by others.
// Removal is attempted up to 2 times per group before giving up (locked items).

import { getAntiRestraintEnabled, getAntiRestraintWhitelist, getAntiRestraintConfirm } from "./settings";

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

        // Confirm dialog — if enabled, ask before escaping. The user can choose
        // to accept the restraint (adds to known so we stop reacting to it).
        if (getAntiRestraintConfirm()) {
            const who = restrainer ? `${restrainer} is` : "Someone is";
            const accepted = window.confirm(
                `[EmeryBC] ${who} applying ${itemName}.\n\nOK = Accept and keep it\nCancel = Escape it`
            );
            if (accepted) {
                for (const item of newItems) knownRestraints.add(item.Asset.Group.Name);
                escaping = false;
                return;
            }
        }

        for (const item of newItems) {
            try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
        }

        // Check which groups are still present after removal attempt.
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

    } catch {
        escaping = false;
    }
}
