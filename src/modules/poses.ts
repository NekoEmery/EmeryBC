// BC pose application and user-configurable pose combos.
// Poses require matching equipped items to visually render — BC handles
// validation server-side and silently ignores inapplicable poses.

import { callBC, getDisplayName, getSettings, syncSettings } from "./bcUtils";

export interface PoseCombo {
    id: string;
    name: string;
    poses: string[];         // ordered — applied step by step in this exact order
    stepDelayMs?: number;    // ms between each step (default: 420)
    command?: string;        // optional chat command (without /) to trigger this combo
    announceText?: string;   // optional action emote shown to the room when applied
}

// Well-known BC pose names grouped by type.
// Body and arm poses can be freely combined (e.g. Kneel + BackCuffs).
export const KNOWN_POSES: { group: string; poses: { key: string; label: string; announceText?: string }[] }[] = [
    {
        group: "Body",
        poses: [
            { key: "",               label: "Stand",       announceText: "stands up straight"                  },
            { key: "LegsClosed",     label: "Legs Closed", announceText: "closes their legs"                   },
            { key: "Kneel",          label: "Kneel",       announceText: "kneels down"                         },
            { key: "KneelingSpread", label: "Kneel Wide",  announceText: "kneels with their legs spread wide"  },
            { key: "AllFours",       label: "All Fours",   announceText: "gets down on all fours"              },
            { key: "Hogtied",        label: "Hogtied",     announceText: "lies hogtied"                        },
            { key: "Spread",         label: "Spread",      announceText: "spreads their legs wide"             },
        ],
    },
    {
        group: "Arms",
        poses: [
            { key: "",               label: "Relaxed",    announceText: "relaxes their arms"                          },
            { key: "OverTheHead",    label: "Arms Up",    announceText: "raises their arms above their head"           },
            { key: "BackCuffs",      label: "Arms Back",  announceText: "puts their arms behind their back"            },
            { key: "BackElbowTouch", label: "Tight Back", announceText: "pulls their arms tight behind their back"     },
            { key: "BackBoxTie",     label: "Box Tie",    announceText: "crosses their arms behind their back"         },
            { key: "Yoked",          label: "Yoked",      announceText: "holds their arms in a yoked position"         },
        ],
    },
];

const ARM_POSES = ["OverTheHead", "BackCuffs", "BackElbowTouch", "BackBoxTie", "Yoked"];

