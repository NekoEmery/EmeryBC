// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import { UI } from "./ui";
import { callBC, getSettings, syncSettings } from "./bcUtils";
import { applyExprPresetWithRevert } from "./expressions";
import { applyPoses, getCurrentPoses, KNOWN_POSES } from "./poses";

export type ActionStyle = "action" | "emote" | "seq";
// "action" = (Name text)
// "emote"  = * Name text *
// "seq"    = pose/action sequence (pipe-separated steps)

export interface ActionButton {
    label:   string;
    emote:   string;   // for "seq": pipe-separated steps; for "action"/"emote": the chat text
    color:   string;
    enabled: boolean;
    style:   ActionStyle;
    includeNameInAnnounce?: boolean; // default true; only applies to "action" style
    exprPresetId?: string;    // optional expression preset to apply on fire
    exprDurationMs?: number;  // ms before reverting back (0 = keep forever)
    bodyPoseKey?: string;     // undefined = no change; "" = Stand; pose key = apply
    armPoseKey?: string;      // undefined = no change; "" = Relaxed; pose key = apply
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

// --- Button categories -------------------------------------------------------

export interface ButtonCategory {
    name: string;
    buttons: ActionButton[];
    slotCount: number;
}

// --- Storage -----------------------------------------------------------------


// One-time guard for the legacy-style scan below. The removed "expression"/
// "exprPreset" styles can no longer be created in the UI, so once the saved data
// has been scanned clean they can never reappear - no need to re-scan on every
// (per-frame) call to getCategories().
let _legacyStyleScanned = false;

/** Returns all categories, migrating from old flat format if needed. */
export function getCategories(): ButtonCategory[] {
    const store = getSettings();
    // Migrate old flat actionButtons → first category "Default"
    if (!store.buttonCategories && store.actionButtons) {
        const migrated: ButtonCategory[] = [{
            name: "Default",
            buttons: store.actionButtons as ActionButton[],
            slotCount: typeof store.actionSlotCount === "number"
                ? (store.actionSlotCount as number)
                : DEFAULT_SLOTS,
        }];
        store.buttonCategories = migrated;
        delete store.actionButtons;
        delete store.actionSlotCount;
    }
    const cats = store.buttonCategories;
    if (Array.isArray(cats) && cats.length > 0) {
        // Migrate buttons that still carry the removed "expression"/"exprPreset" styles.
        // Convert them to plain "action" slots with empty emote so they're harmless and
        // the user can reconfigure or delete them in the Buttons tab.
        const catsList = cats as ButtonCategory[];
        if (!_legacyStyleScanned) {
            let didMigrate = false;
            for (const cat of catsList) {
                for (const btn of cat.buttons as ActionButton[]) {
                    const s = btn.style as string;
                    if (s === "expression" || s === "exprPreset") {
                        btn.style   = "action";
                        btn.emote   = "";
                        btn.label   = "";
                        btn.enabled = false;
                        didMigrate = true;
                    }
                }
            }
            if (didMigrate) { store.buttonCategories = catsList; syncSettings(); }
            _legacyStyleScanned = true;
        }
        return catsList;
    }
    return [{ name: "Default", buttons: [...DEFAULT_BUTTONS], slotCount: DEFAULT_SLOTS }];
}

export function getActiveCategoryIndex(): number {
    const store = getSettings();
    const cats  = getCategories();
    const idx   = store.activeCategoryIndex;
    if (typeof idx === "number" && idx >= 0 && idx < cats.length) return idx;
    return 0;
}

export function setActiveCategoryIndex(idx: number): void {
    const store = getSettings();
    store.activeCategoryIndex = idx;
    syncSettings();
}

export function getActiveCategory(): ButtonCategory {
    const cats = getCategories();
    return cats[getActiveCategoryIndex()] ?? cats[0];
}

export function getButtons(): ActionButton[] {
    return getActiveCategory().buttons;
}

export function getSlotCount(): number {
    const cat = getActiveCategory();
    const n = cat.slotCount;
    if (typeof n === "number") return Math.min(ABSOLUTE_MAX, Math.max(1, n));
    return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, cat.buttons.length));
}

export function saveButtons(buttons: ActionButton[], slotCount: number): void {
    const store = getSettings();
    const cats  = getCategories();
    const idx   = getActiveCategoryIndex();
    cats[idx].buttons   = buttons;
    cats[idx].slotCount = slotCount;
    store.buttonCategories = cats;
    syncSettings();
}

