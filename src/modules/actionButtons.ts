// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import { UI } from "./ui";

export type ActionStyle = "action" | "emote" | "seq";
// "action" = (Name text)
// "emote"  = * Name text *
// "seq"    = pose/action sequence (pipe-separated steps)

export interface ActionButton {
    label:   string;
    emote:   string;   // for "seq" style: pipe-separated sequence steps
    color:   string;
    enabled: boolean;
    style:   ActionStyle;
}

export const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",    emote: "nods.",              color: "#c2185b", enabled: true,  style: "action" },
    { label: "SHAKE",  emote: "shakes their head.", color: "#c2185b", enabled: true,  style: "action" },
    { label: "WAVE",   emote: "waves.",             color: "#c2185b", enabled: true,  style: "action" },
    { label: "CHEER",  emote: "cheers!",            color: "#c2185b", enabled: true,  style: "action" },
    { label: "POUT",   emote: "pouts.",             color: "#c2185b", enabled: true,  style: "emote"  },
    { label: "GIGGLE", emote: "giggles.",           color: "#c2185b", enabled: true,  style: "emote"  },
    { label: "",       emote: "",                   color: "#c2185b", enabled: false, style: "action" },
];

export const ABSOLUTE_MAX  = 12;
const DEFAULT_SLOTS = DEFAULT_BUTTONS.length;

// --- Storage -----------------------------------------------------------------

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getButtons(): ActionButton[] {
    const stored = getStore().actionButtons;
    return Array.isArray(stored) ? (stored as ActionButton[]) : DEFAULT_BUTTONS;
}

export function getSlotCount(): number {
    const store = getStore();
    const n = store.actionSlotCount;
    if (typeof n === "number") return Math.min(ABSOLUTE_MAX, Math.max(1, n));
    const buttons = getButtons();
    return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, buttons.length));
}

