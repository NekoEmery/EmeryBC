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
} from "./outfitManager";
import { getAllPalettes, getPalettesByType, captureCurrentPalette, captureRestraintPalette, applyPalette, deletePalette, renamePalette } from "./palettes";
import { KNOWN_POSES, applyPoses, applyPosesSequential, applyCombo, getCurrentPoses, getPoseCombos, createCombo, updateCombo, deleteCombo } from "./poses";
import { Scene, SceneStep, StepType, getScenes, createScene, updateScene, deleteScene, runScene } from "./scenes";
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
    type ActionButton,
    type ActionStyle,
} from "./actionButtons";
import {
    releaseRestraints,
    unlockItems,
    getPlayerRestraints,
    getPlayerLockedItems,
    removePlayerSpecificItems,
    unlockPlayerSpecificItems,
} from "./restraints";
import { getBadgeEnabled, setBadgeEnabled, getShowVersionBadge, setShowVersionBadge, getAntiRestraintEnabled, setAntiRestraintEnabled, getAntiRestraintWhitelist, addToAntiRestraintWhitelist, removeFromAntiRestraintWhitelist, getAntiRestraintConfirm, setAntiRestraintConfirm, getBeepMuted, setBeepMuted, getSuppressNativeBeep, setSuppressNativeBeep } from "./settings";
import { snapshotPlayerRestraints } from "./antiRestraint";
import { getFriendList, getFriendStatus, getFriendTags, setFriendTag, getConversation, sendBeep, resolveName, cacheName, addBeepEntry, BeepEntry, getFriendOnlineInfo, getEBCVersion } from "./friends";
import { isDevLogEnabled, setDevLogEnabled, getDevLog, clearDevLog, pushTestEntry } from "./devLog";
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
} from "./domTools";

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
    confirmBtn.textContent = "Yes";
    confirmBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
    confirmBtn.addEventListener("click", () => { overlay.remove(); onConfirm(); });

    btns.appendChild(cancelBtn);
    btns.appendChild(confirmBtn);
    overlay.appendChild(btns);
    document.body.appendChild(overlay);
}

// -- Icon ----------------------------------------------------------------------


const TAB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 90 90">'
    + '<rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>'
    + '<path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>'
    + '<circle cx="34" cy="43" r="4" fill="#f7e6ee"/>'
    + '<circle cx="56" cy="43" r="4" fill="#f7e6ee"/>'
    + '<path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + '</svg>';

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
    background: rgba(42, 20, 33, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(207, 111, 152, 0.2);
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

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }
#ebc-tab:active { cursor: grabbing; }

#ebc-tab-unread-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 9px;
    height: 9px;
    background: #cf6f98;
    border-radius: 50%;
    border: 1.5px solid #130810;
    box-shadow: 0 0 5px #cf6f98;
    pointer-events: none;
}

/* When panel is closed, slide the tab right so only ~10px overlaps the BC
   game canvas. The icon is still fully visible (it's mostly over the chat-log
   column), and the hit area is almost entirely out of the canvas. */
#ebc-tab.ebc-tab-closed {
    left: -10px;
    cursor: pointer;
}

/* Sliding panel - only this element transforms, not the tab */
#emerybc-panel {
    position: absolute;
    right: 44px;   /* leave the 44px tab strip uncovered — tab is to our right */
    top: 0;
    width: 360px;
    height: 100%;  /* full chat log height — no vertical conflict with tab */
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

/* +60px extra so the panel clears the 44px tab offset when closed */
#emerybc-panel.ebc-closed { transform: translateX(calc(100% + 60px)); }
#emerybc-panel.ebc-open   { transform: translateX(0); pointer-events: auto; }

.ebc-panel {
    pointer-events: inherit; /* inherits none/auto from #emerybc-panel so closed panel passes clicks through */
    background: rgba(27, 13, 23, 0.97);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-left: 2px solid #4c2537;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-shadow: -4px 0 20px rgba(0,0,0,0.5);
}

/* -- Header -- */
.ebc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid #4c2537;
    background: rgba(36, 17, 29, 0.9);
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
}

.ebc-header-btns { display: flex; gap: 4px; align-items: center; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    padding: 2px 6px;
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
    color: #7a5a6a;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.01em;
    padding: 6px 1px;
    transition: color 0.14s, border-color 0.14s;
}