export function saveCategories(categories: ButtonCategory[], activeIndex: number): void {
    const store = getSettings();
    store.buttonCategories    = categories;
    store.activeCategoryIndex = activeIndex;
    syncSettings();
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
//   PoseName   - set BC pose (e.g. "HandsUp", "Yoked")
//   _          - clear all active poses back to neutral
//   !text      - send as (Name text) action message
//   *text      - send as * Name text * emote message
// Steps run 500 ms apart. Original poses are restored when done.

let seqRunning = false;
let seqTimeoutId: ReturnType<typeof setTimeout> | null = null;
let seqDoneCallback: (() => void) | null = null;
let seqRestoreFn: (() => void) | null = null;

export function isSeqRunning(): boolean { return seqRunning; }
export function setSeqDoneCallback(fn: (() => void) | null): void { seqDoneCallback = fn; }

// -- BC-native slow leave ----------------------------------------------------
// Two-stage approach with optional intro emote:
//   t=0           : send intro emote (if any), show Crawl status icon
//   t=INTRO_DELAY : send SlowLeaveAttempt action message
//   t=INTRO_DELAY+durMs : fire done callback (leave room)
//   cancel        : clear timers, send SlowLeaveCancel only if attempt was sent, clear Crawl
const INTRO_DELAY_MS = 1_200;

let slowLeaveActive       = false;   // true from start until cancel/done
let slowLeaveAttemptSent  = false;   // true once SlowLeaveAttempt has been sent
let slowLeaveIntroId: ReturnType<typeof setTimeout> | null = null;
let slowLeaveLeaveId: ReturnType<typeof setTimeout> | null = null;
let slowLeaveDoneCallback: (() => void) | null = null;

export function isSlowLeaveActive(): boolean { return slowLeaveActive; }
export function setSlowLeaveDoneCallback(fn: (() => void) | null): void { slowLeaveDoneCallback = fn; }

function bcStatusUpdate(status: string): void {
    try { (window as unknown as Record<string, (s: string) => void>).ChatRoomStatusUpdate?.(status); } catch { /* ignore */ }
}

export function startBCSlowLeave(durMs: number, introEmote = ""): void {
    if (slowLeaveActive) return;
    slowLeaveActive = true;
    slowLeaveAttemptSent = false;

    bcStatusUpdate("Crawl");

    const sendAttemptThenLeave = (): void => {
        slowLeaveIntroId = null;
        try {
            ServerSend("ChatRoomChat", {
                Type: "Action",
                Content: "SlowLeaveAttempt",
                Dictionary: [{ SourceCharacter: Player.MemberNumber }],
            });
            slowLeaveAttemptSent = true;
        } catch { /* ignore */ }
        slowLeaveLeaveId = window.setTimeout(() => {
            slowLeaveLeaveId = null;
            slowLeaveActive = false;
            slowLeaveAttemptSent = false;
            const cb = slowLeaveDoneCallback;
            slowLeaveDoneCallback = null;
            cb?.();
        }, durMs);
    };

    const intro = introEmote.trim().replace(/^\*/, "").trim();
    if (intro) {
        try {
            ServerSend("ChatRoomChat", { Type: "Emote", Content: intro, Dictionary: [] });
        } catch { /* ignore */ }
        slowLeaveIntroId = window.setTimeout(sendAttemptThenLeave, INTRO_DELAY_MS);
    } else {
        sendAttemptThenLeave();
    }
}

export function cancelBCSlowLeave(): void {
    if (!slowLeaveActive) return;
    if (slowLeaveIntroId !== null) { window.clearTimeout(slowLeaveIntroId); slowLeaveIntroId = null; }
    if (slowLeaveLeaveId !== null) { window.clearTimeout(slowLeaveLeaveId); slowLeaveLeaveId = null; }
    slowLeaveActive = false;
    slowLeaveDoneCallback = null;
    bcStatusUpdate("");
    if (slowLeaveAttemptSent) {
        slowLeaveAttemptSent = false;
        try {
            ServerSend("ChatRoomChat", {
                Type: "Action",
                Content: "SlowLeaveCancel",
                Dictionary: [{ SourceCharacter: Player.MemberNumber }],
            });
        } catch { /* ignore */ }
    } else {
        slowLeaveAttemptSent = false;
    }
}
export function cancelSequence(): void {
    if (!seqRunning) return;
    if (seqTimeoutId !== null) { window.clearTimeout(seqTimeoutId); seqTimeoutId = null; }
    seqRestoreFn?.();
    seqRestoreFn = null;
    seqRunning = false;
    const cb = seqDoneCallback;
    seqDoneCallback = null;
    cb?.();
}

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
    seqRestoreFn = () => { Player.ActivePose = originalPoses; syncPoseToRoom(); };
    let idx = 0;

    const next = (): void => {
        try {
            if (idx >= steps.length) {
                // Sequence done - restore original pose, do a full sync + local refresh.
                Player.ActivePose = originalPoses;
                syncPoseToRoom();
                seqRunning = false;
                seqTimeoutId = null;
                seqRestoreFn = null;
                const cb = seqDoneCallback;
                seqDoneCallback = null;
                cb?.();
                return;
            }

            const { content: step, delay } = steps[idx++];

            if (step === "_") {
                Player.ActivePose = originalPoses;
                sendPoseUpdate(appearanceBundle);
            } else if (step.toLowerCase() === "leaveroom") {
                Player.ActivePose = originalPoses;
                seqRunning = false;
                seqTimeoutId = null;
                seqRestoreFn = null;
                const leaveCb = seqDoneCallback;
                seqDoneCallback = null;
                window.setTimeout(() => {
                    leaveCb?.();
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

            seqTimeoutId = window.setTimeout(next, delay);
        } catch (_) {
            seqRunning = false;
            seqTimeoutId = null;
            seqRestoreFn = null;
            const cb = seqDoneCallback;
            seqDoneCallback = null;
            cb?.();
        }
    };

    next();
}

// --- Label-based animation triggers ------------------------------------------
// If a button's label matches one of these (case-insensitive), the matching
// animation plays automatically alongside the normal message. Completely hidden
// from the user -- the emote field is just normal text.

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
        localNotice("Your arms are restrained -- can't cheer right now!");
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

// Returns false if an animation was attempted but blocked - caller should suppress the chat message.
// Returns true if the animation ran fine, or if there is no animation for this label.
function triggerLabelAnimation(label: string): boolean {
    const fn = LABEL_ANIMATIONS.get(label.toUpperCase().trim());
    if (!fn) return true;   // no animation for this label, proceed normally
    return fn();
}

// --- Send chat message --------------------------------------------------------
// "action" -> (Name text)   "emote" -> * Name text *   "seq" -> runSequence

export function sendAction(emote: string, style: ActionStyle = "action", includeName = true): void {
    const text = emote.trim();
    if (!text) return;

    if (style === "seq") { runSequence(text); return; }

    if (style === "emote") {
        // BC natively formats Emote as:  * Name text *
        ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] });
        return;
    }

    // Action style: (Name text) or (text) when name is excluded
    // BC can't find the key in Interface.csv so it prepends "MISSING TEXT IN "Interface.csv": ".
    // We include the player's name directly in Content, then use the poison tag to strip the prefix,
    // leaving only the zero-width char + text so it renders as (Name text).
    const actionContent = includeName ? getDisplayName() + " " + text : text;
    ServerSend("ChatRoomChat", {
        Type: "Action",
        Content: actionContent,
        Dictionary: [
            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
            { SourceCharacter: Player.MemberNumber },
        ],
    });
}

