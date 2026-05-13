// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import { UI } from "./ui";
import { callBC } from "./bcUtils";

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

// --- Button categories -------------------------------------------------------

export interface ButtonCategory {
    name: string;
    buttons: ActionButton[];
    slotCount: number;
}

// --- Storage -----------------------------------------------------------------

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

/** Returns all categories, migrating from old flat format if needed. */
export function getCategories(): ButtonCategory[] {
    const store = getStore();
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
    if (Array.isArray(cats) && cats.length > 0) return cats as ButtonCategory[];
    return [{ name: "Default", buttons: [...DEFAULT_BUTTONS], slotCount: DEFAULT_SLOTS }];
}

export function getActiveCategoryIndex(): number {
    const store = getStore();
    const cats  = getCategories();
    const idx   = store.activeCategoryIndex;
    if (typeof idx === "number" && idx >= 0 && idx < cats.length) return idx;
    return 0;
}

export function setActiveCategoryIndex(idx: number): void {
    const store = getStore();
    store.activeCategoryIndex = idx;
    ServerPlayerExtensionSettingsSync("EmeryBC");
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
    const store = getStore();
    const cats  = getCategories();
    const idx   = getActiveCategoryIndex();
    cats[idx].buttons   = buttons;
    cats[idx].slotCount = slotCount;
    store.buttonCategories = cats;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function saveCategories(categories: ButtonCategory[], activeIndex: number): void {
    const store = getStore();
    store.buttonCategories    = categories;
    store.activeCategoryIndex = activeIndex;
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
    // leaving only the zero-width char + text so it renders as (Name text).
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

const BTN_SIZE   = 45;
const CHIP_W     = 45;
const CHIP_H     = 28;
const CAT_CHIP_H = 30;
const CAT_ARR_W  = 22;
const GRIP_H     = 22;  // drag handle above collapse toggle — tall enough to tap

// Position — mutable, persisted to localStorage
const SIDEBAR_POS_KEY = "EBC_sidebarPos";
let sidebarX = 0;
let sidebarY = 270;
try {
    const _saved = localStorage.getItem(SIDEBAR_POS_KEY);
    if (_saved) { const _p = JSON.parse(_saved) as { x?: number; y?: number }; sidebarX = _p.x ?? 0; sidebarY = _p.y ?? 270; }
} catch { /* ignore */ }

function saveSidebarPos(): void {
    try { localStorage.setItem(SIDEBAR_POS_KEY, JSON.stringify({ x: sidebarX, y: sidebarY })); } catch { /* ignore */ }
}

let sidebarCollapsed = false;

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

function startDrag(cx: number, cy: number): void {
    isDragging = true;
    dragAnchorMouseX = cx;
    dragAnchorMouseY = cy;
    dragAnchorPanelX = sidebarX;
    dragAnchorPanelY = sidebarY;

    const onMove = (e: MouseEvent | TouchEvent): void => {
        const pt = "touches" in e ? e.touches[0] : e as MouseEvent;
        const { x, y } = screenToCanvas(pt.clientX, pt.clientY);
        sidebarX = Math.max(0,          Math.min(1955, dragAnchorPanelX + (x - dragAnchorMouseX)));
        sidebarY = Math.max(GRIP_H + 2, Math.min(900,  dragAnchorPanelY + (y - dragAnchorMouseY)));
    };
    const onEnd = (): void => {
        isDragging = false;
        saveSidebarPos();
        document.removeEventListener("mousemove", onMove as EventListener);
        document.removeEventListener("touchmove",  onMove as EventListener);
        document.removeEventListener("mouseup",    onEnd);
        document.removeEventListener("touchend",   onEnd);
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

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;

    // Derived Y positions
    const gripY      = sidebarY - GRIP_H - 2;
    const catChipY   = sidebarY + CHIP_H + 4;
    const btnStartY  = catChipY + CAT_CHIP_H + 4;

    // Drag grip — hold & drag to reposition
    DrawRect(sidebarX, gripY, CHIP_W, GRIP_H,
        isDragging ? "#3d1a2a" : "#1e0e18");
    DrawEmptyRect(sidebarX, gripY, CHIP_W, GRIP_H,
        isDragging ? UI.accent : "#5a2a44", 1);
    DrawTextFit("⠿", sidebarX + CHIP_W / 2, gripY + GRIP_H / 2 + 1, CHIP_W - 6,
        isDragging ? UI.accent : "#b06080");

    // Collapse toggle — dark, unobtrusive; just a small arrow hint
    DrawRect(sidebarX, sidebarY, CHIP_W, CHIP_H, "#100810");
    DrawEmptyRect(sidebarX, sidebarY, CHIP_W, CHIP_H, "#2a1428", 1);
    DrawTextFit(sidebarCollapsed ? "▶" : "▼", sidebarX + CHIP_W / 2, sidebarY + CHIP_H / 2 + 1,
        CHIP_W - 6, sidebarCollapsed ? UI.accentSoft : "#3d1f2e");

    if (sidebarCollapsed) return;

    // Category switcher chip: [◀] Name [▶]
    const cats  = getCategories();
    const idx   = getActiveCategoryIndex();
    const label = cats.length > 1
        ? cats[idx].name.slice(0, 5)
        : cats[idx].name.slice(0, 7);

    const chipBg = "#2a0e1e";
    DrawButton(sidebarX, catChipY, CAT_ARR_W, CAT_CHIP_H,
        "◀", idx > 0 ? chipBg : "#1a0a14", "", idx > 0 ? "Previous category" : "");
    if (cats.length > 1) {
        DrawButton(sidebarX + CAT_ARR_W, catChipY, CHIP_W - CAT_ARR_W * 2, CAT_CHIP_H,
            label, chipBg, "", cats[idx].name);
        DrawButton(sidebarX + CHIP_W - CAT_ARR_W, catChipY, CAT_ARR_W, CAT_CHIP_H,
            "▶", idx < cats.length - 1 ? chipBg : "#1a0a14", "",
            idx < cats.length - 1 ? "Next category" : "");
    } else {
        DrawButton(sidebarX, catChipY, CHIP_W, CAT_CHIP_H, label, chipBg, "", cats[idx].name);
    }

    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        DrawButton(sidebarX, btnStartY + i * BTN_SIZE, BTN_SIZE, BTN_SIZE,
            btn.label, btn.color || "#c2185b", "", btn.emote);
    }
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
    if (my >= catChipY && my <= catChipY + CAT_CHIP_H) {
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
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = btnStartY + i * BTN_SIZE;
        if (mx >= sidebarX && mx <= sidebarX + BTN_SIZE &&
            my >= y         && my <= y + BTN_SIZE) {
            const animOk = triggerLabelAnimation(btn.label);
            if (animOk) sendAction(btn.emote, btn.style ?? "action");
            return true;
        }
    }
    return false;
}
