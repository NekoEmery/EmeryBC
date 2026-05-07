// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a playful emote is sent.

import { getAntiRestraintEnabled } from "./settings";

// Creative escape messages. Each receives the display name of the item
// that tried (and failed) to stay on.
const ESCAPE_MESSAGES: Array<(n: string) => string> = [
    n => `tilts her head as the ${n} shimmers and dissolves before it can even close~`,
    n => `blinks in surprise as the ${n} barely touches her before bouncing right off~`,
    n => `giggles softly as the ${n} seems to reject itself and falls to the floor~`,
    n => `watches with wide eyes as the ${n} unclasps itself and drifts away on its own~`,
    n => `smiles as an invisible force causes the ${n} to slip right off~`,
    n => `glances down curiously as the ${n} simply... refuses to stay on~`,
    n => `lets out a quiet laugh as the ${n} clasps shut for just a moment before popping back open~`,
    n => `tilts her head as the ${n} wriggles free all by itself~`,
    n => `raises a brow as the ${n} tumbles off before anyone can blink~`,
    n => `gasps softly as the ${n} shudders and slips free, as though it had somewhere else to be~`,
    n => `watches the ${n} hover in the air for a moment before floating gently away~`,
    n => `quirks a smile as the ${n} snaps shut — then immediately snaps right back open~`,
];

// Snapshot of restraint groups currently on the player.
// Populated on room enter and after each escape so we can detect additions.
let knownRestraints = new Set<string>();

// Re-entry guard — set true while we are actively removing items so the
// CharacterRefresh we trigger ourselves doesn't recurse into the escape logic.
let escaping = false;

// Call this whenever the player's restraint state resets to a known baseline
// (room enter, toggle on, after escaping). Thread-safe: always call outside
// of escaping = true sections.
export function snapshotPlayerRestraints(): void {
    try {
        knownRestraints = new Set(
            Player.Appearance
                .filter((i: Item) => i.Asset.Group.IsRestraint)
                .map((i: Item) => i.Asset.Group.Name)
        );
    } catch { /* ignore — may fire before Player is ready */ }
}

// Called from the CharacterRefresh hook in main.ts whenever C === Player.
export function antiRestraintOnPlayerRefresh(): void {
    if (escaping) return;

    if (!getAntiRestraintEnabled()) {
        // Keep the snapshot fresh even while disabled so we don't false-trigger
        // the moment it gets re-enabled.
        snapshotPlayerRestraints();
        return;
    }

    try {
        const current = Player.Appearance.filter((i: Item) => i.Asset.Group.IsRestraint);
        const newItems = current.filter((i: Item) => !knownRestraints.has(i.Asset.Group.Name));

        if (newItems.length === 0) {
            // Nothing new — but items may have been removed, keep snapshot current.
            snapshotPlayerRestraints();
            return;
        }

        escaping = true;

        // Grab a human-readable name before we remove anything.
        const firstItem = newItems[0];
        const displayName: string =
            (firstItem.Asset as unknown as Record<string, unknown>).Description as string
            || firstItem.Asset.Name
            || "restraint";

        // Strip every newly added restraint.
        for (const item of newItems) {
            try { InventoryRemove(Player, item.Asset.Group.Name, false); } catch { /* ignore */ }
        }

        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        snapshotPlayerRestraints();

        // Pick a random escape message and send it as a room emote.
        const msgFn = ESCAPE_MESSAGES[Math.floor(Math.random() * ESCAPE_MESSAGES.length)];
        window.setTimeout(() => {
            try {
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: Player.Name + " " + msgFn(displayName),
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