// --- In-game sidebar ---------------------------------------------------------

const BTN_SIZE   = 45;
const CHIP_W     = 45;
const CHIP_H     = 28;
const CAT_CHIP_H = 30;
const CAT_ARR_W  = 22;
const GRIP_H     = 22;  // drag handle above collapse toggle — tall enough to tap

// Position — mutable, persisted to localStorage
const SIDEBAR_POS_KEY = "EBC_sidebarPos";
const SIDEBAR_DEFAULT_X = 0;
const SIDEBAR_DEFAULT_Y = 270;
// Fallback hard cap — overridden at drag time by the live DOM check below.
const SIDEBAR_MAX_X_FALLBACK = 700;

let sidebarX = SIDEBAR_DEFAULT_X;
let sidebarY = SIDEBAR_DEFAULT_Y;
try {
    const _saved = localStorage.getItem(SIDEBAR_POS_KEY);
    if (_saved) {
        const _p = JSON.parse(_saved) as { x?: number; y?: number };
        sidebarX = Math.max(0, Math.min(SIDEBAR_MAX_X_FALLBACK, _p.x ?? SIDEBAR_DEFAULT_X));
        sidebarY = Math.max(GRIP_H + 2, Math.min(900, _p.y ?? SIDEBAR_DEFAULT_Y));
    }
} catch { /* ignore */ }

