// Anti-restraint — when enabled, any restraint applied to the player by
// another character is immediately removed and a playful emote is sent.

import { getAntiRestraintEnabled } from "./settings";

// Creative escape messages. Each receives the display name of the item
// that tried (and failed) to stay on.
const ESCAPE_MESSAGES: Array<(n: string) => string> = [
    n => `tilts her head slowly, eyes meeting whoever dared, as the ${n} slides off her without a sound and drops to the floor.`,
    n => `glances down at the ${n} with a calm, almost bored expression as the strap loosens and it falls away before it could catch.`,
    n => `raises an eyebrow, unimpressed, as the ${n} comes undone and clatters to the ground at her feet.`,
    n => `doesn't even flinch as the ${n} tightens — then exhales slowly as the buckle gives and it drops.`,
    n => `fixes her gaze forward as the ${n} clicks shut — only for each clasp to pop open again, one by one.`,
    n => `tilts her chin up slightly as the ${n} is brought toward her, then watches it slip loose with a quiet, knowing look.`,
    n => `barely acknowledges the ${n} before the strap slides free and it settles on the floor with a dull thud.`,
    n => `glances at the ${n} with quiet amusement as the fastening fails to hold and it drops without ceremony.`,
    n => `stands perfectly still as the ${n} closes — the latch catches for a moment, then gives, and it falls.`,
    n => `watches the ${n} get secured around her, expression patient and unbothered, before the knot slips and it hits the ground.`,
    n => `shifts her weight just slightly and the ${n} comes loose, sliding off before the clasp ever fully catches.`,
    n => `meets the gaze of whoever applied the ${n} with a calm, level stare as it loosens and falls at her feet.`,
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
