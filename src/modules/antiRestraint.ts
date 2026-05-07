// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a glare emote is sent.

import { getAntiRestraintEnabled } from "./settings";

// The name of the last person who interacted with the player.
// Set by recordRestrainer() which is called from a ChatRoomMessage hook.
let lastRestrainerName: string | null = null;

// Called from main.ts whenever a ChatRoomMessage Action arrives targeting
// the player — captures who sent it so the escape emote can name them.
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

// Snapshot of restraint groups currently on the player.
// Populated on room enter and after each escape so we can detect additions.
let knownRestraints = new Set<string>();

// Re-entry guard — set true while we are actively removing items so the
// CharacterRefresh we trigger ourselves doesn't recurse into the escape logic.
let escaping = false;

// Full snapshot — replaces knownRestraints entirely. Only call on room enter
// or when the toggle is turned on. Never call mid-session or cursed items
// that briefly vanish will lose their protection.
export function snapshotPlayerRestraints(): void {
    try {
        knownRestraints = new Set(
            Player.Appearance
                .filter((i: Item) => i.Asset.Group.IsRestraint)
                .map((i: Item) => i.Asset.Group.Name)
        );
    } catch { /* ignore — may fire before Player is ready */ }
}

// Merge currently worn restraint groups INTO knownRestraints without ever
// shrinking it. This protects cursed items that briefly vanish and reappear.
function mergeCurrentRestraints(): void {
    try {
        Player.Appearance
            .filter((i: Item) => i.Asset.Group.IsRestraint)
            .forEach((i: Item) => knownRestraints.add(i.Asset.Group.Name));
    } catch { /* ignore */ }
}

// Called from the CharacterRefresh hook in main.ts whenever C === Player.
export function antiRestraintOnPlayerRefresh(): void {
    if (escaping) return;

    if (!getAntiRestraintEnabled()) return;

    try {
        const current = Player.Appearance.filter((i: Item) => i.Asset.Group.IsRestraint);
        const newItems = current.filter((i: Item) => !knownRestraints.has(i.Asset.Group.Name));

        if (newItems.length === 0) {
            // Nothing new — do NOT shrink the snapshot. Cursed items that
            // briefly disappear must stay protected when they come back.
            return;
        }

        escaping = true;

        // Grab a human-readable item name before we remove anything.
        const firstItem = newItems[0];
        const itemName: string =
            (firstItem.Asset as unknown as Record<string, unknown>).Description as string
            || firstItem.Asset.Name
            || "restraint";

        // Capture restrainer name now, then clear it so the next escape is fresh.
        const restrainer = lastRestrainerName;
        lastRestrainerName = null;

        // Strip every newly added restraint.
        for (const item of newItems) {
            try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
        }

        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        // Merge (never replace) so existing protected groups stay protected.
        mergeCurrentRestraints();

        window.setTimeout(() => {
            try {
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
            } catch { /* ignore */ }
            escaping = false;
        }, 200);

    } catch {
        escaping = false;
    }
}