function saveSidebarPos(): void {
    try { localStorage.setItem(SIDEBAR_POS_KEY, JSON.stringify({ x: sidebarX, y: sidebarY })); } catch { /* ignore */ }
}

export function resetSidebarPos(): void {
    sidebarX = SIDEBAR_DEFAULT_X;
    sidebarY = SIDEBAR_DEFAULT_Y;
    try { localStorage.removeItem(SIDEBAR_POS_KEY); } catch { /* ignore */ }
}

let sidebarCollapsed = false;

// Per-button spam cooldown.
// Up to SPAM_FREE_PRESSES consecutive rapid presses are allowed; the next press
// within SPAM_WINDOW_MS activates the cooldown and is blocked.
// Waiting longer than SPAM_WINDOW_MS between presses resets the streak.
const BUTTON_COOLDOWN_MS  = 5_000;  // lock duration once spam is detected
const SPAM_WINDOW_MS      = 2_000;  // window in which consecutive presses are counted
const SPAM_FREE_PRESSES   = 3;      // presses 1-3 fire freely; press 4+ triggers lockout
const _btnLastFire    = new Map<number, number>(); // key → timestamp of last successful fire
const _btnPressCount  = new Map<number, number>(); // key → consecutive rapid press count
const _btnCooldowns   = new Map<number, number>(); // key → timestamp cooldown was activated

// Drag state
let isDragging = false;
let dragAnchorMouseX = 0;
let dragAnchorMouseY = 0;
let dragAnchorPanelX = 0;
let dragAnchorPanelY = 0;

function getCanvasScale(): { scaleX: number; scaleY: number; left: number; top: number } {
    const canvas = document.getElementById("MainCanvas") as HTMLCanvasElement | null;
    if (!canvas) return { scaleX: 1, scaleY: 1, left: 0, top: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
        scaleX: 2000 / (rect.width  || 2000),
        scaleY: 1000 / (rect.height || 1000),
        left: rect.left,
        top:  rect.top,
    };
}

function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const { scaleX, scaleY, left, top } = getCanvasScale();
    return { x: (clientX - left) * scaleX, y: (clientY - top) * scaleY };
}

function isInGrip(cx: number, cy: number): boolean {
    const gripY = sidebarY - GRIP_H - 2;
    return cx >= sidebarX && cx <= sidebarX + CHIP_W &&
           cy >= gripY    && cy <= gripY + GRIP_H;
}

/** Returns the maximum canvas-X the sidebar left edge may reach before overlapping the chat. */
function getSidebarMaxX(): number {
    // Try to read the left edge of BC's chat log (or EBC drawer) in real time.
    // "#TextAreaChatLog" is BC's native chat log element; we also check the EBC drawer.
    const candidates = [
        document.getElementById("TextAreaChatLog"),
        document.getElementById("TextAreaChatInput"),
        document.querySelector(".ebc-panel") as HTMLElement | null,
    ];
    const canvas = document.getElementById("MainCanvas") as HTMLCanvasElement | null;
    if (canvas) {
        const { left: cLeft, width: cWidth } = canvas.getBoundingClientRect();
        const scaleX = 2000 / (cWidth || 2000);
        for (const el of candidates) {
            if (!el) continue;
            const elLeft = el.getBoundingClientRect().left;
            const canvasX = (elLeft - cLeft) * scaleX;
            if (canvasX > 50) return Math.max(0, canvasX - CHIP_W - 8);
        }
    }
    return SIDEBAR_MAX_X_FALLBACK;
}

function startDrag(cx: number, cy: number): void {
    isDragging = true;
    dragAnchorMouseX = cx;
    dragAnchorMouseY = cy;
    dragAnchorPanelX = sidebarX;
    dragAnchorPanelY = sidebarY;
    let hasMoved = false;
    const maxX = getSidebarMaxX();

    const onMove = (e: MouseEvent | TouchEvent): void => {
        const pt = "touches" in e ? e.touches[0] : e as MouseEvent;
        const { x, y } = screenToCanvas(pt.clientX, pt.clientY);
        sidebarX = Math.max(0, Math.min(maxX, dragAnchorPanelX + (x - dragAnchorMouseX)));
        sidebarY = Math.max(GRIP_H + 2, Math.min(900,  dragAnchorPanelY + (y - dragAnchorMouseY)));
        hasMoved = true;
    };
    const onEnd = (): void => {
        isDragging = false;
        saveSidebarPos();
        document.removeEventListener("mousemove", onMove as EventListener);
        document.removeEventListener("touchmove",  onMove as EventListener);
        document.removeEventListener("mouseup",    onEnd);
        document.removeEventListener("touchend",   onEnd);
        // Suppress the click that fires after mouseup so it doesn't hit BC characters.
        // Only suppress if the click target is the game canvas — HTML panel elements
        // (like EBC kitty/pose buttons) must not be swallowed by this guard.
        if (hasMoved) {
            const suppress = (e: Event): void => {
                if ((e.target as Element | null)?.id === "MainCanvas") {
                    e.stopPropagation();
                    e.preventDefault();
                }
            };
            document.addEventListener("click", suppress, { capture: true, once: true });
        }
    };

    document.addEventListener("mousemove", onMove as EventListener);
    document.addEventListener("touchmove",  onMove as EventListener, { passive: true });
    document.addEventListener("mouseup",    onEnd);
    document.addEventListener("touchend",   onEnd);
}