export function saveButtons(buttons: ActionButton[], slotCount: number): void {
    const store = getStore();
    store.actionButtons   = buttons;
    store.actionSlotCount = slotCount;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function normalizeHex(value: string | undefined, fallback = "#c2185b"): string {
    const c = (value ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    const m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) { const [r,g,b] = m[1].split(""); return `#${r}${r}${g}${g}${b}${b}`; }
    return fallback;
}

// --- Display name helper -----------------------------------------------------

export function getDisplayName(): string {
    // CharacterNickname is a BC global not always in the type declarations
    const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
    if (typeof nickFn === "function") return (nickFn as (c: Character) => string)(Player);
    return (Player as unknown as Record<string, unknown>).Nickname as string || Player.Name || "Player";
}

// --- Sequence runner ----------------------------------------------------------
// Sequence steps are pipe-separated (|). Each step is one of:
//   PoseName   â€“ set BC pose (e.g. "HandsUp", "Yoked")
//   _          â€“ clear all active poses back to neutral
//   !text      â€“ send as (Name text) action message
//   *text      â€“ send as * Name text * emote message
// Steps run 500 ms apart. Original poses are restored when done.

let seqRunning = false;

// Sends the current ActivePose to the room without triggering a full re-render on each step.
// appearanceBundle should be pre-built once before the sequence starts and reused â€” sending
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
    // Capture desired pose BEFORE CharacterRefresh â€” BC may re-apply item-forced poses
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
    try { CharacterRefresh(Player, false, false); } catch (_) {}
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

export function runSequence(sequence: string, defaultStepMs = 600): void {
    if (seqRunning) return;
    const rawSteps = sequence.split("|").map(s => s.trim()).filter(Boolean);
    if (!rawSteps.length) return;

    // Parse each step: strip @NNN suffix for per-step delay, keep content.
    const steps = rawSteps.map(r => parseStep(r, defaultStepMs));

    seqRunning = true;
    // null means "no pose / neutral" in BC â€” store as null so we restore correctly.
    const originalPoses: string[] | null = (Player.ActivePose && Player.ActivePose.length > 0)
        ? [...Player.ActivePose]
        : null;
    // Build appearance bundle ONCE â€” reusing it avoids re-render flicker on other clients.
    const appearanceBundle = ServerAppearanceBundle(Player.Appearance);
    let idx = 0;

    const next = (): void => {
        try {
            if (idx >= steps.length) {
                // Sequence done â€” restore original pose, do a full sync + local refresh.
                Player.ActivePose = originalPoses;
                syncPoseToRoom();
                seqRunning = false;
                return;
            }

            const { content: step, delay } = steps[idx++];

            if (step === "_") {
                Player.ActivePose = originalPoses;
                sendPoseUpdate(appearanceBundle);
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

// --- Label-based animation triggers ------------------------------------------
// If a button's label matches one of these (case-insensitive), the matching
// animation plays automatically alongside the normal message. Completely hidden
// from the user â€” the emote field is just normal text.

function isArmRestrained(): boolean {
    // Only ItemArms covers actual binding restraints (armbinders, straitjackets, etc.).
    // ItemHands covers paws/mittens/gloves which don't lock arm movement, so we skip it.
    return Player.Appearance.some(item => item.Asset.Group.Name === "ItemArms");
}

function localNotice(msg: string): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;
    const div = document.createElement("div");
    div.style.cssText = [
        `color:${UI.accent}`,
        `background:${UI.cardMuted}`,
        `border-left:3px solid ${UI.accent}`,
        "font-style:italic",
        "font-size:12px",
        "padding:2px 8px",
        "margin:1px 0",
    ].join(";");
    div.textContent = "[EBC] " + msg;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// Returns true if the animation ran (or will run), false if it was blocked.
function runCheerAnimation(): boolean {
    if (isArmRestrained()) {
        localNotice("Your arms are restrained â€” can't cheer right now!");
        return false;
    }
    // Yoked (arms out) -> OverTheHead (arms fully above head) -> repeat -> neutral
    runSequence("Yoked|OverTheHead|Yoked|OverTheHead|Yoked|OverTheHead|_", 600);
    return true;
}

const LABEL_ANIMATIONS: Map<string, () => boolean> = new Map([
    ["CHEER",  runCheerAnimation],
    ["CHEERS", runCheerAnimation],
]);

// Returns false if an animation was attempted but blocked â€” caller should suppress the chat message.
// Returns true if the animation ran fine, or if there is no animation for this label.
function triggerLabelAnimation(label: string): boolean {
    const fn = LABEL_ANIMATIONS.get(label.toUpperCase().trim());
    if (!fn) return true;   // no animation for this label, proceed normally
    return fn();
}

// --- Send chat message --------------------------------------------------------
// "action" -> (Name text)   "emote" -> * Name text *   "seq" -> runSequence

export function sendAction(emote: string, style: ActionStyle = "action"): void {
    const text = emote.trim();
    if (!text) return;

    if (style === "seq") { runSequence(text); return; }

    if (style === "emote") {
        // BC natively formats Emote as:  * Name text *
        ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] });
        return;
    }

    // Action style: (Name text)
    // BC can't find the key in Interface.csv so it prepends "MISSING TEXT IN "Interface.csv": ".
    // We include the player's name directly in Content, then use the poison tag to strip the prefix,
    // leaving only the zero-width char + text so it renders as  (â€‹Name text).
    ServerSend("ChatRoomChat", {
        Type: "Action",
        Content: getDisplayName() + " " + text,
        Dictionary: [
            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
            { SourceCharacter: Player.MemberNumber },
        ],
    });
}

// --- In-game sidebar ---------------------------------------------------------

const BTN_X       = 0;
const BTN_START_Y = 320;
const BTN_SIZE    = 45;

// Collapse toggle - shorter than action buttons so it reads as a control, not a content button
const CHIP_X = 0;
const CHIP_Y = 270;
const CHIP_W = 45;
const CHIP_H = 28;

let sidebarCollapsed = false;

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;

    DrawButton(CHIP_X, CHIP_Y, CHIP_W, CHIP_H,
        sidebarCollapsed ? "+" : "=",
        sidebarCollapsed ? UI.accentDeep : UI.accentSoft,
        "", sidebarCollapsed ? "Show quick actions" : "Hide quick actions");

    if (sidebarCollapsed) return;

    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        DrawButton(BTN_X, BTN_START_Y + i * BTN_SIZE, BTN_SIZE, BTN_SIZE,
            btn.label, btn.color || "#c2185b", "", btn.emote);
    }
}

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;

    // Collapse toggle
    if (MouseX >= CHIP_X && MouseX <= CHIP_X + CHIP_W &&
        MouseY >= CHIP_Y && MouseY <= CHIP_Y + CHIP_H) {
        sidebarCollapsed = !sidebarCollapsed;
        return true;
    }

    if (sidebarCollapsed) return false;

    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y    && MouseY <= y + BTN_SIZE) {
            // Check animation first â€” if it's blocked, suppress the chat message too.
            const animOk = triggerLabelAnimation(btn.label);
            if (animOk) sendAction(btn.emote, btn.style ?? "action");
            return true;
        }
    }
    return false;
}