.ebc-tab-btn:hover { color: #b07888; }
.ebc-tab-btn.ebc-tab-active { color: #cf6f98; border-bottom-color: #cf6f98; }

/* -- Body -- */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 7px;
    scrollbar-width: thin;
    scrollbar-color: #cf6f98 #1a0814;
}

/* Unified scrollbar theme for all EBC scrollable areas */
.ebc-body::-webkit-scrollbar,
.ebc-beep-win-history::-webkit-scrollbar { width: 5px; }
.ebc-body::-webkit-scrollbar-track,
.ebc-beep-win-history::-webkit-scrollbar-track { background: #1a0814; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb,
.ebc-beep-win-history::-webkit-scrollbar-thumb { background: #cf6f98; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb:hover,
.ebc-beep-win-history::-webkit-scrollbar-thumb:hover { background: #e890b8; }
.ebc-beep-win-history { scrollbar-width: thin; scrollbar-color: #cf6f98 #1a0814; }

/* -- Section label -- */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #8a6070;
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
    padding: 3px 8px;
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
    padding: 3px 6px;
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
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #3a1928;
    background: #1b0d17;
    color: #553142;
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
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 2px 6px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-outfit-del:hover    { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }
.ebc-outfit-del.confirm  { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 10px; }

/* -- Empty -- */
.ebc-empty {
    color: #553142;
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
    height: 22px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
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
    height: 22px;
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
    width: 24px;
    height: 22px;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-del:hover   { background: #3a1017; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-del.confirm { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 9px; }

.ebc-slot-style {
    flex-shrink: 0;
    width: 32px;
    height: 22px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
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
    color: #553142;
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
    color: #553142;
    text-align: right;
}


/* -- Edit button (pencil) -- */
.ebc-edit-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #553142;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 5px;
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
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 2px 5px;
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
.ebc-diff-none   { color: #553142; font-style: italic; }

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
    color: #7a4a5e;
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
    padding: 4px 10px;
    border-top: 1px solid #3a1928;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #9a7888;
    text-align: center;
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
    color: #967281;
    line-height: 1.4;
}

.ebc-thanks-heart {
    flex-shrink: 0;
    font-size: 16px;
    user-select: none;
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
    text-align: center;
    padding: 2px 0 0;
    letter-spacing: 0.04em;
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
    color: #8a6070;
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

.ebc-restraint-lock.unlocked { color: #7a5a6a; }

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
    padding: 1px 4px;
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
    padding: 2px 7px;
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
    background: #1a0d15;
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
.ebc-friend-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 4px;
    border-radius: 5px;
    margin-bottom: 2px;
    background: #130810;
}
.ebc-friend-row:hover { background: #1a0d15; }

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
    flex: 1;
    font-size: 11px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-friend-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #3a1928;
    color: #cf6f98;
    flex-shrink: 0;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ebc-friend-btn {
    background: none;
    border: 1px solid #3a1928;
    border-radius: 4px;
    color: #9a6878;
    font-size: 11px;
    padding: 1px 5px;
    cursor: pointer;
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    line-height: 1.3;
}
.ebc-friend-btn:hover { background: #2e1525; color: #cf6f98; border-color: #cf6f98; }

/* -- Beep window -- */
.ebc-beep-win {
    position: fixed;
    width: 300px;
    height: 380px;
    background: #130810;
    border: 2px solid #cf6f98;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    z-index: 999998;
    box-shadow: 0 8px 32px rgba(0,0,0,0.9);
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
    background: #1e0d1a;
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
    background: #2a0e1e;
    border: 1px solid #4a2035;
    border-radius: 5px;
    color: #9a6878;
    font-size: 13px;
    cursor: pointer;
    line-height: 1;
    padding: 3px 7px;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.ebc-beep-win-hbtn:hover { background: #3a1028; color: #cf6f98; border-color: #cf6f98; }
.ebc-beep-win-close.ebc-beep-win-hbtn:hover { background: #4a1020; color: #ff6080; border-color: #ff6080; }
.ebc-beep-win-mute.muted { color: #4a2a38; border-color: #3a1928; }

.ebc-beep-win-history {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
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
    background: #3a1028;
    color: #f0c8d8;
    border-bottom-right-radius: 2px;
}
.ebc-beep-msg.received {
    align-self: flex-start;
    background: #1e0d1a;
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
    background: #1e0d1a;
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
    bottom: 0;
    border-radius: 10px 10px 0 0;
    overflow: hidden;
    resize: none;
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
    padding: 1px 3px;
    border-radius: 3px;
    margin-top: 2px;
    align-self: flex-end;
}
.ebc-beep-reply-btn:hover { color: #cf6f98; background: #2a0e1e; }

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
    pointer-events: none !important;
    transform: none !important;
}
#emerybc-panel.ebc-free-mode.ebc-open {
    opacity: 1 !important;
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
    padding: 2px 6px;
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
    color: #553142;
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
    padding: 3px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}
.ebc-seq-add-btn:hover { background: #1b0d17; color: #cf6f98; border-style: solid; }
`;

// -- VIP members (highlighted in Notes tab when present in the room) -----------

const VIP_MEMBERS: Record<number, { label: string; color: string }> = {
    130267: { label: "creator",  color: "#e8d07a" },  // Emery
    143776: { label: "Sin",      color: "#cf6f98" },
    124264: { label: "Lara",     color: "#f7b8d4" },
    230466: { label: "Lucy",     color: "#b8a0f7" },
};

// -- Class ---------------------------------------------------------------------

type DrawerTab = "outfits" | "buttons" | "anims" | "notes" | "thanks" | "dev" | "dom";

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    private rootEl: HTMLElement | null = null;   // zero-width anchor (positioned)
    private panelEl: HTMLElement | null = null;  // sliding panel (transforms)
    private isOpen = false;
    private currentTab: DrawerTab = "outfits";
    private resizeObserver: ResizeObserver | null = null;
    private positioned = false;
    private version = "";
    private refreshBadgeRow: (() => void) | null = null;
    private refreshConfirmToggle: (() => void) | null = null;
    private beepWins = new Map<number, { el: HTMLElement; minimized: boolean }>();
    private beepUnread = new Map<number, number>();
    private lastRect = { top: -1, width: -1, height: -1, right: -1 };
    private lastCrabsBottom = -1;
    private crabsPoller: ReturnType<typeof window.setInterval> | null = null;
    private timerEl: HTMLElement | null = null;
    private timerPoller: ReturnType<typeof window.setInterval> | null = null;
    // User-dragged tab position (fixed screen coords {x,y}). null = follow CRABS.
    private userTabOffset: { x: number; y: number } | null = null;
    private tabDragging = false; // true while mouse is held on tab — blocks CRABS poller
    private domSelectedTargets = new Set<number>();
    // Free-float panel position. null = anchored to chat log (default slide behaviour).
    private panelPosition: { x: number; y: number } | null = null;
    private resetLocationBtn: HTMLElement | null = null;
    // DEV tab auto-refresh poller
    private devLogPoller: ReturnType<typeof window.setInterval> | null = null;

    constructor(version = "") {
        EBCDrawer._instance = this;
        this.version = version;
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
        tab.title = "EmeryBC";
        tab.innerHTML = TAB_ICON;
        // Panel starts closed — clip the tab so it doesn't block the BC canvas.
        tab.classList.add("ebc-tab-closed");
        root.appendChild(tab);

        // Sliding panel container - this is the only thing that transforms
        const slideContainer = document.createElement("div");
        slideContainer.id = "emerybc-panel";
        slideContainer.className = "ebc-closed";

        // Inner panel (visual content)
        const panel = document.createElement("div");
        panel.className = "ebc-panel";

        // Header
        const header = document.createElement("div");
        header.className = "ebc-header";

        const title = document.createElement("span");
        title.className = "ebc-title";
        title.textContent = "EmeryBC" + (this.version ? " v" + this.version : "");

        const headerBtns = document.createElement("div");
        headerBtns.className = "ebc-header-btns";

        const refreshBtn = document.createElement("button");
        refreshBtn.className = "ebc-icon-btn";
        refreshBtn.title = "Refresh";
        refreshBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

        // Drag handle icon — same mousedown behaviour as the header title area.
        const moveHandle = document.createElement("span");
        moveHandle.className = "ebc-move-handle";
        moveHandle.title = "Drag to move";
        moveHandle.textContent = "⠿";

        const resetLocBtn = document.createElement("button");
        resetLocBtn.className = "ebc-reset-loc-btn";
        resetLocBtn.title = "Reset drawer to default position (anchored to chat log)";
        resetLocBtn.textContent = "⌖ Reset pos";
        resetLocBtn.style.display = "none"; // hidden until panel is in free-float mode
        this.resetLocationBtn = resetLocBtn;

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-icon-btn";
        closeBtn.title = "Close";
        closeBtn.textContent = "X";

        headerBtns.appendChild(refreshBtn);
        headerBtns.appendChild(moveHandle);
        headerBtns.appendChild(resetLocBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);

        // Header drag — moves the panel when in free-float mode.
        // In anchored mode it drags to detach the panel; after 5px movement the panel
        // enters free-float mode and follows the cursor from that point.
        header.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.button !== 0) return;
            // Don't interfere with button clicks inside the header
            if ((e.target as HTMLElement).closest("button")) return;

            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;

            // Starting position of the panel
            const panelEl = slideContainer;
            const startRect = panelEl.getBoundingClientRect();
            let inFreeMode = this.panelPosition !== null;
            let startPanelX = inFreeMode ? this.panelPosition!.x : startRect.left;
            let startPanelY = inFreeMode ? this.panelPosition!.y : startRect.top;
            let hasDragged = false;

            const onMove = (ev: MouseEvent): void => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!hasDragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

                if (!hasDragged) {
                    hasDragged = true;
                    // Enter free-float mode on first real movement
                    if (!inFreeMode) {
                        inFreeMode = true;
                        startPanelX = startRect.left;
                        startPanelY = startRect.top;
                        this.enterFreeMode({ x: startPanelX, y: startPanelY });
                    }
                }

                const newX = Math.max(0, Math.min(window.innerWidth - 50, startPanelX + dx));
                const newY = Math.max(0, Math.min(window.innerHeight - 50, startPanelY + dy));
                panelEl.style.left = `${newX}px`;
                panelEl.style.top  = `${newY}px`;
            };

            const onUp = (): void => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                if (!hasDragged) return;
                // Save final position
                const x = parseInt(panelEl.style.left, 10);
                const y = parseInt(panelEl.style.top,  10);
                this.panelPosition = { x, y };
                this.savePanelPosition({ x, y });
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });

        // Tab bar
        const tabBar = document.createElement("div");
        tabBar.className = "ebc-tabs";

        const outfitTabBtn = document.createElement("button");
        outfitTabBtn.className = "ebc-tab-btn ebc-tab-active";
        outfitTabBtn.id = "ebc-tab-outfits";
        outfitTabBtn.textContent = "OUTFITS";

        const buttonsTabBtn = document.createElement("button");
        buttonsTabBtn.className = "ebc-tab-btn";
        buttonsTabBtn.id = "ebc-tab-buttons";
        buttonsTabBtn.textContent = "BUTTONS";

        const posesTabBtn = document.createElement("button");
        posesTabBtn.className = "ebc-tab-btn";
        posesTabBtn.id = "ebc-tab-poses";
        posesTabBtn.textContent = "ANIMS";

        const notesTabBtn = document.createElement("button");
        notesTabBtn.className = "ebc-tab-btn";
        notesTabBtn.id = "ebc-tab-notes";
        notesTabBtn.textContent = "USERS";

        const thanksTabBtn = document.createElement("button");
        thanksTabBtn.className = "ebc-tab-btn";
        thanksTabBtn.id = "ebc-tab-thanks";
        thanksTabBtn.textContent = "CREDITS";
        thanksTabBtn.title = "Special Thanks";

        const devTabBtn2 = document.createElement("button");
        devTabBtn2.className = "ebc-tab-btn";
        devTabBtn2.id = "ebc-tab-dev";
        devTabBtn2.textContent = "DEV";
        devTabBtn2.title = "Developer Tools";

        // DOM tools tab — creator only, hidden until open() confirms the member number
        const domTabBtn = document.createElement("button");
        domTabBtn.className = "ebc-tab-btn";
        domTabBtn.id = "ebc-tab-dom";
        domTabBtn.textContent = "DOM";
        domTabBtn.title = "DOM Tools";
        domTabBtn.style.display = "none"; // revealed in open() for creator only

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(buttonsTabBtn);
        tabBar.appendChild(posesTabBtn);
        tabBar.appendChild(notesTabBtn);
        tabBar.appendChild(thanksTabBtn);
        tabBar.appendChild(devTabBtn2);
        tabBar.appendChild(domTabBtn);

        // Quick actions bar (always visible below tabs)
        const quickActions = document.createElement("div");
        quickActions.className = "ebc-quick-actions";
        quickActions.style.cssText = quickActions.style.cssText + ";flex-direction:column;gap:4px;";

        // Row 1: all-at-once danger buttons
        const qaRow1 = document.createElement("div");
        qaRow1.style.cssText = "display:flex;gap:5px;";

        const releaseBtn = document.createElement("button");
        releaseBtn.className = "ebc-action-btn danger";
        releaseBtn.title = "Remove all restraints (skips owner/lover/family locks)";
        releaseBtn.textContent = "Release Restraints";

        const unlockBtn = document.createElement("button");
        unlockBtn.className = "ebc-action-btn danger";
        unlockBtn.title = "Remove all locks (skips owner/lover/family locks)";
        unlockBtn.textContent = "Remove Locks";

        qaRow1.appendChild(releaseBtn);
        qaRow1.appendChild(unlockBtn);
        quickActions.appendChild(qaRow1);

        // Row 1b: confirm-before-escaping (centered, subtle, between danger buttons and picker)
        const qaConfirmRow = document.createElement("div");
        qaConfirmRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:7px;";

        const qaConfirmLbl = document.createElement("span");
        qaConfirmLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;user-select:none;";
        qaConfirmLbl.textContent = "Confirm before escaping";

        const qaConfirmToggle = document.createElement("button");
        const refreshQaConfirm = (): void => {
            const on = getAntiRestraintConfirm();
            qaConfirmToggle.textContent = on ? "ON" : "OFF";
            qaConfirmToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif",
                "font-size:9px",
                "font-weight:bold",
                "padding:1px 8px",
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
        selfPickToggle.textContent = "↓ Pick items to remove from yourself";
        selfPickToggle.title = "Choose specific restraints or locks to strip from yourself";
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
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:2px;";
                hint.textContent = "Nothing to remove — no restraints or locks found.";
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

            makeSection("Restraints", restraints, "restraint");
            makeSection("Locks", locks, "lock");

            // Two action buttons
            const btnRow = document.createElement("div");
            btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:3px;";

            const removeSelBtn = document.createElement("button");
            removeSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
            removeSelBtn.textContent = "↑ Remove Selected";
            removeSelBtn.addEventListener("mouseenter", () => { removeSelBtn.style.background = "#5a1c30"; });
            removeSelBtn.addEventListener("mouseleave", () => { removeSelBtn.style.background = "#3a1020"; });
            removeSelBtn.addEventListener("click", () => {
                const groups = [...selfSelected.entries()].filter(([, k]) => k === "restraint").map(([g]) => g);
                if (groups.length === 0) { selfPickStatus.textContent = "Select restraints first."; return; }
                const n = removePlayerSpecificItems(groups);
                selfPickStatus.textContent = n > 0 ? ("✓ Removed " + n + " item(s).") : "Nothing removed.";
                rebuildSelfPicker();
                window.setTimeout(() => { selfPickStatus.textContent = ""; }, 3000);
            });

            const unlockSelBtn = document.createElement("button");
            unlockSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #3a6a50;background:#0f2a1a;color:#79a885;cursor:pointer;transition:background 0.14s;";
            unlockSelBtn.textContent = "🔓 Unlock Selected";
            unlockSelBtn.addEventListener("mouseenter", () => { unlockSelBtn.style.background = "#1a4a2a"; });
            unlockSelBtn.addEventListener("mouseleave", () => { unlockSelBtn.style.background = "#0f2a1a"; });
            unlockSelBtn.addEventListener("click", () => {
                const groups = [...selfSelected.entries()].filter(([, k]) => k === "lock").map(([g]) => g);
                if (groups.length === 0) { selfPickStatus.textContent = "Select locks first."; return; }
                const n = unlockPlayerSpecificItems(groups);
                selfPickStatus.textContent = n > 0 ? ("✓ Unlocked " + n + " item(s).") : "Nothing unlocked.";
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
        const badgeRow = document.createElement("div");
        badgeRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 7px;border-top:1px solid #2a1421;background:rgba(20,8,16,0.5);flex-shrink:0;";

        const badgeLbl = document.createElement("span");
        badgeLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;flex:1;user-select:none;";
        badgeLbl.textContent = "Show EBC tags";

        const badgeToggle = document.createElement("button");
        const updateBadgeToggle = (): void => {
            const on = getBadgeEnabled();
            badgeToggle.textContent = on ? "ON" : "OFF";
            badgeToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif",
                "font-size:10px",
                "font-weight:bold",
                "padding:2px 10px",
                "border-radius:4px",
                "cursor:pointer",
                "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                "background:" + (on ? "#6b3048" : "#1b0d17"),
                "color:" + (on ? "#f7e6ee" : "#553142"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
            badgeToggle.title = on
                ? "EBC tags visible — click to hide them on your screen"
                : "EBC tags hidden — click to show them on your screen";
        };
        this.refreshBadgeRow = updateBadgeToggle;
        try { updateBadgeToggle(); } catch { /* Player may not be ready yet — synced on first open */ }

        badgeToggle.addEventListener("click", () => {
            // Client-side only — toggle just controls what YOU see locally.
            // Your own presence is always broadcast regardless of this setting.
            setBadgeEnabled(!getBadgeEnabled());
            updateBadgeToggle();
        });

        badgeRow.appendChild(badgeLbl);
        badgeRow.appendChild(badgeToggle);

        // Body
        const body = document.createElement("div");
        body.className = "ebc-body";
        body.id = "ebc-body";

        // Footer: version + credit line + live timer
        const footer = document.createElement("div");
        footer.className = "ebc-footer";
        footer.textContent = `EmeryBC v${this.version} · UI inspired by CRABS by Sin`;

        const timerEl = document.createElement("div");
        timerEl.className = "ebc-timer";
        footer.appendChild(timerEl);
        this.timerEl = timerEl;

        panel.appendChild(header);
        panel.appendChild(tabBar);
        panel.appendChild(quickActions);
        panel.appendChild(selfPickPanel);
        panel.appendChild(badgeRow);
        panel.appendChild(body);
        panel.appendChild(footer);
        slideContainer.appendChild(panel);
        root.appendChild(slideContainer);

        document.body.appendChild(root);
        this.rootEl  = root;
        this.panelEl = slideContainer;

        // Events — tab supports both click (toggle) and drag (reposition anywhere on screen).
        // We distinguish the two by tracking how far the mouse moved (5px dead-zone).
        tab.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.button !== 0) return; // left-click only
            e.preventDefault();

            // Block CRABS poller from overwriting style.top while dragging.
            // The poller uses absolute (chat-log-relative) coords; once the tab
            // switches to position:fixed those coords are in the wrong system.
            this.tabDragging = true;

            const startX = e.clientX;
            const startY = e.clientY;
            // Starting screen-space position of the tab
            const tabRect    = tab.getBoundingClientRect();
            const startTabX  = tabRect.left;
            const startTabY  = tabRect.top;

            let dragged = false;

            const onMove = (ev: MouseEvent): void => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!dragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return; // dead-zone
                dragged = true;
                tab.style.cursor = "grabbing";

                // Switch to fixed positioning the moment the user starts dragging
                if (tab.style.position !== "fixed") {
                    tab.style.position = "fixed";
                }

                const newX = Math.max(0, Math.min(window.innerWidth  - 44, startTabX + dx));
                const newY = Math.max(0, Math.min(window.innerHeight - 44, startTabY + dy));
                tab.style.left = `${newX}px`;
                tab.style.top  = `${newY}px`;
            };

            const onUp = (): void => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                tab.style.cursor = "";
                this.tabDragging = false; // re-enable CRABS poller

                if (!dragged) {
                    // No significant movement — treat as a plain click
                    this.toggle();
                    return;
                }

                // Save new position as screen-space fixed coords
                const pos = {
                    x: parseInt(tab.style.left, 10),
                    y: parseInt(tab.style.top,  10),
                };
                this.userTabOffset = pos;
                this.lastCrabsBottom = -1; // force CRABS re-read next poll
                this.saveTabOffset(pos);
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });

        // Right-click on tab resets to auto-position (follow CRABS / default)
        tab.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            this.userTabOffset = null;
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
            this.renderCurrentTab();
        });

        outfitTabBtn.addEventListener("click",   () => this.switchTab("outfits"));
        buttonsTabBtn.addEventListener("click",  () => this.switchTab("buttons"));
        posesTabBtn.addEventListener("click",    () => this.switchTab("anims"));
        notesTabBtn.addEventListener("click",    () => this.switchTab("notes"));
        thanksTabBtn.addEventListener("click",   () => this.switchTab("thanks"));
        devTabBtn2.addEventListener("click",     () => this.switchTab("dev"));
        domTabBtn.addEventListener("click",      () => this.switchTab("dom"));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) this.close();
        });
    }

    private injectStyles(): void {
        if (document.getElementById("emerybc-drawer-css")) return;
        const s = document.createElement("style");
        s.id = "emerybc-drawer-css";
        s.textContent = CSS;
        document.head.appendChild(s);
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
            const maxH = Math.max(100, window.innerHeight - rect.top - 8);
            const panelH = Math.min(rect.height, maxH);
            this.rootEl.style.top    = `${rect.top}px`;
            this.rootEl.style.right  = `${rightOffset}px`;
            this.rootEl.style.height = `${panelH}px`;
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
            ServerPlayerExtensionSettingsSync("EmeryBC");
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
            ServerPlayerExtensionSettingsSync("EmeryBC");
        } catch { /* ignore */ }
    }

    private loadPanelPosition(): { x: number; y: number } | null {
        try {
            const store = Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined;
            const v = store?.panelPos as { x?: unknown; y?: unknown } | null | undefined;
            if (v && typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y };
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
        if (!this.rootEl || !this.positioned) return;
        if (this.userTabOffset !== null) return; // user has pinned a position — don't override
        if (this.tabDragging) return;            // don't interfere with an active drag
        const tabEl = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
        if (!tabEl) return;

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

    // Poll CRABS's tab position while in a chat room so we stay in sync even
    // if CRABS repositions itself after our ResizeObserver already fired.
    private startCrabsPoller(): void {
        if (this.crabsPoller !== null) return;
        this.crabsPoller = window.setInterval(() => this.updateCrabsPosition(), 200);
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

        if (!inRoom) {
            this.rootEl.style.display = "none";
            this.isOpen = false;
            this.panelEl.className = "ebc-closed";
            const tabEl2 = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
            if (tabEl2) tabEl2.classList.add("ebc-tab-closed");
            this.positioned = false;
            this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            this.stopCrabsPoller();
            this.stopTimerPoller();
            return;
        }

        // Try to position; if the chat log isn't laid out yet, retry next frame
        const synced = this.syncToChat();
        if (synced) {
            this.rootEl.style.display = "block";
        } else {
            requestAnimationFrame(() => {
                if (this.syncToChat() && this.rootEl) {
                    this.rootEl.style.display = "block";
                }
            });
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
        this.currentTab = tab;

        for (const [id, name] of [
            ["ebc-tab-outfits", "outfits"],
            ["ebc-tab-buttons", "buttons"],
            ["ebc-tab-poses",   "anims"],
            ["ebc-tab-notes",   "notes"],
            ["ebc-tab-thanks",  "thanks"],
            ["ebc-tab-dev",     "dev"],
            ["ebc-tab-dom",     "dom"],
        ] as [string, DrawerTab][]) {
            const el = this.rootEl?.querySelector(`#${id}`);
            if (el) el.className = "ebc-tab-btn" + (tab === name ? " ebc-tab-active" : "");
        }

        this.renderCurrentTab();
    }

    private renderCurrentTab(): void {
        if      (this.currentTab === "outfits")  this.renderOutfits();
        else if (this.currentTab === "buttons")  this.renderButtons();
        else if (this.currentTab === "anims")    this.renderPoses();
        else if (this.currentTab === "notes")    this.renderNotes();
        else if (this.currentTab === "thanks")   this.renderThanks();
        else if (this.currentTab === "dev")      this.renderDev();
        else if (this.currentTab === "dom")      this.renderDomTools();
    }

    // -- Timer -----------------------------------------------------------------

    private updateTimer(): void {
        if (!this.timerEl) return;
        const online = getOnlineTime();
        const room   = getRoomTime();
        const bound  = getRestraintTime();
        let text = `🌐 Online: ${online}`;
        if (room)  text += `  🕒 Room: ${room}`;
        if (bound) text += `  ⛓ Bound: ${bound}`;
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

    // -- Outfits tab -----------------------------------------------------------

    private renderOutfits(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        this.renderRestraintInfo(body);
        this.renderPalettes(body);

        const outfits = getOutfits();

        const outfitLbl = document.createElement("div");
        outfitLbl.className = "ebc-section-label";
        outfitLbl.textContent = "Saved Outfits";
        body.appendChild(outfitLbl);

        if (outfits.length > 0) {
            for (const o of outfits) {
                body.appendChild(this.buildOutfitRow(o, body));
            }
        } else {
            const empty = document.createElement("div");
            empty.className = "ebc-empty";
            empty.textContent = "No outfits saved yet.";
            const br = document.createElement("br");
            const hint = document.createElement("span");
            hint.style.color = "#4c2537";
            hint.textContent = "Use the form below to create one.";
            empty.appendChild(br);
            empty.appendChild(hint);
            body.appendChild(empty);
        }

        this.buildNewOutfitSection(body);
        this.buildScheduleSection(body);
    }

    // -- Outfit Schedule section ------------------------------------------------

    private buildScheduleSection(body: HTMLElement): void {
        const divEl = document.createElement("div");
        divEl.className = "ebc-divider";
        body.appendChild(divEl);

        const lbl = document.createElement("div");
        lbl.className = "ebc-section-label";
        lbl.textContent = "Outfit Schedule";
        body.appendChild(lbl);

        const scheduleList = document.createElement("div");
        body.appendChild(scheduleList);

        const renderScheduleList = (): void => {
            while (scheduleList.firstChild) scheduleList.removeChild(scheduleList.firstChild);
            const schedules = getSchedules();
            const outfits   = getOutfits();

            if (schedules.length === 0) {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.style.padding = "4px 4px 8px";
                empty.textContent = "No schedules set.";
                scheduleList.appendChild(empty);
            }

            for (const sched of schedules) {
                const outfit = outfits.find(o => o.id === sched.outfitId);
                const row = document.createElement("div");
                row.className = "ebc-schedule-row";

                // Enabled toggle
                const togBtn = document.createElement("button");
                togBtn.className = "ebc-slot-toggle" + (sched.enabled ? " on" : "");
                togBtn.textContent = sched.enabled ? "ON" : "OFF";
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
                delBtn.title = "Remove schedule";
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
            opt.textContent = "No outfits";
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
            placeholder: "HH:MM",
            maxLength: 5,
            title: "24-hour time (e.g. 08:30, 14:00)",
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
        addBtn.textContent = "+ Add";
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
        body.appendChild(addRow);
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

        const render = (): void => {
            while (container.firstChild) container.removeChild(container.firstChild);
            if (collapsed) return;

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
            label.textContent = collapsed ? "▶ ACTIVE RESTRAINTS" : "▼ ACTIVE RESTRAINTS";
        };

        label.addEventListener("click", () => {
            collapsed = !collapsed;
            updateLabel();
            render();
        });

        updateLabel();
        render();
        body.appendChild(label);
        body.appendChild(container);
    }

    // -- Color palettes --------------------------------------------------------

    private renderPalettes(body: HTMLElement): void {
        const label = document.createElement("div");
        label.className = "ebc-section-label";
        label.style.cursor = "pointer";
        label.style.userSelect = "none";

        const container = document.createElement("div");
        container.style.marginBottom = "6px";

        let collapsed = true; // collapsed by default — outfits are the primary view

        // Shared helper: build one palette row
        const buildPaletteRow = (p: import("./palettes").ColorPalette, rerender: () => void): HTMLElement => {
            const row = document.createElement("div");
            row.className = "ebc-palette-row";

            const swatch = document.createElement("div");
            swatch.className = "ebc-palette-swatch";
            const colors = ([] as string[]).concat(...Object.values(p.colorMap).map(c => Array.isArray(c) ? c : [c as string])).filter(Boolean).slice(0, 8);
            for (const c of colors) {
                const dot = document.createElement("div");
                dot.className = "ebc-palette-dot";
                dot.style.background = c;
                swatch.appendChild(dot);
            }

            const nameInp = document.createElement("input");
            nameInp.className = "ebc-palette-name";
            nameInp.value = p.name;
            nameInp.maxLength = 30;
            nameInp.title = "Click to rename";
            nameInp.addEventListener("change", () => renamePalette(p.id, nameInp.value));

            const applyBtn = document.createElement("button");
            applyBtn.className = "ebc-wear-btn";
            applyBtn.textContent = "Apply";
            applyBtn.title = p.type === "restraint"
                ? "Apply these restraint colours to your current look"
                : "Apply this colour palette to your current look";
            applyBtn.addEventListener("click", () => {
                applyPalette(p.id);
                applyBtn.textContent = "Done!";
                window.setTimeout(() => { applyBtn.textContent = "Apply"; }, 1200);
            });

            let delPending = false;
            let delTimer: ReturnType<typeof window.setTimeout> | null = null;
            const delBtn = document.createElement("button");
            delBtn.className = "ebc-outfit-del";
            delBtn.textContent = "×";
            delBtn.title = "Delete palette";
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
                    deletePalette(p.id);
                    rerender();
                }
            });

            row.appendChild(swatch);
            row.appendChild(nameInp);
            row.appendChild(applyBtn);
            row.appendChild(delBtn);
            return row;
        };

        // Shared helper: build a "Save current" save row
        const buildSaveRow = (
            placeholder: string,
            btnLabel: string,
            btnTitle: string,
            onSave: (name: string) => void,
            rerender: () => void,
        ): HTMLElement => {
            const wrap = document.createElement("div");
            wrap.style.cssText = "display:flex;gap:5px;align-items:center;margin-top:4px;";

            const inp = document.createElement("input");
            inp.className = "ebc-form-input";
            inp.style.flex = "1";
            inp.placeholder = placeholder;
            inp.maxLength = 30;

            const btn = document.createElement("button");
            btn.className = "ebc-wear-btn";
            btn.textContent = btnLabel;
            btn.title = btnTitle;
            btn.addEventListener("click", () => {
                onSave(inp.value.trim());
                inp.value = "";
                rerender();
            });

            wrap.appendChild(inp);
            wrap.appendChild(btn);
            return wrap;
        };

        const render = (): void => {
            while (container.firstChild) container.removeChild(container.firstChild);
            if (collapsed) return;

            // ── Outfit palettes ──────────────────────────────────────────────
            const outfitLbl = document.createElement("div");
            outfitLbl.className = "ebc-import-hint";
            outfitLbl.style.cssText = "font-weight:600;margin-bottom:3px;";
            outfitLbl.textContent = "OUTFIT";
            container.appendChild(outfitLbl);

            const outfitPalettes = getPalettesByType("outfit");
            for (const p of outfitPalettes) {
                container.appendChild(buildPaletteRow(p, render));
            }
            if (outfitPalettes.length === 0) {
                const none = document.createElement("div");
                none.className = "ebc-empty";
                none.style.padding = "2px 4px 4px";
                none.textContent = "No outfit palettes saved";
                container.appendChild(none);
            }
            container.appendChild(buildSaveRow(
                "Palette name…",
                "Save Outfit",
                "Snapshot all current appearance colours",
                name => captureCurrentPalette(name || "Palette"),
                render,
            ));

            // ── Divider ──────────────────────────────────────────────────────
            const divEl = document.createElement("div");
            divEl.className = "ebc-divider";
            divEl.style.margin = "8px 0 4px";
            container.appendChild(divEl);

            // ── Restraint palettes ───────────────────────────────────────────
            const restraintLbl = document.createElement("div");
            restraintLbl.className = "ebc-import-hint";
            restraintLbl.style.cssText = "font-weight:600;margin-bottom:3px;";
            restraintLbl.textContent = "RESTRAINTS ⛓";
            container.appendChild(restraintLbl);

            const restraintPalettes = getPalettesByType("restraint");
            for (const p of restraintPalettes) {
                container.appendChild(buildPaletteRow(p, render));
            }
            if (restraintPalettes.length === 0) {
                const none = document.createElement("div");
                none.className = "ebc-empty";
                none.style.padding = "2px 4px 4px";
                none.textContent = "No restraint palettes saved";
                container.appendChild(none);
            }
            container.appendChild(buildSaveRow(
                "Restraint palette name…",
                "Save Restraints",
                "Snapshot colours of all currently worn restraints",
                name => captureRestraintPalette(name || "Restraint Palette"),
                render,
            ));
        };

        const updateLabel = (): void => {
            const count = getAllPalettes().length;
            label.textContent = (collapsed ? "▶" : "▼") + ` COLOUR PALETTES${count > 0 ? ` (${count})` : ""}`;
        };

        label.addEventListener("click", () => {
            collapsed = !collapsed;
            updateLabel();
            render();
        });

        updateLabel();
        render();
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

        // Labeled toggle chips — live inside the info column so they're readable without hover
        const flagsRow = document.createElement("div");
        flagsRow.className = "ebc-outfit-flags";

        const preserveBtn = document.createElement("button");
        preserveBtn.className = "ebc-flag-chip" + (isPreserving ? " on" : "");
        preserveBtn.textContent = isPreserving ? "⛓ Keep bonds" : "⛓ Swap bonds";

        const preserveClothingBtn = document.createElement("button");
        preserveClothingBtn.className = "ebc-flag-chip" + (isPreservingClothing ? " on" : "");
        preserveClothingBtn.textContent = isPreservingClothing ? "👗 Keep clothes" : "👗 Swap clothes";

        flagsRow.appendChild(preserveBtn);
        flagsRow.appendChild(preserveClothingBtn);

        info.appendChild(nameEl);
        info.appendChild(cmdEl);
        info.appendChild(flagsRow);

        const updateBtn = document.createElement("button");
        updateBtn.className = "ebc-update-btn";
        updateBtn.textContent = "Update";
        updateBtn.title = "Save current appearance to this outfit";

        const wearBtn = document.createElement("button");
        wearBtn.className = "ebc-wear-btn";
        wearBtn.textContent = "Wear";

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
        delBtn.title = "Delete this outfit";

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
        const makeEditRow = (labelText: string, input: HTMLInputElement): HTMLElement => {
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

        editPanel.appendChild(makeEditRow("Command", eCmdInput));
        editPanel.appendChild(makeEditRow("Name", eNameInput));
        editPanel.appendChild(makeEditRow("Announce", eAnnounceInput));

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
        eSaveBtn.textContent = "Save Changes";
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
            preserveBtn.textContent = next ? "⛓ Keep bonds" : "⛓ Swap bonds";
            setOutfitPreserveRestraints(o.id, next);
            ePreserveCheck.checked = next;
        });

        preserveClothingBtn.addEventListener("click", () => {
            const next = !preserveClothingBtn.classList.contains("on");
            preserveClothingBtn.className = "ebc-flag-chip" + (next ? " on" : "");
            preserveClothingBtn.textContent = next ? "👗 Keep clothes" : "👗 Swap clothes";
            setOutfitPreserveClothing(o.id, next);
            ePreserveClothingCheck.checked = next;
        });

        wearBtn.addEventListener("click", () => {
            const fresh = getOutfits().find(x => x.id === o.id);
            if (!fresh) return;
            setAllDisabled(true);
            applyOutfit(fresh);
            window.setTimeout(() => setAllDisabled(false), 500);
        });

        updateBtn.addEventListener("click", () => {
            setAllDisabled(true);
            const ok = saveCurrentAppearanceToOutfit(o.id);
            if (!ok) { setAllDisabled(false); return; }
            updateBtn.textContent = "Saved!";
            window.setTimeout(() => {
                updateBtn.textContent = "Update";
                setAllDisabled(false);
            }, 1200);
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
            );
            if (ok) this.renderOutfits();
        });

        eExportBtn.addEventListener("click", () => {
            const json = exportOutfitById(o.id);
            if (!json) return;
            const showFallback = (): void => {
                // Can't write clipboard — show in a temporary tooltip-style input
                const tmp = document.createElement("input");
                tmp.value = json;
                tmp.style.cssText = "position:fixed;top:-9999px;";
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand("copy");
                document.body.removeChild(tmp);
                eExportBtn.textContent = "Copied!";
                window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
            };
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(json)
                    .then(() => {
                        eExportBtn.textContent = "Copied!";
                        window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
                    })
                    .catch(showFallback);
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
                    delBtn.title = "Delete this outfit";
                }, 2500);
            } else {
                if (delTimer !== null) window.clearTimeout(delTimer);
                deleteOutfit(o.id);
                this.renderOutfits();
            }
        });

        return wrapper;
    }

    private buildNewOutfitSection(body: HTMLElement): void {
        const div = document.createElement("div");
        div.className = "ebc-divider";
        body.appendChild(div);

        const newBtn = document.createElement("button");
        newBtn.className = "ebc-new-outfit-btn";
        newBtn.textContent = "+ New Outfit from Current Look";
        body.appendChild(newBtn);

        const form = document.createElement("div");
        form.className = "ebc-new-form";
        body.appendChild(form);

        const makeRow = (labelText: string, input: HTMLInputElement): HTMLElement => {
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

        form.appendChild(makeRow("Command", cmdInput));
        form.appendChild(makeRow("Name", nameInput));
        form.appendChild(makeRow("Announce", announceInput));

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
        createBtn.textContent = "Save as New Outfit";
        form.appendChild(createBtn);

        newBtn.addEventListener("click", () => {
            const open = form.style.display !== "none";
            form.style.display = open ? "none" : "flex";
            newBtn.textContent = open ? "+ New Outfit from Current Look" : "- Cancel";
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
            );
            if (result) {
                cmdInput.value = "";
                nameInput.value = "";
                announceInput.value = "";
                checkbox.checked = false;
                form.style.display = "none";
                newBtn.textContent = "+ New Outfit from Current Look";
                this.renderOutfits();
            } else {
                createBtn.disabled = false;
                createBtn.textContent = "Save as New Outfit";
            }
        });

        // -- Import outfit section --
        const impDiv = document.createElement("div");
        impDiv.className = "ebc-divider";
        body.appendChild(impDiv);

        const impToggleBtn = document.createElement("button");
        impToggleBtn.className = "ebc-new-outfit-btn";
        impToggleBtn.textContent = "↓ Import Outfit";
        body.appendChild(impToggleBtn);

        const impPanel = document.createElement("div");
        impPanel.className = "ebc-import-panel";
        body.appendChild(impPanel);

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
            className: "ebc-form-input", type: "text", placeholder: "Outfit name (e.g. Rope Set)",
        });
        const bcCmdInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "Command (e.g. ropeset)",
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
            impToggleBtn.textContent = "↓ Import Outfit";
            impTextarea.value = ""; impError.textContent = "";
            bcNameInput.value = ""; bcCmdInput.value = "";
            bcModeSelect.value = "restraints";
            bcFields.style.display = "none"; isBCCode = false;
        };

        impToggleBtn.addEventListener("click", () => {
            const open = impPanel.classList.contains("open");
            impPanel.classList.toggle("open", !open);
            impToggleBtn.textContent = open ? "↓ Import Outfit" : "- Cancel Import";
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
                this.renderOutfits();
            } catch (err) {
                impError.textContent = err instanceof Error ? err.message : "Invalid format.";
            }
        });
    }

    // -- Boop friends ----------------------------------------------------------

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
                const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
                const targetName: string =
                    (typeof nickFn === "function"
                        ? (nickFn as (c: Character) => string)(friend)
                        : null)
                    ?? (friend as unknown as Record<string, unknown>).Nickname as string | undefined
                    ?? friend.Name
                    ?? "someone";
                const senderName: string =
                    (typeof nickFn === "function"
                        ? (nickFn as (c: Character) => string)(Player)
                        : null)
                    ?? Player.Name;
                // "Boop" is not a native BC activity so Type:"Activity" produces
                // "MISSING ACTIVITY DESCRIPTION" errors. Use Type:"Action" with the
                // standard BC possessive format — displays as (Emery boops Lucy's nose.)
                // and text-based addon reaction rules (LSCG, BCX, etc.) can match it.
                const text = `${senderName} boops ${targetName}'s nose.`;
                window.setTimeout(() => {
                    try {
                        ServerSend("ChatRoomChat", {
                            Type: "Action",
                            Content: text,
                            Dictionary: [
                                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                                { SourceCharacter: Player.MemberNumber },
                            ],
                        });
                    } catch { /* ignore */ }
                }, delay);
                booped++;
            }
            return booped;
        } catch {
            return 0;
        }
    }

    // -- Seq step builder helper -----------------------------------------------

    // Builds a step-builder UI for a seq button and wires it to btns[idx].emote.
    private buildSeqStepBuilder(btns: ActionButton[], idx: number): HTMLElement {
        const DEFAULT_DELAY = 600;

        // Parse current emote value into step rows
        interface SeqStep { type: "action" | "emote" | "pose" | "reset"; text: string; delay: number; }

        const parseSteps = (raw: string): SeqStep[] => {
            if (!raw.trim()) return [];
            return raw.split("|").map(r => r.trim()).filter(Boolean).map(r => {
                const { content, delay } = parseStep(r, DEFAULT_DELAY);
                if (content === "_") return { type: "reset" as const, text: "", delay };
                if (content.startsWith("!")) return { type: "action" as const, text: content.slice(1), delay };
                if (content.startsWith("*")) return { type: "emote" as const, text: content.slice(1), delay };
                return { type: "pose" as const, text: content, delay };
            });
        };

        const serializeSteps = (steps: SeqStep[]): string => {
            return steps.map(s => {
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
                    { value: "action", label: "Action !" },
                    { value: "emote",  label: "Emote *"  },
                    { value: "pose",   label: "Pose"     },
                    { value: "reset",  label: "Reset _"  },
                ].forEach(opt => {
                    const o = document.createElement("option");
                    o.value = opt.value; o.textContent = opt.label;
                    if (opt.value === step.type) o.selected = true;
                    typeSelect.appendChild(o);
                });

                // Text input
                const textInp = document.createElement("input");
                textInp.className = "ebc-seq-text-inp";
                textInp.type = "text";
                textInp.value = step.text;
                textInp.placeholder = step.type === "pose" ? "e.g. HandsUp" : "text...";
                textInp.disabled = step.type === "reset";
                textInp.maxLength = 200;

                // Delay input (ms)
                const delayInp = document.createElement("input");
                delayInp.className = "ebc-seq-delay-inp";
                delayInp.type = "number";
                delayInp.min = "0";
                delayInp.max = "60000";
                delayInp.step = "100";
                delayInp.value = String(step.delay);
                delayInp.title = "Delay after this step (ms)";

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
                    textInp.disabled = t === "reset";
                    if (t === "reset") { steps[sidx].text = ""; textInp.value = ""; }
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

        // + Add step button
        const addBtn = document.createElement("button");
        addBtn.className = "ebc-seq-add-btn";
        addBtn.textContent = "+ Add step";
        addBtn.addEventListener("click", () => {
            steps.push({ type: "action", text: "", delay: DEFAULT_DELAY });
            btns[idx].emote = serializeSteps(steps);
            renderSteps();
        });
        wrapper.appendChild(addBtn);

        return wrapper;
    }

    // -- Buttons tab -----------------------------------------------------------

    private renderButtons(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        // Working copies so we don't mutate storage until Save is clicked
        let btns: ActionButton[] = getButtons().map(b => ({ ...b }));
        let slotCount = getSlotCount();

        // Ensure array has slotCount entries
        while (btns.length < slotCount) {
            btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
        }

        const lbl = document.createElement("div");
        lbl.className = "ebc-section-label";
        lbl.textContent = "Quick Action Buttons";
        body.appendChild(lbl);

        const slotList = document.createElement("div");
        slotList.id = "ebc-slot-list";
        body.appendChild(slotList);

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
                toggle.textContent = btn.enabled ? "ON" : "OFF";
                toggle.title = btn.enabled ? "Click to disable" : "Click to enable";

                const labelInp = document.createElement("input");
                labelInp.className = "ebc-slot-label";
                labelInp.type = "text";
                labelInp.maxLength = 6;
                labelInp.placeholder = "Label";
                labelInp.value = btn.label;
                labelInp.title = "Button label (max 6 chars)";

                const colorInp = document.createElement("input");
                colorInp.className = "ebc-slot-color";
                colorInp.type = "color";
                colorInp.value = normalizeHex(btn.color);
                colorInp.title = "Button color";

                const delBtn = document.createElement("button");
                delBtn.className = "ebc-slot-del";
                delBtn.textContent = "x";
                delBtn.title = "Remove this slot";

                topLine.appendChild(toggle);
                topLine.appendChild(labelInp);
                topLine.appendChild(colorInp);
                topLine.appendChild(delBtn);

                // Bottom line: style toggle (hidden for seq) | emote/seq input
                const botLine = document.createElement("div");
                botLine.className = "ebc-slot-bottom";

                const currentStyle: ActionStyle = (btn.style as ActionStyle) ?? "action";
                const isSeq = currentStyle === "seq";

                const styleBtn = document.createElement("button");
                styleBtn.className = "ebc-slot-style" + (currentStyle === "emote" ? " emote" : "");
                styleBtn.textContent = currentStyle === "emote" ? "* *" : "( )";
                styleBtn.title = currentStyle === "emote"
                    ? "Style: * emote * — click to switch"
                    : "Style: ( action ) — click to switch";
                // Seq buttons don't show the style toggle — animation is internal
                styleBtn.style.display = isSeq ? "none" : "";

                // For seq buttons, show a small non-interactive badge instead
                const seqBadge = document.createElement("span");
                seqBadge.className = "ebc-slot-seq-badge";
                seqBadge.textContent = "✨";
                seqBadge.title = "Animation button — edit the sequence below";
                seqBadge.style.display = isSeq ? "inline" : "none";

                const emoteInp = document.createElement("input");
                emoteInp.className = "ebc-slot-emote";
                emoteInp.type = "text";
                emoteInp.maxLength = 240;
                emoteInp.placeholder = "e.g. nods.";
                emoteInp.value = btn.emote;
                emoteInp.title = currentStyle === "emote" ? "Text sent as * Name text *" : "Text sent as ( Name text )";
                emoteInp.style.display = isSeq ? "none" : "";

                botLine.appendChild(styleBtn);
                botLine.appendChild(seqBadge);
                botLine.appendChild(emoteInp);

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

                toggle.addEventListener("click", () => {
                    btns[idx].enabled = !btns[idx].enabled;
                    toggle.className = "ebc-slot-toggle" + (btns[idx].enabled ? " on" : "");
                    toggle.textContent = btns[idx].enabled ? "ON" : "OFF";
                });

                labelInp.addEventListener("input", () => {
                    btns[idx].label = labelInp.value.trim().slice(0, 6);
                });

                colorInp.addEventListener("input", () => {
                    btns[idx].color = normalizeHex(colorInp.value);
                });

                emoteInp.addEventListener("input", () => {
                    btns[idx].emote = emoteInp.value;
                });

                styleBtn.addEventListener("click", () => {
                    const cur: ActionStyle = btns[idx].style ?? "action";
                    if (cur === "seq") return; // seq buttons don't cycle through styles
                    const next: "action" | "emote" = cur === "action" ? "emote" : "action";
                    btns[idx].style = next;
                    styleBtn.className = "ebc-slot-style" + (next === "emote" ? " emote" : "");
                    styleBtn.textContent = next === "emote" ? "* *" : "( )";
                    styleBtn.title = next === "emote"
                        ? "Style: * emote * — click to switch"
                        : "Style: ( action ) — click to switch";
                    emoteInp.title = next === "emote"
                        ? "Text sent as * Name text *"
                        : "Text sent as ( Name text )";
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
        body.appendChild(footer);

        // Export / Import row
        const ioRow = document.createElement("div");
        ioRow.className = "ebc-btn-footer";
        ioRow.style.marginTop = "3px";

        const exportBtn = document.createElement("button");
        exportBtn.className = "ebc-btn-footer-btn";
        exportBtn.textContent = "↑ Export";
        exportBtn.title = "Copy button config to clipboard to share with others";

        const importToggleBtn = document.createElement("button");
        importToggleBtn.className = "ebc-btn-footer-btn";
        importToggleBtn.textContent = "↓ Import";
        importToggleBtn.title = "Load a shared button config";

        ioRow.appendChild(exportBtn);
        ioRow.appendChild(importToggleBtn);
        body.appendChild(ioRow);

        // Import panel (collapsible)
        const importPanel = document.createElement("div");
        importPanel.className = "ebc-import-panel";
        body.appendChild(importPanel);

        const importHint = document.createElement("div");
        importHint.className = "ebc-import-hint";
        importHint.textContent = "Paste exported config here:";
        importPanel.appendChild(importHint);

        const importTextarea = document.createElement("textarea");
        importTextarea.className = "ebc-notes-textarea";
        importTextarea.placeholder = '{"ebc":1,"slotCount":3,"buttons":[...]}';
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
                // Skip emote flush for seq buttons — seq builder keeps btns[i].emote in sync directly
                if (eInp && btns[i].style !== "seq") btns[i].emote = eInp.value;
            });
            saveButtons([...btns], slotCount);
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
                saveButtons([...btns], slotCount);
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
                    exportBtn.textContent = "Copied!";
                    window.setTimeout(() => { exportBtn.textContent = "↑ Export"; }, 1500);
                }).catch(showInPanel);
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
                importError.textContent = err instanceof Error ? err.message : "Invalid format — check the pasted text.";
            }
        });

        // -- Fun Actions --------------------------------------------------------
        const funLbl = document.createElement("div");
        funLbl.className = "ebc-section-label";
        funLbl.style.marginTop = "10px";
        funLbl.textContent = "Fun Actions";
        body.appendChild(funLbl);

        const boopBtn = document.createElement("button");
        boopBtn.className = "ebc-create-btn";
        boopBtn.style.cssText = "margin:4px 0 0; width:100%;";
        boopBtn.title = "Send a unique boop message to every friend currently in the room";
        boopBtn.textContent = "🐾 Boop all friends in room";
        boopBtn.addEventListener("click", () => {
            const booped = this.boopFriendsInRoom();
            if (booped === 0) {
                boopBtn.textContent = "No friends here~";
            } else {
                boopBtn.textContent = `Booped ${booped}!`;
            }
            window.setTimeout(() => { boopBtn.textContent = "🐾 Boop all friends in room"; }, 2000);
        });
        body.appendChild(boopBtn);

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
                    if (!p.key) continue;
                    const btn = document.createElement("button");
                    btn.className = "ebc-pose-add-btn";
                    btn.textContent = `+ ${p.label}`;
                    btn.title = `Add "${p.label}" as next step`;
                    btn.addEventListener("click", () => { poses.push(p.key); renderList(); });
                    btnRow.appendChild(btn);
                }
                parent.appendChild(btnRow);
            }

            // Custom pose add
            const customHint = document.createElement("div");
            customHint.className = "ebc-import-hint";
            customHint.style.marginTop = "3px";
            customHint.textContent = "Custom pose key:";
            parent.appendChild(customHint);

            const customRow = document.createElement("div");
            customRow.style.cssText = "display:flex;gap:5px;";
            const customInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. Hogtied",
                maxLength: 40,
            }) as HTMLInputElement;
            customInp.style.flex = "1";
            const addCustomBtn = document.createElement("button");
            addCustomBtn.className = "ebc-update-btn";
            addCustomBtn.textContent = "+ Add";
            addCustomBtn.addEventListener("click", () => {
                const val = customInp.value.trim();
                if (val) { poses.push(val); customInp.value = ""; renderList(); }
            });
            customRow.appendChild(customInp);
            customRow.appendChild(addCustomBtn);
            parent.appendChild(customRow);

            // Add delay row after the custom row
            parent.appendChild(delayRowEl);

            return {
                getPoses: () => poses.filter(Boolean),
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
                window.setTimeout(() => this.renderPoses(), 150);
            });
            statusBar.appendChild(clearBtn);
        }
        body.appendChild(statusBar);

        // ── Hint ──────────────────────────────────────────────────────────────
        const hint = document.createElement("div");
        hint.className = "ebc-import-hint";
        hint.style.marginBottom = "6px";
        hint.textContent = "Pick one Body pose and one Arm pose — they stack!";
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
                const isActive = preset.key === ""
                    ? currentPoses.length === 0
                    : isPoseActive(preset.key);
                btn.className = "ebc-pose-btn" + (isActive ? " active" : "");
                btn.textContent = preset.label;
                btn.title = preset.key
                    ? `Set ${group.group.toLowerCase()} pose: ${preset.key}`
                    : "Clear all poses";
                btn.addEventListener("click", () => {
                    if (preset.key === "") {
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
                    window.setTimeout(() => this.renderPoses(), 150);
                });
                grid.appendChild(btn);
            }
        }

        // ── Saved Combos ──────────────────────────────────────────────────────
        const divEl = document.createElement("div");
        divEl.className = "ebc-divider";
        body.appendChild(divEl);

        const combosLbl = document.createElement("div");
        combosLbl.className = "ebc-section-label";
        combosLbl.textContent = "SAVED COMBOS";
        body.appendChild(combosLbl);

        const combos = getPoseCombos();
        if (combos.length === 0) {
            const none = document.createElement("div");
            none.className = "ebc-empty";
            none.style.padding = "4px 0 6px";
            none.textContent = "No combos yet — create one below.";
            body.appendChild(none);
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
            posesEl.textContent = poseLabels.join(" → ") || "(none)";
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
                    this.renderPoses();
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
                    this.renderPoses();
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
            topSaveBtn.textContent = "✓ Save Changes";
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
                this.renderPoses();
            });
            topSaveBar.appendChild(topSaveBtn);

            // Full save button at the bottom too
            const saveBar = document.createElement("div");
            saveBar.className = "ebc-editor-save-bar";
            saveBar.style.marginTop = "2px";
            const savComboBtn = document.createElement("button");
            savComboBtn.className = "ebc-create-btn";
            savComboBtn.textContent = "Save Changes";
            savComboBtn.addEventListener("click", () => {
                updateCombo(combo.id, (eNameInp as HTMLInputElement).value, getPoses(), getCommand(), getAnnounce(), getDelay());
                this.renderPoses();
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
            body.appendChild(wrapper);
        }

        // ── New combo form ────────────────────────────────────────────────────
        const div2 = document.createElement("div");
        div2.className = "ebc-divider";
        body.appendChild(div2);

        const newComboToggle = document.createElement("button");
        newComboToggle.className = "ebc-new-outfit-btn";
        newComboToggle.textContent = "+ New Pose Combo";
        body.appendChild(newComboToggle);

        const newComboForm = document.createElement("div");
        newComboForm.className = "ebc-new-form";
        body.appendChild(newComboForm);

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
        ncTopSaveBtn.textContent = "✓ Save Combo";
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
            this.renderPoses();
        };
        ncTopSaveBtn.addEventListener("click", doSave);
        ncTopSaveBar.appendChild(ncTopSaveBtn);

        // Full save button at the bottom too
        const ncSaveBar = document.createElement("div");
        ncSaveBar.className = "ebc-editor-save-bar";
        ncSaveBar.style.marginTop = "2px";
        const ncSaveBtn = document.createElement("button");
        ncSaveBtn.className = "ebc-create-btn";
        ncSaveBtn.textContent = "Save Combo";
        ncSaveBtn.addEventListener("click", doSave);
        ncSaveBar.appendChild(ncSaveBtn);
        newComboForm.appendChild(ncSaveBar);

        newComboToggle.addEventListener("click", () => {
            const open = newComboForm.style.display !== "none";
            newComboForm.style.display = open ? "none" : "flex";
            newComboToggle.textContent = open ? "+ New Pose Combo" : "- Cancel";
            if (!open) {
                (ncNameInp as HTMLInputElement).focus();
                window.setTimeout(() => newComboToggle.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
            }
        });

        // ── SCENES ────────────────────────────────────────────────────────────
        this.renderScenes(body);
    }

    private renderScenes(body: HTMLElement): void {
        const STEP_TYPE_LABELS: Record<StepType, string> = {
            pose: "Pose", equip: "Equip", unequip: "Unequip", emote: "Emote", chat: "Chat", wait: "Wait",
        };
        const ALL_STEP_TYPES: StepType[] = ["pose", "equip", "unequip", "emote", "chat", "wait"];

        const bodyPoses = KNOWN_POSES.find(g => g.group === "Body")?.poses ?? [];
        const armPoses  = KNOWN_POSES.find(g => g.group === "Arms")?.poses ?? [];

        // -- Asset browser helpers ---------------------------------------------
        type GroupEntry = { name: string; desc: string };
        type AssetEntry = { name: string; desc: string };

        const getAllGroups = (): GroupEntry[] => {
            try {
                const bcAsset = (window as unknown as Record<string, unknown>).Asset as
                    Array<{ Group: { Name: string; Description?: string; Family?: string } }> | undefined;
                if (!Array.isArray(bcAsset)) return [];
                const family = (Player as unknown as Record<string, unknown>).AssetFamily as string ?? "Female3DCG";
                const seen = new Set<string>();
                const out: GroupEntry[] = [];
                for (const a of bcAsset) {
                    const g = a.Group;
                    if ((g.Family === family || !g.Family) && !seen.has(g.Name)) {
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
            for (const t of ALL_STEP_TYPES) {
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
                            posePoses = [bKey, aKey].filter(Boolean);
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

                } else if (type === "equip") {
                    const groups = getAllGroups();
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
                    captureBtn.addEventListener("click", () => {
                        try {
                            const g = groupSel.value;
                            if (!g) return;
                            const item = InventoryGet(Player, g);
                            if (!item) return;
                            equipAsset = item.Asset.Name;
                            updateAssetSel(equipAsset);
                            const c = (item as unknown as Record<string, unknown>).Color;
                            if (c !== undefined && colorInpRef) {
                                const s = Array.isArray(c) ? (c as string[]).join(",") : String(c);
                                colorInpRef.value = s;
                                equipColorRaw = s;
                            }
                        } catch { /* ignore */ }
                    });

                    row1.appendChild(groupSel);
                    row1.appendChild(assetSel);
                    row1.appendChild(captureBtn);
                    fieldsEl.appendChild(row1);

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
                        step.group = equipGroup.trim();
                        step.assetName = equipAsset.trim();
                        if (equipColorRaw.trim()) {
                            const parts = equipColorRaw.split(",").map(s => s.trim()).filter(Boolean);
                            step.color = parts.length === 1 ? parts[0] : parts;
                        }
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
            addBtn.textContent = "+ Add Step";
            addBtn.addEventListener("click", () => {
                syncFromEntries();
                const defDelays: Record<StepType, number> = {
                    pose: 500, equip: 800, unequip: 600, emote: 100, chat: 100, wait: 1000,
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

        const sceneDivider = document.createElement("div");
        sceneDivider.className = "ebc-divider";
        body.appendChild(sceneDivider);

        const scenesLbl = document.createElement("div");
        scenesLbl.className = "ebc-section-label";
        scenesLbl.textContent = "SCENES";
        body.appendChild(scenesLbl);

        const scenesHint = document.createElement("div");
        scenesHint.className = "ebc-import-hint";
        scenesHint.style.marginBottom = "6px";
        scenesHint.textContent = "Chain poses, item changes, emotes and pauses into a timed sequence.";
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
                    this.renderPoses();
                }, totalMs);
            });

            const editBtn = document.createElement("button");
            editBtn.className = "ebc-edit-btn";
            editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.title = "Edit scene";

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
                    this.renderPoses();
                }
            });

            row.appendChild(nameEl);
            row.appendChild(stepCountEl);
            row.appendChild(playBtn);
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
            topSaveBtn.textContent = "✓ Save Changes";
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
                this.renderPoses();
            });

            const botSaveBar = document.createElement("div");
            botSaveBar.className = "ebc-editor-save-bar";
            botSaveBar.style.marginTop = "2px";
            const botSaveBtn = document.createElement("button");
            botSaveBtn.className = "ebc-create-btn";
            botSaveBtn.textContent = "Save Changes";
            botSaveBtn.addEventListener("click", () => {
                updateScene(scene.id, eNameInp.value, getSteps(), eCmdInp.value);
                this.renderPoses();
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
            this.renderPoses();
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
            tab.style.position = "relative";
            tab.appendChild(dot);
        } else if (!hasUnread && dot) {
            dot.remove();
        }
    }

    public openBeepWindow(memberNumber: number): void {
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

        // Offset each new window slightly so they don't all stack at the same position
        const offset = this.beepWins.size * 28;

        const win = document.createElement("div");
        win.className = "ebc-beep-win";
        win.style.bottom = `${80 + offset}px`;
        win.style.right  = `${340 + offset}px`;
        this.beepWins.set(memberNumber, { el: win, minimized: false });

        // Header
        const header = document.createElement("div");
        header.className = "ebc-beep-win-header";

        const dot = document.createElement("span");
        dot.className = "ebc-friend-dot " + getFriendStatus(memberNumber);

        const title = document.createElement("span");
        title.className = "ebc-beep-win-title";
        title.textContent = resolveName(memberNumber);

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

        const minimizeBtn = document.createElement("button");
        minimizeBtn.className = "ebc-beep-win-hbtn";
        minimizeBtn.textContent = "–";
        minimizeBtn.title = "Minimize";
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
                if (this.currentTab === "notes") try { this.renderNotes(); } catch { /* ignore */ }
            }
        });

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-beep-win-hbtn ebc-beep-win-close";
        closeBtn.textContent = "×";
        closeBtn.addEventListener("click", () => {
            win.remove();
            this.beepWins.delete(memberNumber);
        });

        header.appendChild(dot);
        header.appendChild(title);
        header.appendChild(unreadDot);
        header.appendChild(muteBtn);
        header.appendChild(minimizeBtn);
        header.appendChild(closeBtn);
        win.appendChild(header);

        // Make header draggable
        header.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.target === closeBtn) return;
            e.preventDefault();
            const rect = win.getBoundingClientRect();
            const ox = e.clientX - rect.left;
            const oy = e.clientY - rect.top;
            const onMove = (ev: MouseEvent): void => {
                win.style.left   = `${ev.clientX - ox}px`;
                win.style.top    = `${ev.clientY - oy}px`;
                win.style.right  = "";
                win.style.bottom = "";
            };
            const onUp = (): void => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
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
            const entries = getConversation(memberNumber);
            const self = Player.MemberNumber ?? 0;
            if (entries.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "text-align:center;color:#5a3a4a;font-size:10px;padding:20px 0;";
                hint.textContent = "No messages yet. Say hi!";
                history.appendChild(hint);
            }
            for (const e of entries) {
                const isSent = e.from === self;
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (isSent ? "flex-end" : "flex-start") + ";";

                const bubble = document.createElement("div");
                bubble.className = "ebc-beep-msg " + (isSent ? "sent" : "received");

                const ts = document.createElement("div");
                ts.className = "ebc-beep-ts";
                const d = new Date(e.ts);
                ts.textContent = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
                bubble.appendChild(ts);

                // Parse message — may start with "> quote\n" reply prefix
                let msgBody = e.message;
                if (e.message.startsWith("> ") && e.message.includes("\n")) {
                    const nl = e.message.indexOf("\n");
                    const quoteEl = document.createElement("div");
                    quoteEl.className = "ebc-beep-quote";
                    quoteEl.textContent = e.message.slice(2, nl);
                    bubble.appendChild(quoteEl);
                    msgBody = e.message.slice(nl + 1);
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
                    replyBtn.textContent = "↩ reply";
                    replyBtn.addEventListener("click", () => setReply(msgBody.slice(0, 80)));
                    wrap.appendChild(replyBtn);
                }

                history.appendChild(wrap);
            }
            history.scrollTop = history.scrollHeight;
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

        const input = document.createElement("input");
        input.className = "ebc-beep-win-input";
        input.type = "text";
        input.placeholder = "Type a message...";
        input.maxLength = 300;

        const sendBtn = document.createElement("button");
        sendBtn.className = "ebc-beep-win-send";
        sendBtn.textContent = "Send";

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

        footer.appendChild(input);
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

    public onIncomingBeep(fromNum: number): void {
        const entry = this.beepWins.get(fromNum);
        const winVisible = entry && !entry.minimized;

        if (winVisible) {
            this.refreshBeepWindow(fromNum);
        } else {
            this.beepUnread.set(fromNum, (this.beepUnread.get(fromNum) ?? 0) + 1);
            this.refreshTabDot();
            if (this.currentTab === "notes") {
                try { this.renderNotes(); } catch { /* ignore */ }
            }
            // Show dot on the minimized bar if window exists but is minimized
            if (entry) {
                const dot = entry.el.querySelector<HTMLElement>(".ebc-beep-win-unread-dot");
                if (dot) dot.classList.add("visible");
            }
        }
    }

    // -- Notes tab -------------------------------------------------------------

    private renderNotes(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const notes = getNotes();
        const roomChars: Character[] = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];

        // ── You ──────────────────────────────────────────────────────────────
        const selfLbl = document.createElement("div");
        selfLbl.className = "ebc-section-label";
        selfLbl.textContent = "You";
        body.appendChild(selfLbl);
        body.appendChild(this.buildNoteRow(Player.MemberNumber!, this.charDisplayName(Player as unknown as Character), "", true));

        // ── In This Room ─────────────────────────────────────────────────────
        const roomOthers = roomChars.filter(c => c.MemberNumber !== Player.MemberNumber);
        if (roomOthers.length > 0) {
            const div = document.createElement("div");
            div.className = "ebc-divider";
            body.appendChild(div);
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "In This Room";
            body.appendChild(lbl);
            for (const char of roomOthers) {
                const displayName = this.charDisplayName(char);
                const existing = notes[String(char.MemberNumber)];
                body.appendChild(this.buildNoteRow(char.MemberNumber!, displayName, existing?.note ?? ""));
            }
        }

        // ── Saved (offline) ──────────────────────────────────────────────────
        const roomNums = new Set(roomChars.map(c => String(c.MemberNumber)));
        const offlineEntries = Object.entries(notes).filter(([k]) => !roomNums.has(k));
        if (offlineEntries.length > 0) {
            const div = document.createElement("div");
            div.className = "ebc-divider";
            body.appendChild(div);
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "Saved";
            body.appendChild(lbl);
            for (const [key, data] of offlineEntries) {
                body.appendChild(this.buildNoteRow(parseInt(key), data.name, data.note));
            }
        }

        if (roomOthers.length === 0 && offlineEntries.length === 0) {
            const empty = document.createElement("div");
            empty.className = "ebc-empty";
            empty.innerHTML = "No other players in this room yet.";
            body.appendChild(empty);
        }

        // ── Friends ──────────────────────────────────────────────────────────
        const friendList = getFriendList();
        if (friendList.length > 0) {
            const divF = document.createElement("div");
            divF.className = "ebc-divider";
            body.appendChild(divF);

            const onlineCount = friendList.filter(n => getFriendStatus(n) !== "away").length;
            const lblF = document.createElement("div");
            lblF.className = "ebc-section-label";
            lblF.style.cssText = "display:flex;align-items:center;gap:6px;";
            const lblFText = document.createElement("span");
            lblFText.textContent = "Friends";
            const lblFCount = document.createElement("span");
            lblFCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:normal;flex:1;";
            lblFCount.textContent = `${onlineCount} online · ${friendList.length} total`;

            const suppressBtn = document.createElement("button");
            const refreshSuppressBtn = (): void => {
                const on = getSuppressNativeBeep();
                suppressBtn.textContent = on ? "💬 hide in chat" : "💬 show in chat";
                suppressBtn.title = on ? "Beep messages are hidden from BC's main chat — click to show them" : "Beep messages show in BC's main chat — click to hide them";
                suppressBtn.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:8px",
                    "padding:1px 5px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "border:1px solid " + (on ? "#3a1928" : "#cf6f98"),
                    "background:transparent",
                    "color:" + (on ? "#5a3a4a" : "#cf6f98"),
                ].join(";");
            };
            refreshSuppressBtn();
            suppressBtn.addEventListener("click", () => { setSuppressNativeBeep(!getSuppressNativeBeep()); refreshSuppressBtn(); });

            lblF.appendChild(lblFText);
            lblF.appendChild(lblFCount);
            lblF.appendChild(suppressBtn);
            body.appendChild(lblF);

            const tags = getFriendTags();

            // Sort: room first, online second, away last, then alphabetical
            const statusOrder = (n: number): number => ({ room: 0, online: 1, away: 2 }[getFriendStatus(n)]);
            const sorted = [...friendList].sort((a, b) => {
                const diff = statusOrder(a) - statusOrder(b);
                if (diff !== 0) return diff;
                return resolveName(a).localeCompare(resolveName(b));
            });

            for (const num of sorted) {
                const status = getFriendStatus(num);
                const name = resolveName(num);
                const tag = tags[String(num)] ?? "";

                const row = document.createElement("div");
                row.className = "ebc-friend-row";

                const dot = document.createElement("div");
                dot.className = "ebc-friend-dot " + status;

                const nameEl = document.createElement("span");
                nameEl.className = "ebc-friend-name";
                nameEl.textContent = name;

                const numEl = document.createElement("span");
                numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a9ab8;margin-left:3px;flex-shrink:0;";
                numEl.textContent = "#" + num;

                // Tag badge — click to edit inline
                const tagEl = document.createElement("span");
                tagEl.className = "ebc-friend-tag";
                tagEl.textContent = tag || "+tag";
                tagEl.style.opacity = tag ? "1" : "0.4";
                tagEl.title = "Click to edit tag";
                tagEl.addEventListener("click", () => {
                    const cur = tags[String(num)] ?? "";
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = cur;
                    input.maxLength = 30;
                    input.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;color:#e8b4c8;border:1px solid #cf6f98;border-radius:3px;padding:1px 4px;width:80px;outline:none;";
                    tagEl.replaceWith(input);
                    input.focus();
                    const commit = () => {
                        setFriendTag(num, input.value);
                        tags[String(num)] = input.value.trim();
                        tagEl.textContent = input.value.trim() || "+tag";
                        tagEl.style.opacity = input.value.trim() ? "1" : "0.4";
                        input.replaceWith(tagEl);
                    };
                    input.addEventListener("blur", commit);
                    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); commit(); } });
                });

                const unread = this.beepUnread.get(num) ?? 0;
                const beepBtn = document.createElement("button");
                beepBtn.className = "ebc-friend-btn";
                beepBtn.style.position = "relative";
                beepBtn.textContent = "💬";
                beepBtn.title = unread ? `${unread} unread message${unread > 1 ? "s" : ""}` : "Open beep chat";
                if (unread > 0) {
                    const badge = document.createElement("span");
                    badge.textContent = unread > 9 ? "9+" : String(unread);
                    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#cf6f98;color:#fff;border-radius:8px;font-size:8px;font-family:'Trebuchet MS',serif;padding:0 3px;min-width:12px;text-align:center;line-height:12px;pointer-events:none;";
                    beepBtn.appendChild(badge);
                }
                beepBtn.addEventListener("click", () => {
                    this.beepUnread.delete(num);
                    this.openBeepWindow(num);
                    // Re-render friends to remove the badge
                    if (this.currentTab === "notes") try { this.renderNotes(); } catch { /* ignore */ }
                });

                row.appendChild(dot);
                row.appendChild(nameEl);
                row.appendChild(numEl);

                // Room info tag for online/in-room friends
                const info = status !== "away" ? getFriendOnlineInfo(num) : undefined;
                if (info?.roomName) {
                    const isPrivate = info.roomPrivate;
                    const isLocked  = info.roomLocked;
                    const isFull    = info.roomFull;
                    let icon = isLocked ? "🔐" : isPrivate ? "🔒" : "📢";
                    let bg = "#1e0d1a"; let color = "#9a6878"; let border = "#3a1928";
                    if (isLocked)       { bg = "#1a100d"; color = "#c8905a"; border = "#5a3020"; }
                    else if (isPrivate) { bg = "#1a0d20"; color = "#b07ab8"; border = "#4a2060"; }
                    else                { bg = "#0d1a18"; color = "#60a898"; border = "#1e4038"; }
                    const roomTag = document.createElement("span");
                    roomTag.textContent = icon + " " + (isFull ? "full · " : "") + info.roomName;
                    roomTag.title = info.roomName + (isPrivate ? " (private)" : " (public)") + (isFull ? " · full" : "");
                    roomTag.style.cssText = `font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 4px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;background:${bg};color:${color};border:1px solid ${border};`;
                    row.appendChild(roomTag);
                }

                // EBC version badge — only shown if we've seen them run EBC this session
                const ebcVer = getEBCVersion(num);
                if (ebcVer) {
                    const ebcBadge = document.createElement("span");
                    ebcBadge.textContent = "EBC " + ebcVer;
                    ebcBadge.title = "Uses EmeryBC v" + ebcVer;
                    ebcBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap;background:#2a0e1e;color:#cf6f98;border:1px solid #6b3048;";
                    row.appendChild(ebcBadge);
                }

                row.appendChild(tagEl);
                row.appendChild(beepBtn);
                body.appendChild(row);
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
            container.style.borderColor = vip.color;
            container.style.boxShadow = `0 0 6px ${vip.color}40`;
        }

        const header = document.createElement("div");
        header.className = "ebc-notes-person-header";

        const dot = document.createElement("div");
        dot.className = "ebc-notes-dot" + (hasNote ? " has-note" : "");

        const name = document.createElement("span");
        name.className = "ebc-notes-person-name";
        name.textContent = displayName;
        if (vip) {
            name.style.color = vip.color;
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
            badge.style.cssText = `font-size:10px;color:${vip.color};flex-shrink:0;margin-right:2px;`;
            header.appendChild(badge);
        }
        header.appendChild(num);
        container.appendChild(header);

        if (isSelf) {
            const selfNote = document.createElement("div");
            selfNote.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c8a84b;padding:2px 4px 4px 18px;";
            selfNote.textContent = "That's you — notes on yourself are not supported.";
            container.appendChild(selfNote);
            return container;
        }

        const editor = document.createElement("div");
        editor.className = "ebc-notes-editor";

        const textarea = document.createElement("textarea");
        textarea.className = "ebc-notes-textarea";
        textarea.placeholder = "Notes about this person...";
        textarea.value = currentNote;
        textarea.rows = 3;

        const hint = document.createElement("div");
        hint.className = "ebc-notes-save-hint";
        hint.textContent = "saves automatically";

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

        const devLbl = document.createElement("div");
        devLbl.className = "ebc-section-label";
        devLbl.textContent = "Developer Tools";
        body.appendChild(devLbl);

        // -- Toggle: show EBC version in overhead badge --
        const verRow = document.createElement("div");
        verRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;margin-bottom:4px;";

        const verLbl = document.createElement("span");
        verLbl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
        verLbl.textContent = "Show version in overhead badge";
        const verHint = document.createElement("span");
        verHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
        verHint.textContent = "Shows EBC version above room members";

        const verInfo = document.createElement("div");
        verInfo.style.cssText = "flex:1;min-width:0;";
        verInfo.appendChild(verLbl);
        verInfo.appendChild(document.createElement("br"));
        verInfo.appendChild(verHint);

        const verToggle = document.createElement("button");
        const refreshVerToggle = (): void => {
            const on = getShowVersionBadge();
            verToggle.textContent = on ? "ON" : "OFF";
            verToggle.style.cssText = [
                "font-family:'Trebuchet MS',serif",
                "font-size:10px",
                "font-weight:bold",
                "padding:2px 10px",
                "border-radius:4px",
                "cursor:pointer",
                "flex-shrink:0",
                "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                "background:" + (on ? "#6b3048" : "#1b0d17"),
                "color:" + (on ? "#f7e6ee" : "#553142"),
                "transition:background 0.14s,color 0.14s,border-color 0.14s",
            ].join(";");
        };
        refreshVerToggle();
        verToggle.addEventListener("click", () => {
            setShowVersionBadge(!getShowVersionBadge());
            refreshVerToggle();
        });

        verRow.appendChild(verInfo);
        verRow.appendChild(verToggle);
        body.appendChild(verRow);

        // -- Room EBC presence list --
        const presLbl = document.createElement("div");
        presLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:8px 0 4px;";
        presLbl.textContent = "EBC users in this room";
        body.appendChild(presLbl);

        const presListEl = document.createElement("div");
        body.appendChild(presListEl);

        const refreshPresence = (): void => {
            while (presListEl.firstChild) presListEl.removeChild(presListEl.firstChild);
            const room = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Array<Record<string, unknown>> | undefined) ?? [];
            const found: Array<{ name: string; id: number; version: string; isSelf: boolean }> = [];

            for (const c of room) {
                const memberNum = c.MemberNumber as number | undefined;
                const isSelf = memberNum === Player.MemberNumber;
                if (isSelf) {
                    found.push({ name: String(c.Name ?? "You"), id: memberNum ?? 0, version: "self", isSelf: true });
                    continue;
                }
                const shared = (c.OnlineSharedSettings as Record<string, unknown> | undefined)?.["EmeryBC"] as Record<string, unknown> | undefined;
                const presence = shared?.["presence"] as Record<string, unknown> | undefined;
                if (presence?.["marker"] === "EBC") {
                    found.push({ name: String(c.Name ?? "?"), id: memberNum ?? 0, version: String(presence["version"] ?? "?"), isSelf: false });
                }
            }

            if (found.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;";
                hint.textContent = "No other EBC users detected in this room.";
                presListEl.appendChild(hint);
                return;
            }

            for (const p of found) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 7px;border-radius:5px;margin-bottom:2px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;";

                const nameEl = document.createElement("span");
                nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                nameEl.textContent = p.isSelf ? "You" : p.name;

                const idEl = document.createElement("span");
                idEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                idEl.textContent = "#" + p.id;

                const verEl = document.createElement("span");
                verEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;" +
                    (p.isSelf ? "color:#7a5a6a;background:#1b0d17;border:1px solid #3a1928;" : "color:#cf6f98;background:#2a1421;border:1px solid #6b3048;");
                verEl.textContent = p.isSelf ? "you" : ("v" + p.version);

                row.appendChild(nameEl);
                row.appendChild(idEl);
                row.appendChild(verEl);
                presListEl.appendChild(row);
            }
        };

        refreshPresence();

        const refreshBtn = document.createElement("button");
        refreshBtn.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 0;transition:background 0.14s,color 0.12s;margin-top:3px;";
        refreshBtn.textContent = "↻ Refresh list";
        refreshBtn.addEventListener("click", () => { refreshPresence(); });
        body.appendChild(refreshBtn);

        // ── Character Inspector ──────────────────────────────────────────────────
        const charLbl = document.createElement("div");
        charLbl.className = "ebc-section-label";
        charLbl.style.marginTop = "12px";
        charLbl.textContent = "Character Inspector";
        body.appendChild(charLbl);

        const charHint = document.createElement("div");
        charHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:4px;";
        charHint.textContent = "Dump raw appearance + property data for any room member.";
        body.appendChild(charHint);

        const charPickRow = document.createElement("div");
        charPickRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";

        const charSelect = document.createElement("select");
        charSelect.style.cssText = "flex:1;background:#1b0d17;border:1px solid #4c2537;color:#f7e6ee;border-radius:4px;font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 4px;";

        const charInspBtn = document.createElement("button");
        charInspBtn.className = "ebc-create-btn";
        charInspBtn.style.cssText = "margin:0;padding:2px 10px;font-size:10px;";
        charInspBtn.textContent = "Inspect";

        charPickRow.appendChild(charSelect);
        charPickRow.appendChild(charInspBtn);
        body.appendChild(charPickRow);

        const charDump = document.createElement("pre");
        charDump.style.cssText = [
            "background:#100810", "border:1px solid #3a1928", "border-radius:4px",
            "padding:6px", "font-size:8.5px", "color:#cf6f98",
            "max-height:220px", "overflow-y:auto", "white-space:pre-wrap",
            "word-break:break-all", "margin:0", "display:none",
            "font-family:'Courier New',monospace",
        ].join(";");
        body.appendChild(charDump);

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
            if (!char) { charDump.textContent = "Character not found in room."; charDump.style.display = ""; return; }
            try {
                const snapshot = {
                    Name: char.Name,
                    Nickname: (char as unknown as Record<string, unknown>).Nickname,
                    MemberNumber: char.MemberNumber,
                    ActivePose: (char as unknown as Record<string, unknown>).ActivePose,
                    Appearance: char.Appearance.map((a: Item) => ({
                        Group: a.Asset.Group.Name,
                        Name: a.Asset.Name,
                        Color: a.Color,
                        Difficulty: (a as unknown as Record<string, unknown>).Difficulty,
                        Property: a.Property,
                        Craft: a.Craft,
                    })),
                };
                charDump.textContent = JSON.stringify(snapshot, null, 2);
                charDump.style.display = "";
            } catch (e) {
                charDump.textContent = "Error: " + String(e);
                charDump.style.display = "";
            }
        });

        // ── Hook Inspector ───────────────────────────────────────────────────────
        const hookLbl = document.createElement("div");
        hookLbl.className = "ebc-section-label";
        hookLbl.style.marginTop = "12px";
        hookLbl.textContent = "Hook Inspector";
        body.appendChild(hookLbl);

        const hookList = document.createElement("div");
        body.appendChild(hookList);

        const renderHooks = (): void => {
            while (hookList.firstChild) hookList.removeChild(hookList.firstChild);
            try {
                const sdk = (window as unknown as Record<string, unknown>).bcModSdk as Record<string, unknown> | undefined;
                const getModsInfo = sdk?.getModsInfo as ((...a: unknown[]) => unknown) | undefined;
                const mods = getModsInfo ? (getModsInfo.call(sdk) as unknown[]) : [];
                if (!Array.isArray(mods) || mods.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;";
                    hint.textContent = "bcModSdk not available or no mods loaded.";
                    hookList.appendChild(hint);
                    return;
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

                    const hookCount = document.createElement("span");
                    hookCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                    hookCount.textContent = hooks.length > 0 ? `${hooks.length} hooks` : "no hooks listed";

                    topLine.appendChild(nameEl);
                    topLine.appendChild(verEl);
                    topLine.appendChild(hookCount);
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
        hookRefreshBtn.textContent = "↻ Refresh hooks";
        hookRefreshBtn.addEventListener("click", renderHooks);
        body.appendChild(hookRefreshBtn);

        // ── Message Logger ───────────────────────────────────────────────────────
        const msgLblRow = document.createElement("div");
        msgLblRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-top:12px;margin-bottom:2px;";

        const msgLbl = document.createElement("div");
        msgLbl.className = "ebc-section-label";
        msgLbl.style.margin = "0";
        msgLbl.textContent = "Message Log";

        const logStatusDot = document.createElement("span");
        logStatusDot.style.cssText = "font-size:9px;font-family:'Trebuchet MS',serif;padding:1px 6px;border-radius:3px;flex-shrink:0;";
        const updateStatusDot = (): void => {
            if (isDevLogEnabled()) {
                logStatusDot.textContent = "● CAPTURING";
                logStatusDot.style.cssText += "background:#1a3a1a;color:#6bd478;border:1px solid #2a6a2a;";
            } else {
                logStatusDot.textContent = "○ OFF";
                logStatusDot.style.cssText += "background:#1a0a10;color:#7a4050;border:1px solid #3a1020;";
            }
        };
        updateStatusDot();

        msgLblRow.appendChild(msgLbl);
        msgLblRow.appendChild(logStatusDot);
        body.appendChild(msgLblRow);

        const msgCtrlRow = document.createElement("div");
        msgCtrlRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;align-items:center;";

        const msgRefreshBtn2 = document.createElement("button");
        msgRefreshBtn2.className = "ebc-icon-btn";
        msgRefreshBtn2.style.cssText = "font-size:10px;padding:2px 8px;";
        msgRefreshBtn2.textContent = "↻";
        msgRefreshBtn2.title = "Refresh log";

        const msgClearBtn = document.createElement("button");
        msgClearBtn.className = "ebc-icon-btn";
        msgClearBtn.style.cssText = "font-size:10px;padding:2px 8px;";
        msgClearBtn.textContent = "Clear";

        const logToggleWrap = document.createElement("label");
        logToggleWrap.style.cssText = "display:flex;align-items:center;gap:4px;font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;cursor:pointer;margin-left:auto;user-select:none;";
        const logToggleChk = document.createElement("input");
        logToggleChk.type = "checkbox";
        logToggleChk.checked = isDevLogEnabled();
        logToggleChk.addEventListener("change", () => {
            setDevLogEnabled(logToggleChk.checked);
            updateStatusDot();
            renderMsgLog();
        });
        logToggleWrap.appendChild(logToggleChk);
        logToggleWrap.appendChild(document.createTextNode(" Live logging"));

        const msgTestBtn = document.createElement("button");
        msgTestBtn.className = "ebc-icon-btn";
        msgTestBtn.style.cssText = "font-size:10px;padding:2px 8px;";
        msgTestBtn.textContent = "Test";
        msgTestBtn.title = "Inject a test entry to verify the log UI is working";
        msgTestBtn.addEventListener("click", () => {
            pushTestEntry();
            renderMsgLog();
        });

        msgCtrlRow.appendChild(msgRefreshBtn2);
        msgCtrlRow.appendChild(msgClearBtn);
        msgCtrlRow.appendChild(msgTestBtn);
        msgCtrlRow.appendChild(logToggleWrap);
        body.appendChild(msgCtrlRow);

        // Hint row — shown when logging is off
        const logOffHint = document.createElement("div");
        logOffHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#8a5060;background:#1a080f;border:1px dashed #4c2537;border-radius:4px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px;";
        logOffHint.style.display = isDevLogEnabled() ? "none" : "";
        logOffHint.innerHTML = "<span>Logging is off — enable it to capture messages.</span>";
        const enableBtn = document.createElement("button");
        enableBtn.className = "ebc-wear-btn";
        enableBtn.textContent = "Enable";
        enableBtn.style.flexShrink = "0";
        enableBtn.addEventListener("click", () => {
            setDevLogEnabled(true);
            logToggleChk.checked = true;
            logOffHint.style.display = "none";
            updateStatusDot();
            renderMsgLog();
        });
        logOffHint.appendChild(enableBtn);
        body.appendChild(logOffHint);

        const msgLogEl = document.createElement("div");
        msgLogEl.style.cssText = "background:#100810;border:1px solid #3a1928;border-radius:4px;max-height:260px;overflow-y:auto;";
        body.appendChild(msgLogEl);

        const msgTypeColor = (type: string): string => {
            switch (type) {
                case "Chat":     return "#6bd478";
                case "Emote":    return "#78a4d4";
                case "Activity": return "#d4a478";
                case "Action":   return "#d478c4";
                case "Whisper":  return "#78d4c4";
                case "Hidden":   return "#a0a0a0";
                default:         return "#cf6f98";
            }
        };

        const renderMsgLog = (): void => {
            while (msgLogEl.firstChild) msgLogEl.removeChild(msgLogEl.firstChild);
            const entries = [...getDevLog()].reverse();
            if (entries.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:8px 6px;";
                hint.textContent = isDevLogEnabled()
                    ? "No messages yet. Must be in a room — chat, emote, or have someone do an action. Click Test above to verify the UI works."
                    : "Logging is off. Click Enable above, then do something in a room.";
                msgLogEl.appendChild(hint);
                return;
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
                timeTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#553142;margin-left:auto;";
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

                // Clicking a row expands/collapses the full dictionary JSON
                let dictEl: HTMLElement | null = null;
                row.addEventListener("click", () => {
                    if (dictEl) { dictEl.remove(); dictEl = null; return; }
                    dictEl = document.createElement("pre");
                    dictEl.style.cssText = "font-family:'Courier New',monospace;font-size:7.5px;color:#7a5a6a;margin:3px 0 0;white-space:pre-wrap;word-break:break-all;";
                    try { dictEl.textContent = JSON.stringify(entry.dictionary, null, 2); }
                    catch { dictEl.textContent = String(entry.dictionary); }
                    row.appendChild(dictEl);
                });

                row.appendChild(headerLine);
                row.appendChild(contentLine);
                msgLogEl.appendChild(row);
            }
        };

        renderMsgLog();
        msgRefreshBtn2.addEventListener("click", renderMsgLog);
        msgClearBtn.addEventListener("click", () => { clearDevLog(); renderMsgLog(); });

        // Auto-refresh every 1.5 s while the DEV tab is open
        this.stopDevLogPoller();
        this.devLogPoller = window.setInterval(() => {
            if (this.currentTab === "dev" && isDevLogEnabled()) renderMsgLog();
        }, 1500);
    }

    // -- Special Thanks tab ----------------------------------------------------

    private renderThanks(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const credLbl = document.createElement("div");
        credLbl.className = "ebc-section-label";
        credLbl.textContent = "Special Thanks";
        body.appendChild(credLbl);

        const intro = document.createElement("div");
        intro.className = "ebc-thanks-intro";
        intro.textContent = "People who made EmeryBC possible.";
        body.appendChild(intro);

        const people = [
            {
                emoji: "🎀",
                name: "Sin",
                memberId: 143776,
                reason: "Creator of CRABS — the UI inspiration behind this whole drawer. Open design, open heart.",
                heart: "💗",
            },
            {
                emoji: "🌸",
                name: "Lara",
                memberId: 124264,
                reason: "Keeping my bratty side in check, endless support and inspiration, and simply being the best friend anyone could ask for around here~",
                heart: "💖",
            },
            {
                emoji: "🌙",
                name: "Lucy",
                memberId: 230466,
                reason: "Stayed up nearly 19 hours with me while this came to life, sharing ideas and keeping the energy going the whole way through.",
                heart: "💜",
            },
            {
                emoji: "✨",
                name: "Sybil",
                memberId: 80,
                reason: "Brilliant ideas, patient testing, and a genuinely kind presence — Sybil has shaped this addon in more ways than one, and her beautiful contributions to the club make it a richer place for everyone. Big thanks~",
                heart: "💛",
            },
        ];

        for (const p of people) {
            const card = document.createElement("div");
            card.className = "ebc-thanks-card";

            const avatar = document.createElement("div");
            avatar.className = "ebc-thanks-avatar";
            avatar.textContent = p.emoji;

            const info = document.createElement("div");
            info.className = "ebc-thanks-info";

            const nameRow = document.createElement("div");
            nameRow.style.cssText = "display:flex;align-items:baseline;gap:5px;";

            const namEl = document.createElement("span");
            namEl.className = "ebc-thanks-name";
            namEl.textContent = p.name;

            const idEl2 = document.createElement("span");
            idEl2.style.cssText = "font-size:9px;color:#7a5a6a;font-family:'Trebuchet MS',serif;flex-shrink:0;";
            idEl2.textContent = "#" + p.memberId;
            idEl2.title = "BC Member Number";

            nameRow.appendChild(namEl);
            nameRow.appendChild(idEl2);

            const reason = document.createElement("span");
            reason.className = "ebc-thanks-reason";
            reason.textContent = p.reason;

            info.appendChild(nameRow);
            info.appendChild(reason);

            const heart = document.createElement("span");
            heart.className = "ebc-thanks-heart";
            heart.textContent = p.heart;

            card.appendChild(avatar);
            card.appendChild(info);
            card.appendChild(heart);
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
            antiToggle.textContent = on ? "ON" : "OFF";
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
                "color:" + (on ? "#f7e6ee" : "#553142"),
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
        wlTitle.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;";
        wlTitle.textContent = "Escape whitelist — items auto-escape will keep";
        whitelistSection.appendChild(wlTitle);

        const domFriendlyGroup = (g: string): string =>
            g.replace(/^Item/, "").replace(/([A-Z])/g, " $1").trim();

        const domMakeChip = (label: string, onRemove: () => void): HTMLDivElement => {
            const chip = document.createElement("div");
            chip.style.cssText = "display:inline-flex;align-items:center;gap:3px;background:#3a1928;border:1px solid #6b3048;border-radius:10px;padding:2px 7px 2px 8px;font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;margin:2px 2px 2px 0;";
            const txt = document.createElement("span");
            txt.textContent = label;
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
        wlChips.style.cssText = "min-height:18px;margin-bottom:4px;";
        const wlAddRow = document.createElement("div");
        wlAddRow.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;";

        const refreshWhitelistUI = (): void => {
            wlChips.innerHTML = "";
            wlAddRow.innerHTML = "";
            const whitelist = getAntiRestraintWhitelist();
            if (whitelist.length === 0) {
                const empty = document.createElement("span");
                empty.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#4c2537;";
                empty.textContent = "Nothing whitelisted — all restraints will be escaped";
                wlChips.appendChild(empty);
            } else {
                for (const group of whitelist) {
                    wlChips.appendChild(domMakeChip(domFriendlyGroup(group), () => {
                        removeFromAntiRestraintWhitelist(group);
                        refreshWhitelistUI();
                    }));
                }
            }
            try {
                const wornGroups = Player.Appearance
                    .filter((i: Item) => i.Asset.Group.IsRestraint && !whitelist.includes(i.Asset.Group.Name))
                    .map((i: Item) => i.Asset.Group.Name);
                if (wornGroups.length > 0) {
                    const addLabel = document.createElement("span");
                    addLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-right:4px;align-self:center;";
                    addLabel.textContent = "Currently wearing:";
                    wlAddRow.appendChild(addLabel);
                    for (const group of wornGroups) {
                        const btn = document.createElement("button");
                        btn.textContent = "+ " + domFriendlyGroup(group);
                        btn.title = "Add to whitelist — auto-escape will keep this";
                        btn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;border:1px solid #4c2537;border-radius:10px;color:#7a5a6a;padding:2px 8px;cursor:pointer;";
                        btn.addEventListener("click", () => {
                            addToAntiRestraintWhitelist(group);
                            refreshWhitelistUI();
                        });
                        wlAddRow.appendChild(btn);
                    }
                }
            } catch { /* ignore */ }
        };

        refreshWhitelistUI();
        whitelistSection.appendChild(wlChips);
        whitelistSection.appendChild(wlAddRow);
        body.appendChild(whitelistSection);

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
                delBtn.style.cssText = "background:transparent;border:1px solid #4c2537;border-radius:4px;color:#553142;cursor:pointer;font-size:11px;padding:1px 6px;transition:background 0.14s,color 0.12s;";
                delBtn.textContent = "×";
                delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "#3a1017"; delBtn.style.color = "#ff6b6b"; });
                delBtn.addEventListener("mouseleave", () => { delBtn.style.background = ""; delBtn.style.color = "#553142"; });
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
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
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
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
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
                    none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:1px 4px 4px;";
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
        setsLbl.textContent = "Restraint Sets";
        const newSetBtn = document.createElement("button");
        newSetBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid #91405f;background:#2a1421;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
        newSetBtn.textContent = "+ New Set";
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
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;margin-bottom:4px;";
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
                tokenHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#553142;padding:0 0 6px;";
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
                        hint2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
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
                        iDel.style.cssText = "background:transparent;border:none;color:#553142;cursor:pointer;font-size:12px;padding:0 3px;line-height:1;";
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
                importToggle.textContent = "↓ Import from BC Code";
                editor.appendChild(importToggle);

                const importPanel = document.createElement("div");
                importPanel.style.cssText = "display:none;flex-direction:column;gap:5px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;border-radius:6px;padding:7px;margin-bottom:5px;";

                const importTA = document.createElement("textarea");
                importTA.style.cssText = "width:100%;box-sizing:border-box;background:#1b0d17;border:1px solid #4c2537;border-radius:4px;color:#f7e6ee;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 5px;resize:vertical;min-height:46px;outline:none;";
                importTA.placeholder = "Paste BC outfit code…";

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
                delSetBtn.style.cssText = "width:100%;background:transparent;border:1px solid #4c2537;border-radius:5px;color:#553142;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-top:5px;";
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
                            delSetBtn.style.color = "#553142";
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
        try { this.refreshBadgeRow?.(); } catch { /* ignore */ }
        // Show the DOM tab only for the creator
        const domTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-dom");
        if (domTabEl) domTabEl.style.display = isDomEnabled() ? "" : "none";
        this.updateTimer();
        this.renderCurrentTab();
    }

    public close(): void {
        if (!this.panelEl) return;
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
        this.resizeObserver?.disconnect();
        this.stopCrabsPoller();
        this.stopTimerPoller();
        this.rootEl?.remove();
        this.rootEl  = null;
        this.panelEl = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
