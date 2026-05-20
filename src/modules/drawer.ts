/**
 * EmeryBC Drawer
 *
 * CRABS-inspired sliding panel aligned to the right edge of the chat log,
 * positioned 10% down from the top (just below CRABS's own tab).
 * Tabs: Outfits | Buttons
 *
 * UI pattern inspired by CRABS by Sin (https://github.com/sin-1337/CRABS).
 * Thank you Sin for the open design!
 */
import {
    getOutfits,
    applyOutfit,
    saveCurrentAppearanceToOutfit,
    createOutfitFromCurrent,
    deleteOutfit,
    editOutfit,
    exportOutfitById,
    importOutfitFromJSON,
    importOutfitFromBCCode,
    type BCImportMode,
    setOutfitPreserveRestraints,
    setOutfitPreserveClothing,
    RESTRAINT_GROUPS,
    type ConfiguredOutfit,
    type SerializedItem,
    getSchedules,
    addSchedule,
    removeSchedule,
    toggleSchedule,
    checkAndApplySchedules,
    getDefaultNickname,
    setDefaultNickname,
    getDefaultTitle,
    setDefaultTitle,
    getOutfitTags,
    createOutfitTag,
    deleteOutfitTag,
    updateOutfitTag,
    setOutfitTagIds,
    moveOutfit,
    type OutfitTag,
    getRestraints,
    applyRestraintSet,
    createRestraintFromCurrent,
    deleteRestraint,
    editRestraint,
    moveRestraint,
    saveCurrentAppearanceToRestraint,
    setRestraintTagIds,
    applyColorPresetToRestraint,
    getOutfitWhitelist,
    addToOutfitWhitelist,
    removeFromOutfitWhitelist,
    setOutfitNameInAnnounce,
} from "./outfitManager";
import { getAllPalettes, getPalettesByType, captureCurrentPalette, captureRestraintPalette, applyPalette, deletePalette, renamePalette, getCustomColors, addCustomColor, removeCustomColor, applyColorToGroup, applyColorZoneToGroup, applyColorsToGroup, getGroupColors, getGroupZoneNames, getRestraintPresets, saveRestraintPreset, deleteRestraintPreset, renameRestraintPreset, type RestraintColorPreset } from "./palettes";
import { KNOWN_POSES, applyPoses, applyPosesSequential, applyCombo, getCurrentPoses, getPoseCombos, createCombo, updateCombo, deleteCombo } from "./poses";
import { Scene, SceneStep, StepType, getScenes, createScene, updateScene, deleteScene, runScene, exportScene, importScene } from "./scenes";
import { getOnlineTime, getRoomTime, getRestraintTime, getRestraintItemDuration } from "./timer";
import { getNotes, saveNote, type CharacterNote } from "./notes";
import {
    getButtons,
    getSlotCount,
    saveButtons,
    normalizeHex,
    DEFAULT_BUTTONS,
    ABSOLUTE_MAX,
    parseStep,
    getCategories,
    getActiveCategoryIndex,
    setActiveCategoryIndex,
    saveCategories,
    type ActionButton,
    type ActionStyle,
    type ButtonCategory,
    resetSidebarPos,
    runSequence,
    cancelSequence,
    isSeqRunning,
    setSeqDoneCallback,
} from "./actionButtons";
import {
    releaseRestraints,
    unlockItems,
    getPlayerRestraints,
    getPlayerLockedItems,
    removePlayerSpecificItems,
    unlockPlayerSpecificItems,
} from "./restraints";
import { getBadgeEnabled, setBadgeEnabled, getShowOthersBadge, setShowOthersBadge, getShowVersionBadge, setShowVersionBadge, getShowOthersVersionBadge, setShowOthersVersionBadge, getActionButtonsVisible, setActionButtonsVisible, getAntiRestraintEnabled, setAntiRestraintEnabled, getAntiRestraintWhitelist, addToAntiRestraintWhitelist, removeFromAntiRestraintWhitelist, getAntiRestraintConfirm, setAntiRestraintConfirm, getBeepMuted, setBeepMuted, getSuppressNativeBeep, setSuppressNativeBeep, getAfkEnabled, setAfkEnabled, getAfkThreshold, setAfkThreshold, getAfkMessage, setAfkMessage, getOocEnabled, setOocEnabled, getRoomHistoryEnabled, setRoomHistoryEnabled, getRestraintLogEnabled, setRestraintLogEnabled, getPeopleMet, clearPeopleMet, PersonMet, getBadgeStyle, setBadgeStyle, getOthersBadgeStyle, setOthersBadgeStyle, type BadgeStyle, getBadgeScale, setBadgeScale, getTextBadgeScale, setTextBadgeScale, getCatBadgeScale, setCatBadgeScale, getBadgeBgOpacity, setBadgeBgOpacity, getBadgeTextOpacity, setBadgeTextOpacity, getBadgeOffsetX, setBadgeOffsetX, getBadgeOffsetY, setBadgeOffsetY, getBadgeDragMode, setBadgeDragMode, getBadgeDragStyleTarget, setBadgeDragStyleTarget, resetBadgePosition, resetCatBadgePosition, getVersionTextOffsetX, setVersionTextOffsetX, getVersionTextOffsetY, setVersionTextOffsetY, resetVersionTextPosition, isSpecialFriend, addSpecialFriend, removeSpecialFriend } from "./settings";
import { snapshotPlayerRestraints, getItemKey, getItemDisplayName } from "./antiRestraint";
import { getCurrentVisit, getVisitedHistory, clearRoomHistory, detectNewJoins } from "./roomHistory";
import { getRestraintLog, clearRestraintLog } from "./restraintLog";
import { getFriendList, getFriendStatus, getFriendTagList, setFriendTagList, FriendTag, getConversation, getBeepHistory, sendBeep, resolveName, cacheName, addBeepEntry, BeepEntry, getFriendOnlineInfo, getEBCVersion, cacheEBCVersion, isFriendPinned, togglePinFriend, stripBeepMetadata, getLastSeen, formatLastSeen, getFriendSince, syncFriendsSince, getCharacterBundle, getLockedTag, getLockedTagMembers } from "./friends";
import { isDevLogEnabled, setDevLogEnabled, getDevLog, clearDevLog, pushTestEntry } from "./devLog";
import { registerOpenBeepCallback } from "./macros";
import { callBC, syncSettings } from "./bcUtils";
import { getSafewordConfig, setSafewordConfig, isGraceActive, getGraceRemaining, endGrace } from "./safeword";
import {
    isDomEnabled,
    getDomConfig,
    addDomTarget,
    removeDomTarget,
    getRoomAddable,
    createDomSet,
    updateDomSet,
    deleteDomSet,
    parseBCCodeItems,
    type ParsedBCItem,
    applyDomSet,
    getTargetRestraints,
    removeTargetItems,
    removeAllTargetRestraints,
    unlockAllTargetItems,
    getRoomMembers,
    getRoomMemberItems,
    rescueRoomMember,
    clearLocksOnMember,
    removeItemsFromMember,
} from "./domTools";
import {
    LUCY_MEMBER, EMERY_MEMBER,
    getKittyEmotes, saveKittyEmotes,
    getKittyRestraintSets, saveKittyRestraintSets,
    getKittyPoses, saveKittyPoses,
    getKittyPunishments, saveKittyPunishments,
    getKittyReactions, saveKittyReactions,
    getKittyMood, setKittyMood,
    sendKittyCmd,
    getKittyExpressionPresets, saveKittyExpressionPresets,
    type KittyEmote, type KittyRestraintSet, type KittyPose, type KittyItem,
    type KittyPunishment, type KittyMood, type KittyExpressionPreset,
    type KittyReactionEntry,
} from "./kitty";
import {
    EXPR_GROUPS, EXPR_GROUP_LABELS,
    applyExprGroup,
    getExpressionPresets, saveExpressionPresets,
    captureCurrentExpression, applyExpressionPreset,
    getDefaultExprPresetId, setDefaultExprPresetId,
    getExpressionTriggers, saveExpressionTriggers,
    type ExpressionPreset, type ExpressionTrigger,
} from "./expressions";
import {
    getWhisperLog, getWhisperConversation, getWhisperPartners,
    clearWhisperLog, setWhisperUpdateCallback,
    type WhisperEntry,
} from "./whisperLog";
import { t, getLanguage, setLanguage, onLangChange, LANG_CODES, LANG_NAMES, LANG_LABELS } from "./i18n";

// -- Shared UI helpers ---------------------------------------------------------

function showQuickConfirm(message: string, onConfirm: () => void): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = [
        "position:fixed", "top:50%", "left:50%",
        "transform:translate(-50%,-50%)",
        "background:#130810", "border:2px solid #cf6f98",
        "border-radius:10px", "padding:16px 20px",
        "z-index:999999", "font-family:'Trebuchet MS',serif",
        "min-width:220px", "max-width:300px",
        "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
        "display:flex", "flex-direction:column", "gap:12px",
    ].join(";");

    const msg = document.createElement("div");
    msg.style.cssText = "font-size:12px;color:#f7e6ee;line-height:1.5;text-align:center;";
    msg.textContent = message;
    overlay.appendChild(msg);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #3a1928;background:#190b13;color:#7a5a6a;";
    cancelBtn.addEventListener("click", () => overlay.remove());

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = t("core.yes");
    confirmBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
    confirmBtn.addEventListener("click", () => { overlay.remove(); onConfirm(); });

    btns.appendChild(cancelBtn);
    btns.appendChild(confirmBtn);
    overlay.appendChild(btns);
    document.body.appendChild(overlay);
}

// -- Kitty reaction presets ----------------------------------------------------

// Valid BC facial expression states (verified against Female3DCG asset directories).
// Groups: Blush, Eyes, Eyes2, Mouth, Eyebrows, Fluids, Emoticon.
// "Ears" is NOT a valid CharacterSetFacialExpression group — removed.
// Empty state string → handler sends null → clears that group.
const KITTY_EXPRESSIONS = [
    // ── Blush ────────────────────────────────────────────────────
    { label: "😊 Blush — light",    cmd: "Blush:Low" },
    { label: "😊 Blush — medium",   cmd: "Blush:Medium" },
    { label: "😳 Blush — high",     cmd: "Blush:High" },
    { label: "🔥 Blush — extreme",  cmd: "Blush:Extreme" },
    { label: "× Blush — clear",     cmd: "Blush:" },
    // ── Eyes ─────────────────────────────────────────────────────
    { label: "😌 Eyes — closed",    cmd: "Eyes:Closed" },
    { label: "😳 Eyes — shy",       cmd: "Eyes:Shy" },
    { label: "😢 Eyes — sad",       cmd: "Eyes:Sad" },
    { label: "😱 Eyes — surprised", cmd: "Eyes:Surprised" },
    { label: "😡 Eyes — angry",     cmd: "Eyes:Angry" },
    { label: "😵 Eyes — dazed",     cmd: "Eyes:Dazed" },
    { label: "💕 Eyes — heart",     cmd: "Eyes:Heart" },
    { label: "😍 Eyes — lewd",      cmd: "Eyes:Lewd" },
    { label: "× Eyes — clear",      cmd: "Eyes:" },
    // ── Mouth ────────────────────────────────────────────────────
    { label: "😊 Mouth — happy",    cmd: "Mouth:Happy" },
    { label: "😢 Mouth — sad",      cmd: "Mouth:Sad" },
    { label: "😤 Mouth — pout",     cmd: "Mouth:Pout" },
    { label: "😠 Mouth — angry",    cmd: "Mouth:Angry" },
    { label: "😩 Mouth — moan",     cmd: "Mouth:Moan" },
    { label: "😈 Mouth — devious",  cmd: "Mouth:Devious" },
    { label: "😬 Mouth — grin",     cmd: "Mouth:Grin" },
    { label: "😋 Mouth — smirk",    cmd: "Mouth:Smirk" },
    { label: "× Mouth — clear",     cmd: "Mouth:" },
    // ── Eyebrows ─────────────────────────────────────────────────
    { label: "🤨 Brow — raised",    cmd: "Eyebrows:Raised" },
    { label: "😤 Brow — harsh",     cmd: "Eyebrows:Harsh" },
    { label: "😡 Brow — angry",     cmd: "Eyebrows:Angry" },
    { label: "😊 Brow — soft",      cmd: "Eyebrows:Soft" },
    { label: "× Brow — clear",      cmd: "Eyebrows:" },
];

const KITTY_REACTION_POSES = [
    { label: "— None —",       poses: [] as string[] },
    { label: "🙏 Kneel",       poses: ["Kneel"] },
    { label: "🐱 All fours",   poses: ["AllFours"] },
    { label: "🙌 Hands up",    poses: ["OverTheHead"] },
];


function getGroupAssets(group: string): string[] {
    try {
        const w = window as unknown as Record<string, unknown>;
        const bcAssets = w.Asset as Array<{ Name?: string; Group?: { Name?: string; Family?: string } }> | undefined;
        if (!Array.isArray(bcAssets)) return [];
        const family = (Player as unknown as Record<string, unknown>).AssetFamily as string | undefined;
        return bcAssets
            .filter(a => a?.Group?.Name === group && (!family || !a.Group?.Family || a.Group.Family === family))
            .map(a => a.Name)
            .filter((n): n is string => !!n)
            .sort();
    } catch { return []; }
}

// -- Slow Leave preset storage -------------------------------------------------

const SLOW_LEAVE_PRESET_DEFAULTS = [
    { label: "Classic", seq: "*smiles and gives a little wave~@{DUR}|*slowly heads for the door...@0|leaveroom" },
    { label: "Warm",    seq: "*gives everyone a warm hug before leaving~@{DUR}|*heads for the door with a soft smile~@0|leaveroom" },
    { label: "Quiet",   seq: "*quietly slips toward the door...@{DUR}|leaveroom" },
    { label: "Sleepy",  seq: "*yawns softly and stretches~@{DUR}|*pads sleepily toward the door...@0|leaveroom" },
    { label: "Playful", seq: "*bounces happily and waves her tail~@{DUR}|*skips her way out the door~@0|leaveroom" },
    { label: "Bratty",  seq: "*stretches dramatically and rolls her eyes~ Fine, leaving. Don't miss me too much.@{DUR}|*saunters out without a single look back~@0|leaveroom" },
    { label: "Custom",  seq: "*waves and heads for the door~@{DUR}|leaveroom" },
];

function getSlowLeavePresets(): Array<{ label: string; seq: string }> {
    try {
        const raw = localStorage.getItem("EBC_slowLeavePresets");
        if (raw) {
            const parsed = JSON.parse(raw) as Array<{ label: string; seq: string }>;
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Additive migration: append any new defaults not yet in the stored list
                for (const def of SLOW_LEAVE_PRESET_DEFAULTS) {
                    if (!parsed.find(p => p.label === def.label)) parsed.push({ ...def });
                }
                return parsed;
            }
        }
    } catch { /* ignore */ }
    return SLOW_LEAVE_PRESET_DEFAULTS.map(p => ({ ...p }));
}

function saveSlowLeavePresets(v: Array<{ label: string; seq: string }>): void {
    try { localStorage.setItem("EBC_slowLeavePresets", JSON.stringify(v)); } catch { /* ignore */ }
}

// -- Icon ----------------------------------------------------------------------


const TAB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 90 90">'
    + '<rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>'
    + '<path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>'
    + '<circle cx="34" cy="43" r="4" fill="#f7e6ee"/>'
    + '<circle cx="56" cy="43" r="4" fill="#f7e6ee"/>'
    + '<path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + '</svg>';

// -- Panel opacity (persisted to localStorage) --------------------------------

const PANEL_OPACITY_KEY = "EBC_panelOpacity";

// ── Touch / phone mode ─────────────────────────────────────────────────────
// Auto-detected via pointer media query; can be forced on in the DEV tab for
// desktop preview. When active, a data-touch attribute is placed on the panel
// container and CSS !important overrides raise all tap target sizes.

const TOUCH_MODE_FORCE_KEY = "EBC_forceTouchMode";

function isTouchDevice(): boolean {
    try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
}

function getForceTouchMode(): boolean {
    try { return localStorage.getItem(TOUCH_MODE_FORCE_KEY) === "1"; } catch { return false; }
}

function setForceTouchMode(v: boolean): void {
    try { localStorage.setItem(TOUCH_MODE_FORCE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
}

function isTouchModeActive(): boolean {
    return isTouchDevice() || getForceTouchMode();
}

function applyTouchMode(panelEl: HTMLElement): void {
    if (isTouchModeActive()) panelEl.setAttribute("data-touch", "");
    else panelEl.removeAttribute("data-touch");
}

function loadPanelOpacity(): number {
    try {
        const v = parseFloat(localStorage.getItem(PANEL_OPACITY_KEY) ?? "1");
        return isNaN(v) ? 1 : Math.max(0.1, Math.min(1, v));
    } catch { return 1; }
}

function savePanelOpacity(v: number): void {
    try { localStorage.setItem(PANEL_OPACITY_KEY, String(Math.round(v * 100) / 100)); } catch { /* ignore */ }
}

// -- Panel zoom (persisted to localStorage) ------------------------------------
// Scales the entire EBC panel (text, buttons, spacing — everything).
// Range: 0.6 – 2.0. Default 1.0 (matches native BC text density).

const PANEL_ZOOM_KEY = "EBC_panelZoom";

function loadPanelZoom(): number {
    try {
        const v = parseFloat(localStorage.getItem(PANEL_ZOOM_KEY) ?? "1");
        return isNaN(v) ? 1 : Math.max(0.8, Math.min(1.4, v));
    } catch { return 1; }
}

function savePanelZoom(v: number): void {
    try { localStorage.setItem(PANEL_ZOOM_KEY, String(Math.round(v * 100) / 100)); } catch { /* ignore */ }
}

// -- Styles --------------------------------------------------------------------

const CSS = `
/*
 * Root anchor: zero-width fixed point at the right edge of the chat log.
 * The tab hangs to its left (always visible). The panel slides out to its right.
 * This means the tab is NEVER caught by the panel's transform and never disappears.
 */
#emerybc-root {
    position: fixed;
    z-index: 99;
    width: 0;
    pointer-events: none;
}

/* Tab - always visible, hangs left of the anchor */
#ebc-tab {
    pointer-events: auto;
    width: 44px;
    height: 44px;
    background: #2a1421;
    border: 1px solid #cf6f9833;
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: grab;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.5);
    position: absolute;
    left: -44px;
    top: 58px;
    transition: background 0.18s;
}

#ebc-tab:hover { background: #4c2537f7; }
#ebc-tab:active { cursor: grabbing; }

#ebc-tab-unread-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 10px;
    height: 10px;
    background: #cf6f98;
    border-radius: 50%;
    border: 1.5px solid #130810;
    box-shadow: 0 0 6px #cf6f98;
    pointer-events: none;
    animation: ebc-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes ebc-dot-pulse {
    0%, 100% { box-shadow: 0 0 4px #cf6f98; transform: scale(1); }
    50%       { box-shadow: 0 0 10px #e890b8, 0 0 18px #cf6f9855; transform: scale(1.25); }
}

@keyframes ebc-gradient-flow {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* Toast notification */
.ebc-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    min-width: 220px;
    max-width: 300px;
    background: #130810;
    border: 1.5px solid #cf6f98;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.85), 0 0 12px #cf6f9840;
    font-family: "Trebuchet MS", serif;
    z-index: 1000000;
    overflow: hidden;
    cursor: pointer;
    animation: ebc-toast-in 0.22s ease-out;
    transition: opacity 0.3s, transform 0.3s;
}
.ebc-toast.ebc-toast-out {
    opacity: 0;
    transform: translateX(30px);
}
@keyframes ebc-toast-in {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
}
.ebc-toast-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px 5px;
    background: #1e0d1a;
    border-bottom: 1px solid #3a1928;
}
.ebc-toast-icon { font-size: 13px; flex-shrink: 0; }
.ebc-toast-name {
    flex: 1;
    font-size: 11px;
    font-weight: bold;
    color: #cf6f98;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ebc-toast-body {
    padding: 6px 12px 9px;
    font-size: 10px;
    color: #d0a8b8;
    line-height: 1.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* When panel is closed, slide the tab right so only ~10px overlaps the BC
   game canvas. The icon is still fully visible (it's mostly over the chat-log
   column), and the hit area is almost entirely out of the canvas. */
#ebc-tab.ebc-tab-closed {
    left: -10px;
    cursor: pointer;
}
/* Outside chatrooms (roaming mode) the root sits at right:0 so there is no
   chat-log column to overlap — keep the tab fully visible at all times. */
#emerybc-root.ebc-roaming #ebc-tab,
#emerybc-root.ebc-roaming #ebc-tab.ebc-tab-closed {
    left: -44px;
    cursor: pointer;
}

/* Sliding panel - only this element transforms, not the tab */
#emerybc-panel {
    position: absolute;
    right: 44px;   /* leave the 44px tab strip uncovered — tab is to our right */
    top: 0;
    width: 390px;
    height: 100%;  /* full chat log height — no vertical conflict with tab */
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1),
                opacity   0.35s cubic-bezier(0.25, 1, 0.5, 1),
                visibility 0.35s;
    will-change: transform, opacity;
    pointer-events: none;
}

/* +60px extra so the panel clears the 44px tab offset when closed.
   opacity+visibility mirror what CRABS does — ensures zero visual bleed
   even if the transform doesn't push every pixel off-screen. */
#emerybc-panel.ebc-closed {
    transform: translateX(calc(100% + 60px));
    opacity: 0;
    visibility: hidden;
}
#emerybc-panel.ebc-open { transform: translateX(0); opacity: 1; visibility: visible; pointer-events: auto; }

.ebc-panel {
    pointer-events: inherit; /* inherits none/auto from #emerybc-panel so closed panel passes clicks through */
    background: #1b0d17; /* fully opaque by default; opacity is applied dynamically via applyPanelOpacity() */
    border-left: 2px solid #4c2537;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-shadow: -4px 0 20px rgba(0,0,0,0.5);
}

/* Catch-all hover brightening for any button that lacks its own :hover rule */
.ebc-panel button:not([disabled]) {
    transition: filter 0.12s ease, background 0.14s, color 0.12s, border-color 0.12s, opacity 0.12s;
    touch-action: manipulation; /* prevent 300ms tap delay on tablets/phones */
}
.ebc-panel button:not([disabled]):hover  { filter: brightness(1.18); }
.ebc-panel button:not([disabled]):active { filter: brightness(0.88); transform: scale(0.97); }

/* -- Header -- */
.ebc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid #4c2537;
    background: #24111d;
    flex-shrink: 0;
    gap: 6px;
}

.ebc-title {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #cf6f98;
    letter-spacing: 0.07em;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-header-btns { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    padding: 5px 8px;
    font-size: 11px;
    line-height: 1.3;
    font-family: "Trebuchet MS", serif;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.ebc-icon-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

@keyframes ebc-spin { to { transform: rotate(360deg); } }
.ebc-icon-btn.spinning svg { animation: ebc-spin 0.6s linear; }

.ebc-move-handle {
    font-size: 14px;
    color: #cf6f98;
    opacity: 0.55;
    cursor: grab;
    line-height: 1;
    padding: 0 2px;
    user-select: none;
    transition: opacity 0.14s;
}
.ebc-move-handle:hover { opacity: 1; }
.ebc-move-handle:active { cursor: grabbing; }

/* -- Tabs -- */
.ebc-tabs {
    display: flex;
    border-bottom: 1px solid #4c2537;
    flex-shrink: 0;
}

.ebc-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #9a7888;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.01em;
    padding: 10px 2px;
    transition: color 0.14s, border-color 0.14s;
}

.ebc-tab-btn:hover { color: #b07888; }
.ebc-tab-btn.ebc-tab-active { color: #cf6f98; border-bottom-color: #cf6f98; }

/* -- Language row -- */
.ebc-lang-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 5px;
    padding: 5px 8px;
    border-bottom: 1px solid #2a1020;
    background: rgba(15, 6, 12, 0.4);
    flex-wrap: nowrap;
    overflow: hidden;
}

/* -- Body -- */
.ebc-body {
    flex: 1;
    min-height: 0; /* prevents flex children from refusing to shrink past content height */
    overflow-y: auto;
    padding: 7px;
    scrollbar-width: thin;
    scrollbar-color: #cf6f98 #1a0814;
    touch-action: pan-y; /* allow vertical touch scroll */
    overscroll-behavior: contain;
}

/* -- EBC tags strip body (scrollable, capped height so footer stays visible) -- */
.ebc-tags-body {
    max-height: 210px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: #cf6f98 #1a0814;
}

/* Unified scrollbar theme for all EBC scrollable areas */
.ebc-body::-webkit-scrollbar,
.ebc-tags-body::-webkit-scrollbar,
.ebc-beep-win-history::-webkit-scrollbar { width: 5px; }
.ebc-body::-webkit-scrollbar-track,
.ebc-tags-body::-webkit-scrollbar-track,
.ebc-beep-win-history::-webkit-scrollbar-track { background: #1a0814; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb,
.ebc-tags-body::-webkit-scrollbar-thumb,
.ebc-beep-win-history::-webkit-scrollbar-thumb { background: #cf6f98; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb:hover,
.ebc-tags-body::-webkit-scrollbar-thumb:hover,
.ebc-beep-win-history::-webkit-scrollbar-thumb:hover { background: #e890b8; }
.ebc-beep-win-history { scrollbar-width: thin; scrollbar-color: #cf6f98 #1a0814; }

/* -- Section label -- */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #c09098;
    text-transform: uppercase;
    padding: 4px 4px 5px;
}

/* -- Outfit rows -- */
.ebc-outfit-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 7px;
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    transition: border-color 0.14s;
}

.ebc-outfit-row:hover { border-color: #6b3048; }

.ebc-outfit-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ebc-outfit-name {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-outfit-cmd {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #cf6f98;
}

.ebc-wear-btn {
    flex-shrink: 0;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 5px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 9px;
    transition: background 0.14s, color 0.12s;
    white-space: nowrap;
}

.ebc-wear-btn:hover  { background: #91405f; color: #f7e6ee; }
.ebc-wear-btn:active { transform: scale(0.96); }
.ebc-wear-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ebc-update-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 5px 8px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-update-btn:hover    { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-update-btn:active   { transform: scale(0.96); }
.ebc-update-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Outfit flag chips (preserve bonds / preserve clothes) -- */
.ebc-outfit-flags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 3px;
}

.ebc-flag-chip {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid #3a1928;
    background: #1b0d17;
    color: #9a7080;
    cursor: pointer;
    white-space: nowrap;
    letter-spacing: 0.03em;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    user-select: none;
}

.ebc-flag-chip.on {
    border-color: #7a4a5e;
    color: #cf6f98;
    background: #2a1421;
}

.ebc-flag-chip:hover { border-color: #7a4a5e; color: #cf6f98; background: #2a1421; }

.ebc-outfit-del {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #9a7080;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 5px 7px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-outfit-del:hover    { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }
.ebc-outfit-del.confirm  { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 10px; }

/* -- Empty -- */
.ebc-empty {
    color: #9a7080;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    text-align: center;
    padding: 16px 6px;
    line-height: 1.7;
}

/* -- Divider -- */
.ebc-divider { height: 1px; background: #2a1421; margin: 6px 0; }

/* -- New outfit toggle -- */
.ebc-new-outfit-btn {
    width: 100%;
    background: transparent;
    border: 1px dashed #4c2537;
    border-radius: 6px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 5px 0;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    text-align: center;
}

.ebc-new-outfit-btn:hover { background: #2a1421; color: #cf6f98; border-color: #7a4a5e; border-style: solid; }

/* -- New outfit form -- */
.ebc-new-form {
    margin-top: 5px;
    display: none;
    flex-direction: column;
    gap: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    border-radius: 7px;
    padding: 7px;
}

.ebc-form-row { display: flex; align-items: center; gap: 5px; }

.ebc-form-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    white-space: nowrap;
    width: 58px;
    flex-shrink: 0;
}

.ebc-form-input {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 3px 5px;
    min-width: 0;
    outline: none;
    transition: border-color 0.14s;
}

.ebc-form-input:focus { border-color: #cf6f98; }

.ebc-form-check-row {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
}

.ebc-form-check-row input[type="checkbox"] { accent-color: #cf6f98; }

.ebc-form-check-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    cursor: pointer;
    user-select: none;
}

.ebc-create-btn {
    width: 100%;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 5px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}

.ebc-create-btn:hover    { background: #91405f; color: #f7e6ee; }
.ebc-create-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Button slot rows -- */
.ebc-slot-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 6px;
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
}

.ebc-slot-top {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-slot-bottom {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-slot-toggle {
    flex-shrink: 0;
    width: 26px;
    height: 28px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #9a7080;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-toggle.on { background: #6b3048; color: #f7e6ee; border-color: #cf6f98; }
.ebc-slot-toggle:hover { border-color: #7a4a5e; }

.ebc-slot-label {
    flex-shrink: 0;
    width: 52px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 2px 4px;
    outline: none;
    transition: border-color 0.14s;
    text-transform: uppercase;
}

.ebc-slot-label:focus { border-color: #cf6f98; }

.ebc-slot-color {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid #4c2537;
    background: transparent;
    cursor: pointer;
    padding: 1px;
}

.ebc-slot-emote {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #cf6f98;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 2px 4px;
    outline: none;
    min-width: 0;
    transition: border-color 0.14s;
}

.ebc-slot-emote:focus { border-color: #cf6f98; }

.ebc-slot-del {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #9a7080;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-del:hover   { background: #3a1017; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-del.confirm { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 9px; }

.ebc-slot-move {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #7a5060;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}
.ebc-slot-move:hover:not(:disabled) { background: #2a1020; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-move:disabled { opacity: 0.25; cursor: default; }

.ebc-slot-style {
    flex-shrink: 0;
    width: 32px;
    height: 28px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #9a7080;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.03em;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-slot-style.emote { background: #1b1117; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-style:hover  { border-color: #7a4a5e; color: #967281; }

.ebc-slot-seq-badge {
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #7aba55;
    padding: 0 3px;
    user-select: none;
    pointer-events: none;
}

/* -- Buttons tab footer -- */
.ebc-btn-footer {
    display: flex;
    gap: 5px;
    margin-top: 6px;
}

.ebc-btn-footer-btn {
    flex: 1;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 5px 0;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-btn-footer-btn:hover { background: #2a1421; color: #cf6f98; border-color: #7a4a5e; }
.ebc-btn-footer-btn.save  { border-color: #91405f; color: #cf6f98; }
.ebc-btn-footer-btn.save:hover { background: #91405f; color: #f7e6ee; }
.ebc-btn-footer-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ebc-btn-footer-btn.confirm  { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }

/* -- Import panel (buttons tab) -- */
.ebc-import-panel {
    display: none;
    margin-top: 4px;
    flex-direction: column;
    gap: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    border-radius: 7px;
    padding: 7px;
}

.ebc-import-panel.open { display: flex; }

.ebc-import-hint {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
}

.ebc-import-error {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #ff6b6b;
    min-height: 14px;
    word-break: break-word;
}

/* -- Notes tab -- */
.ebc-notes-person {
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    overflow: hidden;
    transition: border-color 0.14s;
}

.ebc-notes-person:hover { border-color: #6b3048; }

.ebc-notes-person-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 7px;
    cursor: pointer;
    user-select: none;
}

.ebc-notes-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #3a1928;
    transition: background 0.14s;
}

.ebc-notes-dot.has-note { background: #cf6f98; }

.ebc-notes-person-name {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #f7e6ee;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-notes-member-num {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #8a6878;
    flex-shrink: 0;
}

.ebc-notes-editor {
    display: none;
    padding: 0 7px 7px;
    flex-direction: column;
    gap: 4px;
}

.ebc-notes-editor.open { display: flex; }

.ebc-notes-textarea {
    width: 100%;
    box-sizing: border-box;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 4px 5px;
    resize: vertical;
    min-height: 58px;
    outline: none;
    transition: border-color 0.14s;
}

.ebc-notes-textarea:focus { border-color: #cf6f98; }

.ebc-notes-save-hint {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #9a7080;
    text-align: right;
}


/* -- Edit button (pencil) -- */
.ebc-edit-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #9a7080;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 7px;
    line-height: 1;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-edit-btn:hover,
.ebc-edit-btn.open { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }

/* -- Inline edit panel -- */
.ebc-edit-panel {
    display: none;
    padding: 6px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 5px;
}

.ebc-edit-panel.open { display: flex; }

/* -- Appearance diff -- */
.ebc-diff-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #9a7080;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 5px 7px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-diff-btn:hover,
.ebc-diff-btn.open { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }

.ebc-diff-panel {
    display: none;
    padding: 5px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 2px;
}

.ebc-diff-panel.open { display: flex; }

.ebc-diff-item {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 1px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-diff-add    { color: #79a885; }
.ebc-diff-remove { color: #cb798c; }
.ebc-diff-change { color: #c9ab72; }
.ebc-diff-none   { color: #9a7080; font-style: italic; }

/* -- Quick actions -- */
.ebc-quick-actions {
    flex-shrink: 0;
    display: flex;
    gap: 5px;
    padding: 6px 7px;
    border-top: 1px solid #2a1421;
    border-bottom: 1px solid #2a1421;
    background: rgba(20, 8, 16, 0.7);
}

.ebc-action-btn {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 6px;
    color: #c08890;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 4px;
    text-align: center;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    line-height: 1.35;
}

.ebc-action-btn:hover    { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-action-btn:active   { transform: scale(0.97); }
.ebc-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ebc-action-btn.danger:hover { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }

/* -- Footer -- */
.ebc-footer {
    flex-shrink: 0;
    padding: 5px 8px 4px;
    border-top: 1px solid #3a1928;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #9a7888;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
}

/* -- Special Thanks tab -- */
.ebc-thanks-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 11px;
    border-radius: 9px;
    margin-bottom: 6px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    transition: border-color 0.18s;
}

.ebc-thanks-card:hover { border-color: #6b3048; }

.ebc-thanks-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #2a1421;
    border: 2px solid #4c2537;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    user-select: none;
}

.ebc-thanks-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ebc-thanks-name {
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-thanks-reason {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #c0a8b8;
    line-height: 1.4;
}

.ebc-thanks-heart {
    flex-shrink: 0;
    font-size: 16px;
    user-select: none;
}

/* Golden paw SVG icon used on Emery's credits card (same FA paw as the in-game creator badge) */
.ebc-thanks-paw-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 5px rgba(255, 200, 40, 0.65));
    animation: ebc-paw-flash 2.6s ease-in-out infinite;
}
@keyframes ebc-paw-flash {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(240, 170, 20, 0.45)); }
    50%       { filter: drop-shadow(0 0 14px rgba(255, 225, 55, 1));   }
}
.ebc-thanks-avatar-paw {
    width: 44px !important;
    height: 44px !important;
    border-color: #b07010 !important;
    background: #26180a !important;
    animation: ebc-paw-ring 2.6s ease-in-out infinite;
}
@keyframes ebc-paw-ring {
    0%, 100% { box-shadow: 0 0 6px  rgba(200, 130, 10, 0.35); border-color: #b07010; }
    50%       { box-shadow: 0 0 16px rgba(255, 200, 40, 0.85); border-color: #f0c030; }
}

.ebc-member-chip {
    display: inline-block;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #7a5a6a;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    user-select: all;
}

.ebc-cat-pill {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 5px 11px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    border: 1px solid #3a1928;
    background: transparent;
    color: #9a7080;
}
.ebc-cat-pill:hover { color: #cf6f98; border-color: #6b3048; }
.ebc-cat-pill.active {
    border-color: #cf6f98;
    background: #3a1028;
    color: #cf6f98;
}
.ebc-cat-select {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #d0a0b8;
    padding: 2px 6px;
    cursor: pointer;
    outline: none;
    flex: 1;
}
.ebc-cat-select:focus { border-color: #cf6f98; }
.ebc-cat-select-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0 4px;
}
.ebc-cat-select-label {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #9a7888;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    flex-shrink: 0;
}

.ebc-thanks-intro {
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #9a7080;
    text-align: center;
    padding: 6px 4px 10px;
    line-height: 1.6;
}

/* -- Timer strip -- */
.ebc-timer {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #e8d07a;
    letter-spacing: 0.03em;
    min-height: 13px;
}

/* -- Restraint info -- */
.ebc-restraint-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-restraint-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-restraint-group {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #a88090;
    white-space: nowrap;
}

.ebc-restraint-lock {
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #cf6f98;
    white-space: nowrap;
    text-align: right;
}

.ebc-restraint-lock.unlocked { color: #9a7888; }

.ebc-restraint-duration {
    margin-left: auto;
    font-size: 10px;
    color: #e8d07a;
    white-space: nowrap;
    flex-shrink: 0;
}

/* -- Color palettes -- */
.ebc-palette-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-palette-swatch {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
}

.ebc-palette-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.3);
}

.ebc-palette-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: transparent;
    border: none;
    outline: none;
    cursor: text;
    padding: 0;
    min-width: 0;
}

.ebc-palette-name:focus {
    border-bottom: 1px solid #cf6f98;
}

/* -- Poses tab -- */
.ebc-pose-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-bottom: 4px;
}

.ebc-pose-btn {
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 3px;
    text-align: center;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-pose-btn:hover  { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-pose-btn:active { transform: scale(0.96); }
.ebc-pose-btn.active { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

.ebc-combo-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
    transition: border-color 0.14s;
}

.ebc-combo-row:hover { border-color: #6b3048; }

.ebc-combo-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-combo-poses {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #8a6070;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
}

/* -- Combo editor (inline, below combo row) -- */
.ebc-combo-editor {
    display: none;
    padding: 6px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 3px;
}

.ebc-combo-editor.open { display: flex; }

/* Save bar at top + bottom of editor */
.ebc-editor-save-bar {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 2px 0;
}

/* -- Ordered pose step list -- */
.ebc-step-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 4px 0;
}

.ebc-step-row {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #24111d;
    border: 1px solid #3a1828;
    border-radius: 5px;
    padding: 3px 6px;
}

.ebc-step-num {
    font-size: 10px;
    font-weight: 700;
    color: #cf6f98;
    min-width: 14px;
    flex-shrink: 0;
}

.ebc-step-label {
    flex: 1;
    font-size: 11px;
    color: #e8d1dc;
    font-family: "Trebuchet MS", serif;
}

.ebc-step-delay {
    font-size: 10px;
    color: #e8d07a;
    text-align: center;
    padding: 1px 0;
    letter-spacing: 0.03em;
}

.ebc-step-move {
    background: none;
    border: 1px solid #3a1828;
    border-radius: 3px;
    color: #9a6070;
    font-size: 10px;
    padding: 4px 6px;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
}
.ebc-step-move:hover { background: #2e1525; color: #cf6f98; }

.ebc-step-del {
    background: none;
    border: none;
    color: #9a6070;
    font-size: 13px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
    flex-shrink: 0;
}
.ebc-step-del:hover { color: #cf6f98; }

/* -- Quick-add pose buttons (inside editor) -- */
.ebc-pose-add-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 3px 0;
}

.ebc-pose-add-btn {
    font-size: 10px;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid #3a1828;
    background: #1b0d17;
    color: #967281;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
}
.ebc-pose-add-btn:hover { background: #2e1525; color: #cf6f98; border-color: #cf6f98; }

.ebc-delay-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0;
}

.ebc-delay-row input[type="range"] {
    flex: 1;
    accent-color: #cf6f98;
}

.ebc-delay-val {
    font-size: 11px;
    color: #e8d07a;
    font-family: "Trebuchet MS", serif;
    min-width: 44px;
    text-align: right;
}

/* -- Scene step cards -- */
.ebc-scene-step {
    background: #1a0d14;
    border: 1px solid #3a1928;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.ebc-scene-step-header {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-scene-type-sel {
    flex: 0 0 auto;
    width: 76px;
    padding: 2px 4px;
    font-size: 11px;
    background: #130810;
    border: 1px solid #5a2840;
    border-radius: 4px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    cursor: pointer;
}

.ebc-scene-delay {
    width: 54px;
    padding: 2px 4px;
    font-size: 11px;
    text-align: right;
    background: #130810;
    border: 1px solid #5a2840;
    border-radius: 4px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
}

.ebc-scene-ms-lbl {
    font-size: 10px;
    color: #9a6878;
    flex-shrink: 0;
}

.ebc-scene-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ebc-scene-fields-row {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

/* -- Friends section -- */
.ebc-friend-wrap { margin-bottom: 3px; border: 1px solid transparent; border-radius: 5px; overflow: hidden; transition: background 0.2s, border-color 0.2s; }

.ebc-friend-row {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    padding: 5px 6px;
    border-radius: 5px;
    background: #130810;
    cursor: pointer;
    user-select: none;
}
.ebc-friend-row:hover { background: #1a0d15; }
.ebc-friend-row.pinned { border-left: 2px solid #cf6f9855; padding-left: 4px; }
.ebc-friend-row.expanded { border-radius: 5px 5px 0 0; }

.ebc-friend-expand {
    display: none;
    flex-direction: column;
    gap: 6px;
    padding: 8px 8px;
    background: #1a0c14;
    border: 1px solid #2e1525;
    border-top: none;
    border-radius: 0 0 6px 6px;
}
.ebc-friend-expand.visible { display: flex; }

.ebc-friend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.ebc-friend-dot.room   { background: #4caf50; box-shadow: 0 0 4px #4caf50aa; }
.ebc-friend-dot.online { background: #a0cf50; box-shadow: 0 0 4px #a0cf5088; }
.ebc-friend-dot.away   { background: #555; }

.ebc-friend-name {
    flex: 0 1 auto;
    min-width: 0;
    font-size: 11px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* tag chip in the friend row (display-only, coloured by tag) */
.ebc-friend-tag {
    font-family: "Trebuchet MS", serif;
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
}

/* "+N more" pill */
.ebc-friend-tag-more {
    font-family: "Trebuchet MS", serif;
    font-size: 8px;
    padding: 1px 4px;
    border-radius: 3px;
    flex-shrink: 0;
    background: #1e0d17;
    color: #7a5a6a;
    border: 1px solid #2e1520;
    cursor: default;
}

/* tag tooltip (fixed-position, pointer-events: none) */
.ebc-tag-tooltip {
    position: fixed;
    z-index: 1000001;
    background: #190b13;
    border: 1px solid #4a2035;
    border-radius: 7px;
    padding: 7px 9px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: 200px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.8);
    pointer-events: none;
}

/* tag chip inside the expand panel — larger, with remove button */
.ebc-etag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 2px 4px 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    white-space: nowrap;
}

.ebc-etag-chip-remove {
    background: none;
    border: none;
    padding: 0 1px;
    cursor: pointer;
    font-size: 9px;
    line-height: 1;
    opacity: 0.6;
}
.ebc-etag-chip-remove:hover { opacity: 1; }

/* color swatch circle */
.ebc-color-swatch {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    border: 2px solid transparent;
    box-sizing: border-box;
    transition: border-color 0.1s;
}
.ebc-color-swatch.sel { border-color: #fff; }

/* -- Custom HSV colour picker (Colours tab) -- */
.ebc-mycolors-label {
    font-family: 'Trebuchet MS', serif;
    font-size: 9px;
    font-weight: 700;
    color: #7a5060;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 5px;
}
/* picker outer shell */
.ebc-cpicker {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #0d060c;
    border: 1px solid #3a1928;
    border-radius: 8px;
    padding: 9px;
    margin-bottom: 7px;
    user-select: none;
}
/* SV gradient box */
.ebc-cpicker-sv {
    position: relative;
    width: 100%;
    height: 130px;
    border-radius: 6px;
    cursor: crosshair;
    overflow: hidden;
    flex-shrink: 0;
    touch-action: none;
}
.ebc-cpicker-sv-hue,
.ebc-cpicker-sv-white,
.ebc-cpicker-sv-black { position: absolute; inset: 0; }
.ebc-cpicker-sv-white { background: linear-gradient(to right, #fff, transparent); }
.ebc-cpicker-sv-black { background: linear-gradient(to bottom, transparent, #000); }
/* SV drag cursor */
.ebc-cpicker-sv-dot {
    position: absolute;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1.5px rgba(0,0,0,0.55), 0 1px 5px rgba(0,0,0,0.6);
    transform: translate(-50%, -50%);
    pointer-events: none;
}
/* Hue slider */
.ebc-cpicker-hue {
    position: relative;
    width: 100%;
    height: 14px;
    border-radius: 7px;
    background: linear-gradient(to right,
        #f00, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00);
    cursor: pointer;
    flex-shrink: 0;
    touch-action: none;
}
/* Hue thumb */
.ebc-cpicker-hue-thumb {
    position: absolute;
    top: 50%;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2.5px solid #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}
/* Bottom row: preview + hex + save */
.ebc-cpicker-btm {
    display: flex;
    align-items: center;
    gap: 7px;
}
.ebc-cpicker-preview {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.15);
    display: block;
}
.ebc-cpicker-hex {
    flex: 1;
    min-width: 0;
    font-size: 11px !important;
    font-family: 'Courier New', monospace !important;
    letter-spacing: 0.5px;
}
/* Saved swatches grid */
.ebc-swatch-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
    min-height: 16px;
}
.ebc-cswatch {
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    border: 2px solid transparent;
    box-sizing: border-box;
    transition: border-color 0.12s, transform 0.1s;
}
.ebc-cswatch:hover { transform: scale(1.1); }
.ebc-cswatch.sel {
    border-color: #fff;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.25);
}
.ebc-cswatch-rm {
    position: absolute;
    top: -5px;
    right: -5px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #130810;
    border: 1px solid #cf6f98;
    color: #cf6f98;
    font-size: 9px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
    z-index: 1;
}
/* -- Outfit tags -- */
.ebc-outfit-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 3px;
}
.ebc-tag-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 20px;
    font-family: 'Trebuchet MS', serif;
    font-size: 8px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.55);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 3px rgba(0,0,0,0.3);
    flex-shrink: 0;
    white-space: nowrap;
    cursor: default;
    user-select: none;
}
/* reorder ▲▼ column */
.ebc-reorder-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
    justify-content: center;
}
.ebc-reorder-btn {
    background: transparent;
    border: 1px solid #3a1928;
    border-radius: 3px;
    color: #7a5060;
    cursor: pointer;
    font-size: 9px;
    line-height: 1;
    padding: 4px 7px;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.ebc-reorder-btn:hover { background: #2a1421; color: #cf6f98; border-color: #cf6f98; }
.ebc-reorder-btn:disabled { opacity: 0.2; cursor: default; pointer-events: none; }
/* -- Zone rows inside restraint expand panels -- */
.ebc-zone-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 0;
}
.ebc-zone-picker {
    width: 22px;
    height: 22px;
    border: 1px solid #3a1928;
    border-radius: 4px;
    background: none;
    cursor: pointer;
    padding: 1px;
    flex-shrink: 0;
    box-sizing: border-box;
}
.ebc-zone-dot {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer;
    transition: transform 0.1s;
}
.ebc-zone-dot:hover { transform: scale(1.15); }
.ebc-zone-hex {
    font-family: 'Courier New', monospace;
    font-size: 8px;
    color: #c48aa8;
    flex-shrink: 0;
    width: 56px;
    letter-spacing: 0.3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ebc-zone-label {
    font-family: 'Trebuchet MS', serif;
    font-size: 9px;
    color: #9a7080;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ebc-zone-set {
    padding: 4px 7px !important;
    font-size: 8px !important;
    flex-shrink: 0;
}

.ebc-friend-btn {
    background: #2a0e1e;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #cf6f98;
    font-size: 13px;
    padding: 4px 7px;
    cursor: pointer;
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, border-color 0.12s;
}
.ebc-friend-btn:hover { background: #3a1428; border-color: #cf6f98; }

/* -- Beep window -- */
.ebc-beep-win {
    position: fixed;
    width: 300px;
    height: 380px;
    background: rgba(19,8,16,0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 2px solid #cf6f98;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    z-index: 999998;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    font-family: "Trebuchet MS", serif;
    bottom: 80px;
    right: 340px;
    overflow: hidden;
}

.ebc-beep-win-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px 6px;
    background: rgba(30,13,26,0.58);
    border-bottom: 1px solid #3a1928;
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
}
.ebc-beep-win-header:active { cursor: grabbing; }

.ebc-beep-win-title {
    flex: 1;
    font-size: 11px;
    font-weight: bold;
    color: #cf6f98;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-beep-win-hbtn {
    background: rgba(42,14,30,0.58);
    border: 1px solid #4a2035;
    border-radius: 5px;
    color: #9a6878;
    font-size: 13px;
    cursor: pointer;
    line-height: 1;
    padding: 5px 8px;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.ebc-beep-win-hbtn:hover { background: rgba(58,16,40,0.90); color: #cf6f98; border-color: #cf6f98; }
.ebc-beep-win-close.ebc-beep-win-hbtn:hover { background: rgba(74,16,32,0.90); color: #ff6080; border-color: #ff6080; }
.ebc-beep-win-mute.muted { color: #4a2a38; border-color: #3a1928; }

.ebc-beep-win-history {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 4px;
}

.ebc-beep-msg {
    font-size: 10px;
    line-height: 1.5;
    padding: 4px 7px;
    border-radius: 6px;
    max-width: 85%;
    word-break: break-word;
}
.ebc-beep-msg.sent {
    align-self: flex-end;
    background: rgba(58,16,40,0.60);
    color: #f0c8d8;
    border-bottom-right-radius: 2px;
}
.ebc-beep-msg.received {
    align-self: flex-start;
    background: rgba(30,13,26,0.58);
    color: #e0c0cc;
    border: 1px solid #3a1928;
    border-bottom-left-radius: 2px;
}
.ebc-beep-ts {
    font-size: 9px;
    color: #7a5a6a;
    margin-bottom: 1px;
}
.ebc-beep-msg.sent .ebc-beep-ts { text-align: right; }

.ebc-beep-win-footer {
    display: flex;
    gap: 5px;
    padding: 7px 8px;
    border-top: 1px solid #3a1928;
    flex-shrink: 0;
}

.ebc-beep-win-input {
    flex: 1;
    background: rgba(30,13,26,0.58);
    border: 1px solid #5a2840;
    border-radius: 5px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 4px 7px;
    outline: none;
}
.ebc-beep-win-input:focus { border-color: #cf6f98; }

.ebc-beep-win-send {
    background: #3a1028;
    border: 1px solid #cf6f98;
    border-radius: 5px;
    color: #cf6f98;
    font-size: 11px;
    font-family: "Trebuchet MS", serif;
    padding: 4px 10px;
    cursor: pointer;
    flex-shrink: 0;
}
.ebc-beep-win-send:hover { background: #cf6f98; color: #fff; }

.ebc-beep-win.minimized {
    height: 44px !important;
    min-height: 0;
    overflow: hidden;
    resize: none;
}
.ebc-beep-win.minimized .ebc-beep-win-header {
    background: transparent; /* let the outer window rgba show through instead of stacking */
}
.ebc-beep-win.minimized .ebc-beep-win-history,
.ebc-beep-win.minimized .ebc-beep-reply-bar,
.ebc-beep-win.minimized .ebc-beep-win-footer { display: none !important; }


.ebc-beep-win-unread-dot {
    width: 8px;
    height: 8px;
    background: #cf6f98;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 4px #cf6f98;
    display: none;
}
.ebc-beep-win-unread-dot.visible { display: block; }

/* -- Messages dropdown cards (inside USERS tab) ----------------------------- */
.ebc-inbox-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid #221218;
    background: #110810;
    margin-bottom: 4px;
    transition: background 0.12s, border-color 0.12s;
    cursor: pointer;
}
.ebc-inbox-card:hover      { background: #1e0e18; border-color: #4c2537; }
.ebc-inbox-card.unread     { border-color: #3a1a28; background: #1c0c16; }
.ebc-inbox-card.unread:hover { background: #2a1020; border-color: #cf6f98; }

.ebc-beep-reply-bar {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #2a0e1e;
    border-top: 1px solid #4a2035;
    border-left: 3px solid #cf6f98;
    padding: 4px 8px;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #c88aa8;
    flex-shrink: 0;
}
.ebc-beep-reply-bar span {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.ebc-beep-reply-cancel {
    background: none;
    border: none;
    color: #7a5a6a;
    cursor: pointer;
    font-size: 11px;
    padding: 0 2px;
    flex-shrink: 0;
}
.ebc-beep-reply-cancel:hover { color: #cf6f98; }

.ebc-beep-quote {
    border-left: 2px solid #cf6f9880;
    padding: 2px 5px;
    margin-bottom: 3px;
    font-size: 9px;
    color: #8a5a78;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}
.ebc-beep-img {
    max-width: 100%;
    max-height: 160px;
    border-radius: 4px;
    margin-top: 3px;
    display: block;
    cursor: pointer;
}
.ebc-beep-reply-btn {
    background: none;
    border: none;
    color: #5a3a4a;
    cursor: pointer;
    font-size: 9px;
    padding: 4px 6px;
    border-radius: 3px;
    margin-top: 2px;
    align-self: flex-end;
}
.ebc-beep-reply-btn:hover { color: #cf6f98; background: #2a0e1e; }

.ebc-beep-room-pill {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #a08098;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
    line-height: 1.3;
}

.ebc-emoji-btn {
    background: #2a0e1e;
    border: 1px solid #4a2035;
    border-radius: 5px;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 7px;
    flex-shrink: 0;
    line-height: 1;
    transition: background 0.12s, border-color 0.12s;
}
.ebc-emoji-btn:hover { background: #3a1028; border-color: #cf6f98; }

.ebc-emoji-picker {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: #1e0d1a;
    border: 1px solid #5a2840;
    border-radius: 8px;
    padding: 6px;
    flex-wrap: wrap;
    gap: 2px;
    width: 206px;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.6);
    z-index: 10001;
}
.ebc-emoji-picker button {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 3px 4px;
    border-radius: 4px;
    transition: background 0.1s;
    line-height: 1;
}
.ebc-emoji-picker button:hover { background: #3a1028 !important; filter: none !important; }

/* -- Free-float panel mode -- */
#emerybc-panel.ebc-free-mode {
    position: fixed !important;
    right: auto !important;
    top: auto;           /* no !important — inline style.top must win during drag */
    height: min(80vh, 650px) !important;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    transition: opacity 0.18s !important;
    transform: none !important;
}
#emerybc-panel.ebc-free-mode.ebc-closed {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transform: none !important;
}
#emerybc-panel.ebc-free-mode.ebc-open {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transform: none !important;
}
.ebc-free-mode .ebc-header {
    cursor: grab;
    border-radius: 8px 8px 0 0;
}
.ebc-free-mode .ebc-header:active { cursor: grabbing; }
.ebc-reset-loc-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    padding: 5px 10px;
    font-size: 10px;
    font-family: "Trebuchet MS", serif;
    white-space: nowrap;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.ebc-reset-loc-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }


/* -- Schedule rows (inside outfits tab) -- */
.ebc-schedule-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-schedule-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-schedule-time {
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #e8d07a;
    white-space: nowrap;
    flex-shrink: 0;
}

/* -- Seq step builder -- */
.ebc-seq-builder {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 3px;
    padding: 5px;
    background: rgba(27, 13, 23, 0.7);
    border: 1px solid #3a1928;
    border-radius: 5px;
}

.ebc-seq-step-row {
    display: flex;
    align-items: center;
    gap: 3px;
}

.ebc-seq-type-select {
    flex-shrink: 0;
    width: 80px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #cf6f98;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 2px 3px;
    outline: none;
}

.ebc-seq-text-inp {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 2px 4px;
    outline: none;
    min-width: 0;
}

.ebc-seq-delay-inp {
    flex-shrink: 0;
    width: 50px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #e8d07a;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 2px 3px;
    outline: none;
    text-align: center;
}

.ebc-seq-step-del {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: #9a7080;
    font-size: 13px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
}
.ebc-seq-step-del:hover { color: #cf6f98; }

.ebc-seq-add-btn {
    width: 100%;
    background: transparent;
    border: 1px dashed #4c2537;
    border-radius: 4px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 6px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}
.ebc-seq-add-btn:hover { background: #1b0d17; color: #cf6f98; border-style: solid; }

/* -- Expression tab -- */
.ebc-expr-group-hdr {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    color: #9a7080;
    margin: 10px 0 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.ebc-expr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 2px;
}
.ebc-expr-chip {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 3px 7px;
    border-radius: 4px;
    border: 1px solid #3a1928;
    background: #1b0d17;
    color: #8a6070;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}
.ebc-expr-chip:hover { background: #2a1421; color: #cf6f98; border-color: #6a3a50; }
.ebc-expr-chip.active { background: #3a1428; color: #e890b8; border-color: #9a4a68; font-weight: bold; }
.ebc-expr-preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 6px;
}
.ebc-expr-preset-item {
    display: flex;
    align-items: center;
    gap: 3px;
}
.ebc-expr-preset-chip {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    padding: 4px 9px;
    border-radius: 5px;
    border: 1px solid #5a2840;
    background: #2a1421;
    color: #cf6f98;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
}
.ebc-expr-preset-chip:hover { background: #3a1e30; border-color: #9a4a68; }

/* -- Whisper log tab -- */
.ebc-whisper-partner-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 6px 9px;
    border-radius: 6px;
    border: 1px solid #3a1928;
    background: #1b0d17;
    color: #b09098;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    cursor: pointer;
    margin-bottom: 4px;
    transition: background 0.12s, border-color 0.12s;
    text-align: left;
}
.ebc-whisper-partner-btn:hover { background: #2a1421; border-color: #5a2840; color: #cf6f98; }
.ebc-whisper-partner-btn.active { background: #2a1421; border-color: #7a3858; color: #e890b8; }
.ebc-whisper-msg {
    display: flex;
    flex-direction: column;
    padding: 4px 8px;
    border-radius: 5px;
    margin-bottom: 3px;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    line-height: 1.4;
}
.ebc-whisper-msg.out {
    background: #2a1830;
    border-left: 2px solid #9a4a78;
    align-items: flex-end;
}
.ebc-whisper-msg.in {
    background: #1f1020;
    border-left: 2px solid #4a2060;
    align-items: flex-start;
}
.ebc-whisper-meta {
    font-size: 8px;
    color: #6a4a5e;
    margin-bottom: 2px;
}
.ebc-whisper-text { color: #d0a0b8; word-break: break-word; }
.ebc-whisper-msg.out .ebc-whisper-text { color: #e8b0d0; }

/* ── Touch / phone mode ─────────────────────────────────────────────────── */
/* Applied when #emerybc-panel has [data-touch] — auto on coarse-pointer     */
/* devices (phones/tablets), or force-enabled from the DEV → Drawer Prefs.  */
/* All rules use !important so they beat the inline cssText on lang pills    */
/* and other elements that set styles programmatically.                      */

#emerybc-panel[data-touch] .ebc-tab-btn {
    font-size: 13px !important;
    padding: 14px 4px !important;
    min-height: 48px !important;
}

#emerybc-panel[data-touch] .ebc-icon-btn {
    font-size: 13px !important;
    padding: 9px 12px !important;
    min-height: 38px !important;
    min-width: 38px !important;
}

#emerybc-panel[data-touch] .ebc-action-btn {
    font-size: 12px !important;
    padding: 10px 6px !important;
    min-height: 44px !important;
}

#emerybc-panel[data-touch] .ebc-quick-actions {
    padding: 8px 9px !important;
    gap: 7px !important;
}

#emerybc-panel[data-touch] .ebc-outfit-del {
    font-size: 15px !important;
    padding: 9px 10px !important;
    min-height: 38px !important;
    min-width: 38px !important;
}

#emerybc-panel[data-touch] .ebc-form-input {
    font-size: 13px !important;
    padding: 8px 10px !important;
    min-height: 38px !important;
}

#emerybc-panel[data-touch] .ebc-lang-pill {
    font-size: 13px !important;
    padding: 9px 16px !important;
    min-height: 38px !important;
}

#emerybc-panel[data-touch] .ebc-header {
    padding: 9px 12px !important;
}

#emerybc-panel[data-touch] .ebc-title {
    font-size: 14px !important;
}

#emerybc-panel[data-touch] .ebc-tabs {
    gap: 0 !important;
}

#emerybc-panel[data-touch] .ebc-body {
    padding: 10px !important;
}

#emerybc-panel[data-touch] .ebc-section-label {
    font-size: 12px !important;
    padding: 6px 4px 8px !important;
}

#emerybc-panel[data-touch] .ebc-footer {
    font-size: 12px !important;
    padding: 8px 10px 7px !important;
}

/* Prevent tap highlight flash on iOS */
#emerybc-panel[data-touch] button,
#emerybc-panel[data-touch] input,
#emerybc-panel[data-touch] select {
    -webkit-tap-highlight-color: transparent;
}

/* ── Interactive guide — floating side panel ────────────────────────── */
/* Detached from the main panel so the full menu stays visible while reading. */
.ebc-guide-side {
    position: fixed;
    width: 240px;
    background: #170810;
    border: 2px solid #cf6f98;
    border-left: 4px solid #cf6f98;
    border-radius: 10px;
    padding: 11px 13px 10px;
    box-shadow: 0 6px 32px rgba(0,0,0,0.9), 0 0 0 1px rgba(207,111,152,0.12);
    z-index: 10010;
    font-family: "Trebuchet MS", serif;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: ebc-guide-in 0.18s ease;
}
@keyframes ebc-guide-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
.ebc-guide-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.ebc-guide-step-lbl {
    font-size: 9px;
    letter-spacing: 0.6px;
    color: #8a5870;
    text-transform: uppercase;
}
.ebc-guide-close-btn {
    background: none;
    border: none;
    color: #7a5a6a;
    font-size: 13px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
}
.ebc-guide-close-btn:hover { color: #cf6f98; }
.ebc-guide-tab-lbl {
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.5px;
    color: #f0a0c8;
    border-bottom: 1px solid #3a1428;
    padding-bottom: 5px;
    margin-bottom: 1px;
}
.ebc-guide-text {
    font-size: 11px;
    color: #e0c8d8;
    line-height: 1.65;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 3px;
}
.ebc-guide-text::-webkit-scrollbar { width: 3px; }
.ebc-guide-text::-webkit-scrollbar-track { background: transparent; }
.ebc-guide-text::-webkit-scrollbar-thumb { background: #4c2537; border-radius: 2px; }
/* Spotlight: pulsing outline placed on UI elements the guide is currently describing */
@keyframes ebc-guide-spot-pulse {
    0%,100% { box-shadow: 0 0 0 2px rgba(207,111,152,0.2), 0 0 0px rgba(207,111,152,0); }
    50%     { box-shadow: 0 0 0 3px rgba(207,111,152,0.7), 0 0 14px rgba(207,111,152,0.3); }
}
.ebc-guide-spotlight {
    outline: 2px solid rgba(207,111,152,0.85) !important;
    outline-offset: 2px;
    border-radius: 4px;
    animation: ebc-guide-spot-pulse 1.5s ease-in-out infinite;
    position: relative;
    z-index: 2;
}
.ebc-guide-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 3px;
}
.ebc-guide-nav-btn {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 14px;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid #5a2038;
    background: #2e1020;
    color: #f0a0c8;
    transition: background 0.12s, border-color 0.12s;
}
.ebc-guide-nav-btn:hover { background: #3d1530; border-color: #cf6f98; }
.ebc-guide-nav-btn:disabled { opacity: 0.25; cursor: default; }
.ebc-guide-dots {
    display: flex;
    gap: 5px;
    align-items: center;
}
.ebc-guide-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3a1928;
    transition: background 0.15s, transform 0.15s;
}
.ebc-guide-dot.active { background: #cf6f98; transform: scale(1.3); }
.ebc-guide-btn {
    background: none;
    border: 1px solid #3a1928;
    border-radius: 4px;
    color: #9a7888;
    font-size: 11px;
    padding: 3px 7px;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    transition: border-color 0.12s, color 0.12s;
}
.ebc-guide-btn:hover { border-color: #cf6f98; color: #cf6f98; }
/* Highlighted keyword chips — the main teaching tool */
.ebc-guide-hl {
    display: inline-block;
    background: #b84878;
    border: 1px solid #e888b8;
    border-radius: 4px;
    padding: 1px 7px;
    color: #fff0f8;
    font-weight: bold;
    font-size: 10px;
    white-space: nowrap;
    vertical-align: middle;
    line-height: 1.7;
    box-shadow: 0 0 8px rgba(207,111,152,0.55), inset 0 1px 0 rgba(255,200,228,0.15);
}
.ebc-guide-note {
    display: block;
    margin-top: 4px;
    font-size: 9.5px;
    color: #9a7888;
    font-style: italic;
    line-height: 1.5;
    border-left: 2px solid #3a1428;
    padding-left: 6px;
}

`;


// ── Generic confirm overlay ───────────────────────────────────────────────
// Same style as the anti-restraint escape prompt. Used for any destructive
// action that needs a "are you sure?" before proceeding.
export function showConfirmOverlay(
    message: string,
    cancelLabel: string,
    confirmLabel: string,
    onConfirm: () => void,
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

    const msg = document.createElement("div");
    msg.style.cssText = "font-size:12px;color:#cf6f98;line-height:1.55;";
    msg.textContent = message;
    overlay.appendChild(msg);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #79a885;background:#0f2a1a;color:#79a885;";
    cancelBtn.addEventListener("click", () => overlay.remove());

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = confirmLabel;
    confirmBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
    confirmBtn.addEventListener("click", () => { overlay.remove(); onConfirm(); });

    btns.appendChild(cancelBtn);
    btns.appendChild(confirmBtn);
    overlay.appendChild(btns);
    document.body.appendChild(overlay);
}

// ── Colour presets ────────────────────────────────────────────────────────
// Saved colour configurations from restraint log entries.
// Stored in localStorage (device-local). group is the stripped name (e.g. "Arms").
interface EBCColorPreset {
    id: string;
    name: string;
    group: string;
    itemName: string;
    colors: string | string[];
}
const EBC_COLOR_PRESETS_KEY = "EBC_colorPresets";
function getColorPresets(): EBCColorPreset[] {
    try { const raw = localStorage.getItem(EBC_COLOR_PRESETS_KEY); return raw ? JSON.parse(raw) as EBCColorPreset[] : []; } catch { return []; }
}
function saveColorPresets(list: EBCColorPreset[]): void {
    try { localStorage.setItem(EBC_COLOR_PRESETS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
function addColorPreset(p: EBCColorPreset): void { saveColorPresets([...getColorPresets(), p]); }
function removeColorPreset(id: string): void { saveColorPresets(getColorPresets().filter(p => p.id !== id)); }
function renameColorPreset(id: string, name: string): void {
    const list = getColorPresets();
    const p = list.find(x => x.id === id);
    if (p) { p.name = name; saveColorPresets(list); }
}

// Shows an overlay with a text input and confirm/cancel buttons.
// Used for save-colour-preset naming.
function showNameInputOverlay(
    title: string,
    defaultValue: string,
    confirmLabel: string,
    onConfirm: (value: string) => void,
): void {
    const overlay = document.createElement("div");
    overlay.style.cssText = [
        "position:fixed", "top:50%", "left:50%",
        "transform:translate(-50%,-50%)",
        "background:#130810", "border:2px solid #cf6f98",
        "border-radius:10px", "padding:18px 22px",
        "z-index:999999", "font-family:'Trebuchet MS',serif",
        "min-width:260px", "max-width:320px",
        "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
        "display:flex", "flex-direction:column", "gap:10px",
    ].join(";");

    const lbl = document.createElement("div");
    lbl.style.cssText = "font-size:12px;color:#cf6f98;line-height:1.4;";
    lbl.textContent = title;
    overlay.appendChild(lbl);

    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = defaultValue;
    inp.maxLength = 40;
    inp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;background:#1b0d17;border:1px solid #4c2537;border-radius:4px;color:#f7e6ee;padding:5px 8px;width:100%;box-sizing:border-box;outline:none;";
    overlay.appendChild(inp);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #79a885;background:#0f2a1a;color:#79a885;";
    cancelBtn.addEventListener("click", () => overlay.remove());

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = confirmLabel;
    confirmBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
    confirmBtn.addEventListener("click", () => {
        const v = inp.value.trim();
        if (!v) { inp.style.borderColor = "#e05070"; return; }
        overlay.remove();
        onConfirm(v);
    });

    inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); confirmBtn.click(); }
        if (e.key === "Escape") { e.preventDefault(); overlay.remove(); }
    });

    btns.appendChild(cancelBtn);
    btns.appendChild(confirmBtn);
    overlay.appendChild(btns);
    document.body.appendChild(overlay);
    setTimeout(() => inp.select(), 30);
}

// ── Menu hotkey ───────────────────────────────────────────────────────────
const EBC_MENU_HOTKEY_KEY = "EBC_menuHotkey";
function getMenuHotkey(): string { try { return localStorage.getItem(EBC_MENU_HOTKEY_KEY) ?? ""; } catch { return ""; } }
function setMenuHotkey(key: string): void { try { if (key) localStorage.setItem(EBC_MENU_HOTKEY_KEY, key); else localStorage.removeItem(EBC_MENU_HOTKEY_KEY); } catch { /* ignore */ } }

// ── Drawer appearance / layout helpers ───────────────────────────────────
const EBC_COLORS_KEY = "EBC_colors";
const EBC_HIDDEN_KEY = "EBC_hiddenTabs";
const EBC_USER_TABS      = ["outfits", "buttons", "anims", "notes", "thanks", "dev"] as const;
const EBC_TAB_LABELS: Record<string, string> = {
    outfits: "OUTFITS", buttons: "BUTTONS", anims: "ANIMS",
    notes: "USERS", thanks: "CREDITS", dev: "DEV",
};

// The 9 user-facing colour slots. All derived colours are computed from these.
interface CoreColors {
    bg: string;         // Panel background
    card: string;       // Card / section background
    cardMuted: string;  // Input / field background
    border: string;     // Border colour
    accent: string;     // Accent / highlight colour
    textBright: string; // Primary text
    textSub: string;    // Secondary text
    textMuted: string;  // Muted / inactive text
    gold: string;       // Gold / yellow highlights
}

const DEFAULT_COLORS: CoreColors = {
    bg:         "#1a0d14",
    card:       "#23101d",
    cardMuted:  "#1b0d17",
    border:     "#3a1928",
    accent:     "#cf6f98",
    textBright: "#f7e6ee",
    textSub:    "#c09098",
    textMuted:  "#7a5a6a",
    gold:       "#c9ab72",
};

interface ThemePreset { name: string; colors: CoreColors; }
const EBC_THEME_PRESETS: Record<string, ThemePreset> = {
    // Each preset is fully cohesive — backgrounds tinted with the theme hue,
    // accent is the primary colour, text & border complement it naturally.
    rose:     { name: "🌸 Rose (Default)",   colors: DEFAULT_COLORS },
    sakura:   { name: "🌺 Sakura",           colors: { bg:"#1c0e12", card:"#281419", cardMuted:"#220f15", border:"#481a24", accent:"#e8608a", textBright:"#ffecf2", textSub:"#d8a0b0", textMuted:"#906070", gold:"#e0b060" } },
    lavender: { name: "💜 Lavender",         colors: { bg:"#0e0b1a", card:"#150f28", cardMuted:"#120c22", border:"#281a42", accent:"#9b6fcf", textBright:"#ece6f8", textSub:"#9888c0", textMuted:"#5a5278", gold:"#c8b46a" } },
    ocean:    { name: "🌊 Ocean",            colors: { bg:"#0a1220", card:"#0e1c30", cardMuted:"#0c1828", border:"#162e4c", accent:"#5a98c8", textBright:"#e0eef8", textSub:"#789ab8", textMuted:"#3e5870", gold:"#c0a860" } },
    forest:   { name: "🌿 Forest",           colors: { bg:"#091410", card:"#0d1e16", cardMuted:"#0b1812", border:"#163422", accent:"#52b870", textBright:"#daf0e2", textSub:"#70a880", textMuted:"#3e5e48", gold:"#aab840" } },
    crimson:  { name: "🔴 Crimson",          colors: { bg:"#180a0a", card:"#221010", cardMuted:"#1c0c0c", border:"#3c1414", accent:"#c84848", textBright:"#f8e0e0", textSub:"#b87878", textMuted:"#704848", gold:"#c89050" } },
    amber:    { name: "🟡 Amber",            colors: { bg:"#150e06", card:"#201508", cardMuted:"#1a1006", border:"#3a2412", accent:"#d08030", textBright:"#f8ecd8", textSub:"#c09870", textMuted:"#806848", gold:"#e8c040" } },
    obsidian: { name: "🖤 Obsidian",         colors: { bg:"#111216", card:"#1a1c22", cardMuted:"#151720", border:"#28293a", accent:"#8090b8", textBright:"#e8eaf0", textSub:"#8890a0", textMuted:"#545a68", gold:"#a89058" } },
};

// ── Colour math helpers ───────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function lighten(hex: string, pct: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * pct, g + (255 - g) * pct, b + (255 - b) * pct);
}
function darken(hex: string, pct: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - pct), g * (1 - pct), b * (1 - pct));
}

// Storage
function getCoreColors(): CoreColors {
    try {
        const stored = localStorage.getItem(EBC_COLORS_KEY);
        if (!stored) return { ...DEFAULT_COLORS };
        return { ...DEFAULT_COLORS, ...(JSON.parse(stored) as Partial<CoreColors>) };
    } catch { return { ...DEFAULT_COLORS }; }
}
function saveCoreColors(c: CoreColors): void {
    try { localStorage.setItem(EBC_COLORS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

function getHiddenTabs(): string[] {
    try { const v = localStorage.getItem(EBC_HIDDEN_KEY); return v ? JSON.parse(v) as string[] : []; } catch { return []; }
}
function setHiddenTabs(ids: string[]): void {
    try { localStorage.setItem(EBC_HIDDEN_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

function buildCSS(c: CoreColors): string {
    // Derive secondary colours from the 9 user-facing ones
    const bgDark      = darken(c.bg, 0.18);
    const bgDarker    = darken(c.bg, 0.30);
    const bgMid       = lighten(c.bg, 0.45);
    const borderLight = lighten(c.border, 0.35);
    const accentHover = lighten(c.accent, 0.15);
    const accentDim   = darken(c.accent, 0.20);

    // CSS custom properties injected on #emerybc-panel so every child element
    // (including those using inline style.cssText with var(--ebc-xxx)) automatically
    // reflects the active theme whenever injectStyles() is called.
    const vars = `#emerybc-panel{` +
        `--ebc-bg:${c.bg};--ebc-card:${c.card};--ebc-card-muted:${c.cardMuted};` +
        `--ebc-bg-dark:${bgDark};--ebc-bg-darker:${bgDarker};--ebc-bg-mid:${bgMid};` +
        `--ebc-border:${c.border};--ebc-border-light:${borderLight};` +
        `--ebc-accent:${c.accent};--ebc-accent-hover:${accentHover};--ebc-accent-dim:${accentDim};` +
        `--ebc-text-muted:${c.textMuted};--ebc-text-sub:${c.textSub};--ebc-text-bright:${c.textBright};` +
        `--ebc-gold:${c.gold};}\n`;

    let css = CSS;
    css = css.split("#1a0d14").join(c.bg);
    css = css.split("#23101d").join(c.card);
    css = css.split("#1b0d17").join(c.cardMuted);
    css = css.split("#130810").join(bgDark);
    css = css.split("#100810").join(bgDarker);
    css = css.split("#2d1422").join(bgMid);
    css = css.split("#3a1928").join(c.border);
    css = css.split("#4c2537").join(borderLight);
    css = css.split("#cf6f98").join(c.accent);
    css = css.split("#e085ad").join(accentHover);
    css = css.split("#a85678").join(accentDim);
    css = css.split("#7a5a6a").join(c.textMuted);
    css = css.split("#c09098").join(c.textSub);
    css = css.split("#f7e6ee").join(c.textBright);
    css = css.split("#c9ab72").join(c.gold);
    return vars + css;
}

// -- VIP members (highlighted in Notes tab when present in the room) -----------

const VIP_MEMBERS: Record<number, { label: string; color: string; gradient: [string, string] }> = {
    130267: { label: "creator", color: "#f77ec0", gradient: ["#f77ec0", "#40d8c8"] },  // Emery  — pink → turquoise
    143776: { label: "Sin",     color: "#ff9dd0", gradient: ["#ff9dd0", "#d4407a"] },  // Sin    — light pink → hot pink
    124264: { label: "Lara",    color: "#d898f0", gradient: ["#d898f0", "#8840d0"] },  // Lara   — lilac → deep purple
    230466: { label: "Lucy",    color: "#70e0d8", gradient: ["#70e0d8", "#2098a8"] },  // Lucy   — light teal → dark teal
        80: { label: "Sybil",   color: "#98e8a8", gradient: ["#98e8a8", "#30a870"] },  // Sybil  — mint → forest green
};

/** Apply an animated flowing gradient as text fill colour to an element. */
function applyGradientText(el: HTMLElement, from: string, to: string): void {
    el.style.background = `linear-gradient(90deg, ${from}, ${to}, ${from})`;
    el.style.backgroundSize = "200% auto";
    el.style.webkitBackgroundClip = "text";
    el.style.backgroundClip = "text";
    el.style.webkitTextFillColor = "transparent";
    el.style.color = "transparent";
    el.style.animation = "ebc-gradient-flow 4s ease infinite";
}

// -- Pointer helper (mouse + touch) --------------------------------------------
// Normalises MouseEvent / TouchEvent to a plain {clientX, clientY} so drag
// handlers can support both desktop (mouse) and tablet (touch) with one path.

function pointerCoords(e: Event): { clientX: number; clientY: number } {
    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return { clientX: t?.clientX ?? 0, clientY: t?.clientY ?? 0 };
    }
    return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
}

// Attach drag start to both mousedown and touchstart on `el`.
// `onDown` receives normalised coords and the raw event; returns false to cancel.
function addPointerDown(
    el: HTMLElement,
    onDown: (pos: { clientX: number; clientY: number }, e: Event) => boolean | void,
): void {
    el.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button !== 0) return;
        onDown(pointerCoords(e), e);
    });
    el.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        onDown(pointerCoords(e), e);
    }, { passive: false });
}

// Add move+end listeners to document for both mouse and touch, returning a cleanup fn.
function addPointerTracking(
    onMove: (pos: { clientX: number; clientY: number }) => void,
    onEnd:  (pos: { clientX: number; clientY: number }) => void,
): () => void {
    const moveH = (e: Event): void => {
        if (e.cancelable) e.preventDefault();
        onMove(pointerCoords(e));
    };
    const endH = (e: Event): void => {
        onEnd(pointerCoords(e));
        cleanup();
    };
    const cleanup = (): void => {
        document.removeEventListener("mousemove", moveH);
        document.removeEventListener("mouseup",   endH);
        document.removeEventListener("touchmove", moveH);
        document.removeEventListener("touchend",  endH);
    };
    document.addEventListener("mousemove", moveH);
    document.addEventListener("mouseup",   endH);
    document.addEventListener("touchmove", moveH, { passive: false });
    document.addEventListener("touchend",  endH);
    return cleanup;
}

// -- Class ---------------------------------------------------------------------

type DrawerTab = "outfits" | "anims" | "buttons" | "notes" | "thanks" | "dev" | "dom" | "puppy" | "kitty";

// ── Pinned-strip tab-filter helpers ──────────────────────────────────────────
// Each pinned section (Safewords, EBC Tags) stores a Set of tab IDs it should
// appear on.  null / absent key = "all tabs" (default).  Written to localStorage
// so it survives panel re-builds without touching server-side ExtensionSettings.
const PINNED_STRIP_TABS: DrawerTab[] = ["outfits", "buttons", "anims", "notes", "thanks", "dev", "dom"];
const PINNED_TAB_SHORT: Partial<Record<DrawerTab, string>> = {
    outfits: "OUT", buttons: "BTN", anims: "ANM",
    notes: "USR",  thanks:  "CRD", dev:   "DEV", dom: "DOM",
};

function loadStripTabFilter(key: string): Set<DrawerTab> | null {
    try {
        const v = localStorage.getItem(key);
        if (!v) return null;
        const arr = JSON.parse(v) as DrawerTab[];
        if (arr.length >= PINNED_STRIP_TABS.length) return null; // treat as "all"
        return new Set(arr);
    } catch { return null; }
}

function saveStripTabFilter(key: string, tabs: Set<DrawerTab> | null): void {
    try {
        if (!tabs || tabs.size >= PINNED_STRIP_TABS.length) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify([...tabs]));
        }
    } catch { /* ignore */ }
}



const EBC_OPEN_BEEP_WINS_KEY = "EBC_openBeepWins";

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    // -- Persist open beep windows across sessions -----------------------------
    static getOpenBeepWindows(): number[] {
        try {
            const raw = localStorage.getItem(EBC_OPEN_BEEP_WINS_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as number[]) : [];
        } catch { return []; }
    }
    static addOpenBeepWindow(num: number): void {
        try {
            const set = new Set(EBCDrawer.getOpenBeepWindows());
            set.add(num);
            localStorage.setItem(EBC_OPEN_BEEP_WINS_KEY, JSON.stringify([...set]));
        } catch { /* ignore */ }
    }
    static removeOpenBeepWindow(num: number): void {
        try {
            const list = EBCDrawer.getOpenBeepWindows().filter(n => n !== num);
            localStorage.setItem(EBC_OPEN_BEEP_WINS_KEY, JSON.stringify(list));
        } catch { /* ignore */ }
    }

    private rootEl: HTMLElement | null = null;   // zero-width anchor (positioned)
    private panelEl: HTMLElement | null = null;  // sliding panel (transforms)
    private isOpen = false;
    private currentTab: DrawerTab = "outfits";
    private resizeObserver: ResizeObserver | null = null;
    private positioned = false;
    private hasBeenShown = false;
    private version = "";
    private isDev   = false;
    private refreshConfirmToggle: (() => void) | null = null;
    private refreshSwEnableBtn: (() => void) | null = null;
    private beepWins = new Map<number, { el: HTMLElement; minimized: boolean }>();
    private beepUnread = new Map<number, number>();
    private expandedFriends = new Set<number>();
    private friendsSectionEl: HTMLElement | null = null;
    private friendPollTick = 0;
    private friendRefreshDebounce: ReturnType<typeof window.setTimeout> | null = null;
    private offlineFriendsCollapsed = true;
    private roomPeopleCollapsed = false;
    private lastRect = { top: -1, width: -1, height: -1, right: -1 };
    private lastCrabsBottom = -1;
    private crabsPoller: ReturnType<typeof window.setInterval> | null = null;
    // Kitty page: whether Lucy is currently holding Emery's leash.
    // ChatRoomLeashList is only updated on the TARGET's client, so we maintain
    // our own authoritative copy here; it survives panel re-renders.
    private _leashHeld = false;
    private timerEl: HTMLElement | null = null;
    private timerPoller: ReturnType<typeof window.setInterval> | null = null;
    // User-dragged tab position (fixed screen coords {x,y}). null = follow CRABS.
    private userTabOffset: { x: number; y: number } | null = null;
    // Set to true once we've confirmed no saved position exists, so we stop polling storage.
    private tabOffsetChecked = false;
    private tabDragging = false; // true while mouse is held on tab — blocks CRABS poller
    private domSelectedTargets = new Set<number>();
    // Free-float panel position. null = anchored to chat log (default slide behaviour).
    private panelPosition: { x: number; y: number } | null = null;
    private resetLocationBtn: HTMLElement | null = null;
    // Interactive guide overlay
    private guideEl: HTMLElement | null = null;
    private guideStep = 0;
    // Category dropdown in quick actions bar
    // DEV tab auto-refresh poller
    private devLogPoller: ReturnType<typeof window.setInterval> | null = null;
    // Tag tooltip — kept at instance level so it survives list rebuilds
    private tagTooltipEl: HTMLElement | null = null;
    private tagTooltipMoveListener: ((e: MouseEvent) => void) | null = null;
    private selectedWhisperPartner: number | null = null; // used by whisper log in DEV tab
    // Refs to the pinned strips so updatePinnedStrips() can show/hide them per tab
    private safewordRowEl: HTMLElement | null = null;
    private ebcTagsStripEl: HTMLElement | null = null;
    // i18n — references to static header/tab/qa elements updated by updateStaticTranslations()
    private _langUnsubscribe: (() => void) | null = null;
    private _langPillsRefresh: (() => void) | null = null;
    private _i18nRefs: {
        // header
        refreshBtn?: HTMLButtonElement;
        moveHandle?: HTMLSpanElement;
        resetLocBtn?: HTMLButtonElement;
        closeBtn?: HTMLButtonElement;
        // tabs
        tabOutfits?: HTMLButtonElement;
        tabButtons?: HTMLButtonElement;
        tabAnims?: HTMLButtonElement;
        tabNotes?: HTMLButtonElement;
        tabThanks?: HTMLButtonElement;
        tabDev?: HTMLButtonElement;
        tabDom?: HTMLButtonElement;
        tabPuppy?: HTMLButtonElement;
        tabKitty?: HTMLButtonElement;
        // quick-actions static elements
        releaseBtn?: HTMLButtonElement;
        unlockBtn?: HTMLButtonElement;
        qaConfirmLbl?: HTMLSpanElement;
        qaConfirmToggle?: HTMLButtonElement;
        pickBtn?: HTMLButtonElement;
    } = {};

    constructor(version = "", isDev = false) {
        EBCDrawer._instance = this;
        this.version = version;
        this.isDev   = isDev;
        registerOpenBeepCallback((n) => this.openBeepWindow(n));
        // Live-update the DEV tab whisper log section when new messages arrive
        setWhisperUpdateCallback(() => {
            if (this.isOpen && this.currentTab === "dev") {
                this.rerender();
            }
        });
        // Re-translate static elements + re-render active tab when language changes
        this._langUnsubscribe = onLangChange(() => {
            this.updateStaticTranslations();
            if (this.isOpen) this.rerender();
        });
        if (document.body) {
            this.setup();
        } else {
            document.addEventListener("DOMContentLoaded", () => this.setup());
        }
    }

    // -- Setup -----------------------------------------------------------------

    private setup(): void {
        if (this.rootEl) return;
        this.injectStyles();

        // Root anchor - zero-width, positioned at chat log right edge.
        // The tab lives here (always visible). The panel is a sibling that slides.
        const root = document.createElement("div");
        root.id = "emerybc-root";
        root.style.display = "none";
        root.style.right = "-9999px"; // off-screen until syncToChat runs

        // Tab button - child of root, OUTSIDE the sliding panel so it never moves.
        const tab = document.createElement("div");
        tab.id = "ebc-tab";
        tab.title = "EBC";
        tab.innerHTML = TAB_ICON;
        // Panel starts closed — clip the tab so it doesn't block the BC canvas.
        tab.classList.add("ebc-tab-closed");
        root.appendChild(tab);

        // Sliding panel container - this is the only thing that transforms
        const slideContainer = document.createElement("div");
        slideContainer.id = "emerybc-panel";
        slideContainer.className = "ebc-closed";
        // Touch / phone mode — enlarges all tap targets automatically on phones.
        applyTouchMode(slideContainer);

        // Inner panel (visual content)
        const panel = document.createElement("div");
        panel.className = "ebc-panel";

        // Anchor the skeleton to the DOM immediately — if any later step in setup()
        // throws, updateVisibility() can still show the tab and the panel won't be
        // permanently lost (content gets appended to the live panel as setup continues).
        slideContainer.appendChild(panel);
        root.appendChild(slideContainer);
        document.body.appendChild(root);
        this.rootEl  = root;
        this.panelEl = slideContainer;

        // Stop BC's in-game touch handlers from eating our touch events.
        // BC registers touchmove/touchstart at document level (non-passive) and calls
        // preventDefault(), which kills native scroll inside HTML overlays.
        // Stopping propagation here keeps those events inside the panel only.
        const stopTouch = (e: TouchEvent): void => { e.stopPropagation(); };
        slideContainer.addEventListener("touchstart", stopTouch, { passive: true });
        slideContainer.addEventListener("touchmove",  stopTouch, { passive: true });
        slideContainer.addEventListener("touchend",   stopTouch, { passive: true });

        // Header
        const header = document.createElement("div");
        header.className = "ebc-header";

        const title = document.createElement("span");
        title.className = "ebc-title";
        title.style.display = "flex";
        title.style.alignItems = "baseline";
        title.style.gap = "5px";

        const titleMain = document.createElement("span");
        titleMain.textContent = "EBC" + (this.version ? " v" + this.version : "");

        const titleSub = document.createElement("span");
        titleSub.textContent = "EmeryBC";
        titleSub.style.cssText = "font-size:9px;color:#7a5060;font-weight:normal;letter-spacing:0.5px;";

        title.appendChild(titleMain);
        title.appendChild(titleSub);

        if (this.isDev) {
            const devChip = document.createElement("span");
            devChip.textContent = "DEV";
            devChip.style.cssText = "font-size:8px;font-weight:bold;letter-spacing:1px;padding:1px 5px;border-radius:3px;background:#2a0e1a;border:1px solid #cf6f98;color:#f0a0c0;";
            title.appendChild(devChip);
        }

        const headerBtns = document.createElement("div");
        headerBtns.className = "ebc-header-btns";

        const refreshBtn = document.createElement("button");
        refreshBtn.className = "ebc-icon-btn";
        refreshBtn.title = t("header.refresh");
        refreshBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

        // Drag handle icon — same mousedown behaviour as the header title area.
        const moveHandle = document.createElement("span");
        moveHandle.className = "ebc-move-handle";
        moveHandle.title = t("header.dragToMove");
        moveHandle.textContent = "⠿";

        const resetLocBtn = document.createElement("button");
        resetLocBtn.className = "ebc-reset-loc-btn";
        resetLocBtn.title = t("header.resetPosTitle");
        resetLocBtn.textContent = t("header.resetPos");
        resetLocBtn.style.display = "none"; // hidden until panel is in free-float mode
        this.resetLocationBtn = resetLocBtn;

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-icon-btn";
        closeBtn.title = t("header.close");
        closeBtn.textContent = "X";

        const guideBtn = document.createElement("button");
        guideBtn.className = "ebc-guide-btn";
        guideBtn.title = "Interactive guide — walks you through every feature";
        guideBtn.textContent = "?";

        // Store refs for later translation updates (langSelect ref stored after pill row is built below)
        this._i18nRefs.refreshBtn  = refreshBtn;
        this._i18nRefs.moveHandle  = moveHandle;
        this._i18nRefs.resetLocBtn = resetLocBtn;
        this._i18nRefs.closeBtn    = closeBtn;

        guideBtn.addEventListener("click", () => this.startGuide());

        headerBtns.appendChild(refreshBtn);
        headerBtns.appendChild(moveHandle);
        headerBtns.appendChild(resetLocBtn);
        headerBtns.appendChild(guideBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);

        // Header drag — moves the panel when in free-float mode.
        // In anchored mode it drags to detach the panel; after 5px movement the panel
        // enters free-float mode and follows the cursor from that point.
        addPointerDown(header, (start, e) => {
            // Don't interfere with button or interactive element clicks inside the header
            if ((e.target as HTMLElement).closest("button, select, input, a")) return;
            e.preventDefault();

            const panelEl = slideContainer;
            const startRect = panelEl.getBoundingClientRect();
            let inFreeMode = this.panelPosition !== null;
            let startPanelX = inFreeMode ? this.panelPosition!.x : startRect.left;
            let startPanelY = inFreeMode ? this.panelPosition!.y : startRect.top;
            let hasDragged = false;

            addPointerTracking(
                (pos) => {
                    const dx = pos.clientX - start.clientX;
                    const dy = pos.clientY - start.clientY;
                    if (!hasDragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
                    if (!hasDragged) {
                        hasDragged = true;
                        if (!inFreeMode) {
                            inFreeMode = true;
                            startPanelX = startRect.left;
                            startPanelY = startRect.top;
                            this.enterFreeMode({ x: startPanelX, y: startPanelY });
                        }
                    }
                    // Keep panel fully inside viewport — right/bottom edge must stay visible
                    const pW = panelEl.offsetWidth  || 360;
                    const pH = panelEl.offsetHeight || 200;
                    const newX = Math.max(0, Math.min(window.innerWidth  - pW, startPanelX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - Math.min(pH, 80), startPanelY + dy));
                    panelEl.style.left = `${newX}px`;
                    panelEl.style.top  = `${newY}px`;
                },
                () => {
                    if (!hasDragged) return;
                    const x = parseInt(panelEl.style.left, 10);
                    const y = parseInt(panelEl.style.top,  10);
                    this.panelPosition = { x, y };
                    this.savePanelPosition({ x, y });
                },
            );
        });

        // Tab bar
        const tabBar = document.createElement("div");
        tabBar.className = "ebc-tabs";

        const outfitTabBtn = document.createElement("button");
        outfitTabBtn.className = "ebc-tab-btn ebc-tab-active";
        outfitTabBtn.id = "ebc-tab-outfits";
        outfitTabBtn.textContent = t("tabs.outfits");

        const posesTabBtn = document.createElement("button");
        posesTabBtn.className = "ebc-tab-btn";
        posesTabBtn.id = "ebc-tab-poses";
        posesTabBtn.textContent = t("tabs.anims");

        const btnsTabBtn = document.createElement("button");
        btnsTabBtn.className = "ebc-tab-btn";
        btnsTabBtn.id = "ebc-tab-buttons";
        btnsTabBtn.textContent = t("tabs.buttons");
        btnsTabBtn.title = t("tabs.buttonsTitle");

        const notesTabBtn = document.createElement("button");
        notesTabBtn.className = "ebc-tab-btn";
        notesTabBtn.id = "ebc-tab-notes";
        notesTabBtn.style.position = "relative";
        notesTabBtn.title = t("tabs.usersTitle");
        const notesTabLabel = document.createElement("span");
        notesTabLabel.textContent = t("tabs.users");
        notesTabBtn.appendChild(notesTabLabel);
        const notesBadgeEl = document.createElement("span");
        notesBadgeEl.id = "ebc-notes-tab-badge";
        notesBadgeEl.style.cssText = "display:none;position:absolute;top:3px;right:2px;min-width:14px;height:14px;background:#cf6f98;color:#fff;border-radius:7px;font-size:8px;font-weight:bold;line-height:14px;text-align:center;padding:0 3px;pointer-events:none;box-sizing:border-box;";
        notesTabBtn.appendChild(notesBadgeEl);

        const thanksTabBtn = document.createElement("button");
        thanksTabBtn.className = "ebc-tab-btn";
        thanksTabBtn.id = "ebc-tab-thanks";
        thanksTabBtn.textContent = t("tabs.credits");
        thanksTabBtn.title = t("tabs.creditsTitle");

        const devTabBtn2 = document.createElement("button");
        devTabBtn2.className = "ebc-tab-btn";
        devTabBtn2.id = "ebc-tab-dev";
        devTabBtn2.textContent = t("tabs.dev");
        devTabBtn2.title = t("tabs.devTitle");

        // DOM tools tab — creator only, hidden until open() confirms the member number
        const domTabBtn = document.createElement("button");
        domTabBtn.className = "ebc-tab-btn";
        domTabBtn.id = "ebc-tab-dom";
        domTabBtn.textContent = t("tabs.dom");
        domTabBtn.title = t("tabs.domTitle");
        domTabBtn.style.display = "none"; // revealed in open() for creator only

        // Puppy tab — Lucy only (member 230466)
        const puppyTabBtn = document.createElement("button");
        puppyTabBtn.className = "ebc-tab-btn";
        puppyTabBtn.id = "ebc-tab-puppy";
        puppyTabBtn.textContent = "🐾";
        puppyTabBtn.title = t("tabs.puppy");
        puppyTabBtn.style.display = "none"; // revealed in open() for Lucy only

        // Kitty tab — Lucy only (member 230466)
        const kittyTabBtn = document.createElement("button");
        kittyTabBtn.className = "ebc-tab-btn";
        kittyTabBtn.id = "ebc-tab-kitty";
        kittyTabBtn.textContent = "🐱";
        kittyTabBtn.title = t("tabs.kitty");
        kittyTabBtn.style.display = "none"; // revealed in open() for Lucy only

        // Store tab refs for language updates
        this._i18nRefs.tabOutfits = outfitTabBtn;
        this._i18nRefs.tabButtons = btnsTabBtn;
        this._i18nRefs.tabAnims   = posesTabBtn;
        this._i18nRefs.tabNotes   = notesTabBtn;
        this._i18nRefs.tabThanks  = thanksTabBtn;
        this._i18nRefs.tabDev     = devTabBtn2;
        this._i18nRefs.tabDom     = domTabBtn;
        this._i18nRefs.tabPuppy   = puppyTabBtn;
        this._i18nRefs.tabKitty   = kittyTabBtn;

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(btnsTabBtn);
        tabBar.appendChild(posesTabBtn);
        tabBar.appendChild(notesTabBtn);
        tabBar.appendChild(thanksTabBtn);
        tabBar.appendChild(devTabBtn2);
        tabBar.appendChild(domTabBtn);
        tabBar.appendChild(puppyTabBtn);
        tabBar.appendChild(kittyTabBtn);

        // ── Language picker row — sits between tab bar and quick-actions ─────
        const langRow = document.createElement("div");
        langRow.className = "ebc-lang-row";

        const langPills: HTMLButtonElement[] = [];
        const refreshLangPills = (): void => {
            const cur = getLanguage();
            for (const pill of langPills) {
                const active = pill.dataset.lang === cur;
                pill.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:11px",
                    "padding:4px 10px",
                    "border-radius:12px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "transition:background 0.12s,color 0.12s,border-color 0.12s",
                    active
                        ? "border:1px solid #cf6f98;background:#4a1f30;color:#f7e6ee;font-weight:bold;"
                        : "border:1px solid #3a1928;background:transparent;color:#8a5070;",
                ].join(";");
            }
        };
        for (const code of LANG_CODES) {
            const pill = document.createElement("button");
            pill.dataset.lang = code;
            pill.className = "ebc-lang-pill"; // enables touch-mode CSS targeting
            pill.textContent = LANG_LABELS[code];
            pill.title = LANG_NAMES[code]; // full name on hover
            pill.addEventListener("click", () => {
                setLanguage(code);
                refreshLangPills();
            });
            langPills.push(pill);
            langRow.appendChild(pill);
        }
        refreshLangPills();
        this._langPillsRefresh = refreshLangPills;

        // Quick actions bar (always visible below tabs)
        const quickActions = document.createElement("div");
        quickActions.className = "ebc-quick-actions";
        quickActions.style.cssText = quickActions.style.cssText + ";flex-direction:column;gap:4px;";

        // Row 1: all-at-once danger buttons
        const qaRow1 = document.createElement("div");
        qaRow1.style.cssText = "display:flex;gap:5px;";

        const releaseBtn = document.createElement("button");
        releaseBtn.className = "ebc-action-btn danger";
        releaseBtn.title = t("qa.releaseTitle");
        releaseBtn.textContent = t("qa.releaseRestraints");

        const unlockBtn = document.createElement("button");
        unlockBtn.className = "ebc-action-btn danger";
        unlockBtn.title = t("qa.removeLocksTitle");
        unlockBtn.textContent = t("qa.removeLocks");

        this._i18nRefs.releaseBtn = releaseBtn;
        this._i18nRefs.unlockBtn  = unlockBtn;

        qaRow1.appendChild(releaseBtn);
        qaRow1.appendChild(unlockBtn);
        quickActions.appendChild(qaRow1);

        // Row 1b: confirm-before-escaping (centered, subtle, between danger buttons and picker)
        const qaConfirmRow = document.createElement("div");
        qaConfirmRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:7px;";

        const qaConfirmLbl = document.createElement("span");
        qaConfirmLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;user-select:none;";
        qaConfirmLbl.textContent = t("qa.confirmBeforeEscaping");
        this._i18nRefs.qaConfirmLbl = qaConfirmLbl;

        const qaConfirmToggle = document.createElement("button");
        this._i18nRefs.qaConfirmToggle = qaConfirmToggle;
        const refreshQaConfirm = (): void => {
            const on = getAntiRestraintConfirm();
            qaConfirmToggle.textContent = on ? t("core.on") : t("core.off");
            qaConfirmToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif",
                "font-size:9px",
                "font-weight:bold",
                "padding:4px 10px",
                "border-radius:4px",
                "cursor:pointer",
                "flex-shrink:0",
                "border:1px solid " + (on ? "#cf6f98" : "#3a1928"),
                "background:" + (on ? "#4a1f30" : "#100508"),
                "color:" + (on ? "#f7e6ee" : "#4c2537"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
        };
        refreshQaConfirm();
        this.refreshConfirmToggle = refreshQaConfirm;
        qaConfirmToggle.addEventListener("click", () => {
            setAntiRestraintConfirm(!getAntiRestraintConfirm());
            refreshQaConfirm();
        });

        qaConfirmRow.appendChild(qaConfirmLbl);
        qaConfirmRow.appendChild(qaConfirmToggle);
        quickActions.appendChild(qaConfirmRow);

        // Row 2: self-picker toggle (full-width, subtle)
        const selfPickToggle = document.createElement("button");
        selfPickToggle.style.cssText = "width:100%;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 6px;border-radius:5px;border:1px dashed #4c2537;background:transparent;color:#7a4a5e;cursor:pointer;transition:background 0.14s,color 0.12s;text-align:left;";
        selfPickToggle.textContent = t("qa.pickRestraints");
        selfPickToggle.title = t("qa.pickTitle");
        this._i18nRefs.pickBtn = selfPickToggle;
        selfPickToggle.addEventListener("mouseenter", () => { selfPickToggle.style.color = "#cf6f98"; });
        selfPickToggle.addEventListener("mouseleave", () => { if (selfPickPanel.style.display === "none") selfPickToggle.style.color = "#7a4a5e"; });
        quickActions.appendChild(selfPickToggle);


        // Self-picker panel (collapsed by default, sits between quickActions and badgeRow)
        const selfPickPanel = document.createElement("div");
        selfPickPanel.style.cssText = "display:none;flex-direction:column;gap:5px;flex-shrink:0;background:rgba(20,8,16,0.85);border-top:1px solid #2a1421;padding:7px 8px;max-height:220px;overflow-y:auto;";

        const selfPickStatus = document.createElement("div");
        selfPickStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;min-height:13px;";

        // Track selections: group → "restraint" | "lock"
        const selfSelected = new Map<string, "restraint" | "lock">();

        const rebuildSelfPicker = (): void => {
            while (selfPickPanel.firstChild) selfPickPanel.removeChild(selfPickPanel.firstChild);
            selfSelected.clear();

            const restraints = getPlayerRestraints();
            const locks      = getPlayerLockedItems();

            if (restraints.length === 0 && locks.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:2px;";
                hint.textContent = t("qa.nothingToRemove");
                selfPickPanel.appendChild(hint);
                selfPickPanel.appendChild(selfPickStatus);
                return;
            }

            const makeSection = (title: string, items: Array<{ group: string; name: string }>, kind: "restraint" | "lock"): void => {
                if (items.length === 0) return;
                const hdr = document.createElement("div");
                hdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;";
                hdr.textContent = title;
                selfPickPanel.appendChild(hdr);
                for (const item of items) {
                    const lbl = document.createElement("label");
                    lbl.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:3px;cursor:pointer;";
                    lbl.addEventListener("mouseenter", () => { lbl.style.background = "rgba(42,20,33,0.6)"; });
                    lbl.addEventListener("mouseleave", () => { lbl.style.background = ""; });
                    const cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                    cb.addEventListener("change", () => {
                        if (cb.checked) selfSelected.set(item.group, kind);
                        else selfSelected.delete(item.group);
                    });
                    const nm = document.createElement("span");
                    nm.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                    nm.textContent = item.name;
                    const gr = document.createElement("span");
                    gr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                    gr.textContent = item.group.replace("Item", "");
                    lbl.appendChild(cb); lbl.appendChild(nm); lbl.appendChild(gr);
                    selfPickPanel.appendChild(lbl);
                }
            };

            makeSection(t("qa.restraintsHeader"), restraints, "restraint");
            makeSection(t("qa.locksHeader"), locks, "lock");

            // Two action buttons
            const btnRow = document.createElement("div");
            btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:3px;";

            const removeSelBtn = document.createElement("button");
            removeSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
            removeSelBtn.textContent = t("qa.removeSelected");
            removeSelBtn.addEventListener("mouseenter", () => { removeSelBtn.style.background = "#5a1c30"; });
            removeSelBtn.addEventListener("mouseleave", () => { removeSelBtn.style.background = "#3a1020"; });
            removeSelBtn.addEventListener("click", () => {
                const groups = [...selfSelected.entries()].filter(([, k]) => k === "restraint").map(([g]) => g);
                if (groups.length === 0) { selfPickStatus.textContent = t("qa.selectRestraintsFirst"); return; }
                const n = removePlayerSpecificItems(groups);
                selfPickStatus.textContent = n > 0 ? t("qa.removedN", { n }) : t("qa.nothingRemoved");
                rebuildSelfPicker();
                window.setTimeout(() => { selfPickStatus.textContent = ""; }, 3000);
            });

            const unlockSelBtn = document.createElement("button");
            unlockSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #3a6a50;background:#0f2a1a;color:#79a885;cursor:pointer;transition:background 0.14s;";
            unlockSelBtn.textContent = t("qa.unlockSelected");
            unlockSelBtn.addEventListener("mouseenter", () => { unlockSelBtn.style.background = "#1a4a2a"; });
            unlockSelBtn.addEventListener("mouseleave", () => { unlockSelBtn.style.background = "#0f2a1a"; });
            unlockSelBtn.addEventListener("click", () => {
                const groups = [...selfSelected.entries()].filter(([, k]) => k === "lock").map(([g]) => g);
                if (groups.length === 0) { selfPickStatus.textContent = t("qa.selectLocksFirst"); return; }
                const n = unlockPlayerSpecificItems(groups);
                selfPickStatus.textContent = n > 0 ? t("qa.unlockedN", { n }) : t("qa.nothingUnlocked");
                rebuildSelfPicker();
                window.setTimeout(() => { selfPickStatus.textContent = ""; }, 3000);
            });

            btnRow.appendChild(removeSelBtn);
            btnRow.appendChild(unlockSelBtn);
            selfPickPanel.appendChild(btnRow);
            selfPickPanel.appendChild(selfPickStatus);
        };

        selfPickToggle.addEventListener("click", () => {
            const isOpen = selfPickPanel.style.display !== "none";
            selfPickPanel.style.display = isOpen ? "none" : "flex";
            selfPickToggle.style.borderStyle = isOpen ? "dashed" : "solid";
            selfPickToggle.style.color = isOpen ? "#7a4a5e" : "#cf6f98";
            if (!isOpen) rebuildSelfPicker();
        });

        releaseBtn.addEventListener("click", () => {
            if (getAntiRestraintConfirm()) {
                showQuickConfirm("Release all restraints?", () => {
                    releaseBtn.disabled = true;
                    releaseRestraints();
                    if (selfPickPanel.style.display !== "none") rebuildSelfPicker();
                    window.setTimeout(() => { releaseBtn.disabled = false; }, 1500);
                });
                return;
            }
            releaseBtn.disabled = true;
            releaseRestraints();
            if (selfPickPanel.style.display !== "none") rebuildSelfPicker();
            window.setTimeout(() => { releaseBtn.disabled = false; }, 1500);
        });
        unlockBtn.addEventListener("click", () => {
            if (getAntiRestraintConfirm()) {
                showQuickConfirm("Remove all locks?", () => {
                    unlockBtn.disabled = true;
                    unlockItems();
                    if (selfPickPanel.style.display !== "none") rebuildSelfPicker();
                    window.setTimeout(() => { unlockBtn.disabled = false; }, 1500);
                });
                return;
            }
            unlockBtn.disabled = true;
            unlockItems();
            if (selfPickPanel.style.display !== "none") rebuildSelfPicker();
            window.setTimeout(() => { unlockBtn.disabled = false; }, 1500);
        });
        // Badge visibility toggle row (below the danger buttons)
        // Safeword permanent row (always visible, any tab)
        const safewordRow = document.createElement("div");
        safewordRow.style.cssText = "display:flex;flex-direction:column;flex-shrink:0;border-top:1px solid #2a1421;background:rgba(12,4,10,0.6);";
        this.safewordRowEl = safewordRow;

        // Header row — one line, always visible
        const swHdr = document.createElement("div");
        swHdr.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;user-select:none;";

        const swIcon = document.createElement("span");
        swIcon.textContent = "🛑";
        swIcon.style.cssText = "font-size:11px;flex-shrink:0;";

        const swLabel = document.createElement("span");
        swLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;letter-spacing:0.05em;flex:1;";
        swLabel.textContent = t("strip.safewords");

        // Grace active indicator (hidden unless grace is running)
        const swGraceTag = document.createElement("span");
        swGraceTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;padding:1px 5px;border-radius:3px;background:#3a0e1e;color:#cf6f98;border:1px solid #6b2040;flex-shrink:0;display:none;";
        swGraceTag.textContent = t("sw.graceActive");

        const swEnableBtn = document.createElement("button");
        const refreshSwEnable = (): void => {
            // Guard: Player.ExtensionSettings may not be ready on first paint
            let on = true;
            try { on = getSafewordConfig().enabled; } catch { /* default ON */ }

            swEnableBtn.textContent = on ? t("core.on") : t("core.off");
            swEnableBtn.style.fontFamily  = "'Trebuchet MS',serif";
            swEnableBtn.style.fontSize    = "10px";
            swEnableBtn.style.fontWeight  = "bold";
            swEnableBtn.style.padding     = "3px 12px";
            swEnableBtn.style.borderRadius = "5px";
            swEnableBtn.style.cursor      = "pointer";
            swEnableBtn.style.flexShrink  = "0";
            swEnableBtn.style.border      = on ? "1px solid #cf6f98" : "1px solid #a03050";
            swEnableBtn.style.background  = on ? "#4a1030"           : "#2a0515";
            swEnableBtn.style.color       = on ? "#f7cce0"           : "#e05070";
            swLabel.style.color           = on ? "#cf6f98"           : "#c04060";
            safewordRow.style.background  = on ? "rgba(12,4,10,0.6)" : "rgba(40,5,15,0.75)";
        };
        refreshSwEnable();
        this.refreshSwEnableBtn = refreshSwEnable;

        swEnableBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setSafewordConfig({ ...getSafewordConfig(), enabled: !getSafewordConfig().enabled });
            refreshSwEnable();
        });

        const swArrow = document.createElement("span");
        swArrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5060;flex-shrink:0;";
        swArrow.textContent = "▼";

        swHdr.appendChild(swIcon);
        swHdr.appendChild(swLabel);
        swHdr.appendChild(swGraceTag);
        swHdr.appendChild(swEnableBtn);
        swHdr.appendChild(swArrow);
        safewordRow.appendChild(swHdr);

        // Collapsible settings panel — rebuilt on every open so values + outfit list are always fresh
        const swInner = document.createElement("div");
        swInner.style.cssText = "display:none;flex-direction:column;gap:5px;padding:4px 7px 8px;";

        const buildSwInner = (): void => {
            while (swInner.firstChild) swInner.removeChild(swInner.firstChild);
            const cfg = getSafewordConfig();

            // -- Grace active row --
            if (isGraceActive()) {
                const graceRow = document.createElement("div");
                graceRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 6px;background:#2a0e1e;border:1px solid #6b2040;border-radius:5px;";
                const graceLbl = document.createElement("span");
                graceLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;flex:1;";
                const rem = getGraceRemaining();
                graceLbl.textContent = rem === Infinity
                    ? "🛡 Grace active (indefinite)"
                    : `🛡 Grace active — ${Math.ceil((rem as number) / 60_000)} min remaining`;
                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = t("sw.endGrace");
                cancelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:4px;border:1px solid #6b2040;background:#3a1020;color:#cf6f98;cursor:pointer;flex-shrink:0;";
                cancelBtn.addEventListener("click", () => { endGrace(); swGraceTag.style.display = "none"; buildSwInner(); });
                graceRow.appendChild(graceLbl);
                graceRow.appendChild(cancelBtn);
                swInner.appendChild(graceRow);
            }

            // -- Row helper: text input --
            const makeTextRow = (label: string, value: string, placeholder: string, onSave: (v: string) => void): void => {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:6px;";
                const lbl = document.createElement("span");
                lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a6878;flex-shrink:0;width:66px;text-align:right;";
                lbl.textContent = label;
                const inp = document.createElement("input");
                inp.type = "text";
                inp.maxLength = 40;
                inp.value = value;
                inp.placeholder = placeholder;
                inp.className = "ebc-form-input";
                inp.style.fontSize = "10px";
                inp.addEventListener("blur", () => { if (inp.value.trim()) onSave(inp.value.trim()); else inp.value = value; });
                inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { inp.blur(); } });
                row.appendChild(lbl);
                row.appendChild(inp);
                swInner.appendChild(row);
            };

            // -- Per-word section builder --
            const makeWordSection = (
                accentColor: string,
                wordLabel: string,
                wordValue: string,
                onWordSave: (v: string) => void,
                actions: { label: string; active: boolean; onChange: (v: boolean) => void }[],
                outfitLabel: string,
                outfitId: string | null,
                onOutfitPick: (id: string | null) => void,
            ): void => {
                const section = document.createElement("div");
                section.style.cssText = `display:flex;flex-direction:column;gap:4px;border:1px solid ${accentColor}44;border-radius:6px;padding:5px 7px;`;

                // Word row
                const wordRow = document.createElement("div");
                wordRow.style.cssText = "display:flex;align-items:center;gap:6px;";
                const wordLbl = document.createElement("span");
                wordLbl.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;color:${accentColor};flex-shrink:0;width:60px;text-align:right;`;
                wordLbl.textContent = wordLabel;
                const wordInp = document.createElement("input");
                wordInp.type = "text"; wordInp.maxLength = 40; wordInp.value = wordValue;
                wordInp.className = "ebc-form-input"; wordInp.style.fontSize = "10px";
                wordInp.addEventListener("blur", () => { if (wordInp.value.trim()) onWordSave(wordInp.value.trim()); else wordInp.value = wordValue; });
                wordInp.addEventListener("keydown", (e) => { if (e.key === "Enter") wordInp.blur(); });
                wordRow.appendChild(wordLbl);
                wordRow.appendChild(wordInp);
                section.appendChild(wordRow);

                // Action toggles row
                const actRow = document.createElement("div");
                actRow.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;padding-left:66px;";
                for (const act of actions) {
                    const btn = document.createElement("button");
                    btn.style.cssText = `font-family:'Trebuchet MS',serif;font-size:8px;padding:2px 6px;border-radius:4px;cursor:pointer;border:1px solid ${accentColor}66;transition:background 0.12s,color 0.12s;`;
                    const setActStyle = (on: boolean): void => {
                        btn.style.background = on ? accentColor + "44" : "transparent";
                        btn.style.color       = on ? accentColor        : "#6a4858";
                        btn.textContent       = (on ? "✓ " : "○ ") + act.label;
                    };
                    let state = act.active;
                    setActStyle(state);
                    btn.addEventListener("click", () => {
                        state = !state;
                        setActStyle(state);
                        act.onChange(state);
                    });
                    actRow.appendChild(btn);
                }
                section.appendChild(actRow);

                // Outfit row
                const outfitRow = document.createElement("div");
                outfitRow.style.cssText = "display:flex;align-items:center;gap:6px;";
                const outfitLbl = document.createElement("span");
                outfitLbl.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;color:${accentColor};flex-shrink:0;width:60px;text-align:right;`;
                outfitLbl.textContent = outfitLabel;
                const sel = document.createElement("select");
                sel.className = "ebc-form-input"; sel.style.fontSize = "10px";
                const noneOpt = document.createElement("option");
                noneOpt.value = ""; noneOpt.textContent = "— none —";
                sel.appendChild(noneOpt);
                try {
                    for (const o of getOutfits()) {
                        const opt = document.createElement("option");
                        opt.value = o.id; opt.textContent = o.displayName;
                        sel.appendChild(opt);
                    }
                } catch { /* ignore */ }
                sel.value = outfitId ?? "";
                sel.addEventListener("change", () => onOutfitPick(sel.value || null));
                outfitRow.appendChild(outfitLbl);
                outfitRow.appendChild(sel);
                section.appendChild(outfitRow);

                swInner.appendChild(section);
            };

            makeWordSection(
                "#c8b840", "Yellow word:", cfg.yellowWord,
                (v) => setSafewordConfig({ ...getSafewordConfig(), yellowWord: v }),
                [
                    { label: "Release",  active: cfg.yellowRelease,  onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), yellowRelease: v }) },
                    { label: "Grace",    active: cfg.yellowGrace,    onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), yellowGrace: v }) },
                    { label: "Announce", active: cfg.yellowAnnounce, onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), yellowAnnounce: v }) },
                    { label: "Leave",    active: cfg.yellowLeave,    onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), yellowLeave: v }) },
                ],
                "Outfit:", cfg.yellowOutfitId,
                (id) => setSafewordConfig({ ...getSafewordConfig(), yellowOutfitId: id }),
            );

            makeWordSection(
                "#e06060", "Red word:", cfg.redWord,
                (v) => setSafewordConfig({ ...getSafewordConfig(), redWord: v }),
                [
                    { label: "Release",  active: cfg.redRelease,  onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), redRelease: v }) },
                    { label: "Grace",    active: cfg.redGrace,    onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), redGrace: v }) },
                    { label: "Announce", active: cfg.redAnnounce, onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), redAnnounce: v }) },
                    { label: "Leave",    active: cfg.redLeave,    onChange: (v) => setSafewordConfig({ ...getSafewordConfig(), redLeave: v }) },
                ],
                "Outfit:", cfg.redOutfitId,
                (id) => setSafewordConfig({ ...getSafewordConfig(), redOutfitId: id }),
            );

            // -- Grace duration --
            const graceDurRow = document.createElement("div");
            graceDurRow.style.cssText = "display:flex;align-items:center;gap:6px;";
            const graceDurLbl = document.createElement("span");
            graceDurLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a6878;flex-shrink:0;width:60px;text-align:right;";
            graceDurLbl.textContent = "Grace:";
            const graceDurInp = document.createElement("input");
            graceDurInp.type = "number"; graceDurInp.min = "0"; graceDurInp.max = "9999";
            graceDurInp.value = String(Math.round(cfg.graceDurationMs / 60_000));
            graceDurInp.className = "ebc-form-input";
            graceDurInp.style.cssText = graceDurInp.style.cssText + ";width:48px;flex:none;font-size:10px;";
            graceDurInp.addEventListener("change", () => {
                const mins = Math.max(0, parseInt(graceDurInp.value, 10) || 0);
                setSafewordConfig({ ...getSafewordConfig(), graceDurationMs: mins * 60_000 });
                graceDurInp.value = String(mins);
            });
            const graceDurUnit = document.createElement("span");
            graceDurUnit.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
            graceDurUnit.textContent = t("strip.graceUnit");
            graceDurRow.appendChild(graceDurLbl);
            graceDurRow.appendChild(graceDurInp);
            graceDurRow.appendChild(graceDurUnit);
            swInner.appendChild(graceDurRow);

            // -- Hint --
            const hint = document.createElement("div");
            hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a6878;line-height:1.45;padding-top:2px;";
            hint.textContent = t("strip.swHint");
            swInner.appendChild(hint);

        };

        // Toggle expand — rebuild inner content on every open
        swHdr.addEventListener("click", () => {
            const open = swInner.style.display !== "flex";
            swInner.style.display = open ? "flex" : "none";
            swArrow.textContent = open ? "▲" : "▼";
            if (open) { try { buildSwInner(); } catch { /* ignore */ } }
            // Update grace tag on header
            swGraceTag.style.display = isGraceActive() ? "" : "none";
        });

        safewordRow.appendChild(swInner);

        // Body
        const body = document.createElement("div");
        body.className = "ebc-body";
        body.id = "ebc-body";

        // Footer: version credit + live timer only — no controls here.
        const footer = document.createElement("div");
        footer.className = "ebc-footer";

        const footerVerEl = document.createElement("span");
        footerVerEl.textContent = t("footer.uiInspired", { v: this.version });
        footerVerEl.style.cssText = "font-size:9px;color:#7a5a6a;";
        footer.appendChild(footerVerEl);

        const timerEl = document.createElement("div");
        timerEl.className = "ebc-timer";
        footer.appendChild(timerEl);
        this.timerEl = timerEl;

        // ── EBC Tags strip — collapsible, always below safewords ─────────────
        const ebcTagsStrip = document.createElement("div");
        ebcTagsStrip.style.cssText = "flex-shrink:0;border-bottom:1px solid #2a1421;background:#1a0d16;";
        this.ebcTagsStripEl = ebcTagsStrip;
        this.rebuildEbcTagsStrip();


        // Wrap all panel children in .ebc-zoom-wrapper.
        // applyPanelZoom() uses transform:scale() on this wrapper instead of
        // CSS zoom on #emerybc-panel.  transform doesn't affect the slide
        // container's layout, so #emerybc-panel never changes size and the
        // slide transition never misfires — fixes the slider glitch.
        const zoomWrapper = document.createElement("div");
        zoomWrapper.className = "ebc-zoom-wrapper";
        zoomWrapper.style.cssText = "transform-origin:top left;display:flex;flex-direction:column;width:100%;height:100%;";

        // Flat flex column — applyPanelZoom always keeps width/height:100% so the
        // wrapper has a definite height, giving .ebc-body (flex:1;min-height:0) a
        // real constraint and making overflow-y:auto scroll correctly.
        panel.appendChild(header);
        panel.appendChild(tabBar);
        panel.appendChild(langRow);
        panel.appendChild(quickActions);
        panel.appendChild(selfPickPanel);
        panel.appendChild(safewordRow);
        panel.appendChild(ebcTagsStrip);
        panel.appendChild(body);
        panel.appendChild(footer);
        // Move all panel children into the wrapper, then add wrapper to panel.
        while (panel.firstChild) zoomWrapper.appendChild(panel.firstChild);
        panel.appendChild(zoomWrapper);

        // Guide is now a detached side panel (created dynamically in startGuide).
        this.guideEl = null;

        // (slideContainer/root/body already anchored early in setup — see above)
        this.applyPanelOpacity();
        this.applyPanelZoom();
        this.updatePinnedStrips();

        // Events — tab supports both click (toggle) and drag (reposition anywhere on screen).
        // We distinguish the two by tracking how far the pointer moved (5px dead-zone).
        // Works with both mouse and touch input via addPointerDown / addPointerTracking.
        addPointerDown(tab, (start, e) => {
            e.preventDefault();
            // Block CRABS poller from overwriting style.top while dragging.
            this.tabDragging = true;

            const tabRect  = tab.getBoundingClientRect();
            const startTabX = tabRect.left;
            const startTabY = tabRect.top;
            let dragged = false;
            let longPressed = false;

            // Hold the tab for 5 seconds without dragging → emergency settings reset.
            const lpTimer = setTimeout(() => {
                if (!dragged) longPressed = true;
            }, 5000);

            addPointerTracking(
                (pos) => {
                    const dx = pos.clientX - start.clientX;
                    const dy = pos.clientY - start.clientY;
                    if (!dragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
                    dragged = true;
                    clearTimeout(lpTimer);
                    tab.style.cursor = "grabbing";
                    if (tab.style.position !== "fixed") tab.style.position = "fixed";
                    const newX = Math.max(0, Math.min(window.innerWidth  - 44, startTabX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - 44, startTabY + dy));
                    tab.style.left = `${newX}px`;
                    tab.style.top  = `${newY}px`;
                },
                () => {
                    clearTimeout(lpTimer);
                    tab.style.cursor = "";
                    this.tabDragging = false;
                    if (longPressed) {
                        // Emergency reset — shown after 5-second hold on the tab.
                        showConfirmOverlay(
                            "Reset all EBC drawer settings?\n\nRestores the default position, text size, and panel opacity.",
                            "Cancel", "Reset",
                            () => {
                                savePanelZoom(1);      this.applyPanelZoom(1);
                                savePanelOpacity(1);   this.applyPanelOpacity(1);
                                this.panelPosition = null;
                                this.savePanelPosition(null);
                                this.exitFreeMode();
                                this.userTabOffset = null;
                                this.lastCrabsBottom = -1;
                                tab.style.position = "";
                                tab.style.left = "";
                                tab.style.top  = "";
                                this.saveTabOffset(null);
                                this.updateCrabsPosition();
                                this.rerender();
                            },
                        );
                        return;
                    }
                    if (!dragged) { this.toggle(); return; }
                    const pos = { x: parseInt(tab.style.left, 10), y: parseInt(tab.style.top, 10) };
                    this.userTabOffset = pos;
                    this.lastCrabsBottom = -1;
                    this.saveTabOffset(pos);
                },
            );
        });

        // Right-click on tab resets to auto-position (follow CRABS / default)
        tab.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            this.userTabOffset = null;
            this.tabOffsetChecked = true; // no need to re-poll — user explicitly reset
            this.lastCrabsBottom = -1;
            // Clear inline fixed-position overrides so CSS absolute layout takes over
            tab.style.position = "";
            tab.style.left = "";
            tab.style.top  = "";
            this.saveTabOffset(null); // null = reset to auto
            this.updateCrabsPosition();
        });

        resetLocBtn.addEventListener("click", () => {
            // Reset panel to anchored mode
            this.panelPosition = null;
            this.savePanelPosition(null);
            this.exitFreeMode();
            // Reset text size to default
            savePanelZoom(1);
            this.applyPanelZoom(1);
            // Also reset the hamburger tab to auto-position (follow CRABS)
            this.userTabOffset = null;
            this.lastCrabsBottom = -1;
            tab.style.position = "";
            tab.style.left = "";
            tab.style.top  = "";
            this.saveTabOffset(null);
            this.updateCrabsPosition();
        });

        closeBtn.addEventListener("click", () => this.close());
        refreshBtn.addEventListener("click", () => {
            refreshBtn.classList.add("spinning");
            refreshBtn.addEventListener("animationend", () => refreshBtn.classList.remove("spinning"), { once: true });
            this.rerender();
        });

        outfitTabBtn.addEventListener("click",   () => this.switchTab("outfits"));
        posesTabBtn.addEventListener("click",    () => this.switchTab("anims"));
        notesTabBtn.addEventListener("click",    () => this.switchTab("notes"));
        thanksTabBtn.addEventListener("click",   () => this.switchTab("thanks"));
        devTabBtn2.addEventListener("click",     () => this.switchTab("dev"));
        btnsTabBtn.addEventListener("click",      () => this.switchTab("buttons"));
        domTabBtn.addEventListener("click",      () => this.switchTab("dom"));
        puppyTabBtn.addEventListener("click",    () => this.switchTab("puppy"));
        kittyTabBtn.addEventListener("click",    () => this.switchTab("kitty"));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) { this.close(); return; }
            const hotkey = getMenuHotkey();
            if (hotkey && e.code === hotkey) {
                const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
                if (tag === "input" || tag === "textarea" || tag === "select") return;
                e.preventDefault();
                this.toggle();
            }
        });
    }

    private applyTabVisibility(): void {
        if (!this.rootEl) return;
        const hidden = getHiddenTabs();
        // dev tab can never be hidden — repair if it somehow got stored as hidden
        if (hidden.includes("dev")) {
            setHiddenTabs(hidden.filter(t => t !== "dev"));
            return this.applyTabVisibility();
        }
        for (const tabId of EBC_USER_TABS) {
            const btn = this.rootEl.querySelector(`#ebc-tab-${tabId}`) as HTMLElement | null;
            if (!btn) continue;
            btn.style.display = (tabId === "dev" || !hidden.includes(tabId)) ? "" : "none";
        }
        // If the active tab was hidden, fall back to the first visible tab
        if (hidden.includes(this.currentTab)) {
            const first = EBC_USER_TABS.find(id => !hidden.includes(id)) ?? "outfits";
            this.switchTab(first);
        }
    }

    private injectStyles(): void {
        let s = document.getElementById("emerybc-drawer-css") as HTMLStyleElement | null;
        if (!s) {
            s = document.createElement("style");
            s.id = "emerybc-drawer-css";
            document.head.appendChild(s);
        }
        s.textContent = buildCSS(getCoreColors());
    }

    // -- Positioning -----------------------------------------------------------
    // Aligned to the right edge of TextAreaChatLog.
    // Our tab is positioned dynamically just below CRABS's tab (#drawer-tab).
    // Because both addons respond to the same layout events the read order is
    // non-deterministic, so we poll CRABS's position every 200 ms instead of
    // relying on a one-shot read during syncToChat().

    private syncToChat(): boolean {
        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog || !this.rootEl) return false;
        const rect = chatLog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const rightOffset = document.documentElement.clientWidth - rect.right;

        // Only write to the DOM when the chat log actually moved or resized —
        // eliminates layout thrashing on every animation frame (pattern from CRABS).
        if (
            this.lastRect.top    !== rect.top    ||
            this.lastRect.width  !== rect.width  ||
            this.lastRect.height !== rect.height ||
            this.lastRect.right  !== rightOffset
        ) {
            // Cap height so the panel never extends below the visible viewport.
            const finalH = Math.min(rect.height, Math.max(100, window.innerHeight - rect.top - 8));
            this.rootEl.style.top    = `${rect.top}px`;
            this.rootEl.style.right  = `${rightOffset}px`;
            this.rootEl.style.height = `${finalH}px`;
            if (this.panelEl) (this.panelEl as HTMLElement).style.height = `${finalH}px`;
            this.lastRect = { top: rect.top, width: rect.width, height: rect.height, right: rightOffset };
            this.positioned = true;
            // Chat log moved — force a fresh CRABS position read next tick
            this.lastCrabsBottom = -1;

            // Re-apply user's saved tab position (if any) after layout changes
            if (this.userTabOffset !== null) {
                const tabEl = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
                if (tabEl) this.applyTabOffset(tabEl, this.userTabOffset);
            }
        }

        // Load saved tab offset once on first successful position sync
        if (this.userTabOffset === null) {
            const saved = this.loadTabOffset();
            if (saved !== null) {
                this.userTabOffset = saved;
                const tabEl = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
                if (tabEl) this.applyTabOffset(tabEl, saved);
            }
        }

        // Do an immediate CRABS position read (poller may not have fired yet).
        this.updateCrabsPosition();

        return true;
    }

    // -- Tab position persistence -----------------------------------------------

    private saveTabOffset(pos: { x: number; y: number } | null): void {
        try {
            if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
            (Player.ExtensionSettings.EmeryBC as Record<string, unknown>).tabPos = pos ?? null;
            syncSettings();
        } catch { /* ignore */ }
    }

    private loadTabOffset(): { x: number; y: number } | null {
        try {
            const store = Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined;
            // New tabPos format: {x, y}
            const v = store?.tabPos as { x?: unknown; y?: unknown } | null | undefined;
            if (v && typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y };
            return null;
        } catch { return null; }
    }

    // Apply a saved/dragged fixed-screen position to the tab element immediately.
    private applyTabOffset(tabEl: HTMLElement, pos: { x: number; y: number }): void {
        const x = Math.max(0, Math.min(window.innerWidth  - 44, pos.x));
        const y = Math.max(0, Math.min(window.innerHeight - 44, pos.y));
        tabEl.style.position = "fixed";
        tabEl.style.left = `${x}px`;
        tabEl.style.top  = `${y}px`;
    }

    // -- Panel free-float mode -------------------------------------------------

    private savePanelPosition(pos: { x: number; y: number } | null): void {
        try {
            if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
            (Player.ExtensionSettings.EmeryBC as Record<string, unknown>).panelPos = pos ?? null;
            syncSettings();
        } catch { /* ignore */ }
    }

    private loadPanelPosition(): { x: number; y: number } | null {
        try {
            const store = Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined;
            const v = store?.panelPos as { x?: unknown; y?: unknown } | null | undefined;
            if (v && typeof v.x === "number" && typeof v.y === "number") {
                // Clamp to current viewport so a position saved on a wider/taller screen
                // doesn't put the panel off-screen on the next load.
                const pW = this.panelEl?.offsetWidth  || 360;
                const pH = this.panelEl?.offsetHeight || 200;
                const x = Math.max(0, Math.min(window.innerWidth  - pW, v.x));
                const y = Math.max(0, Math.min(window.innerHeight - Math.min(pH, 80), v.y));
                return { x, y };
            }
            return null;
        } catch { return null; }
    }

    private enterFreeMode(pos: { x: number; y: number }): void {
        if (!this.panelEl) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const x = Math.max(0, Math.min(w - 100, pos.x));
        const y = Math.max(0, Math.min(h - 100, pos.y));
        this.panelEl.classList.add("ebc-free-mode");
        this.panelEl.style.left = `${x}px`;
        this.panelEl.style.top  = `${y}px`;
        if (this.resetLocationBtn) this.resetLocationBtn.style.display = "";
    }

    private exitFreeMode(): void {
        if (!this.panelEl) return;
        this.panelEl.classList.remove("ebc-free-mode");
        this.panelEl.style.left = "";
        this.panelEl.style.top  = "";
        if (this.resetLocationBtn) this.resetLocationBtn.style.display = "none";
    }

    // Reads CRABS's #drawer-tab position and updates our tab's top accordingly.
    // Skipped entirely when the user has pinned a custom position via drag.
    // Safe to call at any frequency — writes the DOM only when the value changes.
    private updateCrabsPosition(): void {
        if (!this.rootEl) return;

        // Heartbeat guard: BC's screen-transition code can set display:none on unknown
        // DOM elements. Restore visibility within one 200 ms poller tick if that happens.
        if (this.positioned && this.rootEl.style.display !== "block") {
            this.rootEl.style.display = "block";
        }

        if (!this.positioned) {
            // Haven't anchored to the chat log yet — keep retrying until we succeed.
            this.syncToChat();
            return;
        }
        if (this.tabDragging) return; // don't interfere with an active drag
        const tabEl = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
        if (!tabEl) return;

        // Once a saved position is confirmed or absent, skip polling storage.
        if (this.userTabOffset !== null) return; // user has pinned a position — don't override

        // Keep retrying storage until we either load a value or confirm none exists.
        // ExtensionSettings is restored from the server asynchronously after ChatRoomSync,
        // so the first few polls may see an empty store even if a position was saved.
        if (!this.tabOffsetChecked) {
            const saved = this.loadTabOffset();
            if (saved !== null) {
                this.userTabOffset = saved;
                this.applyTabOffset(tabEl, saved);
                return;
            }
            // Only stop polling once ExtensionSettings has fully loaded (EmeryBC key exists)
            try {
                if (Player.ExtensionSettings.EmeryBC !== undefined) this.tabOffsetChecked = true;
            } catch { /* ignore */ }
        }

        const crabsTab = document.getElementById("drawer-tab");
        if (!crabsTab) return; // CRABS absent — CSS default (top:58px) stays

        const crabsRect = crabsTab.getBoundingClientRect();
        if (crabsRect.bottom === this.lastCrabsBottom) return; // nothing changed

        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog) return;
        const chatRect = chatLog.getBoundingClientRect();
        const tabTop = Math.max(4, crabsRect.bottom + 8 - chatRect.top);
        tabEl.style.top = `${tabTop}px`;
        this.lastCrabsBottom = crabsRect.bottom;
    }

    // Called every 200ms by the CRABS poller — piggyback a 30s friend-list poll.
    // Runs regardless of which tab is active so that online-status changes are always
    // detected and offline-beep re-delivery fires even when the notes tab is closed.
    private tickFriendPoll(): void {
        this.friendPollTick++;
        if (this.friendPollTick >= 150) { // 150 × 200ms = 30 s
            this.friendPollTick = 0;
            try { ServerSend("AccountQuery", { Query: "OnlineFriends" }); } catch { /* ignore */ }
        }
    }

    // Poll CRABS's tab position while in a chat room so we stay in sync even
    // if CRABS repositions itself after our ResizeObserver already fired.
    private startCrabsPoller(): void {
        if (this.crabsPoller !== null) return;
        this.crabsPoller = window.setInterval(() => { this.updateCrabsPosition(); this.tickFriendPoll(); }, 200);
    }

    private stopCrabsPoller(): void {
        if (this.crabsPoller === null) return;
        window.clearInterval(this.crabsPoller);
        this.crabsPoller = null;
        this.lastCrabsBottom = -1;
    }

    // -- Visibility ------------------------------------------------------------

    public updateVisibility(): void {
        if (!this.rootEl || !this.panelEl) return;
        const inRoom = typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";

        // Tabs that only make sense inside a chatroom — hidden when outside one
        const ROOM_ONLY: DrawerTab[] = ["anims"];

        if (!inRoom) {
            // ── Outside chatroom: floating panel anchored to the right edge ───────
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            this.stopCrabsPoller();
            this.stopTimerPoller();

            // Keep beep windows hidden outside a room
            for (const { el } of this.beepWins.values()) el.style.display = "none";

            // Force-hide room-only tab buttons; jump to a safe tab if we're on one
            for (const tabId of ROOM_ONLY) {
                const btn = this.rootEl.querySelector<HTMLElement>(`#ebc-tab-${tabId}`);
                if (btn) btn.style.display = "none";
            }
            if ((ROOM_ONLY as string[]).includes(this.currentTab)) this.switchTab("outfits");

            // Roaming mode: root at right:0 so the closed panel (translateX(W+60))
            // lands at vw+16 — completely off-screen.  A CSS class keeps the tab
            // fully visible (overrides the in-room left:-10px collapsed state).
            // Centre the panel vertically in the viewport.
            this.rootEl.classList.add("ebc-roaming");
            const h = Math.min(Math.max(300, Math.round(window.innerHeight * 0.65)), 520);
            const top = Math.max(20, Math.round((window.innerHeight - h) / 2));
            this.rootEl.style.top    = `${top}px`;
            this.rootEl.style.right  = "0px";
            this.rootEl.style.height = `${h}px`;
            this.panelEl.style.height = `${h}px`;
            // Mark as not anchored to the chat log so syncToChat re-runs on next room enter
            this.positioned = false;
            this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
            this.tabOffsetChecked = false;

            // Show (suppress CSS transition on the very first reveal)
            if (!this.hasBeenShown) {
                this.hasBeenShown = true;
                this.panelEl.style.transition = "none";
                this.rootEl.style.display = "block";
                requestAnimationFrame(() => { if (this.panelEl) this.panelEl.style.transition = ""; });
            } else {
                this.rootEl.style.display = "block";
            }
            return;
        }

        // ── In chatroom: restore room-only tabs and re-anchor to the chat log ────

        // Drop roaming mode so normal closed-tab CSS applies again
        this.rootEl.classList.remove("ebc-roaming");

        // Restore room-only tab buttons (respects user hidden-tab preferences)
        this.applyTabVisibility();

        // Restore any beep windows that were hidden while outside the chat room
        for (const { el } of this.beepWins.values()) el.style.display = "";

        // Re-open any windows that were open in a previous session (survived relog),
        // starting them minimized so they don't flood the screen on login.
        for (const num of EBCDrawer.getOpenBeepWindows()) {
            if (!this.beepWins.has(num)) {
                try { this.openBeepWindow(num, true); } catch { /* ignore */ }
            }
        }

        // Always make the root visible immediately — do NOT gate on syncToChat().
        // BC can temporarily clear or resize TextAreaChatLog during screen transitions
        // (reconnect, room load, character menus) causing syncToChat() to fail, which
        // previously left the root hidden indefinitely. Visibility and positioning are
        // now separate concerns: show first, position best-effort.
        if (!this.hasBeenShown) {
            // Suppress the slide transition on the very first reveal — switching from
            // display:none to display:block can cause the browser to animate the
            // transform from an unrendered state, making the panel flash visible.
            this.hasBeenShown = true;
            if (this.panelEl) this.panelEl.style.transition = "none";
            this.rootEl.style.display = "block";
            requestAnimationFrame(() => { if (this.panelEl) this.panelEl.style.transition = ""; });
        } else {
            this.rootEl.style.display = "block";
        }

        // Position against the chat log (best-effort; retry next frame if not ready yet).
        if (!this.syncToChat()) {
            requestAnimationFrame(() => { this.syncToChat(); });
        }

        if (!this.resizeObserver && typeof ResizeObserver !== "undefined") {
            const chatLog = document.getElementById("TextAreaChatLog");
            if (chatLog) {
                this.resizeObserver = new ResizeObserver(() => this.syncToChat());
                this.resizeObserver.observe(chatLog);
            }
        }

        // Keep EBC tab locked below CRABS regardless of who repositions first.
        this.startCrabsPoller();
        this.startTimerPoller();

        // Re-read persisted settings — BC may restore ExtensionSettings after the
        // drawer is first built, so we refresh any toggles that depend on them.
        try { this.refreshConfirmToggle?.(); } catch { /* ignore */ }
        try { this.refreshSwEnableBtn?.();   } catch { /* ignore */ }
    }

    // -- Interactive guide ─────────────────────────────────────────────────────

    // Guide steps. Use [[text]] for pink highlighted chips, ((text)) for a small italic note line.
    private static readonly GUIDE_STEPS: Array<{
        tab: DrawerTab | null;
        label: string;
        text: string;
        spotlight?: string[]; // extra CSS selectors to spotlight beyond the tab button
    }> = [
        {
            tab: null,
            label: "✨ Welcome to EBC",
            text: "This guide walks you through every feature step by step.\nThe menu will switch tabs automatically as you go — just hit [[Next →]].\n((EBC adds outfit saving, action buttons, pose animations, friend notes, and custom name tags above players' heads.))",
        },
        {
            tab: null,
            label: "🔑 Opening & Moving the Menu",
            text: "Press your [[Hotkey]] (set in DEV → Preferences) to open and close the menu instantly from anywhere.\nDrag the [[⠿]] handle in the header to move the panel to any spot on screen.\n[[↻]] refreshes your friend list and room data.  [[✕]] closes the panel.\n((The [[?]] button in the header re-opens this guide any time.))",
        },
        {
            tab: "outfits",
            label: "👗 Outfits — Save & Apply Looks",
            text: "Click [[💾 Save]] to store your current full appearance as a named preset.\nClick any saved outfit card to [[Apply]] it — restoring every clothing layer and colour instantly.\nUse [[✏]] to rename, [[🗑]] to delete, and the [[↑ ↓]] arrows to reorder your list.\n((Great for switching between different roleplay or casual looks in seconds.))",
        },
        {
            tab: "outfits",
            label: "🏷 Outfit Tags & Schedules",
            text: "Create [[Tags]] to organise outfits into groups (e.g. Casual, Events, Roleplay).\nClick the [[🏷]] icon on any outfit card to assign tags — then filter by tag at the top of the list.\n[[Schedules]] let EBC auto-switch your outfit at set times of day. Expand the [[Schedules]] section at the bottom of this tab to set one up.\n((You can also [[📤 Export]] outfits as codes and share them — use [[📥 Import]] to load a code someone sent you.))",
        },
        {
            tab: "buttons",
            label: "🎛 Action Buttons — Quick Commands",
            text: "Buttons let you fire BC commands, emotes, poses, or expressions with a single tap.\nClick [[+ Add button]] to create one and choose a type: [[Emote]], [[Command]], [[Pose]], or [[Expression]].\nDrag the [[⠿]] handle on a button card to reorder it. [[✏]] edits it, [[🗑]] deletes it.\n[[Categories]] (the row above the buttons) let you group buttons — click a category name to filter to just that group.",
        },
        {
            tab: "buttons",
            label: "🚶 Slow Leave",
            text: "[[Slow Leave]] is in the [[Useful Buttons]] section — it sends a scripted departure sequence to the room before you leave, so it feels natural and in-character.\nClick the [[Slow Leave]] button to start the sequence.\nExpand the [[▶ Slow Leave]] accordion below the button to customise:\n  • [[Preset]] — pick a pre-written departure style\n  • [[Sequence]] — the text sent to the room\n  • [[Duration]] — time (in seconds) between messages",
            spotlight: ["[data-guide-target='section-useful-btns']", "[data-guide-target='btn-slow-leave']"],
        },
        {
            tab: "anims",
            label: "🎭 Poses & Animations",
            text: "Pose combos chain multiple pose changes together with delays — perfect for transition animations or emote sequences.\nClick [[+ New combo]] to create one, add steps with poses or emotes, then assign a [[/command]] name.\nType [[/yourcommand]] directly in the BC chat box to trigger it — no need to open the menu.\n((Combos can mix [[Pose]] steps and [[Emote]] steps so messages appear alongside pose changes.))",
            spotlight: ["[data-guide-target='btn-new-combo']"],
        },
        {
            tab: "notes",
            label: "👥 Users & Friends",
            text: "The Users tab shows everyone in your current room plus your friends list.\nClick [[★]] on any person to highlight them with a golden nameplate — perfect for marking close friends.\nExpand a person's card to [[💬 Whisper]] them, copy their [[#ID]], or open their [[Profile]].\n((The [[People Met]] history in DEV → Logs persists between sessions — a permanent address book of everyone you've encountered.))",
        },
        {
            tab: "dev",
            label: "⚙ DEV — Preferences & Themes",
            text: "[[Quick Preset]] lets you apply a full colour theme instantly — try Rose, Midnight, Ocean and more.\nAdjust [[Panel Opacity]] and [[Zoom]] to suit your screen size.\nSet a [[Hotkey]] so you can open/close the menu with a single key press.\n[[Visible Tabs]] hides tabs you don't use, keeping the menu clean.\n((The [[Pinned strip visibility]] section lets you choose which tabs show the Safewords and EBC Tag Settings strips.))",
        },
        {
            tab: "dev",
            label: "📋 DEV — Logs & History",
            text: "[[Whisper Log]] — every whisper sent and received this session.\n[[Current Room]] — who is in your room right now, with member IDs.\n[[Rooms Visited]] — all rooms you've entered this session.\n[[Restraint Log]] — when items were applied or removed.\n[[People Met]] — persists between sessions, a permanent record of everyone you've encountered.\n((All logs are session-only except People Met, which saves to BC's extension settings.))",
        },
        {
            tab: null,
            label: "🏷 EBC Tag Settings Strip",
            text: "The [[EBC TAG SETTINGS]] bar is pinned above the tab area — click its header to expand it.\n[[My tag]] — shows your custom badge above your own head.\n[[Others]] — shows badges above other EBC users' heads.\nChoose [[Text]] (flat name pill) or [[Cat]] (cat-face icon) style for yourself and others independently.\n[[Scale]] sliders resize each style separately. Use [[📍 Text]] and [[📍 Cat]] buttons to drag each badge to its exact position on screen.",
        },
        {
            tab: null,
            label: "🛡 Safewords Strip",
            text: "The [[SAFEWORDS]] bar is always pinned at the top of the panel — reachable instantly no matter which tab you're on.\nSet up to [[3 safewords]] — clicking one sends a pre-written safety message to the room immediately.\nConfigure a [[Grace period]] (in minutes) to prevent accidental taps, and enable a [[Confirm step]] for extra safety.\n((Both the Safewords and EBC Tags strips can be hidden per-tab in [[DEV → Pinned strip visibility]].))",
        },
        {
            tab: null,
            label: "💡 Tips & Tricks",
            text: "• Type [[/command]] in BC chat to trigger a pose combo by name.\n• Press your [[Hotkey]] (DEV → Preferences) to open/close the menu instantly.\n• Drag the [[⠿]] handle in the header to move the panel anywhere on screen.\n• [[↻]] refreshes your room list and friend data.\n• The [[?]] button in the header reopens this guide any time.\n• Use [[📤 Export]] on outfits to share them as codes with friends.\n((Tip: keep the Safewords strip visible on all tabs — you never know when you'll need it quickly.))",
        },
    ];

    private startGuide(): void {
        // Tear down any previous instance
        if (this.guideEl) { this.guideEl.remove(); this.guideEl = null; }

        // Create the floating side panel and position it beside the EBC panel
        const side = document.createElement("div");
        side.className = "ebc-guide-side";

        // Pick a side (prefer left; fall back to right if not enough room)
        const panelRect = this.panelEl?.getBoundingClientRect() ?? { left: 0, right: 360, top: 60, bottom: 700 };
        const gw = 248; // panel width + gap
        let left: number;
        if (panelRect.left >= gw + 4) {
            left = panelRect.left - gw;
        } else {
            left = (panelRect.right ?? 360) + 8;
        }
        left = Math.max(4, Math.min(window.innerWidth - gw - 4, left));
        const top  = Math.max(4, Math.min(window.innerHeight - 60, panelRect.top ?? 60));

        side.style.left = `${left}px`;
        side.style.top  = `${top}px`;

        document.body.appendChild(side);
        this.guideEl   = side;
        this.guideStep = 0;
        this.renderGuideStep();
    }

    // Parses simple inline markup in guide text:
    //   [[text]]   → <span class="ebc-guide-hl">text</span>  (pink chip highlight)
    //   ((text))   → <span class="ebc-guide-note">text</span> (small italic note, full line)
    //   \n         → line break
    private static parseGuideMarkup(raw: string, container: HTMLElement): void {
        // Split on \n first, then process each line for inline markup
        const lines = raw.split("\n");
        for (let li = 0; li < lines.length; li++) {
            if (li > 0) container.appendChild(document.createElement("br"));
            const line = lines[li];

            // Check if entire line is a ((note))
            const noteMatch = /^\(\((.+?)\)\)$/.exec(line);
            if (noteMatch) {
                const note = document.createElement("span");
                note.className = "ebc-guide-note";
                // parse inline [[hl]] inside the note too
                EBCDrawer.parseInlineHighlights(noteMatch[1], note);
                container.appendChild(note);
                continue;
            }

            EBCDrawer.parseInlineHighlights(line, container);
        }
    }

    private static parseInlineHighlights(line: string, container: HTMLElement): void {
        const parts = line.split(/(\[\[.+?\]\])/);
        for (const part of parts) {
            const m = /^\[\[(.+?)\]\]$/.exec(part);
            if (m) {
                const hl = document.createElement("span");
                hl.className = "ebc-guide-hl";
                hl.textContent = m[1];
                container.appendChild(hl);
            } else if (part) {
                container.appendChild(document.createTextNode(part));
            }
        }
    }

    private renderGuideStep(): void {
        // Clear spotlights from the previous step before building the new one
        this.clearGuideSpotlights();

        const card = this.guideEl;
        if (!card) return;

        const steps = EBCDrawer.GUIDE_STEPS;
        const step  = steps[this.guideStep];
        if (!step) return;

        // Switch to the relevant tab
        if (step.tab && step.tab !== this.currentTab) {
            this.switchTab(step.tab);
        }

        card.innerHTML = "";
        card.style.display = "";

        // Top row: step counter + close
        const top = document.createElement("div");
        top.className = "ebc-guide-top";

        const stepLbl = document.createElement("span");
        stepLbl.className = "ebc-guide-step-lbl";
        stepLbl.textContent = `Step ${this.guideStep + 1} / ${steps.length}`;

        const closeX = document.createElement("button");
        closeX.className = "ebc-guide-close-btn";
        closeX.textContent = "✕";
        closeX.title = "Close guide";
        closeX.addEventListener("click", () => this.closeGuide());

        top.appendChild(stepLbl);
        top.appendChild(closeX);
        card.appendChild(top);

        // Section label
        const tabLbl = document.createElement("div");
        tabLbl.className = "ebc-guide-tab-lbl";
        tabLbl.textContent = step.label;
        card.appendChild(tabLbl);

        // Description text with markup support
        const textEl = document.createElement("div");
        textEl.className = "ebc-guide-text";
        EBCDrawer.parseGuideMarkup(step.text, textEl);
        card.appendChild(textEl);

        // Nav row: prev · dots · next
        const nav = document.createElement("div");
        nav.className = "ebc-guide-nav";

        const prevBtn = document.createElement("button");
        prevBtn.className = "ebc-guide-nav-btn";
        prevBtn.textContent = "← Prev";
        if (this.guideStep === 0) prevBtn.disabled = true;
        prevBtn.addEventListener("click", () => { this.guideStep--; this.renderGuideStep(); });

        const dots = document.createElement("div");
        dots.className = "ebc-guide-dots";
        for (let i = 0; i < steps.length; i++) {
            const dot = document.createElement("div");
            dot.className = "ebc-guide-dot" + (i === this.guideStep ? " active" : "");
            dots.appendChild(dot);
        }

        const nextBtn = document.createElement("button");
        nextBtn.className = "ebc-guide-nav-btn";
        if (this.guideStep === steps.length - 1) {
            nextBtn.textContent = "Done ✓";
            nextBtn.addEventListener("click", () => this.closeGuide());
        } else {
            nextBtn.textContent = "Next →";
            nextBtn.addEventListener("click", () => { this.guideStep++; this.renderGuideStep(); });
        }

        nav.appendChild(prevBtn);
        nav.appendChild(dots);
        nav.appendChild(nextBtn);
        card.appendChild(nav);

        // ── Spotlight UI elements this step is describing ─────────────────────
        // Tab button: whenever the guide is on a tab-specific step, glow the tab
        if (step.tab) {
            const tabIdMap: Record<string, string> = { anims: "poses" };
            const tabBtnId = tabIdMap[step.tab] ?? step.tab;
            // Delay slightly so the tab re-render finishes before we add the class
            window.setTimeout(() => this.spotlightEl(`#ebc-tab-${tabBtnId}`), 60);
        }
        // Additional per-step element spotlights
        if (step.spotlight?.length) {
            window.setTimeout(() => {
                for (const sel of step.spotlight!) this.spotlightEl(sel);
            }, 80);
        }
    }

    private closeGuide(): void {
        this.clearGuideSpotlights();
        if (this.guideEl) { this.guideEl.remove(); this.guideEl = null; }
    }

    private clearGuideSpotlights(): void {
        this.rootEl?.querySelectorAll(".ebc-guide-spotlight")
            .forEach(el => el.classList.remove("ebc-guide-spotlight"));
    }

    private spotlightEl(selector: string): void {
        try {
            const el = this.rootEl?.querySelector(selector);
            if (el) el.classList.add("ebc-guide-spotlight");
        } catch { /* ignore invalid selector */ }
    }

    // -- Tab switching ---------------------------------------------------------

    private stopDevLogPoller(): void {
        if (this.devLogPoller !== null) {
            window.clearInterval(this.devLogPoller);
            this.devLogPoller = null;
        }
    }

    private switchTab(tab: DrawerTab): void {
        this.stopDevLogPoller();
        if (tab !== "notes") this.friendsSectionEl = null;
        this.currentTab = tab;
        if (tab === "notes") {
            this.friendPollTick = 0;
            try { ServerSend("AccountQuery", { Query: "OnlineFriends" }); } catch { /* ignore */ }
        }

        for (const [id, name] of [
            ["ebc-tab-outfits", "outfits"],
            ["ebc-tab-poses",   "anims"],
            ["ebc-tab-buttons", "buttons"],
            ["ebc-tab-notes",    "notes"],
            ["ebc-tab-thanks",  "thanks"],
            ["ebc-tab-dev",     "dev"],
            ["ebc-tab-dom",     "dom"],
            ["ebc-tab-puppy",   "puppy"],
            ["ebc-tab-kitty",   "kitty"],
        ] as [string, DrawerTab][]) {
            const el = this.rootEl?.querySelector(`#${id}`);
            if (el) el.className = "ebc-tab-btn" + (tab === name ? " ebc-tab-active" : "");
        }

        this.renderCurrentTab();
        try { this.updatePinnedStrips(); } catch { /* ignore */ }
    }

    private renderCurrentTab(): void {
        if      (this.currentTab === "outfits")  this.renderOutfits();
        else if (this.currentTab === "anims")    this.renderPoses();
        else if (this.currentTab === "buttons")  this.renderButtons();
        else if (this.currentTab === "notes")    this.renderNotes();
        else if (this.currentTab === "thanks")   this.renderThanks();
        else if (this.currentTab === "dev")      this.renderDev();
        else if (this.currentTab === "dom")      this.renderDomTools();
        else if (this.currentTab === "puppy")    this.renderPuppy();
        else if (this.currentTab === "kitty")    this.renderKittyTab();
    }

    /** Show or hide each pinned strip based on the active tab and the stored filter. */
    private updatePinnedStrips(): void {
        const tab = this.currentTab;
        if (this.safewordRowEl) {
            const f = loadStripTabFilter("EBC_swTabFilter");
            this.safewordRowEl.style.display = (!f || f.has(tab)) ? "flex" : "none";
        }
        if (this.ebcTagsStripEl) {
            const f = loadStripTabFilter("EBC_tagsTabFilter");
            this.ebcTagsStripEl.style.display = (!f || f.has(tab)) ? "" : "none";
        }
    }

    /**
     * Apply the stored panel opacity to the .ebc-panel element.
     * At opacity 1 the panel is fully opaque (no backdrop blur).
     * Below 1 the background becomes semi-transparent and a proportional blur
     * is added so the frosted-glass effect looks intentional.
     */
    applyPanelOpacity(alpha = loadPanelOpacity()): void {
        const panel = this.rootEl?.querySelector(".ebc-panel") as HTMLElement | null;
        if (!panel) return;
        panel.style.background = `rgba(27, 13, 23, ${alpha})`;
        const style = panel.style as CSSStyleDeclaration & { webkitBackdropFilter?: string };
        if (alpha < 0.99) {
            const blur = `blur(${Math.round((1 - alpha) * 20)}px)`;
            panel.style.backdropFilter = blur;
            if (style.webkitBackdropFilter !== undefined) style.webkitBackdropFilter = blur;
        } else {
            panel.style.backdropFilter = "none";
            if (style.webkitBackdropFilter !== undefined) style.webkitBackdropFilter = "none";
        }
    }

    /** Scale the entire EBC panel.
     *
     * Applies transform:scale() to .ebc-zoom-wrapper (an inner div containing
     * all panel content), NOT to #emerybc-panel (the slide container).
     * transform doesn't affect layout outside the wrapper, so the slide
     * container never changes size and its transition never misfires.
     *
     * Inverse sizing (width/height = 100/scale %) ensures the scaled wrapper
     * fills .ebc-panel exactly — no overflow, no clipping, no background bleed.
     * Rapid slider changes are completely smooth since no layout reflow occurs
     * on the outer container.
     */
    applyPanelZoom(scale = loadPanelZoom()): void {
        const wrapper = this.rootEl?.querySelector(".ebc-zoom-wrapper") as HTMLElement | null;
        if (!wrapper) return;
        if (scale === 1) {
            wrapper.style.transform = "";
            wrapper.style.width     = "100%";  // must keep 100% — clearing to "" removes the
            wrapper.style.height    = "100%";  // inline height, collapsing the wrapper to content
        } else {                               // height and breaking flex scroll + footer layout.
            // inv% × scale = 100% → scaled content fills .ebc-panel exactly.
            const inv = (100 / scale).toFixed(4) + "%";
            wrapper.style.transform = `scale(${scale})`;
            wrapper.style.width     = inv;
            wrapper.style.height    = inv;
        }
    }

    /**
     * Re-render the current tab in-place while preserving the panel's scroll
     * position.  All within-tab actions (save, delete, reorder, etc.) should
     * call this instead of renderCurrentTab() directly so the user doesn't
     * get snapped back to the top of the list after every interaction.
     *
     * Tab *switches* intentionally bypass this and call renderCurrentTab()
     * directly so the new tab always starts at the top.
     */
    private rerender(delay = 0): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        const scroll = body?.scrollTop ?? 0;
        const doRender = (): void => {
            this.renderCurrentTab();
            if (body) body.scrollTop = scroll;
        };
        if (delay > 0) window.setTimeout(doRender, delay);
        else doRender();
    }

    /** Update every static element that was built once in setup() and never re-rendered. */
    private updateStaticTranslations(): void {
        const r = this._i18nRefs;
        // Header
        if (r.refreshBtn)  r.refreshBtn.title = t("header.refresh");
        if (r.moveHandle)  r.moveHandle.title = t("header.dragToMove");
        if (r.resetLocBtn) { r.resetLocBtn.title = t("header.resetPosTitle"); r.resetLocBtn.textContent = t("header.resetPos"); }
        if (r.closeBtn)    r.closeBtn.title = t("header.close");
        // Sync language pill active state
        this._langPillsRefresh?.();
        // Tabs
        if (r.tabOutfits) r.tabOutfits.textContent = t("tabs.outfits");
        if (r.tabButtons) { r.tabButtons.textContent = t("tabs.buttons"); r.tabButtons.title = t("tabs.buttonsTitle"); }
        if (r.tabAnims)   r.tabAnims.textContent = t("tabs.anims");
        if (r.tabNotes) {
            const lbl = r.tabNotes.querySelector("span:first-child");
            if (lbl) lbl.textContent = t("tabs.users");
            r.tabNotes.title = t("tabs.usersTitle");
        }
        if (r.tabThanks)  { r.tabThanks.textContent = t("tabs.credits"); r.tabThanks.title = t("tabs.creditsTitle"); }
        if (r.tabDev)     { r.tabDev.textContent = t("tabs.dev"); r.tabDev.title = t("tabs.devTitle"); }
        if (r.tabDom)     { r.tabDom.textContent = t("tabs.dom"); r.tabDom.title = t("tabs.domTitle"); }
        if (r.tabPuppy)   r.tabPuppy.title = t("tabs.puppy");
        if (r.tabKitty)   r.tabKitty.title = t("tabs.kitty");
        // Quick actions
        if (r.releaseBtn) { r.releaseBtn.textContent = t("qa.releaseRestraints"); r.releaseBtn.title = t("qa.releaseTitle"); }
        if (r.unlockBtn)  { r.unlockBtn.textContent = t("qa.removeLocks"); r.unlockBtn.title = t("qa.removeLocksTitle"); }
        if (r.qaConfirmLbl) r.qaConfirmLbl.textContent = t("qa.confirmBeforeEscaping");
        if (r.qaConfirmToggle) this.refreshConfirmToggle?.();
        if (r.pickBtn) { r.pickBtn.textContent = t("qa.pickRestraints"); r.pickBtn.title = t("qa.pickTitle"); }
        // EBC tags strip is a persistent DOM section — rebuild it so all labels re-translate
        this.rebuildEbcTagsStrip();
    }

    // -- EBC Tags strip builder (called once on setup and again on every lang change) --

    private rebuildEbcTagsStrip(): void {
        const strip = this.ebcTagsStripEl;
        if (!strip) return;

        // Clear existing children
        while (strip.firstChild) strip.removeChild(strip.firstChild);

        let ebcTagsCollapsed = false;
        try { const v = localStorage.getItem("EBC_tagsCollapsed"); if (v !== null) ebcTagsCollapsed = v === "1"; } catch { /* ignore */ }

        // Header row — clickable to collapse
        const ebcTagsHdr = document.createElement("div");
        ebcTagsHdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:5px 10px 4px;cursor:pointer;user-select:none;transition:background 0.1s;";
        ebcTagsHdr.title = "Click to show / hide";
        ebcTagsHdr.addEventListener("mouseenter", () => { ebcTagsHdr.style.background = "#251220"; });
        ebcTagsHdr.addEventListener("mouseleave", () => { ebcTagsHdr.style.background = ""; });

        const ebcTagsHdrLeft = document.createElement("div");
        ebcTagsHdrLeft.style.cssText = "display:flex;align-items:center;gap:6px;";
        const ebcTagsHdrLabel = document.createElement("span");
        ebcTagsHdrLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;letter-spacing:0.06em;color:#c8809a;";
        ebcTagsHdrLabel.textContent = t("dev.ebcTags");
        ebcTagsHdrLeft.appendChild(ebcTagsHdrLabel);

        const ebcTagsChev = document.createElement("span");
        ebcTagsChev.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;color:#d090a8;padding:3px 10px;border:1px solid #7a3050;border-radius:4px;background:#2e1020;";

        ebcTagsHdr.appendChild(ebcTagsHdrLeft);
        ebcTagsHdr.appendChild(ebcTagsChev);
        strip.appendChild(ebcTagsHdr);

        // Body
        const ebcTagsBody = document.createElement("div");
        ebcTagsBody.className = "ebc-tags-body";
        ebcTagsBody.style.cssText = "padding:0 10px 9px;background:#1a0d16;";

        // Description line
        const ebcTagsDesc = document.createElement("div");
        ebcTagsDesc.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;line-height:1.45;margin-bottom:7px;padding-top:5px;";
        ebcTagsDesc.textContent = t("strip.tagToggleDesc");
        ebcTagsBody.appendChild(ebcTagsDesc);

        // Tag toggle cards
        const ebcTagsCardRow = document.createElement("div");
        ebcTagsCardRow.style.cssText = "display:flex;gap:7px;";

        const makeTagCard = (
            label: string,
            sublabel: string,
            getVal: () => boolean,
            setVal: (v: boolean) => void,
            container: HTMLElement,
        ): void => {
            const card = document.createElement("div");
            card.title = sublabel;

            const cardTop = document.createElement("div");
            cardTop.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:3px;";
            const cardLabel = document.createElement("span");
            cardLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;";
            cardLabel.textContent = label;
            cardTop.appendChild(cardLabel);

            const cardSub = document.createElement("div");
            cardSub.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;line-height:1.4;margin-bottom:6px;";
            cardSub.textContent = sublabel;

            const cardStatus = document.createElement("div");
            cardStatus.style.cssText = "display:inline-flex;align-items:center;gap:3px;font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:2px 8px;border-radius:10px;";

            const cardDot = document.createElement("span");
            cardDot.style.cssText = "width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0;";

            cardStatus.appendChild(cardDot);
            const cardStatusText = document.createElement("span");
            cardStatus.appendChild(cardStatusText);

            card.appendChild(cardTop);
            card.appendChild(cardSub);
            card.appendChild(cardStatus);

            const refresh = (): void => {
                const on = getVal();
                card.style.cssText = `flex:1;border-radius:6px;padding:7px 8px 6px;cursor:pointer;user-select:none;transition:background 0.12s,border-color 0.12s;border:1px solid ${on ? "#8a3458" : "#321220"};background:${on ? "#2e1020" : "#150a10"};`;
                cardLabel.style.color = on ? "#f0c0d8" : "#7a4a60";
                cardSub.style.color = on ? "#b08898" : "#6a4050";
                cardDot.style.background = on ? "#d06090" : "#4a2038";
                cardStatus.style.background = on ? "#3d1228" : "#1e0c16";
                cardStatus.style.color = on ? "#f0a0c8" : "#6a4050";
                cardStatusText.textContent = on ? t("core.on") : t("core.off");
            };
            refresh();
            card.addEventListener("click", () => { setVal(!getVal()); refresh(); });
            container.appendChild(card);
        };

        makeTagCard(t("strip.myTag"), t("strip.myTagSub"), getBadgeEnabled, setBadgeEnabled, ebcTagsCardRow);
        makeTagCard(t("strip.others"), t("strip.othersSub"), getShowOthersBadge, setShowOthersBadge, ebcTagsCardRow);
        ebcTagsBody.appendChild(ebcTagsCardRow);

        // Version display row
        const versionRowLbl = document.createElement("div");
        versionRowLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;letter-spacing:0.08em;color:#6a4060;text-transform:uppercase;margin:6px 0 4px;";
        versionRowLbl.textContent = t("strip.versionDisplay");
        ebcTagsBody.appendChild(versionRowLbl);

        const versionCardRow = document.createElement("div");
        versionCardRow.style.cssText = "display:flex;gap:7px;";
        makeTagCard(t("strip.myVersion"), t("strip.myVersionSub"), getShowVersionBadge, setShowVersionBadge, versionCardRow);
        makeTagCard(t("strip.othersVersion"), t("strip.othersVersionSub"), getShowOthersVersionBadge, setShowOthersVersionBadge, versionCardRow);
        ebcTagsBody.appendChild(versionCardRow);

        // Badge Appearance divider
        const badgeDivider = document.createElement("div");
        badgeDivider.style.cssText = "height:1px;background:#2a1421;margin:8px 0 7px;";
        ebcTagsBody.appendChild(badgeDivider);

        const badgeAppLbl = document.createElement("div");
        badgeAppLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;letter-spacing:0.08em;color:#6a4060;text-transform:uppercase;margin:2px 0 6px;";
        badgeAppLbl.textContent = t("strip.badgeAppearance");
        ebcTagsBody.appendChild(badgeAppLbl);

        // Style picker: Text | Cat
        const buildStyleRow = (getter: () => BadgeStyle, setter: (v: BadgeStyle) => void): void => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;gap:5px;margin-bottom:5px;";
            const makeBtn = (styleName: BadgeStyle, labelText: string): HTMLButtonElement => {
                const btn = document.createElement("button");
                btn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;border-radius:6px;cursor:pointer;padding:5px 4px;transition:background 0.12s,border-color 0.12s,color 0.12s;";
                btn.textContent = labelText;
                const refresh = (): void => {
                    const active = getter() === styleName;
                    btn.style.background = active ? "#2e1020" : "#150a10";
                    btn.style.border     = `1px solid ${active ? "#8a3458" : "#321220"}`;
                    btn.style.color      = active ? "#f0c0d8" : "#7a4a60";
                };
                refresh();
                btn.addEventListener("click", () => {
                    setter(styleName);
                    row.querySelectorAll<HTMLButtonElement>("button").forEach(b => b.dispatchEvent(new Event("ebc-refresh")));
                    refresh();
                });
                btn.addEventListener("ebc-refresh", refresh);
                return btn;
            };
            row.appendChild(makeBtn("text", t("strip.styleBtnText")));
            row.appendChild(makeBtn("cat",  t("strip.styleBtnCat")));
            ebcTagsBody.appendChild(row);
        };

        const myStyleLbl = document.createElement("div");
        myStyleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;letter-spacing:0.06em;color:#8a5070;text-transform:uppercase;margin-bottom:3px;";
        myStyleLbl.textContent = t("strip.myStyle");
        ebcTagsBody.appendChild(myStyleLbl);
        buildStyleRow(getBadgeStyle, setBadgeStyle);

        const othersStyleLbl = document.createElement("div");
        othersStyleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;letter-spacing:0.06em;color:#8a5070;text-transform:uppercase;margin-top:4px;margin-bottom:3px;";
        othersStyleLbl.textContent = t("strip.othersStyle");
        ebcTagsBody.appendChild(othersStyleLbl);
        buildStyleRow(getOthersBadgeStyle, setOthersBadgeStyle);

        // Per-style scale sliders
        const makeScaleRow = (labelText: string, getVal: () => number, setVal: (v: number) => void): void => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
            const lbl = document.createElement("span");
            lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;flex-shrink:0;min-width:54px;";
            lbl.textContent = labelText;
            const slider = document.createElement("input");
            slider.type  = "range"; slider.min = "0.3"; slider.max = "3"; slider.step = "0.05";
            slider.value = String(getVal());
            slider.style.cssText = "flex:1;accent-color:#cf6f98;cursor:pointer;min-width:0;";
            slider.title = "Scale multiplier (1.0 = default)";
            const valLbl = document.createElement("span");
            valLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;min-width:32px;text-align:right;flex-shrink:0;";
            valLbl.textContent = getVal().toFixed(2) + "×";
            slider.addEventListener("input", () => { const v = parseFloat(slider.value); setVal(v); valLbl.textContent = v.toFixed(2) + "×"; });
            row.appendChild(lbl); row.appendChild(slider); row.appendChild(valLbl);
            ebcTagsBody.appendChild(row);
        };

        const scaleSectionLbl = document.createElement("div");
        scaleSectionLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;letter-spacing:0.08em;color:#6a4060;text-transform:uppercase;margin:2px 0 5px;";
        scaleSectionLbl.textContent = t("strip.scale");
        ebcTagsBody.appendChild(scaleSectionLbl);
        makeScaleRow(t("strip.styleBtnText"), getTextBadgeScale, setTextBadgeScale);
        makeScaleRow(t("strip.styleBtnCat"),  getCatBadgeScale,  setCatBadgeScale);

        // Opacity sliders
        const makeOpacitySliderRow = (labelKey: string, getVal: () => number, setVal: (v: number) => void, titleHint: string): void => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:7px;";
            const lbl = document.createElement("span");
            lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;flex-shrink:0;min-width:28px;";
            lbl.textContent = t(labelKey);
            const slider = document.createElement("input");
            slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = "0.05";
            slider.value = String(getVal());
            slider.style.cssText = "flex:1;accent-color:#cf6f98;cursor:pointer;min-width:0;";
            slider.title = titleHint;
            const valLbl = document.createElement("span");
            valLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;min-width:28px;text-align:right;flex-shrink:0;";
            valLbl.textContent = Math.round(getVal() * 100) + "%";
            slider.addEventListener("input", () => { const v = parseFloat(slider.value); setVal(v); valLbl.textContent = Math.round(v * 100) + "%"; });
            row.appendChild(lbl); row.appendChild(slider); row.appendChild(valLbl);
            ebcTagsBody.appendChild(row);
        };
        makeOpacitySliderRow("strip.bgOpacity",   getBadgeBgOpacity,   setBadgeBgOpacity,   "Background rectangle opacity (0 = transparent)");
        makeOpacitySliderRow("strip.textOpacity",  getBadgeTextOpacity, setBadgeTextOpacity, "Text / icon opacity (0 = invisible)");

        // Position drag row
        const posHint = document.createElement("div");
        posHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5878;line-height:1.35;margin-bottom:4px;";
        posHint.textContent = t("strip.dragHint");
        ebcTagsBody.appendChild(posHint);

        const posRow = document.createElement("div");
        posRow.style.cssText = "display:flex;align-items:center;gap:5px;";

        const BTN_BASE = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:4px 8px;border-radius:4px;cursor:pointer;flex:1;transition:background 0.12s,border-color 0.12s,color 0.12s";

        const makePosBtn = (styleTarget: "text" | "cat", label: string): HTMLButtonElement => {
            const btn = document.createElement("button");
            const refresh = (): void => {
                const active = getBadgeDragMode() && getBadgeDragStyleTarget() === styleTarget;
                btn.textContent = active ? t("core.done") : label;
                btn.style.cssText = BTN_BASE + `;border:1px solid ${active ? "#cf6f98" : "#4c2537"};background:${active ? "#4a1f30" : "#1b0d17"};color:${active ? "#f7e6ee" : "#c08890"};`;
            };
            refresh();
            btn.addEventListener("click", () => {
                const wasActive = getBadgeDragMode() && getBadgeDragStyleTarget() === styleTarget;
                setBadgeDragMode(!wasActive);
                if (!wasActive) setBadgeDragStyleTarget(styleTarget);
                refresh();
                posRow.querySelectorAll<HTMLButtonElement>("button[data-pos-btn]").forEach(b => b.dispatchEvent(new Event("ebc-refresh")));
            });
            btn.addEventListener("ebc-refresh", refresh);
            btn.dataset["posBtn"] = "1";
            return btn;
        };

        posRow.appendChild(makePosBtn("text", "📍 " + t("strip.styleBtnText")));
        posRow.appendChild(makePosBtn("cat",  "📍 " + t("strip.styleBtnCat")));

        const resetPosBtn = document.createElement("button");
        resetPosBtn.textContent = "⟳";
        resetPosBtn.title = "Reset all badge positions to default (text, cat, and version text)";
        resetPosBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:12px;padding:3px 7px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid #3a1928;background:#150a10;color:#7a5070;transition:background 0.12s,color 0.12s;";
        resetPosBtn.addEventListener("click", () => { resetBadgePosition(); resetCatBadgePosition(); resetVersionTextPosition(); });
        posRow.appendChild(resetPosBtn);
        ebcTagsBody.appendChild(posRow);

        strip.appendChild(ebcTagsBody);

        const updateEbcTagsCollapse = (): void => {
            ebcTagsChev.textContent = ebcTagsCollapsed ? t("strip.showChev") : t("strip.hideChev");
            ebcTagsBody.style.display = ebcTagsCollapsed ? "none" : "";
        };
        updateEbcTagsCollapse();
        ebcTagsHdr.addEventListener("click", () => {
            ebcTagsCollapsed = !ebcTagsCollapsed;
            try { localStorage.setItem("EBC_tagsCollapsed", ebcTagsCollapsed ? "1" : "0"); } catch { /* ignore */ }
            updateEbcTagsCollapse();
        });
    }

    // -- Timer -----------------------------------------------------------------

    private updateTimer(): void {
        if (!this.timerEl) return;
        const online = getOnlineTime();
        const room   = getRoomTime();
        const bound  = getRestraintTime();
        let text = `🌐 ${t("footer.onlineLabel")}: ${online}`;
        if (room)  text += `  🕒 ${t("footer.roomLabel")}: ${room}`;
        if (bound) text += `  ⛓ ${t("footer.boundLabel")}: ${bound}`;
        this.timerEl.textContent = text;
        try { checkAndApplySchedules(); } catch { /* ignore */ }
    }

    private startTimerPoller(): void {
        if (this.timerPoller !== null) return;
        this.updateTimer();
        this.timerPoller = window.setInterval(() => this.updateTimer(), 10_000);
    }

    private stopTimerPoller(): void {
        if (this.timerPoller === null) return;
        window.clearInterval(this.timerPoller);
        this.timerPoller = null;
    }

    // -- Title select helper --------------------------------------------------
    // includeNoChange = true  → first option is "(No change)" stored as ""
    // includeNoChange = false → first option is "(No change)" stored as ""
    // Either way the first option means "don't touch the title on outfit apply"
    private makeTitleSelect(currentValue: string, isDefault = false): HTMLSelectElement {
        const sel = document.createElement("select");
        sel.style.cssText = [
            "font-family:'Trebuchet MS',serif", "font-size:10px",
            "background:#1a0810", "color:#f0d8ec",
            "border:1px solid #4c2537", "border-radius:4px",
            "padding:3px 6px", "cursor:pointer", "outline:none",
        ].join(";");

        // Helper: get BC localised display name for a title key
        const win = window as unknown as Record<string, unknown>;
        const textGetFn = win.TextGet as ((k: string) => string) | undefined;

        // Convert a CamelCase key to spaced words as a last-resort display fallback
        const camelToWords = (s: string): string => s.replace(/([A-Z])/g, " $1").trim();

        const titleDisplay = (key: string): string => {
            if (textGetFn) {
                const result = textGetFn("Title" + key);
                if (result && !result.startsWith("MISSING TEXT")) return result;
            }
            // Fall back to inserting spaces before capitals (BondageMaid → Bondage Maid)
            return camelToWords(key);
        };

        // Hardcoded fallback — used when window.TitleNames is empty/unavailable
        const FALLBACK_TITLES = [
            "Admiral","Alien","Angel","Archbishop","Archjudge","Bishop",
            "BondageMaid","Brat","Bunny","Captain","Champion","CollegeStudent",
            "Concubus","Demon","Doctor","Doll","Dragon","Drow","Duchess","Duke",
            "Elf","Femboy","Foxy","God","Goddess","GoodOne","HeadMaid","Houdini",
            "Incubus","Judge","King","Knight","Librarian","Lord","Maid","Master",
            "Mistress","Nun","Officer","Pet","Pirate","Princess","Prisoner",
            "Professor","Puppy","Queen","Robot","Secretary","Slave","Soldier",
            "Switch","Witch",
        ];

        // "(No change)" — leave title untouched on outfit apply
        const noChangeOpt = document.createElement("option");
        noChangeOpt.value = "";
        noChangeOpt.textContent = isDefault ? t("settings.noDefaultTitle") : "(No change)";
        if (!currentValue) noChangeOpt.selected = true;
        sel.appendChild(noChangeOpt);

        // "None" — explicitly clear the title (stored as sentinel "__clear__")
        const clearOpt = document.createElement("option");
        clearOpt.value = "__clear__";
        clearOpt.textContent = "None (remove title)";
        if (currentValue === "__clear__") clearOpt.selected = true;
        sel.appendChild(clearOpt);

        const bcTitles = win.TitleNames as Array<{ Name: string } | string> | undefined;
        const fromBC: string[] = bcTitles
            ? bcTitles.map(t => typeof t === "string" ? t : (t as { Name: string }).Name).filter(Boolean)
            : [];
        const entries = fromBC.length > 0 ? fromBC : FALLBACK_TITLES;

        for (const key of entries) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = titleDisplay(key);
            if (key === currentValue) opt.selected = true;
            sel.appendChild(opt);
        }
        return sel;
    }

    // -- Outfits tab -----------------------------------------------------------

    private renderOutfits(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // ── Default nickname (top of page) ───────────────────────────────────────
        const nickRow = document.createElement("div");
        nickRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:8px;";

        const nickLbl = document.createElement("span");
        nickLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5060;flex-shrink:0;";
        nickLbl.textContent = t("settings.defaultNickname");

        const nickInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input",
            type: "text",
            value: getDefaultNickname(),
            placeholder: t("outfits.nicknamePlaceholder"),
            maxLength: 40,
        });
        nickInp.style.flex = "1";

        const nickSaveBtn = document.createElement("button");
        nickSaveBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:5px 10px;border-radius:4px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;";
        nickSaveBtn.textContent = "Save";
        nickSaveBtn.addEventListener("click", () => {
            setDefaultNickname(nickInp.value);
            nickSaveBtn.textContent = "✓";
            window.setTimeout(() => { nickSaveBtn.textContent = "Save"; }, 1200);
        });

        nickRow.appendChild(nickLbl);
        nickRow.appendChild(nickInp);
        nickRow.appendChild(nickSaveBtn);
        body.appendChild(nickRow);

        // ── Default title (below default nickname) ───────────────────────────────
        const defTitleRow = document.createElement("div");
        defTitleRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:10px;";
        const defTitleLbl = document.createElement("span");
        defTitleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5060;flex-shrink:0;";
        defTitleLbl.textContent = t("settings.defaultTitle");
        const defTitleSel = this.makeTitleSelect(getDefaultTitle(), true);
        defTitleSel.style.flex = "1";
        defTitleSel.addEventListener("change", () => setDefaultTitle(defTitleSel.value));
        defTitleRow.appendChild(defTitleLbl);
        defTitleRow.appendChild(defTitleSel);
        body.appendChild(defTitleRow);

        this.renderRestraintInfo(body);
        this.renderOutfitWhitelist(body);
        this.renderPalettes(body);

        // ── Tag management ───────────────────────────────────────────────────────────
        const tagMgmtDiv = document.createElement("div");
        tagMgmtDiv.style.marginBottom = "8px";

        let tagMgmtOpen = false;
        try { tagMgmtOpen = localStorage.getItem("EBC_tagsOpen") === "1"; } catch { /* ignore */ }
        const tagToggleBtn = document.createElement("button");
        tagToggleBtn.className = "ebc-section-label";
        tagToggleBtn.style.cssText = "display:block;width:100%;background:transparent;border:none;cursor:pointer;text-align:left;padding:4px 4px 5px;margin-bottom:3px;transition:color 0.12s;";
        const allTagsNow = getOutfitTags();
        tagToggleBtn.textContent = (tagMgmtOpen ? "▼" : "▶") + ` ${t("outfits.tagsN", { n: allTagsNow.length })}`;

        const tagMgmtBody = document.createElement("div");
        tagMgmtBody.style.display = tagMgmtOpen ? "block" : "none";

        const renderTagMgmt = (): void => {
            while (tagMgmtBody.firstChild) tagMgmtBody.removeChild(tagMgmtBody.firstChild);
            const tags = getOutfitTags();
            tagToggleBtn.textContent = (tagMgmtOpen ? "▼" : "▶") + ` TAGS${tags.length ? ` (${tags.length})` : ""}`;

            // ── Existing tags as interactive chips ────────────────────────────
            if (tags.length) {
                const chipsWrap = document.createElement("div");
                chipsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px;";
                for (const tag of tags) {
                    const chip = document.createElement("div");
                    chip.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:3px 7px 3px 5px;border-radius:20px;background:${tag.color};box-shadow:inset 0 1px 0 rgba(255,255,255,0.18),0 1px 3px rgba(0,0,0,0.35);`;

                    // Color dot = native color input styled as a dot
                    const colorDot = document.createElement("input");
                    colorDot.type = "color";
                    colorDot.value = tag.color;
                    colorDot.title = "Change color";
                    colorDot.style.cssText = "width:10px;height:10px;padding:0;border:1px solid rgba(255,255,255,0.35);border-radius:50%;cursor:pointer;flex-shrink:0;outline:none;";
                    colorDot.addEventListener("input", () => {
                        updateOutfitTag(tag.id, tag.name, colorDot.value);
                        tag.color = colorDot.value;
                        chip.style.background = colorDot.value;
                    });

                    const nameSpan = document.createElement("span");
                    nameSpan.textContent = tag.name;
                    nameSpan.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.55);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

                    const delSpan = document.createElement("span");
                    delSpan.textContent = "×";
                    delSpan.title = "Delete tag (click twice)";
                    delSpan.style.cssText = "font-size:11px;line-height:1;color:rgba(255,255,255,0.65);cursor:pointer;flex-shrink:0;transition:color 0.1s;";
                    delSpan.addEventListener("mouseenter", () => { delSpan.style.color = "#fff"; });
                    delSpan.addEventListener("mouseleave", () => { if (delSpan.textContent === "×") delSpan.style.color = "rgba(255,255,255,0.65)"; });
                    let delConfirm = false;
                    delSpan.addEventListener("click", () => {
                        if (!delConfirm) {
                            delConfirm = true;
                            delSpan.textContent = "?";
                            delSpan.style.color = "#fff";
                            window.setTimeout(() => {
                                if (delConfirm) { delConfirm = false; delSpan.textContent = "×"; delSpan.style.color = "rgba(255,255,255,0.65)"; }
                            }, 2000);
                        } else {
                            deleteOutfitTag(tag.id);
                            this.rerender();
                        }
                    });

                    chip.appendChild(colorDot);
                    chip.appendChild(nameSpan);
                    chip.appendChild(delSpan);
                    chipsWrap.appendChild(chip);
                }
                tagMgmtBody.appendChild(chipsWrap);
            } else {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;padding:2px 0 5px;";
                hint.textContent = "No tags yet — add one below.";
                tagMgmtBody.appendChild(hint);
            }

            // ── New tag row ───────────────────────────────────────────────────
            const newTagRow = document.createElement("div");
            newTagRow.style.cssText = "display:flex;align-items:center;gap:4px;";

            const newTagInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input",
                type: "text",
                placeholder: t("outfits.newTagName"),
                maxLength: 20,
            });
            newTagInp.style.flex = "1";

            const newTagColor = document.createElement("input");
            newTagColor.type = "color";
            newTagColor.value = "#cf6f98";
            newTagColor.style.cssText = "width:24px;height:24px;padding:0;border:1px solid #4c2537;border-radius:4px;background:transparent;cursor:pointer;flex-shrink:0;";
            newTagColor.title = "Pick color";

            const addTagBtn = document.createElement("button");
            addTagBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 9px;border-radius:4px;border:1px solid #cf6f98;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;transition:background 0.1s;";
            addTagBtn.textContent = t("core.add");
            addTagBtn.addEventListener("mouseenter", () => { addTagBtn.style.background = "#2a0e1e"; });
            addTagBtn.addEventListener("mouseleave", () => { addTagBtn.style.background = "transparent"; });
            addTagBtn.addEventListener("click", () => {
                if (!newTagInp.value.trim()) return;
                createOutfitTag(newTagInp.value.trim(), newTagColor.value);
                newTagInp.value = "";
                renderTagMgmt();
            });
            newTagInp.addEventListener("keydown", (e) => { if (e.key === "Enter") addTagBtn.click(); });

            newTagRow.appendChild(newTagInp);
            newTagRow.appendChild(newTagColor);
            newTagRow.appendChild(addTagBtn);
            tagMgmtBody.appendChild(newTagRow);
        };

        tagToggleBtn.addEventListener("click", () => {
            tagMgmtOpen = !tagMgmtOpen;
            tagMgmtBody.style.display = tagMgmtOpen ? "block" : "none";
            try { localStorage.setItem("EBC_tagsOpen", tagMgmtOpen ? "1" : "0"); } catch { /* ignore */ }
            renderTagMgmt();
        });

        tagMgmtDiv.appendChild(tagToggleBtn);
        tagMgmtDiv.appendChild(tagMgmtBody);
        body.appendChild(tagMgmtDiv);

        const outfits = getOutfits();

        // ── Collapsible "Saved Outfits" header ───────────────────────────────────
        let outfitsCollapsed = false;
        try { outfitsCollapsed = localStorage.getItem("EBC_outfitsCollapsed") === "1"; } catch { /* ignore */ }

        const outfitLbl = document.createElement("div");
        outfitLbl.className = "ebc-section-label";
        outfitLbl.style.cssText = "cursor:pointer;user-select:none;";
        outfitLbl.textContent = (outfitsCollapsed ? "▶" : "▼") + " " + t("outfits.savedOutfits");
        body.appendChild(outfitLbl);

        // ── Outfit search ─────────────────────────────────────────────────────
        const searchRow = document.createElement("div");
        searchRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:6px;";
        const searchInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input",
            type: "text",
            placeholder: t("outfits.filter"),
        }) as HTMLInputElement;
        searchInp.style.flex = "1";
        const clearSearchBtn = document.createElement("button");
        clearSearchBtn.textContent = "×";
        clearSearchBtn.title = "Clear filter";
        clearSearchBtn.style.cssText = "background:transparent;border:1px solid #3a1928;border-radius:4px;color:#7a5060;cursor:pointer;font-size:12px;padding:0 7px;flex-shrink:0;display:none;";
        searchRow.appendChild(searchInp);
        searchRow.appendChild(clearSearchBtn);
        body.appendChild(searchRow);

        const outfitsBody = document.createElement("div");
        outfitsBody.style.display = outfitsCollapsed ? "none" : "block";

        const rebuildOutfitList = (filter = ""): void => {
            while (outfitsBody.firstChild) outfitsBody.removeChild(outfitsBody.firstChild);
            const q = filter.toLowerCase();
            const filtered = q
                ? outfits.filter(o => o.displayName.toLowerCase().includes(q) || o.command.toLowerCase().includes(q))
                : outfits;
            if (filtered.length > 0) {
                for (const o of filtered) outfitsBody.appendChild(this.buildOutfitRow(o, outfitsBody));
            } else {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.textContent = q ? t("outfits.noMatch") : t("outfits.noOutfits");
                if (!q) {
                    const br = document.createElement("br");
                    const hint = document.createElement("span");
                    hint.style.color = "#4c2537";
                    hint.textContent = t("outfits.useFormBelow");
                    empty.appendChild(br); empty.appendChild(hint);
                }
                outfitsBody.appendChild(empty);
            }
        };

        searchInp.addEventListener("input", () => {
            const v = searchInp.value.trim();
            clearSearchBtn.style.display = v ? "" : "none";
            if (outfitsCollapsed) toggleOutfitsCollapsed();
            rebuildOutfitList(v);
        });
        clearSearchBtn.addEventListener("click", () => {
            searchInp.value = "";
            clearSearchBtn.style.display = "none";
            rebuildOutfitList();
        });

        const toggleOutfitsCollapsed = (): void => {
            outfitsCollapsed = !outfitsCollapsed;
            outfitsBody.style.display = outfitsCollapsed ? "none" : "block";
            outfitLbl.textContent = (outfitsCollapsed ? "▶" : "▼") + " " + t("outfits.savedOutfits");
            try { localStorage.setItem("EBC_outfitsCollapsed", outfitsCollapsed ? "1" : "0"); } catch { /* ignore */ }
        };

        outfitLbl.addEventListener("click", toggleOutfitsCollapsed);

        rebuildOutfitList();

        this.buildNewOutfitSection(outfitsBody);
        body.appendChild(outfitsBody);

        this.buildRestraintSection(body);
        this.buildScheduleSection(body);
    }

    // -- Outfit Schedule section ------------------------------------------------

    private buildScheduleSection(body: HTMLElement): void {
        const divEl = document.createElement("div");
        divEl.className = "ebc-divider";
        body.appendChild(divEl);

        const lbl = document.createElement("div");
        lbl.className = "ebc-section-label";
        lbl.style.cursor = "pointer";
        lbl.style.userSelect = "none";

        const container = document.createElement("div");

        let collapsed = false;
        try { collapsed = localStorage.getItem("EBC_scheduleCollapsed") === "1"; } catch { /* ignore */ }

        const updateLabel = (): void => {
            lbl.textContent = (collapsed ? "▶" : "▼") + " " + t("outfits.outfitSchedule");
        };

        const scheduleList = document.createElement("div");

        const renderScheduleList = (): void => {
            while (scheduleList.firstChild) scheduleList.removeChild(scheduleList.firstChild);
            const schedules = getSchedules();
            const outfits   = getOutfits();

            if (schedules.length === 0) {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.style.padding = "4px 4px 8px";
                empty.textContent = t("outfits.noSchedules");
                scheduleList.appendChild(empty);
            }

            for (const sched of schedules) {
                const outfit = outfits.find(o => o.id === sched.outfitId);
                const row = document.createElement("div");
                row.className = "ebc-schedule-row";

                // Enabled toggle
                const togBtn = document.createElement("button");
                togBtn.className = "ebc-slot-toggle" + (sched.enabled ? " on" : "");
                togBtn.textContent = sched.enabled ? t("core.on") : t("core.off");
                togBtn.title = sched.enabled ? "Click to disable" : "Click to enable";
                togBtn.addEventListener("click", () => {
                    toggleSchedule(sched.id);
                    renderScheduleList();
                });

                // Outfit name
                const nameEl = document.createElement("span");
                nameEl.className = "ebc-schedule-name";
                nameEl.textContent = outfit ? outfit.displayName : "(deleted)";
                nameEl.title = outfit ? ("/" + outfit.command) : "";

                // Time
                const timeEl = document.createElement("span");
                timeEl.className = "ebc-schedule-time";
                timeEl.textContent = sched.time;

                // Delete button
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-outfit-del";
                delBtn.textContent = "×";
                delBtn.title = t("outfits.removeSchedule");
                delBtn.addEventListener("click", () => {
                    removeSchedule(sched.id);
                    renderScheduleList();
                });

                row.appendChild(togBtn);
                row.appendChild(nameEl);
                row.appendChild(timeEl);
                row.appendChild(delBtn);
                scheduleList.appendChild(row);
            }
        };

        renderScheduleList();

        // Add schedule row
        const addRow = document.createElement("div");
        addRow.style.cssText = "display:flex;gap:5px;align-items:center;margin-top:5px;";

        const outfits = getOutfits();
        const outfitSelect = document.createElement("select");
        outfitSelect.className = "ebc-form-input";
        outfitSelect.style.flex = "1";
        if (outfits.length === 0) {
            const opt = document.createElement("option");
            opt.textContent = t("outfits.noOutfitsDropdown");
            opt.disabled = true;
            outfitSelect.appendChild(opt);
        } else {
            for (const o of outfits) {
                const opt = document.createElement("option");
                opt.value = o.id;
                opt.textContent = o.displayName;
                outfitSelect.appendChild(opt);
            }
        }

        const timeInput = Object.assign(document.createElement("input"), {
            type: "text",
            placeholder: t("outfits.timePlaceholder"),
            maxLength: 5,
            title: t("outfits.timeTitle"),
        }) as HTMLInputElement;
        timeInput.className = "ebc-form-input";
        timeInput.style.width = "72px";
        timeInput.style.flexShrink = "0";
        // Auto-insert colon after two digits
        timeInput.addEventListener("input", () => {
            let v = timeInput.value.replace(/[^0-9]/g, "");
            if (v.length > 2) v = v.slice(0, 2) + ":" + v.slice(2, 4);
            timeInput.value = v;
        });

        const addBtn = document.createElement("button");
        addBtn.className = "ebc-wear-btn";
        addBtn.textContent = t("core.add");
        addBtn.title = "Add schedule";
        addBtn.addEventListener("click", () => {
            const raw = timeInput.value.trim();
            if (!outfitSelect.value) return;
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
                timeInput.style.borderColor = "#cf6f98";
                timeInput.title = "Use HH:MM (00:00–23:59)";
                return;
            }
            timeInput.style.borderColor = "";
            addSchedule(outfitSelect.value, raw);
            timeInput.value = "";
            renderScheduleList();
        });

        addRow.appendChild(outfitSelect);
        addRow.appendChild(timeInput);
        addRow.appendChild(addBtn);

        container.appendChild(scheduleList);
        container.appendChild(addRow);

        lbl.addEventListener("click", () => {
            collapsed = !collapsed;
            try { localStorage.setItem("EBC_scheduleCollapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
            updateLabel();
            container.style.display = collapsed ? "none" : "";
        });

        updateLabel();
        container.style.display = collapsed ? "none" : "";

        body.appendChild(lbl);
        body.appendChild(container);
    }

    // -- Restraint info --------------------------------------------------------

    private renderRestraintInfo(body: HTMLElement): void {
        const label = document.createElement("div");
        label.className = "ebc-section-label";
        label.style.cursor = "pointer";
        label.style.userSelect = "none";

        const container = document.createElement("div");
        container.style.marginBottom = "6px";

        let collapsed = false;
        try { collapsed = localStorage.getItem("EBC_activeRestraintsCollapsed") === "1"; } catch { /* ignore */ }

        const render = (): void => {
            while (container.firstChild) container.removeChild(container.firstChild);

            try {
                const restraints = Player.Appearance.filter(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
                if (restraints.length === 0) {
                    const none = document.createElement("div");
                    none.className = "ebc-empty";
                    none.style.padding = "4px 4px 8px";
                    none.textContent = "No active restraints";
                    container.appendChild(none);
                    return;
                }

                for (const item of restraints) {
                    const prop = item.Property as Record<string, unknown> | undefined;
                    const lockedBy = prop?.LockedBy as number | undefined;
                    const group = item.Asset.Group.Name;

                    const row = document.createElement("div");
                    row.className = "ebc-restraint-row";

                    const nameEl = document.createElement("span");
                    nameEl.className = "ebc-restraint-name";
                    nameEl.textContent = item.Asset.Name;
                    nameEl.title = item.Asset.Name;

                    const groupEl = document.createElement("span");
                    groupEl.className = "ebc-restraint-group";
                    groupEl.textContent = group.replace("Item", "");

                    const lockEl = document.createElement("span");
                    if (lockedBy !== undefined) {
                        lockEl.className = "ebc-restraint-lock";
                        const lockType = prop?.CombinationNumber ? "Combo"
                            : prop?.Password                     ? "Pwd"
                            : prop?.MemberNumberListKeys         ? "Key"
                            : "Lock";

                        const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined;
                        const locker = chars?.find(c => c.MemberNumber === lockedBy);
                        const lockerNick = locker ? ((locker as unknown as Record<string, unknown>).Nickname as string | undefined) : undefined;
                        const lockerName = locker ? (lockerNick || locker.Name) : `#${lockedBy}`;
                        lockEl.textContent = `🔒 ${lockType} · ${lockerName}`;
                    } else {
                        lockEl.className = "ebc-restraint-lock unlocked";
                        lockEl.textContent = "Unlocked";
                    }

                    // Duration badge — how long this item has been worn
                    const dur = getRestraintItemDuration(group);
                    const durEl = document.createElement("span");
                    durEl.className = "ebc-restraint-duration";
                    durEl.textContent = dur ? `⏱ ${dur}` : "";
                    durEl.title = "Time worn (persists offline)";

                    row.appendChild(nameEl);
                    row.appendChild(groupEl);
                    row.appendChild(lockEl);
                    row.appendChild(durEl);
                    container.appendChild(row);
                }
            } catch { /* Player not ready */ }
        };

        const updateLabel = (): void => {
            label.textContent = (collapsed ? "▶ " : "▼ ") + t("dev.activeRestraints");
        };

        label.addEventListener("click", () => {
            collapsed = !collapsed;
            try { localStorage.setItem("EBC_activeRestraintsCollapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
            updateLabel();
            container.style.display = collapsed ? "none" : "";
        });

        updateLabel();
        render();
        container.style.display = collapsed ? "none" : "";
        body.appendChild(label);
        body.appendChild(container);
    }

    // -- Color palettes --------------------------------------------------------

    private buildColorPickerWidget(initialHex: string, onChange: (hex: string) => void): HTMLElement {
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
            const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
            return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
        };
        const rgbToHex = (r: number, g: number, b: number) =>
            "#" + [r, g, b].map(x => clamp(x, 0, 255).toString(16).padStart(2, "0")).join("");
        const hexToRgb = (hex: string): [number, number, number] | null => {
            const m = hex.replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
        };
        const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
            const rf = r / 255, gf = g / 255, bf = b / 255;
            const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf), d = max - min;
            let h = 0;
            if (d > 0) {
                if (max === rf)      h = ((gf - bf) / d + 6) % 6;
                else if (max === gf) h = (bf - rf) / d + 2;
                else                 h = (rf - gf) / d + 4;
                h *= 60;
            }
            return [h, max > 0 ? d / max : 0, max];
        };

        let H = 0, S = 0, V = 1;
        const initRgb = hexToRgb(initialHex) ?? [207, 111, 152];
        [H, S, V] = rgbToHsv(initRgb[0], initRgb[1], initRgb[2]);

        const wrap = document.createElement("div");
        wrap.className = "ebc-cpicker";

        // SV gradient box
        const svBox   = document.createElement("div"); svBox.className   = "ebc-cpicker-sv";
        const svHue   = document.createElement("div"); svHue.className   = "ebc-cpicker-sv-hue";
        const svWhite = document.createElement("div"); svWhite.className = "ebc-cpicker-sv-white";
        const svBlack = document.createElement("div"); svBlack.className = "ebc-cpicker-sv-black";
        const svDot   = document.createElement("div"); svDot.className   = "ebc-cpicker-sv-dot";
        svBox.appendChild(svHue); svBox.appendChild(svWhite);
        svBox.appendChild(svBlack); svBox.appendChild(svDot);

        // Hue slider
        const hueBar   = document.createElement("div"); hueBar.className   = "ebc-cpicker-hue";
        const hueThumb = document.createElement("div"); hueThumb.className = "ebc-cpicker-hue-thumb";
        hueBar.appendChild(hueThumb);

        // Bottom row: preview square + hex input
        const btm     = document.createElement("div");   btm.className    = "ebc-cpicker-btm";
        const preview = document.createElement("div");   preview.className = "ebc-cpicker-preview";
        const hexInp  = document.createElement("input"); hexInp.className  = "ebc-cpicker-hex";
        hexInp.type = "text"; hexInp.maxLength = 7; hexInp.spellcheck = false;
        hexInp.placeholder = "#cf6f98";
        btm.appendChild(preview); btm.appendChild(hexInp);

        wrap.appendChild(svBox); wrap.appendChild(hueBar); wrap.appendChild(btm);

        // Render helper — updates all visual elements from H/S/V state.
        // silent=true skips the onChange callback (used for initial render).
        const render = (silent = false): void => {
            const [hr, hg, hb] = hsvToRgb(H, 1, 1);
            svHue.style.background = `rgb(${hr},${hg},${hb})`;
            svDot.style.left = `calc(${clamp(S * 100, 0, 100)}% - 6.5px)`;
            svDot.style.top  = `calc(${clamp((1 - V) * 100, 0, 100)}% - 6.5px)`;
            hueThumb.style.left = `calc(${clamp(H / 360 * 100, 0, 100)}% - 9px)`;
            const [r, g, b] = hsvToRgb(H, S, V);
            const hex = rgbToHex(r, g, b);
            preview.style.background = hex;
            hexInp.value = hex;
            if (!silent) onChange(hex);
        };

        // Drag — SV box
        const moveSv = (cx: number, cy: number): void => {
            const rect = svBox.getBoundingClientRect();
            S = clamp((cx - rect.left) / rect.width,  0, 1);
            V = clamp(1 - (cy - rect.top) / rect.height, 0, 1);
            render();
        };
        let svDrag = false;
        const svMM  = (e: MouseEvent) => { if (svDrag) moveSv(e.clientX, e.clientY); };
        const svMU  = () => { svDrag = false; };
        const svTM  = (e: TouchEvent) => { if (svDrag && e.touches[0]) { e.preventDefault(); moveSv(e.touches[0].clientX, e.touches[0].clientY); } };
        const svTE  = () => { svDrag = false; };
        document.addEventListener("mousemove", svMM);
        document.addEventListener("mouseup",   svMU);
        document.addEventListener("touchmove", svTM, { passive: false });
        document.addEventListener("touchend",  svTE);
        svBox.addEventListener("mousedown",  (e) => { svDrag = true; moveSv(e.clientX, e.clientY); });
        svBox.addEventListener("touchstart", (e) => { svDrag = true; if (e.touches[0]) { e.preventDefault(); moveSv(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: false });

        // Drag — hue bar
        const moveHue = (cx: number): void => {
            const rect = hueBar.getBoundingClientRect();
            H = clamp((cx - rect.left) / rect.width, 0, 1) * 360;
            render();
        };
        let hueDrag = false;
        const hueMM = (e: MouseEvent) => { if (hueDrag) moveHue(e.clientX); };
        const hueMU = () => { hueDrag = false; };
        const hueTM = (e: TouchEvent) => { if (hueDrag && e.touches[0]) { e.preventDefault(); moveHue(e.touches[0].clientX); } };
        const hueTE = () => { hueDrag = false; };
        document.addEventListener("mousemove", hueMM);
        document.addEventListener("mouseup",   hueMU);
        document.addEventListener("touchmove", hueTM, { passive: false });
        document.addEventListener("touchend",  hueTE);
        hueBar.addEventListener("mousedown",  (e) => { hueDrag = true; moveHue(e.clientX); });
        hueBar.addEventListener("touchstart", (e) => { hueDrag = true; if (e.touches[0]) { e.preventDefault(); moveHue(e.touches[0].clientX); } }, { passive: false });

        // Hex input — validate on every keystroke
        hexInp.addEventListener("input", () => {
            let v = hexInp.value.trim();
            if (!v.startsWith("#")) v = "#" + v;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                const rgb = hexToRgb(v);
                if (rgb) {
                    [H, S, V] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
                    const [hr, hg, hb] = hsvToRgb(H, 1, 1);
                    svHue.style.background = `rgb(${hr},${hg},${hb})`;
                    svDot.style.left  = `calc(${clamp(S * 100, 0, 100)}% - 6.5px)`;
                    svDot.style.top   = `calc(${clamp((1 - V) * 100, 0, 100)}% - 6.5px)`;
                    hueThumb.style.left = `calc(${clamp(H / 360 * 100, 0, 100)}% - 9px)`;
                    preview.style.background = v;
                    hexInp.style.color = "";
                    onChange(v);
                }
            } else {
                hexInp.style.color = "#cf3060";
            }
        });
        hexInp.addEventListener("blur", () => {
            // Reset to current valid value on blur if invalid
            if (!/^#[0-9a-fA-F]{6}$/.test(hexInp.value)) {
                const [r, g, b] = hsvToRgb(H, S, V);
                hexInp.value = rgbToHex(r, g, b);
                hexInp.style.color = "";
            }
        });

        // Expose cleanup + external set on the element
        (wrap as unknown as Record<string, unknown>)._cleanup = (): void => {
            document.removeEventListener("mousemove", svMM);
            document.removeEventListener("mouseup",   svMU);
            document.removeEventListener("touchmove", svTM);
            document.removeEventListener("touchend",  svTE);
            document.removeEventListener("mousemove", hueMM);
            document.removeEventListener("mouseup",   hueMU);
            document.removeEventListener("touchmove", hueTM);
            document.removeEventListener("touchend",  hueTE);
        };
        (wrap as unknown as Record<string, unknown>)._setValue = (hex: string): void => {
            const rgb = hexToRgb(hex);
            if (!rgb) return;
            [H, S, V] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
            hexInp.style.color = "";
            render(true); // silent — don't re-fire onChange
        };

        render(true); // initial paint
        return wrap;
    }

    private renderOutfitWhitelist(body: HTMLElement): void {
        const wl = getOutfitWhitelist();

        const section = document.createElement("div");
        section.style.marginBottom = "6px";

        const hdr = document.createElement("div");
        hdr.className = "ebc-section-label";
        hdr.style.cssText += "cursor:pointer;user-select:none;";

        let open = false;
        try { open = localStorage.getItem("EBC_outfitWLOpen") === "1"; } catch { /* ignore */ }

        const updateHdr = (): void => {
            const n = getOutfitWhitelist().length;
            hdr.textContent = (open ? "▼" : "▶") + ` ${t("outfits.protectedItems")}${n ? ` (${n})` : ""}`;
        };
        updateHdr();

        const inner = document.createElement("div");
        inner.style.display = open ? "block" : "none";

        const rebuild = (): void => {
            while (inner.firstChild) inner.removeChild(inner.firstChild);
            const current = getOutfitWhitelist();

            // ── Active chips ──────────────────────────────────────────────────
            if (current.length) {
                const chipsWrap = document.createElement("div");
                chipsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;";
                for (const group of current) {
                    // Resolve a readable label: try current worn item, fallback to cleaned group name
                    let chipLabel = group.replace(/^Item/, "");
                    try {
                        const worn = Player.Appearance.find((i: Item) => i.Asset.Group.Name === group);
                        if (worn) {
                            const iDesc = ((worn.Asset as unknown as Record<string, unknown>).Description as string | undefined)?.trim();
                            const gDesc = ((worn.Asset.Group as unknown as Record<string, unknown>).Description as string | undefined)?.trim();
                            if (iDesc && gDesc) chipLabel = `${iDesc} · ${gDesc}`;
                            else if (iDesc) chipLabel = iDesc;
                            else if (gDesc) chipLabel = gDesc;
                        }
                    } catch { /* ignore */ }

                    const chip = document.createElement("span");
                    chip.style.cssText = "display:inline-flex;align-items:center;gap:3px;background:#1a0c16;border:1px solid #3a1928;border-radius:4px;padding:2px 6px;font-family:'Trebuchet MS',serif;font-size:9px;color:#c48aa8;";
                    const chipTxt = document.createElement("span");
                    chipTxt.textContent = chipLabel;
                    const rmBtn = document.createElement("span");
                    rmBtn.textContent = "×";
                    rmBtn.style.cssText = "cursor:pointer;color:#8a6070;font-size:10px;line-height:1;";
                    rmBtn.title = "Remove from protected items";
                    rmBtn.addEventListener("mouseenter", () => { rmBtn.style.color = "#cf6f98"; });
                    rmBtn.addEventListener("mouseleave", () => { rmBtn.style.color = "#8a6070"; });
                    rmBtn.addEventListener("click", () => {
                        removeFromOutfitWhitelist(group);
                        rebuild();
                        updateHdr();
                    });
                    chip.appendChild(chipTxt);
                    chip.appendChild(rmBtn);
                    chipsWrap.appendChild(chip);
                }
                inner.appendChild(chipsWrap);
            } else {
                const empty = document.createElement("div");
                empty.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;margin-bottom:6px;";
                empty.textContent = "No protected items — add some from the list below.";
                inner.appendChild(empty);
            }

            // ── Currently wearing picker (collapsible) ────────────────────────
            let wornOpen = false;
            try { wornOpen = localStorage.getItem("EBC_outfitWLWornOpen") === "1"; } catch { /* ignore */ }
            const wornToggle = document.createElement("div");
            wornToggle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5060;cursor:pointer;user-select:none;margin-bottom:3px;";
            const wornBody = document.createElement("div");
            wornBody.style.display = wornOpen ? "flex" : "none";
            wornBody.style.cssText = "flex-wrap:wrap;gap:4px;";

            const updateWornToggle = (): void => {
                wornToggle.textContent = (wornOpen ? "▼" : "▶") + " Current restraints — click to protect";
            };
            updateWornToggle();

            const buildWornButtons = (): void => {
                while (wornBody.firstChild) wornBody.removeChild(wornBody.firstChild);
                const wl2 = getOutfitWhitelist();
                let anyShown = false;
                try {
                    for (const item of Player.Appearance) {
                        const group = item.Asset.Group.Name;
                        if (!RESTRAINT_GROUPS.has(group)) continue; // only show restraint slots
                        if (wl2.includes(group)) continue; // already protected
                        const iDesc = ((item.Asset as unknown as Record<string, unknown>).Description as string | undefined)?.trim() || item.Asset.Name;
                        const gDesc = ((item.Asset.Group as unknown as Record<string, unknown>).Description as string | undefined)?.trim() || group.replace(/^Item/, "");
                        const btn = document.createElement("button");
                        btn.className = "ebc-wear-btn";
                        btn.style.cssText += "font-size:9px;padding:2px 7px;";
                        btn.textContent = `${iDesc} · ${gDesc}`;
                        btn.title = `Protect this slot (${group})`;
                        btn.addEventListener("click", () => {
                            addToOutfitWhitelist(group);
                            rebuild();
                            updateHdr();
                        });
                        wornBody.appendChild(btn);
                        anyShown = true;
                    }
                } catch { /* ignore */ }
                if (!anyShown) {
                    const hint = document.createElement("span");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;";
                    hint.textContent = "No unprotected restraints currently worn.";
                    wornBody.appendChild(hint);
                }
            };

            wornToggle.addEventListener("click", () => {
                wornOpen = !wornOpen;
                try { localStorage.setItem("EBC_outfitWLWornOpen", wornOpen ? "1" : "0"); } catch { /* ignore */ }
                wornBody.style.display = wornOpen ? "flex" : "none";
                updateWornToggle();
                if (wornOpen) buildWornButtons();
            });
            if (wornOpen) buildWornButtons();

            inner.appendChild(wornToggle);
            inner.appendChild(wornBody);
        };

        hdr.addEventListener("click", () => {
            open = !open;
            try { localStorage.setItem("EBC_outfitWLOpen", open ? "1" : "0"); } catch { /* ignore */ }
            inner.style.display = open ? "block" : "none";
            updateHdr();
            if (open) rebuild();
        });

        if (open) rebuild();
        section.appendChild(hdr);
        section.appendChild(inner);
        body.appendChild(section);

        void wl; // suppress unused-variable warning — length tracked via getOutfitWhitelist() calls
    }

    private renderPalettes(body: HTMLElement): void {
        const label = document.createElement("div");
        label.className = "ebc-section-label";
        label.style.cssText += "cursor:pointer;user-select:none;";

        const container = document.createElement("div");
        container.style.marginBottom = "6px";

        let collapsed = true;
        try { collapsed = localStorage.getItem("EBC_coloursCollapsed") !== "0"; } catch { /* ignore */ }
        let selectedColor: string | null = null;

        // Targeted updaters — assigned inside build(), called without full rebuild
        let updateSelRow:    () => void = () => {};
        let updateSwatchRow: () => void = () => {};

        // Custom picker handles — refreshed each time build() creates a new widget
        let pickerCleanup: (() => void) | null = null;
        let setPickerHex:  ((hex: string) => void) | null = null;

        const build = (): void => {
            // Detach document-level drag listeners from previous picker instance
            pickerCleanup?.(); pickerCleanup = null; setPickerHex = null;
            while (container.firstChild) container.removeChild(container.firstChild);
            if (collapsed) return;

            // ── Colour picker (always visible) ────────────────────────────────
            const pickerWidget = this.buildColorPickerWidget(selectedColor ?? "#cf6f98", (hex) => {
                selectedColor = hex;
                updateSelRow();
                updateSwatchRow();
            });
            const pw = pickerWidget as unknown as Record<string, unknown>;
            pickerCleanup = pw._cleanup as () => void;
            setPickerHex  = pw._setValue as (hex: string) => void;
            container.appendChild(pickerWidget);

            // ── Selected colour bar + Save button ─────────────────────────────
            const selRow = document.createElement("div");
            selRow.style.cssText = "display:flex;align-items:center;gap:6px;margin:5px 0 6px;";

            const selDot = document.createElement("span");
            selDot.className = "ebc-sel-dot";
            const selHex = document.createElement("span");
            selHex.style.cssText = "font-family:'Courier New',monospace;font-size:9px;color:#c48aa8;flex-shrink:0;";
            const selHint = document.createElement("span");
            selHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7888;flex:1;";
            selHint.textContent = "Pick a colour above";

            const saveToMyBtn = document.createElement("button");
            saveToMyBtn.className = "ebc-wear-btn";
            saveToMyBtn.style.cssText += "padding:1px 8px;font-size:9px;flex-shrink:0;";
            saveToMyBtn.textContent = "+ Save";
            saveToMyBtn.title = "Save selected colour to My Colours";
            saveToMyBtn.addEventListener("click", () => {
                if (!selectedColor) return;
                addCustomColor(selectedColor);
                updateSwatchRow();
                updateLabel();
                saveToMyBtn.textContent = "Saved!";
                window.setTimeout(() => { saveToMyBtn.textContent = "+ Save"; }, 1400);
            });

            const clrBtn = document.createElement("button");
            clrBtn.textContent = "x";
            clrBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 6px;border-radius:3px;border:1px solid #3a1928;background:transparent;color:#8a6070;cursor:pointer;flex-shrink:0;display:none;";
            clrBtn.title = "Clear selected colour";
            clrBtn.addEventListener("click", () => {
                selectedColor = null;
                setPickerHex?.("#cf6f98");
                updateSelRow();
                updateSwatchRow();
                updateLabel();
            });

            selRow.appendChild(selDot);
            selRow.appendChild(selHex);
            selRow.appendChild(selHint);
            selRow.appendChild(saveToMyBtn);
            selRow.appendChild(clrBtn);
            container.appendChild(selRow);

            updateSelRow = (): void => {
                if (selectedColor) {
                    selDot.style.background = selectedColor;
                    selDot.style.display = "";
                    selHex.textContent = selectedColor.toUpperCase();
                    selHex.style.display = "";
                    selHint.style.display = "none";
                    clrBtn.style.display = "";
                } else {
                    selDot.style.display = "none";
                    selHex.style.display = "none";
                    selHint.style.display = "";
                    clrBtn.style.display = "none";
                }
            };
            updateSelRow();

            // Flash hint when user tries to apply without a colour selected
            const flashHint = (): void => {
                selHint.style.display = "";
                selHint.style.color = "#cf6f98";
                window.setTimeout(() => { selHint.style.color = "#9a7888"; updateSelRow(); }, 700);
            };

            // ── My Colours swatches ───────────────────────────────────────────
            const swatchesWrap = document.createElement("div");
            swatchesWrap.className = "ebc-swatch-grid";

            updateSwatchRow = (): void => {
                while (swatchesWrap.firstChild) swatchesWrap.removeChild(swatchesWrap.firstChild);
                const saved = getCustomColors();
                if (!saved.length) {
                    const hint = document.createElement("span");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;";
                    hint.textContent = t("outfits.noSavedColours");
                    swatchesWrap.appendChild(hint);
                    return;
                }
                for (const c of saved) {
                    const sw = document.createElement("span");
                    sw.className = "ebc-cswatch" + (selectedColor === c ? " sel" : "");
                    sw.style.background = c;
                    sw.title = c.toUpperCase();
                    sw.addEventListener("click", () => {
                        selectedColor = c;
                        setPickerHex?.(c);
                        updateSelRow();
                        updateSwatchRow();
                    });
                    const rmBtn = document.createElement("span");
                    rmBtn.className = "ebc-cswatch-rm";
                    rmBtn.textContent = "x";
                    rmBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        removeCustomColor(c);
                        if (selectedColor === c) { selectedColor = null; updateSelRow(); }
                        updateSwatchRow();
                        updateLabel();
                    });
                    sw.addEventListener("mouseenter", () => { rmBtn.style.display = "flex"; });
                    sw.addEventListener("mouseleave", () => { rmBtn.style.display = "none"; });
                    sw.appendChild(rmBtn);
                    swatchesWrap.appendChild(sw);
                }
            };
            updateSwatchRow();
            container.appendChild(swatchesWrap);

            // ── Apply to worn restraints ──────────────────────────────────────
            const div1 = document.createElement("div");
            div1.className = "ebc-divider"; div1.style.margin = "6px 0 8px";
            container.appendChild(div1);

            const applyLbl = document.createElement("div");
            applyLbl.className = "ebc-import-hint";
            applyLbl.style.cssText = "font-weight:600;margin-bottom:5px;";
            applyLbl.textContent = "APPLY TO WORN ITEMS";
            container.appendChild(applyLbl);

            const worn: Array<{ group: string; name: string }> = [];
            try {
                for (const item of Player.Appearance) {
                    const g = item.Asset.Group;
                    if (RESTRAINT_GROUPS.has(g.Name)) {
                        const itemDesc = ((item.Asset as unknown as Record<string, unknown>).Description as string | undefined)?.trim() || item.Asset.Name;
                        const groupDesc = ((g as unknown as Record<string, unknown>).Description as string | undefined)?.trim() || g.Name;
                        worn.push({ group: g.Name, name: `${itemDesc} · ${groupDesc}` });
                    }
                }
            } catch { /* ignore */ }

            if (!worn.length) {
                const none = document.createElement("div");
                none.className = "ebc-empty"; none.style.padding = "4px";
                none.textContent = "No restraints currently worn.";
                container.appendChild(none);
            } else {
                for (const wItem of worn) {
                    const wWrap = document.createElement("div");
                    wWrap.style.cssText = "margin-bottom:3px;";

                    const wRow = document.createElement("div");
                    wRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 7px;border-radius:5px;background:#130810;border:1px solid #2a1020;cursor:pointer;";

                    const previewDots = document.createElement("span");
                    previewDots.style.cssText = "display:inline-flex;gap:2px;flex-shrink:0;";
                    const refreshPreview = (): void => {
                        previewDots.innerHTML = "";
                        for (const c of getGroupColors(wItem.group).slice(0, 8)) {
                            const d = document.createElement("span");
                            const isD = !c || c === "Default";
                            d.style.cssText = `display:inline-block;width:9px;height:9px;border-radius:2px;background:${isD ? "#3a2030" : c};border:1px solid rgba(255,255,255,0.12);flex-shrink:0;`;
                            d.title = isD ? "Default" : c.toUpperCase();
                            previewDots.appendChild(d);
                        }
                    };
                    refreshPreview();

                    const wName = document.createElement("span");
                    wName.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c0a0b0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                    wName.textContent = wItem.name; wName.title = wItem.name;

                    const allBtn = document.createElement("button");
                    allBtn.className = "ebc-wear-btn";
                    allBtn.style.cssText += "padding:1px 7px;font-size:9px;flex-shrink:0;";
                    allBtn.textContent = "All";
                    allBtn.title = "Apply selected colour to all zones";
                    allBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (!selectedColor) { flashHint(); return; }
                        applyColorToGroup(wItem.group, selectedColor);
                        refreshPreview();
                        if (zonesPanel.style.display !== "none") rebuildZones();
                        allBtn.textContent = "✓";
                        window.setTimeout(() => { allBtn.textContent = "All"; }, 1400);
                    });

                    const wArrow = document.createElement("span");
                    wArrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;flex-shrink:0;";
                    wArrow.textContent = "▼";

                    wRow.appendChild(previewDots); wRow.appendChild(wName);
                    wRow.appendChild(allBtn); wRow.appendChild(wArrow);

                    const zonesPanel = document.createElement("div");
                    zonesPanel.style.cssText = "display:none;flex-direction:column;gap:2px;padding:5px 7px 6px;background:#0d060c;border:1px solid #2a1020;border-top:none;border-radius:0 0 5px 5px;";

                    const rebuildZones = (): void => {
                        while (zonesPanel.firstChild) zonesPanel.removeChild(zonesPanel.firstChild);
                        const colors    = getGroupColors(wItem.group);
                        const zoneNames = getGroupZoneNames(wItem.group);

                        for (let zi = 0; zi < colors.length; zi++) {
                            const zc = colors[zi];
                            const zn = zoneNames[zi] ?? `Zone ${zi + 1}`;
                            const isDefault = !zc || zc === "Default";

                            const zRow = document.createElement("div");
                            zRow.className = "ebc-zone-row";

                            const zDot = document.createElement("span");
                            zDot.className = "ebc-zone-dot";
                            zDot.style.background = isDefault ? "#3a2030" : zc;
                            zDot.title = isDefault ? "Default — click to apply selected" : `${(zc ?? "").toUpperCase()} — click to apply selected`;
                            zDot.addEventListener("click", () => {
                                if (!selectedColor) { flashHint(); return; }
                                applyColorZoneToGroup(wItem.group, zi, selectedColor);
                                zDot.style.background = selectedColor;
                                zHex.textContent = selectedColor.toUpperCase();
                                zDot.title = selectedColor.toUpperCase();
                                refreshPreview();
                            });

                            const zHex = document.createElement("span");
                            zHex.className = "ebc-zone-hex";
                            zHex.textContent = isDefault ? "Default" : (zc ?? "").toUpperCase();

                            const zLabel = document.createElement("span");
                            zLabel.className = "ebc-zone-label";
                            zLabel.textContent = zn;

                            const zSetBtn = document.createElement("button");
                            zSetBtn.className = "ebc-wear-btn ebc-zone-set";
                            zSetBtn.textContent = "Set";
                            zSetBtn.title = "Apply selected colour to this zone";
                            zSetBtn.addEventListener("click", () => {
                                if (!selectedColor) { flashHint(); return; }
                                applyColorZoneToGroup(wItem.group, zi, selectedColor);
                                zDot.style.background = selectedColor;
                                zHex.textContent = selectedColor.toUpperCase();
                                zDot.title = selectedColor.toUpperCase();
                                refreshPreview();
                                zSetBtn.textContent = "✓";
                                window.setTimeout(() => { zSetBtn.textContent = "Set"; }, 1000);
                            });

                            zRow.appendChild(zDot);
                            zRow.appendChild(zHex);
                            zRow.appendChild(zLabel);
                            zRow.appendChild(zSetBtn);
                            zonesPanel.appendChild(zRow);
                        }
                    };

                    wRow.addEventListener("click", () => {
                        const open = zonesPanel.style.display !== "flex";
                        zonesPanel.style.display = open ? "flex" : "none";
                        wArrow.textContent = open ? "▲" : "▼";
                        wRow.style.borderRadius = open ? "5px 5px 0 0" : "5px";
                        if (open) rebuildZones();
                    });

                    wWrap.appendChild(wRow); wWrap.appendChild(zonesPanel);
                    container.appendChild(wWrap);
                }
            }

            // ── Colour presets ────────────────────────────────────────────────
            const div2 = document.createElement("div");
            div2.className = "ebc-divider"; div2.style.margin = "8px 0 6px";
            container.appendChild(div2);

            const presetsLbl = document.createElement("div");
            presetsLbl.className = "ebc-import-hint";
            presetsLbl.style.cssText = "font-weight:600;margin-bottom:5px;";
            presetsLbl.textContent = t("buttons.colourPresets");
            container.appendChild(presetsLbl);

            // Save-as-preset row: name + "from" dropdown + Save button
            const savePresRow = document.createElement("div");
            savePresRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:6px;";
            const savePresInp = document.createElement("input");
            savePresInp.type = "text"; savePresInp.placeholder = "Preset name…";
            savePresInp.maxLength = 30; savePresInp.className = "ebc-form-input";
            savePresInp.style.fontSize = "9px";
            savePresRow.appendChild(savePresInp);

            // forward-declare so save button closure can call it after assignment below
            let renderPresets: () => void = () => {};

            if (worn.length) {
                const savePresGroupSel = document.createElement("select");
                savePresGroupSel.className = "ebc-form-input";
                savePresGroupSel.style.cssText = "font-size:9px;flex:none;width:auto;max-width:90px;";
                savePresGroupSel.title = "Capture colours from this worn item";
                const phOpt = document.createElement("option");
                phOpt.value = ""; phOpt.textContent = "— from —";
                savePresGroupSel.appendChild(phOpt);
                for (const wItem of worn) {
                    const opt = document.createElement("option");
                    opt.value = wItem.group; opt.textContent = wItem.name;
                    savePresGroupSel.appendChild(opt);
                }
                savePresRow.appendChild(savePresGroupSel);

                const savePresBtn = document.createElement("button");
                savePresBtn.className = "ebc-wear-btn";
                savePresBtn.style.cssText += "padding:1px 7px;font-size:9px;flex-shrink:0;";
                savePresBtn.textContent = "+ Preset";
                savePresBtn.title = "Save current zone colours as a named preset";
                savePresBtn.addEventListener("click", () => {
                    const name = savePresInp.value.trim();
                    const group = savePresGroupSel.value;
                    if (!name) { savePresInp.style.borderColor = "#cf6f98"; return; }
                    if (!group) { savePresGroupSel.style.borderColor = "#cf6f98"; return; }
                    savePresInp.style.borderColor = "";
                    savePresGroupSel.style.borderColor = "";
                    saveRestraintPreset(name, getGroupColors(group));
                    savePresInp.value = "";
                    renderPresets();
                    savePresBtn.textContent = t("core.saved");
                    window.setTimeout(() => { savePresBtn.textContent = "+ Preset"; }, 1400);
                });
                savePresRow.appendChild(savePresBtn);
            }
            container.appendChild(savePresRow);

            const presetsContainer = document.createElement("div");
            container.appendChild(presetsContainer);

            renderPresets = (): void => {
                while (presetsContainer.firstChild) presetsContainer.removeChild(presetsContainer.firstChild);
                const presets = getRestraintPresets();
                if (!presets.length) {
                    const none = document.createElement("div");
                    none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;";
                    none.textContent = "No presets saved yet.";
                    presetsContainer.appendChild(none);
                    return;
                }
                for (const preset of presets) {
                    const pRow = document.createElement("div");
                    pRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:3px;padding:4px 7px;border-radius:5px;background:#130810;border:1px solid #2a1020;";

                    const swatches = document.createElement("span");
                    swatches.style.cssText = "display:inline-flex;gap:2px;flex-shrink:0;";
                    for (const c of preset.colors.slice(0, 8)) {
                        const d = document.createElement("span");
                        const isD = !c || c === "Default";
                        d.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:2px;background:${isD ? "#3a2030" : c};border:1px solid rgba(255,255,255,0.12);`;
                        swatches.appendChild(d);
                    }

                    const nameInp = document.createElement("input");
                    nameInp.value = preset.name; nameInp.maxLength = 30;
                    nameInp.className = "ebc-form-input";
                    nameInp.style.cssText = nameInp.style.cssText + ";font-size:9px;min-width:0;";
                    nameInp.addEventListener("change", () => { renameRestraintPreset(preset.id, nameInp.value); });

                    const applyToSel = document.createElement("select");
                    applyToSel.className = "ebc-form-input";
                    applyToSel.style.cssText = applyToSel.style.cssText + ";font-size:9px;flex:none;width:auto;max-width:90px;";
                    applyToSel.title = "Choose restraint to apply to";
                    const phOpt2 = document.createElement("option");
                    phOpt2.value = ""; phOpt2.textContent = "— pick —";
                    applyToSel.appendChild(phOpt2);
                    for (const wItem of worn) {
                        const opt = document.createElement("option");
                        opt.value = wItem.group; opt.textContent = wItem.name;
                        applyToSel.appendChild(opt);
                    }

                    const applyBtn = document.createElement("button");
                    applyBtn.className = "ebc-wear-btn";
                    applyBtn.style.cssText += "padding:1px 6px;font-size:9px;flex-shrink:0;";
                    applyBtn.textContent = t("core.apply");
                    applyBtn.addEventListener("click", () => {
                        const group = applyToSel.value;
                        if (!group) { applyToSel.style.borderColor = "#cf6f98"; return; }
                        applyToSel.style.borderColor = "";
                        applyColorsToGroup(group, preset.colors);
                        build(); // rebuild to refresh all zone previews
                        applyBtn.textContent = "✓";
                        window.setTimeout(() => { applyBtn.textContent = t("core.apply"); }, 1400);
                    });

                    let delPending = false;
                    const delBtn = document.createElement("button");
                    delBtn.className = "ebc-outfit-del"; delBtn.textContent = "×";
                    delBtn.addEventListener("click", () => {
                        if (!delPending) {
                            delPending = true; delBtn.classList.add("confirm"); delBtn.textContent = "Sure?";
                            window.setTimeout(() => { delPending = false; delBtn.classList.remove("confirm"); delBtn.textContent = "×"; }, 2500);
                        } else {
                            deleteRestraintPreset(preset.id);
                            renderPresets();
                        }
                    });

                    pRow.appendChild(swatches); pRow.appendChild(nameInp);
                    pRow.appendChild(applyToSel); pRow.appendChild(applyBtn); pRow.appendChild(delBtn);
                    presetsContainer.appendChild(pRow);
                }
            };
            renderPresets();

            // ── Saved palettes (collapsed toggle, secondary) ──────────────────
            const div3 = document.createElement("div");
            div3.className = "ebc-divider"; div3.style.margin = "10px 0 4px";
            container.appendChild(div3);

            let palCollapsed = true;
            try { palCollapsed = localStorage.getItem("EBC_paletteCollapsed") !== "0"; } catch { /* ignore */ }
            const palToggle = document.createElement("div");
            palToggle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#6a4a5a;cursor:pointer;user-select:none;padding:2px 0 4px;";
            palToggle.textContent = (palCollapsed ? "▶" : "▼") + " Saved palettes (capture & apply full looks)";
            const palContainer = document.createElement("div");

            const renderPal = (): void => {
                while (palContainer.firstChild) palContainer.removeChild(palContainer.firstChild);
                if (palCollapsed) return;

                const buildPRow = (p: import("./palettes").ColorPalette, rerender: () => void): HTMLElement => {
                    const prow = document.createElement("div"); prow.className = "ebc-palette-row";
                    const sw = document.createElement("div"); sw.className = "ebc-palette-swatch";
                    const cols = ([] as string[]).concat(...Object.values(p.colorMap).map(c => Array.isArray(c) ? c : [c as string])).filter(Boolean).slice(0, 8);
                    for (const c of cols) { const d = document.createElement("div"); d.className = "ebc-palette-dot"; d.style.background = c; sw.appendChild(d); }
                    const ni = document.createElement("input");
                    ni.className = "ebc-palette-name"; ni.value = p.name; ni.maxLength = 30; ni.title = "Rename";
                    ni.addEventListener("change", () => renamePalette(p.id, ni.value));
                    const ab = document.createElement("button"); ab.className = "ebc-wear-btn"; ab.textContent = t("core.apply");
                    ab.addEventListener("click", () => { applyPalette(p.id); ab.textContent = t("core.done"); window.setTimeout(() => { ab.textContent = t("core.apply"); }, 1200); });
                    let dp = false, dt: ReturnType<typeof window.setTimeout> | null = null;
                    const db = document.createElement("button"); db.className = "ebc-outfit-del"; db.textContent = "×";
                    db.addEventListener("click", () => {
                        if (!dp) { dp = true; db.classList.add("confirm"); db.textContent = "Sure?"; dt = window.setTimeout(() => { dp = false; db.classList.remove("confirm"); db.textContent = "×"; }, 2500); }
                        else { if (dt) window.clearTimeout(dt); deletePalette(p.id); rerender(); }
                    });
                    prow.appendChild(sw); prow.appendChild(ni); prow.appendChild(ab); prow.appendChild(db);
                    return prow;
                };
                const buildSRow = (ph: string, lbl: string, onSave: (n: string) => void, rerender: () => void): HTMLElement => {
                    const w = document.createElement("div"); w.style.cssText = "display:flex;gap:5px;align-items:center;margin-top:4px;";
                    const i = document.createElement("input"); i.className = "ebc-form-input"; i.style.flex = "1"; i.placeholder = ph; i.maxLength = 30;
                    const b = document.createElement("button"); b.className = "ebc-wear-btn"; b.textContent = lbl;
                    b.addEventListener("click", () => { onSave(i.value.trim()); i.value = ""; rerender(); });
                    w.appendChild(i); w.appendChild(b); return w;
                };

                const oLbl = document.createElement("div"); oLbl.className = "ebc-import-hint"; oLbl.style.cssText = "font-weight:600;margin-bottom:3px;margin-top:2px;"; oLbl.textContent = t("palettes.outfit"); palContainer.appendChild(oLbl);
                const ops = getPalettesByType("outfit");
                for (const p of ops) palContainer.appendChild(buildPRow(p, renderPal));
                if (!ops.length) { const n = document.createElement("div"); n.className = "ebc-empty"; n.style.padding = "2px 4px 4px"; n.textContent = t("palettes.noOutfit"); palContainer.appendChild(n); }
                palContainer.appendChild(buildSRow(t("palettes.paletteName"), t("palettes.saveOutfit"), n => captureCurrentPalette(n || "Palette"), renderPal));

                const pd = document.createElement("div"); pd.className = "ebc-divider"; pd.style.margin = "8px 0 4px"; palContainer.appendChild(pd);
                const rLbl = document.createElement("div"); rLbl.className = "ebc-import-hint"; rLbl.style.cssText = "font-weight:600;margin-bottom:3px;"; rLbl.textContent = "RESTRAINTS ⛓"; palContainer.appendChild(rLbl);
                const rps = getPalettesByType("restraint");
                for (const p of rps) palContainer.appendChild(buildPRow(p, renderPal));
                if (!rps.length) { const n = document.createElement("div"); n.className = "ebc-empty"; n.style.padding = "2px 4px 4px"; n.textContent = t("palettes.noRestraint"); palContainer.appendChild(n); }
                palContainer.appendChild(buildSRow(t("palettes.paletteName"), t("palettes.saveRestraint"), n => captureRestraintPalette(n || "Restraint Palette"), renderPal));
            };

            palToggle.addEventListener("click", () => {
                palCollapsed = !palCollapsed;
                try { localStorage.setItem("EBC_paletteCollapsed", palCollapsed ? "1" : "0"); } catch { /* ignore */ }
                palToggle.textContent = (palCollapsed ? "▶" : "▼") + " Saved palettes (capture & apply full looks)";
                renderPal();
            });
            container.appendChild(palToggle);
            container.appendChild(palContainer);
            renderPal();
        };

        const updateLabel = (): void => {
            const cc = getCustomColors().length;
            label.textContent = (collapsed ? "▶" : "▼") + ` ${cc > 0 ? t("outfits.coloursN", { n: cc }) : t("outfits.colours")}`;
        };

        label.addEventListener("click", () => {
            collapsed = !collapsed;
            try { localStorage.setItem("EBC_coloursCollapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
            updateLabel();
            build();
        });
        updateLabel(); build();
        body.appendChild(label);
        body.appendChild(container);
    }

    private buildOutfitRow(o: ConfiguredOutfit, body: HTMLElement): HTMLElement {
        // Wrapper holds the visual row + collapsible diff panel
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";

        const row = document.createElement("div");
        row.className = "ebc-outfit-row";
        row.style.marginBottom = "0";
        row.style.borderRadius = "7px 7px 7px 7px";

        const info = document.createElement("div");
        info.className = "ebc-outfit-info";

        const nameEl = document.createElement("span");
        nameEl.className = "ebc-outfit-name";
        nameEl.textContent = o.displayName;

        const cmdEl = document.createElement("span");
        cmdEl.className = "ebc-outfit-cmd";
        cmdEl.textContent = "/" + o.command;

        const isPreserving = o.preserveRestraints !== false;
        const isPreservingClothing = !!o.preserveClothing;
        const isNameInAnnounce = o.nameInAnnounce !== false;

        // Labeled toggle chips — live inside the info column so they're readable without hover
        const flagsRow = document.createElement("div");
        flagsRow.className = "ebc-outfit-flags";

        const preserveBtn = document.createElement("button");
        preserveBtn.className = "ebc-flag-chip" + (isPreserving ? " on" : "");
        preserveBtn.textContent = isPreserving ? t("outfits.preserveBonds") : t("outfits.swapBonds");

        const preserveClothingBtn = document.createElement("button");
        preserveClothingBtn.className = "ebc-flag-chip" + (isPreservingClothing ? " on" : "");
        preserveClothingBtn.textContent = isPreservingClothing ? t("outfits.keepClothes") : t("outfits.swapClothes");

        const nameInAnnounceBtn = document.createElement("button");
        nameInAnnounceBtn.className = "ebc-flag-chip" + (isNameInAnnounce ? " on" : "");
        nameInAnnounceBtn.textContent = isNameInAnnounce ? "👤 With name" : "👤 No name";

        flagsRow.appendChild(preserveBtn);
        flagsRow.appendChild(preserveClothingBtn);
        flagsRow.appendChild(nameInAnnounceBtn);

        info.appendChild(nameEl);
        info.appendChild(cmdEl);
        info.appendChild(flagsRow);

        // Tag chips display
        const tagsRow = document.createElement("div");
        tagsRow.className = "ebc-outfit-tags";
        const renderTagChips = (): void => {
            while (tagsRow.firstChild) tagsRow.removeChild(tagsRow.firstChild);
            const allTags = getOutfitTags();
            const outfitTagIds = new Set(o.tagIds ?? []);
            for (const tag of allTags) {
                if (!outfitTagIds.has(tag.id)) continue;
                const chip = document.createElement("span");
                chip.className = "ebc-tag-chip";
                chip.style.background = tag.color;
                chip.textContent = tag.name;
                tagsRow.appendChild(chip);
            }
        };
        renderTagChips();
        info.appendChild(tagsRow);

        const updateBtn = document.createElement("button");
        updateBtn.className = "ebc-update-btn";
        updateBtn.textContent = t("core.update");
        updateBtn.title = "Save current appearance to this outfit";

        const wearBtn = document.createElement("button");
        wearBtn.className = "ebc-wear-btn";
        wearBtn.textContent = t("core.wear");

        const diffBtn = document.createElement("button");
        diffBtn.className = "ebc-diff-btn";
        diffBtn.textContent = "~";
        diffBtn.title = "Preview appearance changes";

        const PENCIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        const editBtn = document.createElement("button");
        editBtn.className = "ebc-edit-btn";
        editBtn.innerHTML = PENCIL_SVG;
        editBtn.title = "Edit outfit name, command and settings";

        const delBtn = document.createElement("button");
        delBtn.className = "ebc-outfit-del";
        delBtn.textContent = "×";
        delBtn.title = t("outfits.deleteTitle");

        // Reorder column
        const outfitsList = getOutfits();
        const thisIdx = outfitsList.findIndex(x => x.id === o.id);
        const reorderCol = document.createElement("div");
        reorderCol.className = "ebc-reorder-col";
        const upBtn = document.createElement("button");
        upBtn.className = "ebc-reorder-btn";
        upBtn.textContent = t("core.moveUp");
        upBtn.title = t("core.moveUpTitle");
        upBtn.disabled = thisIdx <= 0;
        upBtn.addEventListener("click", () => { moveOutfit(o.id, "up"); this.rerender(); });
        const downBtn = document.createElement("button");
        downBtn.className = "ebc-reorder-btn";
        downBtn.textContent = t("core.moveDown");
        downBtn.title = t("core.moveDownTitle");
        downBtn.disabled = thisIdx >= outfitsList.length - 1;
        downBtn.addEventListener("click", () => { moveOutfit(o.id, "down"); this.rerender(); });
        reorderCol.appendChild(upBtn);
        reorderCol.appendChild(downBtn);
        row.appendChild(reorderCol);
        row.appendChild(info);
        row.appendChild(diffBtn);
        row.appendChild(editBtn);
        row.appendChild(updateBtn);
        row.appendChild(wearBtn);
        row.appendChild(delBtn);

        // Helper: determine which sub-panel (if any) is open
        const closeAllPanels = (): void => {
            editPanel.classList.remove("open");
            diffPanel.classList.remove("open");
            editBtn.classList.remove("open");
            diffBtn.classList.remove("open");
            row.style.borderRadius = "7px";
        };

        // Edit panel
        const editPanel = document.createElement("div");
        editPanel.className = "ebc-edit-panel";

        // Build form fields inside editPanel
        const makeEditRow = (labelText: string, input: HTMLInputElement | HTMLSelectElement): HTMLElement => {
            const r = document.createElement("div");
            r.className = "ebc-form-row";
            const lbl = document.createElement("span");
            lbl.className = "ebc-form-label";
            lbl.textContent = labelText;
            r.appendChild(lbl);
            r.appendChild(input);
            return r;
        };

        const eCmdInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: o.command, maxLength: 20,
        });
        const eNameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: o.displayName, maxLength: 40,
        });
        const eAnnounceInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: o.announceText, maxLength: 120,
        });
        const eNicknameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: o.nickname ?? "", maxLength: 40,
            placeholder: "Optional — blank = no change",
        });
        const eTitleSel = this.makeTitleSelect(o.title ?? "");

        editPanel.appendChild(makeEditRow("Command", eCmdInput));
        editPanel.appendChild(makeEditRow("Name", eNameInput));
        editPanel.appendChild(makeEditRow("Announce", eAnnounceInput));
        editPanel.appendChild(makeEditRow("Nickname", eNicknameInput));
        editPanel.appendChild(makeEditRow("Title", eTitleSel));

        // Tag assignment
        const eTagsLbl = document.createElement("div");
        eTagsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5060;margin:6px 0 3px;";
        eTagsLbl.textContent = "Tags";

        const eTagsGrid = document.createElement("div");
        eTagsGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";

        const renderEditTags = (): void => {
            while (eTagsGrid.firstChild) eTagsGrid.removeChild(eTagsGrid.firstChild);
            const allTags = getOutfitTags();
            if (allTags.length === 0) {
                const hint = document.createElement("span");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;";
                hint.textContent = "No tags yet — create some in the Tags section below.";
                eTagsGrid.appendChild(hint);
                return;
            }
            const currentTagIds = new Set(o.tagIds ?? []);
            for (const tag of allTags) {
                const btn = document.createElement("button");
                btn.style.cssText = `padding:2px 8px;border-radius:10px;font-family:'Trebuchet MS',serif;font-size:9px;font-weight:700;cursor:pointer;transition:opacity 0.12s,box-shadow 0.12s;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);border:2px solid transparent;background:${tag.color};`;
                btn.textContent = tag.name;
                const active = currentTagIds.has(tag.id);
                btn.style.opacity = active ? "1" : "0.35";
                btn.style.border = active ? `2px solid #fff` : "2px solid transparent";
                btn.addEventListener("click", () => {
                    const ids = new Set(o.tagIds ?? []);
                    if (ids.has(tag.id)) ids.delete(tag.id);
                    else ids.add(tag.id);
                    o.tagIds = [...ids];
                    setOutfitTagIds(o.id, o.tagIds);
                    renderTagChips();
                    renderEditTags();
                });
                eTagsGrid.appendChild(btn);
            }
        };
        renderEditTags();

        editPanel.appendChild(eTagsLbl);
        editPanel.appendChild(eTagsGrid);

        const eInclRow = document.createElement("label");
        eInclRow.className = "ebc-form-check-row";
        const eInclCheck = document.createElement("input");
        eInclCheck.type = "checkbox";
        eInclCheck.checked = !!o.includeRestraints;
        const eInclLbl = document.createElement("span");
        eInclLbl.className = "ebc-form-check-label";
        eInclLbl.textContent = "Include restraints in outfit";
        eInclRow.appendChild(eInclCheck);
        eInclRow.appendChild(eInclLbl);
        editPanel.appendChild(eInclRow);

        const ePreserveRow = document.createElement("label");
        ePreserveRow.className = "ebc-form-check-row";
        const ePreserveCheck = document.createElement("input");
        ePreserveCheck.type = "checkbox";
        ePreserveCheck.checked = isPreserving;
        const ePreserveLbl = document.createElement("span");
        ePreserveLbl.className = "ebc-form-check-label";
        ePreserveLbl.textContent = "Keep existing restraints when worn";
        ePreserveRow.appendChild(ePreserveCheck);
        ePreserveRow.appendChild(ePreserveLbl);
        editPanel.appendChild(ePreserveRow);

        const ePreserveClothingRow = document.createElement("label");
        ePreserveClothingRow.className = "ebc-form-check-row";
        const ePreserveClothingCheck = document.createElement("input");
        ePreserveClothingCheck.type = "checkbox";
        ePreserveClothingCheck.checked = isPreservingClothing;
        const ePreserveClothingLbl = document.createElement("span");
        ePreserveClothingLbl.className = "ebc-form-check-label";
        ePreserveClothingLbl.textContent = "Keep existing clothing when worn";
        ePreserveClothingRow.appendChild(ePreserveClothingCheck);
        ePreserveClothingRow.appendChild(ePreserveClothingLbl);
        editPanel.appendChild(ePreserveClothingRow);

        const eSaveBtn = document.createElement("button");
        eSaveBtn.className = "ebc-create-btn";
        eSaveBtn.textContent = t("outfits.saveChanges");
        editPanel.appendChild(eSaveBtn);

        // Export button inside edit panel (keeps the main row uncluttered)
        const eExportBtn = document.createElement("button");
        eExportBtn.className = "ebc-btn-footer-btn";
        eExportBtn.style.cssText = "margin-top:2px;font-size:10px;";
        eExportBtn.textContent = "↑ Copy to Clipboard";
        eExportBtn.title = "Export this outfit as JSON to share with others";
        editPanel.appendChild(eExportBtn);

        // Diff panel
        const diffPanel = document.createElement("div");
        diffPanel.className = "ebc-diff-panel";

        wrapper.appendChild(row);
        wrapper.appendChild(editPanel);
        wrapper.appendChild(diffPanel);

        const setAllDisabled = (v: boolean): void => {
            body.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn, .ebc-update-btn").forEach(b => { b.disabled = v; });
        };

        preserveBtn.addEventListener("click", () => {
            const next = !preserveBtn.classList.contains("on");
            preserveBtn.className = "ebc-flag-chip" + (next ? " on" : "");
            preserveBtn.textContent = next ? t("outfits.preserveBonds") : t("outfits.swapBonds");
            setOutfitPreserveRestraints(o.id, next);
            ePreserveCheck.checked = next;
        });

        preserveClothingBtn.addEventListener("click", () => {
            const next = !preserveClothingBtn.classList.contains("on");
            preserveClothingBtn.className = "ebc-flag-chip" + (next ? " on" : "");
            preserveClothingBtn.textContent = next ? t("outfits.keepClothes") : t("outfits.swapClothes");
            setOutfitPreserveClothing(o.id, next);
            ePreserveClothingCheck.checked = next;
        });

        nameInAnnounceBtn.addEventListener("click", () => {
            const next = !nameInAnnounceBtn.classList.contains("on");
            nameInAnnounceBtn.className = "ebc-flag-chip" + (next ? " on" : "");
            nameInAnnounceBtn.textContent = next ? "👤 With name" : "👤 No name";
            setOutfitNameInAnnounce(o.id, next);
        });

        wearBtn.addEventListener("click", () => {
            const fresh = getOutfits().find(x => x.id === o.id);
            if (!fresh) return;
            setAllDisabled(true);
            applyOutfit(fresh);
            window.setTimeout(() => setAllDisabled(false), 500);
        });

        updateBtn.addEventListener("click", () => {
            showConfirmOverlay(
                `Overwrite "${o.displayName}" with your current look?`,
                "Cancel", "Update",
                () => {
                    setAllDisabled(true);
                    const ok = saveCurrentAppearanceToOutfit(o.id);
                    if (!ok) { setAllDisabled(false); return; }
                    updateBtn.textContent = t("core.saved");
                    window.setTimeout(() => {
                        updateBtn.textContent = t("core.update");
                        setAllDisabled(false);
                    }, 1200);
                }
            );
        });

        editBtn.addEventListener("click", () => {
            const willOpen = !editPanel.classList.contains("open");
            closeAllPanels();
            if (willOpen) {
                editPanel.classList.add("open");
                editBtn.classList.add("open");
                row.style.borderRadius = "7px 7px 0 0";
                eCmdInput.focus();
            }
        });

        eSaveBtn.addEventListener("click", () => {
            eCmdInput.style.borderColor  = eCmdInput.value.trim()  ? "" : "#cf6f98";
            eNameInput.style.borderColor = eNameInput.value.trim() ? "" : "#cf6f98";
            if (!eCmdInput.value.trim() || !eNameInput.value.trim()) return;

            const ok = editOutfit(
                o.id,
                eCmdInput.value,
                eNameInput.value,
                eAnnounceInput.value,
                eInclCheck.checked,
                ePreserveCheck.checked,
                ePreserveClothingCheck.checked,
                eNicknameInput.value,
                eTitleSel.value,
            );
            if (ok) this.rerender();
        });

        eExportBtn.addEventListener("click", () => {
            const json = exportOutfitById(o.id);
            if (!json) return;
            const showFallback = (): void => {
                // Can't write clipboard — fall back to legacy execCommand
                try {
                    const tmp = document.createElement("input");
                    tmp.value = json;
                    tmp.style.cssText = "position:fixed;top:-9999px;";
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand("copy");
                    document.body.removeChild(tmp);
                } catch { /* execCommand deprecated; ignore */ }
                eExportBtn.textContent = "Copied!";
                window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
            };
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(json)
                    .then(() => {
                        eExportBtn.textContent = "Copied!";
                        window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
                    })
                    .catch(showFallback)
                    .catch(() => { /* ignore */ });
            } else {
                showFallback();
            }
        });

        diffBtn.addEventListener("click", () => {
            const willOpen = !diffPanel.classList.contains("open");
            closeAllPanels();
            if (willOpen) {
                diffPanel.classList.add("open");
                diffBtn.classList.add("open");
                row.style.borderRadius = "7px 7px 0 0";
                this.renderDiff(diffPanel, o);
            }
        });

        let delPending = false;
        let delTimer: ReturnType<typeof window.setTimeout> | null = null;
        delBtn.addEventListener("click", () => {
            if (!delPending) {
                delPending = true;
                delBtn.classList.add("confirm");
                delBtn.textContent = "Sure?";
                delBtn.title = "Click again to confirm deletion";
                delTimer = window.setTimeout(() => {
                    delPending = false;
                    delBtn.classList.remove("confirm");
                    delBtn.textContent = "×";
                    delBtn.title = t("outfits.deleteTitle");
                }, 2500);
            } else {
                if (delTimer !== null) window.clearTimeout(delTimer);
                deleteOutfit(o.id);
                this.rerender();
            }
        });

        return wrapper;
    }

    private buildNewOutfitSection(target: HTMLElement): void {
        const div = document.createElement("div");
        div.className = "ebc-divider";
        target.appendChild(div);

        const newBtn = document.createElement("button");
        newBtn.className = "ebc-new-outfit-btn";
        newBtn.textContent = t("outfits.newOutfit");
        target.appendChild(newBtn);

        const form = document.createElement("div");
        form.className = "ebc-new-form";
        target.appendChild(form);

        const makeRow = (labelText: string, input: HTMLInputElement | HTMLSelectElement): HTMLElement => {
            const row = document.createElement("div");
            row.className = "ebc-form-row";
            const lbl = document.createElement("span");
            lbl.className = "ebc-form-label";
            lbl.textContent = labelText;
            row.appendChild(lbl);
            row.appendChild(input);
            return row;
        };

        const cmdInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "e.g. dom", maxLength: 20,
        });
        const nameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "e.g. Dom Clothes", maxLength: 40,
        });
        const announceInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "e.g. changes into dom mode", maxLength: 120,
        });
        const nicknameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "Optional — blank = no change", maxLength: 40,
        });
        const newTitleSel = this.makeTitleSelect("");

        form.appendChild(makeRow(t("outfits.commandLabel"), cmdInput));
        form.appendChild(makeRow(t("outfits.nameLabel"), nameInput));
        form.appendChild(makeRow("Announce", announceInput));
        form.appendChild(makeRow("Nickname", nicknameInput));
        form.appendChild(makeRow("Title", newTitleSel));

        const checkRow = document.createElement("label");
        checkRow.className = "ebc-form-check-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        const checkLbl = document.createElement("span");
        checkLbl.className = "ebc-form-check-label";
        checkLbl.textContent = "Include restraints in outfit";
        checkRow.appendChild(checkbox);
        checkRow.appendChild(checkLbl);
        form.appendChild(checkRow);

        const preserveRow = document.createElement("label");
        preserveRow.className = "ebc-form-check-row";
        const preserveCheckbox = document.createElement("input");
        preserveCheckbox.type = "checkbox";
        preserveCheckbox.checked = true; // default: preserve existing restraints
        const preserveLbl = document.createElement("span");
        preserveLbl.className = "ebc-form-check-label";
        preserveLbl.textContent = "Keep existing restraints when worn";
        preserveRow.appendChild(preserveCheckbox);
        preserveRow.appendChild(preserveLbl);
        form.appendChild(preserveRow);

        const createBtn = document.createElement("button");
        createBtn.className = "ebc-create-btn";
        createBtn.textContent = t("outfits.saveNewOutfit");
        form.appendChild(createBtn);

        newBtn.addEventListener("click", () => {
            const open = form.style.display !== "none";
            form.style.display = open ? "none" : "flex";
            newBtn.textContent = open ? t("outfits.newOutfit") : t("core.cancel");
            if (!open) cmdInput.focus();
        });

        createBtn.addEventListener("click", () => {
            cmdInput.style.borderColor = cmdInput.value.trim() ? "" : "#cf6f98";
            nameInput.style.borderColor = nameInput.value.trim() ? "" : "#cf6f98";
            if (!cmdInput.value.trim() || !nameInput.value.trim()) return;

            createBtn.disabled = true;
            createBtn.textContent = "Saving...";

            const result = createOutfitFromCurrent(
                cmdInput.value, nameInput.value, announceInput.value,
                checkbox.checked, preserveCheckbox.checked,
                false, nicknameInput.value, newTitleSel.value,
            );
            if (result) {
                cmdInput.value = "";
                nameInput.value = "";
                announceInput.value = "";
                nicknameInput.value = "";
                newTitleSel.value = "";
                checkbox.checked = false;
                form.style.display = "none";
                newBtn.textContent = t("outfits.newOutfit");
                this.rerender();
            } else {
                createBtn.disabled = false;
                createBtn.textContent = t("outfits.saveNewOutfit");
            }
        });

        // -- Import outfit section --
        const impDiv = document.createElement("div");
        impDiv.className = "ebc-divider";
        target.appendChild(impDiv);

        const impToggleBtn = document.createElement("button");
        impToggleBtn.className = "ebc-new-outfit-btn";
        impToggleBtn.textContent = t("outfits.importOutfit");
        target.appendChild(impToggleBtn);

        const impPanel = document.createElement("div");
        impPanel.className = "ebc-import-panel";
        target.appendChild(impPanel);

        const impHint = document.createElement("div");
        impHint.className = "ebc-import-hint";
        impHint.textContent = "Paste EBC outfit JSON or a BC outfit code:";
        impPanel.appendChild(impHint);

        const impTextarea = document.createElement("textarea");
        impTextarea.className = "ebc-notes-textarea";
        impTextarea.placeholder = 'EBC JSON: {"ebc":1,...}  –OR–  BC code: NobwRAcgh...';
        impTextarea.rows = 3;
        impPanel.appendChild(impTextarea);

        // Extra fields shown only when a BC code is detected (auto-shown on paste)
        const bcFields = document.createElement("div");
        bcFields.style.cssText = "display:none;flex-direction:column;gap:4px;margin-top:4px;";
        const bcNameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: t("outfits.namePlaceholder"),
        });
        const bcCmdInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: t("outfits.cmdPlaceholder"),
            maxLength: 20,
        });
        const mkRow = (label: string, el: HTMLElement): HTMLElement => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:6px;";
            const lbl = Object.assign(document.createElement("span"), {
                className: "ebc-form-label",
                textContent: label,
            });
            lbl.style.minWidth = "58px";
            row.appendChild(lbl);
            row.appendChild(el);
            return row;
        };
        // Mode selector: restraints / outfit / both
        const bcModeSelect = document.createElement("select");
        bcModeSelect.className = "ebc-form-input";
        [
            { value: "restraints", label: "⛓ Restraints only" },
            { value: "outfit",     label: "👗 Outfit only (no restraints)" },
            { value: "both",       label: "✦ Everything (full appearance)" },
        ].forEach(opt => {
            const o = document.createElement("option");
            o.value = opt.value; o.textContent = opt.label;
            bcModeSelect.appendChild(o);
        });

        bcFields.appendChild(mkRow("Name", bcNameInput));
        bcFields.appendChild(mkRow("Command", bcCmdInput));
        bcFields.appendChild(mkRow("Import", bcModeSelect));
        impPanel.appendChild(bcFields);

        // Detect BC vs EBC format on paste/input
        let isBCCode = false;
        const detectFormat = (): void => {
            const v = impTextarea.value.trim();
            isBCCode = v.length > 0 && !v.startsWith("{");
            bcFields.style.display = isBCCode ? "flex" : "none";
        };
        impTextarea.addEventListener("input", detectFormat);
        impTextarea.addEventListener("paste", () => window.setTimeout(detectFormat, 0));

        const impError = document.createElement("div");
        impError.className = "ebc-import-error";
        impPanel.appendChild(impError);

        const impActionRow = document.createElement("div");
        impActionRow.style.cssText = "display:flex;gap:5px;";
        const impLoadBtn = document.createElement("button");
        impLoadBtn.className = "ebc-create-btn";
        impLoadBtn.style.marginTop = "0";
        impLoadBtn.textContent = "Import";
        const impCancelBtn = document.createElement("button");
        impCancelBtn.className = "ebc-btn-footer-btn";
        impCancelBtn.textContent = "Cancel";
        impActionRow.appendChild(impLoadBtn);
        impActionRow.appendChild(impCancelBtn);
        impPanel.appendChild(impActionRow);

        const closeImpPanel = (): void => {
            impPanel.classList.remove("open");
            impToggleBtn.textContent = t("outfits.importOutfit");
            impTextarea.value = ""; impError.textContent = "";
            bcNameInput.value = ""; bcCmdInput.value = "";
            bcModeSelect.value = "restraints";
            bcFields.style.display = "none"; isBCCode = false;
        };

        impToggleBtn.addEventListener("click", () => {
            const open = impPanel.classList.contains("open");
            impPanel.classList.toggle("open", !open);
            impToggleBtn.textContent = open ? t("outfits.importOutfit") : t("outfits.cancelImport");
            if (!open) { impTextarea.value = ""; impError.textContent = ""; impTextarea.focus(); }
        });

        impCancelBtn.addEventListener("click", closeImpPanel);

        impLoadBtn.addEventListener("click", () => {
            impError.textContent = "";
            try {
                if (isBCCode) {
                    importOutfitFromBCCode(
                        impTextarea.value.trim(),
                        bcNameInput.value.trim() || "Imported Outfit",
                        bcCmdInput.value.trim() || "imported",
                        bcModeSelect.value as BCImportMode,
                    );
                } else {
                    importOutfitFromJSON(impTextarea.value.trim());
                }
                closeImpPanel();
                this.rerender();
            } catch (err) {
                impError.textContent = err instanceof Error ? err.message : "Invalid format.";
            }
        });
    }

    // -- Saved Restraints section ----------------------------------------------

    private buildRestraintSection(body: HTMLElement): void {
        const divEl = document.createElement("div");
        divEl.className = "ebc-divider";
        body.appendChild(divEl);

        // Collapsible header
        let restraintsCollapsed = false;
        try { restraintsCollapsed = localStorage.getItem("EBC_restraintsCollapsed") === "1"; } catch { /* ignore */ }

        const lbl = document.createElement("div");
        lbl.className = "ebc-section-label";
        lbl.style.cssText = "cursor:pointer;user-select:none;";
        lbl.textContent = (restraintsCollapsed ? "▶" : "▼") + " " + t("outfits.savedRestraints");
        body.appendChild(lbl);

        const sectionBody = document.createElement("div");
        sectionBody.style.display = restraintsCollapsed ? "none" : "block";

        const toggleCollapsed = (): void => {
            restraintsCollapsed = !restraintsCollapsed;
            sectionBody.style.display = restraintsCollapsed ? "none" : "block";
            lbl.textContent = (restraintsCollapsed ? "▶" : "▼") + " " + t("outfits.savedRestraints");
            try { localStorage.setItem("EBC_restraintsCollapsed", restraintsCollapsed ? "1" : "0"); } catch { /* ignore */ }
        };
        lbl.addEventListener("click", toggleCollapsed);

        const renderRestraintList = (): void => {
            while (sectionBody.firstChild) sectionBody.removeChild(sectionBody.firstChild);

            const restraints = getRestraints();
            if (restraints.length > 0) {
                for (const r of restraints) {
                    sectionBody.appendChild(this.buildRestraintRow(r, sectionBody, renderRestraintList));
                }
            } else {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.textContent = t("restraints.noRestraints");
                const br = document.createElement("br");
                const hint = document.createElement("span");
                hint.style.color = "#4c2537";
                hint.textContent = t("outfits.useFormBelow");
                empty.appendChild(br);
                empty.appendChild(hint);
                sectionBody.appendChild(empty);
            }

            // Import restraint set section
            const impRDivider = document.createElement("div");
            impRDivider.className = "ebc-divider";
            sectionBody.appendChild(impRDivider);

            const impRToggleBtn = document.createElement("button");
            impRToggleBtn.className = "ebc-new-outfit-btn";
            impRToggleBtn.textContent = "↓ Import Restraint Set";
            sectionBody.appendChild(impRToggleBtn);

            const impRPanel = document.createElement("div");
            impRPanel.className = "ebc-import-panel";
            sectionBody.appendChild(impRPanel);

            const impRHint = document.createElement("div");
            impRHint.className = "ebc-import-hint";
            impRHint.textContent = "Paste a BC outfit code (restraints will be extracted):";
            impRPanel.appendChild(impRHint);

            const impRTextarea = document.createElement("textarea");
            impRTextarea.className = "ebc-notes-textarea";
            impRTextarea.placeholder = "BC code: NobwRAcgh...";
            impRTextarea.rows = 3;
            impRPanel.appendChild(impRTextarea);

            const impRFields = document.createElement("div");
            impRFields.style.cssText = "display:flex;flex-direction:column;gap:4px;margin-top:4px;";
            const impRNameInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "Restraint set name (e.g. Hogtied)",
            });
            const impRCmdInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: t("outfits.cmdPlaceholder"),
                maxLength: 20,
            });
            const mkImpRRow = (label: string, el: HTMLElement): HTMLElement => {
                const row2 = document.createElement("div");
                row2.style.cssText = "display:flex;align-items:center;gap:6px;";
                const lbl3 = Object.assign(document.createElement("span"), {
                    className: "ebc-form-label", textContent: label,
                });
                lbl3.style.minWidth = "58px";
                row2.appendChild(lbl3);
                row2.appendChild(el);
                return row2;
            };
            impRFields.appendChild(mkImpRRow("Name", impRNameInput));
            impRFields.appendChild(mkImpRRow("Command", impRCmdInput));
            impRPanel.appendChild(impRFields);

            const impRError = document.createElement("div");
            impRError.className = "ebc-import-error";
            impRPanel.appendChild(impRError);

            const impRActionRow = document.createElement("div");
            impRActionRow.style.cssText = "display:flex;gap:5px;";
            const impRLoadBtn = document.createElement("button");
            impRLoadBtn.className = "ebc-create-btn";
            impRLoadBtn.style.marginTop = "0";
            impRLoadBtn.textContent = "Import";
            const impRCancelBtn = document.createElement("button");
            impRCancelBtn.className = "ebc-btn-footer-btn";
            impRCancelBtn.textContent = "Cancel";
            impRActionRow.appendChild(impRLoadBtn);
            impRActionRow.appendChild(impRCancelBtn);
            impRPanel.appendChild(impRActionRow);

            const closeImpRPanel = (): void => {
                impRPanel.classList.remove("open");
                impRToggleBtn.textContent = t("outfits.importOutfit");
                impRTextarea.value = "";
                impRError.textContent = "";
                impRNameInput.value = "";
                impRCmdInput.value = "";
            };

            impRToggleBtn.addEventListener("click", () => {
                const open = impRPanel.classList.contains("open");
                impRPanel.classList.toggle("open", !open);
                impRToggleBtn.textContent = open ? t("outfits.importOutfit") : t("outfits.cancelImport");
                if (!open) { impRTextarea.value = ""; impRError.textContent = ""; impRTextarea.focus(); }
            });

            impRCancelBtn.addEventListener("click", closeImpRPanel);

            impRLoadBtn.addEventListener("click", () => {
                impRError.textContent = "";
                try {
                    importOutfitFromBCCode(
                        impRTextarea.value.trim(),
                        impRNameInput.value.trim() || "Imported Restraints",
                        impRCmdInput.value.trim() || "imported",
                        "restraints",
                    );
                    closeImpRPanel();
                    renderRestraintList();
                } catch (err) {
                    impRError.textContent = err instanceof Error ? err.message : "Invalid format.";
                }
            });

            // New restraint form
            const formDivider = document.createElement("div");
            formDivider.className = "ebc-divider";
            sectionBody.appendChild(formDivider);

            const newBtn = document.createElement("button");
            newBtn.className = "ebc-new-outfit-btn";
            newBtn.textContent = t("restraints.newRestraint");
            sectionBody.appendChild(newBtn);

            const form = document.createElement("div");
            form.className = "ebc-new-form";
            sectionBody.appendChild(form);

            const makeRow = (labelText: string, input: HTMLInputElement): HTMLElement => {
                const row = document.createElement("div");
                row.className = "ebc-form-row";
                const lbl2 = document.createElement("span");
                lbl2.className = "ebc-form-label";
                lbl2.textContent = labelText;
                row.appendChild(lbl2);
                row.appendChild(input);
                return row;
            };

            const cmdInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. hogtied", maxLength: 20,
            });
            const nameInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. Hogtied", maxLength: 40,
            });
            const announceInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. is put in a hogtie", maxLength: 120,
            });

            form.appendChild(makeRow("Command", cmdInput));
            form.appendChild(makeRow("Name", nameInput));
            form.appendChild(makeRow("Announce", announceInput));

            const createBtn = document.createElement("button");
            createBtn.className = "ebc-create-btn";
            createBtn.textContent = "Save as New Restraint Set";
            form.appendChild(createBtn);

            // Start hidden via inline style (CSS default is display:none but inline style
            // starts as "" which the toggle check misreads — set it explicitly)
            form.style.display = "none";

            newBtn.addEventListener("click", () => {
                const open = form.style.display !== "none";
                form.style.display = open ? "none" : "flex";
                newBtn.textContent = open ? t("restraints.newRestraint") : t("core.cancel");
                if (!open) cmdInput.focus();
            });

            createBtn.addEventListener("click", () => {
                cmdInput.style.borderColor = cmdInput.value.trim() ? "" : "#cf6f98";
                nameInput.style.borderColor = nameInput.value.trim() ? "" : "#cf6f98";
                if (!cmdInput.value.trim() || !nameInput.value.trim()) return;

                createBtn.disabled = true;
                createBtn.textContent = "Saving...";

                const result = createRestraintFromCurrent(
                    cmdInput.value, nameInput.value, announceInput.value,
                );
                if (result) {
                    form.style.display = "none";
                    newBtn.textContent = t("restraints.newRestraint");
                    renderRestraintList();
                } else {
                    createBtn.disabled = false;
                    createBtn.textContent = "Save as New Restraint Set";
                }
            });

            // ── Colour Presets ───────────────────────────────────────────────────────
            const cpDivider = document.createElement("div");
            cpDivider.className = "ebc-divider";
            cpDivider.style.margin = "10px 0 6px";
            sectionBody.appendChild(cpDivider);

            const cpHeader = document.createElement("div");
            cpHeader.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:5px;";
            const cpLbl = document.createElement("div");
            cpLbl.className = "ebc-section-label";
            cpLbl.style.cssText += ";margin:0;flex:1;font-size:10px;";
            cpLbl.textContent = t("buttons.colourPresets");
            const cpHintEl = document.createElement("span");
            cpHintEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#4c2537;flex-shrink:0;";
            cpHintEl.textContent = "saved from restraint log";
            cpHeader.appendChild(cpLbl);
            cpHeader.appendChild(cpHintEl);
            sectionBody.appendChild(cpHeader);

            const cpContainer = document.createElement("div");
            sectionBody.appendChild(cpContainer);

            const renderColorPresets = (): void => {
                while (cpContainer.firstChild) cpContainer.removeChild(cpContainer.firstChild);
                const presets = getColorPresets();
                if (presets.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "ebc-empty";
                    empty.textContent = "No colour presets yet — use 💾 in the restraint log to save one.";
                    cpContainer.appendChild(empty);
                    return;
                }
                for (const preset of presets) {
                    const card = document.createElement("div");
                    card.style.cssText = "display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:5px;margin-bottom:3px;background:rgba(42,20,33,0.4);border:1px solid #2a1020;";

                    // Colour swatches
                    const colArr: string[] = Array.isArray(preset.colors) ? preset.colors : (preset.colors ? [preset.colors as string] : []);
                    const validCols = colArr.filter(c => typeof c === "string" && c.startsWith("#")).slice(0, 6);
                    const sw = document.createElement("span");
                    sw.style.cssText = "display:flex;align-items:center;gap:2px;flex-shrink:0;";
                    for (const col of validCols) {
                        const dot = document.createElement("span");
                        dot.style.cssText = `width:9px;height:9px;border-radius:50%;background:${col};border:1px solid #3a1928;display:inline-block;flex-shrink:0;`;
                        sw.appendChild(dot);
                    }
                    card.appendChild(sw);

                    // Name (editable)
                    const nameEl2 = document.createElement("span");
                    nameEl2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#f0d8ec;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;";
                    nameEl2.textContent = preset.name;
                    nameEl2.title = `${preset.group} · ${preset.itemName} — click to rename`;
                    nameEl2.addEventListener("click", () => {
                        showNameInputOverlay(`Rename "${preset.name}"`, preset.name, "Rename", (newName) => {
                            renameColorPreset(preset.id, newName);
                            renderColorPresets();
                        });
                    });
                    card.appendChild(nameEl2);

                    // Group label
                    const grpEl = document.createElement("span");
                    grpEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#4c2537;flex-shrink:0;white-space:nowrap;";
                    grpEl.textContent = preset.group;
                    card.appendChild(grpEl);

                    // Apply to set button
                    const applyPresetBtn = document.createElement("button");
                    applyPresetBtn.textContent = "▶ Set";
                    applyPresetBtn.title = "Apply these colours to a restraint set item";
                    applyPresetBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid #4c2537;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;white-space:nowrap;";
                    applyPresetBtn.addEventListener("mouseenter", () => { applyPresetBtn.style.color = "#cf6f98"; applyPresetBtn.style.borderColor = "#cf6f98"; });
                    applyPresetBtn.addEventListener("mouseleave", () => { applyPresetBtn.style.color = "#7a5a6a"; applyPresetBtn.style.borderColor = "#4c2537"; });
                    applyPresetBtn.addEventListener("click", () => {
                        const fullGroup = "Item" + preset.group;
                        const matching = getRestraints().filter(r => r.items.some(i => i.Group === fullGroup));
                        if (matching.length === 0) {
                            showConfirmOverlay(`No restraint set has an item in slot "${preset.group}". Save a set while wearing something in that slot first.`, "OK", "OK", () => {});
                            return;
                        }
                        // Build picker overlay
                        const pickOverlay = document.createElement("div");
                        pickOverlay.style.cssText = [
                            "position:fixed","top:50%","left:50%",
                            "transform:translate(-50%,-50%)",
                            "background:#130810","border:2px solid #cf6f98",
                            "border-radius:10px","padding:16px 20px",
                            "z-index:999999","font-family:'Trebuchet MS',serif",
                            "min-width:240px","max-width:300px",
                            "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
                            "display:flex","flex-direction:column","gap:8px",
                        ].join(";");
                        const pickLbl = document.createElement("div");
                        pickLbl.style.cssText = "font-size:12px;color:#cf6f98;";
                        pickLbl.textContent = `Apply "${preset.name}" colours to which set?`;
                        pickOverlay.appendChild(pickLbl);
                        for (const rs of matching) {
                            const btn2 = document.createElement("button");
                            btn2.textContent = rs.displayName;
                            btn2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;padding:5px 8px;border-radius:5px;border:1px solid #4c2537;background:transparent;color:#f0d8ec;cursor:pointer;text-align:left;";
                            btn2.addEventListener("mouseenter", () => { btn2.style.borderColor = "#cf6f98"; btn2.style.color = "#cf6f98"; });
                            btn2.addEventListener("mouseleave", () => { btn2.style.borderColor = "#4c2537"; btn2.style.color = "#f0d8ec"; });
                            btn2.addEventListener("click", () => {
                                pickOverlay.remove();
                                applyColorPresetToRestraint(rs.id, fullGroup, preset.colors);
                                renderRestraintList();
                            });
                            pickOverlay.appendChild(btn2);
                        }
                        const cancelBtn2 = document.createElement("button");
                        cancelBtn2.textContent = "Cancel";
                        cancelBtn2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #79a885;background:#0f2a1a;color:#79a885;margin-top:4px;";
                        cancelBtn2.addEventListener("click", () => pickOverlay.remove());
                        pickOverlay.appendChild(cancelBtn2);
                        document.body.appendChild(pickOverlay);
                    });
                    card.appendChild(applyPresetBtn);

                    // Delete button
                    const delBtn2 = document.createElement("button");
                    delBtn2.textContent = "×";
                    delBtn2.title = "Delete this colour preset";
                    delBtn2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:13px;padding:0 5px;border:none;background:transparent;color:#4c2537;cursor:pointer;flex-shrink:0;line-height:1;";
                    delBtn2.addEventListener("mouseenter", () => { delBtn2.style.color = "#e05070"; });
                    delBtn2.addEventListener("mouseleave", () => { delBtn2.style.color = "#4c2537"; });
                    delBtn2.addEventListener("click", () => {
                        removeColorPreset(preset.id);
                        renderColorPresets();
                    });
                    card.appendChild(delBtn2);

                    cpContainer.appendChild(card);
                }
            };
            renderColorPresets();
        };

        renderRestraintList();
        body.appendChild(sectionBody);
    }

    private buildRestraintRow(
        r: ConfiguredOutfit,
        container: HTMLElement,
        rerender: () => void,
    ): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "4px";

        const row = document.createElement("div");
        row.className = "ebc-outfit-row";
        row.style.marginBottom = "0";
        row.style.borderRadius = "7px 7px 7px 7px";

        const info = document.createElement("div");
        info.className = "ebc-outfit-info";

        const nameEl = document.createElement("span");
        nameEl.className = "ebc-outfit-name";
        nameEl.textContent = r.displayName;

        const cmdEl = document.createElement("span");
        cmdEl.className = "ebc-outfit-cmd";
        cmdEl.textContent = "/" + r.command;

        info.appendChild(nameEl);
        info.appendChild(cmdEl);

        // Name-in-announce flag chip
        const rIsNameInAnnounce = r.nameInAnnounce !== false;
        const rFlagsRow = document.createElement("div");
        rFlagsRow.className = "ebc-outfit-flags";
        const rNameInAnnounceBtn = document.createElement("button");
        rNameInAnnounceBtn.className = "ebc-flag-chip" + (rIsNameInAnnounce ? " on" : "");
        rNameInAnnounceBtn.textContent = rIsNameInAnnounce ? "👤 With name" : "👤 No name";
        rNameInAnnounceBtn.addEventListener("click", () => {
            const next = !rNameInAnnounceBtn.classList.contains("on");
            rNameInAnnounceBtn.className = "ebc-flag-chip" + (next ? " on" : "");
            rNameInAnnounceBtn.textContent = next ? "👤 With name" : "👤 No name";
            setOutfitNameInAnnounce(r.id, next);
        });
        rFlagsRow.appendChild(rNameInAnnounceBtn);
        info.appendChild(rFlagsRow);

        if (r.items.length === 0) {
            const emptyHint = document.createElement("span");
            emptyHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#cf6f98;font-style:italic;";
            emptyHint.textContent = "⚠ no items — click Update while wearing restraints";
            info.appendChild(emptyHint);
        }

        // Tag chips display
        const tagsRow = document.createElement("div");
        tagsRow.className = "ebc-outfit-tags";
        const renderTagChips = (): void => {
            while (tagsRow.firstChild) tagsRow.removeChild(tagsRow.firstChild);
            const allTags = getOutfitTags();
            const restraintTagIds = new Set(r.tagIds ?? []);
            for (const tag of allTags) {
                if (!restraintTagIds.has(tag.id)) continue;
                const chip = document.createElement("span");
                chip.className = "ebc-tag-chip";
                chip.style.background = tag.color;
                chip.textContent = tag.name;
                tagsRow.appendChild(chip);
            }
        };
        renderTagChips();
        info.appendChild(tagsRow);

        const restraintsList = getRestraints();
        const thisIdx = restraintsList.findIndex(x => x.id === r.id);
        const reorderCol = document.createElement("div");
        reorderCol.className = "ebc-reorder-col";
        const upBtn = document.createElement("button");
        upBtn.className = "ebc-reorder-btn";
        upBtn.textContent = t("core.moveUp");
        upBtn.title = t("core.moveUpTitle");
        upBtn.disabled = thisIdx <= 0;
        upBtn.addEventListener("click", () => { moveRestraint(r.id, "up"); rerender(); });
        const downBtn = document.createElement("button");
        downBtn.className = "ebc-reorder-btn";
        downBtn.textContent = t("core.moveDown");
        downBtn.title = t("core.moveDownTitle");
        downBtn.disabled = thisIdx >= restraintsList.length - 1;
        downBtn.addEventListener("click", () => { moveRestraint(r.id, "down"); rerender(); });
        reorderCol.appendChild(upBtn);
        reorderCol.appendChild(downBtn);

        const updateBtn = document.createElement("button");
        updateBtn.className = "ebc-update-btn";
        updateBtn.textContent = t("core.update");
        updateBtn.title = "Save current restraints to this set";

        const applyBtn = document.createElement("button");
        applyBtn.className = "ebc-wear-btn";
        applyBtn.textContent = t("core.apply");

        const PENCIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        const editBtn = document.createElement("button");
        editBtn.className = "ebc-edit-btn";
        editBtn.innerHTML = PENCIL_SVG;
        editBtn.title = "Edit name, command, announce";

        const delBtn = document.createElement("button");
        delBtn.className = "ebc-outfit-del";
        delBtn.textContent = "×";
        delBtn.title = t("restraints.deleteTitle");

        row.appendChild(reorderCol);
        row.appendChild(info);
        row.appendChild(editBtn);
        row.appendChild(updateBtn);
        row.appendChild(applyBtn);
        row.appendChild(delBtn);

        // Edit panel
        const editPanel = document.createElement("div");
        editPanel.className = "ebc-edit-panel";

        const makeEditRow = (labelText: string, input: HTMLInputElement): HTMLElement => {
            const eRow = document.createElement("div");
            eRow.className = "ebc-form-row";
            const eLbl = document.createElement("span");
            eLbl.className = "ebc-form-label";
            eLbl.textContent = labelText;
            eRow.appendChild(eLbl);
            eRow.appendChild(input);
            return eRow;
        };

        const eCmdInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: r.command, maxLength: 20,
        });
        const eNameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: r.displayName, maxLength: 40,
        });
        const eAnnounceInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: r.announceText, maxLength: 120,
        });

        editPanel.appendChild(makeEditRow("Command", eCmdInput));
        editPanel.appendChild(makeEditRow("Name", eNameInput));
        editPanel.appendChild(makeEditRow("Announce", eAnnounceInput));

        // Tag assignment
        const eTagsLbl = document.createElement("div");
        eTagsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5060;margin:6px 0 3px;";
        eTagsLbl.textContent = "Tags";

        const eTagsGrid = document.createElement("div");
        eTagsGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";

        const renderEditTags = (): void => {
            while (eTagsGrid.firstChild) eTagsGrid.removeChild(eTagsGrid.firstChild);
            const allTags = getOutfitTags();
            if (allTags.length === 0) {
                const hint = document.createElement("span");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;";
                hint.textContent = "No tags yet — create some in the Tags section above.";
                eTagsGrid.appendChild(hint);
                return;
            }
            const currentTagIds = new Set(r.tagIds ?? []);
            for (const tag of allTags) {
                const btn = document.createElement("button");
                btn.style.cssText = `padding:2px 8px;border-radius:10px;font-family:'Trebuchet MS',serif;font-size:9px;font-weight:700;cursor:pointer;transition:opacity 0.12s,box-shadow 0.12s;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);border:2px solid transparent;background:${tag.color};`;
                btn.textContent = tag.name;
                const active = currentTagIds.has(tag.id);
                btn.style.opacity = active ? "1" : "0.35";
                btn.style.border = active ? `2px solid #fff` : "2px solid transparent";
                btn.addEventListener("click", () => {
                    const ids = new Set(r.tagIds ?? []);
                    if (ids.has(tag.id)) ids.delete(tag.id);
                    else ids.add(tag.id);
                    r.tagIds = [...ids];
                    setRestraintTagIds(r.id, r.tagIds);
                    renderTagChips();
                    renderEditTags();
                });
                eTagsGrid.appendChild(btn);
            }
        };
        renderEditTags();

        editPanel.appendChild(eTagsLbl);
        editPanel.appendChild(eTagsGrid);

        const eSaveBtn = document.createElement("button");
        eSaveBtn.className = "ebc-create-btn";
        eSaveBtn.textContent = t("restraints.saveChanges");
        editPanel.appendChild(eSaveBtn);

        wrapper.appendChild(row);
        wrapper.appendChild(editPanel);

        const closeEditPanel = (): void => {
            editPanel.classList.remove("open");
            editBtn.classList.remove("open");
            row.style.borderRadius = "7px";
        };

        const setAllDisabled = (v: boolean): void => {
            container.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn, .ebc-update-btn").forEach(b => { b.disabled = v; });
        };

        applyBtn.addEventListener("click", () => {
            const fresh = getRestraints().find(x => x.id === r.id);
            if (!fresh) return;
            setAllDisabled(true);
            applyRestraintSet(fresh);
            window.setTimeout(() => setAllDisabled(false), 500);
        });

        updateBtn.addEventListener("click", () => {
            setAllDisabled(true);
            const ok = saveCurrentAppearanceToRestraint(r.id);
            if (!ok) { setAllDisabled(false); return; }
            updateBtn.textContent = t("core.saved");
            window.setTimeout(() => {
                updateBtn.textContent = t("core.update");
                setAllDisabled(false);
            }, 1200);
        });

        editBtn.addEventListener("click", () => {
            const willOpen = !editPanel.classList.contains("open");
            closeEditPanel();
            if (willOpen) {
                editPanel.classList.add("open");
                editBtn.classList.add("open");
                row.style.borderRadius = "7px 7px 0 0";
                eCmdInput.focus();
            }
        });

        eSaveBtn.addEventListener("click", () => {
            eCmdInput.style.borderColor = eCmdInput.value.trim() ? "" : "#cf6f98";
            eNameInput.style.borderColor = eNameInput.value.trim() ? "" : "#cf6f98";
            if (!eCmdInput.value.trim() || !eNameInput.value.trim()) return;

            const ok = editRestraint(r.id, eCmdInput.value, eNameInput.value, eAnnounceInput.value);
            if (ok) rerender();
        });

        let delPending = false;
        let delTimer: ReturnType<typeof window.setTimeout> | null = null;
        delBtn.addEventListener("click", () => {
            if (!delPending) {
                delPending = true;
                delBtn.classList.add("confirm");
                delBtn.textContent = "Sure?";
                delBtn.title = "Click again to confirm deletion";
                delTimer = window.setTimeout(() => {
                    delPending = false;
                    delBtn.classList.remove("confirm");
                    delBtn.textContent = "×";
                    delBtn.title = t("restraints.deleteTitle");
                }, 2500);
            } else {
                if (delTimer !== null) window.clearTimeout(delTimer);
                deleteRestraint(r.id);
                rerender();
            }
        });

        return wrapper;
    }

    // -- Boop friends ----------------------------------------------------------

    // Sends BC's native "Boop Nose" activity (Pet on ItemNose) to a single target.
    // This is the exact same event as clicking a character and selecting Boop Nose —
    // targets with reaction mods (BCX, LSCG, etc.) will respond accordingly.
    private boopOne(target: Character): void {
        try {
            const win = window as unknown as Record<string, unknown>;
            const ActivityRun = win.ActivityRun as ((actor: Character, acted: Character, group: { Name: string }, itemActivity: { Activity: unknown; Item: null }) => void) | undefined;
            const AssetGetActivity = win.AssetGetActivity as ((family: string, name: string) => unknown) | undefined;
            if (!ActivityRun || !AssetGetActivity) return;
            const petActivity = AssetGetActivity("Female3DCG", "Pet");
            if (!petActivity) return;
            ActivityRun(Player, target, { Name: "ItemNose" }, { Activity: petActivity, Item: null });
        } catch { /* ignore */ }
    }

    private boopFriendsInRoom(): number {
        try {
            const friendList = (Player as unknown as Record<string, unknown>).FriendList as number[] | undefined;
            if (!Array.isArray(friendList) || friendList.length === 0) return 0;

            const friendSet = new Set(friendList);
            const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
            const friends = room.filter(c =>
                c.MemberNumber !== Player.MemberNumber && friendSet.has(c.MemberNumber!)
            );
            if (friends.length === 0) return 0;

            let booped = 0;
            for (const friend of friends) {
                const delay = booped * 1800;
                const target = friend; // capture for closure
                window.setTimeout(() => { try { this.boopOne(target); } catch { /* ignore */ } }, delay);
                booped++;
            }
            return booped;
        } catch {
            return 0;
        }
    }

    // -- Appearance diff -------------------------------------------------------

    private renderDiff(panel: HTMLElement, outfit: ConfiguredOutfit): void {
        while (panel.firstChild) panel.removeChild(panel.firstChild);

        const currentMap = new Map<string, Item>();
        for (const item of Player.Appearance) {
            currentMap.set(item.Asset.Group.Name, item);
        }
        const outfitMap = new Map<string, SerializedItem>();
        for (const saved of outfit.items) {
            outfitMap.set(saved.Group, saved);
        }

        const adding:   string[] = [];
        const removing: string[] = [];
        const changing: Array<{ from: string; to: string }> = [];

        for (const [group, saved] of outfitMap) {
            const current = currentMap.get(group);
            if (!current) {
                adding.push(`${group}: ${saved.Name}`);
            } else if (current.Asset.Name !== saved.Name) {
                changing.push({ from: `${group}: ${current.Asset.Name}`, to: saved.Name });
            }
        }
        for (const [group, item] of currentMap) {
            if (!outfitMap.has(group)) {
                const isRestraint = RESTRAINT_GROUPS.has(group);
                if (!isRestraint || !outfit.preserveRestraints) {
                    removing.push(`${group}: ${item.Asset.Name}`);
                }
            }
        }

        const addLine = (text: string, cls: string): void => {
            const el = document.createElement("div");
            el.className = `ebc-diff-item ${cls}`;
            el.textContent = text;
            panel.appendChild(el);
        };

        if (adding.length === 0 && removing.length === 0 && changing.length === 0) {
            addLine("No changes from current look.", "ebc-diff-none");
            return;
        }
        for (const c of changing) addLine(`~ ${c.from} → ${c.to}`, "ebc-diff-change");
        for (const t of adding)   addLine(`+ ${t}`, "ebc-diff-add");
        for (const t of removing) addLine(`− ${t}`, "ebc-diff-remove");
    }

    // -- Poses tab -------------------------------------------------------------

    private renderPoses(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const currentPoses = getCurrentPoses();

        // ── Collapsible section helper ────────────────────────────────────────
        const makeCollapse = (title: string, lsKey: string, defaultCollapsed: boolean): HTMLElement => {
            let collapsed = defaultCollapsed;
            try { const v = localStorage.getItem(lsKey); if (v !== null) collapsed = v === "1"; } catch { /* ignore */ }
            const divider = document.createElement("div");
            divider.className = "ebc-divider";
            body.appendChild(divider);
            const hdr = document.createElement("div");
            hdr.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:4px 0 3px;";
            const chev = document.createElement("span");
            chev.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;min-width:10px;";
            chev.textContent = collapsed ? "▶" : "▼";
            const lbl = document.createElement("span");
            lbl.className = "ebc-section-label";
            lbl.style.margin = "0";
            lbl.textContent = title;
            hdr.appendChild(chev);
            hdr.appendChild(lbl);
            body.appendChild(hdr);
            const cnt = document.createElement("div");
            cnt.style.paddingBottom = "4px";
            cnt.style.display = collapsed ? "none" : "";
            body.appendChild(cnt);
            hdr.addEventListener("click", () => {
                collapsed = !collapsed;
                try { localStorage.setItem(lsKey, collapsed ? "1" : "0"); } catch { /* ignore */ }
                chev.textContent = collapsed ? "▶" : "▼";
                cnt.style.display = collapsed ? "none" : "";
            });
            return cnt;
        };

        // ── POSES ─────────────────────────────────────────────────────────────


        // Helper: true when a pose key is currently active
        const isPoseActive = (key: string): boolean => currentPoses.includes(key);

        // Helper: build an ordered pose step editor.
        // Returns { getPoses, getDelay } so the caller reads values at save-time.
        const buildPoseOrderEditor = (
            parent: HTMLElement,
            initialPoses: string[],
            initialDelay = 420,
        ): { getPoses: () => string[]; getDelay: () => number } => {
            const poses = initialPoses.filter(Boolean).slice();

            // -- Step list --------------------------------------------------------
            const listEl = document.createElement("div");
            listEl.className = "ebc-step-list";
            parent.appendChild(listEl);

            const poseLabel = (key: string): string => {
                // "" means "clear arm poses / Relaxed arms" when stored in a combo sequence.
                // The Body group also uses "" for its Stand entry but that is never added to sequences
                // (filtered out at the quick-add stage), so any "" here should read as "Relaxed".
                if (key === "") return "Relaxed";
                for (const g of KNOWN_POSES) {
                    const found = g.poses.find(x => x.key === key);
                    if (found) return found.label;
                }
                return key; // custom key
            };

            const renderList = (): void => {
                while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
                if (poses.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "ebc-import-hint";
                    empty.style.textAlign = "center";
                    empty.textContent = "No steps yet — add poses below";
                    listEl.appendChild(empty);
                    return;
                }
                for (let idx = 0; idx < poses.length; idx++) {
                    const key = poses[idx];

                    const row = document.createElement("div");
                    row.className = "ebc-step-row";

                    const num = document.createElement("span");
                    num.className = "ebc-step-num";
                    num.textContent = `${idx + 1}.`;

                    const lbl = document.createElement("span");
                    lbl.className = "ebc-step-label";
                    lbl.textContent = poseLabel(key);
                    if (key !== poseLabel(key)) lbl.title = key; // show raw key for custom poses

                    const upBtn = document.createElement("button");
                    upBtn.className = "ebc-step-move";
                    upBtn.textContent = "↑";
                    upBtn.title = "Move earlier";
                    upBtn.disabled = idx === 0;
                    upBtn.addEventListener("click", () => {
                        if (idx > 0) { [poses[idx - 1], poses[idx]] = [poses[idx], poses[idx - 1]]; renderList(); }
                    });

                    const downBtn = document.createElement("button");
                    downBtn.className = "ebc-step-move";
                    downBtn.textContent = "↓";
                    downBtn.title = "Move later";
                    downBtn.disabled = idx === poses.length - 1;
                    downBtn.addEventListener("click", () => {
                        if (idx < poses.length - 1) { [poses[idx], poses[idx + 1]] = [poses[idx + 1], poses[idx]]; renderList(); }
                    });

                    const delBtn = document.createElement("button");
                    delBtn.className = "ebc-step-del";
                    delBtn.textContent = "×";
                    delBtn.title = "Remove step";
                    delBtn.addEventListener("click", () => { poses.splice(idx, 1); renderList(); });

                    row.appendChild(num);
                    row.appendChild(lbl);
                    row.appendChild(upBtn);
                    row.appendChild(downBtn);
                    row.appendChild(delBtn);
                    listEl.appendChild(row);

                    // Delay indicator between steps
                    if (idx < poses.length - 1) {
                        const delayEl = document.createElement("div");
                        delayEl.className = "ebc-step-delay";
                        delayEl.id = `ebc-step-delay-${idx}`;
                        delayEl.textContent = `↓ ${delayInp.value} ms`;
                        listEl.appendChild(delayEl);
                    }
                }
            };

            // -- Delay slider (defined before renderList so the label ref works) --
            const delayRowEl = document.createElement("div");
            delayRowEl.className = "ebc-delay-row";
            const delayLblEl = document.createElement("span");
            delayLblEl.className = "ebc-form-label";
            delayLblEl.textContent = "Step delay";
            const delayInp = Object.assign(document.createElement("input"), {
                type: "range", min: "50", max: "2000", step: "50",
                value: String(Math.max(50, Math.min(2000, initialDelay))),
            }) as HTMLInputElement;
            const delayValEl = document.createElement("span");
            delayValEl.className = "ebc-delay-val";
            delayValEl.textContent = `${delayInp.value} ms`;
            delayInp.addEventListener("input", () => {
                delayValEl.textContent = `${delayInp.value} ms`;
                // Update all the ↓ X ms labels between steps
                listEl.querySelectorAll(".ebc-step-delay").forEach((el, i) => {
                    (el as HTMLElement).textContent = `↓ ${delayInp.value} ms`;
                });
            });
            delayRowEl.appendChild(delayLblEl);
            delayRowEl.appendChild(delayInp);
            delayRowEl.appendChild(delayValEl);

            // Render list now (after delayInp is created so delay labels work)
            renderList();

            // -- Quick-add from known poses ---------------------------------------
            const addHint = document.createElement("div");
            addHint.className = "ebc-import-hint";
            addHint.style.marginTop = "4px";
            addHint.textContent = "Add a step:";
            parent.appendChild(addHint);

            for (const group of KNOWN_POSES) {
                const groupLbl = document.createElement("div");
                groupLbl.style.cssText = "font-size:9px;color:#8a4460;margin:3px 0 2px;font-family:'Trebuchet MS',serif;";
                groupLbl.textContent = group.group.toUpperCase();
                parent.appendChild(groupLbl);

                const btnRow = document.createElement("div");
                btnRow.className = "ebc-pose-add-grid";
                for (const p of group.poses) {
                    // Body: skip empty key (Stand = clear all, not a useful combo step)
                    // Arms: keep empty key — it's "Relaxed", a valid step
                    if (!p.key && group.group !== "Arms") continue;
                    const btn = document.createElement("button");
                    btn.className = "ebc-pose-add-btn";
                    btn.textContent = `+ ${p.label}`;
                    btn.title = `Add "${p.label}" as next step`;
                    btn.addEventListener("click", () => { poses.push(p.key); renderList(); });
                    btnRow.appendChild(btn);
                }
                parent.appendChild(btnRow);
            }

            // Add delay row after the pose buttons
            parent.appendChild(delayRowEl);

            return {
                getPoses: () => [...poses], // keep "" (Relaxed) — applyPoses handles it
                getDelay: () => Number(delayInp.value),
            };
        };

        // Helper: build command + announce rows into a parent element
        // Returns getters for the current values
        const buildComboOptions = (
            parent: HTMLElement,
            initCommand = "",
            initAnnounce = "",
        ): { getCommand: () => string; getAnnounce: () => string } => {
            // Command row (optional)
            const cmdRow = document.createElement("div");
            cmdRow.className = "ebc-form-row";
            const cmdLbl = document.createElement("span");
            cmdLbl.className = "ebc-form-label";
            cmdLbl.textContent = "Command";
            const cmdPrefix = document.createElement("span");
            cmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
            cmdPrefix.textContent = "/";
            const cmdInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text",
                value: initCommand, placeholder: "optional",
                maxLength: 30, title: "Chat command to apply this combo (optional)",
            });
            (cmdInp as HTMLInputElement).style.flex = "1";
            const cmdWrap = document.createElement("div");
            cmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
            cmdWrap.appendChild(cmdPrefix);
            cmdWrap.appendChild(cmdInp);
            cmdRow.appendChild(cmdLbl);
            cmdRow.appendChild(cmdWrap);
            parent.appendChild(cmdRow);

            // Announce text (optional)
            const annRow = document.createElement("div");
            annRow.className = "ebc-form-row";
            const annLbl = document.createElement("span");
            annLbl.className = "ebc-form-label";
            annLbl.textContent = "Announce";
            const annInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text",
                value: initAnnounce, placeholder: "Room action (optional)",
                maxLength: 100, title: "Action emote shown to room when combo is applied (leave blank to skip)",
            });
            (annInp as HTMLInputElement).style.flex = "1";
            annRow.appendChild(annLbl);
            annRow.appendChild(annInp);
            parent.appendChild(annRow);

            return {
                getCommand: () => (cmdInp as HTMLInputElement).value,
                getAnnounce: () => (annInp as HTMLInputElement).value,
            };
        };

        // ── Active pose status bar ─────────────────────────────────────────────
        const statusBar = document.createElement("div");
        statusBar.style.cssText = [
            "background:#190b13",
            "border-radius:6px",
            "padding:5px 8px",
            "margin-bottom:8px",
            "display:flex",
            "align-items:center",
            "gap:6px",
            "flex-wrap:wrap",
        ].join(";");

        const statusLbl = document.createElement("span");
        statusLbl.style.cssText = "color:#cbaab7;font-size:10px;font-weight:600;";
        statusLbl.textContent = "NOW:";
        statusBar.appendChild(statusLbl);

        if (currentPoses.length === 0) {
            const pill = document.createElement("span");
            pill.style.cssText = "background:#cf6f98;color:#fff;border-radius:4px;padding:1px 7px;font-size:11px;";
            pill.textContent = "Standing";
            statusBar.appendChild(pill);
        } else {
            for (const p of currentPoses) {
                const pill = document.createElement("span");
                pill.style.cssText = "background:#cf6f98;color:#fff;border-radius:4px;padding:1px 7px;font-size:11px;";
                // Find the human label for this key
                let label = p;
                for (const g of KNOWN_POSES) {
                    const found = g.poses.find(x => x.key === p);
                    if (found) { label = found.label; break; }
                }
                pill.textContent = label;
                statusBar.appendChild(pill);
            }
        }

        // Clear all button
        if (currentPoses.length > 0) {
            const clearBtn = document.createElement("button");
            clearBtn.style.cssText = "margin-left:auto;font-size:10px;padding:2px 7px;";
            clearBtn.className = "ebc-outfit-del";
            clearBtn.textContent = "Stand";
            clearBtn.title = "Clear all poses";
            clearBtn.addEventListener("click", () => {
                applyPoses([]);
                this.rerender(150);
            });
            statusBar.appendChild(clearBtn);
        }
        body.appendChild(statusBar);

        // ── Hint ──────────────────────────────────────────────────────────────
        const hint = document.createElement("div");
        hint.className = "ebc-import-hint";
        hint.style.marginBottom = "6px";
        hint.textContent = t("anims.poseHint");
        body.appendChild(hint);

        // ── Preset grids ──────────────────────────────────────────────────────
        for (const group of KNOWN_POSES) {
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = group.group.toUpperCase();
            body.appendChild(lbl);

            const grid = document.createElement("div");
            grid.className = "ebc-pose-grid";
            body.appendChild(grid);

            for (const preset of group.poses) {
                const btn = document.createElement("button");
                const presetPoses = preset.key ? [preset.key] : [];
                const armKeys = KNOWN_POSES.find(g => g.group === "Arms")?.poses.map(p => p.key).filter(Boolean) ?? [];
                const isActive = preset.key === "" && group.group === "Arms"
                    ? !currentPoses.some(p => armKeys.includes(p))
                    : preset.key === ""
                    ? currentPoses.length === 0
                    : isPoseActive(preset.key);
                btn.className = "ebc-pose-btn" + (isActive ? " active" : "");
                btn.textContent = preset.label;
                btn.title = preset.key
                    ? `Set ${group.group.toLowerCase()} pose: ${preset.key}`
                    : group.group === "Arms" ? "Clear arm pose" : "Clear all poses";
                btn.addEventListener("click", () => {
                    if (preset.key === "" && group.group === "Arms") {
                        // "Relaxed" — clear all arm poses, keep everything else
                        const nonArmPoses = currentPoses.filter(p => !armKeys.includes(p));
                        applyPoses(nonArmPoses);
                    } else if (preset.key === "") {
                        // "Stand" clears everything
                        applyPoses([]);
                    } else if (group.group === "Body") {
                        // Replace body pose but keep existing arm poses
                        const armPoses = currentPoses.filter(p =>
                            KNOWN_POSES.find(g => g.group === "Arms")?.poses.some(x => x.key === p),
                        );
                        applyPoses([preset.key, ...armPoses]);
                    } else {
                        // Replace arm pose but keep existing body poses
                        const bodyPoses = currentPoses.filter(p =>
                            KNOWN_POSES.find(g => g.group === "Body")?.poses.some(x => x.key === p),
                        );
                        applyPoses([...bodyPoses, preset.key]);
                    }
                    this.rerender(150);
                });
                grid.appendChild(btn);
            }
        }

        // ── Saved Combos (collapsible) ────────────────────────────────────────
        const combosCnt = makeCollapse(t("anims.poseCombos"), "EBC_combosCollapsed", false);

        const combos = getPoseCombos();
        if (combos.length === 0) {
            const none = document.createElement("div");
            none.className = "ebc-empty";
            none.style.padding = "4px 0 6px";
            none.textContent = t("anims.noCombos");
            combosCnt.appendChild(none);
        }

        for (const combo of combos) {
            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "3px";

            const row = document.createElement("div");
            row.className = "ebc-combo-row";
            row.style.borderRadius = "6px";
            row.style.marginBottom = "0";

            const nameEl = document.createElement("span");
            nameEl.className = "ebc-combo-name";
            nameEl.textContent = combo.name;
            if (combo.command) {
                nameEl.title = `/${combo.command}`;
            }

            // Show poses as "Body → Arms" with arrow separator
            const posesEl = document.createElement("span");
            posesEl.className = "ebc-combo-poses";
            const poseLabels = combo.poses.map(k => {
                for (const g of KNOWN_POSES) {
                    const found = g.poses.find(x => x.key === k);
                    if (found) return found.label;
                }
                return k;
            });
            posesEl.textContent = poseLabels.join(" → ") || t("core.none");
            if (combo.command) {
                const cmdBadge = document.createElement("span");
                cmdBadge.style.cssText = "margin-left:4px;color:#cf6f98;font-size:10px;";
                cmdBadge.textContent = `/${combo.command}`;
                posesEl.appendChild(cmdBadge);
            }

            const applyBtn = document.createElement("button");
            applyBtn.className = "ebc-wear-btn";
            applyBtn.textContent = "▶";
            applyBtn.title = "Apply this combo (animates step by step)";
            applyBtn.style.padding = "3px 8px";
            applyBtn.addEventListener("click", () => {
                const steps = combo.poses.filter(Boolean);
                const delay = combo.stepDelayMs ?? 420;
                applyBtn.disabled = true;
                applyBtn.textContent = "…";
                // applyCombo handles both the sequential animation AND the announce text
                applyCombo(combo);
                const totalMs = steps.length > 1 ? (steps.length - 1) * delay + 200 : 200;
                window.setTimeout(() => {
                    applyBtn.disabled = false;
                    applyBtn.textContent = "▶";
                    this.rerender();
                }, totalMs);
            });

            const editBtn = document.createElement("button");
            editBtn.className = "ebc-edit-btn";
            editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.title = "Edit combo";

            let delPending = false;
            let delTimer: ReturnType<typeof window.setTimeout> | null = null;
            const delBtn = document.createElement("button");
            delBtn.className = "ebc-outfit-del";
            delBtn.textContent = "×";
            delBtn.title = "Delete combo";
            delBtn.addEventListener("click", () => {
                if (!delPending) {
                    delPending = true;
                    delBtn.classList.add("confirm");
                    delBtn.textContent = "Sure?";
                    delTimer = window.setTimeout(() => {
                        delPending = false; delBtn.classList.remove("confirm"); delBtn.textContent = "×";
                    }, 2500);
                } else {
                    if (delTimer) window.clearTimeout(delTimer);
                    deleteCombo(combo.id);
                    this.rerender();
                }
            });

            row.appendChild(nameEl);
            row.appendChild(posesEl);
            row.appendChild(applyBtn);
            row.appendChild(editBtn);
            row.appendChild(delBtn);

            // ── Inline editor ─────────────────────────────────────────────────
            const editor = document.createElement("div");
            editor.className = "ebc-combo-editor";

            // Name
            const eNameRow = document.createElement("div");
            eNameRow.className = "ebc-form-row";
            const eNameLbl = document.createElement("span");
            eNameLbl.className = "ebc-form-label";
            eNameLbl.textContent = "Name";
            const eNameInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", value: combo.name, maxLength: 30,
            });
            (eNameInp as HTMLInputElement).style.flex = "1";
            eNameRow.appendChild(eNameLbl);
            eNameRow.appendChild(eNameInp);
            editor.appendChild(eNameRow);

            // Quick-save at top so it's always reachable without scrolling
            const topSaveBar = document.createElement("div");
            topSaveBar.className = "ebc-editor-save-bar";
            const topSaveBtn = document.createElement("button");
            topSaveBtn.className = "ebc-update-btn";
            topSaveBtn.textContent = t("outfits.saveChanges");
            topSaveBtn.style.cssText = "flex:1;font-size:11px;";
            editor.appendChild(topSaveBar); // appended before we have getPoses/getDelay — wired below

            // Ordered pose step editor
            const poseSectionLbl = document.createElement("div");
            poseSectionLbl.className = "ebc-import-hint";
            poseSectionLbl.textContent = "Sequence:";
            editor.appendChild(poseSectionLbl);
            const { getPoses, getDelay } = buildPoseOrderEditor(editor, combo.poses, combo.stepDelayMs ?? 420);

            // Command + Announce
            const { getCommand, getAnnounce } = buildComboOptions(
                editor,
                combo.command ?? "",
                combo.announceText ?? "",
            );

            // Wire top save button now that getPoses/getDelay/getCommand/getAnnounce exist
            topSaveBtn.addEventListener("click", () => {
                updateCombo(combo.id, (eNameInp as HTMLInputElement).value, getPoses(), getCommand(), getAnnounce(), getDelay());
                this.rerender();
            });
            topSaveBar.appendChild(topSaveBtn);

            // Full save button at the bottom too
            const saveBar = document.createElement("div");
            saveBar.className = "ebc-editor-save-bar";
            saveBar.style.marginTop = "2px";
            const savComboBtn = document.createElement("button");
            savComboBtn.className = "ebc-create-btn";
            savComboBtn.textContent = t("outfits.saveChanges");
            savComboBtn.addEventListener("click", () => {
                updateCombo(combo.id, (eNameInp as HTMLInputElement).value, getPoses(), getCommand(), getAnnounce(), getDelay());
                this.rerender();
            });
            saveBar.appendChild(savComboBtn);
            editor.appendChild(saveBar);

            editBtn.addEventListener("click", () => {
                const open = editor.classList.contains("open");
                editor.classList.toggle("open", !open);
                editBtn.classList.toggle("open", !open);
                row.style.borderRadius = open ? "6px" : "6px 6px 0 0";
                // Scroll the editor top into view so user sees the start of the form
                if (!open) window.setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
            });

            wrapper.appendChild(row);
            wrapper.appendChild(editor);
            combosCnt.appendChild(wrapper);
        }

        // ── New combo form ────────────────────────────────────────────────────
        const div2 = document.createElement("div");
        div2.className = "ebc-divider";
        combosCnt.appendChild(div2);

        const newComboToggle = document.createElement("button");
        newComboToggle.className = "ebc-new-outfit-btn";
        newComboToggle.textContent = t("anims.newCombo");
        newComboToggle.dataset.guideTarget = "btn-new-combo";
        combosCnt.appendChild(newComboToggle);

        const newComboForm = document.createElement("div");
        newComboForm.className = "ebc-new-form";
        combosCnt.appendChild(newComboForm);

        // Name
        const ncNameRow = document.createElement("div");
        ncNameRow.className = "ebc-form-row";
        const ncNameLbl = document.createElement("span");
        ncNameLbl.className = "ebc-form-label";
        ncNameLbl.textContent = "Name";
        const ncNameInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "e.g. Kneel Arms Back", maxLength: 30,
        });
        (ncNameInp as HTMLInputElement).style.flex = "1";
        ncNameRow.appendChild(ncNameLbl);
        ncNameRow.appendChild(ncNameInp);
        newComboForm.appendChild(ncNameRow);

        // Quick-save at top — always visible without scrolling
        const ncTopSaveBar = document.createElement("div");
        ncTopSaveBar.className = "ebc-editor-save-bar";
        const ncTopSaveBtn = document.createElement("button");
        ncTopSaveBtn.className = "ebc-update-btn";
        ncTopSaveBtn.textContent = t("anims.saveCombo");
        ncTopSaveBtn.style.cssText = "flex:1;font-size:11px;";
        newComboForm.appendChild(ncTopSaveBar); // wired below after getters exist

        // Ordered pose step editor
        const ncPoseLbl = document.createElement("div");
        ncPoseLbl.className = "ebc-import-hint";
        ncPoseLbl.style.marginTop = "3px";
        ncPoseLbl.textContent = "Sequence:";
        newComboForm.appendChild(ncPoseLbl);
        const { getPoses: ncGetPoses, getDelay: ncGetDelay } = buildPoseOrderEditor(newComboForm, []);

        // Command + Announce
        const { getCommand: ncGetCommand, getAnnounce: ncGetAnnounce } = buildComboOptions(newComboForm);

        // Wire the top save button
        const doSave = (): void => {
            const name = (ncNameInp as HTMLInputElement).value.trim();
            if (!name) { (ncNameInp as HTMLInputElement).style.borderColor = "#cf6f98"; return; }
            createCombo(name, ncGetPoses(), ncGetCommand(), ncGetAnnounce(), ncGetDelay());
            this.rerender();
        };
        ncTopSaveBtn.addEventListener("click", doSave);
        ncTopSaveBar.appendChild(ncTopSaveBtn);

        // Full save button at the bottom too
        const ncSaveBar = document.createElement("div");
        ncSaveBar.className = "ebc-editor-save-bar";
        ncSaveBar.style.marginTop = "2px";
        const ncSaveBtn = document.createElement("button");
        ncSaveBtn.className = "ebc-create-btn";
        ncSaveBtn.textContent = t("anims.saveCombo");
        ncSaveBtn.addEventListener("click", doSave);
        ncSaveBar.appendChild(ncSaveBtn);
        newComboForm.appendChild(ncSaveBar);

        newComboToggle.addEventListener("click", () => {
            const open = newComboForm.style.display !== "none";
            newComboForm.style.display = open ? "none" : "flex";
            newComboToggle.textContent = open ? t("anims.newCombo") : t("core.cancel");
            if (!open) {
                (ncNameInp as HTMLInputElement).focus();
                window.setTimeout(() => newComboToggle.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
            }
        });

        // ── SCENES (collapsible) ─────────────────────────────────────────────
        const scenesCnt = makeCollapse(t("anims.scenes"), "EBC_scenesCollapsed", false);
        this.renderScenes(scenesCnt);
    }

    private renderScenes(body: HTMLElement): void {
        const STEP_TYPE_LABELS: Record<StepType, string> = {
            pose: "Pose",
            equip: "Equip",                      // legacy — kept for backward compat
            "equip-restraint": "Equip Restraint",
            "equip-clothes":   "Equip Clothes",
            unequip: "Unequip", emote: "Emote", chat: "Chat", wait: "Wait",
        };
        // New steps use the split types; "equip" is injected into the dropdown only when
        // an existing step was saved with the old type (see typeSelect construction below).
        const ALL_STEP_TYPES: StepType[] = ["pose", "equip-restraint", "equip-clothes", "unequip", "emote", "chat", "wait"];

        const bodyPoses = KNOWN_POSES.find(g => g.group === "Body")?.poses ?? [];
        const armPoses  = KNOWN_POSES.find(g => g.group === "Arms")?.poses ?? [];

        // -- Asset browser helpers ---------------------------------------------
        type GroupEntry = { name: string; desc: string };
        type AssetEntry = { name: string; desc: string };

        const getAllGroups = (filter?: "restraint" | "clothes"): GroupEntry[] => {
            try {
                const bcAsset = (window as unknown as Record<string, unknown>).Asset as
                    Array<{ Group: { Name: string; Description?: string; Family?: string; IsRestraint?: boolean } }> | undefined;
                if (!Array.isArray(bcAsset)) return [];
                const family = (Player as unknown as Record<string, unknown>).AssetFamily as string ?? "Female3DCG";
                const seen = new Set<string>();
                const out: GroupEntry[] = [];
                for (const a of bcAsset) {
                    const g = a.Group;
                    if ((g.Family === family || !g.Family) && !seen.has(g.Name)) {
                        const isRestraint = g.IsRestraint === true;
                        if (filter === "restraint" && !isRestraint) continue;
                        if (filter === "clothes"   &&  isRestraint) continue;
                        seen.add(g.Name);
                        const desc = (g.Description as string | undefined)?.trim() || g.Name;
                        out.push({ name: g.Name, desc });
                    }
                }
                return out.sort((a, b) => a.desc.localeCompare(b.desc));
            } catch { return []; }
        };

        const getGroupAssets = (groupName: string): AssetEntry[] => {
            try {
                const bcAsset = (window as unknown as Record<string, unknown>).Asset as
                    Array<{ Group: { Name: string; Family?: string }; Name: string; Description?: string }> | undefined;
                if (!Array.isArray(bcAsset)) return [];
                const family = (Player as unknown as Record<string, unknown>).AssetFamily as string ?? "Female3DCG";
                const out: AssetEntry[] = [];
                for (const a of bcAsset) {
                    if (a.Group.Name === groupName && (a.Group.Family === family || !a.Group.Family)) {
                        const desc = (a.Description as string | undefined)?.trim() || a.Name;
                        out.push({ name: a.Name, desc });
                    }
                }
                return out.sort((a, b) => a.desc.localeCompare(b.desc));
            } catch { return []; }
        };

        // Returns extended info for an asset: AllowType variants (checking all known BC structures)
        // and VariableHeight range if the item uses numeric height instead of a type string.
        type AssetExtInfo = { types: string[]; varHeight: { min: number; max: number } | null; isTyped: boolean };
        const getAssetExtInfo = (groupName: string, assetName: string): AssetExtInfo => {
            try {
                const bcAsset = (window as unknown as Record<string, unknown>).Asset as
                    Array<Record<string, unknown>> | undefined;
                if (!Array.isArray(bcAsset)) return { types: [], varHeight: null, isTyped: false };
                const a = bcAsset.find(x =>
                    (x.Group as Record<string, unknown>)?.Name === groupName && x.Name === assetName);
                if (!a) return { types: [], varHeight: null, isTyped: false };

                // ── Type variants ─────────────────────────────────────────────
                let types: string[] = [];

                // 1. BC R91+: TypedItemGetOptionNames is a global function that returns the
                //    registered option names for any typed item from TypedItemDataLookup.
                //    This is the authoritative source — use it first.
                {
                    type GetOptNamesFn = (group: string, name: string) => string[];
                    const fn = (window as unknown as Record<string, unknown>).TypedItemGetOptionNames as GetOptNamesFn | undefined;
                    if (typeof fn === "function") {
                        try { const r = fn(groupName, assetName); if (r.length > 0) types = r; } catch { /* ignore */ }
                    }
                }

                const pickNames = (arr: unknown): string[] =>
                    Array.isArray(arr)
                        ? (arr as Array<Record<string, unknown>>)
                            .map(o => o?.Name ?? o?.Self ?? o)
                            .filter((n): n is string => typeof n === "string")
                        : [];

                // 2. Legacy AllowType array (pre-R91)
                if (types.length === 0 && Array.isArray(a.AllowType) && (a.AllowType as unknown[]).length > 0)
                    types = a.AllowType as string[];

                // 3. Extended Typed — various older structures
                if (types.length === 0) {
                    const ext = a.Extended as Record<string, unknown> | undefined;
                    if (ext && typeof ext === "object") {
                        if (types.length === 0) types = pickNames(ext.Options);
                        if (types.length === 0) types = pickNames((ext.Typed as Record<string, unknown> | undefined)?.Options);
                        if (types.length === 0) types = pickNames((ext.Config as Record<string, unknown> | undefined)?.Options);
                        if (types.length === 0 && ext.DrawImages && typeof ext.DrawImages === "object")
                            types = Object.keys(ext.DrawImages as object).filter(k => k !== "");
                    }
                }

                // 4. Top-level Options[] (some older assets)
                if (types.length === 0) types = pickNames(a.Options);

                // ── Variable Height ────────────────────────────────────────────
                let varHeight: { min: number; max: number } | null = null;

                const tryVH = (src: unknown): { min: number; max: number } | null => {
                    if (!src || typeof src !== "object") return null;
                    const v = src as Record<string, unknown>;
                    const hasMax = typeof v.MaxHeight === "number";
                    const hasMin = typeof v.MinHeight === "number";
                    if (!hasMax && !hasMin) return null;
                    return { max: hasMax ? v.MaxHeight as number : 100, min: hasMin ? v.MinHeight as number : 0 };
                };

                // R91+ Archetype = "variableheight" / "VariableHeight"
                const archetype = (typeof a.Archetype === "string" ? a.Archetype : "").toLowerCase();
                if (archetype === "variableheight") {
                    varHeight = tryVH(a.Config) ??
                        tryVH((a.Config as Record<string, unknown> | undefined)?.ArchetypeConfig) ??
                        { min: 0, max: 100 };
                }

                // Older paths
                if (!varHeight) {
                    const ext = a.Extended as Record<string, unknown> | undefined;
                    varHeight = tryVH(ext?.VariableHeight ?? ext?.variableHeight)
                        ?? tryVH(a.VariableHeight)
                        ?? tryVH(a.VariableHeightConfig);
                }

                const archStr = (typeof a.Archetype === "string" ? a.Archetype : "").toLowerCase();
                const isTyped = archStr === "typed" || (Array.isArray(a.AllowType) && (a.AllowType as unknown[]).length > 0);
                return { types, varHeight, isTyped };
            } catch { return { types: [], varHeight: null, isTyped: false }; }
        };
        const getAssetTypes = (g: string, a: string): string[] => getAssetExtInfo(g, a).types;

        const getWornItems = (): Array<{ group: string; itemDesc: string }> => {
            try {
                return Player.Appearance.map(item => ({
                    group: item.Asset.Group.Name,
                    itemDesc: ((item.Asset as unknown as Record<string, unknown>).Description as string | undefined)?.trim()
                        || item.Asset.Name,
                })).sort((a, b) => a.itemDesc.localeCompare(b.itemDesc));
            } catch { return []; }
        };

        // Build a live step card — returns getStep() which always reads current field state
        const buildStepCard = (
            initStep: SceneStep,
            onMoveUp: (() => void) | null,
            onMoveDown: (() => void) | null,
            onDelete: () => void,
            onDuplicate: () => void,
        ): { el: HTMLElement; getStep: () => SceneStep } => {
            const card = document.createElement("div");
            card.className = "ebc-scene-step";

            // Header: type select, delay input, move/delete buttons
            const header = document.createElement("div");
            header.className = "ebc-scene-step-header";

            const typeSelect = document.createElement("select");
            typeSelect.className = "ebc-scene-type-sel";
            // Build the type list; if this step was saved with the old "equip" type inject it
            // so the dropdown shows the correct selection rather than defaulting to another type.
            const stepTypes: StepType[] = initStep.type === "equip"
                ? (["equip", ...ALL_STEP_TYPES] as StepType[])
                : ALL_STEP_TYPES;
            for (const t of stepTypes) {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = STEP_TYPE_LABELS[t];
                opt.selected = t === initStep.type;
                typeSelect.appendChild(opt);
            }

            const delayInp = document.createElement("input");
            delayInp.type = "number";
            delayInp.className = "ebc-scene-delay";
            delayInp.min = "0";
            delayInp.max = "30000";
            delayInp.value = String(initStep.delayMs);
            delayInp.title = "Milliseconds to wait before this step fires";

            const msLbl = document.createElement("span");
            msLbl.className = "ebc-scene-ms-lbl";
            msLbl.textContent = "ms delay";

            const upBtn = document.createElement("button");
            upBtn.className = "ebc-step-move";
            upBtn.textContent = "↑";
            upBtn.disabled = onMoveUp === null;
            if (onMoveUp) upBtn.addEventListener("click", onMoveUp);

            const downBtn = document.createElement("button");
            downBtn.className = "ebc-step-move";
            downBtn.textContent = "↓";
            downBtn.disabled = onMoveDown === null;
            if (onMoveDown) downBtn.addEventListener("click", onMoveDown);

            const dupBtn = document.createElement("button");
            dupBtn.className = "ebc-step-move";
            dupBtn.textContent = "⧉";
            dupBtn.title = "Duplicate step";
            dupBtn.addEventListener("click", onDuplicate);

            const delBtn = document.createElement("button");
            delBtn.className = "ebc-step-del";
            delBtn.textContent = "×";
            delBtn.addEventListener("click", onDelete);

            header.appendChild(typeSelect);
            header.appendChild(delayInp);
            header.appendChild(msLbl);
            header.appendChild(upBtn);
            header.appendChild(downBtn);
            header.appendChild(dupBtn);
            header.appendChild(delBtn);
            card.appendChild(header);

            // Fields area — rebuilt when type changes
            const fieldsEl = document.createElement("div");
            fieldsEl.className = "ebc-scene-fields";
            card.appendChild(fieldsEl);

            // Per-type mutable state (seeded from initStep)
            let posePoses: string[]  = initStep.poses?.slice() ?? [];
            let equipGroup           = initStep.group ?? "";
            let equipAsset           = initStep.assetName ?? "";
            let equipColorRaw        = Array.isArray(initStep.color)
                ? initStep.color.join(",")
                : (initStep.color ?? "");
            let equipPropertyType    = initStep.propertyType ?? "";
            let equipHeightModifier: number | undefined = initStep.heightModifier;
            let unequipGroup         = initStep.group ?? "";
            let emoteText            = initStep.text ?? "";
            let chatFormat           = initStep.chatFormat ?? "";

            // Colour input reference for the capture button to update
            let colorInpRef: HTMLInputElement | null = null;

            const renderFields = (type: StepType): void => {
                while (fieldsEl.firstChild) fieldsEl.removeChild(fieldsEl.firstChild);

                if (type === "pose") {
                    const row = document.createElement("div");
                    row.className = "ebc-scene-fields-row";

                    const makeAxisDropdown = (
                        label: string,
                        poses: { key: string; label: string }[],
                        currentKey: string,
                        dataAttr: string,
                    ): HTMLSelectElement => {
                        const wrap = document.createElement("div");
                        wrap.style.cssText = "display:flex;align-items:center;gap:4px;";
                        const lbl = document.createElement("span");
                        lbl.style.cssText = "font-size:10px;color:#9a6878;";
                        lbl.textContent = label + ":";
                        const sel = document.createElement("select");
                        sel.className = "ebc-scene-type-sel";
                        sel.style.width = "90px";
                        sel.dataset.axis = dataAttr;
                        // "None" option for arms axis
                        if (dataAttr === "arms") {
                            const none = document.createElement("option");
                            none.value = "";
                            none.textContent = "None";
                            none.selected = currentKey === "";
                            sel.appendChild(none);
                        }
                        for (const p of poses) {
                            if (dataAttr === "body" || p.key !== "") {
                                const opt = document.createElement("option");
                                opt.value = p.key;
                                opt.textContent = p.label;
                                opt.selected = p.key === currentKey;
                                sel.appendChild(opt);
                            }
                        }
                        sel.addEventListener("change", () => {
                            const bKey = (fieldsEl.querySelector("[data-axis='body']") as HTMLSelectElement | null)?.value ?? "";
                            const aKey = (fieldsEl.querySelector("[data-axis='arms']") as HTMLSelectElement | null)?.value ?? "";
                            // Keep "" for arms (Relaxed) — applyPoses strips arm poses when it sees ""
                            posePoses = [bKey, aKey];
                        });
                        wrap.appendChild(lbl);
                        wrap.appendChild(sel);
                        row.appendChild(wrap);
                        return sel;
                    };

                    const curBody = posePoses.find(k => bodyPoses.some(p => p.key === k)) ?? "";
                    const curArms = posePoses.find(k => armPoses.some(p => p.key === k && p.key !== "")) ?? "";
                    makeAxisDropdown("Body", bodyPoses, curBody, "body");
                    makeAxisDropdown("Arms", armPoses, curArms, "arms");
                    fieldsEl.appendChild(row);

                } else if (type === "equip" || type === "equip-restraint" || type === "equip-clothes") {
                    const grpFilter = type === "equip-restraint" ? "restraint"
                                    : type === "equip-clothes"   ? "clothes"
                                    : undefined;
                    const groups = getAllGroups(grpFilter);
                    const row1 = document.createElement("div");
                    row1.className = "ebc-scene-fields-row";

                    // Asset dropdown (created first so updateAssetSel can reference it)
                    const assetSel = document.createElement("select");
                    assetSel.className = "ebc-scene-type-sel";
                    assetSel.style.cssText = "flex:1;width:auto;max-width:120px;";
                    assetSel.title = "Item to equip";
                    assetSel.addEventListener("change", () => { equipAsset = assetSel.value; });

                    const updateAssetSel = (preserveValue: string): void => {
                        while (assetSel.firstChild) assetSel.removeChild(assetSel.firstChild);
                        const assets = getGroupAssets(groupSel.value);
                        if (assets.length === 0) {
                            const opt = document.createElement("option");
                            opt.value = "";
                            opt.textContent = groupSel.value ? "— no items —" : "— pick slot first —";
                            assetSel.appendChild(opt);
                            equipAsset = "";
                            return;
                        }
                        let found = false;
                        for (const a of assets) {
                            const opt = document.createElement("option");
                            opt.value = a.name;
                            opt.textContent = a.desc;
                            opt.selected = a.name === preserveValue;
                            if (a.name === preserveValue) found = true;
                            assetSel.appendChild(opt);
                        }
                        if (!found) { assetSel.selectedIndex = 0; }
                        equipAsset = assetSel.value;
                    };

                    // Group dropdown
                    const groupSel = document.createElement("select");
                    groupSel.className = "ebc-scene-type-sel";
                    groupSel.style.cssText = "flex:1;width:auto;max-width:130px;";
                    groupSel.title = "Item slot";
                    {
                        const ph = document.createElement("option");
                        ph.value = ""; ph.textContent = "— pick slot —";
                        ph.disabled = true; ph.selected = !equipGroup;
                        groupSel.appendChild(ph);
                    }
                    for (const g of groups) {
                        const opt = document.createElement("option");
                        opt.value = g.name;
                        opt.textContent = g.desc;
                        opt.selected = g.name === equipGroup;
                        groupSel.appendChild(opt);
                    }
                    groupSel.addEventListener("change", () => {
                        equipGroup = groupSel.value;
                        updateAssetSel(equipAsset);
                    });
                    updateAssetSel(equipAsset); // populate initial asset list

                    const captureBtn = document.createElement("button");
                    captureBtn.className = "ebc-update-btn";
                    captureBtn.textContent = "📷";
                    captureBtn.title = "Fill from currently worn item in selected slot";
                    captureBtn.style.cssText = "flex:0 0 auto;font-size:12px;padding:2px 6px;";

                    // ── State row — shows either a type dropdown OR a height input
                    //    depending on what the selected asset supports
                    const stateRow = document.createElement("div");
                    stateRow.className = "ebc-scene-fields-row";

                    // Type dropdown (Typed assets)
                    const stateSel = document.createElement("select");
                    stateSel.className = "ebc-scene-type-sel";
                    stateSel.style.cssText = "flex:1;width:auto;";
                    stateSel.title = "State/type of the item (e.g. Tight, Loose, Wrist)";

                    // Height modifier input (VariableHeight assets)
                    const heightWrap = document.createElement("div");
                    heightWrap.style.cssText = "display:none;flex:1;align-items:center;gap:4px;";
                    const heightLbl = document.createElement("span");
                    heightLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;flex-shrink:0;";
                    heightLbl.textContent = "Height:";
                    const heightInp = document.createElement("input");
                    heightInp.type = "number";
                    heightInp.className = "ebc-scene-delay";
                    heightInp.style.cssText = "flex:1;width:50px;";
                    heightInp.title = "HeightModifier value for this item (see current value via 📷)";
                    heightInp.value = equipHeightModifier !== undefined ? String(equipHeightModifier) : "0";
                    heightInp.addEventListener("input", () => {
                        const n = Number(heightInp.value);
                        equipHeightModifier = isNaN(n) ? undefined : n;
                    });
                    const heightRangeLbl = document.createElement("span");
                    heightRangeLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5060;flex-shrink:0;";
                    heightWrap.appendChild(heightLbl);
                    heightWrap.appendChild(heightInp);
                    heightWrap.appendChild(heightRangeLbl);

                    // Free-text type input — shown for typed items when options can't be auto-detected.
                    // User sets the desired type in BC's own UI first, then hits 📷 to capture it.
                    const typeTextInp = document.createElement("input");
                    typeTextInp.className = "ebc-form-input";
                    typeTextInp.style.cssText = "display:none;flex:1;";
                    typeTextInp.placeholder = "Type name (use 📷 to capture from worn item)";
                    typeTextInp.title = "Equip the item in BC, set the desired state, then hit 📷 to fill this automatically";
                    typeTextInp.value = equipPropertyType;
                    typeTextInp.addEventListener("input", () => { equipPropertyType = typeTextInp.value.trim(); });

                    const updateStateRow = (): void => {
                        const info = getAssetExtInfo(groupSel.value, assetSel.value);

                        // Rebuild type dropdown
                        while (stateSel.firstChild) stateSel.removeChild(stateSel.firstChild);
                        const defOpt = document.createElement("option");
                        defOpt.value = "";
                        defOpt.textContent = info.types.length ? "— default state —" : "— no variants —";
                        stateSel.appendChild(defOpt);
                        for (const t of info.types) {
                            const opt = document.createElement("option");
                            opt.value = t; opt.textContent = t;
                            opt.selected = t === equipPropertyType;
                            stateSel.appendChild(opt);
                        }
                        if (!info.types.includes(equipPropertyType)) equipPropertyType = "";
                        stateSel.value = equipPropertyType;
                        stateSel.disabled = info.types.length === 0;

                        // Update height range
                        if (info.varHeight) {
                            heightInp.min = String(info.varHeight.min);
                            heightInp.max = String(info.varHeight.max);
                            heightRangeLbl.textContent = `(${info.varHeight.min}–${info.varHeight.max})`;
                            if (equipHeightModifier === undefined)
                                equipHeightModifier = Math.round((info.varHeight.min + info.varHeight.max) / 2);
                            heightInp.value = String(equipHeightModifier);
                        }

                        // Priority: varHeight > dropdown with options > text fallback for typed > disabled
                        const showHeight = !!info.varHeight;
                        const showDropdown = !showHeight && info.types.length > 0;
                        const showText = !showHeight && !showDropdown && info.isTyped;

                        stateSel.style.display   = showHeight || showText ? "none" : "";
                        heightWrap.style.display  = showHeight ? "flex" : "none";
                        typeTextInp.style.display = showText   ? ""     : "none";

                        if (showText) typeTextInp.value = equipPropertyType;
                    };

                    stateSel.addEventListener("change", () => { equipPropertyType = stateSel.value; });
                    stateRow.appendChild(stateSel);
                    stateRow.appendChild(heightWrap);
                    stateRow.appendChild(typeTextInp);

                    // Patch updateAssetSel to also refresh the state row
                    const origUpdateAssetSel = updateAssetSel;
                    const updateAssetSelWithState = (v: string): void => {
                        origUpdateAssetSel(v);
                        updateStateRow();
                    };
                    assetSel.addEventListener("change", () => updateStateRow());

                    captureBtn.addEventListener("click", () => {
                        try {
                            const g = groupSel.value;
                            if (!g) return;
                            const item = InventoryGet(Player, g);
                            if (!item) return;
                            equipAsset = item.Asset.Name;
                            updateAssetSelWithState(equipAsset);
                            const c = (item as unknown as Record<string, unknown>).Color;
                            if (c !== undefined && colorInpRef) {
                                const s = Array.isArray(c) ? (c as string[]).join(",") : String(c);
                                colorInpRef.value = s;
                                equipColorRaw = s;
                            }
                            const prop = item.Property as Record<string, unknown> | undefined;
                            // Capture Property.Type — try TypeRecord (BC R91+) first, fall back to Type string
                            {
                                let capturedType = "";
                                // BC R91+: TypeRecord = { "typed": <index> }, map index → option Name
                                const typeRecord = prop?.TypeRecord as Record<string, number> | undefined;
                                if (typeRecord && typeof typeRecord === "object") {
                                    type GetOptionsFn = (g: string, n: string) => Array<{ Name: string }> | null;
                                    const getFn = (window as unknown as Record<string, unknown>).TypedItemGetOptions as GetOptionsFn | undefined;
                                    if (typeof getFn === "function") {
                                        try {
                                            const opts = getFn(item.Asset.Group.Name, item.Asset.Name);
                                            const idx = (Object.values(typeRecord)[0] ?? -1) as number;
                                            if (opts && idx >= 0 && idx < opts.length) capturedType = opts[idx].Name ?? "";
                                        } catch { /* ignore */ }
                                    }
                                }
                                // Legacy fallback: Property.Type string
                                if (!capturedType && typeof prop?.Type === "string") capturedType = prop.Type as string;
                                if (capturedType) {
                                    equipPropertyType = capturedType;
                                    stateSel.value = equipPropertyType;
                                    typeTextInp.value = equipPropertyType;
                                }
                            }
                            // Capture Property.HeightModifier
                            if (typeof prop?.HeightModifier === "number") {
                                equipHeightModifier = prop.HeightModifier as number;
                                heightInp.value = String(equipHeightModifier);
                            }
                        } catch { /* ignore */ }
                    });

                    row1.appendChild(groupSel);
                    row1.appendChild(assetSel);
                    row1.appendChild(captureBtn);
                    fieldsEl.appendChild(row1);

                    // Populate state row now that group+asset are set
                    updateStateRow();
                    fieldsEl.appendChild(stateRow);

                    const colorInp = Object.assign(document.createElement("input"), {
                        className: "ebc-form-input", type: "text",
                        placeholder: "Color — optional, e.g. Default or #ff0000,Default",
                        value: equipColorRaw, maxLength: 200,
                    }) as HTMLInputElement;
                    colorInp.addEventListener("input", () => { equipColorRaw = colorInp.value; });
                    colorInpRef = colorInp;
                    fieldsEl.appendChild(colorInp);

                } else if (type === "unequip") {
                    const groups = getAllGroups();
                    const slotSel = document.createElement("select");
                    slotSel.className = "ebc-scene-type-sel";
                    slotSel.style.cssText = "width:100%;max-width:100%;";
                    slotSel.title = "Slot to clear — removes whatever is worn there when the scene plays";
                    {
                        const ph = document.createElement("option");
                        ph.value = ""; ph.textContent = "— pick slot —";
                        ph.disabled = true; ph.selected = !unequipGroup;
                        slotSel.appendChild(ph);
                    }
                    for (const g of groups) {
                        const opt = document.createElement("option");
                        opt.value = g.name;
                        opt.textContent = g.desc;
                        opt.selected = g.name === unequipGroup;
                        slotSel.appendChild(opt);
                    }
                    slotSel.addEventListener("change", () => { unequipGroup = slotSel.value; });
                    fieldsEl.appendChild(slotSel);

                } else if (type === "emote") {
                    const textInp = Object.assign(document.createElement("input"), {
                        className: "ebc-form-input", type: "text",
                        placeholder: "Action text (e.g. slowly removes her shirt...)",
                        value: emoteText, maxLength: 200,
                    }) as HTMLInputElement;
                    textInp.addEventListener("input", () => { emoteText = textInp.value; });
                    fieldsEl.appendChild(textInp);

                } else if (type === "chat") {
                    const row = document.createElement("div");
                    row.className = "ebc-scene-fields-row";

                    const makeToggle = (label: string, val: "" | "*" | "("): HTMLButtonElement => {
                        const btn = document.createElement("button");
                        btn.textContent = label;
                        btn.style.cssText = [
                            "flex:0 0 auto", "padding:2px 9px", "font-size:11px",
                            "font-family:'Trebuchet MS',serif", "border-radius:4px", "cursor:pointer",
                            "border:1px solid #5a2840", "transition:background 0.12s,color 0.12s",
                        ].join(";");
                        const setActive = (active: boolean): void => {
                            btn.style.background = active ? "#cf6f98" : "#1b0d17";
                            btn.style.color      = active ? "#fff"    : "#9a6878";
                        };
                        setActive(chatFormat === val);
                        btn.addEventListener("click", () => {
                            chatFormat = val;
                            row.querySelectorAll<HTMLButtonElement>("[data-fmt]").forEach(b => {
                                const bVal = b.dataset.fmt as "" | "*" | "(";
                                b.style.background = bVal === val ? "#cf6f98" : "#1b0d17";
                                b.style.color      = bVal === val ? "#fff"    : "#9a6878";
                            });
                        });
                        btn.dataset.fmt = val;
                        return btn;
                    };

                    const textInp = Object.assign(document.createElement("input"), {
                        className: "ebc-form-input", type: "text",
                        placeholder: "message text...",
                        value: emoteText, maxLength: 1000,
                    }) as HTMLInputElement;
                    textInp.style.flex = "1";
                    textInp.addEventListener("input", () => { emoteText = textInp.value; });

                    row.appendChild(makeToggle("* *", "*"));
                    row.appendChild(makeToggle("( )", "("));
                    row.appendChild(textInp);
                    fieldsEl.appendChild(row);

                }
                // wait: no extra fields — delay IS the step
            };

            let currentType = initStep.type;
            renderFields(currentType);

            typeSelect.addEventListener("change", () => {
                currentType = typeSelect.value as StepType;
                renderFields(currentType);
            });

            const getStep = (): SceneStep => {
                const delay = Math.max(0, Math.min(30000, Number(delayInp.value) || 0));
                const step: SceneStep = { type: currentType, delayMs: delay };
                switch (currentType) {
                    case "pose":
                        step.poses = posePoses.filter(Boolean);
                        break;
                    case "equip":
                    case "equip-restraint":
                    case "equip-clothes":
                        step.group = equipGroup.trim();
                        step.assetName = equipAsset.trim();
                        if (equipColorRaw.trim()) {
                            const parts = equipColorRaw.split(",").map(s => s.trim()).filter(Boolean);
                            step.color = parts.length === 1 ? parts[0] : parts;
                        }
                        if (equipPropertyType.trim()) step.propertyType = equipPropertyType.trim();
                        if (equipHeightModifier !== undefined) step.heightModifier = equipHeightModifier;
                        break;
                    case "unequip":
                        step.group = unequipGroup.trim();
                        break;
                    case "emote":
                        step.text = emoteText.trim();
                        break;
                    case "chat":
                        step.text = emoteText.trim();
                        step.chatFormat = chatFormat;
                        break;
                }
                return step;
            };

            return { el: card, getStep };
        };

        // Build a full step list editor — returns getSteps()
        const buildSceneEditor = (
            parent: HTMLElement,
            initSteps: SceneStep[],
        ): { getSteps: () => SceneStep[] } => {
            const steps: SceneStep[] = initSteps.map(s => ({ ...s }));
            type Entry = { el: HTMLElement; getStep: () => SceneStep };
            const entries: Entry[] = [];

            const stepsContainer = document.createElement("div");
            parent.appendChild(stepsContainer);

            const syncFromEntries = (): void => {
                for (let i = 0; i < entries.length; i++) {
                    steps[i] = entries[i].getStep();
                }
            };

            const fullRebuild = (): void => {
                entries.length = 0;
                while (stepsContainer.firstChild) stepsContainer.removeChild(stepsContainer.firstChild);

                if (steps.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "ebc-import-hint";
                    empty.style.cssText = "text-align:center;padding:5px 0 3px;";
                    empty.textContent = "No steps yet — add one below.";
                    stepsContainer.appendChild(empty);
                    return;
                }

                for (let i = 0; i < steps.length; i++) {
                    const idx = i;
                    const entry = buildStepCard(
                        steps[i],
                        idx > 0 ? () => {
                            syncFromEntries();
                            [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
                            fullRebuild();
                        } : null,
                        idx < steps.length - 1 ? () => {
                            syncFromEntries();
                            [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
                            fullRebuild();
                        } : null,
                        () => {
                            syncFromEntries();
                            steps.splice(idx, 1);
                            fullRebuild();
                        },
                        () => {
                            syncFromEntries();
                            steps.splice(idx + 1, 0, { ...steps[idx] });
                            fullRebuild();
                        },
                    );
                    entries.push(entry);
                    stepsContainer.appendChild(entry.el);
                }
            };

            fullRebuild();

            // Add step row
            const addRow = document.createElement("div");
            addRow.style.cssText = "display:flex;gap:5px;margin-top:4px;align-items:center;";

            const addTypeSel = document.createElement("select");
            addTypeSel.className = "ebc-scene-type-sel";
            addTypeSel.style.width = "80px";
            for (const t of ALL_STEP_TYPES) {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = STEP_TYPE_LABELS[t];
                addTypeSel.appendChild(opt);
            }

            const addBtn = document.createElement("button");
            addBtn.className = "ebc-update-btn";
            addBtn.textContent = t("anims.addStep");
            addBtn.addEventListener("click", () => {
                syncFromEntries();
                const defDelays: Record<StepType, number> = {
                    pose: 500, equip: 800, "equip-restraint": 800, "equip-clothes": 800,
                    unequip: 600, emote: 100, chat: 100, wait: 1000,
                };
                steps.push({ type: addTypeSel.value as StepType, delayMs: defDelays[addTypeSel.value as StepType] });
                fullRebuild();
                window.setTimeout(() => stepsContainer.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
            });

            addRow.appendChild(addTypeSel);
            addRow.appendChild(addBtn);
            parent.appendChild(addRow);

            return { getSteps: () => entries.map(e => e.getStep()) };
        };

        // ── Scene list ─────────────────────────────────────────────────────────

        const scenesHint = document.createElement("div");
        scenesHint.className = "ebc-import-hint";
        scenesHint.style.marginBottom = "6px";
        scenesHint.textContent = t("anims.scenesHint");
        body.appendChild(scenesHint);

        const scenes = getScenes();
        if (scenes.length === 0) {
            const none = document.createElement("div");
            none.className = "ebc-empty";
            none.style.padding = "4px 0 6px";
            none.textContent = "No scenes yet — create one below.";
            body.appendChild(none);
        }

        for (const scene of scenes) {
            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "3px";

            const row = document.createElement("div");
            row.className = "ebc-combo-row";
            row.style.cssText += ";border-radius:6px;margin-bottom:0;";

            const nameEl = document.createElement("span");
            nameEl.className = "ebc-combo-name";
            nameEl.textContent = scene.name;
            if (scene.command) nameEl.title = `/${scene.command}`;

            const stepCountEl = document.createElement("span");
            stepCountEl.className = "ebc-combo-poses";
            stepCountEl.textContent = `${scene.steps.length} step${scene.steps.length !== 1 ? "s" : ""}`;
            if (scene.command) {
                const badge = document.createElement("span");
                badge.style.cssText = "margin-left:4px;color:#cf6f98;font-size:10px;";
                badge.textContent = `/${scene.command}`;
                stepCountEl.appendChild(badge);
            }

            const playBtn = document.createElement("button");
            playBtn.className = "ebc-wear-btn";
            playBtn.textContent = "▶";
            playBtn.title = "Play this scene";
            playBtn.style.padding = "3px 8px";
            playBtn.addEventListener("click", () => {
                playBtn.disabled = true;
                playBtn.textContent = "…";
                runScene(scene);
                const totalMs = scene.steps.reduce((s, st) => s + st.delayMs, 0) + 500;
                window.setTimeout(() => {
                    playBtn.disabled = false;
                    playBtn.textContent = "▶";
                    this.rerender();
                }, totalMs);
            });

            const editBtn = document.createElement("button");
            editBtn.className = "ebc-edit-btn";
            editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.title = "Edit scene";

            const exportBtn = document.createElement("button");
            exportBtn.className = "ebc-edit-btn";
            exportBtn.title = "Copy scene JSON to clipboard";
            exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
            exportBtn.addEventListener("click", () => {
                const json = exportScene(scene.id);
                if (!json) return;
                const copied = (): void => {
                    exportBtn.textContent = "✓";
                    window.setTimeout(() => { exportBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>'; }, 1500);
                };
                const fallback = (): void => {
                    try {
                        const tmp = document.createElement("textarea");
                        tmp.value = json;
                        tmp.style.cssText = "position:fixed;top:-9999px;";
                        document.body.appendChild(tmp);
                        tmp.select();
                        document.execCommand("copy");
                        document.body.removeChild(tmp);
                    } catch { /* execCommand deprecated; ignore */ }
                    copied();
                };
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(json).then(copied).catch(fallback).catch(() => { /* ignore */ });
                } else { fallback(); }
            });

            let delPending = false;
            let delTimer: ReturnType<typeof window.setTimeout> | null = null;
            const delBtn = document.createElement("button");
            delBtn.className = "ebc-outfit-del";
            delBtn.textContent = "×";
            delBtn.title = "Delete scene";
            delBtn.addEventListener("click", () => {
                if (!delPending) {
                    delPending = true;
                    delBtn.classList.add("confirm");
                    delBtn.textContent = "Sure?";
                    delTimer = window.setTimeout(() => {
                        delPending = false; delBtn.classList.remove("confirm"); delBtn.textContent = "×";
                    }, 2500);
                } else {
                    if (delTimer) window.clearTimeout(delTimer);
                    deleteScene(scene.id);
                    this.rerender();
                }
            });

            row.appendChild(nameEl);
            row.appendChild(stepCountEl);
            row.appendChild(playBtn);
            row.appendChild(exportBtn);
            row.appendChild(editBtn);
            row.appendChild(delBtn);

            // Inline editor
            const editor = document.createElement("div");
            editor.className = "ebc-combo-editor";

            const eNameRow = document.createElement("div");
            eNameRow.className = "ebc-form-row";
            const eNameLbl = document.createElement("span");
            eNameLbl.className = "ebc-form-label";
            eNameLbl.textContent = "Name";
            const eNameInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", value: scene.name, maxLength: 40,
            }) as HTMLInputElement;
            eNameInp.style.flex = "1";
            eNameRow.appendChild(eNameLbl);
            eNameRow.appendChild(eNameInp);
            editor.appendChild(eNameRow);

            const eCmdRow = document.createElement("div");
            eCmdRow.className = "ebc-form-row";
            const eCmdLbl = document.createElement("span");
            eCmdLbl.className = "ebc-form-label";
            eCmdLbl.textContent = "Command";
            const eCmdPrefix = document.createElement("span");
            eCmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
            eCmdPrefix.textContent = "/";
            const eCmdInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text",
                value: scene.command ?? "", placeholder: "optional", maxLength: 30,
            }) as HTMLInputElement;
            eCmdInp.style.flex = "1";
            const eCmdWrap = document.createElement("div");
            eCmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
            eCmdWrap.appendChild(eCmdPrefix);
            eCmdWrap.appendChild(eCmdInp);
            eCmdRow.appendChild(eCmdLbl);
            eCmdRow.appendChild(eCmdWrap);
            editor.appendChild(eCmdRow);

            const topSaveBar = document.createElement("div");
            topSaveBar.className = "ebc-editor-save-bar";
            const topSaveBtn = document.createElement("button");
            topSaveBtn.className = "ebc-update-btn";
            topSaveBtn.textContent = t("outfits.saveChanges");
            topSaveBtn.style.cssText = "flex:1;font-size:11px;";
            topSaveBar.appendChild(topSaveBtn);
            editor.appendChild(topSaveBar);

            const stepsLbl = document.createElement("div");
            stepsLbl.className = "ebc-import-hint";
            stepsLbl.textContent = "Steps:";
            editor.appendChild(stepsLbl);

            const { getSteps } = buildSceneEditor(editor, scene.steps);

            topSaveBtn.addEventListener("click", () => {
                updateScene(scene.id, eNameInp.value, getSteps(), eCmdInp.value);
                this.rerender();
            });

            const botSaveBar = document.createElement("div");
            botSaveBar.className = "ebc-editor-save-bar";
            botSaveBar.style.marginTop = "2px";
            const botSaveBtn = document.createElement("button");
            botSaveBtn.className = "ebc-create-btn";
            botSaveBtn.textContent = t("outfits.saveChanges");
            botSaveBtn.addEventListener("click", () => {
                updateScene(scene.id, eNameInp.value, getSteps(), eCmdInp.value);
                this.rerender();
            });
            botSaveBar.appendChild(botSaveBtn);
            editor.appendChild(botSaveBar);

            editBtn.addEventListener("click", () => {
                const open = editor.classList.contains("open");
                editor.classList.toggle("open", !open);
                editBtn.classList.toggle("open", !open);
                row.style.borderRadius = open ? "6px" : "6px 6px 0 0";
                if (!open) window.setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
            });

            wrapper.appendChild(row);
            wrapper.appendChild(editor);
            body.appendChild(wrapper);
        }

        // ── New scene form ─────────────────────────────────────────────────────
        const sceneDivider2 = document.createElement("div");
        sceneDivider2.className = "ebc-divider";
        body.appendChild(sceneDivider2);

        const newSceneToggle = document.createElement("button");
        newSceneToggle.className = "ebc-new-outfit-btn";
        newSceneToggle.textContent = "+ New Scene";
        body.appendChild(newSceneToggle);

        const newSceneForm = document.createElement("div");
        newSceneForm.className = "ebc-new-form";
        body.appendChild(newSceneForm);

        const nsNameRow = document.createElement("div");
        nsNameRow.className = "ebc-form-row";
        const nsNameLbl = document.createElement("span");
        nsNameLbl.className = "ebc-form-label";
        nsNameLbl.textContent = "Name";
        const nsNameInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "e.g. Striptease", maxLength: 40,
        }) as HTMLInputElement;
        nsNameInp.style.flex = "1";
        nsNameRow.appendChild(nsNameLbl);
        nsNameRow.appendChild(nsNameInp);
        newSceneForm.appendChild(nsNameRow);

        const nsCmdRow = document.createElement("div");
        nsCmdRow.className = "ebc-form-row";
        const nsCmdLbl = document.createElement("span");
        nsCmdLbl.className = "ebc-form-label";
        nsCmdLbl.textContent = "Command";
        const nsCmdPrefix = document.createElement("span");
        nsCmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
        nsCmdPrefix.textContent = "/";
        const nsCmdInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "optional", maxLength: 30,
        }) as HTMLInputElement;
        nsCmdInp.style.flex = "1";
        const nsCmdWrap = document.createElement("div");
        nsCmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
        nsCmdWrap.appendChild(nsCmdPrefix);
        nsCmdWrap.appendChild(nsCmdInp);
        nsCmdRow.appendChild(nsCmdLbl);
        nsCmdRow.appendChild(nsCmdWrap);
        newSceneForm.appendChild(nsCmdRow);

        const nsTopSaveBar = document.createElement("div");
        nsTopSaveBar.className = "ebc-editor-save-bar";
        const nsTopSaveBtn = document.createElement("button");
        nsTopSaveBtn.className = "ebc-update-btn";
        nsTopSaveBtn.textContent = "✓ Save Scene";
        nsTopSaveBtn.style.cssText = "flex:1;font-size:11px;";
        nsTopSaveBar.appendChild(nsTopSaveBtn);
        newSceneForm.appendChild(nsTopSaveBar);

        const nsStepsLbl = document.createElement("div");
        nsStepsLbl.className = "ebc-import-hint";
        nsStepsLbl.style.marginTop = "3px";
        nsStepsLbl.textContent = "Steps:";
        newSceneForm.appendChild(nsStepsLbl);

        const { getSteps: nsGetSteps } = buildSceneEditor(newSceneForm, []);

        const doSaveScene = (): void => {
            const name = nsNameInp.value.trim();
            if (!name) { nsNameInp.style.borderColor = "#cf6f98"; return; }
            createScene(name, nsGetSteps(), nsCmdInp.value);
            this.rerender();
        };

        nsTopSaveBtn.addEventListener("click", doSaveScene);

        const nsBotSaveBar = document.createElement("div");
        nsBotSaveBar.className = "ebc-editor-save-bar";
        nsBotSaveBar.style.marginTop = "2px";
        const nsBotSaveBtn = document.createElement("button");
        nsBotSaveBtn.className = "ebc-create-btn";
        nsBotSaveBtn.textContent = "Save Scene";
        nsBotSaveBtn.addEventListener("click", doSaveScene);
        nsBotSaveBar.appendChild(nsBotSaveBtn);
        newSceneForm.appendChild(nsBotSaveBar);

        newSceneToggle.addEventListener("click", () => {
            const open = newSceneForm.style.display !== "none";
            newSceneForm.style.display = open ? "none" : "flex";
            newSceneToggle.textContent = open ? "+ New Scene" : "- Cancel";
            if (!open) {
                nsNameInp.focus();
                window.setTimeout(() => newSceneToggle.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
            }
        });

        // ── Import scene ──────────────────────────────────────────────────────
        const impToggleBtn = document.createElement("button");
        impToggleBtn.className = "ebc-new-outfit-btn";
        impToggleBtn.textContent = "↓ Import Scene";
        body.appendChild(impToggleBtn);

        const impPanel = document.createElement("div");
        impPanel.className = "ebc-import-panel";
        body.appendChild(impPanel);

        const impHint = document.createElement("div");
        impHint.className = "ebc-import-hint";
        impHint.textContent = "Paste scene JSON exported from another EBC user:";
        impPanel.appendChild(impHint);

        const impTextarea = document.createElement("textarea");
        impTextarea.placeholder = 'Paste scene JSON here…';
        impTextarea.style.cssText = "width:100%;min-height:72px;resize:vertical;font-family:'Trebuchet MS',serif;font-size:10px;background:#130810;color:#e8b4c8;border:1px solid #3a1928;border-radius:4px;padding:5px;box-sizing:border-box;outline:none;";
        impPanel.appendChild(impTextarea);

        const impError = document.createElement("div");
        impError.className = "ebc-import-error";
        impPanel.appendChild(impError);

        const impActionRow = document.createElement("div");
        impActionRow.style.cssText = "display:flex;gap:5px;";
        const impLoadBtn = document.createElement("button");
        impLoadBtn.className = "ebc-create-btn";
        impLoadBtn.style.marginTop = "0";
        impLoadBtn.textContent = "Import";
        const impCancelBtn = document.createElement("button");
        impCancelBtn.className = "ebc-btn-footer-btn";
        impCancelBtn.textContent = "Cancel";
        impActionRow.appendChild(impLoadBtn);
        impActionRow.appendChild(impCancelBtn);
        impPanel.appendChild(impActionRow);

        const closeImpPanel = (): void => {
            impPanel.classList.remove("open");
            impToggleBtn.textContent = "↓ Import Scene";
            impTextarea.value = "";
            impError.textContent = "";
        };

        impToggleBtn.addEventListener("click", () => {
            const open = impPanel.classList.contains("open");
            impPanel.classList.toggle("open", !open);
            impToggleBtn.textContent = open ? "↓ Import Scene" : "- Cancel Import";
            if (!open) { impTextarea.value = ""; impError.textContent = ""; impTextarea.focus(); }
        });

        impCancelBtn.addEventListener("click", closeImpPanel);

        impLoadBtn.addEventListener("click", () => {
            impError.textContent = "";
            try {
                importScene(impTextarea.value.trim());
                closeImpPanel();
                this.rerender();
            } catch (err) {
                impError.textContent = err instanceof Error ? err.message : "Invalid format.";
            }
        });
    }

    // -- Beep window -----------------------------------------------------------

    private refreshTabDot(): void {
        const tab = this.rootEl?.querySelector<HTMLElement>("#ebc-tab");
        if (!tab) return;
        const hasUnread = this.beepUnread.size > 0;
        let dot = tab.querySelector<HTMLElement>("#ebc-tab-unread-dot");
        if (hasUnread && !dot) {
            dot = document.createElement("div");
            dot.id = "ebc-tab-unread-dot";
            dot.title = "Click to open messages";
            dot.style.cursor = "pointer";
            dot.addEventListener("click", (e) => {
                e.stopPropagation();
                // Open panel on the USERS tab so the messages dropdown is visible
                if (!this.isOpen) this.open();
                this.switchTab("notes");
            });
            tab.style.position = "relative";
            tab.appendChild(dot);
        } else if (!hasUnread && dot) {
            dot.remove();
        }
        // Keep the USERS tab button badge in sync
        const notesBadge = this.rootEl?.querySelector<HTMLElement>("#ebc-notes-tab-badge");
        if (notesBadge) {
            const total = [...this.beepUnread.values()].reduce((s, n) => s + n, 0);
            if (total > 0) {
                notesBadge.textContent = total > 99 ? "99+" : String(total);
                notesBadge.style.display = "block";
            } else {
                notesBadge.style.display = "none";
            }
        }
    }

    public openBeepWindow(memberNumber: number, startMinimized = false): void {
        // If window already open for this member, refresh history and focus
        const existing = this.beepWins.get(memberNumber);
        if (existing) {
            const refresh = (existing.el as unknown as Record<string, unknown>)._refresh as (() => void) | undefined;
            refresh?.();
            (existing.el.querySelector(".ebc-beep-win-input") as HTMLInputElement | null)?.focus();
            return;
        }

        this.beepUnread.delete(memberNumber);
        this.refreshTabDot();
        EBCDrawer.addOpenBeepWindow(memberNumber);

        // Offset each new window slightly so they don't all stack at the same position
        const offset = this.beepWins.size * 28;

        const win = document.createElement("div");
        win.className = "ebc-beep-win";
        win.style.bottom = `${80 + offset}px`;
        win.style.right  = `${340 + offset}px`;
        this.beepWins.set(memberNumber, { el: win, minimized: startMinimized });
        if (startMinimized) win.classList.add("minimized");

        // Header
        const header = document.createElement("div");
        header.className = "ebc-beep-win-header";

        const dot = document.createElement("span");
        dot.className = "ebc-friend-dot " + getFriendStatus(memberNumber);

        const titleArea = document.createElement("div");
        titleArea.style.cssText = "display:flex;flex-direction:column;flex:1;min-width:0;justify-content:center;overflow:hidden;";

        const title = document.createElement("span");
        title.className = "ebc-beep-win-title";
        title.textContent = `${resolveName(memberNumber)} #${memberNumber}`;

        const roomPill = document.createElement("div");
        roomPill.className = "ebc-beep-room-pill";
        roomPill.style.display = "none";

        titleArea.appendChild(title);
        titleArea.appendChild(roomPill);

        // Called whenever online friend status refreshes (AccountQueryResult)
        const updateStatus = (): void => {
            const s = getFriendStatus(memberNumber);
            dot.className = "ebc-friend-dot " + s;
            title.textContent = `${resolveName(memberNumber)} #${memberNumber}`;
            const info = getFriendOnlineInfo(memberNumber);
            if (info?.roomName) {
                roomPill.textContent = `📍 ${info.roomName}`;
                roomPill.style.display = "";
            } else {
                roomPill.style.display = "none";
            }
        };
        (win as unknown as Record<string, unknown>)._updateStatus = updateStatus;
        updateStatus(); // populate room pill immediately

        // Unread dot (shown on minimized bar)
        const unreadDot = document.createElement("div");
        unreadDot.className = "ebc-beep-win-unread-dot";

        const muteBtn = document.createElement("button");
        muteBtn.className = "ebc-beep-win-hbtn ebc-beep-win-mute";
        const refreshMuteBtn = (): void => {
            const muted = getBeepMuted();
            muteBtn.textContent = muted ? "🔕" : "🔔";
            muteBtn.title = muted ? "Unmute notifications" : "Mute notifications";
            muteBtn.classList.toggle("muted", muted);
        };
        refreshMuteBtn();
        muteBtn.addEventListener("click", () => { setBeepMuted(!getBeepMuted()); refreshMuteBtn(); });

        // Suppress-in-BC-chat toggle — SVG chat bubble, slash through it when suppressed (default)
        const suppressBtn = document.createElement("button");
        suppressBtn.className = "ebc-beep-win-hbtn";
        suppressBtn.style.cssText = "background:#2a0e1e;border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;";
        const refreshSuppressBtn = (): void => {
            const suppressed = getSuppressNativeBeep();
            const bubbleColor = suppressed ? "#6a3a4a" : "#cf6f98";
            const slashLine  = suppressed
                ? `<line x1="1" y1="15" x2="15" y2="1" stroke="#ff4455" stroke-width="2.2" stroke-linecap="round"/>`
                : "";
            suppressBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;">
                <rect x="1" y="1" width="12" height="10" rx="3" fill="${bubbleColor}"/>
                <polygon points="2,11 1,15 5,12.5" fill="${bubbleColor}"/>
                ${slashLine}
            </svg>`;
            suppressBtn.title = suppressed
                ? "Beeps hidden from BC chat — click to show them there too"
                : "Beeps visible in BC chat — click to hide them";
            suppressBtn.style.border = suppressed ? "1px solid #5a2030" : "1px solid #cf6f98";
        };
        refreshSuppressBtn();
        (win as unknown as Record<string, unknown>)._refreshSuppressBtn = refreshSuppressBtn;
        suppressBtn.addEventListener("click", () => {
            setSuppressNativeBeep(!getSuppressNativeBeep());
            for (const { el } of this.beepWins.values()) {
                const fn = (el as unknown as Record<string, unknown>)._refreshSuppressBtn as (() => void) | undefined;
                try { fn?.(); } catch { /* ignore */ }
            }
        });

        const minimizeBtn = document.createElement("button");
        minimizeBtn.className = "ebc-beep-win-hbtn";
        minimizeBtn.textContent = startMinimized ? "▲" : "–";
        minimizeBtn.title = startMinimized ? "Restore" : "Minimize";
        minimizeBtn.addEventListener("click", () => {
            const entry = this.beepWins.get(memberNumber);
            if (!entry) return;
            entry.minimized = !entry.minimized;
            win.classList.toggle("minimized", entry.minimized);
            minimizeBtn.textContent = entry.minimized ? "▲" : "–";
            minimizeBtn.title = entry.minimized ? "Restore" : "Minimize";
            if (!entry.minimized) {
                unreadDot.classList.remove("visible");
                this.beepUnread.delete(memberNumber);
                this.refreshTabDot();
                try { this.refreshFriendList(); } catch { /* ignore */ }
            }
        });

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-beep-win-hbtn ebc-beep-win-close";
        closeBtn.textContent = "×";
        closeBtn.addEventListener("click", () => {
            const cleanup = (win as unknown as Record<string, unknown>)._closeEmoji as EventListener | undefined;
            if (cleanup) { try { document.removeEventListener("click", cleanup, true); } catch { /* ignore */ } }
            win.remove();
            this.beepWins.delete(memberNumber);
            EBCDrawer.removeOpenBeepWindow(memberNumber);
        });

        // Profile button — person icon, opens BC info sheet
        const profileBtn = document.createElement("button");
        profileBtn.className = "ebc-beep-win-hbtn";
        profileBtn.style.cssText = "background:#2a0e1e;border:1px solid #4c2537;border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;";
        profileBtn.title = "View profile";
        profileBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;">
            <circle cx="8" cy="5" r="3" fill="#cf6f98"/>
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#cf6f98"/>
        </svg>`;
        profileBtn.addEventListener("mouseenter", () => { profileBtn.style.background = "#3a1020"; profileBtn.style.borderColor = "#cf6f98"; });
        profileBtn.addEventListener("mouseleave", () => { profileBtn.style.background = "#2a0e1e"; profileBtn.style.borderColor = "#4c2537"; });
        profileBtn.addEventListener("click", async () => {
            const w           = window as unknown as Record<string, unknown>;
            const loadChar    = w.InformationSheetLoadCharacter as ((c: unknown) => void) | undefined;
            const hideEls     = w.ChatRoomHideElements          as (() => void) | undefined;
            const loadOnline  = w.CharacterLoadOnline           as ((d: unknown, n: number) => unknown) | undefined;
            const roomChars   = w.ChatRoomCharacter             as Array<Record<string, unknown>> | undefined;

            const doOpen = (C: unknown): void => {
                this.close();
                if (w.CurrentScreen === "ChatRoom") {
                    try { hideEls?.(); } catch { /* ignore */ }
                    try {
                        const bgData = (w.ChatRoomData as Record<string, unknown> | undefined)?.Background;
                        if (bgData) w.ChatRoomBackground = bgData;
                    } catch { /* ignore */ }
                }
                loadChar!(C);
            };

            if (!loadChar || !loadOnline) {
                try { navigator.clipboard.writeText(String(memberNumber)); } catch { /* ignore */ }
                return;
            }

            const inRoom = Array.isArray(roomChars)
                ? roomChars.find(c => c.MemberNumber === memberNumber)
                : undefined;
            if (inRoom) { try { doOpen(inRoom); return; } catch { /* ignore */ } }

            const bundle = await getCharacterBundle(memberNumber);
            if (bundle) {
                try { const C = loadOnline(bundle, memberNumber); if (C) { doOpen(C); return; } } catch { /* ignore */ }
            }

            try { navigator.clipboard.writeText(String(memberNumber)); } catch { /* ignore */ }
        });

        header.appendChild(dot);
        header.appendChild(titleArea);
        header.appendChild(unreadDot);
        header.appendChild(muteBtn);
        header.appendChild(profileBtn);
        header.appendChild(suppressBtn);
        header.appendChild(minimizeBtn);
        header.appendChild(closeBtn);
        win.appendChild(header);

        // Restore saved position from localStorage, or fall back to default offset
        const savedPosKey = `EBC_beepPos_${memberNumber}`;
        try {
            const saved = localStorage.getItem(savedPosKey);
            if (saved) {
                const { left, bottom } = JSON.parse(saved) as { left: number; bottom: number };
                win.style.left   = `${left}px`;
                win.style.bottom = `${bottom}px`;
                win.style.right  = "";
            }
        } catch { /* ignore — use default offset position */ }

        // Make header draggable — anchored by bottom so expanding grows upward.
        // Saves position to localStorage on drag release so it persists across relogins.
        // Works with both mouse and touch via addPointerDown / addPointerTracking.
        addPointerDown(header, (start, e) => {
            if (e.target === closeBtn) return;
            e.preventDefault();
            const rect = win.getBoundingClientRect();
            const ox = start.clientX - rect.left;
            const vh = window.innerHeight;
            const oyFromBottom = rect.bottom - start.clientY;
            addPointerTracking(
                (pos) => {
                    const winW  = win.offsetWidth  || 280;
                    const hdrH  = header.offsetHeight || 38;
                    const rawL  = pos.clientX - ox;
                    const rawB  = vh - pos.clientY - oyFromBottom;
                    win.style.left   = `${Math.max(0, Math.min(rawL, window.innerWidth  - winW))}px`;
                    win.style.bottom = `${Math.max(0, Math.min(rawB, window.innerHeight - hdrH))}px`;
                    win.style.right  = "";
                    win.style.top    = "";
                },
                () => {
                    // Save final position so it's restored next time this window opens
                    try {
                        const left   = parseFloat(win.style.left)   || 0;
                        const bottom = parseFloat(win.style.bottom) || 80;
                        localStorage.setItem(savedPosKey, JSON.stringify({ left, bottom }));
                    } catch { /* ignore */ }
                },
            );
        });

        // History
        const history = document.createElement("div");
        history.className = "ebc-beep-win-history";
        win.appendChild(history);

        // Reply state
        let replyText = "";

        const clearReply = (): void => {
            replyText = "";
            replyBar.style.display = "none";
        };

        const setReply = (text: string): void => {
            replyText = text;
            replyBarSpan.textContent = text;
            replyBar.style.display = "flex";
            input.focus();
        };

        const IMAGE_RE = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(\?\S*)?/i;

        const renderHistory = (): void => {
            while (history.firstChild) history.removeChild(history.firstChild);
            // Flex spacer: pushes messages to the bottom when there are few of them.
            // Using flex-start + spacer instead of justify-content:flex-end avoids the
            // well-known CSS bug where overflow-y:auto + flex-end makes content unreachable.
            const spacer = document.createElement("div");
            spacer.style.flex = "1";
            history.appendChild(spacer);
            const entries = getConversation(memberNumber);
            const self = Player.MemberNumber ?? 0;
            if (entries.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "text-align:center;color:#8a6070;font-size:10px;padding:20px 0;";
                hint.textContent = "No messages yet. Say hi!";
                history.appendChild(hint);
            }
            for (const e of entries) {
                const isSent = e.from === self;
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (isSent ? "flex-end" : "flex-start") + ";";

                const bubbleMember = isSent ? self : e.from;
                const nameLabel = document.createElement("div");
                nameLabel.textContent = `${resolveName(bubbleMember)} #${bubbleMember}`;
                nameLabel.style.cssText = `font-family:'Trebuchet MS',serif;font-size:10px;font-weight:600;margin-bottom:2px;padding:0 3px;`;
                // Apply gradient for VIP/Credits members, or a soft default for any EBC user.
                // Fall back to solid colour for non-EBC senders.
                const vipEntry = VIP_MEMBERS[bubbleMember];
                if (vipEntry) {
                    applyGradientText(nameLabel, vipEntry.gradient[0], vipEntry.gradient[1]);
                } else if (bubbleMember === self || getEBCVersion(bubbleMember) !== null) {
                    applyGradientText(nameLabel, "#cf6f98", "#8090d0");
                } else {
                    nameLabel.style.color = isSent ? "#e090b8" : "#80c0e0";
                }
                wrap.appendChild(nameLabel);

                const bubble = document.createElement("div");
                bubble.className = "ebc-beep-msg " + (isSent ? "sent" : "received");

                const ts = document.createElement("div");
                ts.className = "ebc-beep-ts";
                const d = new Date(e.ts);
                const now = new Date();
                const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                const isToday = d.getFullYear() === now.getFullYear()
                    && d.getMonth() === now.getMonth()
                    && d.getDate() === now.getDate();
                const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const dateStr = isToday
                    ? timeStr
                    : `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : ""} · ${timeStr}`;
                ts.textContent = dateStr;
                bubble.appendChild(ts);

                // Strip embedded JSON metadata appended by other mods (WCE, FBC, etc.)
                const cleanMsg = stripBeepMetadata(e.message);
                // Parse message — may start with "> quote\n" reply prefix
                let msgBody = cleanMsg;
                if (cleanMsg.startsWith("> ") && cleanMsg.includes("\n")) {
                    const nl = cleanMsg.indexOf("\n");
                    const quoteEl = document.createElement("div");
                    quoteEl.className = "ebc-beep-quote";
                    quoteEl.textContent = cleanMsg.slice(2, nl);
                    bubble.appendChild(quoteEl);
                    msgBody = cleanMsg.slice(nl + 1);
                }

                // Text content
                const text = document.createElement("div");
                text.textContent = msgBody;
                bubble.appendChild(text);

                // Image embed — detect image URL in the message body
                const imgUrl = IMAGE_RE.exec(msgBody)?.[0];
                if (imgUrl) {
                    const img = document.createElement("img");
                    img.className = "ebc-beep-img";
                    img.src = imgUrl;
                    img.alt = "image";
                    img.addEventListener("click", () => window.open(imgUrl, "_blank"));
                    img.addEventListener("error", () => { img.style.display = "none"; });
                    bubble.appendChild(img);
                }

                wrap.appendChild(bubble);

                // Reply button — only show on received messages
                if (!isSent) {
                    const replyBtn = document.createElement("button");
                    replyBtn.className = "ebc-beep-reply-btn";
                    replyBtn.textContent = t("users.reply");
                    replyBtn.addEventListener("click", () => setReply(msgBody.slice(0, 80)));
                    wrap.appendChild(replyBtn);
                }

                history.appendChild(wrap);
            }
            requestAnimationFrame(() => { history.scrollTop = history.scrollHeight; });
        };

        renderHistory();

        // Reply bar (shown above footer when replying)
        const replyBar = document.createElement("div");
        replyBar.className = "ebc-beep-reply-bar";
        replyBar.style.display = "none";
        const replyBarLabel = document.createElement("span");
        replyBarLabel.style.cssText = "color:#cf6f98;font-weight:bold;flex-shrink:0;";
        replyBarLabel.textContent = "↩";
        const replyBarSpan = document.createElement("span");
        const replyCancel = document.createElement("button");
        replyCancel.className = "ebc-beep-reply-cancel";
        replyCancel.textContent = "×";
        replyCancel.addEventListener("click", clearReply);
        replyBar.appendChild(replyBarLabel);
        replyBar.appendChild(replyBarSpan);
        replyBar.appendChild(replyCancel);
        win.appendChild(replyBar);

        // Footer
        const footer = document.createElement("div");
        footer.className = "ebc-beep-win-footer";
        footer.style.position = "relative";

        const input = document.createElement("input");
        input.className = "ebc-beep-win-input";
        input.type = "text";
        input.placeholder = t("users.typeMessage");
        input.maxLength = 300;

        const sendBtn = document.createElement("button");
        sendBtn.className = "ebc-beep-win-send";
        sendBtn.textContent = "Send";

        // Emoji picker
        const EMOJIS = [
            // Faces — happy & expressive
            "😊","😄","😂","🥰","😍","😘","😜","😏","🤔","😳",
            // Faces — sad, shy & silly
            "😭","😢","🥹","😇","😋","🤭","🫠","🤣","😅","🫣",
            // Gestures & reactions
            "👉","👈","👀","🙌","🫶","🤗","🙈","🥺","👋","😬",
            // Hearts
            "💕","💖","❤️","💗","💜","💙","💚","🧡","💛","💝",
            // Sparkle & celebration
            "✨","🎉","🎊","💫","🌟","⭐","🎀","🎵","👑","🌈",
            // Cute animals & nature
            "🌸","🍑","🐾","🐱","🐰","🦊","🦋","🌙","💤","🍭",
        ];
        const emojiPicker = document.createElement("div");
        emojiPicker.className = "ebc-emoji-picker";
        emojiPicker.style.display = "none";
        for (const emoji of EMOJIS) {
            const eb = document.createElement("button");
            eb.textContent = emoji;
            eb.addEventListener("click", (e) => {
                e.stopPropagation();
                const start = input.selectionStart ?? input.value.length;
                const end   = input.selectionEnd   ?? input.value.length;
                input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
                input.selectionStart = input.selectionEnd = start + [...emoji].length;
                input.focus();
                emojiPicker.style.display = "none";
            });
            emojiPicker.appendChild(eb);
        }

        const emojiBtn = document.createElement("button");
        emojiBtn.className = "ebc-emoji-btn";
        emojiBtn.textContent = "😊";
        emojiBtn.title = "Insert emoji";
        emojiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const showing = emojiPicker.style.display !== "none";
            emojiPicker.style.display = showing ? "none" : "flex";
        });

        const closeEmojiOnOutside = (e: MouseEvent): void => {
            if (!emojiPicker.contains(e.target as Node) && e.target !== emojiBtn) {
                emojiPicker.style.display = "none";
            }
        };
        document.addEventListener("click", closeEmojiOnOutside, true);
        (win as unknown as Record<string, unknown>)._closeEmoji = closeEmojiOnOutside;

        const doSend = (): void => {
            const msg = input.value.trim();
            if (!msg) return;
            const full = replyText ? `> ${replyText}\n${msg}` : msg;
            clearReply();
            sendBeep(memberNumber, full);
            input.value = "";
            renderHistory();
        };

        sendBtn.addEventListener("click", doSend);
        input.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") doSend(); });

        footer.appendChild(emojiPicker);
        footer.appendChild(input);
        footer.appendChild(emojiBtn);
        footer.appendChild(sendBtn);
        win.appendChild(footer);

        document.body.appendChild(win);
        input.focus();

        // Store renderHistory so incoming beeps can trigger a refresh
        (win as unknown as Record<string, unknown>)._refresh = renderHistory;
    }

    public refreshBeepWindow(memberNumber: number): void {
        const entry = this.beepWins.get(memberNumber);
        if (!entry) return;
        const refresh = (entry.el as unknown as Record<string, unknown>)._refresh as (() => void) | undefined;
        refresh?.();
    }

    // -- Messages dropdown (inside USERS tab) ----------------------------------

    /** Build a single conversation row for the messages dropdown. */
    private buildInboxCard(num: number, name: string, lastMsg: string, lastTs: number, unread: number): HTMLElement {
        const card = document.createElement("div");
        card.className = "ebc-inbox-card" + (unread > 0 ? " unread" : "");

        // ── Left: avatar dot + name + preview ───────────────────────────────
        const left = document.createElement("div");
        left.style.cssText = "flex:1;min-width:0;";

        const nameLine = document.createElement("div");
        nameLine.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:2px;";

        const dot = document.createElement("div");
        dot.style.cssText = `width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${unread > 0 ? "#cf6f98" : "#3a2030"};`;
        nameLine.appendChild(dot);

        const nameEl = document.createElement("span");
        nameEl.style.cssText = `font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;color:${unread > 0 ? "#f0d0e0" : "#b08090"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;`;
        nameEl.textContent = `${name} #${num}`;
        nameLine.appendChild(nameEl);

        if (unread > 0) {
            const badge = document.createElement("span");
            badge.textContent = unread > 99 ? "99+" : String(unread);
            badge.style.cssText = "background:#cf6f98;color:#fff;border-radius:8px;font-size:8px;font-weight:bold;padding:1px 5px;flex-shrink:0;line-height:14px;";
            nameLine.appendChild(badge);
        }
        left.appendChild(nameLine);

        const preview = document.createElement("div");
        const previewText = lastMsg.replace(/^> .+\n/, "").slice(0, 90);
        preview.style.cssText = `font-family:'Trebuchet MS',serif;font-size:10px;color:${unread > 0 ? "#d0a0b8" : "#6a4050"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:12px;`;
        preview.textContent = previewText || "…";
        left.appendChild(preview);

        card.appendChild(left);

        // ── Right: time + open button ────────────────────────────────────────
        const right = document.createElement("div");
        right.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;";

        const timeEl = document.createElement("span");
        timeEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3040;";
        timeEl.textContent = formatLastSeen(lastTs);
        right.appendChild(timeEl);

        const openBtn = document.createElement("button");
        openBtn.textContent = "Open";
        openBtn.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:3px 8px;border-radius:4px;cursor:pointer;transition:background 0.12s,border-color 0.12s;border:1px solid ${unread > 0 ? "#cf6f98" : "#3a1928"};background:${unread > 0 ? "#3a1020" : "transparent"};color:${unread > 0 ? "#cf6f98" : "#7a5a6a"};`;
        openBtn.addEventListener("mouseenter", () => { openBtn.style.background = "#3a1020"; openBtn.style.borderColor = "#cf6f98"; openBtn.style.color = "#cf6f98"; });
        openBtn.addEventListener("mouseleave", () => { openBtn.style.background = unread > 0 ? "#3a1020" : "transparent"; openBtn.style.borderColor = unread > 0 ? "#cf6f98" : "#3a1928"; openBtn.style.color = unread > 0 ? "#cf6f98" : "#7a5a6a"; });
        openBtn.addEventListener("click", () => {
            this.openBeepWindow(num);
            // Clear unread for this sender and re-render
            this.beepUnread.delete(num);
            this.refreshTabDot();
            this.rerender();
        });
        right.appendChild(openBtn);

        card.appendChild(right);

        // Clicking the card itself also opens the chat
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            this.openBeepWindow(num);
            this.beepUnread.delete(num);
            this.refreshTabDot();
            this.rerender();
        });

        return card;
    }

    public updateAllBeepWindowStatuses(): void {
        for (const { el } of this.beepWins.values()) {
            const fn = (el as unknown as Record<string, unknown>)._updateStatus as (() => void) | undefined;
            try { fn?.(); } catch { /* ignore */ }
        }
    }

    public onIncomingBeep(fromNum: number): void {
        const entry = this.beepWins.get(fromNum);

        if (entry) {
            // Always refresh history so it's current when the user restores the window
            this.refreshBeepWindow(fromNum);
            if (entry.minimized) {
                // Window is minimized — increment unread and light up the dot
                this.beepUnread.set(fromNum, (this.beepUnread.get(fromNum) ?? 0) + 1);
                this.refreshTabDot();
                const dot = entry.el.querySelector<HTMLElement>(".ebc-beep-win-unread-dot");
                if (dot) dot.classList.add("visible");
            }
        } else {
            // No window open at all
            this.beepUnread.set(fromNum, (this.beepUnread.get(fromNum) ?? 0) + 1);
            this.refreshTabDot();
            if (this.currentTab === "notes") {
                try { this.rerender(); } catch { /* ignore */ }
            }
        }

        // Toast popup — always shown so the user notices the new message
        this.showBeepToast(fromNum);
    }

    private showBeepToast(fromNum: number): void {
        try {
            const msgs = getConversation(fromNum);
            const last = msgs[msgs.length - 1];
            const preview = last ? last.message.replace(/^> .+\n/, "").slice(0, 80) : "";
            const name = resolveName(fromNum);

            const toast = document.createElement("div");
            toast.className = "ebc-toast";

            const header = document.createElement("div");
            header.className = "ebc-toast-header";

            const icon = document.createElement("span");
            icon.className = "ebc-toast-icon";
            icon.textContent = "💬";

            const nameEl = document.createElement("span");
            nameEl.className = "ebc-toast-name";
            nameEl.textContent = name;

            header.appendChild(icon);
            header.appendChild(nameEl);

            const body = document.createElement("div");
            body.className = "ebc-toast-body";
            body.textContent = preview || "…";

            toast.appendChild(header);
            toast.appendChild(body);

            toast.addEventListener("click", () => {
                this.openBeepWindow(fromNum);
                dismiss();
            });

            document.body.appendChild(toast);

            // Stack toasts if multiple arrive — offset each one upward
            const existing = document.querySelectorAll<HTMLElement>(".ebc-toast");
            let offset = 0;
            existing.forEach(t => { if (t !== toast) offset += (t.offsetHeight || 72) + 8; });
            if (offset > 0) toast.style.bottom = `${24 + offset}px`;

            let gone = false;
            const dismiss = (): void => {
                if (gone) return;
                gone = true;
                toast.classList.add("ebc-toast-out");
                setTimeout(() => toast.remove(), 320);
            };
            const timer = setTimeout(dismiss, 5000);
            toast.addEventListener("click", () => clearTimeout(timer), { once: true });
        } catch { /* ignore */ }
    }

    // -- Notes tab -------------------------------------------------------------

    /**
     * "MISSED MESSAGES" section at the top of the USERS tab.
     * Only rendered when there are unread beeps — disappears completely once
     * all conversations have been opened.
     */
    private renderMessagesDropdown(body: HTMLElement): void {
        // Nothing to show — hide the whole section
        if (this.beepUnread.size === 0) return;

        const self = Player.MemberNumber ?? 0;
        const totalUnread = [...this.beepUnread.values()].reduce((s, n) => s + n, 0);

        // Collect only conversations that have unread messages, most recent first
        interface ConvSummary { num: number; name: string; lastMsg: string; lastTs: number; unread: number; }
        const history = getBeepHistory();
        const seenNums = new Set<number>();
        const missed: ConvSummary[] = [];
        for (let i = history.length - 1; i >= 0; i--) {
            const e = history[i];
            const partner = e.from === self ? e.to : e.from;
            if (!partner || partner === self) continue;
            if (seenNums.has(partner)) continue;
            seenNums.add(partner);
            const unread = this.beepUnread.get(partner) ?? 0;
            if (unread > 0) {
                missed.push({
                    num: partner, name: resolveName(partner),
                    lastMsg: stripBeepMetadata(e.message), lastTs: e.ts,
                    unread,
                });
            }
        }
        // Sort most-recent missed first
        missed.sort((a, b) => b.lastTs - a.lastTs);

        // ── Header ────────────────────────────────────────────────────────
        const hdr = document.createElement("div");
        hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;";

        const hdrLbl = document.createElement("span");
        hdrLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;color:#8a5070;letter-spacing:0.08em;text-transform:uppercase;";
        hdrLbl.textContent = `MISSED MESSAGES (${totalUnread})`;
        hdr.appendChild(hdrLbl);

        const markBtn = document.createElement("button");
        markBtn.textContent = "✓ Dismiss all";
        markBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;padding:2px 6px;border-radius:4px;border:1px solid #3a1928;background:transparent;color:#7a5a6a;cursor:pointer;transition:color 0.12s,border-color 0.12s;";
        markBtn.addEventListener("mouseenter", () => { markBtn.style.color = "#cf6f98"; markBtn.style.borderColor = "#cf6f98"; });
        markBtn.addEventListener("mouseleave", () => { markBtn.style.color = "#7a5a6a"; markBtn.style.borderColor = "#3a1928"; });
        markBtn.addEventListener("click", () => {
            this.beepUnread.clear();
            this.refreshTabDot();
            this.rerender();
        });
        hdr.appendChild(markBtn);

        body.appendChild(hdr);

        // ── Missed message cards ───────────────────────────────────────────
        for (const c of missed) {
            body.appendChild(this.buildInboxCard(c.num, c.name, c.lastMsg, c.lastTs, c.unread));
        }

        // Divider between this section and AFK/friends below
        const divider = document.createElement("div");
        divider.style.cssText = "height:1px;background:#2a1421;margin:8px 0 8px;";
        body.appendChild(divider);
    }

    private renderNotes(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // ── Messages dropdown ─────────────────────────────────────────────────
        this.renderMessagesDropdown(body);

        // ── AFK auto-reply ────────────────────────────────────────────────────
        let afkCollapsed = true;
        try { afkCollapsed = localStorage.getItem("EBC_afkCollapsed") !== "0"; } catch { /* ignore */ }

        const afkHeader = document.createElement("div");
        afkHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;margin-bottom:4px;";
        const afkLbl = document.createElement("div");
        afkLbl.className = "ebc-section-label";
        afkLbl.style.margin = "0";
        afkLbl.textContent = t("settings.afkAutoReply");
        const afkChevron = document.createElement("span");
        afkChevron.style.cssText = "font-size:10px;color:#7a5060;cursor:pointer;padding:0 4px;";
        afkHeader.appendChild(afkLbl);
        afkHeader.appendChild(afkChevron);
        body.appendChild(afkHeader);

        const afkBody = document.createElement("div");
        afkBody.style.cssText = "padding:6px 0 2px 0;display:flex;flex-direction:column;gap:7px;";

        // ON/OFF row
        const afkToggleRow = document.createElement("div");
        afkToggleRow.style.cssText = "display:flex;align-items:center;gap:8px;";
        const afkToggleLbl = document.createElement("span");
        afkToggleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;flex:1;";
        afkToggleLbl.textContent = t("users.autoReplyWhenAfk");
        const afkToggleBtn = document.createElement("button");
        const refreshAfkToggle = (): void => {
            const on = getAfkEnabled();
            afkToggleBtn.textContent = on ? t("core.on") : t("core.off");
            afkToggleBtn.style.cssText = [
                "font-family:'Trebuchet MS',serif", "font-size:9px", "font-weight:bold",
                "padding:1px 10px", "border-radius:4px", "cursor:pointer", "flex-shrink:0",
                "border:1px solid " + (on ? "#cf6f98" : "#3a1928"),
                "background:" + (on ? "#4a1f30" : "#100508"),
                "color:" + (on ? "#f7e6ee" : "#4c2537"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
        };
        refreshAfkToggle();
        afkToggleBtn.addEventListener("click", () => { setAfkEnabled(!getAfkEnabled()); refreshAfkToggle(); });
        afkToggleRow.appendChild(afkToggleLbl);
        afkToggleRow.appendChild(afkToggleBtn);
        afkBody.appendChild(afkToggleRow);

        // Threshold — label row + h/m/s inputs on separate row
        const afkThreshLbl = document.createElement("div");
        afkThreshLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;margin-bottom:4px;";
        afkThreshLbl.textContent = t("settings.idleThreshold");

        const afkThreshRow = document.createElement("div");
        afkThreshRow.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:4px;";

        const inputCss = "width:42px;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 5px;border-radius:4px;border:1px solid #3a1928;background:#130810;color:#f7e6ee;text-align:center;";
        const unitCss  = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;";

        const makeTimeBox = (max: number): HTMLInputElement => {
            const inp = document.createElement("input") as HTMLInputElement;
            inp.type = "number"; inp.min = "0"; inp.max = String(max);
            inp.style.cssText = inputCss;
            // format as 2-digit on blur
            inp.addEventListener("blur", () => {
                const v = Math.max(0, Math.min(max, parseInt(inp.value, 10) || 0));
                inp.value = String(v).padStart(2, "0");
            });
            return inp;
        };

        const totalSecs = getAfkThreshold();
        const initH = Math.floor(totalSecs / 3600);
        const initM = Math.floor((totalSecs % 3600) / 60);
        const initS = totalSecs % 60;

        const hInp = makeTimeBox(99);
        hInp.value = String(initH).padStart(2, "0");
        const hLbl = document.createElement("span"); hLbl.style.cssText = unitCss; hLbl.textContent = "h";
        const mInp = makeTimeBox(59);
        mInp.value = String(initM).padStart(2, "0");
        const mLbl = document.createElement("span"); mLbl.style.cssText = unitCss; mLbl.textContent = "m";
        const sInp = makeTimeBox(59);
        sInp.value = String(initS).padStart(2, "0");
        const sLbl = document.createElement("span"); sLbl.style.cssText = unitCss; sLbl.textContent = "s";

        const commitThreshold = (): void => {
            const h = Math.max(0, parseInt(hInp.value, 10) || 0);
            const m = Math.max(0, Math.min(59, parseInt(mInp.value, 10) || 0));
            const s = Math.max(0, Math.min(59, parseInt(sInp.value, 10) || 0));
            const total = h * 3600 + m * 60 + s;
            setAfkThreshold(Math.max(1, total));
        };
        hInp.addEventListener("change", commitThreshold);
        mInp.addEventListener("change", commitThreshold);
        sInp.addEventListener("change", commitThreshold);

        afkThreshRow.appendChild(hInp); afkThreshRow.appendChild(hLbl);
        afkThreshRow.appendChild(mInp); afkThreshRow.appendChild(mLbl);
        afkThreshRow.appendChild(sInp); afkThreshRow.appendChild(sLbl);
        afkBody.appendChild(afkThreshLbl);
        afkBody.appendChild(afkThreshRow);

        // Message row
        const afkMsgLbl = document.createElement("div");
        afkMsgLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;";
        afkMsgLbl.textContent = t("settings.afkReplyMsg");
        afkBody.appendChild(afkMsgLbl);
        const afkMsgArea = document.createElement("textarea");
        afkMsgArea.value = getAfkMessage();
        afkMsgArea.maxLength = 200;
        afkMsgArea.rows = 2;
        afkMsgArea.placeholder = "I'm currently AFK — I'll reply when I'm back!";
        afkMsgArea.style.cssText = "width:100%;box-sizing:border-box;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 6px;border-radius:4px;border:1px solid #3a1928;background:#130810;color:#f7e6ee;resize:vertical;";
        afkMsgArea.addEventListener("change", () => { setAfkMessage(afkMsgArea.value); });
        afkBody.appendChild(afkMsgArea);

        // Hint
        const afkHintBeep = document.createElement("div");
        afkHintBeep.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
        afkHintBeep.textContent = t("settings.afkHintBeep");
        afkBody.appendChild(afkHintBeep);

        const afkHint = document.createElement("div");
        afkHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-style:italic;";
        afkHint.textContent = t("settings.afkHint");
        afkBody.appendChild(afkHint);

        const toggleAfkCollapsed = (): void => {
            afkCollapsed = !afkCollapsed;
            afkBody.style.display = afkCollapsed ? "none" : "flex";
            afkChevron.textContent = afkCollapsed ? "▲" : "▼";
            try { localStorage.setItem("EBC_afkCollapsed", afkCollapsed ? "1" : "0"); } catch { /* ignore */ }
        };
        afkChevron.textContent = afkCollapsed ? "▲" : "▼";
        afkBody.style.display = afkCollapsed ? "none" : "flex";
        afkHeader.addEventListener("click", toggleAfkCollapsed);
        body.appendChild(afkBody);

        // ── Divider ───────────────────────────────────────────────────────────
        const afkDiv = document.createElement("div");
        afkDiv.className = "ebc-divider";
        body.appendChild(afkDiv);

        const notes = getNotes();

        // ── Collapsible "User Notes" header ──────────────────────────────────
        let userNotesCollapsed = true;
        try { userNotesCollapsed = localStorage.getItem("EBC_userNotesCollapsed") !== "0"; } catch { /* ignore */ }

        const userNotesHeaderRow = document.createElement("div");
        userNotesHeaderRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;margin-bottom:4px;";

        const userNotesLbl = document.createElement("div");
        userNotesLbl.className = "ebc-section-label";
        userNotesLbl.style.margin = "0";
        userNotesLbl.textContent = t("users.header");

        const userNotesChevron = document.createElement("span");
        userNotesChevron.style.cssText = "font-size:10px;color:#7a5060;cursor:pointer;padding:0 4px;";
        userNotesChevron.textContent = userNotesCollapsed ? "▲" : "▼";

        userNotesHeaderRow.appendChild(userNotesLbl);
        userNotesHeaderRow.appendChild(userNotesChevron);
        body.appendChild(userNotesHeaderRow);

        const userNotesBody = document.createElement("div");
        userNotesBody.style.display = userNotesCollapsed ? "none" : "block";

        const toggleUserNotesCollapsed = (): void => {
            userNotesCollapsed = !userNotesCollapsed;
            userNotesBody.style.display = userNotesCollapsed ? "none" : "block";
            userNotesChevron.textContent = userNotesCollapsed ? "▲" : "▼";
            try { localStorage.setItem("EBC_userNotesCollapsed", userNotesCollapsed ? "1" : "0"); } catch { /* ignore */ }
        };
        userNotesHeaderRow.addEventListener("click", toggleUserNotesCollapsed);

        // ── Saved notes only ─────────────────────────────────────────────────
        const savedEntries = Object.entries(notes);
        if (savedEntries.length > 0) {
            for (const [key, data] of savedEntries) {
                userNotesBody.appendChild(this.buildNoteRow(parseInt(key), data.name, data.note));
            }
        } else {
            const empty = document.createElement("div");
            empty.className = "ebc-empty";
            empty.textContent = t("users.noSavedNotes");
            userNotesBody.appendChild(empty);
        }

        body.appendChild(userNotesBody);

        // ── Friends ──────────────────────────────────────────────────────────
        const friendsSection = document.createElement("div");
        this.friendsSectionEl = friendsSection;
        body.appendChild(friendsSection);
        // Defer heavy list build to next animation frame so the tab paints first.
        window.requestAnimationFrame(() => {
            if (this.friendsSectionEl === friendsSection) this.renderFriendRows(friendsSection);
        });
    }

    public refreshFriendList(): void {
        if (this.currentTab !== "notes" || !this.friendsSectionEl) return;
        if (this.friendRefreshDebounce !== null) window.clearTimeout(this.friendRefreshDebounce);
        const target = this.friendsSectionEl;
        this.friendRefreshDebounce = window.setTimeout(() => {
            this.friendRefreshDebounce = null;
            if (this.currentTab === "notes" && this.friendsSectionEl === target) {
                this.renderFriendRows(target);
            }
        }, 80);
    }

    private renderFriendRows(body: HTMLElement): void {
        while (body.firstChild) body.removeChild(body.firstChild);

        const friendList = getFriendList();

        // ── People in Room ────────────────────────────────────────────────────
        {
            const w2 = window as unknown as Record<string, unknown>;
            const roomCharsAll = w2.ChatRoomCharacter as Array<Record<string, unknown>> | undefined;
            const roomList = Array.isArray(roomCharsAll)
                ? roomCharsAll.filter(c => (c.MemberNumber as number) !== Player.MemberNumber)
                : [];

            if (roomList.length > 0) {
                const divR = document.createElement("div");
                divR.className = "ebc-divider";
                body.appendChild(divR);

                try { this.roomPeopleCollapsed = localStorage.getItem("EBC_roomPeopleCollapsed") === "1"; } catch { /* ignore */ }

                const roomContainer = document.createElement("div");

                const buildRoomRow = (char: Record<string, unknown>, container: HTMLElement): void => {
                    const num = char.MemberNumber as number;
                    const nameRaw = (char.Nickname as string | undefined) || (char.Name as string) || "Unknown";
                    const name = resolveName(num) || nameRaw;

                    const wrap = document.createElement("div");
                    wrap.className = "ebc-friend-wrap";
                    if (isSpecialFriend(num)) {
                        wrap.style.background = "linear-gradient(135deg, rgba(255,200,50,0.18) 0%, rgba(180,130,20,0.10) 100%)";
                        wrap.style.borderColor = "rgba(255,200,50,0.55)";
                    }

                    const row = document.createElement("div");
                    row.className = "ebc-friend-row";

                    // Green dot — in room
                    const dot = document.createElement("div");
                    dot.className = "ebc-friend-dot room";

                    // Name
                    const nameEl = document.createElement("span");
                    nameEl.className = "ebc-friend-name";
                    nameEl.textContent = name;
                    const vipRoom = VIP_MEMBERS[num];
                    if (vipRoom) applyGradientText(nameEl, vipRoom.gradient[0], vipRoom.gradient[1]);

                    // Member number
                    const numEl = document.createElement("span");
                    numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a9ab8;flex-shrink:0;";
                    numEl.textContent = "#" + num;

                    // Relationship badge
                    const relBadge = (() => {
                        try {
                            const icons: string[] = [];
                            const own = (Player as unknown as Record<string, unknown>).Ownership as { MemberNumber?: number } | undefined;
                            if (own?.MemberNumber === num) icons.push("👑");
                            const loves = (Player as unknown as Record<string, unknown>).Lovership as Array<{ MemberNumber?: number }> | undefined;
                            if (loves?.some(l => l.MemberNumber === num)) icons.push("❤️");
                            const charOwn = char.Ownership as { MemberNumber?: number } | undefined;
                            if (charOwn?.MemberNumber === Player.MemberNumber) icons.push("🔒");
                            return icons.join("");
                        } catch { return ""; }
                    })();

                    // EBC version badge
                    const ebcVer = (() => {
                        try {
                            const sh = (char.OnlineSharedSettings as Record<string, unknown> | undefined)?.["EBC"];
                            if (sh && typeof sh === "object") {
                                const p = (sh as Record<string, unknown>).presence;
                                if (p && typeof p === "object") {
                                    const v = (p as Record<string, unknown>).version;
                                    const m = (p as Record<string, unknown>).marker;
                                    if (m === "EBC" && typeof v === "string") { cacheEBCVersion(num, v); return v; }
                                }
                            }
                        } catch { /* ignore */ }
                        return getEBCVersion(num);
                    })();

                    // Build nameRow
                    const nameRow = document.createElement("div");
                    nameRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                    // nameEl uses .ebc-friend-name flex:0 1 auto — no override needed
                    nameRow.appendChild(nameEl);
                    nameRow.appendChild(numEl);
                    if (relBadge) {
                        const badge = document.createElement("span");
                        badge.textContent = relBadge;
                        badge.style.cssText = "font-size:10px;flex-shrink:0;line-height:1;";
                        nameRow.appendChild(badge);
                    }

                    // Build metaRow
                    const metaRow = document.createElement("div");
                    metaRow.style.cssText = "display:flex;align-items:center;gap:4px;flex-wrap:wrap;";

                    if (ebcVer) {
                        const ebcBadge = document.createElement("span");
                        ebcBadge.textContent = "EBC " + ebcVer;
                        ebcBadge.title = "Uses EmeryBC v" + ebcVer;
                        ebcBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap;background:var(--ebc-bg-darker);color:var(--ebc-accent);border:1px solid var(--ebc-border);";
                        metaRow.appendChild(ebcBadge);
                    }

                    // Tag chips from friend list (if any)
                    const tl = getFriendTagList(num);
                    if (tl.length > 0) {
                        const tagArea = document.createElement("span");
                        tagArea.style.cssText = "display:inline-flex;align-items:center;gap:3px;flex-shrink:0;";
                        const first = tl[0];
                        const pill = document.createElement("span");
                        pill.className = "ebc-friend-tag";
                        pill.textContent = first.text;
                        if (first.locked) {
                            pill.style.cssText = "background:#3a2e00;color:#FFD700;border:1px solid #FFD700;font-weight:700;text-shadow:0 0 6px #FFD70088;";
                        } else {
                            pill.style.cssText = `background:${first.color}22;color:${first.color};border:1px solid ${first.color}55;`;
                        }
                        tagArea.appendChild(pill);
                        if (tl.length > 1) {
                            const more = document.createElement("span");
                            more.className = "ebc-friend-tag-more";
                            more.textContent = "+" + (tl.length - 1);
                            tagArea.appendChild(more);
                        }
                        metaRow.appendChild(tagArea);
                    }

                    // Build infoCol
                    const infoCol = document.createElement("div");
                    infoCol.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
                    infoCol.appendChild(nameRow);
                    infoCol.appendChild(metaRow);

                    // Profile button — always available since they're in the room
                    const profBtn = document.createElement("button");
                    profBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;"><circle cx="8" cy="5" r="3" fill="#cf6f98"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#cf6f98"/></svg>`;
                    profBtn.title = "View profile";
                    profBtn.style.cssText = "background:var(--ebc-bg-darker);border:1px solid var(--ebc-border-light);border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;";
                    profBtn.addEventListener("mouseenter", () => { profBtn.style.background = "var(--ebc-bg-mid)"; profBtn.style.borderColor = "var(--ebc-accent)"; });
                    profBtn.addEventListener("mouseleave", () => { profBtn.style.background = "var(--ebc-bg-darker)"; profBtn.style.borderColor = "var(--ebc-border-light)"; });
                    profBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const loadChar = w2.InformationSheetLoadCharacter as ((c: unknown) => void) | undefined;
                        const hideEls  = w2.ChatRoomHideElements as (() => void) | undefined;
                        if (!loadChar) return;
                        try {
                            this.close();
                            if (w2.CurrentScreen === "ChatRoom") {
                                try { hideEls?.(); } catch { /* ignore */ }
                                try {
                                    const bgData = (w2.ChatRoomData as Record<string, unknown> | undefined)?.Background;
                                    if (bgData) w2.ChatRoomBackground = bgData;
                                } catch { /* ignore */ }
                            }
                            loadChar(char);
                        } catch { /* ignore */ }
                    });
                    // Copy ID button
                    const COPY_SVG_R = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
                    const copyIdBtnR = document.createElement("button");
                    copyIdBtnR.innerHTML = COPY_SVG_R;
                    copyIdBtnR.title = `Copy ID: ${num}`;
                    copyIdBtnR.style.cssText = "color:var(--ebc-accent);background:var(--ebc-bg-darker);border:1px solid var(--ebc-border-light);border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s,color 0.12s;";
                    copyIdBtnR.addEventListener("mouseenter", () => { copyIdBtnR.style.background = "var(--ebc-bg-mid)"; copyIdBtnR.style.borderColor = "var(--ebc-accent)"; });
                    copyIdBtnR.addEventListener("mouseleave", () => { copyIdBtnR.style.background = "var(--ebc-bg-darker)"; copyIdBtnR.style.borderColor = "var(--ebc-border-light)"; copyIdBtnR.style.color = "var(--ebc-accent)"; });
                    copyIdBtnR.addEventListener("click", (e) => {
                        e.stopPropagation();
                        try { navigator.clipboard.writeText(String(num)); } catch { /* ignore */ }
                        copyIdBtnR.style.color = "#a0d080";
                        copyIdBtnR.style.borderColor = "#a0d080";
                        window.setTimeout(() => { copyIdBtnR.style.color = "var(--ebc-accent)"; copyIdBtnR.style.borderColor = "var(--ebc-border-light)"; }, 1200);
                    });

                    // Build btnCol
                    const btnCol = document.createElement("div");
                    btnCol.style.cssText = "display:flex;align-items:center;gap:3px;flex-shrink:0;align-self:center;";
                    btnCol.appendChild(profBtn);

                    // Beep button — only for friends
                    if (friendList.includes(num)) {
                        const unread = this.beepUnread.get(num) ?? 0;
                        const beepBtn = document.createElement("button");
                        beepBtn.className = "ebc-friend-btn";
                        beepBtn.style.cssText = "position:relative;flex-shrink:0;";
                        beepBtn.textContent = "💬";
                        beepBtn.title = unread ? `${unread} unread` : "Open beep chat";
                        if (unread > 0) {
                            const badge = document.createElement("span");
                            badge.textContent = unread > 9 ? "9+" : String(unread);
                            badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#cf6f98;color:#fff;border-radius:8px;font-size:8px;font-family:'Trebuchet MS',serif;padding:0 3px;min-width:12px;text-align:center;line-height:12px;pointer-events:none;";
                            beepBtn.appendChild(badge);
                        }
                        beepBtn.addEventListener("click", (e) => {
                            e.stopPropagation();
                            this.beepUnread.delete(num);
                            this.openBeepWindow(num);
                            try { this.refreshFriendList(); } catch { /* ignore */ }
                        });
                        btnCol.appendChild(beepBtn);
                    }
                    // Special friend star button
                    const starBtnR = document.createElement("button");
                    const refreshStarBtnR = (): void => {
                        const sp = isSpecialFriend(num);
                        starBtnR.textContent = sp ? "★" : "☆";
                        starBtnR.title = sp ? t("users.removeSpecial") : t("users.markSpecial");
                        starBtnR.style.cssText = `font-size:13px;padding:2px 5px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid ${sp ? "#8a7010" : "var(--ebc-border)"};background:${sp ? "#1e1800" : "var(--ebc-bg-darker)"};color:${sp ? "#ffd700" : "var(--ebc-text-muted)"};transition:color 0.12s,border-color 0.12s,background 0.12s;`;
                    };
                    refreshStarBtnR();
                    starBtnR.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (isSpecialFriend(num)) removeSpecialFriend(num); else addSpecialFriend(num);
                        const sp = isSpecialFriend(num);
                        wrap.style.background = sp ? "linear-gradient(135deg, rgba(255,200,50,0.18) 0%, rgba(180,130,20,0.10) 100%)" : "";
                        wrap.style.borderColor = sp ? "rgba(255,200,50,0.55)" : "";
                        refreshStarBtnR();
                    });
                    btnCol.appendChild(starBtnR);
                    btnCol.appendChild(copyIdBtnR);

                    // Assemble row
                    dot.style.marginTop = "1px";
                    row.appendChild(dot);
                    row.appendChild(infoCol);
                    row.appendChild(btnCol);

                    wrap.appendChild(row);
                    container.appendChild(wrap);
                };

                // Collapsible section header — styled like a section label + arrow
                const roomToggle = document.createElement("div");
                const updateRoomToggle = (): void => {
                    const col = this.roomPeopleCollapsed;
                    roomToggle.style.cssText = "display:flex;align-items:center;gap:5px;padding:4px 4px 5px;cursor:pointer;user-select:none;";
                    roomToggle.innerHTML = "";
                    const arrow = document.createElement("span");
                    arrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c09098;flex-shrink:0;";
                    arrow.textContent = col ? "▶" : "▼";
                    const lbl = document.createElement("span");
                    lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;letter-spacing:0.1em;color:#c09098;text-transform:uppercase;flex:1;";
                    lbl.textContent = t("users.peopleInRoom");
                    const cnt = document.createElement("span");
                    cnt.style.cssText = [
                        "font-family:'Trebuchet MS',serif",
                        "font-size:10px",
                        "font-weight:bold",
                        "color:#e8b4c4",
                        "background:rgba(192,100,130,0.18)",
                        "border:1px solid rgba(192,100,130,0.35)",
                        "border-radius:10px",
                        "padding:0 7px",
                        "line-height:16px",
                        "min-width:18px",
                        "text-align:center",
                        "flex-shrink:0",
                    ].join(";");
                    cnt.textContent = String(roomList.length);
                    roomToggle.appendChild(arrow);
                    roomToggle.appendChild(lbl);
                    roomToggle.appendChild(cnt);
                    roomContainer.style.display = col ? "none" : "block";
                };
                updateRoomToggle();
                roomToggle.addEventListener("click", () => {
                    this.roomPeopleCollapsed = !this.roomPeopleCollapsed;
                    try { localStorage.setItem("EBC_roomPeopleCollapsed", this.roomPeopleCollapsed ? "1" : "0"); } catch { /* ignore */ }
                    updateRoomToggle();
                    if (!this.roomPeopleCollapsed && !roomContainer.firstChild) {
                        for (const c of roomList) buildRoomRow(c, roomContainer);
                    }
                });
                body.appendChild(roomToggle);
                body.appendChild(roomContainer);

                // Populate rows immediately if not collapsed
                if (!this.roomPeopleCollapsed) {
                    for (const c of roomList) buildRoomRow(c, roomContainer);
                }
            }
        }

        if (friendList.length > 0) {
            const divF = document.createElement("div");
            divF.className = "ebc-divider";
            body.appendChild(divF);

            const onlineCount = friendList.filter(n => getFriendStatus(n) !== "away").length;
            const offlineCount = friendList.length - onlineCount;
            const lblF = document.createElement("div");
            lblF.className = "ebc-section-label";
            lblF.style.cssText = "display:flex;align-items:center;gap:6px;";
            const lblFText = document.createElement("span");
            lblFText.textContent = t("users.friends");
            const lblFCount = document.createElement("span");
            lblFCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:normal;flex:1;";
            lblFCount.textContent = `${onlineCount} online · ${friendList.length} total`;

            lblF.appendChild(lblFText);
            lblF.appendChild(lblFCount);

            if (this.beepUnread.size > 0) {
                const markReadBtn = document.createElement("button");
                markReadBtn.textContent = "✓ Mark all read";
                markReadBtn.title = "Dismiss all unread beep notifications";
                markReadBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;padding:1px 6px;border-radius:4px;border:1px solid #3a1928;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;transition:color 0.12s,border-color 0.12s;";
                markReadBtn.addEventListener("mouseenter", () => { markReadBtn.style.color = "#cf6f98"; markReadBtn.style.borderColor = "#cf6f98"; });
                markReadBtn.addEventListener("mouseleave", () => { markReadBtn.style.color = "#7a5a6a"; markReadBtn.style.borderColor = "#3a1928"; });
                markReadBtn.addEventListener("click", () => {
                    this.beepUnread.clear();
                    this.refreshTabDot();
                    try { this.renderFriendRows(body); } catch { /* ignore */ }
                });
                lblF.appendChild(markReadBtn);
            }

            body.appendChild(lblF);

            // Preset tag colours
            const TAG_COLORS = ["#cf6f98", "#e06060", "#e09040", "#c8b840", "#5aaa70", "#40a0b8", "#7060d0", "#a060c0"];

            // Sort: pinned first, then room/online/away, then alphabetical
            const statusOrder = (n: number): number => ({ room: 0, online: 1, away: 2 }[getFriendStatus(n)]);
            const sorted = [...friendList].sort((a, b) => {
                const pa = isFriendPinned(a) ? 0 : 1;
                const pb = isFriendPinned(b) ? 0 : 1;
                if (pa !== pb) return pa - pb;
                const diff = statusOrder(a) - statusOrder(b);
                if (diff !== 0) return diff;
                return resolveName(a).localeCompare(resolveName(b));
            });

            // Split into always-visible (pinned or online/room) and offline
            const activeFriends  = sorted.filter(n => isFriendPinned(n) || getFriendStatus(n) !== "away");
            const offlineFriends = sorted.filter(n => !isFriendPinned(n) && getFriendStatus(n) === "away");

            // Tooltip helpers — use instance-level refs so rebuilds don't orphan tooltips
            const hideTooltip = (): void => {
                this.tagTooltipEl?.remove();
                this.tagTooltipEl = null;
                if (this.tagTooltipMoveListener) {
                    document.removeEventListener("mousemove", this.tagTooltipMoveListener, true);
                    this.tagTooltipMoveListener = null;
                }
            };
            // Clean up any leftover tooltip from a previous render
            hideTooltip();

            // Container for offline friends (shown/hidden by toggle)
            const offlineContainer = document.createElement("div");

            const buildFriendRow = (num: number, container: HTMLElement): void => {
                const status = getFriendStatus(num);
                const name   = resolveName(num);
                const pinned = isFriendPinned(num);

                // Wrapper holds both the row and the expand panel
                const wrap = document.createElement("div");
                wrap.className = "ebc-friend-wrap";
                if (isSpecialFriend(num)) {
                    wrap.style.background = "linear-gradient(135deg, rgba(255,200,50,0.18) 0%, rgba(180,130,20,0.10) 100%)";
                    wrap.style.borderColor = "rgba(255,200,50,0.55)";
                }

                // ── Row ────────────────────────────────────────────────────
                const row = document.createElement("div");
                row.className = "ebc-friend-row" + (pinned ? " pinned" : "");

                const dot = document.createElement("div");
                dot.className = "ebc-friend-dot " + status;

                const pinDot = document.createElement("span");
                pinDot.textContent = "📌";
                pinDot.style.cssText = "font-size:9px;flex-shrink:0;line-height:1;" + (pinned ? "" : "display:none;");

                // Relationship badge (❤️ lover · 🔒 owned by them · 👑 you own them)
                const relBadge = (() => {
                    try {
                        const icons: string[] = [];
                        // They own you — crown = "this person is your owner"
                        const own = (Player as unknown as Record<string, unknown>).Ownership as
                            { MemberNumber?: number } | undefined;
                        if (own?.MemberNumber === num) icons.push("👑");
                        // Lover
                        const loves = (Player as unknown as Record<string, unknown>).Lovership as
                            Array<{ MemberNumber?: number }> | undefined;
                        if (loves?.some(l => l.MemberNumber === num)) icons.push("❤️");
                        // You own them — lock = "you have them locked"
                        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                            Array<{ MemberNumber?: number; Ownership?: { MemberNumber?: number } }> | undefined;
                        const roomChar = room?.find(c => c.MemberNumber === num);
                        if (roomChar?.Ownership?.MemberNumber === Player.MemberNumber) icons.push("🔒");
                        return icons.join("");
                    } catch { return ""; }
                })();

                const nameEl = document.createElement("span");
                nameEl.className = "ebc-friend-name";
                nameEl.textContent = name;
                const vipFriend = VIP_MEMBERS[num];
                if (vipFriend) applyGradientText(nameEl, vipFriend.gradient[0], vipFriend.gradient[1]);

                const numEl = document.createElement("span");
                numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a9ab8;flex-shrink:0;";
                numEl.textContent = "#" + num;

                // Room info tag (built here, appended to metaRow below)
                const info = status !== "away" ? getFriendOnlineInfo(num) : undefined;
                let roomTagEl: HTMLSpanElement | null = null;
                if (info) {
                    const isPrivate = info.roomPrivate;
                    const isLocked  = info.roomLocked;
                    const isFull    = info.roomFull;
                    const roomName  = info.roomName;
                    const icon = isLocked ? "🔐" : isPrivate ? "🔒" : "📢";
                    let bg = "#1e0d1a", color = "#9a6878", border = "#3a1928";
                    if (isLocked)       { bg = "#1a100d"; color = "#c8905a"; border = "#5a3020"; }
                    else if (isPrivate) { bg = "#1a0d20"; color = "#b07ab8"; border = "#4a2060"; }
                    else if (roomName)  { bg = "#0d1a18"; color = "#60a898"; border = "#1e4038"; }
                    const label = roomName
                        ? (isFull ? "full · " : "") + roomName
                        : isLocked ? "locked room" : isPrivate ? "private room" : "online";
                    roomTagEl = document.createElement("span");
                    roomTagEl.textContent = icon + " " + label;
                    roomTagEl.title = roomName
                        ? roomName + (isPrivate ? " (private)" : " (public)") + (isFull ? " · full" : "")
                        : isLocked ? "In a locked room" : isPrivate ? "In a private room" : "Online";
                    roomTagEl.style.cssText = `font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 4px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;background:${bg};color:${color};border:1px solid ${border};`;
                }

                // Last-seen timestamp for away/offline friends
                let lsEl: HTMLSpanElement | null = null;
                if (status === "away") {
                    const lsTs = getLastSeen(num);
                    if (lsTs !== null) {
                        lsEl = document.createElement("span");
                        lsEl.textContent = formatLastSeen(lsTs);
                        lsEl.title = `Last seen: ${new Date(lsTs).toLocaleString()}`;
                        lsEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#a06878;flex-shrink:0;";
                    }
                }

                // EBC badge
                const ebcVer = (() => {
                    try {
                        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                            Array<{ MemberNumber?: number; OnlineSharedSettings?: Record<string, unknown> }> | undefined;
                        const char = room?.find(c => c.MemberNumber === num);
                        if (char?.OnlineSharedSettings) {
                            const sh = char.OnlineSharedSettings["EBC"];
                            if (sh && typeof sh === "object") {
                                const p = (sh as Record<string, unknown>).presence;
                                if (p && typeof p === "object") {
                                    const v = (p as Record<string, unknown>).version;
                                    const m = (p as Record<string, unknown>).marker;
                                    if (m === "EBC" && typeof v === "string") { cacheEBCVersion(num, v); return v; }
                                }
                            }
                        }
                    } catch { /* ignore */ }
                    return getEBCVersion(num);
                })();
                let ebcBadge: HTMLSpanElement | null = null;
                if (ebcVer) {
                    ebcBadge = document.createElement("span");
                    ebcBadge.textContent = "EBC " + ebcVer;
                    ebcBadge.title = "Uses EmeryBC v" + ebcVer;
                    ebcBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap;background:var(--ebc-bg-darker);color:var(--ebc-accent);border:1px solid var(--ebc-border);";
                }

                // ── Tag display area (first tag + "+N more", hover = tooltip) ──
                const tagArea = document.createElement("span");
                tagArea.style.cssText = "display:inline-flex;align-items:center;gap:3px;flex-shrink:0;";

                const renderTagArea = (): void => {
                    tagArea.innerHTML = "";
                    const tl = getFriendTagList(num);
                    if (!tl.length) return;
                    // First tag pill — locked tags get a bold gold crown style
                    const first = tl[0];
                    const pill = document.createElement("span");
                    pill.className = "ebc-friend-tag";
                    pill.textContent = first.text;
                    if (first.locked) {
                        pill.style.cssText = `background:#3a2e00;color:#FFD700;border:1px solid #FFD700;font-weight:700;letter-spacing:0.03em;text-shadow:0 0 6px #FFD70088;`;
                    } else {
                        pill.style.cssText = `background:${first.color}22;color:${first.color};border:1px solid ${first.color}55;`;
                    }
                    tagArea.appendChild(pill);
                    // "+N more" indicator
                    if (tl.length > 1) {
                        const more = document.createElement("span");
                        more.className = "ebc-friend-tag-more";
                        more.textContent = "+" + (tl.length - 1);
                        tagArea.appendChild(more);
                    }
                };
                renderTagArea();

                // Hover tooltip showing all tags
                tagArea.addEventListener("mouseenter", () => {
                    const tl = getFriendTagList(num);
                    if (tl.length < 2) return;
                    hideTooltip();
                    const tt = document.createElement("div");
                    tt.className = "ebc-tag-tooltip";
                    for (const t of tl) {
                        const chip = document.createElement("span");
                        chip.className = "ebc-friend-tag";
                        chip.textContent = t.text;
                        if (t.locked) {
                            chip.style.cssText = `background:#3a2e00;color:#FFD700;border:1px solid #FFD700;font-weight:700;text-shadow:0 0 6px #FFD70088;`;
                        } else {
                            chip.style.cssText = `background:${t.color}22;color:${t.color};border:1px solid ${t.color}55;`;
                        }
                        tt.appendChild(chip);
                    }
                    document.body.appendChild(tt);
                    this.tagTooltipEl = tt;
                    const rect = tagArea.getBoundingClientRect();
                    const ttW = tt.offsetWidth || 160;
                    let left = rect.left;
                    if (left + ttW > window.innerWidth - 8) left = window.innerWidth - ttW - 8;
                    const top = rect.bottom + 4;
                    tt.style.left = `${left}px`;
                    tt.style.top = `${top}px`;

                    // Safety net: hide if the mouse strays away from the tagArea.
                    // Covers cases where mouseleave doesn't fire (list rebuild, scroll, etc.)
                    const moveHandler = (e: MouseEvent): void => {
                        if (!tagArea.isConnected) { hideTooltip(); return; }
                        const r = tagArea.getBoundingClientRect();
                        const pad = 12; // small grace area around the element
                        if (e.clientX < r.left - pad || e.clientX > r.right + pad ||
                            e.clientY < r.top  - pad || e.clientY > r.bottom + pad) {
                            hideTooltip();
                        }
                    };
                    this.tagTooltipMoveListener = moveHandler;
                    document.addEventListener("mousemove", moveHandler, true);
                });
                tagArea.addEventListener("mouseleave", hideTooltip);

                // ── Two-line layout assembly ───────────────────────────────
                // nameRow: nameEl + numEl + relBadge
                const nameRow = document.createElement("div");
                nameRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                // nameEl uses .ebc-friend-name flex:0 1 auto — no override needed
                nameRow.appendChild(nameEl);
                nameRow.appendChild(numEl);
                if (relBadge) {
                    const relBadgeEl = document.createElement("span");
                    relBadgeEl.textContent = relBadge;
                    relBadgeEl.style.cssText = "font-size:10px;flex-shrink:0;line-height:1;";
                    nameRow.appendChild(relBadgeEl);
                }

                // metaRow: roomTag/lsEl + ebcBadge + tagArea
                const metaRow = document.createElement("div");
                metaRow.style.cssText = "display:flex;align-items:center;gap:4px;flex-wrap:wrap;";
                if (roomTagEl) metaRow.appendChild(roomTagEl);
                if (lsEl) metaRow.appendChild(lsEl);
                if (ebcBadge) metaRow.appendChild(ebcBadge);
                if (getFriendTagList(num).length > 0 || getLockedTag(num)) metaRow.appendChild(tagArea);

                // infoCol: nameRow + metaRow
                const infoCol = document.createElement("div");
                infoCol.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
                infoCol.appendChild(nameRow);
                infoCol.appendChild(metaRow);

                // Profile button — opens BC info sheet
                const friendProfBtn = document.createElement("button");
                friendProfBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;"><circle cx="8" cy="5" r="3" fill="#cf6f98"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#cf6f98"/></svg>`;
                friendProfBtn.title = "View profile";
                friendProfBtn.style.cssText = "background:var(--ebc-bg-darker);border:1px solid var(--ebc-border-light);border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;";
                friendProfBtn.addEventListener("mouseenter", () => { friendProfBtn.style.background = "var(--ebc-bg-mid)"; friendProfBtn.style.borderColor = "var(--ebc-accent)"; });
                friendProfBtn.addEventListener("mouseleave", () => { friendProfBtn.style.background = "var(--ebc-bg-darker)"; friendProfBtn.style.borderColor = "var(--ebc-border-light)"; });
                friendProfBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const w2 = window as unknown as Record<string, unknown>;
                    const loadChar   = w2.InformationSheetLoadCharacter as ((c: unknown) => void) | undefined;
                    const hideEls    = w2.ChatRoomHideElements as (() => void) | undefined;
                    const loadOnline = w2.CharacterLoadOnline as ((d: unknown, n: number) => unknown) | undefined;
                    const roomChars  = w2.ChatRoomCharacter as Array<Record<string, unknown>> | undefined;
                    const openProfile = (C: unknown): void => {
                        this.close();
                        if (w2.CurrentScreen === "ChatRoom") {
                            try { hideEls?.(); } catch { /* ignore */ }
                            try {
                                const bgData = (w2.ChatRoomData as Record<string, unknown> | undefined)?.Background;
                                if (bgData) w2.ChatRoomBackground = bgData;
                            } catch { /* ignore */ }
                        }
                        loadChar!(C);
                    };
                    if (!loadChar || !loadOnline) {
                        try { navigator.clipboard.writeText(String(num)); } catch { /* ignore */ }
                        return;
                    }
                    const inRoom = Array.isArray(roomChars) ? roomChars.find(c => c.MemberNumber === num) : undefined;
                    if (inRoom) { try { openProfile(inRoom); return; } catch { /* ignore */ } }
                    const bundle = await getCharacterBundle(num);
                    if (bundle) {
                        try {
                            const C = loadOnline(bundle, num);
                            if (C) { openProfile(C); return; }
                        } catch { /* ignore */ }
                    }
                    try { navigator.clipboard.writeText(String(num)); } catch { /* ignore */ }
                });
                // Beep button — does NOT toggle expand
                const unread = this.beepUnread.get(num) ?? 0;
                const beepBtn = document.createElement("button");
                beepBtn.className = "ebc-friend-btn";
                beepBtn.style.cssText = "position:relative;flex-shrink:0;";
                beepBtn.textContent = "💬";
                beepBtn.title = unread ? `${unread} unread` : "Open beep chat";
                if (unread > 0) {
                    const badge = document.createElement("span");
                    badge.textContent = unread > 9 ? "9+" : String(unread);
                    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#cf6f98;color:#fff;border-radius:8px;font-size:8px;font-family:'Trebuchet MS',serif;padding:0 3px;min-width:12px;text-align:center;line-height:12px;pointer-events:none;";
                    beepBtn.appendChild(badge);
                }
                beepBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.beepUnread.delete(num);
                    this.openBeepWindow(num);
                    try { this.refreshFriendList(); } catch { /* ignore */ }
                });

                // Copy ID button
                const COPY_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block;pointer-events:none;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
                const copyIdBtn = document.createElement("button");
                copyIdBtn.innerHTML = COPY_SVG;
                copyIdBtn.title = `Copy ID: ${num}`;
                copyIdBtn.style.cssText = "color:var(--ebc-accent);background:var(--ebc-bg-darker);border:1px solid var(--ebc-border-light);border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s,color 0.12s;";
                copyIdBtn.addEventListener("mouseenter", () => { copyIdBtn.style.background = "var(--ebc-bg-mid)"; copyIdBtn.style.borderColor = "var(--ebc-accent)"; });
                copyIdBtn.addEventListener("mouseleave", () => { copyIdBtn.style.background = "var(--ebc-bg-darker)"; copyIdBtn.style.borderColor = "var(--ebc-border-light)"; copyIdBtn.style.color = "var(--ebc-accent)"; });
                copyIdBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    try { navigator.clipboard.writeText(String(num)); } catch { /* ignore */ }
                    copyIdBtn.style.color = "#a0d080";
                    copyIdBtn.style.borderColor = "#a0d080";
                    window.setTimeout(() => { copyIdBtn.style.color = "var(--ebc-accent)"; copyIdBtn.style.borderColor = "var(--ebc-border-light)"; }, 1200);
                });

                // btnCol: friendProfBtn + beepBtn + starBtn + copyIdBtn
                const btnCol = document.createElement("div");
                btnCol.style.cssText = "display:flex;align-items:center;gap:3px;flex-shrink:0;align-self:center;";
                btnCol.appendChild(friendProfBtn);
                btnCol.appendChild(beepBtn);

                // Special friend star button
                const starBtn = document.createElement("button");
                const refreshStarBtn = (): void => {
                    const sp = isSpecialFriend(num);
                    starBtn.textContent = sp ? "★" : "☆";
                    starBtn.title = sp ? t("users.removeSpecial") : t("users.markSpecial");
                    starBtn.style.cssText = `font-size:13px;padding:2px 5px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid ${sp ? "#8a7010" : "var(--ebc-border)"};background:${sp ? "#1e1800" : "var(--ebc-bg-darker)"};color:${sp ? "#ffd700" : "var(--ebc-text-muted)"};transition:color 0.12s,border-color 0.12s,background 0.12s;`;
                };
                refreshStarBtn();
                starBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (isSpecialFriend(num)) removeSpecialFriend(num); else addSpecialFriend(num);
                    const sp = isSpecialFriend(num);
                    wrap.style.background = sp ? "linear-gradient(135deg, rgba(255,200,50,0.18) 0%, rgba(180,130,20,0.10) 100%)" : "";
                    wrap.style.borderColor = sp ? "rgba(255,200,50,0.55)" : "";
                    refreshStarBtn();
                });
                btnCol.appendChild(starBtn);
                btnCol.appendChild(copyIdBtn);

                // Assemble row
                dot.style.marginTop = "1px";
                pinDot.style.marginTop = "1px";
                row.appendChild(dot);
                row.appendChild(pinDot);
                row.appendChild(infoCol);
                row.appendChild(btnCol);

                // ── Expand panel (lazy — DOM built on first click) ─────────
                const expand = document.createElement("div");
                expand.className = "ebc-friend-expand";

                let expandBuilt = false;
                let newTagInputRef: HTMLInputElement | null = null;
                let refreshExpandNote: (() => void) | null = null;

                const buildExpandPanel = (): void => {
                    if (expandBuilt) return;
                    expandBuilt = true;

                    // ── Friend info (since + last seen) ───────────────────────
                    const infoBox = document.createElement("div");
                    infoBox.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;background:#0e070d;border:1px solid #2a1020;border-radius:4px;padding:4px 7px;margin-bottom:6px;display:flex;flex-direction:column;gap:2px;";

                    // Read (and auto-stamp) the "friends since" date directly from the
                    // raw store — bypasses all helper functions to rule out any module
                    // bugs. Also calls getFriendSince as a secondary path for consistency.
                    let sinceTs: number | null = null;
                    try {
                        const embc = (Player as unknown as Record<string, unknown>)?.ExtensionSettings as
                            Record<string, unknown> | undefined;
                        if (embc) {
                            if (!embc.EmeryBC || typeof embc.EmeryBC !== "object" || Array.isArray(embc.EmeryBC)) {
                                embc.EmeryBC = {};
                            }
                            const store = embc.EmeryBC as Record<string, unknown>;
                            if (!store.friendSince || typeof store.friendSince !== "object" || Array.isArray(store.friendSince)) {
                                store.friendSince = {};
                            }
                            const fs = store.friendSince as Record<string, number>;
                            const key = String(num);
                            if (typeof fs[key] === "number") {
                                sinceTs = fs[key];
                            } else {
                                // No record — stamp now (this IS a friend if they appear in the list)
                                fs[key] = Date.now();
                                sinceTs = fs[key];
                                syncSettings();
                            }
                        }
                    } catch { /* ignore */ }
                    // Fallback: try the module helper too
                    if (!sinceTs) { try { sinceTs = getFriendSince(num); } catch { /* ignore */ } }

                    const sinceEl = document.createElement("div");
                    if (sinceTs) {
                        const d = new Date(sinceTs);
                        const label = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
                        sinceEl.textContent = t("users.friendsSince", { date: label });
                    } else {
                        sinceEl.textContent = t("users.friendsSinceUnknown");
                    }
                    infoBox.appendChild(sinceEl);

                    const lsTsFull = getLastSeen(num);
                    if (lsTsFull !== null) {
                        const lsFullEl = document.createElement("div");
                        const d2 = new Date(lsTsFull);
                        const label2 = d2.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                            + " " + d2.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                        lsFullEl.textContent = `🕑 Last seen: ${label2} (${formatLastSeen(lsTsFull)})`;
                        infoBox.appendChild(lsFullEl);
                    }

                    // ── Relationship info ──────────────────────────────────────
                    const parseRelStart = (s: string | number | undefined): number | null => {
                        if (s === undefined || s === null) return null;
                        if (typeof s === "number") return s > 0 ? s : null;
                        const t = Date.parse(String(s));
                        return isNaN(t) ? null : t;
                    };
                    const relFmt = (ts: number): string =>
                        new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

                    try {
                        // They own you
                        const own = (Player as unknown as Record<string, unknown>).Ownership as
                            { MemberNumber?: number; Start?: string | number } | undefined;
                        if (own?.MemberNumber === num) {
                            const ownEl = document.createElement("div");
                            ownEl.style.color = "#e8c060";
                            const ts = parseRelStart(own.Start);
                            ownEl.textContent = ts
                                ? `👑 Owned since: ${relFmt(ts)}`
                                : "👑 Owned by them";
                            infoBox.appendChild(ownEl);
                        }
                        // Lovership
                        const loves = (Player as unknown as Record<string, unknown>).Lovership as
                            Array<{ MemberNumber?: number; Start?: string | number }> | undefined;
                        const love = loves?.find(l => l.MemberNumber === num);
                        if (love) {
                            const loveEl = document.createElement("div");
                            loveEl.style.color = "#e87090";
                            const ts = parseRelStart(love.Start);
                            loveEl.textContent = ts
                                ? `❤️ Lovers since: ${relFmt(ts)}`
                                : "❤️ Lovers";
                            infoBox.appendChild(loveEl);
                        }
                        // You own them (room data only — offline skip)
                        const roomChars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                            Array<{ MemberNumber?: number; Ownership?: { MemberNumber?: number; Start?: string | number } }> | undefined;
                        const rc = roomChars?.find(c => c.MemberNumber === num);
                        if (rc?.Ownership?.MemberNumber === Player.MemberNumber) {
                            const ownedByMeEl = document.createElement("div");
                            ownedByMeEl.style.color = "#e8c060";
                            const ts = parseRelStart(rc.Ownership.Start);
                            ownedByMeEl.textContent = ts
                                ? `🔒 Owns them since: ${relFmt(ts)}`
                                : "🔒 You own them";
                            infoBox.appendChild(ownedByMeEl);
                        }
                    } catch { /* ignore */ }

                    expand.appendChild(infoBox);

                    // Tags label
                    const tagsLbl = document.createElement("div");
                    tagsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:1px;";
                    tagsLbl.textContent = t("users.tags");
                    expand.appendChild(tagsLbl);

                    // Chips container
                    const chipsEl = document.createElement("div");
                    chipsEl.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;min-height:6px;";
                    expand.appendChild(chipsEl);

                    const rebuildChips = (): void => {
                        chipsEl.innerHTML = "";
                        const tl = getFriendTagList(num);
                        for (let i = 0; i < tl.length; i++) {
                            const t = tl[i];
                            const chip = document.createElement("span");
                            chip.className = "ebc-etag-chip";
                            if (t.locked) {
                                // Locked tag: gold crown style, no remove button
                                chip.style.cssText = `background:#3a2e00;color:#FFD700;border:1px solid #FFD700;font-weight:700;letter-spacing:0.03em;text-shadow:0 0 6px #FFD70088;`;
                                const txt = document.createElement("span");
                                txt.textContent = t.text;
                                const lockIcon = document.createElement("span");
                                lockIcon.textContent = "🔒";
                                lockIcon.style.cssText = "font-size:8px;opacity:0.7;margin-left:2px;";
                                lockIcon.title = "Permanent tag — cannot be removed";
                                chip.appendChild(txt);
                                chip.appendChild(lockIcon);
                            } else {
                                chip.style.cssText = `background:${t.color}22;color:${t.color};border:1px solid ${t.color}55;`;
                                const dot2 = document.createElement("span");
                                dot2.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${t.color};flex-shrink:0;`;
                                const txt = document.createElement("span");
                                txt.textContent = t.text;
                                const rmBtn = document.createElement("button");
                                rmBtn.className = "ebc-etag-chip-remove";
                                rmBtn.textContent = "✕";
                                rmBtn.style.color = t.color;
                                rmBtn.addEventListener("click", () => {
                                    const updated = getFriendTagList(num).filter((_, j) => j !== i);
                                    setFriendTagList(num, updated);
                                    rebuildChips();
                                    renderTagArea();
                                    if (updated.length > 0) { if (!metaRow.contains(tagArea)) metaRow.appendChild(tagArea); }
                                    else tagArea.remove();
                                });
                                chip.appendChild(dot2);
                                chip.appendChild(txt);
                                chip.appendChild(rmBtn);
                            }
                            chipsEl.appendChild(chip);
                        }
                    };
                    rebuildChips();

                    // Add-tag row
                    const addRow = document.createElement("div");
                    addRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-top:4px;";
                    const newTagInput = document.createElement("input");
                    newTagInputRef = newTagInput;
                    newTagInput.type = "text";
                    newTagInput.maxLength = 30;
                    newTagInput.placeholder = t("users.newTagPlaceholder");
                    newTagInput.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;background:#130810;color:#e8b4c8;border:1px solid #3a1928;border-radius:4px;padding:2px 6px;outline:none;min-width:0;";
                    newTagInput.addEventListener("focus", () => { newTagInput.style.borderColor = "#cf6f98"; });
                    newTagInput.addEventListener("blur",  () => { newTagInput.style.borderColor = "#3a1928"; });

                    const addTagBtn = document.createElement("button");
                    addTagBtn.textContent = t("core.add");
                    addTagBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:4px;border:1px solid #cf6f98;background:#3a1028;color:#cf6f98;cursor:pointer;flex-shrink:0;";

                    addRow.appendChild(newTagInput);
                    addRow.appendChild(addTagBtn);
                    expand.appendChild(addRow);

                    // Color swatches row
                    const swatchRow = document.createElement("div");
                    swatchRow.style.cssText = "display:flex;gap:5px;align-items:center;flex-wrap:wrap;";
                    let selectedColor = TAG_COLORS[0];
                    const swatches: HTMLElement[] = [];
                    for (const c of TAG_COLORS) {
                        const sw = document.createElement("span");
                        sw.className = "ebc-color-swatch" + (c === selectedColor ? " sel" : "");
                        sw.style.background = c;
                        sw.title = c;
                        sw.addEventListener("click", () => {
                            selectedColor = c;
                            swatches.forEach(s => s.classList.remove("sel"));
                            sw.classList.add("sel");
                        });
                        swatches.push(sw);
                        swatchRow.appendChild(sw);
                    }
                    expand.appendChild(swatchRow);

                    const doAddTag = (): void => {
                        const text = newTagInput.value.trim();
                        if (!text) { newTagInput.style.borderColor = "#cf6f98"; return; }
                        const updated: FriendTag[] = [...getFriendTagList(num), { text, color: selectedColor }];
                        setFriendTagList(num, updated);
                        newTagInput.value = "";
                        newTagInput.style.borderColor = "#3a1928";
                        rebuildChips();
                        renderTagArea();
                        if (!metaRow.contains(tagArea)) metaRow.appendChild(tagArea);
                    };
                    addTagBtn.addEventListener("click", doAddTag);
                    newTagInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doAddTag(); } });

                    // Pin button
                    const actRow = document.createElement("div");
                    actRow.style.cssText = "display:flex;gap:5px;margin-top:2px;";
                    const pinBtn = document.createElement("button");
                    const refreshPinBtn = (): void => {
                        const p = isFriendPinned(num);
                        pinBtn.textContent = p ? t("users.unpin") : t("users.pinToTop");
                        pinBtn.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;padding:3px 8px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid ${p ? "#cf6f98" : "#3a1928"};background:${p ? "#3a1028" : "transparent"};color:${p ? "#cf6f98" : "#7a5a6a"};`;
                        row.classList.toggle("pinned", p);
                        pinDot.style.display = p ? "" : "none";
                    };
                    refreshPinBtn();
                    pinBtn.addEventListener("click", () => { togglePinFriend(num); refreshPinBtn(); });
                    actRow.appendChild(pinBtn);
                    expand.appendChild(actRow);

                    // ── Inline note editor ─────────────────────────────────────
                    const noteLbl = document.createElement("div");
                    noteLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-top:6px;margin-bottom:2px;";
                    noteLbl.textContent = t("users.note");
                    expand.appendChild(noteLbl);

                    const noteWrap = document.createElement("div");
                    noteWrap.style.cssText = "position:relative;";

                    const noteTA = document.createElement("textarea");
                    noteTA.className = "ebc-notes-textarea";
                    noteTA.placeholder = t("users.noteHint");
                    noteTA.rows = 3;
                    noteTA.style.cssText += "width:100%;box-sizing:border-box;resize:vertical;";
                    // Load current note value fresh each time the panel is opened
                    const refreshNoteTA = (): void => {
                        try { noteTA.value = getNotes()[String(num)]?.note ?? ""; } catch { /* ignore */ }
                    };
                    refreshExpandNote = refreshNoteTA;
                    refreshNoteTA();

                    const noteHint = document.createElement("div");
                    noteHint.className = "ebc-notes-save-hint";
                    noteHint.textContent = t("users.savedAutomatically");

                    noteWrap.appendChild(noteTA);
                    noteWrap.appendChild(noteHint);
                    expand.appendChild(noteWrap);

                    let noteSaveTimer: ReturnType<typeof window.setTimeout> | null = null;
                    noteTA.addEventListener("input", () => {
                        if (noteSaveTimer) window.clearTimeout(noteSaveTimer);
                        noteHint.textContent = "saving...";
                        noteSaveTimer = window.setTimeout(() => {
                            saveNote(num, name, noteTA.value);
                            noteHint.textContent = noteTA.value.trim() ? t("core.saved") : t("users.savedAutomatically");
                            window.setTimeout(() => { noteHint.textContent = t("users.savedAutomatically"); }, 1500);
                            try { if (this.currentTab === "notes") this.rerender(); } catch { /* ignore */ }
                        }, 800);
                    });
                };

                // Toggle expand on row click — build panel on first open
                row.addEventListener("click", () => {
                    buildExpandPanel();
                    const open = expand.classList.toggle("visible");
                    row.classList.toggle("expanded", open);
                    if (open) {
                        this.expandedFriends.add(num);
                        try { refreshExpandNote?.(); } catch { /* ignore */ }
                        window.setTimeout(() => newTagInputRef?.focus(), 50);
                    } else {
                        this.expandedFriends.delete(num);
                    }
                });

                // Restore open state if this panel was open before a list refresh
                if (this.expandedFriends.has(num)) {
                    buildExpandPanel();
                    expand.classList.add("visible");
                    row.classList.add("expanded");
                }

                wrap.appendChild(row);
                wrap.appendChild(expand);
                container.appendChild(wrap);
            };

            // Always render locked-tag contacts first — even if not in Player.FriendList.
            // Cache their fallback display names so resolveName() always has something to show.
            for (const [num, fallbackName] of getLockedTagMembers()) {
                try { cacheName(num, fallbackName); } catch { /* ignore */ }
                if (!friendList.includes(num)) {
                    buildFriendRow(num, body);
                }
            }

            // Render active friends
            for (const num of activeFriends) buildFriendRow(num, body);

            // Offline toggle header + collapsible section
            if (offlineFriends.length > 0) {
                // Restore persisted collapsed state
                try { this.offlineFriendsCollapsed = localStorage.getItem("EBC_offlineFriendsCollapsed") !== "0"; } catch { /* ignore */ }
                const offlineToggle = document.createElement("div");
                const updateOfflineToggle = (): void => {
                    const col = this.offlineFriendsCollapsed;
                    offlineToggle.style.cssText = "display:flex;align-items:center;gap:5px;padding:4px 4px 2px;cursor:pointer;user-select:none;";
                    offlineToggle.innerHTML = "";
                    const arrow = document.createElement("span");
                    arrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;flex-shrink:0;";
                    arrow.textContent = col ? "▶" : "▼";
                    const lbl = document.createElement("span");
                    lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;flex:1;";
                    lbl.textContent = `Offline (${offlineFriends.length})`;
                    offlineToggle.appendChild(arrow);
                    offlineToggle.appendChild(lbl);
                    offlineContainer.style.display = col ? "none" : "block";
                };
                updateOfflineToggle();
                offlineToggle.addEventListener("click", () => {
                    this.offlineFriendsCollapsed = !this.offlineFriendsCollapsed;
                    try { localStorage.setItem("EBC_offlineFriendsCollapsed", this.offlineFriendsCollapsed ? "1" : "0"); } catch { /* ignore */ }
                    updateOfflineToggle();
                    // Build offline rows lazily on first expand
                    if (!this.offlineFriendsCollapsed && !offlineContainer.firstChild) {
                        for (const num of offlineFriends) buildFriendRow(num, offlineContainer);
                    }
                });
                body.appendChild(offlineToggle);
                body.appendChild(offlineContainer);

                // If already expanded from before, populate immediately
                if (!this.offlineFriendsCollapsed) {
                    for (const num of offlineFriends) buildFriendRow(num, offlineContainer);
                }
            }
        }
    }

    private charDisplayName(char: Character): string {
        const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
        if (typeof nickFn === "function") {
            try { return (nickFn as (c: Character) => string)(char); } catch { /* ignore */ }
        }
        return (char as unknown as Record<string, unknown>).Nickname as string || char.Name || "Unknown";
    }

    private buildNoteRow(memberNumber: number, displayName: string, currentNote: string, isSelf = false): HTMLElement {
        const hasNote = !!currentNote.trim();
        const vip = VIP_MEMBERS[memberNumber];

        const container = document.createElement("div");
        container.className = "ebc-notes-person";
        if (vip) {
            container.style.borderColor = vip.gradient[0];
            container.style.boxShadow = `0 0 6px ${vip.gradient[0]}40`;
        }

        const header = document.createElement("div");
        header.className = "ebc-notes-person-header";

        const dot = document.createElement("div");
        dot.className = "ebc-notes-dot" + (hasNote ? " has-note" : "");

        const name = document.createElement("span");
        name.className = "ebc-notes-person-name";
        name.textContent = displayName;
        if (vip) {
            applyGradientText(name, vip.gradient[0], vip.gradient[1]);
        }

        const num = document.createElement("span");
        num.className = "ebc-notes-member-num";
        num.textContent = "#" + memberNumber;

        header.appendChild(dot);
        header.appendChild(name);
        if (vip) {
            // VIP star badge with tooltip showing their role
            const badge = document.createElement("span");
            badge.textContent = "★";
            badge.title = vip.label;
            badge.style.cssText = `font-size:10px;color:${vip.gradient[0]};flex-shrink:0;margin-right:2px;`;
            header.appendChild(badge);
        }
        header.appendChild(num);
        container.appendChild(header);

        if (isSelf) {
            const selfNote = document.createElement("div");
            selfNote.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c8a84b;padding:2px 4px 4px 18px;";
            selfNote.textContent = t("users.notesOnSelf");
            container.appendChild(selfNote);
            return container;
        }

        const editor = document.createElement("div");
        editor.className = "ebc-notes-editor";

        const textarea = document.createElement("textarea");
        textarea.className = "ebc-notes-textarea";
        textarea.placeholder = t("users.noteHint");
        textarea.value = currentNote;
        textarea.rows = 3;

        const hint = document.createElement("div");
        hint.className = "ebc-notes-save-hint";
        hint.textContent = t("users.savedAutomatically");

        editor.appendChild(textarea);
        editor.appendChild(hint);
        container.appendChild(editor);

        header.addEventListener("click", () => {
            const open = editor.classList.toggle("open");
            if (open) textarea.focus();
        });

        let saveTimer: ReturnType<typeof window.setTimeout> | null = null;
        textarea.addEventListener("input", () => {
            if (saveTimer) window.clearTimeout(saveTimer);
            hint.textContent = "saving...";
            saveTimer = window.setTimeout(() => {
                saveNote(memberNumber, displayName, textarea.value);
                dot.className = "ebc-notes-dot" + (textarea.value.trim() ? " has-note" : "");
                hint.textContent = textarea.value.trim() ? "saved" : "saves automatically";
                window.setTimeout(() => { hint.textContent = "saves automatically"; }, 1500);
            }, 800);
        });

        return container;
    }

    // -- Developer Tools tab ---------------------------------------------------

    private renderDev(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // EBC Tags toggles moved to the permanent strip below safewords (always visible).
        // No longer shown in DEV tab.

        // Helper: collapsible section wrapper
        const makeSection = (
            labelText: string,
            lsKey: string,
            defaultCollapsed: boolean,
            buildContent: (c: HTMLElement) => void,
        ): void => {
            let collapsed = defaultCollapsed;
            try { const v = localStorage.getItem(lsKey); if (v !== null) collapsed = v === "1"; } catch { /* ignore */ }
            const hdr = document.createElement("div");
            hdr.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:3px 0;margin-bottom:2px;";
            const chev = document.createElement("span");
            chev.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;min-width:10px;";
            const lbl = document.createElement("span");
            lbl.className = "ebc-section-label";
            lbl.style.margin = "0";
            lbl.textContent = labelText;
            hdr.appendChild(chev);
            hdr.appendChild(lbl);
            const cnt = document.createElement("div");
            cnt.style.paddingBottom = "6px";
            const updateChev = (): void => { chev.textContent = collapsed ? "▶" : "▼"; };
            updateChev();
            cnt.style.display = collapsed ? "none" : "";
            buildContent(cnt);
            hdr.addEventListener("click", () => {
                collapsed = !collapsed;
                try { localStorage.setItem(lsKey, collapsed ? "1" : "0"); } catch { /* ignore */ }
                updateChev();
                cnt.style.display = collapsed ? "none" : "";
            });
            body.appendChild(hdr);
            body.appendChild(cnt);
            const div = document.createElement("div");
            div.className = "ebc-divider";
            body.appendChild(div);
        };

        // ── Drawer Preferences ────────────────────────────────────────────────
        makeSection(t("dev.drawerPrefs"), "EBC_devAppearanceCollapsed", false, (cnt) => {

            // ── Touch / phone mode toggle (dev preview) ───────────────────────
            const touchRow = document.createElement("div");
            touchRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;margin-bottom:8px;border:1px solid #2a1421;border-radius:5px;background:rgba(20,8,16,0.5);";

            const touchLbl = document.createElement("span");
            touchLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;flex:1;user-select:none;";
            touchLbl.textContent = t("dev.touchMode");

            const touchAutoSpan = document.createElement("span");
            touchAutoSpan.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:" + (isTouchDevice() ? "#80c060" : "#6a4a5e") + ";flex-shrink:0;";
            touchAutoSpan.textContent = isTouchDevice() ? t("dev.touchAutoOn") : t("dev.touchAutoOff");

            const touchForceBtn = document.createElement("button");
            const refreshTouchBtn = (): void => {
                const forced = getForceTouchMode();
                touchForceBtn.textContent = forced ? t("dev.touchForceOn") : t("dev.touchForceOff");
                touchForceBtn.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:9px",
                    "font-weight:bold",
                    "padding:4px 10px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "border:1px solid " + (forced ? "#cf6f98" : "#3a1928"),
                    "background:" + (forced ? "#4a1f30" : "#100508"),
                    "color:" + (forced ? "#f7e6ee" : "#7a5070"),
                    "transition:background 0.14s,color 0.14s,border-color 0.14s",
                ].join(";");
            };
            refreshTouchBtn();
            touchForceBtn.addEventListener("click", () => {
                setForceTouchMode(!getForceTouchMode());
                refreshTouchBtn();
                const panelEl = this.rootEl?.querySelector("#emerybc-panel") as HTMLElement | null;
                if (panelEl) applyTouchMode(panelEl);
            });
            touchRow.appendChild(touchLbl);
            touchRow.appendChild(touchAutoSpan);
            touchRow.appendChild(touchForceBtn);
            cnt.appendChild(touchRow);

            // ── Panel opacity slider ──────────────────────────────────────────
            const opacityRow = document.createElement("div");
            opacityRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;margin-bottom:8px;border:1px solid #2a1421;border-radius:5px;background:rgba(20,8,16,0.5);";

            const opacityLbl = document.createElement("span");
            opacityLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;flex-shrink:0;user-select:none;";
            opacityLbl.textContent = t("dev.panelOpacity");

            const opacitySlider = document.createElement("input");
            opacitySlider.type = "range";
            opacitySlider.min = "0.1";
            opacitySlider.max = "1";
            opacitySlider.step = "0.05";
            opacitySlider.value = String(loadPanelOpacity());
            opacitySlider.style.cssText = "flex:1;accent-color:#cf6f98;cursor:pointer;min-width:0;";
            opacitySlider.title = "100% = fully solid, lower = semi-transparent";

            const opacityVal = document.createElement("span");
            opacityVal.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;min-width:30px;text-align:right;flex-shrink:0;";
            opacityVal.textContent = Math.round(loadPanelOpacity() * 100) + "%";

            opacitySlider.addEventListener("input", () => {
                const v = parseFloat(opacitySlider.value);
                opacityVal.textContent = Math.round(v * 100) + "%";
                savePanelOpacity(v);
                this.applyPanelOpacity(v);
            });

            opacityRow.appendChild(opacityLbl);
            opacityRow.appendChild(opacitySlider);
            opacityRow.appendChild(opacityVal);
            cnt.appendChild(opacityRow);

            // ── Panel zoom slider ─────────────────────────────────────────────
            const zoomRow = document.createElement("div");
            zoomRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;margin-bottom:8px;border:1px solid #2a1421;border-radius:5px;background:rgba(20,8,16,0.5);";

            const zoomLbl = document.createElement("span");
            zoomLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;flex-shrink:0;user-select:none;";
            zoomLbl.textContent = t("dev.textSize");

            const zoomSlider = document.createElement("input");
            zoomSlider.type = "range";
            zoomSlider.min = "0.8";
            zoomSlider.max = "1.4";
            zoomSlider.step = "0.05";
            zoomSlider.value = String(loadPanelZoom());
            zoomSlider.style.cssText = "flex:1;accent-color:#cf6f98;cursor:pointer;min-width:0;";
            zoomSlider.title = "Scale the entire EBC panel — 100% matches default, higher for larger text";

            const zoomVal = document.createElement("span");
            zoomVal.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;min-width:30px;text-align:right;flex-shrink:0;";
            zoomVal.textContent = Math.round(loadPanelZoom() * 100) + "%";

            zoomSlider.addEventListener("input", () => {
                const v = parseFloat(zoomSlider.value);
                zoomVal.textContent = Math.round(v * 100) + "%";
                savePanelZoom(v);
                this.applyPanelZoom(v);
            });

            zoomRow.appendChild(zoomLbl);
            zoomRow.appendChild(zoomSlider);
            zoomRow.appendChild(zoomVal);
            cnt.appendChild(zoomRow);

            // ── Pinned strip tab visibility ───────────────────────────────────
            const stripVisBox = document.createElement("div");
            stripVisBox.style.cssText = "padding:7px 9px 9px;margin-bottom:8px;border:1px solid #2a1421;border-radius:5px;background:rgba(20,8,16,0.5);";

            const stripVisTitle = document.createElement("div");
            stripVisTitle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;color:#c09098;margin-bottom:4px;";
            stripVisTitle.textContent = "Pinned strip visibility";
            stripVisBox.appendChild(stripVisTitle);

            const stripVisDesc = document.createElement("div");
            stripVisDesc.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5070;line-height:1.5;margin-bottom:9px;";
            stripVisDesc.textContent = "Choose which tabs show the Safewords and EBC Tag Settings strips at the top of the panel. Deselect a tab to hide that strip when you're on it.";
            stripVisBox.appendChild(stripVisDesc);

            // Helper: one labeled row of tab chips per pinned strip
            const makeStripRow = (rowLabel: string, storageKey: string): void => {
                const wrap = document.createElement("div");
                wrap.style.cssText = "margin-bottom:8px;";

                const lbl = document.createElement("div");
                lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;letter-spacing:0.05em;color:#9a6878;text-transform:uppercase;margin-bottom:5px;";
                lbl.textContent = rowLabel;
                wrap.appendChild(lbl);

                const chipRow = document.createElement("div");
                chipRow.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;";

                for (const tid of PINNED_STRIP_TABS) {
                    const chip = document.createElement("button");
                    chip.textContent = PINNED_TAB_SHORT[tid] ?? tid;
                    chip.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 11px;border-radius:4px;cursor:pointer;transition:background 0.1s,border-color 0.1s,color 0.1s;";
                    const refreshChip = (): void => {
                        const f = loadStripTabFilter(storageKey);
                        const on = !f || f.has(tid);
                        chip.style.background = on ? "#2e1020" : "#150a10";
                        chip.style.border     = `1px solid ${on ? "#8a3458" : "#321220"}`;
                        chip.style.color      = on ? "#f0c0d8" : "#4a2838";
                    };
                    refreshChip();
                    chip.addEventListener("click", () => {
                        let f = loadStripTabFilter(storageKey);
                        if (!f) {
                            f = new Set(PINNED_STRIP_TABS);
                            f.delete(tid);
                        } else if (f.has(tid)) {
                            if (f.size <= 1) return; // keep at least one
                            f.delete(tid);
                        } else {
                            f.add(tid);
                            if (f.size >= PINNED_STRIP_TABS.length) f = null;
                        }
                        saveStripTabFilter(storageKey, f);
                        chipRow.querySelectorAll<HTMLButtonElement>("button").forEach(b => b.dispatchEvent(new Event("ebc-refresh")));
                        this.updatePinnedStrips();
                    });
                    chip.addEventListener("ebc-refresh", refreshChip);
                    chipRow.appendChild(chip);
                }

                wrap.appendChild(chipRow);
                stripVisBox.appendChild(wrap);
            };

            makeStripRow("Safewords", "EBC_swTabFilter");
            makeStripRow("EBC Tag Settings", "EBC_tagsTabFilter");
            cnt.appendChild(stripVisBox);

            // Working copy of colours — mutated by pickers, written to storage on every change
            let liveColors = getCoreColors();

            // Helper: rebuild all picker values after a preset load / reset
            const pickerSyncers: Array<(c: CoreColors) => void> = [];
            const syncAllPickers = (c: CoreColors): void => { for (const fn of pickerSyncers) fn(c); };

            // ── Preset dropdown ────────────────────────────────────────────────
            const presetRow = document.createElement("div");
            presetRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 8px;background:rgba(42,20,33,0.4);border:1px solid #2a1020;border-radius:6px;";
            const presetLbl = document.createElement("span");
            presetLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#c09098;flex:1;";
            presetLbl.textContent = t("dev.quickPreset");
            const presetSel = document.createElement("select");
            presetSel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;background:#1b0d17;border:1px solid #4c2537;border-radius:4px;color:#f7e6ee;padding:3px 6px;cursor:pointer;outline:none;flex-shrink:0;";
            const blankOpt = document.createElement("option");
            blankOpt.value = ""; blankOpt.textContent = t("dev.choosePreset");
            presetSel.appendChild(blankOpt);
            for (const [key, preset] of Object.entries(EBC_THEME_PRESETS)) {
                const opt = document.createElement("option");
                opt.value = key; opt.textContent = preset.name;
                presetSel.appendChild(opt);
            }
            presetSel.addEventListener("change", () => {
                const preset = EBC_THEME_PRESETS[presetSel.value];
                if (!preset) return;
                liveColors = { ...preset.colors };
                saveCoreColors(liveColors);
                syncAllPickers(liveColors);
                this.injectStyles();
                this.rerender(); // rebuild all rendered elements so inline styles pick up new vars
                presetSel.value = ""; // reset dropdown back to placeholder
            });
            const resetBtn = document.createElement("button");
            resetBtn.textContent = t("dev.resetTheme");
            resetBtn.title = "Reset to default theme";
            resetBtn.style.cssText = "flex-shrink:0;background:transparent;border:1px solid #4c2537;border-radius:4px;color:#7a5a6a;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:9px;padding:5px 9px;";
            resetBtn.addEventListener("click", () => {
                liveColors = { ...DEFAULT_COLORS };
                saveCoreColors(liveColors);
                syncAllPickers(liveColors);
                presetSel.value = "";
                this.injectStyles();
                this.rerender(); // rebuild all rendered elements so inline styles pick up default vars
            });
            presetRow.appendChild(presetLbl);
            presetRow.appendChild(presetSel);
            presetRow.appendChild(resetBtn);
            cnt.appendChild(presetRow);

            // ── Per-colour pickers (grouped) ───────────────────────────────────
            // Three groups of three so it's obvious what each slot does.
            const colorGroups: Array<{
                header: string;
                fields: Array<{ key: keyof CoreColors; label: string; hint: string }>;
            }> = [
                {
                    header: t("theme.groupBg"),
                    fields: [
                        { key: "bg",        label: t("theme.panelBg"),   hint: "Main drawer background — the darkest layer behind everything" },
                        { key: "card",      label: t("theme.cardBg"),    hint: "Section & card backgrounds — the boxes containing content" },
                        { key: "cardMuted", label: t("theme.inputBg"),   hint: "Text fields, dropdowns & recessed surfaces" },
                    ],
                },
                {
                    header: t("theme.groupAccent"),
                    fields: [
                        { key: "accent",    label: t("theme.buttons"),   hint: "Active buttons, tab highlights & selected states" },
                        { key: "border",    label: t("theme.borders"),   hint: "All dividing lines & card outlines" },
                        { key: "gold",      label: t("theme.gold"),      hint: "Special labels, notices & gold-tinted accents" },
                    ],
                },
                {
                    header: t("theme.groupText"),
                    fields: [
                        { key: "textBright", label: t("theme.mainText"),  hint: "Primary readable text — headings & body content" },
                        { key: "textSub",    label: t("theme.labelText"), hint: "Secondary labels & sub-headings" },
                        { key: "textMuted",  label: t("theme.dimText"),   hint: "Placeholders, inactive & muted items" },
                    ],
                },
            ];

            const subLbl = document.createElement("div");
            subLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:5px;";
            subLbl.textContent = t("dev.colourSlots");
            cnt.appendChild(subLbl);

            for (const group of colorGroups) {
                const grpHdr = document.createElement("div");
                grpHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;letter-spacing:0.07em;color:#7a5a6a;margin:8px 0 4px;text-transform:uppercase;";
                grpHdr.textContent = group.header;
                cnt.appendChild(grpHdr);

                const grid = document.createElement("div");
                grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:2px;";

                for (const { key, label, hint } of group.fields) {
                    const cell = document.createElement("div");
                    cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px 5px;background:rgba(42,20,33,0.4);border:1px solid #2a1020;border-radius:5px;";

                    const picker = document.createElement("input");
                    picker.type = "color";
                    picker.value = liveColors[key];
                    picker.title = hint;
                    picker.style.cssText = "width:28px;height:22px;padding:0;border:1px solid #4c2537;border-radius:3px;background:transparent;cursor:pointer;";

                    const lbl = document.createElement("span");
                    lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#c09098;text-align:center;line-height:1.3;";
                    lbl.textContent = label;

                    picker.addEventListener("input", () => {
                        liveColors = { ...liveColors, [key]: picker.value };
                        saveCoreColors(liveColors);
                        this.injectStyles();
                    });

                    // Register a syncer so preset/reset can update this picker's displayed value
                    pickerSyncers.push((c: CoreColors) => { picker.value = c[key]; });

                    cell.appendChild(picker);
                    cell.appendChild(lbl);
                    grid.appendChild(cell);
                }
                cnt.appendChild(grid);
            }

            // ── Tab visibility ─────────────────────────────────────────────────
            const tabVisLbl = document.createElement("div");
            tabVisLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:4px;";
            tabVisLbl.textContent = t("dev.visibleTabs");
            cnt.appendChild(tabVisLbl);
            const tabVisGrid = document.createElement("div");
            tabVisGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;";
            const hiddenTabs = getHiddenTabs();
            for (const tabId of EBC_USER_TABS) {
                if (tabId === "dev") {
                    const chip = document.createElement("button");
                    chip.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;padding:3px 9px;border-radius:4px;border:1px solid #91405f;background:#2a1421;color:#cf6f98;opacity:0.6;cursor:not-allowed;`;
                    chip.textContent = (EBC_TAB_LABELS[tabId] ?? "DEV") + " 🔒";
                    chip.title = t("dev.devTabLocked");
                    chip.disabled = true;
                    tabVisGrid.appendChild(chip);
                    continue;
                }
                const isVisible = !hiddenTabs.includes(tabId);
                const chip = document.createElement("button");
                chip.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;padding:3px 9px;border-radius:4px;cursor:pointer;transition:background 0.12s,color 0.12s,border-color 0.12s;border:1px solid ${isVisible ? "#91405f" : "#3a1928"};background:${isVisible ? "#2a1421" : "transparent"};color:${isVisible ? "#cf6f98" : "#7a5a6a"};`;
                chip.textContent = EBC_TAB_LABELS[tabId] ?? tabId.toUpperCase();
                chip.dataset["tabId"] = tabId;
                chip.addEventListener("click", () => {
                    const cur = getHiddenTabs();
                    const nowHidden = cur.includes(tabId) ? cur.filter(t => t !== tabId) : [...cur, tabId];
                    const visible = EBC_USER_TABS.filter(t => !nowHidden.includes(t));
                    if (visible.length === 0) return;
                    setHiddenTabs(nowHidden);
                    const nowVis = !nowHidden.includes(tabId);
                    chip.style.borderColor = nowVis ? "#91405f" : "#3a1928";
                    chip.style.background  = nowVis ? "#2a1421" : "transparent";
                    chip.style.color       = nowVis ? "#cf6f98" : "#7a5a6a";
                    this.applyTabVisibility();
                });
                tabVisGrid.appendChild(chip);
            }
            cnt.appendChild(tabVisGrid);

            // ── Menu hotkey ────────────────────────────────────────────────────────
            const hotkeyWrap = document.createElement("div");
            hotkeyWrap.style.cssText = "margin-top:8px;padding:8px 10px;border:1px solid #3a1928;border-radius:6px;background:rgba(20,8,16,0.5);";

            const hotkeyTitle = document.createElement("div");
            hotkeyTitle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;color:#cf6f98;margin-bottom:6px;letter-spacing:0.03em;";
            hotkeyTitle.textContent = t("dev.menuHotkey");
            hotkeyWrap.appendChild(hotkeyTitle);

            const hotkeyRow = document.createElement("div");
            hotkeyRow.style.cssText = "display:flex;align-items:center;gap:8px;";

            const hotkeyDisplay = document.createElement("span");
            const refreshHotkeyDisplay = (): void => {
                const k = getMenuHotkey();
                // Convert "KeyF" → "F", "Space" → "Space", etc. for readability
                const pretty = k
                    ? k.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad/, "Num ")
                    : "None";
                hotkeyDisplay.textContent = pretty;
                hotkeyDisplay.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:14px",
                    "font-weight:bold",
                    "padding:4px 14px",
                    "border-radius:5px",
                    "border:1px solid " + (k ? "#cf6f98" : "#3a1928"),
                    "background:" + (k ? "rgba(207,111,152,0.15)" : "#1b0d17"),
                    "color:" + (k ? "#f0a0c0" : "#4c3040"),
                    "min-width:52px",
                    "text-align:center",
                    "flex-shrink:0",
                    "letter-spacing:0.05em",
                ].join(";");
            };
            refreshHotkeyDisplay();

            const BTN = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:5px 14px;border-radius:5px;cursor:pointer;flex-shrink:0;transition:background 0.12s;";
            const setHotkeyBtn = document.createElement("button");
            setHotkeyBtn.textContent = t("dev.setKey");
            setHotkeyBtn.style.cssText = BTN + "border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;";
            setHotkeyBtn.addEventListener("mouseenter", () => { if (!capturingHotkey) setHotkeyBtn.style.background = "#5a1c30"; });
            setHotkeyBtn.addEventListener("mouseleave", () => { if (!capturingHotkey) setHotkeyBtn.style.background = "#3a1020"; });

            const clearHotkeyBtn = document.createElement("button");
            clearHotkeyBtn.textContent = t("dev.clearLog");
            clearHotkeyBtn.style.cssText = BTN + "border:1px solid #3a2530;background:transparent;color:#7a5a6a;";
            clearHotkeyBtn.addEventListener("mouseenter", () => { clearHotkeyBtn.style.background = "rgba(122,90,106,0.15)"; });
            clearHotkeyBtn.addEventListener("mouseleave", () => { clearHotkeyBtn.style.background = "transparent"; });

            let capturingHotkey = false;
            setHotkeyBtn.addEventListener("click", () => {
                if (capturingHotkey) return;
                capturingHotkey = true;
                setHotkeyBtn.textContent = t("dev.pressKey");
                setHotkeyBtn.style.background = "#4a1a2a";
                setHotkeyBtn.style.color = "#ff9ab8";
                setHotkeyBtn.style.borderColor = "#cf6f98";
                const capture = (ev: KeyboardEvent): void => {
                    if (ev.key === "Control" || ev.key === "Shift" || ev.key === "Alt" || ev.key === "Meta") return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (ev.key !== "Escape") setMenuHotkey(ev.code);
                    capturingHotkey = false;
                    setHotkeyBtn.textContent = t("dev.setKey");
                    setHotkeyBtn.style.background = "#3a1020";
                    setHotkeyBtn.style.color = "#cf6f98";
                    setHotkeyBtn.style.borderColor = "#7a3a50";
                    document.removeEventListener("keydown", capture, true);
                    refreshHotkeyDisplay();
                };
                document.addEventListener("keydown", capture, true);
            });
            clearHotkeyBtn.addEventListener("click", () => { setMenuHotkey(""); refreshHotkeyDisplay(); });

            hotkeyRow.appendChild(hotkeyDisplay);
            hotkeyRow.appendChild(setHotkeyBtn);
            hotkeyRow.appendChild(clearHotkeyBtn);
            hotkeyWrap.appendChild(hotkeyRow);

            const hotkeyHint = document.createElement("div");
            hotkeyHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#5a3a4a;margin-top:5px;";
            hotkeyHint.textContent = t("dev.hotkeyHint");
            hotkeyWrap.appendChild(hotkeyHint);
            cnt.appendChild(hotkeyWrap);
        });

        // ── Developer Tools ────────────────────────────────────────────────────
        makeSection(t("dev.developerTools"), "EBC_devToolsCollapsed", true, (cnt) => {
            // Character Inspector
            const charLbl = document.createElement("div");
            charLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;";
            charLbl.textContent = t("dev.characterInspector");
            cnt.appendChild(charLbl);
            const charHint = document.createElement("div");
            charHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:4px;";
            charHint.textContent = t("dev.charInspHint");
            cnt.appendChild(charHint);
            const charPickRow = document.createElement("div");
            charPickRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";
            const charSelect = document.createElement("select");
            charSelect.style.cssText = "flex:1;background:#1b0d17;border:1px solid #4c2537;color:#f7e6ee;border-radius:4px;font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 4px;";
            const charInspBtn = document.createElement("button");
            charInspBtn.className = "ebc-create-btn";
            charInspBtn.style.cssText = "margin:0;padding:2px 10px;font-size:10px;";
            charInspBtn.textContent = t("dev.inspect");
            charPickRow.appendChild(charSelect); charPickRow.appendChild(charInspBtn);
            cnt.appendChild(charPickRow);
            const charDump = document.createElement("pre");
            charDump.style.cssText = [
                "background:#100810", "border:1px solid #3a1928", "border-radius:4px",
                "padding:6px", "font-size:8.5px", "color:#cf6f98",
                "max-height:220px", "overflow-y:auto", "white-space:pre-wrap",
                "word-break:break-all", "margin:0 0 8px", "display:none",
                "font-family:'Courier New',monospace",
            ].join(";");
            cnt.appendChild(charDump);
            const populateCharSelect = (): void => {
                while (charSelect.firstChild) charSelect.removeChild(charSelect.firstChild);
                const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
                for (const c of room) {
                    const opt = document.createElement("option");
                    opt.value = String(c.MemberNumber);
                    opt.textContent = `${(c as unknown as Record<string, unknown>).Nickname as string || c.Name} (#${c.MemberNumber})`;
                    charSelect.appendChild(opt);
                }
            };
            populateCharSelect();
            charInspBtn.addEventListener("click", () => {
                const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
                const num = parseInt(charSelect.value, 10);
                const char = room.find(c => c.MemberNumber === num);
                if (!char) { charDump.textContent = t("dev.charNotInRoom"); charDump.style.display = ""; return; }
                try {
                    const snapshot = {
                        Name: char.Name,
                        Nickname: (char as unknown as Record<string, unknown>).Nickname,
                        MemberNumber: char.MemberNumber,
                        ActivePose: (char as unknown as Record<string, unknown>).ActivePose,
                        Appearance: char.Appearance.map((a: Item) => ({
                            Group: a.Asset.Group.Name, Name: a.Asset.Name, Color: a.Color,
                            Difficulty: (a as unknown as Record<string, unknown>).Difficulty,
                            Property: a.Property, Craft: a.Craft,
                        })),
                    };
                    charDump.textContent = JSON.stringify(snapshot, null, 2);
                    charDump.style.display = "";
                } catch (e) { charDump.textContent = "Error: " + String(e); charDump.style.display = ""; }
            });

            // Addons Loaded
            const hookLbl = document.createElement("div");
            hookLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:8px 0 4px;";
            hookLbl.textContent = t("dev.addonsLoaded");
            cnt.appendChild(hookLbl);
            const hookList = document.createElement("div");
            cnt.appendChild(hookList);
            const renderHooks = (): void => {
                while (hookList.firstChild) hookList.removeChild(hookList.firstChild);
                try {
                    const sdk = (window as unknown as Record<string, unknown>).bcModSdk as Record<string, unknown> | undefined;
                    const getModsInfo = sdk?.getModsInfo as ((...a: unknown[]) => unknown) | undefined;
                    const mods = getModsInfo ? (getModsInfo.call(sdk) as unknown[]) : [];
                    if (!Array.isArray(mods) || mods.length === 0) {
                        const hint = document.createElement("div");
                        hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:4px 2px;";
                        hint.textContent = t("dev.noModsdk");
                        hookList.appendChild(hint); return;
                    }
                    for (const mod of mods) {
                        const m = mod as Record<string, unknown>;
                        const hooks = Array.isArray(m.hooks) ? m.hooks as string[] : [];
                        const row = document.createElement("div");
                        row.style.cssText = "padding:4px 7px;border-radius:5px;margin-bottom:2px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;";
                        const topLine = document.createElement("div");
                        topLine.style.cssText = "display:flex;align-items:center;gap:6px;";
                        const nameEl = document.createElement("span");
                        nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                        nameEl.textContent = String(m.name ?? "?");
                        const verEl = document.createElement("span");
                        verEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;";
                        verEl.textContent = "v" + String(m.version ?? "?");
                        topLine.appendChild(nameEl); topLine.appendChild(verEl);
                        row.appendChild(topLine);
                        if (hooks.length > 0) {
                            const hookDetail = document.createElement("div");
                            hookDetail.style.cssText = "font-family:'Courier New',monospace;font-size:8px;color:#7a5a6a;margin-top:2px;word-break:break-all;";
                            hookDetail.textContent = hooks.join(", ");
                            row.appendChild(hookDetail);
                        }
                        hookList.appendChild(row);
                    }
                } catch (e) {
                    const err = document.createElement("div");
                    err.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#ff6b6b;padding:4px 2px;";
                    err.textContent = "Error reading hooks: " + String(e);
                    hookList.appendChild(err);
                }
            };
            renderHooks();
            const hookRefreshBtn = document.createElement("button");
            hookRefreshBtn.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 0;transition:background 0.14s,color 0.12s;margin-top:3px;";
            hookRefreshBtn.textContent = t("dev.refresh");
            hookRefreshBtn.addEventListener("click", renderHooks);
            cnt.appendChild(hookRefreshBtn);
        });

        // ── Copy Restraints from Room Member (credited members only) ─────────
        if (Player.MemberNumber && VIP_MEMBERS[Player.MemberNumber]) {
        makeSection(t("dev.copyRestraintsFromMember"), "EBC_devCopyRestrCollapsed", true, (cnt) => {
            const hint = document.createElement("div");
            hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:6px;line-height:1.5;";
            hint.textContent = "Export a room member's restraints as a BC outfit code. Choose which items to include, then import via BC's wardrobe.";
            cnt.appendChild(hint);

            // ── Member picker row ──────────────────────────────────────────────
            const pickRow = document.createElement("div");
            pickRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:6px;";

            const memberSelect = document.createElement("select");
            memberSelect.style.cssText = "flex:1;min-width:0;background:#1b0d17;border:1px solid #4c2537;color:#f7e6ee;border-radius:4px;font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 4px;";

            const populateSelect = (): void => {
                while (memberSelect.firstChild) memberSelect.removeChild(memberSelect.firstChild);
                const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
                const others = room.filter(c => c.MemberNumber !== Player.MemberNumber);
                if (others.length === 0) {
                    const opt = document.createElement("option");
                    opt.value = ""; opt.textContent = "No other members in room";
                    memberSelect.appendChild(opt);
                    return;
                }
                for (const c of others) {
                    const opt = document.createElement("option");
                    opt.value = String(c.MemberNumber);
                    const nick = (c as unknown as Record<string, unknown>).Nickname as string | undefined;
                    opt.textContent = `${nick?.trim() || c.Name} (#${c.MemberNumber})`;
                    memberSelect.appendChild(opt);
                }
            };
            populateSelect();

            const mkBtn = (label: string, primary = false): HTMLButtonElement => {
                const b = document.createElement("button");
                b.textContent = label;
                b.style.cssText = primary
                    ? "flex-shrink:0;background:#2a1421;border:1px solid #91405f;border-radius:4px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:3px 10px;transition:background 0.12s,color 0.12s;"
                    : "flex-shrink:0;background:transparent;border:1px solid #4c2537;border-radius:4px;color:#7a5a6a;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 7px;transition:border-color 0.12s,color 0.12s;";
                b.addEventListener("mouseenter", () => {
                    b.style.background = primary ? "#91405f" : "transparent";
                    b.style.borderColor = "#cf6f98"; b.style.color = primary ? "#f7e6ee" : "#cf6f98";
                });
                b.addEventListener("mouseleave", () => {
                    b.style.background = primary ? "#2a1421" : "transparent";
                    b.style.borderColor = primary ? "#91405f" : "#4c2537"; b.style.color = primary ? "#cf6f98" : "#7a5a6a";
                });
                return b;
            };

            const refreshSelBtn = mkBtn("↻");
            refreshSelBtn.title = "Refresh member list";
            refreshSelBtn.addEventListener("click", () => { populateSelect(); clearChecklist(); });

            const loadBtn = mkBtn("Load", true);
            loadBtn.title = "Load this member's restraints";

            pickRow.appendChild(memberSelect);
            pickRow.appendChild(refreshSelBtn);
            pickRow.appendChild(loadBtn);
            cnt.appendChild(pickRow);

            // ── Item checklist (shown after Load) ──────────────────────────────
            const checklistWrap = document.createElement("div");
            checklistWrap.style.cssText = "display:none;flex-direction:column;gap:2px;margin-bottom:6px;";
            cnt.appendChild(checklistWrap);

            const checklistHeader = document.createElement("div");
            checklistHeader.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:4px;";
            const checklistLbl = document.createElement("span");
            checklistLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex:1;";
            const allBtn  = mkBtn("All");
            const noneBtn = mkBtn("None");
            allBtn.style.cssText  += "font-size:9px;padding:1px 6px;";
            noneBtn.style.cssText += "font-size:9px;padding:1px 6px;";
            checklistHeader.appendChild(checklistLbl);
            checklistHeader.appendChild(allBtn);
            checklistHeader.appendChild(noneBtn);
            checklistWrap.appendChild(checklistHeader);

            const checklistItems = document.createElement("div");
            checklistItems.style.cssText = "display:flex;flex-direction:column;gap:2px;max-height:160px;overflow-y:auto;padding-right:2px;";
            checklistWrap.appendChild(checklistItems);

            let loadedItems: Array<{ item: Item; checkbox: HTMLInputElement }> = [];

            const clearChecklist = (): void => {
                checklistItems.innerHTML = "";
                loadedItems = [];
                checklistWrap.style.display = "none";
                codeWrap.style.display = "none";
                codeTA.value = "";
                statusEl.textContent = "";
            };

            allBtn.addEventListener("click",  () => { loadedItems.forEach(e => { e.checkbox.checked = true; }); });
            noneBtn.addEventListener("click", () => { loadedItems.forEach(e => { e.checkbox.checked = false; }); });

            // ── Code output area ───────────────────────────────────────────────
            const codeWrap = document.createElement("div");
            codeWrap.style.cssText = "display:none;flex-direction:column;gap:4px;margin-bottom:4px;";
            cnt.appendChild(codeWrap);

            const codeTA = document.createElement("textarea");
            codeTA.readOnly = true;
            codeTA.rows = 3;
            codeTA.style.cssText = "width:100%;box-sizing:border-box;resize:none;background:#100810;border:1px solid #3a1928;border-radius:4px;color:#cf6f98;font-family:'Courier New',monospace;font-size:8.5px;padding:4px 6px;";

            const codeBtnRow = document.createElement("div");
            codeBtnRow.style.cssText = "display:flex;gap:4px;";
            const genBtn  = mkBtn("Generate Code", true);
            const clipBtn = mkBtn("Copy to Clipboard");
            genBtn.style.cssText  = genBtn.style.cssText.replace("padding:3px 10px", "padding:3px 8px") + "flex:1;";
            clipBtn.style.cssText = clipBtn.style.cssText + "flex:1;";

            codeBtnRow.appendChild(genBtn);
            codeBtnRow.appendChild(clipBtn);
            codeWrap.appendChild(codeBtnRow);
            codeWrap.appendChild(codeTA);

            const statusEl = document.createElement("div");
            statusEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;min-height:14px;";
            cnt.appendChild(statusEl);

            // ── Load handler ───────────────────────────────────────────────────
            loadBtn.addEventListener("click", () => {
                const num = parseInt(memberSelect.value, 10);
                if (isNaN(num)) { statusEl.textContent = "No member selected."; return; }
                const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
                const char = room.find(c => c.MemberNumber === num);
                if (!char) { statusEl.textContent = t("dev.charNotInRoom"); statusEl.style.color = "#ff6b6b"; return; }

                const items = char.Appearance.filter((i: Item) => i.Asset?.Group?.Name && RESTRAINT_GROUPS.has(i.Asset.Group.Name));
                if (items.length === 0) {
                    statusEl.textContent = "This character has no restraints.";
                    statusEl.style.color = "#9a7080";
                    clearChecklist();
                    return;
                }

                clearChecklist();
                const charName = ((char as unknown as Record<string, unknown>).Nickname as string | undefined)?.trim() || char.Name;
                checklistLbl.textContent = `${items.length} restraint(s) from ${charName} — pick what to export:`;

                for (const item of items) {
                    const craft = item.Craft as { Name?: string } | undefined;
                    const craftName = craft?.Name?.trim();
                    const baseName = (item.Asset as unknown as Record<string, unknown>).Description as string || item.Asset.Name;
                    const label = craftName ? `${craftName} (${baseName})` : baseName;
                    const group = item.Asset.Group.Name;

                    const row = document.createElement("label");
                    row.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:3px;background:rgba(42,20,33,0.4);border:1px solid #2a1020;cursor:pointer;";
                    const cb = document.createElement("input");
                    cb.type = "checkbox"; cb.checked = true;
                    cb.style.cssText = "accent-color:#cf6f98;flex-shrink:0;cursor:pointer;";
                    const nameEl = document.createElement("span");
                    nameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                    nameEl.textContent = label;
                    nameEl.title = label;
                    const grpEl = document.createElement("span");
                    grpEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;flex-shrink:0;";
                    grpEl.textContent = group;
                    row.appendChild(cb); row.appendChild(nameEl); row.appendChild(grpEl);
                    checklistItems.appendChild(row);
                    loadedItems.push({ item, checkbox: cb });
                }

                checklistWrap.style.display = "flex";
                codeWrap.style.display = "flex";
                statusEl.textContent = "";
            });

            // ── Generate BC code ───────────────────────────────────────────────
            genBtn.addEventListener("click", () => {
                const selected = loadedItems.filter(e => e.checkbox.checked).map(e => e.item);
                if (selected.length === 0) {
                    statusEl.textContent = "Select at least one item.";
                    statusEl.style.color = "#9a7080";
                    return;
                }
                try {
                    const LZ = (window as unknown as Record<string, unknown>).LZString as
                        { compressToBase64?: (s: string) => string } | undefined;
                    if (!LZ?.compressToBase64) throw new Error("LZString not available.");

                    const bundle = selected.map(item => {
                        const prop = item.Property ? { ...(item.Property as Record<string, unknown>) } : undefined;
                        if (prop) {
                            delete prop["LockedBy"]; delete prop["LockMemberNumber"];
                            delete prop["CombinationNumber"]; delete prop["Password"];
                            delete prop["MemberNumberListKeys"]; delete prop["TimerPasswordPadlock"];
                        }
                        return {
                            Group: item.Asset.Group.Name,
                            Name:  item.Asset.Name,
                            Color: item.Color,
                            Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
                            Property: prop,
                            Craft: item.Craft ?? undefined,
                        };
                    });

                    codeTA.value = LZ.compressToBase64(JSON.stringify(bundle));
                    statusEl.textContent = `✔ Code generated for ${selected.length} item(s). Import via BC wardrobe.`;
                    statusEl.style.color = "#79a885";
                } catch (e) {
                    statusEl.textContent = "Error: " + String(e);
                    statusEl.style.color = "#ff6b6b";
                }
            });

            // ── Copy to clipboard ──────────────────────────────────────────────
            clipBtn.addEventListener("click", () => {
                if (!codeTA.value) { statusEl.textContent = "Generate a code first."; statusEl.style.color = "#9a7080"; return; }
                try {
                    navigator.clipboard.writeText(codeTA.value).then(() => {
                        statusEl.textContent = "✔ Copied to clipboard!";
                        statusEl.style.color = "#79a885";
                    }).catch(() => {
                        codeTA.select(); document.execCommand("copy");
                        statusEl.textContent = "✔ Copied to clipboard!";
                        statusEl.style.color = "#79a885";
                    });
                } catch { codeTA.select(); document.execCommand("copy"); }
            });
        });
        } // end credited-members-only block

        // ── LOG ───────────────────────────────────────────────────────────────
        // Hoisted so the auto-refresh poller can reference them without
        // needing to know whether the inner sections are expanded yet.
        let renderRoom:   () => void = () => { /* populated below */ };
        let renderRlog:   () => void = () => { /* populated below */ };
        let renderMsgLog: () => void = () => { /* populated below */ };


        makeSection(t("dev.logs"), "EBC_devLogSectionCollapsed", true, (cnt) => {
            // -- shared helpers --
            const fmtDuration = (ms: number): string => {
                const s = Math.floor(ms / 1000);
                if (s < 60) return `${s}s`;
                const m = Math.floor(s / 60);
                if (m < 60) return `${m}m`;
                const h = Math.floor(m / 60), rm = m % 60;
                return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
            };
            const fmtTs = (ts: number): string => {
                const d = new Date(ts);
                const t = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                return d.toDateString() === new Date().toDateString() ? t : `${d.getDate()}/${d.getMonth() + 1} ${t}`;
            };

            // ── inner collapsible helper ──────────────────────────────────────
            const makeInner = (
                labelText: string,
                lsKey: string,
                defaultCollapsed: boolean,
                build: (c: HTMLElement) => void,
                extraBtn?: HTMLElement,
            ): void => {
                let col = defaultCollapsed;
                try { const v = localStorage.getItem(lsKey); if (v !== null) col = v === "1"; } catch { /* ignore */ }
                const hdr = document.createElement("div");
                hdr.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:6px 0;margin-bottom:2px;";
                const chev = document.createElement("span");
                chev.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#cf6f98;min-width:8px;";
                const lbl = document.createElement("span");
                lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;flex:1;";
                lbl.textContent = labelText;
                hdr.appendChild(chev); hdr.appendChild(lbl);
                if (extraBtn) hdr.appendChild(extraBtn);
                const inner = document.createElement("div");
                inner.style.marginBottom = "6px";
                const upd = (): void => { chev.textContent = col ? "▶" : "▼"; };
                upd(); inner.style.display = col ? "none" : "";
                build(inner);
                hdr.addEventListener("click", (e) => {
                    if (extraBtn && (e.target === extraBtn || (e.target as HTMLElement)?.closest?.("button") === extraBtn)) return;
                    col = !col;
                    try { localStorage.setItem(lsKey, col ? "1" : "0"); } catch { /* ignore */ }
                    upd(); inner.style.display = col ? "none" : "";
                });
                cnt.appendChild(hdr); cnt.appendChild(inner);
            };

            // ── Whisper Log ───────────────────────────────────────────────────
            makeInner(t("dev.whisperLog"), "EBC_devWhisperLogCollapsed", true, (cnt) => {
                const partners = getWhisperPartners();
                if (partners.length === 0) {
                    const empty = document.createElement("div");
                    empty.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#5a3a4e;padding:8px 4px;text-align:center;";
                    empty.textContent = t("dev.noWhispers");
                    cnt.appendChild(empty);
                    return;
                }

                // Clear button row
                const whClearRow = document.createElement("div");
                whClearRow.style.cssText = "display:flex;align-items:center;justify-content:flex-end;margin-bottom:4px;";
                const whClearBtn = document.createElement("button");
                whClearBtn.className = "ebc-outfit-del";
                whClearBtn.style.cssText = "font-size:9px;padding:2px 7px;border-radius:4px;";
                whClearBtn.textContent = t("dev.clearLog");
                whClearBtn.title = "Clear whisper log";
                whClearBtn.addEventListener("click", () => {
                    this.selectedWhisperPartner = null;
                    clearWhisperLog();
                    this.rerender();
                });
                whClearRow.appendChild(whClearBtn);
                cnt.appendChild(whClearRow);

                // Fall back if selected partner is gone
                if (this.selectedWhisperPartner !== null && !partners.includes(this.selectedWhisperPartner)) {
                    this.selectedWhisperPartner = partners[0];
                }
                const activePartner = this.selectedWhisperPartner ?? partners[0];

                // Partner selector
                const partnerList = document.createElement("div");
                partnerList.style.cssText = "display:flex;flex-direction:column;gap:2px;margin-bottom:8px;";
                for (const num of partners) {
                    const conv = getWhisperConversation(num);
                    const lastName = conv[conv.length - 1]?.partnerName ?? `#${num}`;
                    const btn = document.createElement("button");
                    btn.className = "ebc-whisper-partner-btn" + (num === activePartner ? " active" : "");
                    const nameSpan = document.createElement("span");
                    nameSpan.textContent = lastName;
                    const countSpan = document.createElement("span");
                    countSpan.style.cssText = "font-size:8px;color:#7a5070;flex-shrink:0;";
                    countSpan.textContent = `${conv.length} msg${conv.length !== 1 ? "s" : ""}`;
                    btn.appendChild(nameSpan);
                    btn.appendChild(countSpan);
                    btn.addEventListener("click", () => { this.selectedWhisperPartner = num; this.rerender(); });
                    partnerList.appendChild(btn);
                }
                cnt.appendChild(partnerList);

                // Conversation view
                const activeName = getWhisperConversation(activePartner)[0]?.partnerName ?? `#${activePartner}`;
                const convLbl = document.createElement("div");
                convLbl.className = "ebc-section-label";
                convLbl.textContent = `With ${activeName}`;
                cnt.appendChild(convLbl);

                const myName = (() => {
                    try {
                        const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
                        if (typeof nickFn === "function") return (nickFn as (c: Character) => string)(Player);
                    } catch { /* ignore */ }
                    return (Player as unknown as Record<string, unknown>)?.Nickname as string | undefined
                        ?? Player?.Name ?? "You";
                })();

                for (const entry of getWhisperConversation(activePartner)) {
                    const row = document.createElement("div");
                    row.className = "ebc-whisper-msg " + entry.direction;
                    const meta = document.createElement("div");
                    meta.className = "ebc-whisper-meta";
                    const time = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    meta.textContent = entry.direction === "out"
                        ? `${myName} → ${entry.partnerName}  ${time}`
                        : `${entry.partnerName} → ${myName}  ${time}`;
                    const text = document.createElement("div");
                    text.className = "ebc-whisper-text";
                    text.textContent = entry.message;
                    row.appendChild(meta);
                    row.appendChild(text);
                    cnt.appendChild(row);
                }
                window.setTimeout(() => { cnt.scrollTop = cnt.scrollHeight; }, 0);
            });

            // ── Current Room ──────────────────────────────────────────────────
            // Always live — no toggle needed. Shows who is in the current room
            // and who has joined since you arrived.
            makeInner("Current Room", "EBC_currentRoomCollapsed", true, (c) => {
                renderRoom = (): void => {
                    detectNewJoins();
                    while (c.firstChild) c.removeChild(c.firstChild);
                    const visit = getCurrentVisit();
                    if (!visit) {
                        const hint = document.createElement("div"); hint.className = "ebc-empty";
                        hint.textContent = "Not currently in a room."; c.appendChild(hint); return;
                    }

                    // Room name + space tag
                    const nameRow = document.createElement("div");
                    nameRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:2px;";
                    const nameEl = document.createElement("span");
                    nameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:12px;color:#ffe8f5;font-weight:bold;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                    nameEl.textContent = visit.name; nameRow.appendChild(nameEl);
                    if (visit.space) {
                        const sp = document.createElement("span");
                        sp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;flex-shrink:0;font-weight:bold;";
                        sp.textContent = visit.space; nameRow.appendChild(sp);
                    }
                    c.appendChild(nameRow);
                    const timeEl = document.createElement("div");
                    timeEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#b899a8;margin-bottom:8px;";
                    timeEl.textContent = `Entered ${fmtTs(visit.enteredAt)}`;
                    c.appendChild(timeEl);

                    // Members on entry
                    if (visit.members.length > 0) {
                        const mLbl = document.createElement("div");
                        mLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#e890b8;font-weight:bold;margin-bottom:4px;";
                        mLbl.textContent = `On entry (${visit.members.length})`; c.appendChild(mLbl);
                        for (const m of visit.members) {
                            const mr = document.createElement("div");
                            mr.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #2a1421;";
                            const mn = document.createElement("span");
                            mn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f0d8ec;flex:1;";
                            mn.textContent = m.name;
                            const mid = document.createElement("span");
                            mid.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7090;flex-shrink:0;";
                            mid.textContent = `#${m.memberNumber}`;
                            mr.appendChild(mn); mr.appendChild(mid); c.appendChild(mr);
                        }
                        const spacer = document.createElement("div"); spacer.style.height = "8px"; c.appendChild(spacer);
                    }

                    // People who joined after
                    const jLbl = document.createElement("div");
                    jLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#e890b8;font-weight:bold;margin-bottom:4px;";
                    jLbl.textContent = `Joined after you (${visit.joins.length})`; c.appendChild(jLbl);
                    if (visit.joins.length === 0) {
                        const none = document.createElement("div");
                        none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;font-style:italic;";
                        none.textContent = "Nobody yet."; c.appendChild(none);
                    } else {
                        for (const j of visit.joins) {
                            const row = document.createElement("div");
                            row.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #2a1421;";
                            const jn = document.createElement("span");
                            jn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f0d8ec;flex:1;";
                            jn.textContent = j.name;
                            const jid = document.createElement("span");
                            jid.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7090;";
                            jid.textContent = `#${j.memberNumber}`;
                            const jt = document.createElement("span");
                            jt.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#b899a8;flex-shrink:0;";
                            jt.textContent = fmtTs(j.at);
                            row.appendChild(jn); row.appendChild(jid); row.appendChild(jt); c.appendChild(row);
                        }
                    }
                };
                renderRoom();
            });

            // ── Rooms Visited ─────────────────────────────────────────────────
            // Opt-in persistent history of past rooms.
            const roomClearBtn = document.createElement("button");
            roomClearBtn.textContent = t("dev.clearLog");
            roomClearBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #3a1928;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;";
            roomClearBtn.addEventListener("mouseenter", () => { roomClearBtn.style.color = "#cf6f98"; roomClearBtn.style.borderColor = "#cf6f98"; });
            roomClearBtn.addEventListener("mouseleave", () => { roomClearBtn.style.color = "#7a5a6a"; roomClearBtn.style.borderColor = "#3a1928"; });

            makeInner("Rooms Visited", "EBC_roomHistoryCollapsed", true, (c) => {
                // Enable / disable toggle row
                const rhToggleRow = document.createElement("div");
                rhToggleRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
                const rhToggleLbl = document.createElement("span");
                rhToggleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex:1;";
                rhToggleLbl.textContent = "Save room visits";
                const rhToggleBtn = document.createElement("button");
                const refreshRhToggle = (): void => {
                    const on = getRoomHistoryEnabled();
                    rhToggleBtn.textContent = on ? t("core.on") : t("core.off");
                    rhToggleBtn.style.cssText = [
                        "font-family:'Trebuchet MS',serif","font-size:9px","font-weight:bold",
                        "padding:2px 8px","border-radius:4px","cursor:pointer","flex-shrink:0",
                        on ? "border:1px solid #cf6f98;background:#3a1020;color:#f7cce0;" : "border:1px solid #4c2537;background:transparent;color:#7a5a6a;",
                    ].join(";");
                };
                refreshRhToggle();
                rhToggleBtn.addEventListener("click", () => {
                    setRoomHistoryEnabled(!getRoomHistoryEnabled());
                    refreshRhToggle(); renderRoomsVisited();
                });
                rhToggleRow.appendChild(rhToggleLbl); rhToggleRow.appendChild(rhToggleBtn);
                c.appendChild(rhToggleRow);

                const renderRoomsVisited = (): void => {
                    while (rhToggleRow.nextSibling) c.removeChild(rhToggleRow.nextSibling);
                    if (!getRoomHistoryEnabled()) {
                        const hint = document.createElement("div"); hint.className = "ebc-empty";
                        hint.textContent = "Recording is off — enable above to save visited rooms."; c.appendChild(hint); return;
                    }
                    const visits = getVisitedHistory();
                    if (visits.length === 0) {
                        const e = document.createElement("div"); e.className = "ebc-empty";
                        e.textContent = "No rooms saved yet. Rooms are saved when you leave them."; c.appendChild(e); return;
                    }
                    for (const visit of visits) {
                        const card = document.createElement("div");
                        card.style.cssText = "background:rgba(25,10,20,0.85);border:1px solid #3a1928;border-radius:6px;padding:7px 9px;margin-bottom:6px;";
                        const hRow = document.createElement("div");
                        hRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:2px;";
                        const nameEl = document.createElement("span");
                        nameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:12px;color:#ffe8f5;font-weight:bold;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                        nameEl.textContent = visit.name; hRow.appendChild(nameEl);
                        if (visit.space) {
                            const sp = document.createElement("span");
                            sp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;flex-shrink:0;font-weight:bold;";
                            sp.textContent = visit.space; hRow.appendChild(sp);
                        }
                        card.appendChild(hRow);
                        const timeRow = document.createElement("div");
                        timeRow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#b899a8;margin-bottom:4px;";
                        timeRow.textContent = `${fmtTs(visit.enteredAt)}  ·  ${visit.leftAt ? fmtDuration(visit.leftAt - visit.enteredAt) : "in progress"}`;
                        card.appendChild(timeRow);
                        const summary = document.createElement("div");
                        summary.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;cursor:pointer;user-select:none;";
                        const detail = document.createElement("div");
                        detail.style.display = "none"; detail.style.marginTop = "6px";
                        let expanded = false;
                        const updateSum = (): void => {
                            summary.textContent = `${visit.members.length} on entry · ${visit.joins.length} joined  ${expanded ? "▲" : "▼"}`;
                        };
                        updateSum();
                        summary.addEventListener("click", () => {
                            expanded = !expanded;
                            detail.style.display = expanded ? "block" : "none";
                            if (expanded) {
                                while (detail.firstChild) detail.removeChild(detail.firstChild);
                                if (visit.members.length > 0) {
                                    const mh = document.createElement("div");
                                    mh.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#e890b8;font-weight:bold;margin-bottom:3px;";
                                    mh.textContent = "On entry:"; detail.appendChild(mh);
                                    for (const m of visit.members) {
                                        const mr = document.createElement("div");
                                        mr.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #2a1421;";
                                        const mn = document.createElement("span");
                                        mn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f0d8ec;flex:1;";
                                        mn.textContent = m.name;
                                        const mid = document.createElement("span");
                                        mid.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7090;flex-shrink:0;";
                                        mid.textContent = `#${m.memberNumber}`;
                                        mr.appendChild(mn); mr.appendChild(mid); detail.appendChild(mr);
                                    }
                                }
                                if (visit.joins.length > 0) {
                                    const jh = document.createElement("div");
                                    jh.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#e890b8;font-weight:bold;margin-top:6px;margin-bottom:3px;";
                                    jh.textContent = "Joined after:"; detail.appendChild(jh);
                                    for (const j of visit.joins) {
                                        const jr = document.createElement("div");
                                        jr.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #2a1421;";
                                        const jn = document.createElement("span");
                                        jn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f0d8ec;flex:1;";
                                        jn.textContent = j.name;
                                        const jid = document.createElement("span");
                                        jid.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7090;";
                                        jid.textContent = `#${j.memberNumber}`;
                                        const jt = document.createElement("span");
                                        jt.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#b899a8;flex-shrink:0;";
                                        jt.textContent = fmtTs(j.at);
                                        jr.appendChild(jn); jr.appendChild(jid); jr.appendChild(jt); detail.appendChild(jr);
                                    }
                                }
                            }
                            updateSum();
                        });
                        card.appendChild(summary); card.appendChild(detail);
                        c.appendChild(card);
                    }
                };
                roomClearBtn.addEventListener("click", () => { showConfirmOverlay("Clear the entire room visit history? This cannot be undone.", "Cancel", "Clear", () => { clearRoomHistory(); renderRoomsVisited(); }); });
                renderRoomsVisited();
            }, roomClearBtn);

            // ── Restraint Log ─────────────────────────────────────────────────
            const rlogClearBtn = document.createElement("button");
            rlogClearBtn.textContent = t("dev.clearLog");
            rlogClearBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #3a1928;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;";
            rlogClearBtn.addEventListener("mouseenter", () => { rlogClearBtn.style.color = "#cf6f98"; rlogClearBtn.style.borderColor = "#cf6f98"; });
            rlogClearBtn.addEventListener("mouseleave", () => { rlogClearBtn.style.color = "#7a5a6a"; rlogClearBtn.style.borderColor = "#3a1928"; });

            makeInner("Restraint Log", "EBC_restraintLogCollapsed", true, (c) => {
                // Enable / disable toggle row
                const rlToggleRow = document.createElement("div");
                rlToggleRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
                const rlToggleLbl = document.createElement("span");
                rlToggleLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex:1;";
                rlToggleLbl.textContent = "Record restraint changes";
                const rlToggleBtn = document.createElement("button");
                const refreshRlToggle = (): void => {
                    const on = getRestraintLogEnabled();
                    rlToggleBtn.textContent = on ? t("core.on") : t("core.off");
                    rlToggleBtn.style.cssText = [
                        "font-family:'Trebuchet MS',serif","font-size:9px","font-weight:bold",
                        "padding:2px 8px","border-radius:4px","cursor:pointer","flex-shrink:0",
                        on ? "border:1px solid #cf6f98;background:#3a1020;color:#f7cce0;" : "border:1px solid #4c2537;background:transparent;color:#7a5a6a;",
                    ].join(";");
                };
                refreshRlToggle();
                rlToggleBtn.addEventListener("click", () => { setRestraintLogEnabled(!getRestraintLogEnabled()); refreshRlToggle(); renderRlog(); });
                rlToggleRow.appendChild(rlToggleLbl); rlToggleRow.appendChild(rlToggleBtn);
                c.appendChild(rlToggleRow);

                renderRlog = (): void => {
                    while (rlToggleRow.nextSibling) c.removeChild(rlToggleRow.nextSibling);
                    if (!getRestraintLogEnabled()) {
                        const hint = document.createElement("div"); hint.className = "ebc-empty";
                        hint.textContent = "Recording is off — enable above to start logging."; c.appendChild(hint); return;
                    }
                    const entries = getRestraintLog();
                    if (entries.length === 0) {
                        const e = document.createElement("div"); e.className = "ebc-empty";
                        e.textContent = "No restraints recorded yet."; c.appendChild(e); return;
                    }
                    for (const entry of entries) {
                        const card = document.createElement("div");
                        card.style.cssText = "padding:5px 4px 4px;border-bottom:1px solid #2a1421;";

                        // ── Top row: name + craft + group + duration ──────────
                        const topRow = document.createElement("div");
                        topRow.style.cssText = "display:flex;align-items:baseline;gap:5px;margin-bottom:2px;";

                        const nameEl = document.createElement("span");
                        nameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f0d8ec;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                        nameEl.textContent = entry.itemName;

                        const groupEl = document.createElement("span");
                        groupEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex-shrink:0;white-space:nowrap;";
                        groupEl.textContent = entry.group;

                        const durEl = document.createElement("span");
                        durEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;flex-shrink:0;white-space:nowrap;";
                        if (entry.removedAt !== null) {
                            durEl.textContent = fmtDuration(entry.removedAt - entry.appliedAt);
                            durEl.style.color = "#9a7090";
                            durEl.title = `Removed: ${new Date(entry.removedAt).toLocaleString()}`;
                        } else {
                            durEl.textContent = "on now"; durEl.style.color = "#79a885"; durEl.title = "Still wearing";
                        }

                        topRow.appendChild(nameEl);
                        topRow.appendChild(groupEl);
                        topRow.appendChild(durEl);
                        card.appendChild(topRow);

                        // Craft name subtitle (if present)
                        if (entry.craftName) {
                            const craftEl = document.createElement("div");
                            craftEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c9ab72;font-style:italic;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                            craftEl.textContent = `"${entry.craftName}"`;
                            craftEl.title = `Craft name: ${entry.craftName}`;
                            card.appendChild(craftEl);
                        }

                        // ── Bottom row: colors + lock + applier ───────────────
                        const btmRow = document.createElement("div");
                        btmRow.style.cssText = "display:flex;align-items:center;gap:5px;";

                        // Color swatches
                        const rawColors = entry.colors;
                        const colorArr: string[] = rawColors == null ? []
                            : Array.isArray(rawColors) ? rawColors
                            : [rawColors];
                        const validColors = colorArr.filter(c => typeof c === "string" && c.startsWith("#")).slice(0, 8);
                        if (validColors.length > 0) {
                            const swatchRow = document.createElement("span");
                            swatchRow.style.cssText = "display:flex;align-items:center;gap:2px;flex-shrink:0;";
                            for (const col of validColors) {
                                const dot = document.createElement("span");
                                dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};border:1px solid #3a1928;flex-shrink:0;`;
                                dot.title = col;
                                swatchRow.appendChild(dot);
                            }
                            swatchRow.title = `Colors: ${validColors.join(", ")}`;
                            btmRow.appendChild(swatchRow);

                        }

                        // Lock badge
                        if (entry.lockType !== null) {
                            const lockEl = document.createElement("span");
                            lockEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#2a1020;border:1px solid #5a2040;color:#e890b8;padding:0 4px;border-radius:3px;flex-shrink:0;white-space:nowrap;";
                            const lockerLabel = entry.lockedByName ?? (entry.lockedByNumber != null ? `#${entry.lockedByNumber}` : null);
                            lockEl.textContent = lockerLabel
                                ? `🔒 ${entry.lockType} · ${lockerLabel}`
                                : `🔒 ${entry.lockType}`;
                            lockEl.title = lockerLabel
                                ? `Lock: ${entry.lockType}  ·  Locked by: ${lockerLabel}`
                                : `Lock: ${entry.lockType}`;
                            btmRow.appendChild(lockEl);
                        }

                        // Spacer
                        const spacer = document.createElement("span");
                        spacer.style.flex = "1";
                        btmRow.appendChild(spacer);

                        // Applier
                        const applierWrap = document.createElement("span");
                        applierWrap.style.cssText = "display:flex;align-items:center;gap:3px;flex-shrink:0;";
                        const applierEl = document.createElement("span");
                        applierEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#e890b8;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                        applierEl.textContent = entry.applier;
                        applierWrap.appendChild(applierEl);
                        if (entry.applierNumber != null) {
                            const numEl = document.createElement("span");
                            numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7090;white-space:nowrap;";
                            numEl.textContent = `#${entry.applierNumber}`;
                            applierWrap.appendChild(numEl);
                        }
                        applierWrap.title = `Applied by: ${entry.applier}${entry.applierNumber != null ? ` #${entry.applierNumber}` : ""}  ·  ${new Date(entry.appliedAt).toLocaleString()}`;
                        btmRow.appendChild(applierWrap);

                        card.appendChild(btmRow);
                        c.appendChild(card);
                    }
                };
                rlogClearBtn.addEventListener("click", () => { showConfirmOverlay("Clear the entire restraint log? This cannot be undone.", "Cancel", "Clear", () => { clearRestraintLog(); renderRlog(); }); });
                renderRlog();
            }, rlogClearBtn);

            // ── Message Log ───────────────────────────────────────────────────
            makeInner("Message Log", "EBC_msgLogCollapsed", true, (c) => {
                const logStatusDot = document.createElement("span");
                logStatusDot.style.cssText = "font-size:9px;font-family:'Trebuchet MS',serif;padding:1px 6px;border-radius:3px;flex-shrink:0;margin-bottom:4px;display:inline-block;";
                const updateStatusDot = (): void => {
                    if (isDevLogEnabled()) {
                        logStatusDot.textContent = "● CAPTURING";
                        logStatusDot.style.background = "#1a3a1a"; logStatusDot.style.color = "#6bd478"; logStatusDot.style.border = "1px solid #2a6a2a";
                    } else {
                        logStatusDot.textContent = "○ OFF";
                        logStatusDot.style.background = "#1a0a10"; logStatusDot.style.color = "#7a4050"; logStatusDot.style.border = "1px solid #3a1020";
                    }
                };
                updateStatusDot();
                c.appendChild(logStatusDot);

                const msgCtrlRow = document.createElement("div");
                msgCtrlRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;align-items:center;";
                const msgRefreshBtn2 = document.createElement("button");
                msgRefreshBtn2.className = "ebc-icon-btn";
                msgRefreshBtn2.style.cssText = "font-size:10px;padding:2px 8px;";
                msgRefreshBtn2.textContent = "↻"; msgRefreshBtn2.title = "Refresh log";
                const msgClearBtn = document.createElement("button");
                msgClearBtn.className = "ebc-icon-btn";
                msgClearBtn.style.cssText = "font-size:11px;padding:5px 10px;";
                msgClearBtn.textContent = t("dev.clearLog");
                const logToggleWrap = document.createElement("label");
                logToggleWrap.style.cssText = "display:flex;align-items:center;gap:4px;font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;cursor:pointer;margin-left:auto;user-select:none;";
                const logToggleChk = document.createElement("input");
                logToggleChk.type = "checkbox"; logToggleChk.checked = isDevLogEnabled();
                const msgTestBtn = document.createElement("button");
                msgTestBtn.className = "ebc-icon-btn";
                msgTestBtn.style.cssText = "font-size:10px;padding:2px 8px;";
                msgTestBtn.textContent = "Test"; msgTestBtn.title = "Inject a test entry";
                msgTestBtn.addEventListener("click", () => { pushTestEntry(); renderMsgLog(); });
                logToggleWrap.appendChild(logToggleChk);
                logToggleWrap.appendChild(document.createTextNode(" Live logging"));
                msgCtrlRow.appendChild(msgRefreshBtn2); msgCtrlRow.appendChild(msgClearBtn);
                msgCtrlRow.appendChild(msgTestBtn); msgCtrlRow.appendChild(logToggleWrap);
                c.appendChild(msgCtrlRow);

                const logOffHint = document.createElement("div");
                logOffHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;display:flex;align-items:center;gap:8px;margin-bottom:4px;";
                logOffHint.style.display = isDevLogEnabled() ? "none" : "flex";
                const logOffText = document.createElement("span"); logOffText.textContent = "Logging is off."; logOffText.style.flex = "1";
                logOffHint.appendChild(logOffText);
                const enableBtn = document.createElement("button");
                enableBtn.textContent = t("core.enable");
                enableBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 8px;border-radius:4px;border:1px solid #4c2537;background:transparent;color:#9a7080;cursor:pointer;flex-shrink:0;transition:color 0.12s,border-color 0.12s;";
                enableBtn.addEventListener("mouseenter", () => { enableBtn.style.color = "#cf6f98"; enableBtn.style.borderColor = "#cf6f98"; });
                enableBtn.addEventListener("mouseleave", () => { enableBtn.style.color = "#9a7080"; enableBtn.style.borderColor = "#4c2537"; });
                enableBtn.addEventListener("click", () => {
                    setDevLogEnabled(true); logToggleChk.checked = true;
                    logOffHint.style.display = "none"; updateStatusDot(); renderMsgLog();
                });
                logOffHint.appendChild(enableBtn); c.appendChild(logOffHint);

                const msgLogEl = document.createElement("div");
                msgLogEl.style.cssText = "background:#100810;border:1px solid #3a1928;border-radius:4px;max-height:260px;overflow-y:auto;";
                c.appendChild(msgLogEl);

                const msgTypeColor = (type: string): string => ({
                    "Chat": "#6bd478", "Emote": "#78a4d4", "Activity": "#d4a478",
                    "Action": "#d478c4", "Whisper": "#78d4c4", "Hidden": "#a0a0a0",
                }[type] ?? "#cf6f98");

                renderMsgLog = (): void => {
                    while (msgLogEl.firstChild) msgLogEl.removeChild(msgLogEl.firstChild);
                    const entries = [...getDevLog()].reverse();
                    if (entries.length === 0) {
                        const hint = document.createElement("div");
                        hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:8px 6px;";
                        hint.textContent = isDevLogEnabled()
                            ? "No messages yet — chat, emote, or click Test above."
                            : "Logging is off. Click Enable above.";
                        msgLogEl.appendChild(hint); return;
                    }
                    for (const entry of entries) {
                        const row = document.createElement("div");
                        row.style.cssText = "border-bottom:1px solid #1a0e17;padding:4px 6px;cursor:pointer;";
                        const headerLine = document.createElement("div");
                        headerLine.style.cssText = "display:flex;gap:5px;align-items:baseline;";
                        const typeTag = document.createElement("span");
                        typeTag.style.cssText = `font-family:'Courier New',monospace;font-size:9px;font-weight:bold;color:${msgTypeColor(entry.type)};`;
                        typeTag.textContent = entry.type;
                        const timeTag = document.createElement("span");
                        timeTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#9a7080;margin-left:auto;";
                        timeTag.textContent = entry.timestamp.toLocaleTimeString();
                        headerLine.appendChild(typeTag);
                        if (entry.sender !== undefined) {
                            const senderTag = document.createElement("span");
                            senderTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;";
                            senderTag.textContent = "from #" + entry.sender;
                            headerLine.appendChild(senderTag);
                        }
                        headerLine.appendChild(timeTag);
                        const contentLine = document.createElement("div");
                        contentLine.style.cssText = "font-family:'Courier New',monospace;font-size:8.5px;color:#cf6f98;word-break:break-all;margin-top:1px;";
                        contentLine.textContent = entry.content.length > 150 ? entry.content.slice(0, 150) + "…" : entry.content;
                        let dictEl: HTMLElement | null = null;
                        row.addEventListener("click", () => {
                            if (dictEl) { dictEl.remove(); dictEl = null; return; }
                            dictEl = document.createElement("pre");
                            dictEl.style.cssText = "font-family:'Courier New',monospace;font-size:7.5px;color:#7a5a6a;margin:3px 0 0;white-space:pre-wrap;word-break:break-all;";
                            try { dictEl.textContent = JSON.stringify(entry.dictionary, null, 2); }
                            catch { dictEl.textContent = String(entry.dictionary); }
                            row.appendChild(dictEl);
                        });
                        row.appendChild(headerLine); row.appendChild(contentLine);
                        msgLogEl.appendChild(row);
                    }
                };
                logToggleChk.addEventListener("change", () => {
                    setDevLogEnabled(logToggleChk.checked); updateStatusDot(); renderMsgLog();
                });
                renderMsgLog();
                msgRefreshBtn2.addEventListener("click", renderMsgLog);
                msgClearBtn.addEventListener("click", () => { showConfirmOverlay("Clear the entire message log? This cannot be undone.", "Cancel", "Clear", () => { clearDevLog(); renderMsgLog(); }); });
            });

            // ── People Met ────────────────────────────────────────────────────
            makeInner(t("dev.peopleMet"), "EBC_peoplemetCollapsed", true, (cnt) => {
                const PFONT = "font-family:'Trebuchet MS',serif;";

                // Controls row: count + search + clear
                const ctrlRow = document.createElement("div");
                ctrlRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:6px;";

                const countLbl = document.createElement("span");
                countLbl.style.cssText = `${PFONT}font-size:9px;color:#7a5a6a;flex:1;`;

                const searchInp = document.createElement("input");
                searchInp.type = "text";
                searchInp.placeholder = t("dev.searchPlaceholder");
                searchInp.style.cssText = `${PFONT}font-size:10px;flex:2;background:#1a0810;color:#f0d8ec;border:1px solid #4c2537;border-radius:3px;padding:2px 6px;outline:none;`;

                const clearBtn = document.createElement("button");
                clearBtn.textContent = t("core.clearAll");
                clearBtn.style.cssText = `${PFONT}font-size:11px;padding:5px 10px;border-radius:3px;border:1px solid #4c2537;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;transition:color 0.1s,border-color 0.1s;`;
                clearBtn.addEventListener("mouseenter", () => { clearBtn.style.color = "#e05070"; clearBtn.style.borderColor = "#e05070"; });
                clearBtn.addEventListener("mouseleave", () => { clearBtn.style.color = "#7a5a6a"; clearBtn.style.borderColor = "#4c2537"; });

                ctrlRow.appendChild(countLbl);
                ctrlRow.appendChild(searchInp);
                ctrlRow.appendChild(clearBtn);
                cnt.appendChild(ctrlRow);

                // Scrollable list
                const listEl = document.createElement("div");
                listEl.style.cssText = "max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;";
                cnt.appendChild(listEl);

                const renderList = (): void => {
                    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
                    const all: PersonMet[] = getPeopleMet();
                    const q = searchInp.value.trim().toLowerCase();
                    const filtered = q
                        ? all.filter(p => p.name.toLowerCase().includes(q) || String(p.n).includes(q))
                        : all;

                    countLbl.textContent = `${filtered.length} / ${all.length} people`;

                    if (filtered.length === 0) {
                        const hint = document.createElement("div");
                        hint.style.cssText = `${PFONT}font-size:9px;color:#5a3a4a;font-style:italic;padding:6px 2px;text-align:center;`;
                        hint.textContent = q ? "No matches." : "No one recorded yet — meet people in rooms!";
                        listEl.appendChild(hint);
                        return;
                    }

                    for (const person of [...filtered].reverse()) {
                        const row = document.createElement("div");
                        row.style.cssText = "display:flex;align-items:center;gap:5px;padding:3px 4px;border-radius:3px;background:#1a0810;border:1px solid #2a1421;";

                        const nameSpan = document.createElement("span");
                        nameSpan.style.cssText = `${PFONT}font-size:10px;color:#f0d8ec;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
                        nameSpan.textContent = person.name;
                        nameSpan.title = person.name;

                        const numSpan = document.createElement("span");
                        numSpan.style.cssText = `${PFONT}font-size:9px;color:#7a5a6a;flex-shrink:0;`;
                        numSpan.textContent = `#${person.n}`;

                        const profBtn = document.createElement("button");
                        profBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="display:block;pointer-events:none;"><circle cx="8" cy="5" r="3" fill="#cf6f98"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#cf6f98"/></svg>`;
                        profBtn.title = "View profile";
                        profBtn.style.cssText = "background:var(--ebc-bg-darker);border:1px solid var(--ebc-border-light);border-radius:5px;cursor:pointer;line-height:0;padding:4px 7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;";
                        profBtn.addEventListener("mouseenter", () => { profBtn.style.background = "var(--ebc-bg-mid)"; profBtn.style.borderColor = "var(--ebc-accent)"; });
                        profBtn.addEventListener("mouseleave", () => { profBtn.style.background = "var(--ebc-bg-darker)"; profBtn.style.borderColor = "var(--ebc-border-light)"; });
                        profBtn.addEventListener("click", async () => {
                            const w = window as unknown as Record<string, unknown>;
                            const loadChar   = w.InformationSheetLoadCharacter as ((c: unknown) => void) | undefined;
                            const hideEls    = w.ChatRoomHideElements as (() => void) | undefined;
                            const loadOnline = w.CharacterLoadOnline  as ((d: unknown, n: number) => unknown) | undefined;
                            const roomChars  = w.ChatRoomCharacter    as Array<Record<string, unknown>> | undefined;

                            const openProfile = (C: unknown): void => {
                                this.close();
                                if (w.CurrentScreen === "ChatRoom") {
                                    try { hideEls?.(); } catch { /* ignore */ }
                                    try {
                                        const bgData = (w.ChatRoomData as Record<string, unknown> | undefined)?.Background;
                                        if (bgData) w.ChatRoomBackground = bgData;
                                    } catch { /* ignore */ }
                                }
                                loadChar!(C);
                            };

                            if (!loadChar || !loadOnline) {
                                try { navigator.clipboard.writeText(String(person.n)); } catch { /* ignore */ }
                                return;
                            }

                            const inRoom = Array.isArray(roomChars)
                                ? roomChars.find(c => c.MemberNumber === person.n)
                                : undefined;
                            if (inRoom) {
                                try { openProfile(inRoom); return; } catch { /* ignore */ }
                            }

                            const bundle = await getCharacterBundle(person.n);
                            if (bundle) {
                                try {
                                    const C = loadOnline(bundle, person.n);
                                    if (C) { openProfile(C); return; }
                                } catch { /* ignore */ }
                            }

                            try { navigator.clipboard.writeText(String(person.n)); } catch { /* ignore */ }
                        });

                        row.appendChild(nameSpan);
                        row.appendChild(numSpan);
                        row.appendChild(profBtn);
                        listEl.appendChild(row);
                    }
                };

                renderList();
                searchInp.addEventListener("input", renderList);
                clearBtn.addEventListener("click", () => {
                    showConfirmOverlay("Clear the entire People Met list? This cannot be undone.", "Cancel", "Clear All", () => { clearPeopleMet(); renderList(); });
                });
            });
        });

        // ── Stat Editor (credited members only) ───────────────────────────────
        const CREDITED_IDS = new Set([130267, 143776, 124264, 230466, 80]);
        if (Player.MemberNumber && CREDITED_IDS.has(Player.MemberNumber)) {
            makeSection(t("dev.statEditor"), "EBC_statEditorCollapsed", true, (cnt) => {
                const FONT = "font-family:'Trebuchet MS',serif;";

                // Helper: sub-label
                const subLbl = (text: string): HTMLElement => {
                    const el = document.createElement("div");
                    el.style.cssText = `${FONT}font-size:9px;color:#e890b8;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;margin:6px 0 3px;`;
                    el.textContent = text; return el;
                };

                // Helper: stat row — label + number input + − +
                const statInputs = new Map<string, HTMLInputElement>();
                const makeStatRow = (key: string, label: string, value: number): void => {
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid #2a1421;";
                    const lbl = document.createElement("span");
                    lbl.style.cssText = `${FONT}font-size:10px;color:#c8a0b8;flex:1;`;
                    lbl.textContent = label;
                    const inp = document.createElement("input");
                    inp.type = "number"; inp.value = String(value);
                    inp.style.cssText = `${FONT}font-size:10px;width:62px;background:#1a0810;color:#f0d8ec;border:1px solid #4c2537;border-radius:3px;padding:2px 5px;text-align:right;outline:none;`;
                    const mkBtn = (sym: string, delta: number): HTMLButtonElement => {
                        const b = document.createElement("button");
                        b.textContent = sym;
                        b.style.cssText = `${FONT}font-size:10px;width:22px;height:22px;border-radius:3px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;padding:0;`;
                        b.addEventListener("mouseenter", () => { b.style.borderColor = "#cf6f98"; b.style.background = "#2a0f1a"; });
                        b.addEventListener("mouseleave", () => { b.style.borderColor = "#4c2537"; b.style.background = "transparent"; });
                        b.addEventListener("click", () => { inp.value = String((parseInt(inp.value) || 0) + delta); });
                        return b;
                    };
                    row.appendChild(lbl); row.appendChild(inp);
                    row.appendChild(mkBtn("−", -1)); row.appendChild(mkBtn("+", 1));
                    row.appendChild(mkBtn("−10", -10)); row.appendChild(mkBtn("+10", 10));
                    cnt.appendChild(row);
                    statInputs.set(key, inp);
                };

                // ── Skills ────────────────────────────────────────────────────
                // BC source: Player.Skill is Array<{ Type: string; Level: number; Progress: number }>
                // The property is "Type", NOT "Skill". SkillChange(C, type, level, progress) sets
                // level absolutely and calls ServerPlayerSkillSync() internally.
                interface BCSkillEntry { Type: string; Level: number; Progress: number; }
                const SKILL_LABELS: Record<string, string> = {
                    Bondage: "Bondage", SelfBondage: "Self Bondage",
                    LockPicking: "Lock Picking", Evasion: "Evasion",
                    Willpower: "Willpower", Infiltration: "Infiltration",
                    Dressage: "Dressage",
                };
                // SkillGetLevelReal returns base level without temporary modifiers — correct for display.
                type SkillGetLevelRealFn = (c: unknown, skill: string) => number;
                const skillGetLevelReal = (window as unknown as Record<string, unknown>).SkillGetLevelReal as SkillGetLevelRealFn | undefined;
                const playerSkillArr = (Player as unknown as Record<string, unknown>).Skill as BCSkillEntry[] | undefined ?? [];
                const skillMap = new Map<string, number>(
                    (Array.isArray(playerSkillArr) ? playerSkillArr : []).map(e => [e.Type, e.Level ?? 0])
                );
                const readSkill = (key: string): number => {
                    try { if (skillGetLevelReal) return skillGetLevelReal(Player, key) ?? 0; } catch { /* ignore */ }
                    return skillMap.get(key) ?? 0;
                };

                // applySkill — uses BC's own SkillChange which handles Type property correctly
                // and calls ServerPlayerSkillSync() (→ QueueData({ Skill: Player.Skill })) internally.
                type SkillChangeFn = (c: unknown, type: string, level: number, progress: number) => void;
                const skillChangeFn = (window as unknown as Record<string, unknown>).SkillChange as SkillChangeFn | undefined;
                const applySkill = (key: string, val: number): void => {
                    const clamped = Math.min(10, Math.max(0, val));
                    if (skillChangeFn) {
                        skillChangeFn(Player, key, clamped, 0);
                    } else {
                        // Fallback: manual mutation + sync (property name is "Type")
                        const arr = (Player as unknown as Record<string, unknown>).Skill as BCSkillEntry[] | undefined;
                        if (!Array.isArray(arr)) return;
                        const ex = arr.find(e => e.Type === key);
                        if (ex) ex.Level = clamped; else arr.push({ Type: key, Level: clamped, Progress: 0 });
                        const sync = (window as unknown as Record<string, unknown>).ServerPlayerSkillSync as (() => void) | undefined;
                        sync?.();
                    }
                };

                cnt.appendChild(subLbl("Skills"));
                for (const [key, label] of Object.entries(SKILL_LABELS)) {
                    const skillRow = document.createElement("div");
                    skillRow.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid #2a1421;";
                    const skillLbl = document.createElement("span");
                    skillLbl.style.cssText = `${FONT}font-size:10px;color:#c8a0b8;flex:1;`;
                    skillLbl.textContent = label;
                    const skillInp = document.createElement("input");
                    skillInp.type = "number"; skillInp.value = String(readSkill(key));
                    skillInp.style.cssText = `${FONT}font-size:10px;width:62px;background:#1a0810;color:#f0d8ec;border:1px solid #4c2537;border-radius:3px;padding:2px 5px;text-align:right;outline:none;`;
                    const mkDeltaBtn = (sym: string, delta: number): HTMLButtonElement => {
                        const b = document.createElement("button");
                        b.textContent = sym;
                        b.style.cssText = `${FONT}font-size:10px;width:22px;height:22px;border-radius:3px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;padding:0;`;
                        b.addEventListener("mouseenter", () => { b.style.borderColor = "#cf6f98"; b.style.background = "#2a0f1a"; });
                        b.addEventListener("mouseleave", () => { b.style.borderColor = "#4c2537"; b.style.background = "transparent"; });
                        b.addEventListener("click", () => { skillInp.value = String((parseInt(skillInp.value) || 0) + delta); });
                        return b;
                    };
                    const setBtn = document.createElement("button");
                    setBtn.textContent = "Set";
                    setBtn.style.cssText = `${FONT}font-size:10px;padding:0 6px;height:22px;border-radius:3px;border:1px solid #cf6f98;background:#2a0f1a;color:#f7cce0;cursor:pointer;flex-shrink:0;transition:background 0.1s,border-color 0.1s,color 0.1s;`;
                    setBtn.addEventListener("mouseenter", () => { setBtn.style.background = "#3a1525"; });
                    setBtn.addEventListener("mouseleave", () => { setBtn.style.background = "#2a0f1a"; });
                    setBtn.addEventListener("click", () => {
                        applySkill(key, parseInt(skillInp.value) || 0);
                        setBtn.textContent = "✓";
                        setBtn.style.borderColor = "#80e890"; setBtn.style.color = "#80e890";
                        window.setTimeout(() => {
                            setBtn.textContent = "Set";
                            setBtn.style.borderColor = "#cf6f98"; setBtn.style.color = "#f7cce0";
                        }, 1200);
                    });
                    skillRow.appendChild(skillLbl); skillRow.appendChild(skillInp);
                    skillRow.appendChild(mkDeltaBtn("−", -1)); skillRow.appendChild(mkDeltaBtn("+", 1));
                    skillRow.appendChild(mkDeltaBtn("−10", -10)); skillRow.appendChild(mkDeltaBtn("+10", 10));
                    skillRow.appendChild(setBtn);
                    cnt.appendChild(skillRow);
                    statInputs.set("skill_" + key, skillInp);
                }

                // ── Reputation ────────────────────────────────────────────────
                // Player.Reputation is Array<{ Type: string; Value: number }>
                // All known types are always shown (0 if player doesn't have them yet).
                const KNOWN_REP_TYPES = [
                    "Gaming", "Gambling", "LARP", "Maid",
                    "ABDL", "Dominant", "Asylum", "Kidnap", "HouseVincula",
                ];

                cnt.appendChild(subLbl("Reputation"));

                const repContainer = document.createElement("div");
                cnt.appendChild(repContainer);

                const rebuildRepSection = (): void => {
                    while (repContainer.firstChild) repContainer.removeChild(repContainer.firstChild);
                    for (const k of [...statInputs.keys()]) {
                        if (k.startsWith("rep_")) statInputs.delete(k);
                    }
                    const repRaw = (Player as unknown as Record<string, unknown>).Reputation;
                    const repArr: Array<{ Type: string; Value: number }> =
                        Array.isArray(repRaw) ? (repRaw as Array<{ Type: string; Value: number }>) : [];
                    const repMap = new Map(repArr.map(r => [r.Type, r.Value]));
                    for (const repType of KNOWN_REP_TYPES) {
                        const row = document.createElement("div");
                        row.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid #2a1421;";
                        const lbl = document.createElement("span");
                        lbl.style.cssText = `${FONT}font-size:10px;color:#c8a0b8;flex:1;`;
                        lbl.textContent = repType;
                        const inp = document.createElement("input");
                        inp.type = "number"; inp.value = String(repMap.get(repType) ?? 0);
                        inp.style.cssText = `${FONT}font-size:10px;width:62px;background:#1a0810;color:#f0d8ec;border:1px solid #4c2537;border-radius:3px;padding:2px 5px;text-align:right;outline:none;`;
                        const mkRepBtn = (sym: string, delta: number): HTMLButtonElement => {
                            const b = document.createElement("button");
                            b.textContent = sym;
                            b.style.cssText = `${FONT}font-size:10px;width:22px;height:22px;border-radius:3px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;padding:0;`;
                            b.addEventListener("mouseenter", () => { b.style.borderColor = "#cf6f98"; b.style.background = "#2a0f1a"; });
                            b.addEventListener("mouseleave", () => { b.style.borderColor = "#4c2537"; b.style.background = "transparent"; });
                            b.addEventListener("click", () => { inp.value = String((parseInt(inp.value) || 0) + delta); });
                            return b;
                        };
                        row.appendChild(lbl); row.appendChild(inp);
                        row.appendChild(mkRepBtn("−", -1)); row.appendChild(mkRepBtn("+", 1));
                        row.appendChild(mkRepBtn("−10", -10)); row.appendChild(mkRepBtn("+10", 10));
                        repContainer.appendChild(row);
                        statInputs.set("rep_" + repType, inp);
                    }
                };
                rebuildRepSection();

                // ── Money ─────────────────────────────────────────────────────
                cnt.appendChild(subLbl("Account"));
                {
                    const INP = `${FONT}font-size:10px;width:90px;background:#1a0810;color:#f0d8ec;border:1px solid #4c2537;border-radius:3px;padding:2px 5px;text-align:right;outline:none;`;
                    const BTN = `${FONT}font-size:10px;padding:2px 10px;border-radius:3px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;transition:border-color 0.1s,background 0.1s;`;
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid #2a1421;";
                    const lbl = document.createElement("span");
                    lbl.style.cssText = `${FONT}font-size:10px;color:#c8a0b8;flex:1;`;
                    lbl.textContent = "Money";
                    const moneyInp = document.createElement("input");
                    moneyInp.type = "number";
                    moneyInp.value = String((Player as unknown as Record<string, unknown>).Money ?? 0);
                    moneyInp.style.cssText = INP;
                    const addMoneyBtn = document.createElement("button");
                    addMoneyBtn.textContent = t("core.add");
                    addMoneyBtn.title = "Add this amount to current money";
                    addMoneyBtn.style.cssText = BTN;
                    const setMoneyBtn = document.createElement("button");
                    setMoneyBtn.textContent = "Set";
                    setMoneyBtn.title = "Set money to this exact amount";
                    setMoneyBtn.style.cssText = BTN;
                    const applyMoney = (mode: "add" | "set"): void => {
                        try {
                            type Upd = { QueueData(d: Record<string, unknown>): void };
                            const upd = (window as unknown as Record<string, unknown>).ServerAccountUpdate as Upd | undefined;
                            const cur = ((Player as unknown as Record<string, unknown>).Money as number) ?? 0;
                            const inp = parseInt(moneyInp.value) || 0;
                            const next = Math.max(0, mode === "add" ? cur + inp : inp);
                            (Player as unknown as Record<string, unknown>).Money = next;
                            if (upd?.QueueData) upd.QueueData({ Money: next });
                            moneyInp.value = String(next);
                            const btn = mode === "add" ? addMoneyBtn : setMoneyBtn;
                            btn.textContent = "Done!";
                            window.setTimeout(() => { btn.textContent = mode === "add" ? "+ Add" : "Set"; }, 1000);
                        } catch { /* ignore */ }
                    };
                    addMoneyBtn.addEventListener("mouseenter", () => { addMoneyBtn.style.borderColor = "#cf6f98"; addMoneyBtn.style.background = "#2a0f1a"; });
                    addMoneyBtn.addEventListener("mouseleave", () => { addMoneyBtn.style.borderColor = "#4c2537"; addMoneyBtn.style.background = "transparent"; });
                    setMoneyBtn.addEventListener("mouseenter", () => { setMoneyBtn.style.borderColor = "#cf6f98"; setMoneyBtn.style.background = "#2a0f1a"; });
                    setMoneyBtn.addEventListener("mouseleave", () => { setMoneyBtn.style.borderColor = "#4c2537"; setMoneyBtn.style.background = "transparent"; });
                    addMoneyBtn.addEventListener("click", () => applyMoney("add"));
                    setMoneyBtn.addEventListener("click", () => applyMoney("set"));
                    row.appendChild(lbl); row.appendChild(moneyInp);
                    row.appendChild(addMoneyBtn); row.appendChild(setMoneyBtn);
                    cnt.appendChild(row);
                }

                // ── Unlock all items ───────────────────────────────────────────
                cnt.appendChild(subLbl("Actions"));
                {
                    const unlockBtn = document.createElement("button");
                    unlockBtn.style.cssText = `${FONT}font-size:10px;font-weight:bold;width:100%;margin-bottom:4px;padding:5px 0;border-radius:5px;border:1px solid #9b7de0;background:#1e1035;color:#d8c8ff;cursor:pointer;transition:background 0.12s;`;
                    unlockBtn.textContent = "Unlock All Items";
                    unlockBtn.addEventListener("mouseenter", () => { unlockBtn.style.background = "#2e1850"; });
                    unlockBtn.addEventListener("mouseleave", () => { unlockBtn.style.background = "#1e1035"; });
                    unlockBtn.addEventListener("click", () => {
                        try {
                            type InvAddFn = (c: unknown, name: string, group: string, push: boolean) => void;
                            const invAdd = (window as unknown as Record<string, unknown>).InventoryAdd as InvAddFn | undefined;
                            const assetList = (window as unknown as Record<string, unknown>).Asset as
                                Array<{ Name: string; Group: { Name: string } }> | undefined ?? [];
                            if (!invAdd) { unlockBtn.textContent = "InventoryAdd not found"; return; }
                            for (const asset of assetList) {
                                try { invAdd(Player, asset.Name, asset.Group.Name, false); } catch { /* skip */ }
                            }
                            // Do NOT call QueueData({ Inventory: Player.Inventory }) here —
                            // the array is now thousands of entries and socket.io's deep-clone
                            // will stack-overflow trying to serialise it. BC's own account-update
                            // cycle (triggered by leaving a room, opening the profile, etc.)
                            // will persist the inventory naturally.
                            unlockBtn.textContent = `All items unlocked!`;
                            window.setTimeout(() => { unlockBtn.textContent = "Unlock All Items"; }, 2500);
                        } catch { unlockBtn.textContent = "Error — check console"; }
                    });
                    cnt.appendChild(unlockBtn);
                }

                // ── Apply All button ──────────────────────────────────────────
                const applyBtn = document.createElement("button");
                applyBtn.style.cssText = `${FONT}font-size:10px;font-weight:bold;width:100%;margin-top:8px;padding:5px 0;border-radius:5px;border:1px solid #cf6f98;background:#2a0f1a;color:#f7cce0;cursor:pointer;transition:background 0.12s;`;
                applyBtn.textContent = "Apply All Stats";
                applyBtn.addEventListener("mouseenter", () => { applyBtn.style.background = "#3a1525"; });
                applyBtn.addEventListener("mouseleave", () => { applyBtn.style.background = "#2a0f1a"; });
                applyBtn.addEventListener("click", () => {
                    type Upd = { QueueData(d: Record<string, unknown>): void };
                    const upd = (window as unknown as Record<string, unknown>).ServerAccountUpdate as Upd | undefined;

                    // ── Skills ────────────────────────────────────────────────
                    try {
                        for (const key of Object.keys(SKILL_LABELS)) {
                            const inp = statInputs.get("skill_" + key);
                            applySkill(key, parseInt(inp?.value ?? "0") || 0);
                        }
                    } catch (e) {
                        applyBtn.textContent = "Skill error!";
                        window.setTimeout(() => { applyBtn.textContent = "Apply All Stats"; }, 2000);
                        return;
                    }

                    // ── Reputation ────────────────────────────────────────────
                    try {
                        const repRaw = (Player as unknown as Record<string, unknown>).Reputation;
                        const rep: Array<{ Type: string; Value: number }> =
                            Array.isArray(repRaw) ? (repRaw as Array<{ Type: string; Value: number }>) : [];
                        for (const [k, inp] of statInputs) {
                            if (!k.startsWith("rep_")) continue;
                            const type = k.slice(4);
                            const val = parseInt(inp.value);
                            if (isNaN(val)) continue;
                            const entry = rep.find(r => r.Type === type);
                            if (entry) {
                                entry.Value = val;
                            } else if (val !== 0) {
                                // Not yet in Player.Reputation — add it now
                                rep.push({ Type: type, Value: val });
                            }
                        }
                        if (!Array.isArray(repRaw)) {
                            (Player as unknown as Record<string, unknown>).Reputation = rep;
                        }
                        if (upd?.QueueData) upd.QueueData({ Reputation: rep });
                    } catch { /* reputation save failed — non-fatal */ }

                    applyBtn.textContent = "Applied!";
                    window.setTimeout(() => { applyBtn.textContent = "Apply All Stats"; }, 1500);
                });
                cnt.appendChild(applyBtn);
            });
        }

        // Auto-refresh every 1.5 s while the DEV tab is open.
        // Room History always refreshes (cheap read). Message log only if logging is on.
        this.stopDevLogPoller();
        this.devLogPoller = window.setInterval(() => {
            if (this.currentTab !== "dev") return;
            renderRoom();
            renderRlog();
            if (isDevLogEnabled()) renderMsgLog();
        }, 1500);
    }

    // -- Special Thanks tab ----------------------------------------------------

    private renderPuppy(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // Header
        const hdr = document.createElement("div");
        hdr.style.cssText = "text-align:center;padding:14px 0 6px;";
        const hdrTxt = document.createElement("div");
        hdrTxt.style.cssText = "font-family:'Trebuchet MS',serif;font-size:22px;letter-spacing:0.05em;color:#b8a0f7;";
        hdrTxt.textContent = "🐾 Puppy";
        const hdrSub = document.createElement("div");
        hdrSub.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#8a7ab0;margin-top:3px;";
        hdrSub.textContent = "woof woof~";
        hdr.appendChild(hdrTxt);
        hdr.appendChild(hdrSub);
        body.appendChild(hdr);

        // -- Bark sounds storage helpers --
        const BUILTIN_BARKS = [
            "Arf~", "Woof!", "Wuf~", "Ruff!", "Wroof~", "Bork!", "Bork bork~",
            "Arf arf!", "Woof woof~", "Wuf wuf!", "Arf! Arf!", "Awoo~",
            "Yip!", "Yip yip~", "Ruff ruff!", "Wroof wroof~",
        ];
        const getPuppyStore = (): Record<string, unknown> => {
            if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
            return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
        };
        // Unified bark list — seeds from BUILTIN_BARKS on first use, migrates legacy customBarks
        const getBarks = (): string[] => {
            const store = getPuppyStore();
            if (Array.isArray(store.barks)) return store.barks as string[];
            const legacy = Array.isArray(store.customBarks) ? (store.customBarks as string[]) : [];
            const initial = [...BUILTIN_BARKS, ...legacy];
            store.barks = initial;
            if (legacy.length > 0) { delete store.customBarks; }
            syncSettings();
            return initial;
        };
        const saveBarks = (barks: string[]): void => {
            getPuppyStore().barks = barks;
            syncSettings();
        };

        // Bark button
        const barkBtn = document.createElement("button");
        barkBtn.style.cssText = [
            "display:block",
            "width:80%",
            "margin:18px auto 0",
            "font-family:'Trebuchet MS',serif",
            "font-size:16px",
            "font-weight:bold",
            "padding:12px 0",
            "border-radius:10px",
            "border:2px solid #9b7de0",
            "background:#3a2060",
            "color:#d8c8ff",
            "cursor:pointer",
            "transition:background 0.14s,transform 0.08s",
            "letter-spacing:0.08em",
        ].join(";");
        barkBtn.textContent = t("kitty.barkBtn");
        barkBtn.addEventListener("mouseenter", () => { barkBtn.style.background = "#5a30a0"; });
        barkBtn.addEventListener("mouseleave", () => { barkBtn.style.background = "#3a2060"; });
        barkBtn.addEventListener("mousedown", () => { barkBtn.style.transform = "scale(0.95)"; });
        barkBtn.addEventListener("mouseup",   () => { barkBtn.style.transform = ""; });
        barkBtn.addEventListener("click", () => {
            const pool = getBarks();
            const bark = pool[Math.floor(Math.random() * pool.length)];
            try { ServerSend("ChatRoomChat", { Type: "Chat", Content: bark }); } catch { /* ignore */ }
            barkBtn.style.background = "#7a40c8";
            barkBtn.textContent = "🐶 " + bark;
            window.setTimeout(() => {
                barkBtn.style.background = "#3a2060";
                barkBtn.textContent = t("kitty.barkBtn");
            }, 700);
        });
        body.appendChild(barkBtn);

        // -- Bark sounds list --
        const barksLbl = document.createElement("div");
        barksLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a7ab0;text-transform:uppercase;letter-spacing:0.05em;margin:18px 8px 5px;";
        barksLbl.textContent = "Bark Sounds";
        body.appendChild(barksLbl);

        const barkList = document.createElement("div");
        barkList.style.cssText = "display:flex;flex-direction:column;gap:3px;margin:0 8px;";
        body.appendChild(barkList);

        const rebuildBarkList = (): void => {
            while (barkList.firstChild) barkList.removeChild(barkList.firstChild);
            const barks = getBarks();
            if (barks.length === 0) {
                const none = document.createElement("div");
                none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#6a5880;padding:2px 0;";
                none.textContent = "No sounds yet.";
                barkList.appendChild(none);
                return;
            }
            for (let i = 0; i < barks.length; i++) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:5px;background:rgba(58,32,96,0.4);border:1px solid #5a3a90;border-radius:5px;padding:3px 7px;";

                const txt = document.createElement("span");
                txt.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#d8c8ff;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                txt.textContent = barks[i];

                const editBtn = document.createElement("button");
                editBtn.textContent = "✎";
                editBtn.title = "Edit";
                editBtn.style.cssText = "background:none;border:none;cursor:pointer;color:#9b7de0;font-size:12px;line-height:1;padding:0 2px;flex-shrink:0;transition:color 0.1s;";
                editBtn.addEventListener("mouseenter", () => { editBtn.style.color = "#c8a8ff"; });
                editBtn.addEventListener("mouseleave", () => { editBtn.style.color = "#9b7de0"; });

                const delBtn = document.createElement("button");
                delBtn.textContent = "×";
                delBtn.title = "Remove";
                delBtn.style.cssText = "background:none;border:none;cursor:pointer;color:#9b7de0;font-size:13px;line-height:1;padding:0;flex-shrink:0;transition:color 0.1s;";
                delBtn.addEventListener("mouseenter", () => { delBtn.style.color = "#ff8080"; });
                delBtn.addEventListener("mouseleave", () => { delBtn.style.color = "#9b7de0"; });

                editBtn.addEventListener("click", () => {
                    // Switch row to inline-edit mode
                    while (row.firstChild) row.removeChild(row.firstChild);
                    const inp = document.createElement("input");
                    inp.type = "text";
                    inp.maxLength = 60;
                    inp.value = barks[i];
                    inp.className = "ebc-form-input";
                    inp.style.cssText = "flex:1;font-size:10px;min-width:0;";
                    const saveBtn = document.createElement("button");
                    saveBtn.textContent = "Save";
                    saveBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #9b7de0;background:#3a2060;color:#d8c8ff;cursor:pointer;flex-shrink:0;transition:background 0.1s;";
                    saveBtn.addEventListener("mouseenter", () => { saveBtn.style.background = "#5a30a0"; });
                    saveBtn.addEventListener("mouseleave", () => { saveBtn.style.background = "#3a2060"; });
                    const cancelBtn = document.createElement("button");
                    cancelBtn.textContent = "Cancel";
                    cancelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #5a3a80;background:transparent;color:#8a7ab0;cursor:pointer;flex-shrink:0;";
                    const doSave = (): void => {
                        const val = inp.value.trim();
                        if (!val) return;
                        const updated = getBarks();
                        updated[i] = val;
                        saveBarks(updated);
                        rebuildBarkList();
                    };
                    saveBtn.addEventListener("click", doSave);
                    cancelBtn.addEventListener("click", () => rebuildBarkList());
                    inp.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") doSave();
                        if (e.key === "Escape") rebuildBarkList();
                    });
                    row.appendChild(inp);
                    row.appendChild(saveBtn);
                    row.appendChild(cancelBtn);
                    inp.focus();
                    inp.select();
                });

                delBtn.addEventListener("click", () => {
                    const updated = getBarks();
                    updated.splice(i, 1);
                    saveBarks(updated);
                    rebuildBarkList();
                });

                row.appendChild(txt);
                row.appendChild(editBtn);
                row.appendChild(delBtn);
                barkList.appendChild(row);
            }
        };
        rebuildBarkList();

        // Add new sound
        const addRow = document.createElement("div");
        addRow.style.cssText = "display:flex;gap:5px;margin:6px 8px 0;";
        const addInp = document.createElement("input");
        addInp.type = "text";
        addInp.maxLength = 60;
        addInp.placeholder = "e.g. Woof woof~";
        addInp.className = "ebc-form-input";
        addInp.style.cssText = "flex:1;font-size:10px;";
        const addBtn = document.createElement("button");
        addBtn.textContent = t("core.add");
        addBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid #9b7de0;background:#3a2060;color:#d8c8ff;cursor:pointer;flex-shrink:0;transition:background 0.12s;";
        addBtn.addEventListener("mouseenter", () => { addBtn.style.background = "#5a30a0"; });
        addBtn.addEventListener("mouseleave", () => { addBtn.style.background = "#3a2060"; });
        const doAdd = (): void => {
            const val = addInp.value.trim();
            if (!val) return;
            saveBarks([...getBarks(), val]);
            addInp.value = "";
            rebuildBarkList();
        };
        addBtn.addEventListener("click", doAdd);
        addInp.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
        addRow.appendChild(addInp);
        addRow.appendChild(addBtn);
        body.appendChild(addRow);
    }

    private buildSeqStepBuilder(btns: ActionButton[], idx: number): HTMLElement {
        const DEFAULT_DELAY = 600;

        // Parse current emote value into step rows
        interface SeqStep { type: "action" | "emote" | "pose" | "reset" | "leaveroom"; text: string; delay: number; }

        const parseSteps = (raw: string): SeqStep[] => {
            if (!raw.trim()) return [];
            return raw.split("|").map(r => r.trim()).filter(Boolean).map(r => {
                const { content, delay } = parseStep(r, DEFAULT_DELAY);
                if (content === "_") return { type: "reset" as const, text: "", delay };
                if (content.toLowerCase() === "leaveroom") return { type: "leaveroom" as const, text: "", delay };
                if (content.startsWith("!")) return { type: "action" as const, text: content.slice(1), delay };
                if (content.startsWith("*")) return { type: "emote" as const, text: content.slice(1), delay };
                return { type: "pose" as const, text: content, delay };
            });
        };

        const serializeSteps = (steps: SeqStep[]): string => {
            return steps.map(s => {
                if (s.type === "leaveroom") return "leaveroom";
                let content = "";
                if (s.type === "reset") content = "_";
                else if (s.type === "action") content = "!" + s.text;
                else if (s.type === "emote") content = "*" + s.text;
                else content = s.text;
                return `${content}@${s.delay}`;
            }).join("|");
        };

        let steps: SeqStep[] = parseSteps(btns[idx].emote);

        const wrapper = document.createElement("div");
        wrapper.className = "ebc-seq-builder";

        const stepList = document.createElement("div");
        stepList.style.cssText = "display:flex;flex-direction:column;gap:3px;";
        wrapper.appendChild(stepList);

        const renderSteps = (): void => {
            while (stepList.firstChild) stepList.removeChild(stepList.firstChild);

            for (let si = 0; si < steps.length; si++) {
                const step = steps[si];
                const stepRow = document.createElement("div");
                stepRow.className = "ebc-seq-step-row";

                // Type dropdown
                const typeSelect = document.createElement("select");
                typeSelect.className = "ebc-seq-type-select";
                [
                    { value: "action",    label: t("buttons.styleAction")  },
                    { value: "emote",     label: t("buttons.styleEmote")   },
                    { value: "pose",      label: t("buttons.stylePose")    },
                    { value: "reset",     label: t("buttons.styleReset")   },
                    { value: "leaveroom", label: t("buttons.styleLeave")   },
                ].forEach(opt => {
                    const o = document.createElement("option");
                    o.value = opt.value; o.textContent = opt.label;
                    if (opt.value === step.type) o.selected = true;
                    typeSelect.appendChild(o);
                });

                const noText  = step.type === "reset" || step.type === "leaveroom";
                const noDelay = step.type === "leaveroom";

                // Text input
                const textInp = document.createElement("input");
                textInp.className = "ebc-seq-text-inp";
                textInp.type = "text";
                textInp.value = step.text;
                textInp.placeholder = step.type === "pose" ? "e.g. HandsUp" : "text...";
                textInp.disabled = noText;
                textInp.maxLength = 200;
                if (noText) textInp.style.opacity = "0.35";

                // Delay input (ms) — hidden for leaveroom since nothing follows
                const delayInp = document.createElement("input");
                delayInp.className = "ebc-seq-delay-inp";
                delayInp.type = "number";
                delayInp.min = "0";
                delayInp.max = "60000";
                delayInp.step = "100";
                delayInp.value = String(step.delay);
                delayInp.title = "Delay after this step (ms)";
                if (noDelay) delayInp.style.visibility = "hidden";

                // Delete button
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-seq-step-del";
                delBtn.textContent = "×";
                delBtn.title = "Remove step";

                stepRow.appendChild(typeSelect);
                stepRow.appendChild(textInp);
                stepRow.appendChild(delayInp);
                stepRow.appendChild(delBtn);
                stepList.appendChild(stepRow);

                // Events (capture si)
                const sidx = si;

                typeSelect.addEventListener("change", () => {
                    const t = typeSelect.value as SeqStep["type"];
                    steps[sidx].type = t;
                    const noTxt = t === "reset" || t === "leaveroom";
                    const noDly = t === "leaveroom";
                    textInp.disabled = noTxt;
                    textInp.style.opacity = noTxt ? "0.35" : "";
                    delayInp.style.visibility = noDly ? "hidden" : "";
                    if (noTxt) { steps[sidx].text = ""; textInp.value = ""; }
                    btns[idx].emote = serializeSteps(steps);
                });

                textInp.addEventListener("input", () => {
                    steps[sidx].text = textInp.value;
                    btns[idx].emote = serializeSteps(steps);
                });

                delayInp.addEventListener("input", () => {
                    const v = parseInt(delayInp.value, 10);
                    steps[sidx].delay = isNaN(v) ? DEFAULT_DELAY : Math.max(0, v);
                    btns[idx].emote = serializeSteps(steps);
                });

                delBtn.addEventListener("click", () => {
                    steps.splice(sidx, 1);
                    btns[idx].emote = serializeSteps(steps);
                    renderSteps();
                });
            }
        };

        renderSteps();

        // Button row: template shortcut + add step
        const seqBtnRow = document.createElement("div");
        seqBtnRow.style.cssText = "display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;";

        const templateBtn = document.createElement("button");
        templateBtn.className = "ebc-seq-add-btn";
        templateBtn.textContent = "📤 Slow Leave template";
        templateBtn.title = "Fill with a simple slow leave sequence";
        templateBtn.addEventListener("click", () => {
            steps = [
                { type: "emote",     text: "smiles and gives a little wave~",  delay: 2500 },
                { type: "emote",     text: "slowly heads for the door...",      delay: 0    },
                { type: "leaveroom", text: "",                                  delay: 0    },
            ];
            btns[idx].emote = serializeSteps(steps);
            renderSteps();
        });
        seqBtnRow.appendChild(templateBtn);

        const addBtn = document.createElement("button");
        addBtn.className = "ebc-seq-add-btn";
        addBtn.textContent = "+ Add step";
        addBtn.addEventListener("click", () => {
            steps.push({ type: "action", text: "", delay: DEFAULT_DELAY });
            btns[idx].emote = serializeSteps(steps);
            renderSteps();
        });
        seqBtnRow.appendChild(addBtn);

        wrapper.appendChild(seqBtnRow);

        return wrapper;
    }

    // -- Buttons tab -----------------------------------------------------------

    private renderButtons(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // ── Sidebar visibility toggle ─────────────────────────────────────────
        const sidebarRow = document.createElement("div");
        sidebarRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 8px 6px;border-bottom:1px solid #2a1421;margin-bottom:6px;";
        const sidebarLbl = document.createElement("span");
        sidebarLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;flex:1;user-select:none;";
        sidebarLbl.textContent = t("buttons.showSidebar");
        const sidebarToggle = document.createElement("button");
        const refreshSidebarToggle = (): void => {
            const on = getActionButtonsVisible();
            sidebarToggle.textContent = on ? t("core.on") : t("core.off");
            sidebarToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif", "font-size:10px", "font-weight:bold",
                "padding:2px 9px", "border-radius:4px", "cursor:pointer", "flex-shrink:0",
                "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                "background:" + (on ? "#6b3048" : "#1b0d17"),
                "color:" + (on ? "#f7e6ee" : "#9a7080"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
        };
        refreshSidebarToggle();
        sidebarToggle.addEventListener("click", () => { setActionButtonsVisible(!getActionButtonsVisible()); refreshSidebarToggle(); });
        sidebarRow.appendChild(sidebarLbl);
        sidebarRow.appendChild(sidebarToggle);
        body.appendChild(sidebarRow);

        // Working category state
        const cats: ButtonCategory[] = getCategories().map(c => ({ ...c, buttons: c.buttons.map(b => ({ ...b })) }));
        let activeCatIdx = getActiveCategoryIndex();
        if (activeCatIdx >= cats.length) activeCatIdx = 0;

        // ── Accordion: one collapsible section per category ───────────────────
        // Build all headers; only the active one has its editor body visible.
        // Clicking a collapsed header switches to it and re-renders.

        // Working copies for the active category's editor
        let btns: ActionButton[] = cats[activeCatIdx].buttons.map(b => ({ ...b }));
        let slotCount = Math.min(ABSOLUTE_MAX, Math.max(1, cats[activeCatIdx].slotCount || cats[activeCatIdx].buttons.length || 1));
        while (btns.length < slotCount) {
            btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
        }

        // ── Build accordion ───────────────────────────────────────────────────
        // One section per category. The active one is expanded; others collapsed.
        let activeBodyEl: HTMLElement = document.createElement("div"); // filled below

        const HROW_CSS = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:5px 8px;border-radius:6px;margin-bottom:2px;";
        const CAT_LBL_CSS = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;color:#c09098;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        const ICON_BTN_CSS = "background:none;border:none;font-family:'Trebuchet MS',serif;font-size:10px;cursor:pointer;padding:1px 4px;border-radius:3px;color:#7a5a6a;flex-shrink:0;";

        cats.forEach((cat, i) => {
            const isActive = i === activeCatIdx;

            const section = document.createElement("div");
            section.style.cssText = "border:1px solid " + (isActive ? "#5a2840" : "#2a1421") + ";border-radius:7px;margin-bottom:5px;overflow:hidden;";

            // ── Header ──
            const hrow = document.createElement("div");
            hrow.style.cssText = HROW_CSS + "background:" + (isActive ? "#2a0e1e" : "#1b0d17") + ";";

            const chevron = document.createElement("span");
            chevron.style.cssText = "font-size:9px;color:#7a5060;flex-shrink:0;";
            chevron.textContent = isActive ? "▼" : "▶";

            const nameLbl = document.createElement("span");
            nameLbl.style.cssText = CAT_LBL_CSS;
            nameLbl.textContent = cat.name;

            const renameBtn = document.createElement("button");
            renameBtn.style.cssText = ICON_BTN_CSS;
            renameBtn.textContent = "✎";
            renameBtn.title = "Rename";
            renameBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const newName = window.prompt("New name:", cats[i].name) ?? "";
                if (!newName.trim()) return;
                cats[i].name = newName.trim();
                saveCategories([...cats], activeCatIdx);
                nameLbl.textContent = newName.trim();
            });

            hrow.appendChild(chevron);
            hrow.appendChild(nameLbl);
            hrow.appendChild(renameBtn);

            if (cats.length > 1) {
                const delBtn = document.createElement("button");
                delBtn.style.cssText = ICON_BTN_CSS + "color:#7a3040;";
                delBtn.textContent = "✕";
                delBtn.title = "Delete category";
                delBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete category "${cats[i].name}"?`)) return;
                    cats.splice(i, 1);
                    const newIdx = Math.min(i, cats.length - 1);
                    saveCategories([...cats], newIdx);
                    this.renderButtons();
                });
                hrow.appendChild(delBtn);
            }

            // Build the body element now so the click handler can reference it for toggling
            const catBody = document.createElement("div");
            catBody.style.cssText = "padding:6px 8px 4px;";
            let isExpanded = isActive;
            if (isActive) {
                // Restore persisted collapse state for the active category
                try { isExpanded = localStorage.getItem("EBC_activeCatExpanded") !== "0"; } catch { /* ignore */ }
                // Sync visual state to match the restored expansion state
                chevron.textContent = isExpanded ? "▼" : "▶";
                section.style.borderColor = isExpanded ? "#5a2840" : "#2a1421";
                hrow.style.background = isExpanded ? "#2a0e1e" : "#1b0d17";
            }
            catBody.style.display = isExpanded ? "" : "none";

            // Clicking a collapsed header switches to it and re-renders.
            // Clicking the active (expanded) header toggles it open/closed inline.
            hrow.addEventListener("click", () => {
                if (i !== activeCatIdx) {
                    setActiveCategoryIndex(i);
                    this.renderButtons();
                    return;
                }
                isExpanded = !isExpanded;
                catBody.style.display = isExpanded ? "" : "none";
                chevron.textContent = isExpanded ? "▼" : "▶";
                section.style.borderColor = isExpanded ? "#5a2840" : "#2a1421";
                hrow.style.background = isExpanded ? "#2a0e1e" : "#1b0d17";
                try { localStorage.setItem("EBC_activeCatExpanded", isExpanded ? "1" : "0"); } catch { /* ignore */ }
            });

            section.appendChild(hrow);

            // ── Body (only rendered for the active category) ──
            if (isActive) {
                activeBodyEl = catBody;
                section.appendChild(catBody);
            }

            body.appendChild(section);
        });

        // ── Add Category row ──────────────────────────────────────────────────
        const addCatRow = document.createElement("div");
        addCatRow.style.cssText = "margin-bottom:8px;";
        const addCatBtn = document.createElement("button");
        addCatBtn.className = "ebc-cat-pill";
        addCatBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px dashed #4c2537;background:transparent;color:#7a5a6a;cursor:pointer;width:100%;text-align:center;";
        addCatBtn.textContent = t("buttons.addCategory");
        addCatBtn.addEventListener("click", () => {
            const name = window.prompt("Category name (e.g. RP, Casual):") ?? "";
            if (!name.trim()) return;
            cats.push({ name: name.trim(), buttons: [{ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" }], slotCount: 1 });
            const newIdx = cats.length - 1;
            saveCategories([...cats], newIdx);
            this.renderButtons();
        });
        addCatRow.appendChild(addCatBtn);
        body.appendChild(addCatRow);

        // ── Slot list + render fn — appended into the active category body ─────
        const slotList = document.createElement("div");
        slotList.id = "ebc-slot-list";
        activeBodyEl.appendChild(slotList);

        const renderSlots = (): void => {
            // Always ensure btns has a real object for every slot — prevents "undefined" crashes
            while (btns.length < slotCount) {
                btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
            }
            while (slotList.firstChild) slotList.removeChild(slotList.firstChild);

            for (let i = 0; i < slotCount; i++) {
                const btn = btns[i];

                const row = document.createElement("div");
                row.className = "ebc-slot-row";

                // Top line: toggle | label input | color picker | del
                const topLine = document.createElement("div");
                topLine.className = "ebc-slot-top";

                const toggle = document.createElement("button");
                toggle.className = "ebc-slot-toggle" + (btn.enabled ? " on" : "");
                toggle.textContent = btn.enabled ? t("core.on") : t("core.off");
                toggle.title = btn.enabled ? "Click to disable" : "Click to enable";

                const labelInp = document.createElement("input");
                labelInp.className = "ebc-slot-label";
                labelInp.type = "text";
                labelInp.maxLength = 6;
                labelInp.placeholder = "Label";
                labelInp.value = btn.label;
                labelInp.title = "Button label (max 6 chars)";

                // Colour preview dot + hex text input; dot opens floating picker
                const colorWrap = document.createElement("span");
                colorWrap.style.cssText = "display:inline-flex;align-items:center;gap:3px;flex-shrink:0;";
                const colorDot = document.createElement("span");
                colorDot.style.cssText = `width:14px;height:14px;border-radius:3px;border:1px solid #5a2a3e;flex-shrink:0;background:${normalizeHex(btn.color)};cursor:pointer;`;
                colorDot.title = "Click to open colour picker";
                const colorInp = document.createElement("input");
                colorInp.className = "ebc-slot-color";
                colorInp.type = "text";
                colorInp.maxLength = 7;
                colorInp.placeholder = "#hex";
                colorInp.value = normalizeHex(btn.color);
                colorInp.title = "Button colour (hex, e.g. #cf6f98)";
                colorInp.style.cssText = "width:52px;font-size:8px;font-family:'Courier New',monospace;background:#1b0d17;border:1px solid #3a1928;border-radius:3px;color:#f7e6ee;padding:2px 3px;outline:none;";
                colorWrap.appendChild(colorDot);
                colorWrap.appendChild(colorInp);

                // Floating picker popup — created on demand, one per slot at a time
                let slotPickerPopup: HTMLElement | null = null;
                let slotPickerCleanup: (() => void) | null = null;
                const closeSlotPicker = (): void => {
                    if (slotPickerPopup) {
                        slotPickerCleanup?.();
                        slotPickerCleanup = null;
                        slotPickerPopup.remove();
                        slotPickerPopup = null;
                    }
                };
                colorDot.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (slotPickerPopup) { closeSlotPicker(); return; }
                    const popup = document.createElement("div");
                    popup.style.cssText = "position:fixed;z-index:100000;background:#1b0d17;border:1px solid #5a2a3e;border-radius:8px;padding:8px;box-shadow:0 6px 24px rgba(0,0,0,0.7);";
                    const pw = this.buildColorPickerWidget(btns[i].color ?? "#cf6f98", (hex) => {
                        btns[i].color = hex;
                        colorDot.style.background = hex;
                        colorInp.value = hex;
                        colorInp.style.color = "#f7e6ee";
                    });
                    const wpw = pw as unknown as Record<string, unknown>;
                    slotPickerCleanup = wpw._cleanup as () => void;
                    const doneBtn = document.createElement("button");
                    doneBtn.className = "ebc-wear-btn";
                    doneBtn.style.cssText = "width:100%;margin-top:6px;";
                    doneBtn.textContent = t("core.done");
                    doneBtn.addEventListener("click", closeSlotPicker);
                    popup.appendChild(pw);
                    popup.appendChild(doneBtn);
                    const rect = colorDot.getBoundingClientRect();
                    popup.style.top = Math.max(4, Math.min(rect.top - 4, window.innerHeight - 280)) + "px";
                    popup.style.left = Math.max(4, rect.left - 224) + "px";
                    document.body.appendChild(popup);
                    slotPickerPopup = popup;
                    // Close when clicking outside the popup
                    const onOutside = (ev: MouseEvent): void => {
                        if (!popup.contains(ev.target as Node)) {
                            closeSlotPicker();
                            document.removeEventListener("click", onOutside, true);
                        }
                    };
                    window.setTimeout(() => document.addEventListener("click", onOutside, true), 80);
                });

                const delBtn = document.createElement("button");
                delBtn.className = "ebc-slot-del";
                delBtn.textContent = "x";
                delBtn.title = "Remove this slot";

                // ▲ / ▼ reorder buttons
                const moveUpBtn = document.createElement("button");
                moveUpBtn.className = "ebc-slot-move";
                moveUpBtn.textContent = t("core.moveUp");
                moveUpBtn.title = t("core.moveUpTitle");
                moveUpBtn.disabled = i === 0;

                const moveDownBtn = document.createElement("button");
                moveDownBtn.className = "ebc-slot-move";
                moveDownBtn.textContent = t("core.moveDown");
                moveDownBtn.title = t("core.moveDownTitle");
                moveDownBtn.disabled = i === slotCount - 1;

                topLine.appendChild(toggle);
                topLine.appendChild(labelInp);
                topLine.appendChild(colorWrap);
                topLine.appendChild(moveUpBtn);
                topLine.appendChild(moveDownBtn);
                topLine.appendChild(delBtn);

                // Bottom line: style selector | content (varies by style)
                const botLine = document.createElement("div");
                botLine.className = "ebc-slot-bottom";

                const currentStyle: ActionStyle = (btn.style as ActionStyle) ?? "action";
                const isSeq = currentStyle === "seq";

                if (isSeq) {
                    // seq: badge only — step builder below handles all config
                    const seqBadge = document.createElement("span");
                    seqBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7ac8;padding:1px 4px;";
                    seqBadge.textContent = t("buttons.seqBadge");
                    botLine.appendChild(seqBadge);
                } else {
                    // action / emote — restore classic () / ** toggle button
                    const styleBtn = document.createElement("button");
                    styleBtn.className = "ebc-slot-style" + (currentStyle === "emote" ? " emote" : "");
                    styleBtn.textContent = currentStyle === "emote" ? "**" : "()";
                    styleBtn.title = currentStyle === "emote"
                        ? "Emote (* Name text *) — click to switch to action"
                        : "Action (( Name text )) — click to switch to emote";
                    styleBtn.addEventListener("click", () => {
                        btns[idx].style = (btns[idx].style === "emote" ? "action" : "emote") as ActionStyle;
                        renderSlots();
                    });

                    const emoteInp = document.createElement("input");
                    emoteInp.className = "ebc-slot-emote";
                    emoteInp.type = "text"; emoteInp.maxLength = 240;
                    emoteInp.placeholder = "e.g. nods.";
                    emoteInp.value = btn.emote;
                    emoteInp.title = currentStyle === "emote" ? "Text sent as * Name text *" : "Text sent as ( Name text )";
                    emoteInp.addEventListener("input", () => { btns[idx].emote = emoteInp.value; });

                    const nameIncluded = btn.includeNameInAnnounce !== false;
                    const nameChip = document.createElement("button");
                    nameChip.className = "ebc-slot-style" + (nameIncluded ? "" : " emote");
                    nameChip.textContent = nameIncluded ? "name" : "anon";
                    nameChip.title = nameIncluded
                        ? "Your name is included — click to send anonymously"
                        : "Sending without name — click to include name";
                    nameChip.style.cssText = "width:auto;padding:0 5px;flex-shrink:0;";
                    nameChip.style.display = currentStyle === "action" ? "" : "none";
                    nameChip.addEventListener("click", () => {
                        const next = btns[idx].includeNameInAnnounce === false;
                        btns[idx].includeNameInAnnounce = next;
                        nameChip.className = "ebc-slot-style" + (next ? "" : " emote");
                        nameChip.textContent = next ? "name" : "anon";
                    });

                    botLine.appendChild(styleBtn);
                    botLine.appendChild(nameChip);
                    botLine.appendChild(emoteInp);
                }

                row.appendChild(topLine);
                row.appendChild(botLine);
                slotList.appendChild(row);

                // -- Seq step builder (only for seq style) --
                if (isSeq) {
                    const builderEl = this.buildSeqStepBuilder(btns, i);
                    slotList.appendChild(builderEl);
                }

                // -- Events (capture i) --
                const idx = i;

                moveUpBtn.addEventListener("click", () => {
                    if (idx === 0) return;
                    [btns[idx - 1], btns[idx]] = [btns[idx], btns[idx - 1]];
                    renderSlots();
                    updateFooterState();
                });

                moveDownBtn.addEventListener("click", () => {
                    if (idx >= slotCount - 1) return;
                    [btns[idx], btns[idx + 1]] = [btns[idx + 1], btns[idx]];
                    renderSlots();
                    updateFooterState();
                });

                toggle.addEventListener("click", () => {
                    btns[idx].enabled = !btns[idx].enabled;
                    toggle.className = "ebc-slot-toggle" + (btns[idx].enabled ? " on" : "");
                    toggle.textContent = btns[idx].enabled ? t("core.on") : t("core.off");
                });

                labelInp.addEventListener("input", () => {
                    btns[idx].label = labelInp.value.trim().slice(0, 6);
                });

                colorInp.addEventListener("input", () => {
                    let v = colorInp.value.trim();
                    if (!v.startsWith("#")) v = "#" + v;
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                        btns[idx].color = v;
                        colorDot.style.background = v;
                        colorInp.style.color = "#f7e6ee";
                    } else {
                        colorInp.style.color = "#cf3060";
                    }
                });

                let slotDelPending = false;
                let slotDelTimer: ReturnType<typeof window.setTimeout> | null = null;
                delBtn.addEventListener("click", () => {
                    if (!slotDelPending) {
                        slotDelPending = true;
                        delBtn.classList.add("confirm");
                        delBtn.textContent = "?";
                        delBtn.title = "Click again to remove this slot";
                        slotDelTimer = window.setTimeout(() => {
                            slotDelPending = false;
                            delBtn.classList.remove("confirm");
                            delBtn.textContent = "x";
                            delBtn.title = "Remove this slot";
                        }, 2500);
                    } else {
                        if (slotDelTimer !== null) window.clearTimeout(slotDelTimer);
                        btns.splice(idx, 1);
                        btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                        slotCount = Math.max(1, slotCount - 1);
                        renderSlots();
                        updateFooterState();
                    }
                });
            }
        };

        renderSlots();

        // Footer buttons
        const footer = document.createElement("div");
        footer.className = "ebc-btn-footer";

        const addBtn = document.createElement("button");
        addBtn.className = "ebc-btn-footer-btn";
        addBtn.textContent = `+ Add (${slotCount}/${ABSOLUTE_MAX})`;

        const saveBtn = document.createElement("button");
        saveBtn.className = "ebc-btn-footer-btn save";
        saveBtn.textContent = "Save";

        const resetBtn = document.createElement("button");
        resetBtn.className = "ebc-btn-footer-btn";
        resetBtn.textContent = "Reset";
        resetBtn.title = "Reset to defaults";

        footer.appendChild(addBtn);
        footer.appendChild(saveBtn);
        footer.appendChild(resetBtn);
        activeBodyEl.appendChild(footer);

        // Export / Import row — inside the active category body
        const ioRow = document.createElement("div");
        ioRow.className = "ebc-btn-footer";
        ioRow.style.marginTop = "3px";

        const exportBtn = document.createElement("button");
        exportBtn.className = "ebc-btn-footer-btn";
        exportBtn.textContent = t("core.export");
        exportBtn.title = "Copy button config to clipboard to share with others";

        const importToggleBtn = document.createElement("button");
        importToggleBtn.className = "ebc-btn-footer-btn";
        importToggleBtn.textContent = t("core.import");
        importToggleBtn.title = "Load a shared button config";

        ioRow.appendChild(exportBtn);
        ioRow.appendChild(importToggleBtn);
        activeBodyEl.appendChild(ioRow);

        // Import panel (collapsible)
        const importPanel = document.createElement("div");
        importPanel.className = "ebc-import-panel";
        activeBodyEl.appendChild(importPanel);

        const importHint = document.createElement("div");
        importHint.className = "ebc-import-hint";
        importHint.textContent = "Paste exported config here:";
        importPanel.appendChild(importHint);

        const importTextarea = document.createElement("textarea");
        importTextarea.className = "ebc-notes-textarea";
        importTextarea.placeholder = t("buttons.importHint");
        importTextarea.rows = 3;
        importPanel.appendChild(importTextarea);

        const importError = document.createElement("div");
        importError.className = "ebc-import-error";
        importPanel.appendChild(importError);

        const importActionRow = document.createElement("div");
        importActionRow.style.cssText = "display:flex;gap:5px;";
        const loadBtn = document.createElement("button");
        loadBtn.className = "ebc-create-btn";
        loadBtn.style.marginTop = "0";
        loadBtn.textContent = "Load";
        const cancelImportBtn = document.createElement("button");
        cancelImportBtn.className = "ebc-btn-footer-btn";
        cancelImportBtn.textContent = "Cancel";
        importActionRow.appendChild(loadBtn);
        importActionRow.appendChild(cancelImportBtn);
        importPanel.appendChild(importActionRow);

        const updateFooterState = (): void => {
            addBtn.disabled = slotCount >= ABSOLUTE_MAX;
            addBtn.textContent = `+ Add (${slotCount}/${ABSOLUTE_MAX})`;
        };

        updateFooterState();

        addBtn.addEventListener("click", () => {
            if (slotCount >= ABSOLUTE_MAX) return;
            slotCount++;
            renderSlots();
            updateFooterState();
            // Scroll to bottom so new slot is visible
            body.scrollTop = body.scrollHeight;
        });

        saveBtn.addEventListener("click", () => {
            // Flush any partially typed values from inputs before saving
            const rows = slotList.querySelectorAll<HTMLElement>(".ebc-slot-row");
            rows.forEach((row, i) => {
                const lInp = row.querySelector<HTMLInputElement>(".ebc-slot-label");
                const cInp = row.querySelector<HTMLInputElement>(".ebc-slot-color");
                const eInp = row.querySelector<HTMLInputElement>(".ebc-slot-emote");
                if (lInp) btns[i].label = lInp.value.trim().slice(0, 6);
                if (cInp) btns[i].color = normalizeHex(cInp.value);
                if (eInp && btns[i].style !== "seq") btns[i].emote = eInp.value;
            });
            // Save into the active category then persist all categories
            cats[activeCatIdx].buttons   = [...btns];
            cats[activeCatIdx].slotCount = slotCount;
            saveCategories([...cats], activeCatIdx);
                        saveBtn.textContent = "Saved!";
            window.setTimeout(() => { saveBtn.textContent = "Save"; }, 1200);
        });

        let resetPending = false;
        let resetTimer: ReturnType<typeof window.setTimeout> | null = null;
        resetBtn.addEventListener("click", () => {
            if (!resetPending) {
                resetPending = true;
                resetBtn.classList.add("confirm");
                resetBtn.textContent = "Sure?";
                resetBtn.title = "Click again to restore defaults";
                resetTimer = window.setTimeout(() => {
                    resetPending = false;
                    resetBtn.classList.remove("confirm");
                    resetBtn.textContent = "Reset";
                    resetBtn.title = "Reset to defaults";
                }, 2500);
            } else {
                if (resetTimer !== null) window.clearTimeout(resetTimer);
                resetPending = false;
                resetBtn.classList.remove("confirm");
                resetBtn.textContent = "Reset";
                resetBtn.title = "Reset to defaults";
                importPanel.classList.remove("open");
                importToggleBtn.classList.remove("open");
                btns = DEFAULT_BUTTONS.map(b => ({ ...b }));
                slotCount = DEFAULT_BUTTONS.length;
                cats[activeCatIdx].buttons   = [...btns];
                cats[activeCatIdx].slotCount = slotCount;
                saveCategories([...cats], activeCatIdx);
                            renderSlots();
                updateFooterState();
            }
        });

        // -- Export ---------------------------------------------------------------
        exportBtn.addEventListener("click", () => {
            const payload = JSON.stringify({
                ebc: 1,
                slotCount,
                buttons: btns.slice(0, slotCount).map(b => ({
                    label: b.label,
                    emote: b.emote,
                    color: b.color,
                    enabled: b.enabled,
                    style: b.style ?? "action",
                })),
            });

            const showInPanel = (): void => {
                importTextarea.value = payload;
                importError.textContent = "";
                importPanel.classList.add("open");
                importToggleBtn.classList.add("open");
                importTextarea.select();
            };

            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(payload).then(() => {
                    exportBtn.textContent = t("core.copied");
                    window.setTimeout(() => { exportBtn.textContent = t("core.export"); }, 1500);
                }).catch(showInPanel).catch(() => { /* ignore */ });
            } else {
                showInPanel();
            }
        });

        // -- Import ---------------------------------------------------------------
        importToggleBtn.addEventListener("click", () => {
            const willOpen = !importPanel.classList.contains("open");
            importPanel.classList.toggle("open", willOpen);
            importToggleBtn.classList.toggle("open", willOpen);
            if (willOpen) {
                importTextarea.value = "";
                importError.textContent = "";
                importTextarea.focus();
            }
        });

        cancelImportBtn.addEventListener("click", () => {
            importPanel.classList.remove("open");
            importToggleBtn.classList.remove("open");
            importTextarea.value = "";
            importError.textContent = "";
        });

        loadBtn.addEventListener("click", () => {
            importError.textContent = "";
            try {
                const raw = importTextarea.value.trim();
                if (!raw) { importError.textContent = "Nothing to import."; return; }

                const data = JSON.parse(raw) as Record<string, unknown>;
                if (data.ebc !== 1) throw new Error("Not a valid EBC button export (missing version tag).");
                if (!Array.isArray(data.buttons)) throw new Error("Missing buttons array.");

                const imported: ActionButton[] = (data.buttons as unknown[]).map((item) => {
                    const b = item as Record<string, unknown>;
                    const style = (["action", "emote", "seq"].includes(b.style as string)
                        ? b.style : "action") as ActionStyle;
                    return {
                        label:   typeof b.label === "string" ? b.label.slice(0, 6) : "",
                        emote:   typeof b.emote === "string" ? b.emote.slice(0, 240) : "",
                        color:   typeof b.color === "string" ? normalizeHex(b.color) : "#c2185b",
                        enabled: !!b.enabled,
                        style,
                    };
                });

                const newCount = typeof data.slotCount === "number"
                    ? Math.min(Math.max(1, Math.round(data.slotCount)), ABSOLUTE_MAX)
                    : Math.min(imported.length, ABSOLUTE_MAX);

                btns = imported;
                slotCount = newCount;
                while (btns.length < slotCount) {
                    btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                }

                saveButtons([...btns], slotCount);
                importPanel.classList.remove("open");
                importToggleBtn.classList.remove("open");
                importTextarea.value = "";
                renderSlots();
                updateFooterState();

                loadBtn.textContent = "Loaded!";
                window.setTimeout(() => { loadBtn.textContent = "Load"; }, 1200);
            } catch (err) {
                importError.textContent = err instanceof Error ? err.message : t("outfits.invalidFormat");
            }
        });

        // -- Fun Actions --------------------------------------------------------
        const funLbl = document.createElement("div");
        funLbl.className = "ebc-section-label";
        funLbl.style.marginTop = "10px";
        funLbl.textContent = t("buttons.funActions");
        body.appendChild(funLbl);

        const boopBtn = document.createElement("button");
        boopBtn.className = "ebc-create-btn";
        boopBtn.style.cssText = "margin:4px 0 0; width:100%;";
        boopBtn.title = "Send a unique boop message to every friend currently in the room";
        boopBtn.textContent = t("kitty.boopAll");
        boopBtn.addEventListener("click", () => {
            const booped = this.boopFriendsInRoom();
            if (booped === 0) {
                boopBtn.textContent = t("buttons.noFriendsHere");
            } else {
                boopBtn.textContent = t("buttons.boopedN", { n: booped });
            }
            window.setTimeout(() => { boopBtn.textContent = t("kitty.boopAll"); }, 2000);
        });
        body.appendChild(boopBtn);

        // -- Useful Buttons ------------------------------------------------------
        const usefulLbl = document.createElement("div");
        usefulLbl.className = "ebc-section-label";
        usefulLbl.style.marginTop = "10px";
        usefulLbl.textContent = t("buttons.usefulButtons");
        usefulLbl.dataset.guideTarget = "section-useful-btns";
        body.appendChild(usefulLbl);

        const oocBtn = document.createElement("button");
        oocBtn.className = "ebc-create-btn";
        oocBtn.style.cssText = "margin:4px 0 0; width:100%;";
        const refreshOoc = (): void => {
            const on = getOocEnabled();
            oocBtn.textContent = on ? t("buttons.oocModeOn") : t("buttons.oocModeOff");
            oocBtn.style.opacity = on ? "1" : "0.6";
        };
        refreshOoc();
        oocBtn.addEventListener("click", () => { setOocEnabled(!getOocEnabled()); refreshOoc(); });
        body.appendChild(oocBtn);

        const copyMemberBtn = document.createElement("button");
        copyMemberBtn.className = "ebc-create-btn";
        copyMemberBtn.style.cssText = "margin:4px 0 0; width:100%;";
        copyMemberBtn.textContent = t("buttons.copyMemberNumber");
        copyMemberBtn.addEventListener("click", () => {
            try {
                navigator.clipboard.writeText(String(Player.MemberNumber));
                copyMemberBtn.textContent = t("core.copied");
            } catch {
                copyMemberBtn.textContent = `#${Player.MemberNumber}`;
            }
            window.setTimeout(() => { copyMemberBtn.textContent = t("buttons.copyMemberNumber"); }, 2000);
        });
        body.appendChild(copyMemberBtn);

        const clearPoseBtn = document.createElement("button");
        clearPoseBtn.className = "ebc-create-btn";
        clearPoseBtn.style.cssText = "margin:4px 0 0; width:100%;";
        clearPoseBtn.textContent = t("buttons.resetDefaultPose");
        clearPoseBtn.title = t("buttons.resetDefaultPoseTitle");
        clearPoseBtn.addEventListener("click", () => {
            try {
                (Player as unknown as Record<string, unknown>).ActivePose = [];
                CharacterRefresh(Player, false);
                ChatRoomCharacterUpdate(Player);
                ServerPlayerAppearanceSync();
            } catch { /* ignore */ }
        });
        body.appendChild(clearPoseBtn);

        // ── Slow Leave trigger button — lives with Useful Buttons ─────────────
        const slLeaveBtn = document.createElement("button");
        slLeaveBtn.className = "ebc-create-btn";
        slLeaveBtn.style.cssText = "margin:4px 0 0; width:100%;";
        const seqRunning = isSeqRunning();
        slLeaveBtn.textContent = seqRunning ? t("sl.cancel") : t("sl.leave");
        slLeaveBtn.title = t("sl.leaveTitle");
        slLeaveBtn.dataset.guideTarget = "btn-slow-leave";
        if (seqRunning) {
            slLeaveBtn.style.background = "#4a1a2a";
            slLeaveBtn.style.color = "#ff8aaa";
        }
        slLeaveBtn.addEventListener("click", () => {
            if (isSeqRunning()) {
                cancelSequence();
                slLeaveBtn.textContent = t("sl.leave");
                slLeaveBtn.style.background = "";
                slLeaveBtn.style.color = "";
                return;
            }
            const livePresets = getSlowLeavePresets();
            const durMs = Math.max(500, (parseInt(localStorage.getItem("EBC_slowLeaveDuration") ?? "5", 10)) * 1000);
            const pIdx  = Math.min(livePresets.length - 1, Math.max(0, parseInt(localStorage.getItem("EBC_slowLeavePreset") ?? "0", 10)));
            const seq   = livePresets[pIdx].seq.replace("{DUR}", String(durMs));
            setSeqDoneCallback(() => {
                slLeaveBtn.textContent = t("sl.leave");
                slLeaveBtn.style.background = "";
                slLeaveBtn.style.color = "";
            });
            slLeaveBtn.textContent = t("sl.cancel");
            slLeaveBtn.style.background = "#4a1a2a";
            slLeaveBtn.style.color = "#ff8aaa";
            runSequence(seq);
        });
        body.appendChild(slLeaveBtn);

        // ── Slow Leave editor — collapsible accordion card ────────────────────
        const slEditorOpen = localStorage.getItem("EBC_slowLeaveEditorOpen") === "1";

        const slEditorCard = document.createElement("div");
        slEditorCard.style.cssText = "border:1px solid " + (slEditorOpen ? "#5a2840" : "#2a1421") + ";border-radius:7px;margin-top:6px;overflow:hidden;";

        // Header row — click to expand/collapse
        const slEditorHdr = document.createElement("div");
        slEditorHdr.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;padding:5px 8px;background:" + (slEditorOpen ? "#2a0e1e" : "#1b0d17") + ";";

        const slEditorChev = document.createElement("span");
        slEditorChev.style.cssText = "font-size:9px;color:#7a5060;flex-shrink:0;";
        slEditorChev.textContent = slEditorOpen ? "▼" : "▶";

        const slEditorLbl = document.createElement("span");
        slEditorLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;color:#c09098;flex:1;";
        slEditorLbl.textContent = t("sl.header");

        slEditorHdr.appendChild(slEditorChev);
        slEditorHdr.appendChild(slEditorLbl);
        slEditorCard.appendChild(slEditorHdr);

        // Editor body
        const slEditorBody = document.createElement("div");
        slEditorBody.style.cssText = "display:" + (slEditorOpen ? "flex" : "none") + ";flex-direction:column;gap:4px;padding:7px 8px 8px;";

        const DD_CSS = "width:100%;font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;color:#c09098;border:1px solid #3a1928;border-radius:3px;padding:2px 4px;cursor:pointer;box-sizing:border-box;";

        const slPresetDropdown = document.createElement("select");
        slPresetDropdown.style.cssText = DD_CSS;
        const populateSlPresets = (): void => {
            while (slPresetDropdown.firstChild) slPresetDropdown.removeChild(slPresetDropdown.firstChild);
            getSlowLeavePresets().forEach((p, i) => {
                const o = document.createElement("option"); o.value = String(i); o.textContent = p.label; slPresetDropdown.appendChild(o);
            });
            slPresetDropdown.value = localStorage.getItem("EBC_slowLeavePreset") ?? "0";
        };
        populateSlPresets();
        slPresetDropdown.addEventListener("change", () => {
            try { localStorage.setItem("EBC_slowLeavePreset", slPresetDropdown.value); } catch { /* ignore */ }
            const lp = getSlowLeavePresets();
            const pi = parseInt(slPresetDropdown.value, 10);
            slSeqArea.value = lp[pi]?.seq ?? "";
        });
        slEditorBody.appendChild(slPresetDropdown);

        const slSeqArea = document.createElement("textarea");
        slSeqArea.rows = 3;
        slSeqArea.spellcheck = false;
        slSeqArea.style.cssText = "width:100%;box-sizing:border-box;font-family:'Trebuchet MS',serif;font-size:8px;background:#1b0d17;color:#c09098;border:1px solid #3a1928;border-radius:3px;padding:3px 4px;resize:vertical;min-height:42px;";
        slSeqArea.title = t("sl.seqHint");
        const slSeqInitPresets = getSlowLeavePresets();
        const slSeqInitIdx = parseInt(localStorage.getItem("EBC_slowLeavePreset") ?? "0", 10);
        slSeqArea.value = slSeqInitPresets[slSeqInitIdx]?.seq ?? "";
        slSeqArea.addEventListener("change", () => {
            const lp = getSlowLeavePresets();
            const pi = parseInt(slPresetDropdown.value, 10);
            if (pi >= 0 && pi < lp.length) {
                lp[pi].seq = slSeqArea.value;
                saveSlowLeavePresets(lp);
            }
        });
        slEditorBody.appendChild(slSeqArea);

        const slDurRow = document.createElement("div");
        slDurRow.style.cssText = "display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;";
        const slDurLbl = document.createElement("span");
        slDurLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;flex-shrink:0;user-select:none;";
        slDurLbl.textContent = "⏱";
        slDurLbl.title = t("sl.header");
        const slDurSlider = document.createElement("input");
        slDurSlider.type = "range"; slDurSlider.min = "2"; slDurSlider.max = "30"; slDurSlider.step = "1";
        slDurSlider.value = localStorage.getItem("EBC_slowLeaveDuration") ?? "5";
        slDurSlider.style.cssText = "flex:1;accent-color:#cf6f98;cursor:pointer;min-width:0;";
        const slDurVal = document.createElement("span");
        slDurVal.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;min-width:24px;text-align:right;flex-shrink:0;";
        slDurVal.textContent = slDurSlider.value + "s";
        slDurSlider.addEventListener("input", () => {
            slDurVal.textContent = slDurSlider.value + "s";
            try { localStorage.setItem("EBC_slowLeaveDuration", slDurSlider.value); } catch { /* ignore */ }
        });
        slDurRow.appendChild(slDurLbl); slDurRow.appendChild(slDurSlider); slDurRow.appendChild(slDurVal);
        slEditorBody.appendChild(slDurRow);

        slEditorCard.appendChild(slEditorBody);
        body.appendChild(slEditorCard);

        slEditorHdr.addEventListener("click", () => {
            const open = slEditorBody.style.display === "none";
            slEditorBody.style.display = open ? "flex" : "none";
            slEditorChev.textContent = open ? "▼" : "▶";
            slEditorHdr.style.background = open ? "#2a0e1e" : "#1b0d17";
            slEditorCard.style.borderColor = open ? "#5a2840" : "#2a1421";
            try { localStorage.setItem("EBC_slowLeaveEditorOpen", open ? "1" : "0"); } catch { /* ignore */ }
        });

    }


    private renderKittyTab(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);
        this.renderKittySection(body);
    }

    private renderKittySection(body: HTMLElement): void {
        // ── Header ───────────────────────────────────────────────────────────────
        const hdr = document.createElement("div");
        hdr.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 8px;background:linear-gradient(90deg,#2a0e1e,#1b0d17);border:1px solid #6b3048;border-radius:6px;margin-bottom:6px;";
        const hdrIcon = document.createElement("span");
        hdrIcon.textContent = "🐱";
        hdrIcon.style.fontSize = "16px";
        const hdrLbl = document.createElement("span");
        hdrLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;color:#cf6f98;letter-spacing:0.06em;flex:1;";
        hdrLbl.textContent = "KITTY";
        const hdrSub = document.createElement("span");
        hdrSub.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#6a3a50;font-style:italic;flex:1;";
        hdrSub.textContent = "for lucy's eyes only~";
        const beepEmeryBtn = document.createElement("button");
        beepEmeryBtn.textContent = "📟 Beep";
        beepEmeryBtn.title = "Open IM window to Emery";
        beepEmeryBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:3px 8px;border-radius:5px;cursor:pointer;border:1px solid #4c2537;background:transparent;color:#cf6f98;flex-shrink:0;";
        beepEmeryBtn.addEventListener("mouseenter", () => { beepEmeryBtn.style.background = "#3a1020"; beepEmeryBtn.style.borderColor = "#cf6f98"; });
        beepEmeryBtn.addEventListener("mouseleave", () => { beepEmeryBtn.style.background = "transparent"; beepEmeryBtn.style.borderColor = "#4c2537"; });
        beepEmeryBtn.addEventListener("click", () => { this.openBeepWindow(EMERY_MEMBER); });
        hdr.appendChild(hdrIcon);
        hdr.appendChild(hdrLbl);
        hdr.appendChild(hdrSub);
        hdr.appendChild(beepEmeryBtn);
        body.appendChild(hdr);

        // ── Mood toggle (big, obvious) ────────────────────────────────────────────
        const moodRow = document.createElement("div");
        moodRow.style.cssText = "display:flex;gap:6px;margin-bottom:10px;";

        const makeMoodBtn = (m: KittyMood, icon: string, label: string, color: string): HTMLButtonElement => {
            const b = document.createElement("button");
            const update = (): void => {
                const active = getKittyMood() === m;
                b.style.cssText = `font-family:'Trebuchet MS',serif;font-size:12px;font-weight:bold;padding:7px 0;border-radius:8px;cursor:pointer;transition:all 0.14s;border:2px solid ${active ? color : "#3a1928"};background:${active ? color + "30" : "rgba(20,8,16,0.5)"};color:${active ? color : "#5a3a4a"};flex:1;`;
            };
            b.textContent = icon + " " + label;
            update();
            b.addEventListener("click", () => {
                setKittyMood(m);
                [kindBtn, roughBtn].forEach(x => {
                    const isActive = getKittyMood() === (x === kindBtn ? "kind" : "rough");
                    const col = x === kindBtn ? "#79c8a0" : "#e07070";
                    x.style.borderColor = isActive ? col : "#3a1928";
                    x.style.background  = isActive ? col + "30" : "rgba(20,8,16,0.5)";
                    x.style.color       = isActive ? col : "#5a3a4a";
                });
            });
            return b;
        };

        const kindBtn  = makeMoodBtn("kind",  "🌸", "Kind",  "#79c8a0");
        const roughBtn = makeMoodBtn("rough", "⚡", "Rough", "#e07070");
        moodRow.appendChild(kindBtn);
        moodRow.appendChild(roughBtn);
        body.appendChild(moodRow);

        // ── Grab / Release Leash ─────────────────────────────────────────────────
        const leashRow = document.createElement("div");
        leashRow.style.cssText = "display:flex;gap:6px;margin-bottom:8px;";
        const leashBtn = document.createElement("button");
        leashBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:13px;font-weight:bold;padding:9px 0;border-radius:8px;cursor:pointer;border:2px solid #8a5a7888;background:rgba(80,40,60,0.35);color:#c090b0;transition:background 0.12s,border-color 0.12s;";

        // Helper: check whether Lucy is currently holding Emery's leash.
        // ChatRoomLeashList is only reliable on the TARGET's client, not here,
        // so we use our own class-level flag as the primary source of truth.
        const isLeashHeld = (): boolean => this._leashHeld;

        // Sync button label/style to current leash state
        const refreshLeashBtn = (): void => {
            const held = isLeashHeld();
            leashBtn.textContent = held ? t("kitty.letGoLeash") : t("kitty.grabLeash");
            leashBtn.style.borderColor = held ? "#e07070aa" : "#8a5a7888";
            leashBtn.style.color       = held ? "#e0a090"   : "#c090b0";
        };
        refreshLeashBtn();

        leashBtn.addEventListener("mouseenter", () => {
            leashBtn.style.background = isLeashHeld() ? "rgba(120,40,40,0.45)" : "rgba(120,50,80,0.5)";
        });
        leashBtn.addEventListener("mouseleave", () => {
            leashBtn.style.background = "rgba(80,40,60,0.35)";
        });
        leashBtn.addEventListener("click", () => {
            if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
            const mood = getKittyMood();
            const held = isLeashHeld();
            if (held) {
                // Release leash
                sendRoomEmote(mood === "rough"
                    ? "drops Emery's leash with a sharp flick, giving her collar a rough adjustment back to its usual fit~"
                    : "gently releases Emery's leash, carefully loosening her collar back to its comfortable fit~");
                try {
                    ServerSend("ChatRoomChat", { Content: "StopHoldLeash", Type: "Hidden", Target: EMERY_MEMBER });
                } catch { /* ignore */ }
                this._leashHeld = false;
                // Loosen neck — Caress to signal collar relief; LSCG_ReleaseNeck clears any choke pairing
                runKittyActivity("ItemNeck", "Caress");
                runKittyActivity("ItemNeck", "LSCG_ReleaseNeck");
            } else {
                // Grab leash — BC's HoldLeash hidden-message protocol
                sendRoomEmote(mood === "rough"
                    ? "snatches up Emery's leash with a firm grip~"
                    : "reaches out and gently takes hold of Emery's leash~");
                try {
                    ServerSend("ChatRoomChat", { Content: "HoldLeash", Type: "Hidden", Target: EMERY_MEMBER });
                } catch { /* ignore */ }
                this._leashHeld = true;
            }
            refreshLeashBtn();
        });
        leashRow.appendChild(leashBtn);

        // Pull Leash — triggers echo-activity-ext's "拉到身边" (Pull to One's Side) activity.
        // Sends a standard BC Activity message; echo-activity-ext hooks ChatRoomMessage on both
        // clients and runs the pair-and-follow handler when it sees this content.
        const pullBtn = document.createElement("button");
        pullBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:13px;font-weight:bold;padding:9px 12px;border-radius:8px;cursor:pointer;border:2px solid #7a6a3888;background:rgba(60,50,30,0.35);color:#b0a070;flex-shrink:0;transition:background 0.12s,border-color 0.12s;";
        pullBtn.textContent = t("kitty.pull");
        pullBtn.title = "Pull Emery to your side (requires echo-activity-ext on both ends; leash must be held)";
        pullBtn.addEventListener("mouseenter", () => { pullBtn.style.background = "rgba(100,80,30,0.5)"; });
        pullBtn.addEventListener("mouseleave", () => { pullBtn.style.background = "rgba(60,50,30,0.35)"; });
        pullBtn.addEventListener("click", () => {
            if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
            if (!isLeashHeld()) {
                pullBtn.textContent = t("kitty.holdLeashFirst");
                window.setTimeout(() => { pullBtn.textContent = t("kitty.pull"); }, 1500);
                return;
            }
            const mood = getKittyMood();
            sendRoomEmote(mood === "rough"
                ? "gives Emery's leash a firm yank, pulling her sharply to her side~"
                : "gives a gentle tug on Emery's leash, coaxing her softly to her side~");
            try {
                // echo-activity-ext's run() handler reads SourceCharacter and TargetCharacter
                // as DIRECT object properties in the Dictionary (not Tag-based entries).
                // BC's type guards use IsSourceCharacterDictionaryEntry / IsTargetCharacterDictionaryEntry
                // which check for "SourceCharacter" in entry (direct property), not entry.Tag.
                ServerSend("ChatRoomChat", {
                    Content: "拉到身边",
                    Type: "Activity",
                    Target: EMERY_MEMBER,
                    Dictionary: [
                        { ActivityName: "拉到身边" },
                        { Tag: "FocusAssetGroup", AssetGroupName: "ItemNeckRestraints" },
                        { SourceCharacter: Player.MemberNumber },
                        { TargetCharacter: EMERY_MEMBER },
                    ],
                });
            } catch { /* ignore */ }
        });
        leashRow.appendChild(pullBtn);

        body.appendChild(leashRow);

        // Helper: styled section header with optional edit toggle
        const makeSectionHdr = (
            title: string,
            onAdd: (() => void) | null,
            onEditToggle: ((editing: boolean) => void) | null,
        ): { el: HTMLElement; setEditing: (v: boolean) => void } => {
            const el = document.createElement("div");
            el.style.cssText = "display:flex;align-items:center;gap:5px;margin-bottom:5px;";
            const lbl = document.createElement("span");
            lbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:12px;font-weight:bold;color:#b07090;letter-spacing:0.05em;text-transform:uppercase;flex:1;";
            lbl.textContent = title;
            el.appendChild(lbl);
            let editing = false;
            const editBtn = document.createElement("button");
            editBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:transparent;color:#7a5a6a;transition:all 0.12s;";
            editBtn.textContent = t("core.edit");
            if (onEditToggle) {
                editBtn.addEventListener("click", () => {
                    editing = !editing;
                    editBtn.textContent = editing ? t("core.done") : t("core.edit");
                    editBtn.style.color = editing ? "#cf6f98" : "#7a5a6a";
                    editBtn.style.borderColor = editing ? "#cf6f98" : "#4c2537";
                    onEditToggle(editing);
                });
                el.appendChild(editBtn);
            }
            if (onAdd) {
                const addBtn = document.createElement("button");
                addBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:transparent;color:#7a5a6a;transition:all 0.12s;";
                addBtn.textContent = t("core.add");
                addBtn.addEventListener("mouseenter", () => { addBtn.style.color = "#cf6f98"; addBtn.style.borderColor = "#cf6f98"; });
                addBtn.addEventListener("mouseleave", () => { addBtn.style.color = "#7a5a6a"; addBtn.style.borderColor = "#4c2537"; });
                addBtn.addEventListener("click", onAdd);
                el.appendChild(addBtn);
            }
            return { el, setEditing: (v) => { editing = v; editBtn.textContent = v ? "✔ Done" : t("core.edit"); editBtn.style.color = v ? "#cf6f98" : "#7a5a6a"; editBtn.style.borderColor = v ? "#cf6f98" : "#4c2537"; } };
        };

        // Helper: pill-style action button (big, easy to tap).
        // cooldownMs: if > 0, button is briefly disabled after click to prevent
        // accidental double-firing and give visual confirmation the click registered.
        const makePill = (label: string, color: string, onClick: () => void, cooldownMs = 0): HTMLButtonElement => {
            const b = document.createElement("button");
            b.style.cssText = `font-family:'Trebuchet MS',serif;font-size:12px;font-weight:bold;padding:7px 14px;border-radius:8px;cursor:pointer;border:2px solid ${color}66;background:${color}22;color:${color};transition:background 0.12s,border-color 0.12s,transform 0.08s;white-space:nowrap;`;
            b.textContent = label;
            b.addEventListener("mouseenter", () => { if (!b.disabled) { b.style.background = `${color}38`; b.style.borderColor = color; b.style.transform = "scale(1.04)"; } });
            b.addEventListener("mouseleave", () => { if (!b.disabled) { b.style.background = `${color}22`; b.style.borderColor = `${color}66`; b.style.transform = ""; } });
            b.addEventListener("click", () => {
                if (b.disabled) return;
                if (cooldownMs > 0) {
                    b.disabled = true;
                    b.style.opacity = "0.5";
                    b.style.transform = "";
                    b.style.cursor = "default";
                    setTimeout(() => {
                        b.disabled = false;
                        b.style.opacity = "";
                        b.style.cursor = "pointer";
                    }, cooldownMs);
                }
                onClick();
            });
            return b;
        };

        const divider = (): HTMLElement => {
            const d = document.createElement("div");
            d.style.cssText = "height:1px;background:#2a1421;margin:8px 0;";
            return d;
        };

        const INP = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;border:1px solid #3a1928;border-radius:3px;color:#f7e6ee;padding:2px 4px;outline:none;";

        const sendRoomEmote = (text: string): void => {
            if (!text) return;
            try { ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] }); } catch { /* ignore */ }
        };


        // Helper: run a BC activity on Emery (who must be in the room)
        const runKittyActivity = (bcGroup: string, bcActivity: string): void => {
            try {
                if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
                const w = window as unknown as Record<string, unknown>;
                const room = w.ChatRoomCharacter as Character[] | undefined;
                const emery = room?.find(c => c.MemberNumber === EMERY_MEMBER);
                if (!emery) return;
                const ActivityRun = w.ActivityRun as ((actor: Character, acted: Character, group: { Name: string }, item: { Activity: unknown; Item: null }) => void) | undefined;
                const AssetGetActivity = w.AssetGetActivity as ((family: string, name: string) => unknown) | undefined;
                if (!ActivityRun || !AssetGetActivity) return;
                const act = AssetGetActivity((Player as unknown as Record<string, unknown>).AssetFamily as string ?? "Female3DCG", bcActivity);
                if (!act) return;
                ActivityRun(Player, emery, { Name: bcGroup }, { Activity: act, Item: null });
            } catch { /* ignore */ }
        };

        // Helper: send a single expression OR fire all commands in a named preset
        // expr can be "Group:State" (single) or "preset:<id>" (multi-expression preset)
        const sendExprOrPreset = (expr: string): void => {
            if (!expr) return;
            if (expr.startsWith("preset:")) {
                const id = expr.slice(7);
                const preset = getKittyExpressionPresets().find(p => p.id === id);
                if (preset) preset.commands.forEach(c => { if (c) sendKittyCmd("expression", c); });
            } else {
                sendKittyCmd("expression", expr);
            }
        };

        // Helper: collapsible section wrapper with optional edit-toggle button in the header
        const makeCollapsible = (
            key: string,
            title: string,
            defaultOpen: boolean,
            onEditToggle?: (editing: boolean) => void,
        ): { wrap: HTMLElement; cBody: HTMLElement } => {
            const open = (localStorage.getItem(key) ?? (defaultOpen ? "1" : "0")) === "1";
            const wrap = document.createElement("div");
            wrap.style.cssText = "border:1px solid #2a1421;border-radius:6px;margin-bottom:6px;overflow:hidden;";
            const ch = document.createElement("div");
            ch.style.cssText = "display:flex;align-items:center;gap:5px;padding:5px 8px;cursor:pointer;background:rgba(20,8,16,0.7);user-select:none;" + (open ? "border-bottom:1px solid #2a1421;" : "");
            const chLbl = document.createElement("span");
            chLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;color:#b07090;letter-spacing:0.05em;text-transform:uppercase;flex:1;";
            chLbl.textContent = title;
            ch.appendChild(chLbl);
            if (onEditToggle) {
                let editing = false;
                const editBtn = document.createElement("button");
                editBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:transparent;color:#7a5a6a;flex-shrink:0;";
                editBtn.textContent = t("core.edit");
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    editing = !editing;
                    editBtn.textContent = editing ? t("core.done") : t("core.edit");
                    editBtn.style.color = editing ? "#cf6f98" : "#7a5a6a";
                    editBtn.style.borderColor = editing ? "#cf6f98" : "#4c2537";
                    onEditToggle(editing);
                });
                ch.appendChild(editBtn);
            }
            const chArrow = document.createElement("span");
            chArrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex-shrink:0;";
            chArrow.textContent = open ? "▲" : "▼";
            ch.appendChild(chArrow);
            wrap.appendChild(ch);
            const cBody = document.createElement("div");
            cBody.style.cssText = "display:" + (open ? "flex" : "none") + ";flex-direction:column;gap:5px;padding:7px 8px;";
            wrap.appendChild(cBody);
            ch.addEventListener("click", () => {
                const isOpen = cBody.style.display !== "none";
                cBody.style.display = isOpen ? "none" : "flex";
                chArrow.textContent = isOpen ? "▼" : "▲";
                ch.style.borderBottom = isOpen ? "" : "1px solid #2a1421";
                try { localStorage.setItem(key, isOpen ? "0" : "1"); } catch { /* ignore */ }
            });
            return { wrap, cBody };
        };

        // ── EMOTES ───────────────────────────────────────────────────────────────
        const emotesWrap = document.createElement("div");
        emotesWrap.style.marginBottom = "10px";

        const renderEmotes = (editing: boolean): void => {
            emotesWrap.innerHTML = "";
            const emotes = getKittyEmotes();

            if (!editing) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";
                for (const em of emotes) {
                    row.appendChild(makePill(em.label, "#c8a040", () => {
                        if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
                        const mood = getKittyMood();
                        const text = (mood === "rough" && em.roughText) ? em.roughText : em.text;
                        sendRoomEmote(text);
                        if (em.bcGroup && em.bcActivity) runKittyActivity(em.bcGroup, em.bcActivity);
                        if (em.interactive) sendKittyCmd("react", JSON.stringify({ label: em.label }));
                        // Fire a random pet reaction from the emote's assigned category
                        if (em.reactionCategory) {
                            const pool = getKittyReactions().filter(r => r.category === em.reactionCategory);
                            if (pool.length > 0) {
                                const pick = pool[Math.floor(Math.random() * pool.length)];
                                sendKittyCmd("emote", pick.text);
                            }
                        }
                    }, 1500));
                }
                emotesWrap.appendChild(row);
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:3px;";
                hint.textContent = "Sends emote to room; mood-aware text";
                emotesWrap.appendChild(hint);
                return;
            }

            // Edit mode
            const list = document.createElement("div");
            list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
            const cur = getKittyEmotes();
            cur.forEach((em, idx) => {
                const r = document.createElement("div");
                r.style.cssText = "display:flex;flex-direction:column;gap:3px;background:rgba(42,20,33,0.4);border:1px solid #2a1421;border-radius:5px;padding:5px 7px;";

                // Row 1: label + delete
                const r1 = document.createElement("div"); r1.style.cssText = "display:flex;align-items:center;gap:4px;";
                const lblInp = document.createElement("input"); lblInp.value = em.label; lblInp.style.cssText = "width:90px;flex-shrink:0;" + INP;
                const delBtn = document.createElement("button"); delBtn.style.cssText = "font-size:11px;line-height:1;padding:0 4px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;"; delBtn.textContent = "×";
                r1.appendChild(lblInp); r1.appendChild(delBtn);

                // Row 2: kind text
                const kindRow = document.createElement("div"); kindRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const kindLbl = document.createElement("span"); kindLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#79c8a0;flex-shrink:0;width:38px;"; kindLbl.textContent = "🌸 Kind:";
                const kindInp = document.createElement("input"); kindInp.value = em.text; kindInp.placeholder = "Kind mode text…"; kindInp.style.cssText = "flex:1;min-width:0;" + INP;
                kindRow.appendChild(kindLbl); kindRow.appendChild(kindInp);

                // Row 3: rough text
                const roughRow = document.createElement("div"); roughRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const roughLbl = document.createElement("span"); roughLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#e07070;flex-shrink:0;width:38px;"; roughLbl.textContent = "⚡ Rough:";
                const roughInp = document.createElement("input"); roughInp.value = em.roughText ?? ""; roughInp.placeholder = "Rough mode text (optional)…"; roughInp.style.cssText = "flex:1;min-width:0;" + INP;
                roughRow.appendChild(roughLbl); roughRow.appendChild(roughInp);

                // Row 4: reaction category
                const catRow = document.createElement("div"); catRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const catLbl = document.createElement("span"); catLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#c09098;flex-shrink:0;width:38px;"; catLbl.textContent = "😊 React:";
                const catSel = document.createElement("select"); catSel.style.cssText = "flex:1;min-width:0;" + INP;
                for (const [v, t] of [["", "— none —"], ["punishment", "⚡ Punishment"], ["reward", "🌸 Reward"]] as [string, string][]) {
                    const o = document.createElement("option"); o.value = v; o.textContent = t; catSel.appendChild(o);
                }
                catSel.value = em.reactionCategory ?? "";
                catRow.appendChild(catLbl); catRow.appendChild(catSel);

                const saveRow = (): void => {
                    const updated = getKittyEmotes();
                    updated[idx].label = lblInp.value;
                    updated[idx].text  = kindInp.value;
                    updated[idx].roughText = roughInp.value;
                    updated[idx].reactionCategory = (catSel.value as "punishment" | "reward") || undefined;
                    saveKittyEmotes(updated);
                };
                [lblInp, kindInp, roughInp].forEach(i => i.addEventListener("input", saveRow));
                catSel.addEventListener("change", saveRow);
                delBtn.addEventListener("click", () => {
                    saveKittyEmotes(getKittyEmotes().filter((_, i) => i !== idx));
                    renderEmotes(true);
                });

                r.appendChild(r1); r.appendChild(kindRow); r.appendChild(roughRow); r.appendChild(catRow);
                list.appendChild(r);
            });

            const addRow = document.createElement("div"); addRow.style.cssText = "display:flex;align-items:center;gap:4px;";
            const newLbl = document.createElement("input"); newLbl.placeholder = "Label"; newLbl.style.cssText = "width:90px;flex-shrink:0;" + INP;
            const newText = document.createElement("input"); newText.placeholder = t("buttons.emoteText"); newText.style.cssText = "flex:1;min-width:0;" + INP;
            const addBtnE = document.createElement("button"); addBtnE.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; addBtnE.textContent = t("core.add");
            addBtnE.addEventListener("click", () => {
                if (!newLbl.value.trim()) return;
                const updated = getKittyEmotes();
                updated.push({ id: "e_" + Date.now(), label: newLbl.value.trim(), text: newText.value.trim(), type: "emote", roughText: "", expression: "" });
                saveKittyEmotes(updated);
                newLbl.value = ""; newText.value = "";
                renderEmotes(true);
            });
            addRow.appendChild(newLbl); addRow.appendChild(newText); addRow.appendChild(addBtnE);
            list.appendChild(addRow);
            emotesWrap.appendChild(list);
        };

        const { cBody: emotesCBody, wrap: emotesWrap2 } = makeCollapsible("EBC_kittyEmotesOpen", "🐾 Emotes", true, (ed) => renderEmotes(ed));
        renderEmotes(false);
        emotesCBody.appendChild(emotesWrap);
        body.appendChild(emotesWrap2);

        // ── PET REACTIONS ─────────────────────────────────────────────────────────
        const reactionsWrap = document.createElement("div");
        reactionsWrap.style.marginBottom = "10px";

        const renderReactions = (editing: boolean): void => {
            reactionsWrap.innerHTML = "";

            const reactions = getKittyReactions();
            const punishments = reactions.filter(r => r.category === "punishment");
            const rewards     = reactions.filter(r => r.category === "reward");

            const makeCatLabel = (text: string, color: string): HTMLElement => {
                const el = document.createElement("div");
                el.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;color:${color};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;margin-top:6px;`;
                el.textContent = text;
                return el;
            };

            if (!editing) {
                // ── View mode ──────────────────────────────────────────────────
                const renderCatRow = (entries: KittyReactionEntry[], color: string): HTMLElement => {
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;";
                    for (const r of entries) {
                        const b = document.createElement("button");
                        b.style.cssText = `font-family:'Trebuchet MS',serif;font-size:11px;padding:5px 10px;border-radius:7px;cursor:pointer;border:1px solid ${color}66;background:${color}18;color:${color};transition:background 0.12s,border-color 0.12s;`;
                        b.textContent = r.text;
                        b.title = r.text;
                        b.addEventListener("mouseenter", () => { b.style.background = `${color}30`; b.style.borderColor = color; });
                        b.addEventListener("mouseleave", () => { b.style.background = `${color}18`; b.style.borderColor = `${color}66`; });
                        b.addEventListener("click", () => {
                            if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
                            sendKittyCmd("emote", r.text);
                        });
                        row.appendChild(b);
                    }
                    return row;
                };

                reactionsWrap.appendChild(makeCatLabel("⚡ Punishment", "#e07070"));
                reactionsWrap.appendChild(renderCatRow(punishments, "#e07070"));
                reactionsWrap.appendChild(makeCatLabel("🌸 Reward", "#79c8a0"));
                reactionsWrap.appendChild(renderCatRow(rewards, "#79c8a0"));

                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:3px;";
                hint.textContent = "Sends a reaction emote from Emery";
                reactionsWrap.appendChild(hint);
                return;
            }

            // ── Edit mode ──────────────────────────────────────────────────────
            const renderCatEdit = (category: "punishment" | "reward", color: string, catLabel: string): HTMLElement => {
                const wrap = document.createElement("div");
                wrap.style.cssText = `display:flex;flex-direction:column;gap:4px;border:1px solid ${color}44;border-radius:6px;padding:6px 8px;`;

                const lbl = makeCatLabel(catLabel, color);
                lbl.style.marginTop = "0";
                wrap.appendChild(lbl);

                const cur = getKittyReactions();
                cur.forEach((r, idx) => {
                    if (r.category !== category) return;
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:4px;";
                    const inp = document.createElement("input");
                    inp.value = r.text;
                    inp.style.cssText = "flex:1;min-width:0;" + INP;
                    inp.addEventListener("input", () => {
                        const upd = getKittyReactions();
                        if (upd[idx]) { upd[idx].text = inp.value; saveKittyReactions(upd); }
                    });
                    const del = document.createElement("button");
                    del.textContent = "×";
                    del.style.cssText = "font-size:11px;line-height:1;padding:0 4px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;";
                    del.addEventListener("click", () => {
                        saveKittyReactions(getKittyReactions().filter((_, i) => i !== idx));
                        renderReactions(true);
                    });
                    row.appendChild(inp); row.appendChild(del);
                    wrap.appendChild(row);
                });

                // Add row
                const addRow = document.createElement("div");
                addRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-top:2px;";
                const newInp = document.createElement("input");
                newInp.placeholder = "New reaction text…";
                newInp.style.cssText = "flex:1;min-width:0;" + INP;
                const addBtn = document.createElement("button");
                addBtn.textContent = t("core.add");
                addBtn.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid ${color}66;background:transparent;color:${color};flex-shrink:0;`;
                addBtn.addEventListener("click", () => {
                    const text = newInp.value.trim();
                    if (!text) return;
                    const upd = getKittyReactions();
                    upd.push({ id: category[0] + "_" + Date.now(), text, category });
                    saveKittyReactions(upd);
                    newInp.value = "";
                    renderReactions(true);
                });
                addRow.appendChild(newInp); addRow.appendChild(addBtn);
                wrap.appendChild(addRow);
                return wrap;
            };

            reactionsWrap.appendChild(renderCatEdit("punishment", "#e07070", "⚡ Punishment"));
            reactionsWrap.appendChild(renderCatEdit("reward",     "#79c8a0", "🌸 Reward"));
        };

        const { cBody: reactionsCBody, wrap: reactionsWrap2 } = makeCollapsible("EBC_kittyReactionsOpen", "🐾 Pet Reactions", true, (ed) => renderReactions(ed));
        renderReactions(false);
        reactionsCBody.appendChild(reactionsWrap);
        body.appendChild(reactionsWrap2);

        // ── POSES ────────────────────────────────────────────────────────────────
        const posesWrap = document.createElement("div");
        posesWrap.style.marginBottom = "10px";

        const renderPoses = (editing: boolean): void => {
            posesWrap.innerHTML = "";
            const poses = getKittyPoses();

            if (!editing) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";
                for (const p of poses) {
                    // cooldown 700ms: covers the 600ms emote delay so the button stays
                    // visually disabled until the room emote fires — prevents double-sends.
                    row.appendChild(makePill(p.label, "#a070c8", () => {
                        // Guard: never send chat when not in a room
                        if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
                        // Apply pose + expression first, then narrate after a short delay so
                        // Emery's CharacterUpdate reaches everyone before the emote text appears.
                        const mood = getKittyMood();
                        const emoteText = mood === "rough" ? (p.roughEmote || p.kindEmote) : (p.kindEmote || p.roughEmote);
                        sendKittyCmd("pose", p.poses.join(","));
                        setTimeout(() => {
                            if (typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom") {
                                sendRoomEmote(emoteText);
                            }
                        }, 600);
                    }, 1500));
                }
                posesWrap.appendChild(row);
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:3px;";
                hint.textContent = "Applies the pose on Emery then sends a room emote";
                posesWrap.appendChild(hint);
                return;
            }

            const list = document.createElement("div");
            list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
            const cur = getKittyPoses();
            cur.forEach((p, idx) => {
                const r = document.createElement("div");
                r.style.cssText = "display:flex;flex-direction:column;gap:3px;background:rgba(42,20,33,0.4);border:1px solid #2a1421;border-radius:5px;padding:5px 7px;";

                // Row 1: label + pose names + del
                const r1 = document.createElement("div");
                r1.style.cssText = "display:flex;align-items:center;gap:4px;";
                const lblInp = document.createElement("input"); lblInp.value = p.label; lblInp.style.cssText = "width:90px;flex-shrink:0;" + INP;
                const poseInp = document.createElement("input"); poseInp.value = p.poses.join(","); poseInp.placeholder = "BC pose name (empty = neutral)"; poseInp.style.cssText = "flex:1;min-width:0;" + INP;
                const delBtn = document.createElement("button");
                delBtn.style.cssText = "font-size:11px;line-height:1;padding:0 4px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;";
                delBtn.textContent = "×";
                r1.appendChild(lblInp); r1.appendChild(poseInp); r1.appendChild(delBtn);

                // Row 2: kind emote
                const kindRow = document.createElement("div");
                kindRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const kindLbl = document.createElement("span"); kindLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#79c8a0;flex-shrink:0;width:38px;"; kindLbl.textContent = "🌸 Kind:";
                const kindInp = document.createElement("input"); kindInp.value = p.kindEmote; kindInp.placeholder = "Room emote in kind mode…"; kindInp.style.cssText = "flex:1;min-width:0;" + INP;
                kindRow.appendChild(kindLbl); kindRow.appendChild(kindInp);

                // Row 3: rough emote
                const roughRow = document.createElement("div");
                roughRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const roughLbl = document.createElement("span"); roughLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#e07070;flex-shrink:0;width:38px;"; roughLbl.textContent = "⚡ Rough:";
                const roughInp = document.createElement("input"); roughInp.value = p.roughEmote; roughInp.placeholder = "Room emote in rough mode…"; roughInp.style.cssText = "flex:1;min-width:0;" + INP;
                roughRow.appendChild(roughLbl); roughRow.appendChild(roughInp);

                const saveInp = (): void => {
                    const updated = getKittyPoses();
                    updated[idx].label = lblInp.value;
                    updated[idx].poses = poseInp.value ? poseInp.value.split(",").map(s => s.trim()).filter(Boolean) : [];
                    updated[idx].kindEmote  = kindInp.value;
                    updated[idx].roughEmote = roughInp.value;
                    saveKittyPoses(updated);
                };
                [lblInp, poseInp, kindInp, roughInp].forEach(i => i.addEventListener("input", saveInp));
                delBtn.addEventListener("click", () => {
                    saveKittyPoses(getKittyPoses().filter((_, i) => i !== idx));
                    renderPoses(true);
                });

                r.appendChild(r1); r.appendChild(kindRow); r.appendChild(roughRow);
                list.appendChild(r);
            });

            const addRow = document.createElement("div");
            addRow.style.cssText = "display:flex;align-items:center;gap:4px;";
            const newLbl2 = document.createElement("input"); newLbl2.placeholder = "Label"; newLbl2.style.cssText = "width:90px;flex-shrink:0;" + INP;
            const newPose = document.createElement("input"); newPose.placeholder = "BC pose (empty = neutral)"; newPose.style.cssText = "flex:1;min-width:0;" + INP;
            const addBtnP = document.createElement("button");
            addBtnP.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;";
            addBtnP.textContent = t("core.add");
            addBtnP.addEventListener("click", () => {
                if (!newLbl2.value.trim()) return;
                const updated = getKittyPoses();
                updated.push({ id: "p_" + Date.now(), label: newLbl2.value.trim(), poses: newPose.value ? newPose.value.split(",").map(s => s.trim()).filter(Boolean) : [], kindEmote: "", roughEmote: "" });
                saveKittyPoses(updated);
                newLbl2.value = ""; newPose.value = "";
                renderPoses(true);
            });
            addRow.appendChild(newLbl2); addRow.appendChild(newPose); addRow.appendChild(addBtnP);
            list.appendChild(addRow);
            posesWrap.appendChild(list);
        };

        const { cBody: posesCBody, wrap: posesWrap2 } = makeCollapsible("EBC_kittyPosesOpen", "🧘 Poses", true, (ed) => renderPoses(ed));
        renderPoses(false);
        posesCBody.appendChild(posesWrap);
        body.appendChild(posesWrap2);

        // ── ACTIONS (formerly Punishments) ───────────────────────────────────────
        const punishWrap = document.createElement("div");
        punishWrap.style.marginBottom = "10px";

        const colorToStr = (c: string | string[] | undefined): string =>
            Array.isArray(c) ? c.join(", ") : (c ?? "Default");
        const strToColor = (v: string): string | string[] => {
            const t = v.trim();
            if (!t || t === "Default") return "Default";
            if (t.includes(",")) return t.split(",").map(x => x.trim()).filter(Boolean);
            return t;
        };

        const renderPunishments = (editing: boolean): void => {
            punishWrap.innerHTML = "";
            const punishments = getKittyPunishments();

            if (!editing) {
                // ── View mode: pills ──────────────────────────────────────────
                const row = document.createElement("div");
                row.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;";
                for (const pun of punishments) {
                    row.appendChild(makePill(pun.label, "#d05070", () => {
                        // Guard: never send chat when not in a room
                        if (typeof CurrentScreen === "undefined" || CurrentScreen !== "ChatRoom") return;
                        const mood = getKittyMood();
                        // Send all emote steps to room in order
                        for (const step of pun.steps) {
                            if (step.type === "emote") {
                                const txt = (mood === "rough" && step.roughText) ? step.roughText : (step.kindText ?? "");
                                if (txt) sendRoomEmote(txt);
                            }
                        }
                        // Collect all restraint items from all restraint steps
                        const items: KittyItem[] = pun.steps
                            .filter(s => s.type === "restraint")
                            .reduce((acc: KittyItem[], s) => acc.concat(s.items ?? []), []);
                        sendKittyCmd("punish", JSON.stringify({ label: pun.label, mood, items, reaction: pun.reaction }));
                    }, 2000));
                }
                punishWrap.appendChild(row);
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:3px;";
                hint.textContent = "Sends room emotes + gives Emery a chance to fight back";
                punishWrap.appendChild(hint);
                return;
            }

            // ── Edit mode ─────────────────────────────────────────────────────
            const list = document.createElement("div");
            list.style.cssText = "display:flex;flex-direction:column;gap:8px;";
            const cur = getKittyPunishments();

            cur.forEach((pun, idx) => {
                const r = document.createElement("div");
                r.style.cssText = "display:flex;flex-direction:column;gap:4px;background:rgba(42,20,33,0.4);border:1px solid #2a1421;border-radius:5px;padding:6px 8px;";

                // Header: label + delete
                const hdr = document.createElement("div"); hdr.style.cssText = "display:flex;align-items:center;gap:4px;";
                const lblInp = document.createElement("input"); lblInp.value = pun.label; lblInp.placeholder = "Action name"; lblInp.style.cssText = "flex:1;min-width:0;" + INP;
                lblInp.addEventListener("input", () => { const upd = getKittyPunishments(); upd[idx].label = lblInp.value; saveKittyPunishments(upd); });
                const delBtn = document.createElement("button"); delBtn.style.cssText = "font-size:11px;line-height:1;padding:0 4px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;"; delBtn.textContent = "×";
                delBtn.addEventListener("click", () => { saveKittyPunishments(getKittyPunishments().filter((_, i) => i !== idx)); renderPunishments(true); });
                hdr.appendChild(lblInp); hdr.appendChild(delBtn);
                r.appendChild(hdr);

                // Steps header label
                const stepsHdr = document.createElement("div"); stepsHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;"; stepsHdr.textContent = "Steps";
                r.appendChild(stepsHdr);

                // Steps container
                const stepsWrap = document.createElement("div"); stepsWrap.style.cssText = "display:flex;flex-direction:column;gap:3px;";

                const rebuildSteps = (): void => {
                    stepsWrap.innerHTML = "";
                    const steps = getKittyPunishments()[idx]?.steps ?? [];
                    if (steps.length === 0) {
                        const em = document.createElement("div"); em.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;padding:2px 0;"; em.textContent = "No steps yet.";
                        stepsWrap.appendChild(em); return;
                    }
                    steps.forEach((step, sIdx) => {
                        const sc = document.createElement("div");
                        sc.style.cssText = "display:flex;flex-direction:column;gap:2px;padding:4px 5px;border:1px solid #2a1421;border-radius:4px;" +
                            (step.type === "emote" ? "background:rgba(26,10,26,0.5);" : "background:rgba(20,14,8,0.5);");

                        // Step header: type badge + delete button
                        const sh = document.createElement("div"); sh.style.cssText = "display:flex;align-items:center;gap:4px;";
                        const badge = document.createElement("span");
                        badge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;padding:1px 5px;border-radius:3px;flex-shrink:0;" +
                            (step.type === "emote" ? "background:#2a1035;color:#cf6f98;border:1px solid #4c2537;" : "background:#1a1004;color:#c07040;border:1px solid #4a3020;");
                        badge.textContent = step.type === "emote" ? "🗯 Sentence" : "⛓ Restraints";
                        const delStep = document.createElement("button"); delStep.style.cssText = "font-size:10px;line-height:1;padding:0 3px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;margin-left:auto;"; delStep.textContent = "×";
                        delStep.addEventListener("click", () => {
                            const upd = getKittyPunishments(); if (upd[idx]) { upd[idx].steps.splice(sIdx, 1); saveKittyPunishments(upd); } rebuildSteps();
                        });
                        sh.appendChild(badge); sh.appendChild(delStep); sc.appendChild(sh);

                        if (step.type === "emote") {
                            // Kind text input
                            const kr = document.createElement("div"); kr.style.cssText = "display:flex;align-items:center;gap:3px;";
                            const kl = document.createElement("span"); kl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#79c8a0;flex-shrink:0;width:16px;"; kl.textContent = "🌸";
                            const ki = document.createElement("input"); ki.value = step.kindText ?? ""; ki.placeholder = "Kind emote"; ki.style.cssText = "flex:1;min-width:0;" + INP;
                            ki.addEventListener("input", () => { const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]) { upd[idx].steps[sIdx].kindText = ki.value; saveKittyPunishments(upd); } });
                            kr.appendChild(kl); kr.appendChild(ki); sc.appendChild(kr);
                            // Rough text input
                            const rr = document.createElement("div"); rr.style.cssText = "display:flex;align-items:center;gap:3px;";
                            const rl = document.createElement("span"); rl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#e07070;flex-shrink:0;width:16px;"; rl.textContent = "⚡";
                            const ri = document.createElement("input"); ri.value = step.roughText ?? ""; ri.placeholder = "Rough emote"; ri.style.cssText = "flex:1;min-width:0;" + INP;
                            ri.addEventListener("input", () => { const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]) { upd[idx].steps[sIdx].roughText = ri.value; saveKittyPunishments(upd); } });
                            rr.appendChild(rl); rr.appendChild(ri); sc.appendChild(rr);
                        } else {
                            // Restraint step: item list + add-item builder
                            const itemsWrap = document.createElement("div"); itemsWrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";

                            const rebuildItems = (): void => {
                                itemsWrap.innerHTML = "";
                                const liveItems = getKittyPunishments()[idx]?.steps[sIdx]?.items ?? [];
                                if (liveItems.length === 0) {
                                    const em2 = document.createElement("div"); em2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;padding:1px 0;"; em2.textContent = "No items yet";
                                    itemsWrap.appendChild(em2);
                                } else {
                                    liveItems.forEach((item, iIdx) => {
                                        const iRow = document.createElement("div"); iRow.style.cssText = "display:flex;align-items:center;gap:3px;padding:1px 0;";
                                        const nm = document.createElement("span"); nm.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"; nm.textContent = item.Name; nm.title = item.Name;
                                        const grp = document.createElement("span"); grp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#8a6070;white-space:nowrap;flex-shrink:0;"; grp.textContent = item.Group.replace("Item", "");
                                        const colInp = document.createElement("input"); colInp.value = colorToStr(item.Color); colInp.placeholder = "Default"; colInp.style.cssText = "width:72px;flex-shrink:0;" + INP; colInp.title = "Colour";
                                        colInp.addEventListener("change", () => { const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]?.items?.[iIdx]) { upd[idx].steps[sIdx].items![iIdx].Color = strToColor(colInp.value); saveKittyPunishments(upd); } });
                                        const delI = document.createElement("button"); delI.style.cssText = "font-size:10px;line-height:1;padding:0 3px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;"; delI.textContent = "×";
                                        delI.addEventListener("click", () => { const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]?.items) { upd[idx].steps[sIdx].items!.splice(iIdx, 1); saveKittyPunishments(upd); } rebuildItems(); });
                                        iRow.appendChild(nm); iRow.appendChild(grp); iRow.appendChild(colInp); iRow.appendChild(delI);
                                        itemsWrap.appendChild(iRow);
                                    });
                                }
                            };
                            // Load from kitty preset (always shown at top, re-queried each time)
                            const kittyPresets = getKittyRestraintSets();
                            if (kittyPresets.length > 0) {
                                const kpRow = document.createElement("div"); kpRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-bottom:3px;";
                                const kpSel = document.createElement("select"); kpSel.style.cssText = "flex:1;min-width:0;" + INP;
                                const kpPh = document.createElement("option"); kpPh.value = ""; kpPh.textContent = "— load preset —"; kpPh.disabled = true; kpPh.selected = true; kpSel.appendChild(kpPh);
                                for (const kp of kittyPresets) { const o = document.createElement("option"); o.value = kp.id; o.textContent = kp.label + " (" + kp.items.length + ")"; kpSel.appendChild(o); }
                                const kpBtn = document.createElement("button"); kpBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; kpBtn.textContent = "Load ↓";
                                kpBtn.addEventListener("click", () => {
                                    const kp = getKittyRestraintSets().find(p => p.id === kpSel.value); if (!kp) return;
                                    const upd = getKittyPunishments();
                                    if (upd[idx]?.steps[sIdx]) { if (!upd[idx].steps[sIdx].items) upd[idx].steps[sIdx].items = []; upd[idx].steps[sIdx].items!.push(...kp.items.map(i => ({ ...i }))); saveKittyPunishments(upd); }
                                    kpSel.value = ""; rebuildItems();
                                });
                                kpRow.appendChild(kpSel); kpRow.appendChild(kpBtn); sc.appendChild(kpRow);
                            }

                            rebuildItems();
                            sc.appendChild(itemsWrap);

                            // Slot → Item → Color → + Add row
                            const aiSlRow = document.createElement("div"); aiSlRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-top:3px;border-top:1px solid #2a1421;padding-top:3px;";
                            const aiSl = document.createElement("select"); aiSl.style.cssText = "flex:1;min-width:0;" + INP;
                            const aiSlPh = document.createElement("option"); aiSlPh.value = ""; aiSlPh.textContent = "— slot —"; aiSlPh.disabled = true; aiSlPh.selected = true; aiSl.appendChild(aiSlPh);
                            for (const grp of RESTRAINT_GROUPS) { const o = document.createElement("option"); o.value = grp; o.textContent = grp.replace("Item", ""); aiSl.appendChild(o); }
                            aiSlRow.appendChild(aiSl);

                            const aiItemRow2 = document.createElement("div"); aiItemRow2.style.cssText = "display:flex;align-items:center;gap:3px;";
                            const aiItemSel = document.createElement("select"); aiItemSel.style.cssText = "flex:1;min-width:0;" + INP;
                            const aiIPh = document.createElement("option"); aiIPh.value = ""; aiIPh.textContent = "— pick slot first —"; aiIPh.disabled = true; aiIPh.selected = true; aiItemSel.appendChild(aiIPh);
                            aiSl.addEventListener("change", () => {
                                aiItemSel.innerHTML = "";
                                const names = getGroupAssets(aiSl.value);
                                if (names.length === 0) { const o = document.createElement("option"); o.value = ""; o.textContent = "— none —"; o.disabled = true; o.selected = true; aiItemSel.appendChild(o); }
                                else { const ph2 = document.createElement("option"); ph2.value = ""; ph2.textContent = "— pick item —"; ph2.disabled = true; ph2.selected = true; aiItemSel.appendChild(ph2); for (const n of names) { const o = document.createElement("option"); o.value = n; o.textContent = n; aiItemSel.appendChild(o); } }
                            });
                            aiItemRow2.appendChild(aiItemSel);

                            const aiColRow2 = document.createElement("div"); aiColRow2.style.cssText = "display:flex;align-items:center;gap:3px;";
                            const aiColInp = document.createElement("input"); aiColInp.placeholder = "Default or #rrggbb"; aiColInp.style.cssText = "flex:1;min-width:0;" + INP;
                            const aiAddBtn = document.createElement("button"); aiAddBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; aiAddBtn.textContent = t("core.add");
                            aiAddBtn.addEventListener("click", () => {
                                if (!aiSl.value || !aiItemSel.value) return;
                                const newItem: KittyItem = { Name: aiItemSel.value, Group: aiSl.value, Color: strToColor(aiColInp.value || "Default") };
                                const upd = getKittyPunishments();
                                if (upd[idx]?.steps[sIdx]) { if (!upd[idx].steps[sIdx].items) upd[idx].steps[sIdx].items = []; upd[idx].steps[sIdx].items!.push(newItem); saveKittyPunishments(upd); }
                                aiSl.value = ""; aiItemSel.innerHTML = ""; aiItemSel.appendChild(aiIPh); aiIPh.selected = true; aiColInp.value = "";
                                rebuildItems();
                            });
                            aiColRow2.appendChild(aiColInp); aiColRow2.appendChild(aiAddBtn);
                            sc.appendChild(aiSlRow); sc.appendChild(aiItemRow2); sc.appendChild(aiColRow2);

                            // Import from Emery's saved restraint sets
                            const fromSaved = getRestraints();
                            if (fromSaved.length > 0) {
                                const fsRow = document.createElement("div"); fsRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-top:2px;";
                                const fsSel = document.createElement("select"); fsSel.style.cssText = "flex:1;min-width:0;" + INP;
                                const fsPh = document.createElement("option"); fsPh.value = ""; fsPh.textContent = "— import saved set —"; fsPh.disabled = true; fsPh.selected = true; fsSel.appendChild(fsPh);
                                for (const rs of fromSaved) { const o = document.createElement("option"); o.value = rs.id; o.textContent = rs.displayName + " (" + rs.items.filter((i: { Group: string }) => RESTRAINT_GROUPS.has(i.Group)).length + ")"; fsSel.appendChild(o); }
                                const fsBtn = document.createElement("button"); fsBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; fsBtn.textContent = "Use ↓";
                                fsBtn.addEventListener("click", () => {
                                    const rs = fromSaved.find((s: { id: string }) => s.id === fsSel.value); if (!rs) return;
                                    const rawItems = rs.items as unknown as Array<Record<string, unknown>>;
                                    const newItems: KittyItem[] = rawItems.filter(i => RESTRAINT_GROUPS.has(String(i.Group))).map(i => ({ Name: String(i.Name), Group: String(i.Group), Color: i.Color as string | string[] | undefined, Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined, Property: i.Property as Record<string, unknown> | undefined, Craft: i.Craft as Record<string, unknown> | undefined }));
                                    const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]) { if (!upd[idx].steps[sIdx].items) upd[idx].steps[sIdx].items = []; upd[idx].steps[sIdx].items!.push(...newItems); saveKittyPunishments(upd); } fsSel.value = ""; rebuildItems();
                                });
                                fsRow.appendChild(fsSel); fsRow.appendChild(fsBtn); sc.appendChild(fsRow);
                            }

                            // Import from pasted BC outfit code
                            const codeRow = document.createElement("div"); codeRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-top:2px;";
                            const codeInp = document.createElement("input"); codeInp.placeholder = t("outfits.importBCPlaceholder"); codeInp.style.cssText = "flex:1;min-width:0;" + INP;
                            const codeBtn = document.createElement("button"); codeBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; codeBtn.textContent = "Import";
                            codeBtn.addEventListener("click", () => {
                                const code = codeInp.value.trim(); if (!code) return;
                                try {
                                    const LZStr = (window as unknown as Record<string, unknown>).LZString as { decompressFromBase64?: (s: string) => string | null } | undefined;
                                    const raw2 = LZStr?.decompressFromBase64?.(code) ?? code;
                                    const parsed = JSON.parse(raw2) as Array<Record<string, unknown>>;
                                    const newItems2: KittyItem[] = parsed.filter(p => typeof p.Group === "string" && typeof p.Name === "string" && RESTRAINT_GROUPS.has(String(p.Group))).map(p => ({ Name: String(p.Name), Group: String(p.Group), Color: p.Color as string | string[] | undefined, Difficulty: typeof p.Difficulty === "number" ? p.Difficulty : undefined, Property: typeof p.Property === "object" && p.Property !== null ? p.Property as Record<string, unknown> : undefined, Craft: typeof p.Craft === "object" && p.Craft !== null ? p.Craft as Record<string, unknown> : undefined }));
                                    if (newItems2.length === 0) { codeInp.style.borderColor = "#e07070"; window.setTimeout(() => { codeInp.style.borderColor = ""; }, 1500); return; }
                                    const upd = getKittyPunishments(); if (upd[idx]?.steps[sIdx]) { if (!upd[idx].steps[sIdx].items) upd[idx].steps[sIdx].items = []; upd[idx].steps[sIdx].items!.push(...newItems2); saveKittyPunishments(upd); } codeInp.value = ""; rebuildItems();
                                } catch { codeInp.style.borderColor = "#e07070"; window.setTimeout(() => { codeInp.style.borderColor = ""; }, 1500); }
                            });
                            codeRow.appendChild(codeInp); codeRow.appendChild(codeBtn); sc.appendChild(codeRow);

                            // Save current items as a named kitty preset
                            const spRow = document.createElement("div"); spRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-top:3px;border-top:1px solid #2a1421;padding-top:3px;";
                            const spInp = document.createElement("input"); spInp.placeholder = "Save items as preset…"; spInp.style.cssText = "flex:1;min-width:0;" + INP;
                            const spBtn = document.createElement("button"); spBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; spBtn.textContent = "💾 Save";
                            spBtn.addEventListener("click", () => {
                                const name = spInp.value.trim(); if (!name) { spInp.focus(); return; }
                                const items = getKittyPunishments()[idx]?.steps[sIdx]?.items ?? [];
                                if (items.length === 0) { spInp.style.borderColor = "#e07070"; window.setTimeout(() => { spInp.style.borderColor = ""; }, 1200); return; }
                                const presets = getKittyRestraintSets();
                                presets.push({ id: "r_" + Date.now(), label: name, items: items.map(i => ({ ...i })), kindEmote: "", roughEmote: "" });
                                saveKittyRestraintSets(presets);
                                rebuildSteps(); // rebuild so the Load dropdown shows the new preset
                            });
                            spRow.appendChild(spInp); spRow.appendChild(spBtn); sc.appendChild(spRow);
                        }

                        stepsWrap.appendChild(sc);
                    });
                };

                r.appendChild(stepsWrap);
                rebuildSteps();

                // Add step buttons
                const addStepRow = document.createElement("div"); addStepRow.style.cssText = "display:flex;gap:5px;margin-top:3px;";
                const mkAddBtn = (lbl: string, fn: () => void): HTMLButtonElement => {
                    const b = document.createElement("button"); b.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:9px;padding:3px;border-radius:4px;cursor:pointer;border:1px dashed #4c2537;background:transparent;color:#7a4a5e;"; b.textContent = lbl; b.addEventListener("click", fn); return b;
                };
                addStepRow.appendChild(mkAddBtn("+ Sentence", () => { const upd = getKittyPunishments(); if (upd[idx]) { upd[idx].steps.push({ type: "emote", kindText: "", roughText: "" }); saveKittyPunishments(upd); } rebuildSteps(); }));
                addStepRow.appendChild(mkAddBtn("+ Restraints", () => { const upd = getKittyPunishments(); if (upd[idx]) { upd[idx].steps.push({ type: "restraint", items: [] }); saveKittyPunishments(upd); } rebuildSteps(); }));
                r.appendChild(addStepRow);

                // Reaction section
                const reactHdr = document.createElement("div"); reactHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-top:5px;border-top:1px solid #2a1421;padding-top:4px;"; reactHdr.textContent = "Emery reacts (on accept)";
                r.appendChild(reactHdr);

                // Expression picker
                const exprRow = document.createElement("div"); exprRow.style.cssText = "display:flex;align-items:center;gap:4px;";
                const exprLbl = document.createElement("span"); exprLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#9a7080;flex-shrink:0;width:56px;"; exprLbl.textContent = "Expression";
                const exprSel = document.createElement("select"); exprSel.style.cssText = "flex:1;min-width:0;" + INP;
                for (const e of KITTY_EXPRESSIONS) { const o = document.createElement("option"); o.value = e.cmd; o.textContent = e.label; exprSel.appendChild(o); }
                const exprPresets2 = getKittyExpressionPresets();
                if (exprPresets2.length > 0) {
                    const grp2 = document.createElement("optgroup"); grp2.label = "★ Presets"; exprSel.appendChild(grp2);
                    for (const ep of exprPresets2) { const o = document.createElement("option"); o.value = "preset:" + ep.id; o.textContent = "★ " + ep.label; grp2.appendChild(o); }
                }
                exprSel.value = pun.reaction?.expression ?? "";
                exprSel.addEventListener("change", () => { const upd = getKittyPunishments(); if (upd[idx]) { upd[idx].reaction = { ...(upd[idx].reaction ?? {}), expression: exprSel.value || undefined }; saveKittyPunishments(upd); } });
                exprRow.appendChild(exprLbl); exprRow.appendChild(exprSel); r.appendChild(exprRow);

                // Pose picker
                const poseRow2 = document.createElement("div"); poseRow2.style.cssText = "display:flex;align-items:center;gap:4px;";
                const poseLbl2 = document.createElement("span"); poseLbl2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#9a7080;flex-shrink:0;width:56px;"; poseLbl2.textContent = "Pose";
                const poseSel2 = document.createElement("select"); poseSel2.style.cssText = "flex:1;min-width:0;" + INP;
                for (const p2 of KITTY_REACTION_POSES) { const o = document.createElement("option"); o.value = JSON.stringify(p2.poses); o.textContent = p2.label; poseSel2.appendChild(o); }
                poseSel2.value = JSON.stringify(pun.reaction?.poses ?? []);
                if (poseSel2.selectedIndex === -1) poseSel2.selectedIndex = 0;
                poseSel2.addEventListener("change", () => {
                    const upd = getKittyPunishments(); if (upd[idx]) { try { const poses = JSON.parse(poseSel2.value) as string[]; upd[idx].reaction = { ...(upd[idx].reaction ?? {}), poses: poses.length ? poses : undefined }; } catch { /* ignore */ } saveKittyPunishments(upd); }
                });
                poseRow2.appendChild(poseLbl2); poseRow2.appendChild(poseSel2); r.appendChild(poseRow2);

                list.appendChild(r);
            });

            // Add new action
            const addRow = document.createElement("div"); addRow.style.cssText = "display:flex;align-items:center;gap:4px;";
            const newPunLbl = document.createElement("input"); newPunLbl.placeholder = "New action name"; newPunLbl.style.cssText = "flex:1;min-width:0;" + INP;
            const addBtnPun = document.createElement("button"); addBtnPun.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; addBtnPun.textContent = t("core.add");
            addBtnPun.addEventListener("click", () => {
                if (!newPunLbl.value.trim()) return;
                const updated = getKittyPunishments();
                updated.push({ id: "pun_" + Date.now(), label: newPunLbl.value.trim(), steps: [{ type: "emote", kindText: "", roughText: "" }] });
                saveKittyPunishments(updated); newPunLbl.value = ""; renderPunishments(true);
            });
            addRow.appendChild(newPunLbl); addRow.appendChild(addBtnPun);
            list.appendChild(addRow);
            punishWrap.appendChild(list);
        };

        const { cBody: punishCBody, wrap: punishWrap2 } = makeCollapsible("EBC_kittyActionsOpen", "⚡ Actions", false, (ed) => renderPunishments(ed));
        renderPunishments(false);
        punishCBody.appendChild(punishWrap);
        body.appendChild(punishWrap2);

        // ── RESTRAINT PRESETS ────────────────────────────────────────────────────
        const rpWrap = document.createElement("div");
        rpWrap.style.marginBottom = "10px";

        const renderRestraintPresets = (): void => {
            rpWrap.innerHTML = "";
            const presets = getKittyRestraintSets();

            // ── Create new preset row (always visible) ────────────────────────
            const createRow = document.createElement("div");
            createRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:6px;";
            const newNameInp = document.createElement("input");
            newNameInp.placeholder = t("anims.newPresetName");
            newNameInp.style.cssText = "flex:1;min-width:0;" + INP;
            const createBtn = document.createElement("button");
            createBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;";
            createBtn.textContent = "+ Create";
            createBtn.addEventListener("click", () => {
                if (!newNameInp.value.trim()) return;
                const upd = getKittyRestraintSets();
                upd.push({ id: "r_" + Date.now(), label: newNameInp.value.trim(), items: [], kindEmote: "", roughEmote: "" });
                saveKittyRestraintSets(upd);
                newNameInp.value = "";
                renderRestraintPresets();
            });
            createRow.appendChild(newNameInp);
            createRow.appendChild(createBtn);
            rpWrap.appendChild(createRow);

            if (presets.length === 0) {
                const em = document.createElement("div");
                em.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;padding:2px 0;";
                em.textContent = "No restraint presets yet — create one above.";
                rpWrap.appendChild(em);
                return;
            }

            // ── Select + apply row ────────────────────────────────────────────
            const selectRow = document.createElement("div");
            selectRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:4px;";

            const presetSel = document.createElement("select");
            presetSel.style.cssText = "flex:1;min-width:0;" + INP;
            const selPh = document.createElement("option");
            selPh.value = ""; selPh.textContent = "— select preset —"; selPh.disabled = true; selPh.selected = true;
            presetSel.appendChild(selPh);
            for (const p of presets) {
                const o = document.createElement("option");
                o.value = p.id;
                o.textContent = `🔒 ${p.label} (${p.items.length})`;
                presetSel.appendChild(o);
            }

            const applyBtn = document.createElement("button");
            applyBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:2px 8px;border-radius:3px;cursor:pointer;border:1px solid #8a4060;background:#3a1a2a;color:#cf6f98;flex-shrink:0;opacity:0.45;";
            applyBtn.textContent = "Apply 🔒";
            applyBtn.disabled = true;

            const deleteBtn = document.createElement("button");
            deleteBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #5a2030;background:transparent;color:#8a4050;flex-shrink:0;opacity:0.45;";
            deleteBtn.textContent = "Delete";
            deleteBtn.disabled = true;

            selectRow.appendChild(presetSel);
            selectRow.appendChild(applyBtn);
            selectRow.appendChild(deleteBtn);
            rpWrap.appendChild(selectRow);

            // ── Collapsible item editor (shown when a preset is selected) ─────
            const editWrap = document.createElement("div");
            editWrap.style.cssText = "display:none;flex-direction:column;gap:3px;background:rgba(20,10,5,0.4);border:1px solid #3a2010;border-radius:5px;padding:5px 7px;margin-top:2px;";
            rpWrap.appendChild(editWrap);

            const rebuildEditSection = (presetId: string): void => {
                editWrap.innerHTML = "";
                const liveSets = getKittyRestraintSets();
                const preset = liveSets.find(p => p.id === presetId);
                if (!preset) return;

                // Item list
                const itemsWrap = document.createElement("div");
                itemsWrap.style.cssText = "display:flex;flex-direction:column;gap:2px;margin-bottom:3px;";
                const rebuildItems = (): void => {
                    itemsWrap.innerHTML = "";
                    const liveItems = (getKittyRestraintSets().find(p => p.id === presetId) ?? preset).items;
                    // Update dropdown label to reflect new item count
                    const opt = presetSel.querySelector(`option[value="${presetId}"]`) as HTMLOptionElement | null;
                    if (opt) opt.textContent = `🔒 ${preset.label} (${liveItems.length})`;
                    if (liveItems.length === 0) {
                        const em2 = document.createElement("div");
                        em2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;padding:1px 0;";
                        em2.textContent = "No items yet";
                        itemsWrap.appendChild(em2);
                    } else {
                        liveItems.forEach((item, iIdx) => {
                            const iRow = document.createElement("div"); iRow.style.cssText = "display:flex;align-items:center;gap:3px;padding:1px 0;";
                            const nm = document.createElement("span"); nm.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"; nm.textContent = item.Name; nm.title = item.Name;
                            const grp = document.createElement("span"); grp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#8a6070;white-space:nowrap;flex-shrink:0;"; grp.textContent = item.Group.replace("Item", "");
                            const colInp = document.createElement("input"); colInp.value = colorToStr(item.Color); colInp.placeholder = "Default"; colInp.style.cssText = "width:72px;flex-shrink:0;" + INP; colInp.title = "Colour";
                            colInp.addEventListener("change", () => {
                                const upd = getKittyRestraintSets(); const pp = upd.find(p => p.id === presetId);
                                if (pp?.items?.[iIdx]) { pp.items[iIdx].Color = strToColor(colInp.value); saveKittyRestraintSets(upd); }
                            });
                            const delI = document.createElement("button"); delI.style.cssText = "font-size:10px;line-height:1;padding:0 3px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;"; delI.textContent = "×";
                            delI.addEventListener("click", () => {
                                const upd = getKittyRestraintSets(); const pp = upd.find(p => p.id === presetId);
                                if (pp?.items) { pp.items.splice(iIdx, 1); saveKittyRestraintSets(upd); } rebuildItems();
                            });
                            iRow.appendChild(nm); iRow.appendChild(grp); iRow.appendChild(colInp); iRow.appendChild(delI);
                            itemsWrap.appendChild(iRow);
                        });
                    }
                };
                rebuildItems();
                editWrap.appendChild(itemsWrap);

                // Expression trigger row
                const rpExprRow = document.createElement("div"); rpExprRow.style.cssText = "display:flex;align-items:center;gap:4px;padding-bottom:4px;border-bottom:1px solid #3a2010;margin-bottom:4px;";
                const rpExprLbl = document.createElement("span"); rpExprLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#c09098;flex-shrink:0;width:56px;"; rpExprLbl.textContent = "😊 Expression";
                const rpExprSel = document.createElement("select"); rpExprSel.style.cssText = "flex:1;min-width:0;" + INP;
                const rpExprNone = document.createElement("option"); rpExprNone.value = ""; rpExprNone.textContent = "— none —"; rpExprSel.appendChild(rpExprNone);
                for (const ex of KITTY_EXPRESSIONS) { const o = document.createElement("option"); o.value = ex.cmd; o.textContent = ex.label; rpExprSel.appendChild(o); }
                const exprPresets3 = getKittyExpressionPresets();
                if (exprPresets3.length > 0) {
                    const grp3 = document.createElement("optgroup"); grp3.label = "★ Presets"; rpExprSel.appendChild(grp3);
                    for (const ep of exprPresets3) { const o = document.createElement("option"); o.value = "preset:" + ep.id; o.textContent = "★ " + ep.label; grp3.appendChild(o); }
                }
                const liveSet = getKittyRestraintSets().find(p => p.id === presetId);
                rpExprSel.value = liveSet?.expression ?? "";
                rpExprSel.addEventListener("change", () => {
                    const upd = getKittyRestraintSets(); const pp = upd.find(p => p.id === presetId);
                    if (pp) { pp.expression = rpExprSel.value || undefined; saveKittyRestraintSets(upd); }
                });
                rpExprRow.appendChild(rpExprLbl); rpExprRow.appendChild(rpExprSel);
                editWrap.appendChild(rpExprRow);

                // Slot + item + colour + Add
                const slRow = document.createElement("div"); slRow.style.cssText = "display:flex;align-items:center;gap:3px;border-top:1px solid #3a2010;padding-top:4px;flex-wrap:wrap;";
                const sl = document.createElement("select"); sl.style.cssText = "flex:1;min-width:0;" + INP;
                const slPh = document.createElement("option"); slPh.value = ""; slPh.textContent = "— slot —"; slPh.disabled = true; slPh.selected = true; sl.appendChild(slPh);
                for (const grp of RESTRAINT_GROUPS) { const o = document.createElement("option"); o.value = grp; o.textContent = grp.replace("Item", ""); sl.appendChild(o); }
                const itemSel = document.createElement("select"); itemSel.style.cssText = "flex:1;min-width:0;" + INP;
                const itemPh = document.createElement("option"); itemPh.value = ""; itemPh.textContent = "— pick slot —"; itemPh.disabled = true; itemPh.selected = true; itemSel.appendChild(itemPh);
                sl.addEventListener("change", () => {
                    itemSel.innerHTML = "";
                    const names = getGroupAssets(sl.value);
                    if (names.length === 0) { const o = document.createElement("option"); o.value = ""; o.textContent = "— none —"; o.disabled = true; o.selected = true; itemSel.appendChild(o); }
                    else { const ph = document.createElement("option"); ph.value = ""; ph.textContent = "— item —"; ph.disabled = true; ph.selected = true; itemSel.appendChild(ph); for (const n of names) { const o = document.createElement("option"); o.value = n; o.textContent = n; itemSel.appendChild(o); } }
                });
                const colInp2 = document.createElement("input"); colInp2.placeholder = "#rrggbb"; colInp2.style.cssText = "width:64px;flex-shrink:0;" + INP; colInp2.title = "Colour (optional)";
                const addItemBtn = document.createElement("button"); addItemBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; addItemBtn.textContent = t("core.add");
                addItemBtn.addEventListener("click", () => {
                    if (!sl.value || !itemSel.value) return;
                    const newItem: KittyItem = { Name: itemSel.value, Group: sl.value, Color: strToColor(colInp2.value || "Default") };
                    const upd = getKittyRestraintSets(); const pp = upd.find(p => p.id === presetId);
                    if (pp) { pp.items.push(newItem); saveKittyRestraintSets(upd); }
                    sl.value = ""; itemSel.innerHTML = ""; itemSel.appendChild(itemPh); itemPh.selected = true; colInp2.value = "";
                    rebuildItems();
                });
                slRow.appendChild(sl); slRow.appendChild(itemSel); slRow.appendChild(colInp2); slRow.appendChild(addItemBtn);
                editWrap.appendChild(slRow);

                // BC outfit/craft code import
                const codeRow = document.createElement("div"); codeRow.style.cssText = "display:flex;align-items:center;gap:3px;margin-top:2px;";
                const codeInp = document.createElement("input"); codeInp.placeholder = "Paste BC outfit/craft code…"; codeInp.style.cssText = "flex:1;min-width:0;" + INP;
                const codeBtn = document.createElement("button"); codeBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 6px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;flex-shrink:0;"; codeBtn.textContent = "Import";
                codeBtn.addEventListener("click", () => {
                    const code = codeInp.value.trim(); if (!code) return;
                    try {
                        const LZStr = (window as unknown as Record<string, unknown>).LZString as { decompressFromBase64?: (s: string) => string | null } | undefined;
                        const raw2 = LZStr?.decompressFromBase64?.(code) ?? code;
                        const parsed2 = JSON.parse(raw2) as Array<Record<string, unknown>>;
                        const newItems: KittyItem[] = parsed2
                            .filter(p => typeof p.Group === "string" && typeof p.Name === "string")
                            .map(p => ({
                                Name: String(p.Name), Group: String(p.Group),
                                Color: p.Color as string | string[] | undefined,
                                Difficulty: typeof p.Difficulty === "number" ? p.Difficulty : undefined,
                                Property: typeof p.Property === "object" && p.Property !== null ? p.Property as Record<string, unknown> : undefined,
                                Craft: typeof p.Craft === "object" && p.Craft !== null ? p.Craft as Record<string, unknown> : undefined,
                            }));
                        if (newItems.length === 0) { codeInp.style.borderColor = "#e07070"; window.setTimeout(() => { codeInp.style.borderColor = ""; }, 1500); return; }
                        const upd = getKittyRestraintSets(); const pp = upd.find(p => p.id === presetId);
                        if (pp) { pp.items.push(...newItems); saveKittyRestraintSets(upd); }
                        codeInp.value = ""; rebuildItems();
                    } catch { codeInp.style.borderColor = "#e07070"; window.setTimeout(() => { codeInp.style.borderColor = ""; }, 1500); }
                });
                codeRow.appendChild(codeInp); codeRow.appendChild(codeBtn);
                editWrap.appendChild(codeRow);
            };

            // Wire up preset selection
            presetSel.addEventListener("change", () => {
                const id = presetSel.value; if (!id) return;
                applyBtn.disabled = false; applyBtn.style.opacity = "1";
                deleteBtn.disabled = false; deleteBtn.style.opacity = "1";
                editWrap.style.display = "flex";
                rebuildEditSection(id);
            });

            applyBtn.addEventListener("click", () => {
                const id = presetSel.value; if (!id) return;
                const mood = getKittyMood();
                const set = getKittyRestraintSets().find(p => p.id === id);
                if (!set) return;
                const emoteText = mood === "rough" ? (set.roughEmote || set.kindEmote) : (set.kindEmote || set.roughEmote);
                if (emoteText) sendRoomEmote(emoteText);
                if (set.expression) sendKittyCmd("expression", set.expression);
                sendKittyCmd("punish", JSON.stringify({ label: set.label, mood, items: set.items, reaction: undefined }));
            });

            deleteBtn.addEventListener("click", () => {
                const id = presetSel.value; if (!id) return;
                saveKittyRestraintSets(getKittyRestraintSets().filter(p => p.id !== id));
                renderRestraintPresets();
            });

            // Hint
            const hint = document.createElement("div");
            hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:3px;";
            hint.textContent = "Select a preset and Apply to send restraints to Emery";
            rpWrap.appendChild(hint);
        };

        const { cBody: rpCBody, wrap: rpWrap2 } = makeCollapsible("EBC_kittyRestraintsOpen", "🔒 Restraints", false);
        renderRestraintPresets();
        rpCBody.appendChild(rpWrap);

        // ── Copy Restraints from Member ─────────────────────────────────────────
        const crDiv = divider(); rpCBody.appendChild(crDiv);
        const crHdr = document.createElement("div");
        crHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;color:#967281;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;";
        crHdr.textContent = t("dom.copyRestraints");
        rpCBody.appendChild(crHdr);

        const crHint = document.createElement("div");
        crHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:5px;line-height:1.4;";
        crHint.textContent = "Pick a room member, load their restraints, then generate a BC outfit code to import via wardrobe.";
        rpCBody.appendChild(crHint);

        // Member picker row
        const crPickRow = document.createElement("div");
        crPickRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:4px;";
        const crMemberSel = document.createElement("select");
        crMemberSel.style.cssText = "flex:1;min-width:0;" + INP;

        const crPopulate = (): void => {
            while (crMemberSel.firstChild) crMemberSel.removeChild(crMemberSel.firstChild);
            const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
            const others = room.filter(c => c.MemberNumber !== Player.MemberNumber);
            if (others.length === 0) {
                const o = document.createElement("option"); o.value = ""; o.textContent = "No others in room"; crMemberSel.appendChild(o); return;
            }
            for (const c of others) {
                const o = document.createElement("option"); o.value = String(c.MemberNumber);
                const nick = (c as unknown as Record<string, unknown>).Nickname as string | undefined;
                o.textContent = `${nick?.trim() || c.Name} (#${c.MemberNumber})`; crMemberSel.appendChild(o);
            }
        };
        crPopulate();

        const crMkBtn = (label: string): HTMLButtonElement => {
            const b = document.createElement("button");
            b.textContent = label;
            b.style.cssText = "flex-shrink:0;font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;";
            return b;
        };
        const crRefreshBtn = crMkBtn("↻");
        const crLoadBtn = crMkBtn("Load");
        crPickRow.appendChild(crMemberSel); crPickRow.appendChild(crRefreshBtn); crPickRow.appendChild(crLoadBtn);
        rpCBody.appendChild(crPickRow);

        // Item checklist
        const crCheckWrap = document.createElement("div");
        crCheckWrap.style.cssText = "display:none;flex-direction:column;gap:2px;margin-bottom:4px;";
        rpCBody.appendChild(crCheckWrap);
        const crCheckHdr = document.createElement("div");
        crCheckHdr.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:3px;";
        const crCheckLbl = document.createElement("span");
        crCheckLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex:1;";
        const crAllBtn = crMkBtn("All"); const crNoneBtn = crMkBtn("None");
        crCheckHdr.appendChild(crCheckLbl); crCheckHdr.appendChild(crAllBtn); crCheckHdr.appendChild(crNoneBtn);
        crCheckWrap.appendChild(crCheckHdr);
        const crCheckItems = document.createElement("div");
        crCheckItems.style.cssText = "display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;";
        crCheckWrap.appendChild(crCheckItems);
        let crLoaded: Array<{ item: Item; checkbox: HTMLInputElement }> = [];

        // Code output
        const crCodeWrap = document.createElement("div");
        crCodeWrap.style.cssText = "display:none;flex-direction:column;gap:3px;margin-bottom:3px;";
        rpCBody.appendChild(crCodeWrap);
        const crTA = document.createElement("textarea");
        crTA.readOnly = true; crTA.rows = 2;
        crTA.style.cssText = "width:100%;box-sizing:border-box;resize:none;background:#100810;border:1px solid #3a1928;border-radius:3px;color:#cf6f98;font-family:'Courier New',monospace;font-size:8px;padding:3px 5px;";
        const crCodeBtnRow = document.createElement("div"); crCodeBtnRow.style.cssText = "display:flex;gap:4px;";
        const crGenBtn = crMkBtn("Generate Code"); const crCopyBtn = crMkBtn("Copy");
        crCodeBtnRow.appendChild(crGenBtn); crCodeBtnRow.appendChild(crCopyBtn);
        crCodeWrap.appendChild(crCodeBtnRow); crCodeWrap.appendChild(crTA);

        const crStatus = document.createElement("div");
        crStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;min-height:13px;";
        rpCBody.appendChild(crStatus);

        const crClear = (): void => {
            crCheckItems.innerHTML = ""; crLoaded = [];
            crCheckWrap.style.display = "none"; crCodeWrap.style.display = "none";
            crTA.value = ""; crStatus.textContent = "";
        };

        crRefreshBtn.addEventListener("click", () => { crPopulate(); crClear(); });
        crAllBtn.addEventListener("click",  () => { crLoaded.forEach(e => { e.checkbox.checked = true; }); });
        crNoneBtn.addEventListener("click", () => { crLoaded.forEach(e => { e.checkbox.checked = false; }); });

        crLoadBtn.addEventListener("click", () => {
            const num = parseInt(crMemberSel.value, 10);
            if (isNaN(num)) { crStatus.textContent = "No member selected."; return; }
            const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
            const char = room.find(c => c.MemberNumber === num);
            if (!char) { crStatus.textContent = t("dev.charNotFound"); return; }
            const items = char.Appearance.filter((i: Item) => i.Asset?.Group?.Name && RESTRAINT_GROUPS.has(i.Asset.Group.Name));
            if (items.length === 0) { crClear(); crStatus.textContent = "No restraints on this character."; return; }
            crClear();
            const charName = ((char as unknown as Record<string, unknown>).Nickname as string | undefined)?.trim() || char.Name;
            crCheckLbl.textContent = `${items.length} restraint(s) from ${charName}:`;
            for (const item of items) {
                const craft = item.Craft as { Name?: string } | undefined;
                const craftName = craft?.Name?.trim();
                const baseName = (item.Asset as unknown as Record<string, unknown>).Description as string || item.Asset.Name;
                const label = craftName ? `${craftName} (${baseName})` : baseName;
                const row = document.createElement("label");
                row.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 5px;border-radius:3px;background:rgba(42,20,33,0.4);border:1px solid #2a1020;cursor:pointer;";
                const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true; cb.style.cssText = "accent-color:#cf6f98;flex-shrink:0;cursor:pointer;";
                const nm = document.createElement("span"); nm.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"; nm.textContent = label;
                const grp = document.createElement("span"); grp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;flex-shrink:0;"; grp.textContent = item.Asset.Group.Name.replace("Item", "");
                row.appendChild(cb); row.appendChild(nm); row.appendChild(grp);
                crCheckItems.appendChild(row); crLoaded.push({ item, checkbox: cb });
            }
            crCheckWrap.style.display = "flex"; crCodeWrap.style.display = "flex";
        });

        crGenBtn.addEventListener("click", () => {
            const selected = crLoaded.filter(e => e.checkbox.checked).map(e => e.item);
            if (selected.length === 0) { crStatus.textContent = "Select at least one item."; return; }
            try {
                const LZ = (window as unknown as Record<string, unknown>).LZString as { compressToBase64?: (s: string) => string } | undefined;
                if (!LZ?.compressToBase64) throw new Error("LZString not available");
                const bundle = selected.map(item => {
                    const prop = item.Property ? { ...(item.Property as Record<string, unknown>) } : undefined;
                    if (prop) { delete prop["LockedBy"]; delete prop["LockMemberNumber"]; delete prop["CombinationNumber"]; delete prop["Password"]; }
                    return { Group: item.Asset.Group.Name, Name: item.Asset.Name, Color: item.Color, Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined, Property: prop, Craft: item.Craft ?? undefined };
                });
                crTA.value = LZ.compressToBase64(JSON.stringify(bundle));
                crStatus.textContent = `✔ Code for ${selected.length} item(s) — import via BC wardrobe.`;
                crStatus.style.color = "#79a885";
            } catch (e) { crStatus.textContent = "Error: " + String(e); crStatus.style.color = "#e07070"; }
        });

        crCopyBtn.addEventListener("click", () => {
            if (!crTA.value) { crStatus.textContent = "Generate code first."; return; }
            try {
                navigator.clipboard.writeText(crTA.value).then(() => {
                    crStatus.textContent = t("core.copied"); crStatus.style.color = "#79a885";
                }).catch(() => { crTA.select(); document.execCommand("copy"); crStatus.textContent = t("core.copied"); crStatus.style.color = "#79a885"; });
            } catch { crTA.select(); document.execCommand("copy"); }
        });

        body.appendChild(rpWrap2);

        // ── AROUSAL ──────────────────────────────────────────────────────────────
        const { cBody: arousalCBody, wrap: arousalWrap2 } = makeCollapsible("EBC_kittyArousalOpen", "💗 Arousal", false);

        const arousalWrap = document.createElement("div");
        arousalWrap.style.cssText = "display:flex;flex-direction:column;gap:5px;width:100%;";
        const presetRow = document.createElement("div");
        presetRow.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px;";
        for (const pct of [0, 25, 50, 75, 95, 100]) {
            const color = pct === 0 ? "#4080c0" : pct < 75 ? "#c07090" : "#e050a0";
            presetRow.appendChild(makePill(`${pct}%`, color, () => sendKittyCmd("arousal", String(pct)), 1000));
        }
        arousalWrap.appendChild(presetRow);
        const customRow = document.createElement("div");
        customRow.style.cssText = "display:flex;align-items:center;gap:5px;";
        const customInp = document.createElement("input");
        customInp.type = "number"; customInp.min = "0"; customInp.max = "100"; customInp.placeholder = "0–100";
        customInp.style.cssText = "width:55px;" + INP;
        const setBtn = document.createElement("button");
        setBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;";
        setBtn.textContent = "Set";
        setBtn.addEventListener("click", () => {
            const v = parseInt(customInp.value, 10);
            if (!isNaN(v) && v >= 0 && v <= 100) sendKittyCmd("arousal", String(v));
        });
        customRow.appendChild(customInp); customRow.appendChild(setBtn);
        arousalWrap.appendChild(customRow);
        arousalCBody.appendChild(arousalWrap);
        body.appendChild(arousalWrap2);

        // ── EXPRESSIONS ──────────────────────────────────────────────────────────
        const { cBody: exprCBody, wrap: exprWrap2 } = makeCollapsible("EBC_kittyExpressionsOpen", "😊 Expressions", false);

        // ── Expression Presets (at top) ───────────────────────────────────────
        const epHdr = document.createElement("div");
        epHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;font-weight:bold;color:#967281;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:4px;";
        epHdr.textContent = "Expression Presets";
        exprCBody.appendChild(epHdr);

        const epHint = document.createElement("div");
        epHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:5px;line-height:1.4;";
        epHint.textContent = "Create named combos (e.g. Shy = Blush:Low + Eyes:Shy + Mouth:Pout) — click a preset to fire all its expressions at once.";
        exprCBody.appendChild(epHint);

        const epWrap = document.createElement("div");
        epWrap.style.cssText = "display:flex;flex-direction:column;gap:5px;";
        exprCBody.appendChild(epWrap);

        // ── Individual expressions (below presets) ────────────────────────────
        const epDivider = divider(); epDivider.style.margin = "6px 0";

        const exprWrap = document.createElement("div");
        exprWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;";
        for (const expr of KITTY_EXPRESSIONS) {
            if (!expr.cmd) continue; // skip "— None —"
            const b = document.createElement("button");
            b.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;padding:5px 10px;border-radius:7px;cursor:pointer;border:1px solid #5a3050;background:rgba(40,15,30,0.5);color:#c090b0;transition:background 0.12s,border-color 0.12s;";
            b.textContent = expr.label;
            b.title = expr.cmd;
            b.addEventListener("mouseenter", () => { b.style.background = "rgba(90,30,60,0.5)"; b.style.borderColor = "#a06080"; });
            b.addEventListener("mouseleave", () => { b.style.background = "rgba(40,15,30,0.5)"; b.style.borderColor = "#5a3050"; });
            b.addEventListener("click", () => { sendKittyCmd("expression", expr.cmd); });
            exprWrap.appendChild(b);
        }
        const exprHint = document.createElement("div");
        exprHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;margin-top:2px;";
        exprHint.textContent = "Sends a single facial expression command to Emery";

        const renderExprPresets = (): void => {
            epWrap.innerHTML = "";
            const presets = getKittyExpressionPresets();

            // Fire buttons for existing presets
            if (presets.length > 0) {
                const fireRow = document.createElement("div");
                fireRow.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;";
                for (const ep of presets) {
                    const fireBtn = document.createElement("button");
                    fireBtn.textContent = "★ " + ep.label;
                    fireBtn.title = ep.commands.join(", ") || "No commands";
                    fireBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 10px;border-radius:6px;cursor:pointer;border:1px solid #5a3868;background:rgba(50,20,50,0.5);color:#c090d0;";
                    fireBtn.addEventListener("mouseenter", () => { fireBtn.style.background = "rgba(80,30,80,0.6)"; });
                    fireBtn.addEventListener("mouseleave", () => { fireBtn.style.background = "rgba(50,20,50,0.5)"; });
                    fireBtn.addEventListener("click", () => { sendExprOrPreset("preset:" + ep.id); });
                    fireRow.appendChild(fireBtn);
                }
                epWrap.appendChild(fireRow);
            }

            // Editor: list of presets (edit/delete each) + create new
            const editorWrap = document.createElement("div");
            editorWrap.style.cssText = "display:flex;flex-direction:column;gap:4px;";

            const epMkBtn = (label: string): HTMLButtonElement => {
                const b = document.createElement("button");
                b.textContent = label;
                b.style.cssText = "flex-shrink:0;font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:3px;cursor:pointer;border:1px solid #4c2537;background:#2a1421;color:#cf6f98;";
                return b;
            };

            const EP_GROUPS = ["Blush", "Eyes", "Eyes2", "Mouth", "Eyebrows", "Emoticon"];

            presets.forEach((ep, pIdx) => {
                const card = document.createElement("div");
                card.style.cssText = "display:flex;flex-direction:column;gap:3px;background:rgba(30,10,30,0.5);border:1px solid #3a1538;border-radius:5px;padding:5px 7px;";

                // Header: label + delete
                const cardHdr = document.createElement("div"); cardHdr.style.cssText = "display:flex;align-items:center;gap:4px;";
                const epLblInp = document.createElement("input"); epLblInp.value = ep.label; epLblInp.style.cssText = "flex:1;min-width:0;" + INP;
                epLblInp.addEventListener("change", () => {
                    const upd = getKittyExpressionPresets(); if (upd[pIdx]) { upd[pIdx].label = epLblInp.value.trim() || ep.label; saveKittyExpressionPresets(upd); renderExprPresets(); }
                });
                const epDel = document.createElement("button"); epDel.textContent = "×"; epDel.style.cssText = "font-size:11px;line-height:1;padding:0 4px;border:none;background:transparent;color:#7a5a6a;cursor:pointer;flex-shrink:0;";
                epDel.addEventListener("click", () => { saveKittyExpressionPresets(getKittyExpressionPresets().filter((_, i) => i !== pIdx)); renderExprPresets(); });
                cardHdr.appendChild(epLblInp); cardHdr.appendChild(epDel); card.appendChild(cardHdr);

                // Commands list
                const cmdsWrap = document.createElement("div"); cmdsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;";
                ep.commands.forEach((cmd, cIdx) => {
                    const chip = document.createElement("span"); chip.style.cssText = "display:flex;align-items:center;gap:2px;font-family:'Trebuchet MS',serif;font-size:8px;background:#2a0f2a;border:1px solid #5a2558;border-radius:3px;padding:1px 5px;color:#c090d0;";
                    chip.textContent = cmd;
                    const removeChip = document.createElement("button"); removeChip.textContent = "×"; removeChip.style.cssText = "font-size:9px;line-height:1;padding:0 2px;border:none;background:transparent;color:#9a6080;cursor:pointer;";
                    removeChip.addEventListener("click", () => {
                        const upd = getKittyExpressionPresets(); if (upd[pIdx]) { upd[pIdx].commands.splice(cIdx, 1); saveKittyExpressionPresets(upd); } renderExprPresets();
                    });
                    chip.appendChild(removeChip); cmdsWrap.appendChild(chip);
                });
                if (ep.commands.length === 0) {
                    const em = document.createElement("span"); em.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#5a3a5a;"; em.textContent = "No expressions yet"; cmdsWrap.appendChild(em);
                }
                card.appendChild(cmdsWrap);

                // Add expression row
                const addExprRow = document.createElement("div"); addExprRow.style.cssText = "display:flex;align-items:center;gap:3px;";
                const grpSel = document.createElement("select"); grpSel.style.cssText = "flex-shrink:0;width:80px;" + INP;
                EP_GROUPS.forEach(g => { const o = document.createElement("option"); o.value = g; o.textContent = g; grpSel.appendChild(o); });
                const stateSel = document.createElement("select"); stateSel.style.cssText = "flex:1;min-width:0;" + INP;

                const EP_STATES: Record<string, string[]> = {
                    Blush: ["Low", "Medium", "High", "VeryHigh", "Extreme", ""],
                    Eyes: ["Closed", "Shy", "Sad", "Surprised", "Angry", "Dazed", "Heart", "Lewd", ""],
                    Eyes2: ["Closed", "Shy", "Sad", "Surprised", "Angry", "Dazed", "Heart", "Lewd", ""],
                    Mouth: ["Happy", "Sad", "Pout", "Angry", "Moan", "Devious", "Grin", "Smirk", ""],
                    Eyebrows: ["Raised", "Harsh", "Angry", "Soft", ""],
                    Emoticon: ["Afk", "Hearing_Loss", "Whisper", "Sleep", ""],
                };
                const refreshStateSel = (): void => {
                    stateSel.innerHTML = "";
                    const states = EP_STATES[grpSel.value] ?? [""];
                    states.forEach(s => {
                        const o = document.createElement("option"); o.value = s;
                        o.textContent = s || "(clear)"; stateSel.appendChild(o);
                    });
                };
                refreshStateSel();
                grpSel.addEventListener("change", refreshStateSel);

                const addCmdBtn = epMkBtn("+ Add");
                addCmdBtn.addEventListener("click", () => {
                    const cmd = `${grpSel.value}:${stateSel.value}`;
                    const upd = getKittyExpressionPresets(); if (upd[pIdx]) { upd[pIdx].commands.push(cmd); saveKittyExpressionPresets(upd); } renderExprPresets();
                });
                addExprRow.appendChild(grpSel); addExprRow.appendChild(stateSel); addExprRow.appendChild(addCmdBtn);
                card.appendChild(addExprRow);
                editorWrap.appendChild(card);
            });

            // Create new preset
            const createRow = document.createElement("div"); createRow.style.cssText = "display:flex;align-items:center;gap:4px;";
            const newLblInp = document.createElement("input"); newLblInp.placeholder = t("anims.newPresetName"); newLblInp.style.cssText = "flex:1;min-width:0;" + INP;
            const createBtn = epMkBtn("+ Create");
            createBtn.addEventListener("click", () => {
                const name = newLblInp.value.trim(); if (!name) return;
                const upd = getKittyExpressionPresets();
                upd.push({ id: "ep_" + Date.now(), label: name, commands: [] });
                saveKittyExpressionPresets(upd);
                newLblInp.value = ""; renderExprPresets();
            });
            createRow.appendChild(newLblInp); createRow.appendChild(createBtn);
            editorWrap.appendChild(createRow);
            epWrap.appendChild(editorWrap);
        };

        renderExprPresets();
        exprCBody.appendChild(epDivider);
        exprCBody.appendChild(exprWrap);
        exprCBody.appendChild(exprHint);
        body.appendChild(exprWrap2);
    }

    private renderExpressions(container?: HTMLElement): void {
        const body = container ?? (this.rootEl?.querySelector("#ebc-body") as HTMLElement | null);
        if (!body) return;
        if (!container) { while (body.firstChild) body.removeChild(body.firstChild); }

        const F = "font-family:'Trebuchet MS',serif;font-size:";
        const BTN_BASE = `${F}9px;padding:2px 7px;border-radius:4px;cursor:pointer;flex-shrink:0;`;

        // ── Presets section ───────────────────────────────────────────────────
        const presetsLbl = document.createElement("div");
        presetsLbl.className = "ebc-section-label";
        presetsLbl.textContent = "Presets";
        body.appendChild(presetsLbl);

        const defaultId = getDefaultExprPresetId();
        const presets = getExpressionPresets();

        if (presets.length === 0) {
            const hint = document.createElement("div");
            hint.style.cssText = `${F}9px;color:#6a4a5e;margin-bottom:6px;`;
            hint.textContent = "No presets yet — save your current face below.";
            body.appendChild(hint);
        } else {
            // Quick-apply dropdown
            const quickRow = document.createElement("div");
            quickRow.style.cssText = "display:flex;gap:5px;margin-bottom:6px;align-items:center;";
            const quickSel = document.createElement("select");
            quickSel.className = "ebc-form-input";
            quickSel.style.cssText += "flex:1;min-width:0;font-size:9px;";
            const qPh = document.createElement("option");
            qPh.value = ""; qPh.textContent = "— pick face to apply —"; qPh.disabled = true; qPh.selected = true;
            quickSel.appendChild(qPh);
            for (const p of presets) {
                const o = document.createElement("option"); o.value = p.id; o.textContent = p.name;
                quickSel.appendChild(o);
            }
            const quickApplyBtn = document.createElement("button");
            quickApplyBtn.className = "ebc-create-btn";
            quickApplyBtn.style.cssText = "flex-shrink:0;font-size:9px;padding:3px 8px;";
            quickApplyBtn.textContent = "✓ Apply";
            quickApplyBtn.addEventListener("click", () => {
                const p = presets.find(pr => pr.id === quickSel.value);
                if (p) { applyExpressionPreset(p); this.rerender(150); }
            });
            quickRow.appendChild(quickSel);
            quickRow.appendChild(quickApplyBtn);
            body.appendChild(quickRow);

            const presetList = document.createElement("div");
            presetList.style.cssText = "display:flex;flex-direction:column;gap:3px;margin-bottom:6px;";

            for (const preset of presets) {
                const pRow = document.createElement("div");
                pRow.style.cssText = "display:flex;align-items:center;gap:4px;background:rgba(30,10,25,0.6);border:1px solid #2a1421;border-radius:5px;padding:3px 6px;";

                // ✓ Apply
                const applyBtn = document.createElement("button");
                applyBtn.style.cssText = BTN_BASE + "border:1px solid #5a2840;background:#3a1020;color:#cf6f98;";
                applyBtn.textContent = "✓";
                applyBtn.title = "Apply this preset";
                applyBtn.addEventListener("click", () => { applyExpressionPreset(preset); this.rerender(150); });

                // Name — editable inline; click to rename
                const nameEl = document.createElement("input");
                nameEl.type = "text";
                nameEl.value = preset.name;
                nameEl.maxLength = 30;
                nameEl.title = "Click to rename";
                nameEl.style.cssText = `${F}10px;flex:1;min-width:0;background:transparent;border:1px solid transparent;border-radius:3px;color:#e8d0d8;padding:1px 4px;outline:none;font-family:'Trebuchet MS',serif;`;
                nameEl.addEventListener("focus", () => { nameEl.style.borderColor = "#5a3a6e"; });
                nameEl.addEventListener("blur", () => {
                    nameEl.style.borderColor = "transparent";
                    const trimmed = nameEl.value.trim();
                    if (!trimmed) { nameEl.value = preset.name; return; }
                    const all = getExpressionPresets();
                    const pi = all.findIndex(p => p.id === preset.id);
                    if (pi !== -1 && trimmed !== all[pi].name) { all[pi] = { ...all[pi], name: trimmed }; saveExpressionPresets(all); }
                });

                // ★ Default
                const isDefault = preset.id === defaultId;
                const defaultBtn = document.createElement("button");
                defaultBtn.style.cssText = `${F}12px;background:none;border:none;cursor:pointer;padding:0 2px;flex-shrink:0;line-height:1;color:${isDefault ? "#f0c040" : "#4a3040"};`;
                defaultBtn.textContent = "★";
                defaultBtn.title = isDefault
                    ? "This is your default face — click to unset"
                    : "Set as default face (reverts here after timed expressions)";
                defaultBtn.addEventListener("click", () => {
                    setDefaultExprPresetId(isDefault ? null : preset.id);
                    this.rerender();
                });

                // × Delete
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-outfit-del";
                delBtn.textContent = "×";
                delBtn.title = "Delete preset";
                delBtn.addEventListener("click", () => {
                    // Remove preset; if it was the default, clear the default too
                    if (preset.id === getDefaultExprPresetId()) setDefaultExprPresetId(null);
                    saveExpressionPresets(getExpressionPresets().filter(p => p.id !== preset.id));
                    this.rerender();
                });

                pRow.appendChild(applyBtn);
                pRow.appendChild(nameEl);
                pRow.appendChild(defaultBtn);
                pRow.appendChild(delBtn);
                presetList.appendChild(pRow);
            }
            body.appendChild(presetList);
        }

        // ── Live face preview: shows what expressions are currently active ──
        {
            const activeParts: string[] = [];
            for (const g of EXPR_GROUPS) {
                try {
                    const it = (Player.Appearance as Item[]).find((i: Item) => i.Asset.Group.Name === g);
                    if (it) {
                        const pExpr = (it.Property as Record<string, unknown> | undefined)?.Expression as string | undefined;
                        const n = pExpr || it.Asset.Name;
                        if (n) activeParts.push(`${EXPR_GROUP_LABELS[g] ?? g}: ${n}`);
                    }
                } catch { /* skip group */ }
            }
            const facePreview = document.createElement("div");
            facePreview.style.cssText = `${F}8px;color:#7a5080;margin-bottom:3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;`;
            facePreview.title = activeParts.length ? activeParts.join(", ") : "No expressions set";
            facePreview.textContent = activeParts.length
                ? `Now: ${activeParts.join(" · ")}`
                : "Now: (no expressions set)";
            body.appendChild(facePreview);
        }

        // Save current face as preset — name on its own row, button below
        const captureInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", maxLength: 30, placeholder: t("expr.presetNamePlaceholder"),
        }) as HTMLInputElement;
        captureInput.style.cssText = "width:100%;box-sizing:border-box;margin-bottom:4px;";
        const captureBtn = document.createElement("button");
        captureBtn.className = "ebc-create-btn";
        captureBtn.style.cssText = "width:100%;font-size:9px;padding:4px 8px;box-sizing:border-box;margin-bottom:8px;";
        captureBtn.textContent = t("expr.saveFace");
        captureBtn.addEventListener("click", () => {
            const name = captureInput.value.trim() || "Preset";
            saveExpressionPresets([...getExpressionPresets(), captureCurrentExpression(name)]);
            captureInput.value = "";
            this.rerender();
        });
        body.appendChild(captureInput);
        body.appendChild(captureBtn);

        // Clear all button
        const clearBtn = document.createElement("button");
        clearBtn.className = "ebc-btn-footer-btn";
        clearBtn.style.cssText = "width:100%;margin-bottom:10px;font-size:9px;";
        clearBtn.textContent = t("dev.clearExpressions");
        clearBtn.addEventListener("click", () => {
            for (const g of EXPR_GROUPS) { try { applyExprGroup(g, null); } catch { /* skip */ } }
            this.rerender(150);
        });
        body.appendChild(clearBtn);

        // ── Triggers section ──────────────────────────────────────────────────
        // Collapsible. Fires a preset when outgoing chat contains a match string.
        {
            const divEl = document.createElement("div");
            divEl.className = "ebc-divider";
            divEl.style.margin = "10px 0 6px";
            body.appendChild(divEl);

            let trigCollapsed = true;
            try { const v = localStorage.getItem("EBC_exprTriggersCollapsed"); if (v !== null) trigCollapsed = v === "1"; } catch { /* ignore */ }

            const trigHdr = document.createElement("div");
            trigHdr.style.cssText = "display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;padding:3px 0;";
            const trigChev = document.createElement("span");
            trigChev.style.cssText = `${F}10px;color:#9a6ac8;min-width:10px;`;
            const trigLbl = document.createElement("span");
            trigLbl.className = "ebc-section-label";
            trigLbl.style.cssText = "margin:0;font-size:9px;color:#9a6ac8;";
            trigLbl.textContent = "TRIGGERS";
            const trigHint = document.createElement("span");
            trigHint.style.cssText = `${F}8px;color:#5a3a6e;margin-left:4px;`;
            trigHint.textContent = "apply preset when you send a message";
            trigHdr.appendChild(trigChev);
            trigHdr.appendChild(trigLbl);
            trigHdr.appendChild(trigHint);
            body.appendChild(trigHdr);

            const trigBody = document.createElement("div");
            const updateTrigChev = (): void => {
                trigChev.textContent = trigCollapsed ? "▶" : "▼";
                trigBody.style.display = trigCollapsed ? "none" : "";
            };
            updateTrigChev();
            trigHdr.addEventListener("click", () => {
                trigCollapsed = !trigCollapsed;
                try { localStorage.setItem("EBC_exprTriggersCollapsed", trigCollapsed ? "1" : "0"); } catch { /* ignore */ }
                updateTrigChev();
            });
            body.appendChild(trigBody);

            // Render trigger list
            const renderTrigList = (): void => {
                while (trigBody.firstChild) trigBody.removeChild(trigBody.firstChild);

                const triggers = getExpressionTriggers();
                const allPresets = getExpressionPresets();

                if (triggers.length === 0) {
                    const emptyNote = document.createElement("div");
                    emptyNote.style.cssText = `${F}9px;color:#5a3a5a;padding:4px 0;`;
                    emptyNote.textContent = "No triggers yet.";
                    trigBody.appendChild(emptyNote);
                } else {
                    const trigList = document.createElement("div");
                    trigList.style.cssText = "display:flex;flex-direction:column;gap:3px;margin-bottom:8px;";
                    for (const trig of triggers) {
                        const presetName = allPresets.find(p => p.id === trig.presetId)?.name ?? "?";
                        const durStr = trig.durationMs > 0 ? `${Math.round(trig.durationMs / 1000)} s` : "∞";

                        const tRow = document.createElement("div");
                        tRow.style.cssText = "display:flex;align-items:center;gap:5px;background:rgba(28,10,35,0.6);border:1px solid #2a1440;border-radius:5px;padding:3px 7px;";

                        const tInfo = document.createElement("span");
                        tInfo.style.cssText = `${F}9px;color:#c0a0d8;flex:1;min-width:0;`;
                        tInfo.innerHTML = "";
                        const namePart = document.createElement("b");
                        namePart.style.color = "#d0b0e8";
                        namePart.textContent = trig.name || "Trigger";
                        const restPart = document.createTextNode(`: when msg contains "${trig.matchText}" → ${presetName} (${durStr})`);
                        tInfo.appendChild(namePart);
                        tInfo.appendChild(restPart);

                        const tDel = document.createElement("button");
                        tDel.className = "ebc-outfit-del";
                        tDel.textContent = "×";
                        tDel.title = "Delete trigger";
                        tDel.addEventListener("click", () => {
                            saveExpressionTriggers(getExpressionTriggers().filter(t => t.id !== trig.id));
                            renderTrigList();
                        });

                        tRow.appendChild(tInfo);
                        tRow.appendChild(tDel);
                        trigList.appendChild(tRow);
                    }
                    trigBody.appendChild(trigList);
                }

                // Add trigger form
                const formLbl = document.createElement("div");
                formLbl.style.cssText = `${F}9px;color:#7a5a9e;font-weight:bold;margin-bottom:4px;`;
                formLbl.textContent = "New trigger";
                trigBody.appendChild(formLbl);

                const INP_CSS = `${F}9px;background:#1b0d17;border:1px solid #3a1928;border-radius:3px;color:#f7e6ee;padding:2px 5px;outline:none;`;

                // Row 1: name + match text
                const formRow1 = document.createElement("div");
                formRow1.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";
                const nameInp = document.createElement("input");
                nameInp.className = "ebc-form-input";
                nameInp.style.cssText = INP_CSS + "width:70px;flex-shrink:0;";
                nameInp.type = "text"; nameInp.maxLength = 20; nameInp.placeholder = "Label…";
                const matchInp = document.createElement("input");
                matchInp.className = "ebc-form-input";
                matchInp.style.cssText = INP_CSS + "flex:1;min-width:0;";
                matchInp.type = "text"; matchInp.maxLength = 60; matchInp.placeholder = "match text (e.g. whimpers)";
                formRow1.appendChild(nameInp);
                formRow1.appendChild(matchInp);
                trigBody.appendChild(formRow1);

                // Row 2: preset picker + duration
                const formRow2 = document.createElement("div");
                formRow2.style.cssText = "display:flex;gap:4px;margin-bottom:6px;align-items:center;";
                const presetSel = document.createElement("select");
                presetSel.style.cssText = INP_CSS + "flex:1;min-width:0;";
                const emptyOpt = document.createElement("option");
                emptyOpt.value = ""; emptyOpt.textContent = "— pick preset —";
                presetSel.appendChild(emptyOpt);
                for (const p of getExpressionPresets()) {
                    const opt = document.createElement("option");
                    opt.value = p.id; opt.textContent = p.name;
                    presetSel.appendChild(opt);
                }
                const TRIG_DUR_OPTS: [string, number][] = [
                    ["♾ keep", 0], ["3 s", 3000], ["5 s", 5000],
                    ["10 s", 10000], ["30 s", 30000], ["1 min", 60000],
                ];
                const durSel = document.createElement("select");
                durSel.style.cssText = INP_CSS + "flex-shrink:0;max-width:60px;cursor:pointer;";
                durSel.title = "How long to hold this face before reverting (♾ = keep forever)";
                for (const [label, ms] of TRIG_DUR_OPTS) {
                    const o = document.createElement("option");
                    o.value = String(ms); o.textContent = label;
                    if (ms === 5000) o.selected = true;
                    durSel.appendChild(o);
                }
                formRow2.appendChild(presetSel);
                formRow2.appendChild(durSel);
                trigBody.appendChild(formRow2);

                const addTrigBtn = document.createElement("button");
                addTrigBtn.className = "ebc-create-btn";
                addTrigBtn.style.cssText = "width:100%;margin-bottom:4px;font-size:9px;";
                addTrigBtn.textContent = "+ Add Trigger";
                addTrigBtn.addEventListener("click", () => {
                    const match = matchInp.value.trim();
                    const presetId = presetSel.value;
                    if (!match || !presetId) {
                        addTrigBtn.textContent = "Fill in match text and preset!";
                        window.setTimeout(() => { addTrigBtn.textContent = "+ Add Trigger"; }, 1500);
                        return;
                    }
                    const newTrig: ExpressionTrigger = {
                        id: Math.random().toString(36).slice(2, 9),
                        name: nameInp.value.trim() || match.slice(0, 15),
                        matchText: match,
                        presetId,
                        durationMs: parseInt(durSel.value) || 0,
                    };
                    saveExpressionTriggers([...getExpressionTriggers(), newTrig]);
                    renderTrigList();
                });
                trigBody.appendChild(addTrigBtn);
            };

            renderTrigList();
        }
    }

    private renderThanks(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const credLbl = document.createElement("div");
        credLbl.className = "ebc-section-label";
        credLbl.textContent = t("credits.specialThanks");
        body.appendChild(credLbl);

        const intro = document.createElement("div");
        intro.className = "ebc-thanks-intro";
        intro.textContent = t("credits.intro") + " ";
        const introSub = document.createElement("span");
        introSub.style.cssText = "font-size:9px;color:#6a4a5e;font-family:'Trebuchet MS',serif;";
        introSub.textContent = "EmeryBC";
        intro.appendChild(introSub);
        body.appendChild(intro);

        const people = [
            {
                emoji: "🐾",
                name: "Emery",
                memberId: 130267,
                reason: t("credits.emery"),
                heart: "🐾",
            },
            {
                emoji: "🎀",
                name: "Sin",
                memberId: 143776,
                reason: t("credits.sin"),
                heart: "💗",
            },
            {
                emoji: "🌙",
                name: "Lucy",
                memberId: 230466,
                reason: t("credits.lucy"),
                heart: "💜",
            },
            {
                emoji: "🌸",
                name: "Lara",
                memberId: 124264,
                reason: t("credits.lara"),
                heart: "💖",
            },
            {
                emoji: "✨",
                name: "Sybil",
                memberId: 80,
                reason: t("credits.sybil"),
                heart: "💛",
            },
        ];

        // Same FA paw SVG path used by the in-game creator badge in main.ts.
        // Inlined here so the credits card can use it as a real SVG rather than an emoji.
        const makePawSvg = (size: number): HTMLSpanElement => {
            const span = document.createElement("span");
            span.className = "ebc-thanks-paw-icon";
            span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><path fill="#ffd700" d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5 .3-86.2 32.6-96.8 70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3-14.3-70.1 10.2-84.1 59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5 0 46.3-30.6 88.4-76.2 92.2-17.6 1.5-34.7-3.5-53.9-9.2-15.7-4.7-32.8-9.9-51.9-9.9-19.1 0-36.2 5.2-51.9 9.9-19.2 5.7-36.3 10.7-53.9 9.2C57.6 519.6 27 477.5 27 431.2c0-10.4 1.6-20.8 5.2-30.5zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5 46.9 53.9 32.6 96.8-52.1 69.1-84.4 58.5zM421.6 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3 29.1 51.7 10.2 84.1-54 47.3-78.5 33.3z"/></svg>`;
            return span;
        };

        for (const p of people) {
            const card = document.createElement("div");
            card.className = "ebc-thanks-card";

            const isPawCard = p.memberId === 130267;
            // Creator card: golden left-border accent, no background tint
            if (isPawCard) {
                card.style.borderLeftColor = "#c89030";
                card.style.borderLeftWidth = "3px";
            }

            // Avatar circle — paw SVG for creator, emoji for everyone else
            const avatar = document.createElement("div");
            avatar.className = "ebc-thanks-avatar" + (isPawCard ? " ebc-thanks-avatar-paw" : "");
            if (isPawCard) {
                avatar.appendChild(makePawSvg(28));
            } else {
                avatar.textContent = p.emoji;
            }

            const info = document.createElement("div");
            info.className = "ebc-thanks-info";

            const nameRow = document.createElement("div");
            nameRow.style.cssText = "display:flex;align-items:baseline;gap:5px;";

            const namEl = document.createElement("span");
            namEl.className = "ebc-thanks-name";
            namEl.textContent = p.name;
            const vipCredit = VIP_MEMBERS[p.memberId];
            if (vipCredit) applyGradientText(namEl, vipCredit.gradient[0], vipCredit.gradient[1]);

            // Creator gets a small golden "Creator" label; others get a muted member ID
            if (isPawCard) {
                const creatorBadge = document.createElement("span");
                creatorBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:bold;color:#c89030;letter-spacing:0.06em;text-transform:uppercase;";
                creatorBadge.textContent = "Creator";
                nameRow.appendChild(namEl);
                nameRow.appendChild(creatorBadge);
            } else {
                const idEl2 = document.createElement("span");
                idEl2.className = "ebc-member-chip";
                idEl2.textContent = "#" + p.memberId;
                idEl2.title = "BC Member Number";
                nameRow.appendChild(namEl);
                nameRow.appendChild(idEl2);
            }

            const reason = document.createElement("span");
            reason.className = "ebc-thanks-reason";
            reason.textContent = p.reason;

            info.appendChild(nameRow);
            info.appendChild(reason);

            card.appendChild(avatar);
            card.appendChild(info);

            // Right decoration — skip for the creator card (avatar already has the paw)
            if (!isPawCard) {
                const heart = document.createElement("span");
                heart.className = "ebc-thanks-heart";
                heart.textContent = p.heart;
                card.appendChild(heart);
            }
            body.appendChild(card);
        }
    }

    // -- DOM Tools tab (creator-only) ------------------------------------------

    private renderDomTools(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // ── Auto-Escape (visible to all, not gated behind isDomEnabled) ───────
        const aeLbl = document.createElement("div");
        aeLbl.className = "ebc-section-label";
        aeLbl.textContent = "Auto-Escape";
        body.appendChild(aeLbl);

        const antiRow = document.createElement("div");
        antiRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;margin-bottom:8px;";

        const antiInfo = document.createElement("div");
        antiInfo.style.cssText = "flex:1;min-width:0;";
        const antiTitle = document.createElement("span");
        antiTitle.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
        antiTitle.textContent = "Auto-escape incoming restraints";
        const antiHint = document.createElement("span");
        antiHint.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-top:1px;";
        antiHint.textContent = "Removes any restraint put on you and sends a playful room emote";
        antiInfo.appendChild(antiTitle);
        antiInfo.appendChild(antiHint);

        const antiToggle = document.createElement("button");
        const refreshAntiToggle = (): void => {
            const on = getAntiRestraintEnabled();
            antiToggle.textContent = on ? t("core.on") : t("core.off");
            antiToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif",
                "font-size:10px",
                "font-weight:bold",
                "padding:2px 10px",
                "border-radius:4px",
                "cursor:pointer",
                "flex-shrink:0",
                "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                "background:" + (on ? "#6b3048" : "#1b0d17"),
                "color:" + (on ? "#f7e6ee" : "#9a7080"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
        };
        refreshAntiToggle();
        antiToggle.addEventListener("click", () => {
            const next = !getAntiRestraintEnabled();
            setAntiRestraintEnabled(next);
            if (next) try { snapshotPlayerRestraints(); } catch { /* ignore */ }
            refreshAntiToggle();
        });
        antiRow.appendChild(antiInfo);
        antiRow.appendChild(antiToggle);
        body.appendChild(antiRow);

        // -- Whitelist --
        const whitelistSection = document.createElement("div");
        whitelistSection.style.cssText = "margin-bottom:10px;";

        const wlTitle = document.createElement("span");
        wlTitle.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;";
        wlTitle.textContent = "Escape whitelist — specific items auto-escape will never remove";
        whitelistSection.appendChild(wlTitle);

        // Stored custom labels for whitelist chips: itemKey → display name override
        const WL_LABELS_KEY = "EBC_wlLabels";
        const getWlLabels = (): Record<string, string> => { try { const r = localStorage.getItem(WL_LABELS_KEY); return r ? JSON.parse(r) as Record<string, string> : {}; } catch { return {}; } };
        const setWlLabel = (key: string, label: string): void => { try { const m = getWlLabels(); if (label) m[key] = label; else delete m[key]; localStorage.setItem(WL_LABELS_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

        const domMakeChip = (key: string, fallbackLabel: string, onRemove: () => void): HTMLDivElement => {
            const chip = document.createElement("div");
            chip.style.cssText = "display:inline-flex;align-items:center;gap:3px;background:#3a1928;border:1px solid #6b3048;border-radius:10px;padding:2px 7px 2px 8px;font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;margin:2px 2px 2px 0;";
            const txt = document.createElement("span");
            const labels = getWlLabels();
            txt.textContent = labels[key] ?? fallbackLabel;
            txt.title = "Click to rename";
            txt.style.cssText = "cursor:pointer;border-bottom:1px dashed #6b3048;";
            txt.addEventListener("click", (e) => {
                e.stopPropagation();
                showNameInputOverlay(`Rename "${txt.textContent}"`, txt.textContent ?? fallbackLabel, "Rename", (newName) => {
                    setWlLabel(key, newName);
                    txt.textContent = newName;
                });
            });
            const x = document.createElement("button");
            x.textContent = "×";
            x.title = "Remove from whitelist";
            x.style.cssText = "background:none;border:none;cursor:pointer;color:#cf6f98;font-size:11px;line-height:1;padding:0 0 0 2px;";
            x.addEventListener("click", onRemove);
            chip.appendChild(txt);
            chip.appendChild(x);
            return chip;
        };

        const wlChips = document.createElement("div");
        wlChips.style.cssText = "min-height:18px;margin-bottom:6px;";
        const wlAddRow = document.createElement("div");
        wlAddRow.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;";

        const refreshWhitelistUI = (): void => {
            wlChips.innerHTML = "";
            wlAddRow.innerHTML = "";
            const whitelist = getAntiRestraintWhitelist();
            if (whitelist.length === 0) {
                const empty = document.createElement("span");
                empty.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-style:italic;";
                empty.textContent = "Nothing whitelisted — all new restraints will be escaped";
                wlChips.appendChild(empty);
            } else {
                for (const key of whitelist) {
                    // Display the key in a friendly way:
                    // "AssetName|CraftName" → "CraftName" ; "AssetName" → AssetName (stripped of camelCase)
                    const parts = key.split("|");
                    const fallback = parts.length > 1
                        ? parts[1]  // craft name is already human-readable
                        : parts[0].replace(/([A-Z])/g, " $1").trim();
                    wlChips.appendChild(domMakeChip(key, fallback, () => {
                        removeFromAntiRestraintWhitelist(key);
                        refreshWhitelistUI();
                    }));
                }
            }
            try {
                const wornItems = Player.Appearance
                    .filter((i: Item) => RESTRAINT_GROUPS.has(i.Asset.Group.Name) && !whitelist.includes(getItemKey(i)));
                if (wornItems.length > 0) {
                    // Collapsible "add from worn" toggle
                    const wornToggle = document.createElement("button");
                    wornToggle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:transparent;border:1px solid #3a1928;border-radius:4px;color:#9a7888;padding:3px 9px;cursor:pointer;display:flex;align-items:center;gap:5px;width:100%;margin-bottom:2px;transition:border-color 0.12s,color 0.12s;";
                    const wornList = document.createElement("div");
                    wornList.style.cssText = "display:none;flex-wrap:wrap;gap:3px;margin-bottom:2px;";
                    let wornOpen = false;
                    const refreshWornToggle = (): void => {
                        wornToggle.textContent = (wornOpen ? "▼" : "▶") + "  Currently wearing — click to whitelist";
                        wornList.style.display = wornOpen ? "flex" : "none";
                    };
                    refreshWornToggle();
                    wornToggle.addEventListener("mouseenter", () => { wornToggle.style.color = "#cf6f98"; wornToggle.style.borderColor = "#6b3048"; });
                    wornToggle.addEventListener("mouseleave", () => { wornToggle.style.color = "#9a7888"; wornToggle.style.borderColor = "#3a1928"; });
                    wornToggle.addEventListener("click", () => { wornOpen = !wornOpen; refreshWornToggle(); });
                    for (const item of wornItems) {
                        const btn = document.createElement("button");
                        const displayName = getItemDisplayName(item);
                        btn.textContent = "+ " + displayName;
                        btn.title = `Whitelist this item — auto-escape will keep it`;
                        btn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;border:1px solid #4c2537;border-radius:10px;color:#9a7888;padding:2px 8px;cursor:pointer;transition:color 0.12s,border-color 0.12s;";
                        btn.addEventListener("mouseenter", () => { btn.style.color = "#cf6f98"; btn.style.borderColor = "#6b3048"; });
                        btn.addEventListener("mouseleave", () => { btn.style.color = "#9a7888"; btn.style.borderColor = "#4c2537"; });
                        btn.addEventListener("click", () => { addToAntiRestraintWhitelist(getItemKey(item)); refreshWhitelistUI(); });
                        wornList.appendChild(btn);
                    }
                    wlAddRow.appendChild(wornToggle);
                    wlAddRow.appendChild(wornList);
                }
            } catch { /* ignore */ }
        };

        refreshWhitelistUI();
        whitelistSection.appendChild(wlChips);
        whitelistSection.appendChild(wlAddRow);
        body.appendChild(whitelistSection);

        // ── Room Admin ────────────────────────────────────────────────────────
        const divAdmin = document.createElement("div");
        divAdmin.className = "ebc-divider";
        body.appendChild(divAdmin);

        const adminLbl = document.createElement("div");
        adminLbl.className = "ebc-section-label";
        adminLbl.textContent = "ROOM ADMIN";
        body.appendChild(adminLbl);

        type RoomDataShape = { Locked?: boolean; Admin?: number[] };
        const w = window as unknown as Record<string, unknown>;
        const roomData = w.ChatRoomData as RoomDataShape | null | undefined;
        const inRoom   = (w.CurrentScreen as string | undefined) === "ChatRoom" && roomData != null;
        const isAdmin  = inRoom && Array.isArray(roomData?.Admin) && (roomData.Admin as number[]).includes(Player.MemberNumber);

        if (!inRoom) {
            const hint = document.createElement("div");
            hint.className = "ebc-import-hint";
            hint.style.marginBottom = "6px";
            hint.textContent = "Not in a chatroom.";
            body.appendChild(hint);
        } else if (!isAdmin) {
            const hint = document.createElement("div");
            hint.className = "ebc-import-hint";
            hint.style.marginBottom = "6px";
            hint.textContent = "You are not a room admin.";
            body.appendChild(hint);
        } else {
            const adminWrap = document.createElement("div");
            adminWrap.style.cssText = "display:flex;flex-direction:column;gap:7px;margin-bottom:8px;";

            // ── Lock / Unlock ─────────────────────────────────────────────────
            const locked = roomData?.Locked ?? false;
            const lockBtn = document.createElement("button");
            lockBtn.style.cssText = [
                "width:100%",
                "font-family:'Trebuchet MS',serif",
                "font-size:11px",
                "font-weight:bold",
                "padding:8px 4px",
                "border-radius:6px",
                "cursor:pointer",
                "transition:background 0.14s,border-color 0.14s",
                locked
                    ? "border:1px solid #cf6f98;background:#6b2040;color:#ffd0e0;"
                    : "border:1px solid #5a9860;background:#1a3e20;color:#a0e090;",
            ].join(";");
            lockBtn.textContent = locked ? "🔒 Room Locked — Click to Unlock" : "🔓 Room Unlocked — Click to Lock";
            lockBtn.title = locked ? "Unlock the room so anyone can join" : "Lock the room to prevent new joins";
            lockBtn.addEventListener("click", () => {
                try { ServerSend("ChatRoomAdmin", { MemberNumber: Player.MemberNumber, Action: locked ? "Unlock" : "Lock" }); } catch { /* ignore */ }
                // Optimistic local update — server will confirm
                window.setTimeout(() => this.rerender(), 200);
            });
            adminWrap.appendChild(lockBtn);

            // ── Member picker + action buttons ────────────────────────────────
            const memberSel = document.createElement("select");
            memberSel.className = "ebc-form-input";
            memberSel.style.cssText = "width:100%;font-size:10px;";
            const ph = document.createElement("option");
            ph.value = ""; ph.textContent = "— choose member —";
            ph.disabled = true; ph.selected = true;
            memberSel.appendChild(ph);

            const buildMemberOpts = (): void => {
                while (memberSel.firstChild) memberSel.removeChild(memberSel.firstChild);
                memberSel.appendChild(ph);
                for (const m of getRoomMembers()) {
                    if (m.id === Player.MemberNumber) continue;
                    const opt = document.createElement("option");
                    opt.value = String(m.id);
                    opt.textContent = `${m.name} (#${m.id})`;
                    memberSel.appendChild(opt);
                }
                ph.textContent = memberSel.children.length <= 1 ? "— no other members —" : "— choose member —";
            };
            buildMemberOpts();

            const makeBtn = (label: string, title: string, border: string, bg: string, color: string): HTMLButtonElement => {
                const btn = document.createElement("button");
                btn.textContent = label;
                btn.title = title;
                btn.disabled = true;
                btn.style.cssText = [
                    "flex:1",
                    "font-family:'Trebuchet MS',serif",
                    "font-size:10px",
                    "font-weight:bold",
                    "padding:6px 4px",
                    "border-radius:6px",
                    "cursor:pointer",
                    "opacity:0.45",
                    "transition:background 0.14s,opacity 0.14s",
                    `border:1px solid ${border}`,
                    `background:${bg}`,
                    `color:${color}`,
                ].join(";");
                return btn;
            };

            const kickBtn  = makeBtn("👢 Kick",    "Kick this member from the room",     "#7a3a1a", "#3a1a08", "#f0a060");
            const banBtn   = makeBtn("🚫 Ban",      "Ban this member from the room",      "#7a2020", "#3a0808", "#ff8888");
            const promBtn  = makeBtn("⭐ Promote", "Give room admin to this member",      "#3a7030", "#152a10", "#90e080");
            const demBtn   = makeBtn("⬇ Demote",  "Remove room admin from this member",  "#3a4070", "#101828", "#80a0f0");

            const allActionBtns = [kickBtn, banBtn, promBtn, demBtn];

            const syncBtns = (): void => {
                const has = memberSel.value !== "";
                for (const b of allActionBtns) {
                    b.disabled = !has;
                    b.style.opacity = has ? "1" : "0.45";
                    b.style.cursor  = has ? "pointer" : "default";
                }
            };
            memberSel.addEventListener("change", syncBtns);

            const sendAction = (action: string): void => {
                const id = parseInt(memberSel.value, 10);
                if (!id) return;
                try { ServerSend("ChatRoomAdmin", { MemberNumber: id, Action: action }); } catch { /* ignore */ }
            };

            kickBtn.addEventListener("click", () => sendAction("Kick"));
            banBtn.addEventListener("click",  () => sendAction("Ban"));
            promBtn.addEventListener("click", () => sendAction("Promote"));
            demBtn.addEventListener("click",  () => sendAction("Demote"));

            const refreshBtn2 = document.createElement("button");
            refreshBtn2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:2px 7px;border-radius:4px;border:1px solid #4c2537;background:transparent;color:#7a4a5e;cursor:pointer;flex-shrink:0;";
            refreshBtn2.textContent = "↻";
            refreshBtn2.title = "Refresh member list";
            refreshBtn2.addEventListener("click", buildMemberOpts);

            const selRow = document.createElement("div");
            selRow.style.cssText = "display:flex;gap:5px;align-items:center;";
            selRow.appendChild(memberSel);
            selRow.appendChild(refreshBtn2);

            const row1 = document.createElement("div");
            row1.style.cssText = "display:flex;gap:5px;";
            row1.appendChild(kickBtn);
            row1.appendChild(banBtn);

            const row2 = document.createElement("div");
            row2.style.cssText = "display:flex;gap:5px;";
            row2.appendChild(promBtn);
            row2.appendChild(demBtn);

            adminWrap.appendChild(selRow);
            adminWrap.appendChild(row1);
            adminWrap.appendChild(row2);
            body.appendChild(adminWrap);
        }

        // ── DOM Tools (creator-only below this point) ─────────────────────────
        if (!isDomEnabled()) {
            const msg = document.createElement("div");
            msg.className = "ebc-empty";
            msg.textContent = "Not available.";
            body.appendChild(msg);
            return;
        }

        // Sync selected targets: add any new targets that aren't tracked yet
        const allTargetIds = getDomConfig().targets.map(t => t.id);
        if (this.domSelectedTargets.size === 0) {
            allTargetIds.forEach(id => this.domSelectedTargets.add(id));
        }
        // Remove stale IDs
        for (const id of this.domSelectedTargets) {
            if (!allTargetIds.includes(id)) this.domSelectedTargets.delete(id);
        }

        // Helper: labelled text input row
        const makeField = (label: string, value: string, prefix = "", placeholder = ""): { row: HTMLDivElement; input: HTMLInputElement } => {
            const row = document.createElement("div");
            row.style.cssText = "margin-bottom:5px;";
            const lbl = document.createElement("label");
            lbl.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;";
            lbl.textContent = label;
            row.appendChild(lbl);
            const wrap = document.createElement("div");
            wrap.style.cssText = "display:flex;align-items:center;";
            if (prefix) {
                const pre = document.createElement("span");
                pre.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;background:#1b0d17;border:1px solid #4c2537;border-right:none;border-radius:4px 0 0 4px;padding:3px 5px;flex-shrink:0;";
                pre.textContent = prefix;
                wrap.appendChild(pre);
            }
            const input = document.createElement("input");
            input.type = "text";
            input.value = value;
            if (placeholder) input.placeholder = placeholder;
            input.style.cssText = `flex:1;min-width:0;background:#1b0d17;border:1px solid #4c2537;${prefix ? "border-radius:0 4px 4px 0;" : "border-radius:4px;"}color:#f7e6ee;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 6px;outline:none;transition:border-color 0.14s;`;
            input.addEventListener("focus", () => { input.style.borderColor = "#91405f"; });
            input.addEventListener("blur",  () => { input.style.borderColor = "#4c2537"; });
            wrap.appendChild(input);
            row.appendChild(wrap);
            return { row, input };
        };

        // ── Targets ──────────────────────────────────────────────────────────
        const targLbl = document.createElement("div");
        targLbl.className = "ebc-section-label";
        targLbl.textContent = "Targets";
        body.appendChild(targLbl);

        const targList = document.createElement("div");
        body.appendChild(targList);

        const rebuildTargets = (): void => {
            while (targList.firstChild) targList.removeChild(targList.firstChild);
            for (const t of getDomConfig().targets) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:6px;margin-bottom:3px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;";
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = this.domSelectedTargets.has(t.id);
                cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                cb.addEventListener("change", () => {
                    if (cb.checked) this.domSelectedTargets.add(t.id);
                    else this.domSelectedTargets.delete(t.id);
                });
                row.appendChild(cb);
                const nameEl = document.createElement("span");
                nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                nameEl.textContent = t.name;
                const numEl = document.createElement("span");
                numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;";
                numEl.textContent = "#" + t.id;
                const delBtn = document.createElement("button");
                delBtn.style.cssText = "background:transparent;border:1px solid #4c2537;border-radius:4px;color:#9a7080;cursor:pointer;font-size:11px;padding:1px 6px;transition:background 0.14s,color 0.12s;";
                delBtn.textContent = "×";
                delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "#3a1017"; delBtn.style.color = "#ff6b6b"; });
                delBtn.addEventListener("mouseleave", () => { delBtn.style.background = ""; delBtn.style.color = "#9a7080"; });
                delBtn.addEventListener("click", () => { removeDomTarget(t.id); rebuildTargets(); rebuildAddable(); });
                row.appendChild(nameEl); row.appendChild(numEl); row.appendChild(delBtn);
                targList.appendChild(row);
            }
        };
        rebuildTargets();

        const addableWrap = document.createElement("div");
        addableWrap.style.cssText = "margin-top:4px;margin-bottom:2px;";
        body.appendChild(addableWrap);

        const rebuildAddable = (): void => {
            while (addableWrap.firstChild) addableWrap.removeChild(addableWrap.firstChild);
            const addable = getRoomAddable();
            if (addable.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:3px 2px;";
                hint.textContent = "No new people in room to add.";
                addableWrap.appendChild(hint);
                return;
            }
            const addLbl = document.createElement("div");
            addLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#967281;margin-bottom:4px;";
            addLbl.textContent = "Add from room:";
            addableWrap.appendChild(addLbl);
            const chipRow = document.createElement("div");
            chipRow.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
            for (const p of addable) {
                const chip = document.createElement("button");
                chip.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid #4c2537;background:#1b0d17;color:#967281;cursor:pointer;transition:background 0.14s,color 0.12s,border-color 0.12s;";
                chip.textContent = "+ " + p.name + " #" + p.id;
                chip.addEventListener("mouseenter", () => { chip.style.background = "#2a1421"; chip.style.color = "#cf6f98"; chip.style.borderColor = "#7a4a5e"; });
                chip.addEventListener("mouseleave", () => { chip.style.background = "#1b0d17"; chip.style.color = "#967281"; chip.style.borderColor = "#4c2537"; });
                chip.addEventListener("click", () => { addDomTarget(p.id, p.name); rebuildTargets(); rebuildAddable(); });
                chipRow.appendChild(chip);
            }
            addableWrap.appendChild(chipRow);
        };
        rebuildAddable();

        // ── ⛑ Room Rescue (collapsible, appended at the very end) ──────────────
        const divRescue = document.createElement("div");
        divRescue.className = "ebc-divider";
        divRescue.style.margin = "10px 0 0";
        // (appended at the bottom of renderDomTools)

        // Clickable header row
        const rescueHdr = document.createElement("div");
        rescueHdr.style.cssText = "display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:pointer;user-select:none;border-radius:6px;transition:background 0.12s;";
        rescueHdr.addEventListener("mouseenter", () => { rescueHdr.style.background = "rgba(42,20,33,0.5)"; });
        rescueHdr.addEventListener("mouseleave", () => { rescueHdr.style.background = ""; });

        const rescueHdrIcon = document.createElement("span");
        rescueHdrIcon.textContent = "⛑";
        rescueHdrIcon.style.cssText = "font-size:11px;flex-shrink:0;";

        const rescueHdrLbl = document.createElement("span");
        rescueHdrLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;letter-spacing:0.05em;color:#cf6f98;flex:1;";
        rescueHdrLbl.textContent = "ROOM RESCUE";

        const rescueArrow = document.createElement("span");
        rescueArrow.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5060;flex-shrink:0;";
        rescueArrow.textContent = "▼";

        rescueHdr.appendChild(rescueHdrIcon);
        rescueHdr.appendChild(rescueHdrLbl);
        rescueHdr.appendChild(rescueArrow);
        // (appended at the bottom of renderDomTools)

        // Collapsible content panel
        const rescuePanel = document.createElement("div");
        rescuePanel.style.cssText = "display:none;flex-direction:column;gap:5px;padding:4px 8px 8px;";

        let rescuePanelOpen = false;
        rescueHdr.addEventListener("click", () => {
            rescuePanelOpen = !rescuePanelOpen;
            rescuePanel.style.display = rescuePanelOpen ? "flex" : "none";
            rescueArrow.textContent = rescuePanelOpen ? "▲" : "▼";
            if (rescuePanelOpen) { populateRescueSel(); rebuildRescueItems(); }
        });

        // Hint
        const rescueHint = document.createElement("div");
        rescueHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a6878;line-height:1.4;";
        rescueHint.textContent = "Strips all locks and restraints from any room member — bypasses all lock rules.";
        rescuePanel.appendChild(rescueHint);

        // Person picker row
        const rescueRow = document.createElement("div");
        rescueRow.style.cssText = "display:flex;gap:5px;align-items:center;";

        const rescueSel = document.createElement("select");
        rescueSel.className = "ebc-form-input";
        rescueSel.style.cssText = "flex:1;font-size:10px;";
        const rescuePh = document.createElement("option");
        rescuePh.value = ""; rescuePh.textContent = "— choose person —";
        rescuePh.disabled = true; rescuePh.selected = true;
        rescueSel.appendChild(rescuePh);

        const populateRescueSel = (): void => {
            while (rescueSel.firstChild) rescueSel.removeChild(rescueSel.firstChild);
            rescueSel.appendChild(rescuePh);
            const members = getRoomMembers();
            for (const m of members) {
                const opt = document.createElement("option");
                opt.value = String(m.id);
                opt.textContent = `${m.name} (#${m.id})`;
                rescueSel.appendChild(opt);
            }
            rescuePh.textContent = members.length === 0 ? "— no one else in room —" : "— choose person —";
        };

        const rescueRefreshBtn = document.createElement("button");
        rescueRefreshBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 7px;border-radius:5px;border:1px solid #4c2537;background:transparent;color:#7a4a5e;cursor:pointer;flex-shrink:0;";
        rescueRefreshBtn.textContent = "↻";
        rescueRefreshBtn.title = "Refresh room member list";
        rescueRefreshBtn.addEventListener("click", () => { populateRescueSel(); rebuildRescueItems(); });

        rescueRow.appendChild(rescueSel);
        rescueRow.appendChild(rescueRefreshBtn);
        rescuePanel.appendChild(rescueRow);

        // ── Rescue: item list with checkboxes ─────────────────────────────────
        const rescueSelected = new Set<string>();

        // Select-all row (hidden until items loaded)
        const selAllRow = document.createElement("div");
        selAllRow.style.cssText = "display:none;align-items:center;gap:6px;padding:2px 6px 4px;border-bottom:1px solid #3a1928;margin-bottom:2px;";
        const selAllChk = document.createElement("input");
        selAllChk.type = "checkbox";
        selAllChk.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
        const selAllLbl = document.createElement("span");
        selAllLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;";
        selAllLbl.textContent = "Select / deselect all";
        selAllRow.appendChild(selAllChk);
        selAllRow.appendChild(selAllLbl);

        // Scrollable item list
        const rescueItemsEl = document.createElement("div");
        rescueItemsEl.style.cssText = "display:none;flex-direction:column;gap:1px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;border-radius:6px;padding:5px 7px;max-height:150px;overflow-y:auto;";

        // 🔓 Unlock Selected button
        const unlockSelBtn = document.createElement("button");
        unlockSelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:6px 4px;border-radius:6px;border:1px solid #5a3a2a;background:#3a1e0e;color:#f0c080;cursor:pointer;transition:background 0.14s;opacity:0.45;";
        unlockSelBtn.textContent = "🔓 Unlock Selected";
        unlockSelBtn.title = "Clear locks on selected items only (does not remove them)";
        unlockSelBtn.disabled = true;

        // 🗑 Remove Selected button
        const removeSelBtn = document.createElement("button");
        removeSelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:6px 4px;border-radius:6px;border:1px solid #5a2030;background:#3a0e18;color:#ffc0cc;cursor:pointer;transition:background 0.14s;opacity:0.45;";
        removeSelBtn.textContent = "🗑 Remove Selected";
        removeSelBtn.title = "Remove selected items from this person (clears locks first)";
        removeSelBtn.disabled = true;

        // Action row
        const actBtnRow = document.createElement("div");
        actBtnRow.style.cssText = "display:flex;gap:5px;";
        actBtnRow.appendChild(unlockSelBtn);
        actBtnRow.appendChild(removeSelBtn);

        // Remove All button
        const rescueBtn = document.createElement("button");
        rescueBtn.style.cssText = "width:100%;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:7px 4px;border-radius:6px;border:1px solid #c0304a;background:#6b1428;color:#ffd0d8;cursor:pointer;transition:background 0.14s;";
        rescueBtn.textContent = "⛑ Remove All";
        rescueBtn.title = "Strip all locks + remove all restraints from selected person";

        // Status line
        const rescueStatus = document.createElement("div");
        rescueStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;min-height:13px;";

        // ── Helpers ────────────────────────────────────────────────────────────
        const updateActionBtns = (): void => {
            const has = rescueSelected.size > 0;
            unlockSelBtn.disabled = !has;
            removeSelBtn.disabled = !has;
            unlockSelBtn.style.opacity = has ? "1" : "0.45";
            removeSelBtn.style.opacity = has ? "1" : "0.45";
        };

        const rebuildRescueItems = (): void => {
            while (rescueItemsEl.firstChild) rescueItemsEl.removeChild(rescueItemsEl.firstChild);
            rescueSelected.clear();
            selAllRow.style.display = "none";
            rescueItemsEl.style.display = "none";
            selAllChk.checked = false;
            selAllChk.indeterminate = false;
            const id = parseInt(rescueSel.value, 10);
            if (!id) { updateActionBtns(); return; }
            const items = getRoomMemberItems(id);
            if (items.length === 0) { updateActionBtns(); return; }
            rescueItemsEl.style.display = "flex";
            selAllRow.style.display = "flex";
            for (const it of items) {
                const row2 = document.createElement("div");
                row2.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 0;";
                const chk = document.createElement("input");
                chk.type = "checkbox";
                chk.dataset.group = it.group;
                chk.style.cssText = "cursor:pointer;flex-shrink:0;accent-color:#cf6f98;";
                chk.addEventListener("change", () => {
                    if (chk.checked) rescueSelected.add(it.group);
                    else rescueSelected.delete(it.group);
                    const allChks = Array.from(rescueItemsEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));
                    const n = allChks.filter(c => c.checked).length;
                    selAllChk.indeterminate = n > 0 && n < allChks.length;
                    selAllChk.checked = n === allChks.length;
                    updateActionBtns();
                });
                const lockIco = document.createElement("span");
                lockIco.style.cssText = "font-size:9px;flex-shrink:0;width:13px;text-align:center;";
                lockIco.textContent = it.locked ? "🔒" : "";
                const nm = document.createElement("span");
                nm.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                nm.textContent = it.name;
                const grp = document.createElement("span");
                grp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;flex-shrink:0;";
                grp.textContent = it.group.replace("Item", "");
                row2.appendChild(chk); row2.appendChild(lockIco); row2.appendChild(nm); row2.appendChild(grp);
                rescueItemsEl.appendChild(row2);
            }
            updateActionBtns();
        };

        // Select-all toggle
        selAllChk.addEventListener("change", () => {
            const allChks = Array.from(rescueItemsEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));
            allChks.forEach(c => {
                c.checked = selAllChk.checked;
                if (selAllChk.checked) rescueSelected.add(c.dataset.group!);
                else rescueSelected.delete(c.dataset.group!);
            });
            selAllChk.indeterminate = false;
            updateActionBtns();
        });

        rescueSel.addEventListener("change", () => rebuildRescueItems());

        // Unlock Selected
        unlockSelBtn.addEventListener("mouseenter", () => { if (!unlockSelBtn.disabled) unlockSelBtn.style.background = "#5a2e1a"; });
        unlockSelBtn.addEventListener("mouseleave", () => { unlockSelBtn.style.background = "#3a1e0e"; });
        unlockSelBtn.addEventListener("click", () => {
            const id = parseInt(rescueSel.value, 10);
            if (!id || rescueSelected.size === 0) return;
            const count = clearLocksOnMember(id, Array.from(rescueSelected));
            rescueStatus.textContent = count > 0 ? `🔓 Cleared ${count} lock(s).` : "No locks found on selected items.";
            window.setTimeout(() => { rescueStatus.textContent = ""; rebuildRescueItems(); }, 3000);
        });

        // Remove Selected
        removeSelBtn.addEventListener("mouseenter", () => { if (!removeSelBtn.disabled) removeSelBtn.style.background = "#5a1a28"; });
        removeSelBtn.addEventListener("mouseleave", () => { removeSelBtn.style.background = "#3a0e18"; });
        removeSelBtn.addEventListener("click", () => {
            const id = parseInt(rescueSel.value, 10);
            if (!id || rescueSelected.size === 0) return;
            const count = removeItemsFromMember(id, Array.from(rescueSelected));
            rescueStatus.textContent = count > 0 ? t("qa.removedN", { n: count }) : t("qa.nothingRemoved");
            window.setTimeout(() => { rescueStatus.textContent = ""; rebuildRescueItems(); }, 3000);
        });

        // Remove All
        rescueBtn.addEventListener("mouseenter", () => { rescueBtn.style.background = "#8b1e38"; });
        rescueBtn.addEventListener("mouseleave", () => { rescueBtn.style.background = "#6b1428"; });
        rescueBtn.addEventListener("click", () => {
            const id = parseInt(rescueSel.value, 10);
            if (!id) { rescueStatus.textContent = "Pick someone first."; return; }
            rescueBtn.disabled = true;
            const result = rescueRoomMember(id);
            if (!result.found) {
                rescueStatus.textContent = t("dom.notInRoom");
            } else if (result.locksCleared === 0 && result.restraintsRemoved === 0) {
                rescueStatus.textContent = "Nothing to remove — they're already free.";
            } else {
                rescueStatus.textContent = `✓ Done — cleared ${result.locksCleared} lock(s), removed ${result.restraintsRemoved} restraint(s).`;
            }
            window.setTimeout(() => { rescueBtn.disabled = false; rescueStatus.textContent = ""; rebuildRescueItems(); }, 3000);
        });

        // Append to panel in order
        rescuePanel.appendChild(selAllRow);
        rescuePanel.appendChild(rescueItemsEl);
        rescuePanel.appendChild(actBtnRow);
        rescuePanel.appendChild(rescueBtn);
        rescuePanel.appendChild(rescueStatus);

        // ── Release / Rescue ─────────────────────────────────────────────────
        const divRelease = document.createElement("div");
        divRelease.className = "ebc-divider";
        divRelease.style.margin = "10px 0 7px";
        body.appendChild(divRelease);

        const releaseLbl = document.createElement("div");
        releaseLbl.className = "ebc-section-label";
        releaseLbl.textContent = "Release / Rescue";
        body.appendChild(releaseLbl);

        // Quick-action row: two wide buttons
        const quickRow = document.createElement("div");
        quickRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;";

        const makeQuickBtn = (label: string, title: string): HTMLButtonElement => {
            const b = document.createElement("button");
            b.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:6px 4px;border-radius:6px;border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
            b.textContent = label;
            b.title = title;
            b.addEventListener("mouseenter", () => { b.style.background = "#5a1c30"; });
            b.addEventListener("mouseleave", () => { b.style.background = "#3a1020"; });
            return b;
        };

        const removeAllBtn = makeQuickBtn("↑ All Restraints", "Remove all restraint items from every target in the room");
        const unlockAllBtn = makeQuickBtn("🔓 All Locks", "Unlock all locked items on every target in the room");
        quickRow.appendChild(removeAllBtn);
        quickRow.appendChild(unlockAllBtn);
        body.appendChild(quickRow);

        const releaseStatus = document.createElement("div");
        releaseStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;min-height:13px;margin-bottom:4px;";
        body.appendChild(releaseStatus);

        const showReleaseStatus = (results: Array<{ name: string; count: number; inRoom: boolean }>): void => {
            const done = results.filter(r => r.inRoom && r.count > 0).map(r => r.name + " (" + r.count + ")");
            const skip = results.filter(r => !r.inRoom).map(r => r.name);
            const parts: string[] = [];
            if (done.length) parts.push("✓ " + done.join(", "));
            if (skip.length) parts.push("⟳ not in room: " + skip.join(", "));
            releaseStatus.textContent = parts.join("  ·  ") || "Nothing to do.";
            window.setTimeout(() => { releaseStatus.textContent = ""; }, 4000);
        };

        removeAllBtn.addEventListener("click", () => {
            removeAllBtn.disabled = true;
            showReleaseStatus(removeAllTargetRestraints(this.domSelectedTargets));
            window.setTimeout(() => { removeAllBtn.disabled = false; }, 2000);
        });

        unlockAllBtn.addEventListener("click", () => {
            unlockAllBtn.disabled = true;
            showReleaseStatus(unlockAllTargetItems(this.domSelectedTargets));
            window.setTimeout(() => { unlockAllBtn.disabled = false; }, 2000);
        });

        // ── "Pick items to remove" picker ─────────────────────────────────────
        const pickToggle = document.createElement("button");
        pickToggle.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-bottom:4px;";
        pickToggle.textContent = "↓ Pick items to remove";
        body.appendChild(pickToggle);

        const pickPanel = document.createElement("div");
        pickPanel.style.cssText = "display:none;flex-direction:column;gap:6px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;border-radius:6px;padding:7px;margin-bottom:6px;";
        body.appendChild(pickPanel);

        // selection state: targetId → Set of group names
        const pendingRemove = new Map<number, Set<string>>();

        const rebuildPickPanel = (): void => {
            while (pickPanel.firstChild) pickPanel.removeChild(pickPanel.firstChild);
            pendingRemove.clear();

            const sections = getTargetRestraints();
            if (sections.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:3px 2px;";
                hint.textContent = "No targets are in the room right now.";
                pickPanel.appendChild(hint);
                return;
            }

            for (const { target, items } of sections) {
                pendingRemove.set(target.id, new Set());

                const targHdr = document.createElement("div");
                targHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;font-weight:bold;margin-bottom:3px;";
                targHdr.textContent = target.name;
                pickPanel.appendChild(targHdr);

                if (items.length === 0) {
                    const none = document.createElement("div");
                    none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:1px 4px 4px;";
                    none.textContent = "No restraints worn.";
                    pickPanel.appendChild(none);
                    continue;
                }

                const itemsWrap = document.createElement("div");
                itemsWrap.style.cssText = "display:flex;flex-direction:column;gap:1px;margin-bottom:2px;";

                for (const item of items) {
                    const lbl3 = document.createElement("label");
                    lbl3.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:3px;cursor:pointer;";
                    lbl3.addEventListener("mouseenter", () => { lbl3.style.background = "rgba(42,20,33,0.6)"; });
                    lbl3.addEventListener("mouseleave", () => { lbl3.style.background = ""; });
                    const cb2 = document.createElement("input");
                    cb2.type = "checkbox";
                    cb2.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                    cb2.addEventListener("change", () => {
                        const sel = pendingRemove.get(target.id)!;
                        if (cb2.checked) sel.add(item.group);
                        else sel.delete(item.group);
                    });
                    const cbN = document.createElement("span");
                    cbN.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                    cbN.textContent = item.name;
                    const cbG = document.createElement("span");
                    cbG.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                    cbG.textContent = item.group.replace("Item", "");
                    lbl3.appendChild(cb2); lbl3.appendChild(cbN); lbl3.appendChild(cbG);
                    itemsWrap.appendChild(lbl3);
                }
                pickPanel.appendChild(itemsWrap);
            }

            // Remove selected button
            const removeSelBtn = document.createElement("button");
            removeSelBtn.style.cssText = "width:100%;background:#3a1020;border:1px solid #91405f;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:5px 0;transition:background 0.14s;margin-top:3px;";
            removeSelBtn.textContent = "Remove Selected";
            removeSelBtn.addEventListener("click", () => {
                const results: Array<{ name: string; count: number; inRoom: boolean }> = [];
                const cfg5 = getDomConfig();
                for (const [targetId, groups] of pendingRemove) {
                    if (groups.size === 0) continue;
                    const target = cfg5.targets.find(t => t.id === targetId);
                    const res = removeTargetItems(targetId, [...groups]);
                    results.push({ name: target?.name ?? String(targetId), ...res });
                }
                if (results.length === 0) {
                    releaseStatus.textContent = "Nothing selected.";
                } else {
                    showReleaseStatus(results);
                }
                // Refresh picker to reflect new state
                rebuildPickPanel();
            });
            pickPanel.appendChild(removeSelBtn);
        };

        pickToggle.addEventListener("click", () => {
            const isOpenNow = pickPanel.style.display === "none";
            pickPanel.style.display = isOpenNow ? "flex" : "none";
            pickToggle.style.borderStyle = isOpenNow ? "solid" : "dashed";
            pickToggle.style.color = isOpenNow ? "#cf6f98" : "#7a4a5e";
            if (isOpenNow) rebuildPickPanel();
        });

        // ── Restraint Sets ───────────────────────────────────────────────────
        const div1 = document.createElement("div");
        div1.className = "ebc-divider";
        div1.style.margin = "10px 0 7px";
        body.appendChild(div1);

        const setsHeader = document.createElement("div");
        setsHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;";
        const setsLbl = document.createElement("div");
        setsLbl.className = "ebc-section-label";
        setsLbl.style.margin = "0";
        setsLbl.textContent = t("kitty.restraintSets");
        const newSetBtn = document.createElement("button");
        newSetBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid #91405f;background:#2a1421;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
        newSetBtn.textContent = t("dom.newSet");
        newSetBtn.addEventListener("mouseenter", () => { newSetBtn.style.background = "#3a1828"; });
        newSetBtn.addEventListener("mouseleave", () => { newSetBtn.style.background = "#2a1421"; });
        setsHeader.appendChild(setsLbl);
        setsHeader.appendChild(newSetBtn);
        body.appendChild(setsHeader);

        const setsContainer = document.createElement("div");
        body.appendChild(setsContainer);

        let activeEditorId: string | null = null;

        const rebuildSets = (): void => {
            while (setsContainer.firstChild) setsContainer.removeChild(setsContainer.firstChild);
            const cfg = getDomConfig();

            if (cfg.sets.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:4px 2px;margin-bottom:4px;";
                hint.textContent = "No sets yet — create one with + New Set.";
                setsContainer.appendChild(hint);
            }

            for (const set of cfg.sets) {
                // ── Row ──────────────────────────────────────────────────────
                const setRow = document.createElement("div");
                setRow.style.cssText = "display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:6px;margin-bottom:2px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;";

                const setInfo = document.createElement("div");
                setInfo.style.cssText = "flex:1;min-width:0;";
                const setNameEl = document.createElement("div");
                setNameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                setNameEl.textContent = set.name;
                const setCmdEl = document.createElement("div");
                setCmdEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                setCmdEl.textContent = set.command ? ("/" + set.command) : (set.items.length + " item(s)");
                setInfo.appendChild(setNameEl);
                setInfo.appendChild(setCmdEl);

                const applyBtn = document.createElement("button");
                applyBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid #91405f;background:#6b3048;color:#f7e6ee;cursor:pointer;transition:background 0.14s;white-space:nowrap;flex-shrink:0;";
                applyBtn.textContent = "▶ Apply";
                applyBtn.title = "Apply to targets in room";
                applyBtn.addEventListener("mouseenter", () => { applyBtn.style.background = "#91405f"; });
                applyBtn.addEventListener("mouseleave", () => { applyBtn.style.background = "#6b3048"; });

                const editBtn = document.createElement("button");
                editBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 7px;border-radius:5px;border:1px solid #4c2537;background:transparent;color:#967281;cursor:pointer;transition:background 0.14s,color 0.12s;flex-shrink:0;";
                editBtn.textContent = "✎";
                editBtn.title = "Edit set";
                editBtn.addEventListener("mouseenter", () => { editBtn.style.background = "#2a1421"; editBtn.style.color = "#cf6f98"; });
                editBtn.addEventListener("mouseleave", () => { editBtn.style.background = ""; editBtn.style.color = "#967281"; });

                setRow.appendChild(setInfo);
                setRow.appendChild(applyBtn);
                setRow.appendChild(editBtn);
                setsContainer.appendChild(setRow);

                // Apply status (shown briefly below the row)
                const applyStatus = document.createElement("div");
                applyStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;padding:1px 7px 3px;display:none;";
                setsContainer.appendChild(applyStatus);

                applyBtn.addEventListener("click", () => {
                    applyBtn.disabled = true;
                    const { applied, skipped } = applyDomSet(set.id, this.domSelectedTargets);
                    const parts: string[] = [];
                    if (applied.length) parts.push("✓ " + applied.join(", "));
                    if (skipped.length) parts.push("⟳ not in room: " + skipped.join(", "));
                    applyStatus.textContent = parts.join("  ·  ") || "Nothing done.";
                    applyStatus.style.display = "block";
                    window.setTimeout(() => { applyBtn.disabled = false; applyStatus.style.display = "none"; }, 3000);
                });

                // ── Inline editor ─────────────────────────────────────────────
                const editor = document.createElement("div");
                editor.className = "ebc-dom-editor";
                editor.style.cssText = "display:none;background:rgba(27,13,23,0.95);border:1px solid #4c2537;border-radius:7px;padding:8px;margin-bottom:6px;";

                // Fields
                const { row: nameRow, input: nameInput } = makeField("Name", set.name);
                editor.appendChild(nameRow);
                const { row: cmdRow, input: cmdInput } = makeField("Chat command", set.command, "/");
                editor.appendChild(cmdRow);
                const { row: annRow, input: annInput } = makeField("Announce", set.announceTemplate, "", "{name} appears on {targets}~");
                editor.appendChild(annRow);

                const tokenHint = document.createElement("div");
                tokenHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7080;padding:0 0 6px;";
                tokenHint.textContent = "{name} = set name  ·  {targets} = names of restrained";
                editor.appendChild(tokenHint);

                const saveBtn = document.createElement("button");
                saveBtn.style.cssText = "width:100%;background:#2a1421;border:1px solid #91405f;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;margin-bottom:8px;";
                saveBtn.textContent = "Save";
                saveBtn.addEventListener("mouseenter", () => { saveBtn.style.background = "#3a1828"; });
                saveBtn.addEventListener("mouseleave", () => { saveBtn.style.background = "#2a1421"; });
                saveBtn.addEventListener("click", () => {
                    const currentItems = getDomConfig().sets.find(s => s.id === set.id)?.items ?? [];
                    updateDomSet(set.id, nameInput.value, cmdInput.value, annInput.value, currentItems);
                    activeEditorId = set.id;
                    rebuildSets();
                });
                editor.appendChild(saveBtn);

                // Items sub-section
                const itemsLbl = document.createElement("div");
                itemsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#967281;font-weight:bold;margin-bottom:4px;letter-spacing:0.04em;text-transform:uppercase;";
                editor.appendChild(itemsLbl);

                const itemListEl = document.createElement("div");
                itemListEl.style.cssText = "margin-bottom:6px;max-height:100px;overflow-y:auto;";
                editor.appendChild(itemListEl);

                const rebuildEditorItems = (): void => {
                    while (itemListEl.firstChild) itemListEl.removeChild(itemListEl.firstChild);
                    const currentSet = getDomConfig().sets.find(s => s.id === set.id);
                    const items = currentSet?.items ?? [];
                    itemsLbl.textContent = "Items (" + items.length + ")";
                    if (items.length === 0) {
                        const hint2 = document.createElement("div");
                        hint2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a7080;padding:3px 2px;";
                        hint2.textContent = "No items yet — import from a BC code below.";
                        itemListEl.appendChild(hint2);
                        return;
                    }
                    for (let idx = 0; idx < items.length; idx++) {
                        const item = items[idx];
                        const irow = document.createElement("div");
                        irow.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 5px;border-radius:4px;margin-bottom:2px;background:rgba(42,20,33,0.4);";
                        const iname = document.createElement("span");
                        iname.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                        iname.textContent = item.Name;
                        const igrp = document.createElement("span");
                        igrp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;";
                        igrp.textContent = item.Group.replace("Item", "");
                        const iDel = document.createElement("button");
                        iDel.style.cssText = "background:transparent;border:none;color:#9a7080;cursor:pointer;font-size:12px;padding:0 3px;line-height:1;";
                        iDel.textContent = "×";
                        iDel.addEventListener("click", () => {
                            const cfg2 = getDomConfig();
                            const s2 = cfg2.sets.find(s => s.id === set.id);
                            if (!s2) return;
                            s2.items.splice(idx, 1);
                            updateDomSet(set.id, s2.name, s2.command, s2.announceTemplate, s2.items);
                            rebuildEditorItems();
                        });
                        irow.appendChild(iname); irow.appendChild(igrp); irow.appendChild(iDel);
                        itemListEl.appendChild(irow);
                    }
                };
                rebuildEditorItems();

                // Import sub-panel
                const importToggle = document.createElement("button");
                importToggle.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-bottom:4px;";
                importToggle.textContent = t("outfits.importFromBCCode");
                editor.appendChild(importToggle);

                const importPanel = document.createElement("div");
                importPanel.style.cssText = "display:none;flex-direction:column;gap:5px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;border-radius:6px;padding:7px;margin-bottom:5px;";

                const importTA = document.createElement("textarea");
                importTA.style.cssText = "width:100%;box-sizing:border-box;background:#1b0d17;border:1px solid #4c2537;border-radius:4px;color:#f7e6ee;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 5px;resize:vertical;min-height:46px;outline:none;";
                importTA.placeholder = t("outfits.importPlaceholder");

                const importMsg = document.createElement("div");
                importMsg.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;min-height:14px;";

                const checklistEl = document.createElement("div");
                checklistEl.style.cssText = "display:none;max-height:120px;overflow-y:auto;border:1px solid #3a1928;border-radius:5px;background:rgba(27,13,23,0.6);padding:4px;";

                let parsedItems: ParsedBCItem[] = [];

                const parseBtn = document.createElement("button");
                parseBtn.style.cssText = "width:100%;background:#2a1421;border:1px solid #7a4a5e;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;";
                parseBtn.textContent = "Parse Code";
                parseBtn.addEventListener("click", () => {
                    importMsg.textContent = "";
                    importMsg.style.color = "#ff6b6b";
                    checklistEl.style.display = "none";
                    parsedItems = [];
                    const code = importTA.value.trim();
                    if (!code) { importMsg.textContent = "Paste a code first."; return; }
                    try {
                        parsedItems = parseBCCodeItems(code);
                    } catch (e) {
                        importMsg.textContent = String((e as Error).message ?? e);
                        return;
                    }
                    while (checklistEl.firstChild) checklistEl.removeChild(checklistEl.firstChild);

                    // Group: restraints first (pre-checked), then clothing (unchecked)
                    const restraints = parsedItems.filter(p => p.isRestraint);
                    const clothing   = parsedItems.filter(p => !p.isRestraint);

                    const addSectionHeader = (text: string): void => {
                        const sh = document.createElement("div");
                        sh.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;padding:3px 2px 1px;";
                        sh.textContent = text;
                        checklistEl.appendChild(sh);
                    };

                    const addCheckRow = (pItem: ParsedBCItem, defaultChecked: boolean): void => {
                        const lbl2 = document.createElement("label");
                        lbl2.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:3px;cursor:pointer;";
                        lbl2.addEventListener("mouseenter", () => { lbl2.style.background = "rgba(42,20,33,0.5)"; });
                        lbl2.addEventListener("mouseleave", () => { lbl2.style.background = ""; });
                        const cb = document.createElement("input");
                        cb.type = "checkbox";
                        cb.checked = defaultChecked;
                        cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                        const cbName = document.createElement("span");
                        cbName.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" + (defaultChecked ? "color:#f7e6ee;" : "color:#7a5a6a;");
                        cbName.textContent = pItem.Name;
                        const cbGrp = document.createElement("span");
                        cbGrp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                        cbGrp.textContent = pItem.Group.replace("Item", "");
                        lbl2.appendChild(cb); lbl2.appendChild(cbName); lbl2.appendChild(cbGrp);
                        checklistEl.appendChild(lbl2);
                    };

                    if (restraints.length > 0) {
                        addSectionHeader("Restraints (" + restraints.length + ")");
                        restraints.forEach(p => addCheckRow(p, true));
                    }
                    if (clothing.length > 0) {
                        addSectionHeader("Clothing / Other (" + clothing.length + ")");
                        clothing.forEach(p => addCheckRow(p, false));
                    }

                    checklistEl.style.display = "block";
                    importMsg.style.color = "#79a885";
                    const rCount = restraints.length;
                    const cCount = clothing.length;
                    importMsg.textContent = rCount + " restraint(s), " + cCount + " clothing — check what to add:";
                });

                const useSelectedBtn = document.createElement("button");
                useSelectedBtn.style.cssText = "width:100%;background:#1b3021;border:1px solid #3a7a50;border-radius:5px;color:#79a885;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;";
                useSelectedBtn.textContent = "Use Selected";
                useSelectedBtn.addEventListener("click", () => {
                    const checks = checklistEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
                    // Map checkboxes back to parsedItems — order matches DOM insertion order:
                    // restraints first, then clothing (same as rendering above).
                    const ordered = [
                        ...parsedItems.filter(p => p.isRestraint),
                        ...parsedItems.filter(p => !p.isRestraint),
                    ];
                    const selected = ordered.filter((_, i) => checks[i]?.checked);
                    if (selected.length === 0) {
                        importMsg.style.color = "#ff6b6b";
                        importMsg.textContent = "Select at least one item.";
                        return;
                    }
                    const cfg3 = getDomConfig();
                    const s3 = cfg3.sets.find(s => s.id === set.id);
                    if (!s3) return;
                    for (const newItem of selected) {
                        const existIdx = s3.items.findIndex(x => x.Group === newItem.Group);
                        if (existIdx >= 0) s3.items[existIdx] = newItem;
                        else s3.items.push(newItem);
                    }
                    updateDomSet(set.id, s3.name, s3.command, s3.announceTemplate, s3.items);
                    importTA.value = "";
                    checklistEl.style.display = "none";
                    parsedItems = [];
                    importMsg.style.color = "#79a885";
                    importMsg.textContent = "✓ " + selected.length + " item(s) added.";
                    rebuildEditorItems();
                    window.setTimeout(() => { importMsg.textContent = ""; }, 2500);
                });

                importPanel.appendChild(importTA);
                importPanel.appendChild(importMsg);
                importPanel.appendChild(parseBtn);
                importPanel.appendChild(checklistEl);
                importPanel.appendChild(useSelectedBtn);

                importToggle.addEventListener("click", () => {
                    const isOpenNow = importPanel.style.display === "none";
                    importPanel.style.display = isOpenNow ? "flex" : "none";
                    importToggle.style.borderStyle = isOpenNow ? "solid" : "dashed";
                    importToggle.style.color = isOpenNow ? "#cf6f98" : "#7a4a5e";
                    if (isOpenNow) importTA.focus();
                });
                editor.appendChild(importPanel);

                // Delete set
                const delSetBtn = document.createElement("button");
                delSetBtn.style.cssText = "width:100%;background:transparent;border:1px solid #4c2537;border-radius:5px;color:#9a7080;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-top:5px;";
                delSetBtn.textContent = "Delete Set";
                let delConfirm = false;
                delSetBtn.addEventListener("click", () => {
                    if (!delConfirm) {
                        delConfirm = true;
                        delSetBtn.textContent = "Confirm Delete?";
                        delSetBtn.style.color = "#ff6b6b";
                        delSetBtn.style.borderColor = "#8a2020";
                        window.setTimeout(() => {
                            if (!delConfirm) return;
                            delConfirm = false;
                            delSetBtn.textContent = "Delete Set";
                            delSetBtn.style.color = "#9a7080";
                            delSetBtn.style.borderColor = "#4c2537";
                        }, 3000);
                    } else {
                        deleteDomSet(set.id);
                        activeEditorId = null;
                        rebuildSets();
                    }
                });
                editor.appendChild(delSetBtn);

                setsContainer.appendChild(editor);

                // Toggle editor on edit button click
                editBtn.addEventListener("click", () => {
                    const isNowOpen = editor.style.display !== "none";
                    // Close all other editors
                    setsContainer.querySelectorAll<HTMLElement>(".ebc-dom-editor").forEach(e => { e.style.display = "none"; });
                    if (!isNowOpen) {
                        editor.style.display = "block";
                        activeEditorId = set.id;
                    } else {
                        activeEditorId = null;
                    }
                });

                // Restore open editor after rebuild
                if (activeEditorId === set.id) {
                    editor.style.display = "block";
                }
            }
        };

        rebuildSets();

        newSetBtn.addEventListener("click", () => {
            const s = createDomSet("New Set", "", "");
            activeEditorId = s.id;
            rebuildSets();
            body.scrollTop = body.scrollHeight;
        });

        // ── ⛑ Room Rescue — always at the very bottom ─────────────────────────
        body.appendChild(divRescue);
        body.appendChild(rescueHdr);
        body.appendChild(rescuePanel);
    }

    // -- Open / Close / Toggle -------------------------------------------------

    public toggle(): void { this.isOpen ? this.close() : this.open(); }

    public open(): void {
        if (!this.panelEl) return;
        this.isOpen = true;

        // Panel is opening — restore full tab hit area
        const tabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab");
        if (tabEl) tabEl.classList.remove("ebc-tab-closed");

        // On first open, check for a saved free-float position
        if (this.panelPosition === null) {
            const saved = this.loadPanelPosition();
            if (saved !== null) {
                this.panelPosition = saved;
                this.enterFreeMode(saved);
            }
        }

        if (this.panelPosition !== null) {
            // Free-float: just make visible at saved spot, no slide animation
            this.panelEl.classList.add("ebc-free-mode", "ebc-open");
            this.panelEl.classList.remove("ebc-closed");
        } else {
            // Anchored: normal slide-in
            this.panelEl.className = "ebc-open";
        }
        if (!this.positioned) this.syncToChat();
        // badge toggle now lives in the DEV tab and refreshes on render
        try { this.refreshSwEnableBtn?.(); } catch { /* ignore */ }
        // Show the DOM tab only for the creator
        const domTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-dom");
        if (domTabEl) domTabEl.style.display = isDomEnabled() ? "" : "none";
        // Show the Puppy tab only for Lucy (#230466)
        const puppyTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-puppy");
        if (puppyTabEl) puppyTabEl.style.display = Player.MemberNumber === LUCY_MEMBER ? "" : "none";
        // Show the Kitty tab only for Lucy (#230466)
        const kittyTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-kitty");
        if (kittyTabEl) kittyTabEl.style.display = Player.MemberNumber === LUCY_MEMBER ? "" : "none";
        this.updateTimer();
        try { this.applyTabVisibility(); } catch { /* ignore */ }
        this.renderCurrentTab();
    }

    public close(): void {
        if (!this.panelEl) return;
        this.closeGuide();      // remove floating guide side panel if open
        this.stopDevLogPoller();
        this.isOpen = false;

        // Panel is closing — clip tab so it no longer blocks the BC canvas
        const tabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab");
        if (tabEl) tabEl.classList.add("ebc-tab-closed");

        if (this.panelPosition !== null) {
            // Free-float: keep mode class, just swap open→closed for opacity fade
            this.panelEl.classList.remove("ebc-open");
            this.panelEl.classList.add("ebc-closed", "ebc-free-mode");
        } else {
            this.panelEl.className = "ebc-closed";
        }
    }

    // -- Lifecycle -------------------------------------------------------------

    public destroy(): void {
        this.closeGuide();
        this.resizeObserver?.disconnect();
        this.stopCrabsPoller();
        this.stopTimerPoller();
        for (const { el } of this.beepWins.values()) { try { el.remove(); } catch { /* ignore */ } }
        this.beepWins.clear();
        this.rootEl?.remove();
        this.rootEl  = null;
        this.panelEl = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