// Attach hold-to-drag directly on the canvas via mousedown/touchstart so the
// drag begins while the button is held — not on click (which would fire after release).
export function initDragListener(): void {
    const canvas = document.getElementById("MainCanvas") as HTMLCanvasElement | null;
    if (!canvas) {
        // Canvas not ready yet — retry shortly
        window.setTimeout(initDragListener, 200);
        return;
    }
    const onDown = (e: MouseEvent | TouchEvent): void => {
        // Don't allow repositioning while a character tab (in the current room) is open —
        // getSidebarMaxX() can't find the chat log during the overlay, causing the clamp
        // to break and the panel to end up stuck behind chat.
        // Only block when the character is actually in the room — synthetic characters from
        // offline profile viewing must not lock the drag grip permanently.
        try {
            const w = window as unknown as Record<string, unknown>;
            const cc = w.CurrentCharacter as Record<string, unknown> | null | undefined;
            if (cc) {
                const memberNum = cc.MemberNumber as number | undefined;
                const roomChars = w.ChatRoomCharacter as Array<{ MemberNumber?: number }> | undefined;
                const inRoom = Array.isArray(roomChars) && roomChars.some(c => c.MemberNumber === memberNum);
                if (inRoom) return; // real in-room character menu open — block drag
            }
        } catch { /* ignore */ }
        const pt = "touches" in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
        const { x, y } = screenToCanvas(pt.clientX, pt.clientY);
        if (isInGrip(x, y)) {
            e.preventDefault();
            startDrag(x, y);
        }
    };
    canvas.addEventListener("mousedown",  onDown as EventListener);
    canvas.addEventListener("touchstart", onDown as EventListener, { passive: false });
}

/**
 * Draw a single action button with perfectly centred label text.
 * Delegates to BC's DrawButton (empty label) so the background colour,
 * border, and mouse-hover highlight all work exactly as before — then
 * overlays our own canvas text centred both horizontally and vertically.
 */
// DOM tooltip shown when hovering sidebar elements — floats above BC's chat overlay
// so it's never hidden behind BC's native DOM elements.
let _tooltip: HTMLDivElement | null = null;
let _tooltipLastText = "";
function _ensureTooltip(): HTMLDivElement {
    if (_tooltip && _tooltip.isConnected) return _tooltip;
    const el = document.createElement("div");
    el.style.cssText = [
        "position:fixed",
        "background:#f8f3c0",
        "border:2px solid #b0a020",
        "border-radius:4px",
        "padding:3px 10px",
        "font-family:Arial,sans-serif",
        "font-size:14px",
        "color:#000",
        "z-index:10000000",
        "pointer-events:none",
        "white-space:nowrap",
        "display:none",
    ].join(";");
    document.body.appendChild(el);
    _tooltip = el;
    return el;
}
function _showTooltip(text: string, canvasAnchorY: number): void {
    const tt = _ensureTooltip();
    if (text !== _tooltipLastText) { tt.textContent = text; _tooltipLastText = text; }
    const { scaleX, scaleY, left, top } = getCanvasScale();
    const sx = left + (sidebarX + CHIP_W + 6) / scaleX;
    const sy = top  + canvasAnchorY / scaleY;
    tt.style.left    = `${Math.max(0, Math.min(window.innerWidth - 220, sx))}px`;
    tt.style.top     = `${Math.max(4, sy)}px`;
    tt.style.display = "block";
}
function _hideTooltip(): void {
    if (_tooltip) _tooltip.style.display = "none";
}