export function applyPoses(poses: string[]): void {
    // An explicit empty string ("") in the list means "Relaxed arms" —
    // clear any active arm pose from the result set.
    const safeList = Array.isArray(poses) ? poses : [];
    const wantsRelaxed = safeList.includes("");
    const filtered = safeList.filter(Boolean);
    const result   = wantsRelaxed ? filtered.filter(p => !ARM_POSES.includes(p)) : filtered;

    const win = window as unknown as Record<string, unknown>;
    const psa = win.PoseSetActive as
        ((C: unknown, name: string | null, force?: boolean, push?: boolean) => void) | undefined;
    const pfn = win.AssetPoseFindName as
        ((name: string) => { Category?: string } | null | undefined) | undefined;

    // 1a. PoseSetActive (BC R107+) — sets ActivePoseMapping the canonical way.
    if (typeof psa === "function") {
        try {
            if (result.length === 0) {
                psa(Player, null, true, false);
            } else if (wantsRelaxed) {
                // "Relaxed arms" path — nuke all poses, re-add body-only poses, then
                // explicitly set "BaseUpper" (BC's internal name for arms-at-sides).
                // Without setting BaseUpper the BodyUpper category stays empty and BC
                // does NOT automatically fall back to the relaxed rendering.
                psa(Player, null, true, false);
                for (const p of result) {
                    psa(Player, p, true, false);
                }
                // Set BaseUpper if it's a valid pose in this BC build
                if (!pfn || pfn("BaseUpper") != null) {
                    try { psa(Player, "BaseUpper", true, false); } catch { /* ignore */ }
                }
            } else {
                psa(Player, result[0], true, false);
                for (let i = 1; i < result.length; i++) {
                    psa(Player, result[i], false, false);
                }
            }
        } catch { /* ignore */ }
    }

    // 1b. Also set ActivePoseMapping directly via AssetPoseFindName.
    //     This is the critical belt-and-suspenders step: PoseSetActive can silently
    //     return early (e.g. pose not found) without throwing, leaving the mapping
    //     unchanged.  Every subsequent CharacterRefresh then recomputes ActivePose
    //     from that unchanged (empty) mapping and wipes the pose we tried to set.
    //     Setting the mapping ourselves guarantees CharacterRefresh always sees the
    //     correct categories regardless of whether PoseSetActive succeeded.
    if (typeof pfn === "function") {
        try {
            const mapping: Record<string, string> = {};
            for (const p of result) {
                const data = pfn(p);
                if (data?.Category) mapping[data.Category] = p;
            }
            (Player as unknown as Record<string, unknown>).ActivePoseMapping =
                result.length === 0 ? {} : mapping;
        } catch { /* ignore */ }
    } else if (typeof psa !== "function") {
        // Truly old BC (no PoseSetActive, no AssetPoseFindName): direct ActivePose assignment.
        try {
            (Player as unknown as Record<string, unknown>).ActivePose =
                result.length > 0 ? result : null;
        } catch { /* ignore */ }
    }

    // 1c. Keep ActivePose in sync — psa (above) already updated Player.Pose and
    //     ActivePoseMapping canonically; we only mirror ActivePose for the small
    //     subset of BC builds that derive ActivePoseMapping from ActivePose instead.
    //     Do NOT touch Player.Pose here — psa manages it and it may contain BC
    //     internal defaults (e.g. "BaseUpper") that are not in our `result` array.
    try {
        (Player as unknown as Record<string, unknown>).ActivePose =
            result.length > 0 ? result : null;
    } catch { /* ignore */ }

    // 2. Local visual refresh — Push=false, we push below.
    callBC(() => CharacterRefresh(Player, false));

    // 3. Push to room via direct ServerSend (same approach as sequence runner in
    //    actionButtons.ts which is known to work).
    try {
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID:         Player.OnlineID,
                ActivePose: result.length > 0 ? result : null,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch { /* ignore */ }
}

// Set the arm pose to "Relaxed" (arms at sides) without disturbing body poses.
//
// "BaseUpper" is BC's explicit internal name for the default / relaxed upper-body
// state.  Relaxed is NOT the absence of an arm pose — BC requires "BaseUpper" to
// be set in the BodyUpper category; leaving the category empty causes BC to render
// the arms incorrectly or leave them stuck in the previous pose.
//
// All earlier attempts removed arm entries from ActivePoseMapping/ActivePose but
// did not call PoseSetActive("BaseUpper"), so BC never applied the relaxed state.
export function clearArmPose(): void {
    try {
        const p = Player as unknown as Record<string, unknown>;
        const win = window as unknown as Record<string, unknown>;
        const psa = win.PoseSetActive as
            ((C: unknown, name: string | null, force?: boolean, push?: boolean) => void) | undefined;
        const pfn = win.AssetPoseFindName as
            ((name: string) => { Category?: string } | null | undefined) | undefined;

        if (typeof psa === "function") {
            // Check whether "BaseUpper" is a valid pose in this BC build.
            // If pfn isn't available, assume it is — psa no-ops silently on unknown poses.
            const baseValid = typeof pfn === "function" ? pfn("BaseUpper") != null : true;

            if (baseValid) {
                // Set the BodyUpper category to its relaxed/default state.
                // force=true → always set (never toggle off); push=false → we push below.
                psa(Player, "BaseUpper", true, false);
            } else {
                // "BaseUpper" doesn't exist in this BC build — nuke-and-readd body poses.
                const bodyPoses = getCurrentPoses().filter(x => !ARM_POSES.includes(x));
                psa(Player, null, true, false);
                for (const bp of bodyPoses) {
                    psa(Player, bp, true, false);
                }
            }
        } else {
            // No PoseSetActive — direct mutation across all three fields (very old BC).
            const rawPose = p.Pose as string[] | null | undefined;
            if (Array.isArray(rawPose)) p.Pose = rawPose.filter(x => !ARM_POSES.includes(x));
            const mapping = p.ActivePoseMapping as Record<string, string> | null | undefined;
            if (mapping) {
                for (const k of Object.keys(mapping)) {
                    if (ARM_POSES.includes(mapping[k])) delete mapping[k];
                }
            }
            const ap = p.ActivePose as string[] | null | undefined;
            if (Array.isArray(ap)) {
                const next = ap.filter(x => !ARM_POSES.includes(x));
                p.ActivePose = next.length > 0 ? next : null;
            }
        }

        // psa already called CharacterRefresh internally; read back the resulting state.
        const ap2 = p.ActivePose as string[] | null | undefined;
        const m2  = p.ActivePoseMapping as Record<string, string> | null | undefined;
        const poseList = Array.isArray(ap2) && ap2.length > 0
            ? [...ap2]
            : Object.values(m2 ?? {}).filter(Boolean);

        // Ensure local canvas is refreshed (idempotent if psa already did it).
        callBC(() => CharacterRefresh(Player, false));

        // Push to room.
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID:         Player.OnlineID,
                ActivePose: poseList.length > 0 ? poseList : null,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch { /* ignore */ }
}

// Apply poses one-by-one in the given order with a delay between each step.
// Each entry in `poses` is one step:
//   - a body-pose key ("Kneel", "AllFours", …) → replaces the body slot
//   - an arm-pose key ("BackBoxTie", "Yoked", …) → replaces the arm slot
//   - ""  (Relaxed marker)                       → clears the arm slot
// State is cumulative: every step passes the full [body?, arm?] snapshot to
// applyPoses, so the animation builds up correctly regardless of which steps
// include a Relaxed ("") entry.
export function applyPosesSequential(poses: string[], stepDelayMs = 420): void {
    const safeList = Array.isArray(poses) ? poses : [];
    if (safeList.length === 0) { applyPoses([]); return; }

    // Build a concrete pose-state snapshot for each step.
    let bodyPose: string | null = null;
    let armPose:  string | null = null;
    const steps: string[][] = [];

    for (const p of safeList) {
        if (p === "") {
            armPose = null;            // Relaxed: clear arm slot
        } else if (ARM_POSES.includes(p)) {
            armPose = p;               // replace arm pose
        } else {
            bodyPose = p;              // replace body pose
        }
        steps.push([
            ...(bodyPose !== null ? [bodyPose] : []),
            ...(armPose  !== null ? [armPose]  : []),
        ]);
    }

    if (steps.length <= 1) {
        applyPoses(steps[0] ?? []);
        return;
    }
    for (let i = 0; i < steps.length; i++) {
        window.setTimeout(() => applyPoses(steps[i]), i * stepDelayMs);
    }
}

export function getCurrentPoses(): string[] {
    try {
        const ap = (Player.ActivePose as string[] | undefined) ?? [];
        if (ap.length > 0) return [...ap];
        // In newer BC, PoseSetActive writes to ActivePoseMapping rather than ActivePose.
        // Fall back to the mapping values so callers always see the real current pose set.
        const mapping = (Player as unknown as Record<string, unknown>).ActivePoseMapping as
            Record<string, string> | undefined;
        if (mapping && typeof mapping === "object") {
            const vals = Object.values(mapping).filter(Boolean);
            if (vals.length > 0) return vals;
        }
        return [];
    } catch { return []; }
}

// -- Combo storage -------------------------------------------------------


function uid(): string { return Math.random().toString(36).slice(2, 9); }

function load(): PoseCombo[] {
    const list = getSettings().poseCombos;
    if (!Array.isArray(list)) return [];
    // Sanitize each combo — old data may have undefined/null poses array
    return (list as PoseCombo[]).map(c => ({
        ...c,
        poses: Array.isArray(c.poses) ? c.poses : [],
    }));
}

function saveCombos(list: PoseCombo[]): void {
    getSettings().poseCombos = list;
    syncSettings();
}

export function getPoseCombos(): PoseCombo[] { return load(); }

export function createCombo(
    name: string,
    poses: string[],
    command = "",
    announceText = "",
    stepDelayMs = 420,
): PoseCombo {
    const combo: PoseCombo = {
        id: uid(),
        name: name.trim() || "Combo",
        poses: poses.filter(p => p != null),  // keep "" (Relaxed arms marker)
        stepDelayMs: Math.max(50, Math.min(3000, stepDelayMs)),
        command: command.toLowerCase().trim().replace(/\s+/g, "") || undefined,
        announceText: announceText.trim() || undefined,
    };
    saveCombos([...load(), combo]);
    return combo;
}

export function updateCombo(
    id: string,
    name: string,
    poses: string[],
    command = "",
    announceText = "",
    stepDelayMs = 420,
): void {
    const list = load();
    const combo = list.find(c => c.id === id);
    if (!combo) return;
    combo.name = name.trim() || combo.name;
    combo.poses = poses.filter(p => p != null);  // keep "" (Relaxed arms marker)
    combo.stepDelayMs = Math.max(50, Math.min(3000, stepDelayMs));
    combo.command = command.toLowerCase().trim().replace(/\s+/g, "") || undefined;
    combo.announceText = announceText.trim() || undefined;
    saveCombos(list);
}

export function deleteCombo(id: string): void {
    saveCombos(load().filter(c => c.id !== id));
}

// Apply a combo (animation + announce text). Used by both the chat command handler
// and the ▶ apply button in the drawer so announce always fires either way.
export function applyCombo(combo: PoseCombo): void {
    const delay = combo.stepDelayMs ?? 420;
    applyPosesSequential(combo.poses ?? [], delay);

    const poseCount = Array.isArray(combo.poses) ? combo.poses.length : 0;
    const totalMs = poseCount > 1 ? (poseCount - 1) * delay + 80 : 80;
    if (combo.announceText?.trim()) {
        window.setTimeout(() => {
            try {
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: getDisplayName() + " " + combo.announceText!.trim(),
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            } catch { /* ignore */ }
        }, totalMs);
    }
}

// Handle a chat command and apply the matching pose combo if found.
export function handlePoseComboCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const command = trimmed.slice(1).toLowerCase();
    const combo = load().find(c => c.command && c.command.toLowerCase() === command);
    if (!combo) return false;

    applyCombo(combo);
    return true;
}
