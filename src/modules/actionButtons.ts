// Action button sequence runner — pose/action sequences used by outfits/scenes.
import { callBC } from "./bcUtils";

// --- Sequence runner ----------------------------------------------------------
// Sequence steps are pipe-separated (|). Each step is one of:
//   PoseName   - set BC pose (e.g. "HandsUp", "Yoked")
//   _          - clear all active poses back to neutral
//   !text      - send as (Name text) action message
//   *text      - send as * Name text * emote message
// Steps run 500 ms apart. Original poses are restored when done.

let seqRunning = false;

// Sends the current ActivePose to the room without triggering a full re-render on each step.
// appearanceBundle should be pre-built once before the sequence starts and reused - sending
// a freshly built bundle every 600ms causes other clients to fully re-render the avatar each
// time, which looks like flickering/glitching.
function sendPoseUpdate(appearanceBundle: ReturnType<typeof ServerAppearanceBundle>): void {
    const activePose = (Player.ActivePose && Player.ActivePose.length > 0)
        ? Player.ActivePose
        : null;
    try {
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID: Player.OnlineID,
                ActivePose: activePose,
                Appearance: appearanceBundle,
            });
        }
    } catch (_) {}
}

function syncPoseToRoom(): void {
    // Used for one-shot pose syncs (outside of sequences).
    // Capture desired pose BEFORE CharacterRefresh - BC may re-apply item-forced poses
    // during refresh and override what we just set.
    const activePose = (Player.ActivePose && Player.ActivePose.length > 0)
        ? Player.ActivePose
        : null;
    try {
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID: Player.OnlineID,
                ActivePose: activePose,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch (_) {}
    callBC(() => CharacterRefresh(Player, false, false));
}

// Parses a single raw step token (may have @NNN suffix) into {content, delay}.
// E.g. "!waves.@1000" -> { content: "!waves.", delay: 1000 }
//      "HandsUp"      -> { content: "HandsUp", delay: defaultStepMs }
export function parseStep(raw: string, defaultStepMs: number): { content: string; delay: number } {
    const atIdx = raw.lastIndexOf("@");
    if (atIdx > 0) {
        const maybeMs = raw.slice(atIdx + 1);
        const ms = parseInt(maybeMs, 10);
        if (!isNaN(ms) && ms >= 0 && String(ms) === maybeMs) {
            return { content: raw.slice(0, atIdx), delay: ms };
        }
    }
    return { content: raw, delay: defaultStepMs };
}

// Send an action or emote message to the chat room.
function sendAction(emote: string, style: "action" | "emote"): void {
    const text = emote.trim();
    if (!text) return;

    if (style === "emote") {
        ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] });
        return;
    }

    // Action style: (Name text)
    const displayName = (Player as unknown as Record<string, unknown>).Nickname as string | undefined
        ?? (Player as unknown as Record<string, unknown>).Name as string | undefined
        ?? "";
    const actionContent = displayName + " " + text;
    ServerSend("ChatRoomChat", {
        Type: "Action",
        Content: actionContent,
        Dictionary: [
            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
            { SourceCharacter: Player.MemberNumber },
        ],
    });
}

export function runSequence(sequence: string, defaultStepMs = 600): void {
    if (seqRunning) return;
    const rawSteps = sequence.split("|").map(s => s.trim()).filter(Boolean);
    if (!rawSteps.length) return;

    // Parse each step: strip @NNN suffix for per-step delay, keep content.
    const steps = rawSteps.map(r => parseStep(r, defaultStepMs));

    seqRunning = true;
    // null means "no pose / neutral" in BC - store as null so we restore correctly.
    const originalPoses: string[] | null = (Player.ActivePose && Player.ActivePose.length > 0)
        ? [...Player.ActivePose]
        : null;
    // Build appearance bundle ONCE - reusing it avoids re-render flicker on other clients.
    const appearanceBundle = ServerAppearanceBundle(Player.Appearance);
    let idx = 0;

    const next = (): void => {
        try {
            if (idx >= steps.length) {
                // Sequence done - restore original pose, do a full sync + local refresh.
                Player.ActivePose = originalPoses;
                syncPoseToRoom();
                seqRunning = false;
                return;
            }

            const { content: step, delay } = steps[idx++];

            if (step === "_") {
                Player.ActivePose = originalPoses;
                sendPoseUpdate(appearanceBundle);
            } else if (step.toLowerCase() === "leaveroom") {
                // Restore pose, switch screen FIRST, then leave — same pattern as
                // safeword.ts.  CommonSetScreen stops ChatRoomRun before
                // ChatRoomLeave() clears ChatRoomData, so no mod hook crashes.
                Player.ActivePose = originalPoses;
                seqRunning = false;
                window.setTimeout(() => {
                    callBC(() => CommonSetScreen("Online", "ChatSearch"));
                    callBC(() => ChatRoomLeave());
                }, 0);
                return;
            } else if (step.startsWith("!")) {
                sendAction(step.slice(1), "action");
            } else if (step.startsWith("*")) {
                sendAction(step.slice(1), "emote");
            } else {
                Player.ActivePose = [step];
                sendPoseUpdate(appearanceBundle);
            }

            window.setTimeout(next, delay);
        } catch (_) {
            seqRunning = false;
        }
    };

    next();
}