// These draw helpers run per visible button per animation frame (~60 fps). Cache
// the MainCanvas 2d context instead of re-querying the DOM each call, and memoize
// the fitted font size per (label,size) instead of re-measuring text every frame.
let _btnCanvas: HTMLCanvasElement | null = null;
let _btnCtx: CanvasRenderingContext2D | null = null;
function getButtonCtx(): CanvasRenderingContext2D | null {
    if (_btnCtx && _btnCanvas && _btnCanvas.isConnected) return _btnCtx;
    const w = window as unknown as Record<string, unknown>;
    let canvas = w["MainCanvas"] as HTMLCanvasElement | null;
    if (!(canvas instanceof HTMLCanvasElement)) {
        canvas = document.getElementById("MainCanvas") as HTMLCanvasElement | null;
    }
    _btnCanvas = canvas;
    _btnCtx = canvas?.getContext("2d") ?? null;
    return _btnCtx;
}

const _fitFontCache = new Map<string, number>();
function fitButtonFontSize(ctx: CanvasRenderingContext2D, label: string, size: number): number {
    const key = label + "|" + size;
    const cached = _fitFontCache.get(key);
    if (cached !== undefined) return cached;
    // Try progressively smaller fonts until the text fits horizontally. The font
    // family is fixed, so the result depends only on (label,size) and is stable.
    const maxW = size - 8;
    let fontSize = 14;
    ctx.font = `bold ${fontSize}px 'Trebuchet MS', Arial, sans-serif`;
    while (ctx.measureText(label).width > maxW && fontSize > 7) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px 'Trebuchet MS', Arial, sans-serif`;
    }
    _fitFontCache.set(key, fontSize);
    return fontSize;
}

function drawActionButton(
    x: number, y: number, size: number,
    label: string, bgColor: string,
    hoverText = "",
): void {
    // BC handles background + hover effect; empty label so it draws no text
    DrawButton(x, y, size, size, "", bgColor, "", hoverText);

    const ctx = getButtonCtx();
    if (!ctx) return;
    ctx.save();

    const pad = 4;
    const maxW = size - pad * 2;
    const fontSize = fitButtonFontSize(ctx, label, size);
    ctx.font = `bold ${fontSize}px 'Trebuchet MS', Arial, sans-serif`;

    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = "#ffffff";
    ctx.shadowColor  = "rgba(0,0,0,0.6)";
    ctx.shadowBlur   = 2;
    ctx.fillText(label, x + size / 2, y + size / 2, maxW);
    ctx.restore();
}

/**
 * Draw a cooldown button at (x, y) with a dimmed label, large countdown
 * number, and a fill-bar progress indicator along the bottom edge.
 */
function drawCooldownButton(
    x: number, y: number, size: number,
    label: string, remainMs: number,
): void {
    // Dark background + subtle border
    DrawRect(x, y, size, size, "rgba(10,3,8,0.92)");
    DrawEmptyRect(x, y, size, size, "#2a0e1a", 1);

    const ctx = getButtonCtx();
    if (ctx) {
        ctx.save();
        ctx.textAlign = "center";

        // Dimmed label at the top so the user knows which button this is
        ctx.font = "bold 11px arial";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#3a1525";
        ctx.fillText(label.length > 8 ? label.slice(0, 8) : label, x + size / 2, y + 4);

        // Countdown number centred — bright pink, large
        const secs = Math.ceil(remainMs / 1000);
        ctx.font = "bold 20px arial";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#cf6f98";
        ctx.fillText(String(secs), x + size / 2, y + size / 2 + 4);

        // Fill-bar: dark trough then pink fill growing left→right as cooldown drains
        const barH  = 3;
        const barX  = x + 2;
        const barY  = y + size - barH - 2;
        const barW  = size - 4;
        const filled = (1 - remainMs / BUTTON_COOLDOWN_MS) * barW;
        ctx.fillStyle = "#1a080f";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = "#cf6f98";
        ctx.fillRect(barX, barY, Math.max(0, Math.min(barW, filled)), barH);

        ctx.restore();
    } else {
        // Canvas context unavailable — simple text fallback
        DrawTextFit(
            Math.ceil(remainMs / 1000) + "s",
            x + size / 2, y + size / 2,
            size - 4, "#cf6f98",
        );
    }
}

/** Converts a 6-digit hex color to rgba() with the given alpha (0–1). */
function withAlpha(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") { _hideTooltip(); return; }

    // Derived Y positions
    const gripY      = sidebarY - GRIP_H - 2;
    const catChipY   = sidebarY + CHIP_H + 4;
    const btnStartY  = catChipY + CAT_CHIP_H + 4;

    // Semi-transparent background variants
    const bgNormal   = withAlpha(UI.cardMuted,   0.88);
    const bgActive   = withAlpha(UI.accentSoft,  0.88);
    const bgChip     = withAlpha("#2a0e1e",       0.88);
    const bgInactive = withAlpha("#1a0a14",       0.88);

    // Drag grip — hold & drag to reposition
    DrawRect(sidebarX, gripY, CHIP_W, GRIP_H,
        isDragging ? bgActive : bgNormal);
    DrawEmptyRect(sidebarX, gripY, CHIP_W, GRIP_H,
        isDragging ? UI.accent : UI.panelEdge, 1);
    // 2×3 dot grid
    const dotCol    = isDragging ? UI.accent : UI.accentDeep;
    const dotSize   = 3;
    const dotGapX   = 6;
    const dotGapY   = 5;
    const dotStartX = sidebarX + CHIP_W / 2 - dotGapX / 2 - dotSize / 2;
    const dotStartY = gripY + GRIP_H / 2 - dotGapY - dotSize / 2;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
            DrawRect(dotStartX + col * dotGapX, dotStartY + row * dotGapY, dotSize, dotSize, dotCol);
        }
    }

    // Collapse toggle — same palette as grip; lit pink when collapsed so user knows it's there
    DrawRect(sidebarX, sidebarY, CHIP_W, CHIP_H,
        sidebarCollapsed ? bgActive : bgNormal);
    DrawEmptyRect(sidebarX, sidebarY, CHIP_W, CHIP_H,
        sidebarCollapsed ? UI.accent : UI.panelEdge, 1);
    // Two short bars centered — subtle when open, bright when closed
    const bCol = sidebarCollapsed ? UI.accent : UI.accentSoft;
    const bW   = Math.floor(CHIP_W * 0.55);
    const bH   = 2;
    const bX   = sidebarX + Math.floor((CHIP_W - bW) / 2);
    const bMid = sidebarY + Math.floor(CHIP_H / 2);
    DrawRect(bX, bMid - 4, bW, bH, bCol);
    DrawRect(bX, bMid + 2, bW, bH, bCol);

    if (sidebarCollapsed) { _hideTooltip(); return; }

    // Category switcher chip: [◀] Name [▶]
    const cats  = getCategories();
    const idx   = getActiveCategoryIndex();
    const label = cats.length > 1
        ? cats[idx].name.slice(0, 5)
        : cats[idx].name.slice(0, 7);

    DrawButton(sidebarX, catChipY, CAT_ARR_W, CAT_CHIP_H,
        "◀", idx > 0 ? bgChip : bgInactive, "", "");
    if (cats.length > 1) {
        DrawButton(sidebarX + CAT_ARR_W, catChipY, CHIP_W - CAT_ARR_W * 2, CAT_CHIP_H,
            label, bgChip, "", "");
        DrawButton(sidebarX + CHIP_W - CAT_ARR_W, catChipY, CAT_ARR_W, CAT_CHIP_H,
            "▶", idx < cats.length - 1 ? bgChip : bgInactive, "", "");
    } else {
        DrawButton(sidebarX, catChipY, CHIP_W, CAT_CHIP_H, label, bgChip, "", "");
    }

    const buttons = getButtons();
    const now = Date.now();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const cdKey     = idx * 100 + i;
        const remainMs  = BUTTON_COOLDOWN_MS - (now - (_btnCooldowns.get(cdKey) ?? 0));
        const onCooldown = remainMs > 0;
        if (onCooldown) {
            drawCooldownButton(sidebarX, btnStartY + i * BTN_SIZE, BTN_SIZE, btn.label, remainMs);
        } else {
            drawActionButton(sidebarX, btnStartY + i * BTN_SIZE, BTN_SIZE,
                btn.label, withAlpha(btn.color || "#c2185b", 0.90));
        }
    }

    // DOM tooltip - floats above BC's DOM chat layer so it's never hidden behind it
    const mx2 = (window as unknown as Record<string, number>).MouseX ?? 0;
    const my2 = (window as unknown as Record<string, number>).MouseY ?? 0;
    let ttText: string | null = null;
    let ttY = catChipY;

    if (my2 >= catChipY && my2 <= catChipY + CAT_CHIP_H && mx2 >= sidebarX && mx2 <= sidebarX + CHIP_W) {
        if (cats.length > 1) {
            if (mx2 <= sidebarX + CAT_ARR_W)                             { ttText = idx > 0 ? "Previous category" : null; }
            else if (mx2 >= sidebarX + CHIP_W - CAT_ARR_W)              { ttText = idx < cats.length - 1 ? "Next category" : null; }
            else                                                          { ttText = cats[idx].name; }
        }
    }
    if (!ttText) {
        for (let ti = 0; ti < buttons.length; ti++) {
            const tbtn = buttons[ti];
            if (!tbtn?.enabled || !tbtn.label || !tbtn.emote) continue;
            const ty = btnStartY + ti * BTN_SIZE;
            if (mx2 >= sidebarX && mx2 <= sidebarX + BTN_SIZE && my2 >= ty && my2 <= ty + BTN_SIZE) {
                ttText = tbtn.emote;
                ttY = ty;
                break;
            }
        }
    }

    if (ttText) _showTooltip(ttText, ttY);
    else _hideTooltip();
}

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;

    const mx = (window as unknown as Record<string, number>).MouseX ?? 0;
    const my = (window as unknown as Record<string, number>).MouseY ?? 0;

    // Derived Y positions (same as in draw)
    const catChipY  = sidebarY + CHIP_H + 4;
    const btnStartY = catChipY + CAT_CHIP_H + 4;

    // Collapse toggle
    if (mx >= sidebarX && mx <= sidebarX + CHIP_W &&
        my >= sidebarY  && my <= sidebarY + CHIP_H) {
        sidebarCollapsed = !sidebarCollapsed;
        return true;
    }

    if (sidebarCollapsed) return false;

    // Category prev/next arrows
    const cats = getCategories();
    const idx  = getActiveCategoryIndex();
    if (my >= catChipY && my <= catChipY + CAT_CHIP_H &&
        mx >= sidebarX && mx <= sidebarX + CHIP_W) {
        if (cats.length > 1) {
            if (mx >= sidebarX && mx <= sidebarX + CAT_ARR_W) {
                if (idx > 0) setActiveCategoryIndex(idx - 1);
                return true;
            }
            if (mx >= sidebarX + CHIP_W - CAT_ARR_W && mx <= sidebarX + CHIP_W) {
                if (idx < cats.length - 1) setActiveCategoryIndex(idx + 1);
                return true;
            }
        }
        return true;
    }

    const buttons = getButtons();
    const now = Date.now();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = btnStartY + i * BTN_SIZE;
        if (mx >= sidebarX && mx <= sidebarX + BTN_SIZE &&
            my >= y         && my <= y + BTN_SIZE) {
            const cdKey = idx * 100 + i;

            // Blocked: cooldown is active
            if (now - (_btnCooldowns.get(cdKey) ?? 0) < BUTTON_COOLDOWN_MS) return true;

            // Count consecutive rapid presses; reset streak if the window expired
            const streak = now - (_btnLastFire.get(cdKey) ?? 0) < SPAM_WINDOW_MS
                ? (_btnPressCount.get(cdKey) ?? 0) + 1
                : 1;
            _btnPressCount.set(cdKey, streak);

            // Spam threshold exceeded → activate cooldown, block this press
            if (streak > SPAM_FREE_PRESSES) {
                _btnCooldowns.set(cdKey, now);
                return true;
            }

            // Within free presses → fire normally
            _btnLastFire.set(cdKey, now);
            const animOk = triggerLabelAnimation(btn.label);
            if (animOk) sendAction(btn.emote, btn.style ?? "action", btn.includeNameInAnnounce !== false);
            if (btn.exprPresetId) applyExprPresetWithRevert(btn.exprPresetId, btn.exprDurationMs ?? 0);
            if (btn.bodyPoseKey !== undefined || btn.armPoseKey !== undefined) {
                try {
                    const live = getCurrentPoses();
                    const armKeys = KNOWN_POSES.find(g => g.group === "Arms")?.poses.map(p => p.key).filter(Boolean) ?? [];
                    const bodyKeys = KNOWN_POSES.find(g => g.group === "Body")?.poses.map(p => p.key).filter(Boolean) ?? [];
                    let result = [...live];
                    if (btn.bodyPoseKey !== undefined) {
                        result = result.filter(p => !bodyKeys.includes(p));
                        if (btn.bodyPoseKey) result.push(btn.bodyPoseKey);
                    }
                    if (btn.armPoseKey !== undefined) {
                        result = result.filter(p => !armKeys.includes(p));
                        if (btn.armPoseKey) result.push(btn.armPoseKey);
                    }
                    applyPoses(result);
                } catch { /* ignore */ }
            }
            return true;
        }
    }
    return false;
}
