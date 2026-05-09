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
    getOutfitTags,
    createOutfitTag,
    deleteOutfitTag,
    updateOutfitTag,
    setOutfitTagIds,
    moveOutfit,
    type OutfitTag,
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
import { getFriendList, getFriendStatus, getFriendTagList, setFriendTagList, FriendTag, getConversation, sendBeep, resolveName, cacheName, addBeepEntry, BeepEntry, getFriendOnlineInfo, getEBCVersion, cacheEBCVersion, isFriendPinned, togglePinFriend, stripBeepMetadata } from "./friends";
import { isDevLogEnabled, setDevLogEnabled, getDevLog, clearDevLog, pushTestEntry } from "./devLog";
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
    box-shadow: 0 6px 24px rgba(0,0,0,0.85), 0 0 12px rgba(207,111,152,0.25);
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
.ebc-friend-wrap { margin-bottom: 3px; }

.ebc-friend-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px;
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
    flex: 1;
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
    padding: 1px 7px;
    border-radius: 10px;
    font-family: 'Trebuchet MS', serif;
    font-size: 8px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
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
    padding: 1px 5px;
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
    padding: 1px 6px !important;
    font-size: 8px !important;
    flex-shrink: 0;
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

const VIP_MEMBERS: Record<number, { label: string; color: string; gradient: [string, string] }> = {
    130267: { label: "creator", color: "#f77ec0", gradient: ["#f77ec0", "#40d8c8"] },  // Emery  — pink → turquoise
    143776: { label: "Sin",     color: "#ff9dd0", gradient: ["#ff9dd0", "#d4407a"] },  // Sin    — light pink → hot pink
    124264: { label: "Lara",    color: "#d898f0", gradient: ["#d898f0", "#8840d0"] },  // Lara   — lilac → deep purple
    230466: { label: "Lucy",    color: "#70e0d8", gradient: ["#70e0d8", "#2098a8"] },  // Lucy   — light teal → dark teal
        80: { label: "Sybil",   color: "#98e8a8", gradient: ["#98e8a8", "#30a870"] },  // Sybil  — mint → forest green
};

/** Apply a left-to-right gradient as text fill colour to an element. */
function applyGradientText(el: HTMLElement, from: string, to: string): void {
    el.style.background = `linear-gradient(90deg, ${from}, ${to})`;
    el.style.webkitBackgroundClip = "text";
    el.style.backgroundClip = "text";
    el.style.webkitTextFillColor = "transparent";
    el.style.color = "transparent";
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

type DrawerTab = "outfits" | "buttons" | "anims" | "notes" | "thanks" | "dev" | "dom" | "puppy";

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
    private friendsSectionEl: HTMLElement | null = null;
    private friendPollTick = 0;
    private friendRefreshDebounce: ReturnType<typeof window.setTimeout> | null = null;
    private offlineFriendsCollapsed = true;
    private lastRect = { top: -1, width: -1, height: -1, right: -1 };
    private lastCrabsBottom = -1;
    private crabsPoller: ReturnType<typeof window.setInterval> | null = null;
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
        tab.title = "EBC";
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
        addPointerDown(header, (start, e) => {
            // Don't interfere with button clicks inside the header
            if ((e.target as HTMLElement).closest("button")) return;
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
                    const newX = Math.max(0, Math.min(window.innerWidth  - 50, startPanelX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - 50, startPanelY + dy));
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

        // Puppy tab — Lucy only (member 230466)
        const puppyTabBtn = document.createElement("button");
        puppyTabBtn.className = "ebc-tab-btn";
        puppyTabBtn.id = "ebc-tab-puppy";
        puppyTabBtn.textContent = "🐾";
        puppyTabBtn.title = "Puppy";
        puppyTabBtn.style.display = "none"; // revealed in open() for Lucy only

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(buttonsTabBtn);
        tabBar.appendChild(posesTabBtn);
        tabBar.appendChild(notesTabBtn);
        tabBar.appendChild(thanksTabBtn);
        tabBar.appendChild(devTabBtn2);
        tabBar.appendChild(domTabBtn);
        tabBar.appendChild(puppyTabBtn);

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

        // Safeword permanent row (always visible, any tab)
        const safewordRow = document.createElement("div");
        safewordRow.style.cssText = "display:flex;flex-direction:column;flex-shrink:0;border-top:1px solid #2a1421;background:rgba(12,4,10,0.6);";

        // Header row — one line, always visible
        const swHdr = document.createElement("div");
        swHdr.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;user-select:none;";

        const swIcon = document.createElement("span");
        swIcon.textContent = "🛑";
        swIcon.style.cssText = "font-size:11px;flex-shrink:0;";

        const swLabel = document.createElement("span");
        swLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;letter-spacing:0.05em;flex:1;";
        swLabel.textContent = "SAFEWORDS";

        // Grace active indicator (hidden unless grace is running)
        const swGraceTag = document.createElement("span");
        swGraceTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;padding:1px 5px;border-radius:3px;background:#3a0e1e;color:#cf6f98;border:1px solid #6b2040;flex-shrink:0;display:none;";
        swGraceTag.textContent = "Grace active";

        const swEnableBtn = document.createElement("button");
        const refreshSwEnable = (): void => {
            // Guard: Player.ExtensionSettings may not be ready on first paint
            let on = true;
            try { on = getSafewordConfig().enabled; } catch { /* default ON */ }

            swEnableBtn.textContent = on ? "ON" : "OFF";
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
                cancelBtn.textContent = "End grace";
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
            graceDurUnit.textContent = "min  (0 = indefinite)";
            graceDurRow.appendChild(graceDurLbl);
            graceDurRow.appendChild(graceDurInp);
            graceDurRow.appendChild(graceDurUnit);
            swInner.appendChild(graceDurRow);

            // -- Hint --
            const hint = document.createElement("div");
            hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a6878;line-height:1.45;padding-top:2px;";
            hint.textContent = "Type your word alone (or word!) in chat + Enter to trigger.";
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

        // Footer: version + credit line + live timer
        const footer = document.createElement("div");
        footer.className = "ebc-footer";
        footer.textContent = `EBC v${this.version} · UI inspired by CRABS by Sin`;

        const timerEl = document.createElement("div");
        timerEl.className = "ebc-timer";
        footer.appendChild(timerEl);
        this.timerEl = timerEl;

        panel.appendChild(header);
        panel.appendChild(tabBar);
        panel.appendChild(quickActions);
        panel.appendChild(selfPickPanel);
        panel.appendChild(badgeRow);
        panel.appendChild(safewordRow);
        panel.appendChild(body);
        panel.appendChild(footer);
        slideContainer.appendChild(panel);
        root.appendChild(slideContainer);

        document.body.appendChild(root);
        this.rootEl  = root;
        this.panelEl = slideContainer;

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

            addPointerTracking(
                (pos) => {
                    const dx = pos.clientX - start.clientX;
                    const dy = pos.clientY - start.clientY;
                    if (!dragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
                    dragged = true;
                    tab.style.cursor = "grabbing";
                    if (tab.style.position !== "fixed") tab.style.position = "fixed";
                    const newX = Math.max(0, Math.min(window.innerWidth  - 44, startTabX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - 44, startTabY + dy));
                    tab.style.left = `${newX}px`;
                    tab.style.top  = `${newY}px`;
                },
                () => {
                    tab.style.cursor = "";
                    this.tabDragging = false;
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
        puppyTabBtn.addEventListener("click",    () => this.switchTab("puppy"));

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
    private tickFriendPoll(): void {
        if (this.currentTab !== "notes") { this.friendPollTick = 0; return; }
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

        if (!inRoom) {
            this.rootEl.style.display = "none";
            this.isOpen = false;
            this.panelEl.className = "ebc-closed";
            const tabEl2 = this.rootEl.querySelector<HTMLElement>("#ebc-tab");
            if (tabEl2) tabEl2.classList.add("ebc-tab-closed");
            this.positioned = false;
            this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
            this.tabOffsetChecked = false; // re-check on next room enter in case settings changed
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
        if (tab !== "notes") this.friendsSectionEl = null;
        this.currentTab = tab;
        if (tab === "notes") {
            this.friendPollTick = 0;
            try { ServerSend("AccountQuery", { Query: "OnlineFriends" }); } catch { /* ignore */ }
        }

        for (const [id, name] of [
            ["ebc-tab-outfits", "outfits"],
            ["ebc-tab-buttons", "buttons"],
            ["ebc-tab-poses",   "anims"],
            ["ebc-tab-notes",   "notes"],
            ["ebc-tab-thanks",  "thanks"],
            ["ebc-tab-dev",     "dev"],
            ["ebc-tab-dom",     "dom"],
            ["ebc-tab-puppy",   "puppy"],
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
        else if (this.currentTab === "puppy")    this.renderPuppy();
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

        // ── Default nickname ─────────────────────────────────────────────────────
        const nickRow = document.createElement("div");
        nickRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:8px;";

        const nickLbl = document.createElement("span");
        nickLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5060;flex-shrink:0;";
        nickLbl.textContent = "Default nickname";

        const nickInp = Object.assign(document.createElement("input"), {
            className: "ebc-form-input",
            type: "text",
            value: getDefaultNickname(),
            placeholder: "Your usual nickname",
            maxLength: 40,
        });
        nickInp.style.flex = "1";

        const nickSaveBtn = document.createElement("button");
        nickSaveBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #4c2537;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;";
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

        // ── Tag management ───────────────────────────────────────────────────────────
        const tagMgmtDiv = document.createElement("div");
        tagMgmtDiv.style.marginBottom = "8px";

        let tagMgmtOpen = false;
        const tagToggleBtn = document.createElement("button");
        tagToggleBtn.style.cssText = "width:100%;background:transparent;border:1px dashed #3a1928;border-radius:5px;color:#7a5060;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 0;transition:background 0.14s,color 0.12s;margin-bottom:3px;text-align:left;padding-left:8px;";
        const allTagsNow = getOutfitTags();
        tagToggleBtn.textContent = (tagMgmtOpen ? "▼" : "▶") + ` Tags (${allTagsNow.length} saved)`;

        const tagMgmtBody = document.createElement("div");
        tagMgmtBody.style.display = "none";

        const renderTagMgmt = (): void => {
            while (tagMgmtBody.firstChild) tagMgmtBody.removeChild(tagMgmtBody.firstChild);
            const tags = getOutfitTags();
            tagToggleBtn.textContent = (tagMgmtOpen ? "▼" : "▶") + ` Tags (${tags.length} saved)`;

            // Existing tags list
            for (const tag of tags) {
                const trow = document.createElement("div");
                trow.style.cssText = "display:flex;align-items:center;gap:4px;margin-bottom:3px;";

                const swatch = document.createElement("span");
                swatch.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:3px;background:${tag.color};flex-shrink:0;border:1px solid rgba(255,255,255,0.15);`;

                const nameSpan = document.createElement("span");
                nameSpan.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
                nameSpan.textContent = tag.name;

                // Inline color edit
                const colorInp = document.createElement("input");
                colorInp.type = "color";
                colorInp.value = tag.color;
                colorInp.style.cssText = "width:22px;height:22px;padding:0;border:none;background:transparent;cursor:pointer;flex-shrink:0;";
                colorInp.title = "Change color";
                colorInp.addEventListener("input", () => {
                    updateOutfitTag(tag.id, tag.name, colorInp.value);
                    tag.color = colorInp.value;
                    swatch.style.background = colorInp.value;
                });

                const delTagBtn = document.createElement("button");
                delTagBtn.style.cssText = "background:transparent;border:1px solid #3a1928;border-radius:3px;color:#7a5060;cursor:pointer;font-size:9px;padding:1px 5px;flex-shrink:0;";
                delTagBtn.textContent = "×";
                delTagBtn.title = "Delete tag";
                let delConfirm = false;
                delTagBtn.addEventListener("click", () => {
                    if (!delConfirm) {
                        delConfirm = true;
                        delTagBtn.textContent = "Sure?";
                        delTagBtn.style.color = "#cf6f98";
                        window.setTimeout(() => { delConfirm = false; delTagBtn.textContent = "×"; delTagBtn.style.color = "#7a5060"; }, 2500);
                    } else {
                        deleteOutfitTag(tag.id);
                        this.renderOutfits();
                    }
                });

                trow.appendChild(swatch);
                trow.appendChild(nameSpan);
                trow.appendChild(colorInp);
                trow.appendChild(delTagBtn);
                tagMgmtBody.appendChild(trow);
            }

            if (tags.length === 0) {
                const hint = document.createElement("div");
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#553142;padding:2px 0 4px;";
                hint.textContent = "No tags yet.";
                tagMgmtBody.appendChild(hint);
            }

            // New tag form
            const newTagRow = document.createElement("div");
            newTagRow.style.cssText = "display:flex;align-items:center;gap:4px;margin-top:4px;";

            const newTagInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input",
                type: "text",
                placeholder: "Tag name",
                maxLength: 20,
            });
            newTagInp.style.flex = "1";

            const newTagColor = document.createElement("input");
            newTagColor.type = "color";
            newTagColor.value = "#cf6f98";
            newTagColor.style.cssText = "width:28px;height:28px;padding:0;border:none;background:transparent;cursor:pointer;flex-shrink:0;";
            newTagColor.title = "Pick tag color";

            const addTagBtn = document.createElement("button");
            addTagBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #cf6f98;background:transparent;color:#cf6f98;cursor:pointer;flex-shrink:0;";
            addTagBtn.textContent = "+ Add";
            addTagBtn.addEventListener("click", () => {
                if (!newTagInp.value.trim()) return;
                createOutfitTag(newTagInp.value, newTagColor.value);
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
            renderTagMgmt();
        });

        tagMgmtDiv.appendChild(tagToggleBtn);
        tagMgmtDiv.appendChild(tagMgmtBody);
        body.appendChild(tagMgmtDiv);

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

    private renderPalettes(body: HTMLElement): void {
        const label = document.createElement("div");
        label.className = "ebc-section-label";
        label.style.cssText += "cursor:pointer;user-select:none;";

        const container = document.createElement("div");
        container.style.marginBottom = "6px";

        let collapsed = true;
        let selectedColor: string | null = null;

        // Targeted updaters — assigned inside build(), called without full rebuild
        let updateSelBar:    () => void = () => {};
        let updateSwatchGrid: () => void = () => {};

        // Custom picker handles — refreshed each time build() creates a new widget
        let pickerCleanup: (() => void) | null = null;
        let setPickerHex:  ((hex: string) => void) | null = null;
        // Opens the MY COLOURS picker panel from zone row interactions
        let openPicker:    () => void = () => {};

        // Flash the selected-colour bar to prompt the user to pick a colour first
        const flashSelBar = (): void => {
            const el = container.querySelector<HTMLElement>(".ebc-sel-bar");
            if (!el) return;
            el.style.outline = "1px solid #cf6f98";
            window.setTimeout(() => { el.style.outline = ""; }, 700);
        };

        const build = (): void => {
            // Detach document-level drag listeners from previous picker instance
            pickerCleanup?.(); pickerCleanup = null; setPickerHex = null;
            while (container.firstChild) container.removeChild(container.firstChild);
            if (collapsed) return;

            // ── MY COLOURS ───────────────────────────────────────────────────
            const myColLbl = document.createElement("div");
            myColLbl.className = "ebc-mycolors-label";
            myColLbl.textContent = "MY COLOURS";
            container.appendChild(myColLbl);

            // ── Compact always-visible selected-colour bar ────────────────────
            // Shows current colour + hex, with Edit/Close toggle and Clear button.
            const selBar = document.createElement("div");
            selBar.className = "ebc-sel-bar";

            const selDot = document.createElement("span"); selDot.className = "ebc-sel-dot";
            const selHex = document.createElement("span"); selHex.className = "ebc-sel-hex";
            selHex.style.cssText = "font-family:'Courier New',monospace;font-size:9px;color:#c48aa8;flex-shrink:0;";
            const selHint = document.createElement("span");
            selHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7888;flex:1;";
            selHint.textContent = "No colour selected";

            const editPickerBtn = document.createElement("button");
            editPickerBtn.className = "ebc-wear-btn";
            editPickerBtn.style.cssText = "font-size:8px;padding:1px 7px;flex-shrink:0;";
            editPickerBtn.textContent = "🎨 Colour ▾";

            const clrBtn = document.createElement("button");
            clrBtn.textContent = "x";
            clrBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;padding:1px 6px;border-radius:3px;border:1px solid #3a1928;background:transparent;color:#8a6070;cursor:pointer;flex-shrink:0;display:none;";
            clrBtn.title = "Clear selected colour";
            clrBtn.addEventListener("click", () => {
                selectedColor = null;
                setPickerHex?.("#cf6f98");
                updateSelBar();
                updateSwatchGrid();
                updateLabel();
            });

            selBar.appendChild(selDot);
            selBar.appendChild(selHex);
            selBar.appendChild(selHint);
            selBar.appendChild(editPickerBtn);
            selBar.appendChild(clrBtn);
            container.appendChild(selBar);

            // ── Collapsible picker panel (closed by default) ──────────────────
            const pickerPanel = document.createElement("div");
            pickerPanel.style.cssText = "display:none;flex-direction:column;gap:5px;padding:5px 0 3px;";

            const pickerWidget = this.buildColorPickerWidget(selectedColor ?? "#cf6f98", (hex) => {
                selectedColor = hex;
                updateSelBar();
                updateSwatchGrid();
            });
            const w = pickerWidget as unknown as Record<string, unknown>;
            pickerCleanup = w._cleanup as () => void;
            setPickerHex  = w._setValue as (hex: string) => void;
            pickerPanel.appendChild(pickerWidget);

            const saveColBtn = document.createElement("button");
            saveColBtn.className = "ebc-wear-btn";
            saveColBtn.style.cssText = "width:100%;margin-top:2px;";
            saveColBtn.textContent = "+ Save to My Colours";
            saveColBtn.title = "Save current colour to My Colours";
            saveColBtn.addEventListener("click", () => {
                if (!selectedColor) return;
                addCustomColor(selectedColor);
                updateSwatchGrid();
                updateLabel();
                saveColBtn.textContent = "Saved!";
                window.setTimeout(() => { saveColBtn.textContent = "+ Save to My Colours"; }, 1400);
            });
            pickerPanel.appendChild(saveColBtn);
            container.appendChild(pickerPanel);

            // Toggle picker open/closed
            let pickerOpen = false;
            editPickerBtn.addEventListener("click", () => {
                pickerOpen = !pickerOpen;
                pickerPanel.style.display = pickerOpen ? "flex" : "none";
                editPickerBtn.textContent = pickerOpen ? "▴ Close" : "🎨 Colour ▾";
            });

            // Exposed to zone rows so they can open the picker when no colour is selected
            openPicker = (): void => {
                if (!pickerOpen) {
                    pickerOpen = true;
                    pickerPanel.style.display = "flex";
                    editPickerBtn.textContent = "▴ Close";
                }
            };

            updateSelBar = (): void => {
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
            updateSelBar();

            // ── Saved swatches (always visible) ───────────────────────────────
            const swatchesLbl = document.createElement("div");
            swatchesLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;font-weight:600;color:#8a6070;letter-spacing:0.05em;margin:5px 0 3px;";
            swatchesLbl.textContent = "SAVED COLOURS";
            container.appendChild(swatchesLbl);

            const swatchGrid = document.createElement("div");
            swatchGrid.className = "ebc-swatch-grid";

            updateSwatchGrid = (): void => {
                while (swatchGrid.firstChild) swatchGrid.removeChild(swatchGrid.firstChild);
                const saved = getCustomColors();
                if (!saved.length) {
                    const hint = document.createElement("span");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;";
                    hint.textContent = "None saved yet — open the picker above";
                    swatchGrid.appendChild(hint);
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
                        updateSelBar();
                        updateSwatchGrid();
                    });
                    const rmBtn = document.createElement("span");
                    rmBtn.className = "ebc-cswatch-rm";
                    rmBtn.textContent = "x";
                    rmBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        removeCustomColor(c);
                        if (selectedColor === c) { selectedColor = null; updateSelBar(); }
                        updateSwatchGrid();
                        updateLabel();
                    });
                    sw.addEventListener("mouseenter", () => { rmBtn.style.display = "flex"; });
                    sw.addEventListener("mouseleave", () => { rmBtn.style.display = "none"; });
                    sw.appendChild(rmBtn);
                    swatchGrid.appendChild(sw);
                }
            };
            updateSwatchGrid();
            container.appendChild(swatchGrid);

            // ── Apply to restraint ────────────────────────────────────────────
            const div1 = document.createElement("div");
            div1.className = "ebc-divider"; div1.style.margin = "2px 0 8px";
            container.appendChild(div1);

            const applyLbl = document.createElement("div");
            applyLbl.className = "ebc-import-hint";
            applyLbl.style.cssText = "font-weight:600;margin-bottom:5px;";
            applyLbl.textContent = "APPLY TO RESTRAINT";
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
                // renderPresets() is declared after this loop — forward-declare so
                // the saveBtn inside rebuildZones can reference it via closure.
                let renderPresets: () => void = () => {};

                for (const w of worn) {
                    const wWrap = document.createElement("div");
                    wWrap.style.cssText = "margin-bottom:3px;";

                    // Header row: preview dots · name · All button · arrow
                    const wRow = document.createElement("div");
                    wRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 7px;border-radius:5px;background:#130810;border:1px solid #2a1020;cursor:pointer;";

                    const previewDots = document.createElement("span");
                    previewDots.style.cssText = "display:inline-flex;gap:2px;flex-shrink:0;";
                    const refreshPreview = (): void => {
                        previewDots.innerHTML = "";
                        for (const c of getGroupColors(w.group).slice(0, 8)) {
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
                    wName.textContent = w.name; wName.title = w.name;

                    const allBtn = document.createElement("button");
                    allBtn.className = "ebc-wear-btn";
                    allBtn.style.cssText += "padding:1px 7px;font-size:9px;flex-shrink:0;";
                    allBtn.textContent = "All";
                    allBtn.title = "Apply selected colour to all zones";
                    allBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (!selectedColor) { flashSelBar(); return; }
                        applyColorToGroup(w.group, selectedColor);
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

                    // Zones panel (expandable)
                    const zonesPanel = document.createElement("div");
                    zonesPanel.style.cssText = "display:none;flex-direction:column;gap:2px;padding:5px 7px 6px;background:#0d060c;border:1px solid #2a1020;border-top:none;border-radius:0 0 5px 5px;";

                    const rebuildZones = (): void => {
                        while (zonesPanel.firstChild) zonesPanel.removeChild(zonesPanel.firstChild);
                        const colors    = getGroupColors(w.group);
                        const zoneNames = getGroupZoneNames(w.group);

                        for (let zi = 0; zi < colors.length; zi++) {
                            const zc = colors[zi];
                            const zn = zoneNames[zi] ?? `Zone ${zi + 1}`;
                            const isDefault = !zc || zc === "Default";

                            const zRow = document.createElement("div");
                            zRow.className = "ebc-zone-row";

                            // Colour dot — click to paste selected colour
                            const zDot = document.createElement("span");
                            zDot.className = "ebc-zone-dot";
                            zDot.style.background = isDefault ? "#3a2030" : zc;
                            zDot.title = isDefault ? "Default — click to apply selected" : `${(zc ?? "").toUpperCase()} — click to apply selected`;
                            zDot.addEventListener("click", () => {
                                if (!selectedColor) { flashSelBar(); openPicker(); return; }
                                applyColorZoneToGroup(w.group, zi, selectedColor);
                                zDot.style.background = selectedColor;
                                zHex.textContent = selectedColor.toUpperCase();
                                zDot.title = selectedColor.toUpperCase();
                                refreshPreview();
                            });

                            // Hex readout
                            const zHex = document.createElement("span");
                            zHex.className = "ebc-zone-hex";
                            zHex.textContent = isDefault ? "Default" : (zc ?? "").toUpperCase();

                            // Zone name
                            const zLabel = document.createElement("span");
                            zLabel.className = "ebc-zone-label";
                            zLabel.textContent = zn;

                            // Set button — applies selected colour from MY COLOURS
                            const zSetBtn = document.createElement("button");
                            zSetBtn.className = "ebc-wear-btn ebc-zone-set";
                            zSetBtn.textContent = "Set";
                            zSetBtn.title = "Apply selected colour to this zone";
                            zSetBtn.addEventListener("click", () => {
                                if (!selectedColor) { flashSelBar(); openPicker(); return; }
                                applyColorZoneToGroup(w.group, zi, selectedColor);
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

                        // Save as preset footer
                        const saveRow = document.createElement("div");
                        saveRow.style.cssText = "display:flex;align-items:center;gap:5px;margin-top:5px;border-top:1px solid #2a1020;padding-top:5px;";
                        const saveInp = document.createElement("input");
                        saveInp.type = "text"; saveInp.placeholder = "Preset name…";
                        saveInp.maxLength = 30; saveInp.className = "ebc-form-input";
                        saveInp.style.fontSize = "9px";
                        const saveBtn = document.createElement("button");
                        saveBtn.className = "ebc-wear-btn";
                        saveBtn.style.cssText += "padding:1px 7px;font-size:9px;flex-shrink:0;";
                        saveBtn.textContent = "+ Preset";
                        saveBtn.title = "Save current zone colours as a named preset";
                        saveBtn.addEventListener("click", () => {
                            const name = saveInp.value.trim();
                            if (!name) { saveInp.style.borderColor = "#cf6f98"; return; }
                            saveInp.style.borderColor = "";
                            saveRestraintPreset(name, getGroupColors(w.group));
                            saveInp.value = "";
                            renderPresets();
                            saveBtn.textContent = "✓ Saved";
                            window.setTimeout(() => { saveBtn.textContent = "+ Preset"; }, 1400);
                        });
                        saveRow.appendChild(saveInp); saveRow.appendChild(saveBtn);
                        zonesPanel.appendChild(saveRow);
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

                // ── Restraint colour presets ──────────────────────────────────
                const div3 = document.createElement("div");
                div3.className = "ebc-divider"; div3.style.margin = "8px 0 4px";
                container.appendChild(div3);

                const presetsLbl = document.createElement("div");
                presetsLbl.className = "ebc-import-hint";
                presetsLbl.style.cssText = "font-weight:600;margin-bottom:3px;";
                presetsLbl.textContent = "RESTRAINT PRESETS";
                container.appendChild(presetsLbl);

                const presetsHint = document.createElement("div");
                presetsHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;margin-bottom:6px;";
                presetsHint.textContent = "Save presets using + Preset inside any restraint's zone panel, then apply them here.";
                container.appendChild(presetsHint);

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
                        const phOpt = document.createElement("option");
                        phOpt.value = ""; phOpt.textContent = "— pick —";
                        applyToSel.appendChild(phOpt);
                        for (const w of worn) {
                            const opt = document.createElement("option");
                            opt.value = w.group; opt.textContent = w.name;
                            applyToSel.appendChild(opt);
                        }

                        const applyBtn = document.createElement("button");
                        applyBtn.className = "ebc-wear-btn";
                        applyBtn.style.cssText += "padding:1px 6px;font-size:9px;flex-shrink:0;";
                        applyBtn.textContent = "Apply";
                        applyBtn.addEventListener("click", () => {
                            const group = applyToSel.value;
                            if (!group) { applyToSel.style.borderColor = "#cf6f98"; return; }
                            applyToSel.style.borderColor = "";
                            applyColorsToGroup(group, preset.colors);
                            build(); // rebuild to refresh all zone previews
                            applyBtn.textContent = "✓";
                            window.setTimeout(() => { applyBtn.textContent = "Apply"; }, 1400);
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
            }

            // ── Saved palettes (collapsed toggle, secondary) ──────────────────
            const div2 = document.createElement("div");
            div2.className = "ebc-divider"; div2.style.margin = "10px 0 4px";
            container.appendChild(div2);

            let palCollapsed = true;
            const palToggle = document.createElement("div");
            palToggle.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#6a4a5a;cursor:pointer;user-select:none;padding:2px 0 4px;";
            palToggle.textContent = "▶ Saved palettes (capture & apply full looks)";
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
                    const ab = document.createElement("button"); ab.className = "ebc-wear-btn"; ab.textContent = "Apply";
                    ab.addEventListener("click", () => { applyPalette(p.id); ab.textContent = "Done!"; window.setTimeout(() => { ab.textContent = "Apply"; }, 1200); });
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

                const oLbl = document.createElement("div"); oLbl.className = "ebc-import-hint"; oLbl.style.cssText = "font-weight:600;margin-bottom:3px;margin-top:2px;"; oLbl.textContent = "OUTFIT"; palContainer.appendChild(oLbl);
                const ops = getPalettesByType("outfit");
                for (const p of ops) palContainer.appendChild(buildPRow(p, renderPal));
                if (!ops.length) { const n = document.createElement("div"); n.className = "ebc-empty"; n.style.padding = "2px 4px 4px"; n.textContent = "No outfit palettes saved"; palContainer.appendChild(n); }
                palContainer.appendChild(buildSRow("Palette name…", "Save Outfit", n => captureCurrentPalette(n || "Palette"), renderPal));

                const pd = document.createElement("div"); pd.className = "ebc-divider"; pd.style.margin = "8px 0 4px"; palContainer.appendChild(pd);
                const rLbl = document.createElement("div"); rLbl.className = "ebc-import-hint"; rLbl.style.cssText = "font-weight:600;margin-bottom:3px;"; rLbl.textContent = "RESTRAINTS ⛓"; palContainer.appendChild(rLbl);
                const rps = getPalettesByType("restraint");
                for (const p of rps) palContainer.appendChild(buildPRow(p, renderPal));
                if (!rps.length) { const n = document.createElement("div"); n.className = "ebc-empty"; n.style.padding = "2px 4px 4px"; n.textContent = "No restraint palettes saved"; palContainer.appendChild(n); }
                palContainer.appendChild(buildSRow("Restraint palette name…", "Save Restraints", n => captureRestraintPalette(n || "Restraint Palette"), renderPal));
            };

            palToggle.addEventListener("click", () => {
                palCollapsed = !palCollapsed;
                palToggle.textContent = (palCollapsed ? "▶" : "▼") + " Saved palettes (capture & apply full looks)";
                renderPal();
            });
            container.appendChild(palToggle);
            container.appendChild(palContainer);
        };

        const updateLabel = (): void => {
            const cc = getCustomColors().length;
            label.textContent = (collapsed ? "▶" : "▼") + ` COLOURS${cc > 0 ? ` (${cc} saved)` : ""}`;
        };

        label.addEventListener("click", () => { collapsed = !collapsed; updateLabel(); build(); });
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

        // Reorder column
        const outfitsList = getOutfits();
        const thisIdx = outfitsList.findIndex(x => x.id === o.id);
        const reorderCol = document.createElement("div");
        reorderCol.className = "ebc-reorder-col";
        const upBtn = document.createElement("button");
        upBtn.className = "ebc-reorder-btn";
        upBtn.textContent = "▲";
        upBtn.title = "Move up";
        upBtn.disabled = thisIdx <= 0;
        upBtn.addEventListener("click", () => { moveOutfit(o.id, "up"); this.renderOutfits(); });
        const downBtn = document.createElement("button");
        downBtn.className = "ebc-reorder-btn";
        downBtn.textContent = "▼";
        downBtn.title = "Move down";
        downBtn.disabled = thisIdx >= outfitsList.length - 1;
        downBtn.addEventListener("click", () => { moveOutfit(o.id, "down"); this.renderOutfits(); });
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
        const eNicknameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", value: o.nickname ?? "", maxLength: 40,
            placeholder: "Optional — blank = no change",
        });

        editPanel.appendChild(makeEditRow("Command", eCmdInput));
        editPanel.appendChild(makeEditRow("Name", eNameInput));
        editPanel.appendChild(makeEditRow("Announce", eAnnounceInput));
        editPanel.appendChild(makeEditRow("Nickname", eNicknameInput));

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
                hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#553142;";
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
                eNicknameInput.value,
            );
            if (ok) this.renderOutfits();
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
        const nicknameInput = Object.assign(document.createElement("input"), {
            className: "ebc-form-input", type: "text", placeholder: "Optional — blank = no change", maxLength: 40,
        });

        form.appendChild(makeRow("Command", cmdInput));
        form.appendChild(makeRow("Name", nameInput));
        form.appendChild(makeRow("Announce", announceInput));
        form.appendChild(makeRow("Nickname", nicknameInput));

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
                false, nicknameInput.value,
            );
            if (result) {
                cmdInput.value = "";
                nameInput.value = "";
                announceInput.value = "";
                nicknameInput.value = "";
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
                    doneBtn.textContent = "✓ Done";
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

                topLine.appendChild(toggle);
                topLine.appendChild(labelInp);
                topLine.appendChild(colorWrap);
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
            addBtn.textContent = "+ Add Step";
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
                    this.renderPoses();
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
                this.renderPoses();
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

        // Called whenever online friend status refreshes (AccountQueryResult)
        const updateStatus = (): void => {
            const s = getFriendStatus(memberNumber);
            dot.className = "ebc-friend-dot " + s;
            title.textContent = resolveName(memberNumber);
        };
        (win as unknown as Record<string, unknown>)._updateStatus = updateStatus;

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
                try { this.refreshFriendList(); } catch { /* ignore */ }
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
        header.appendChild(suppressBtn);
        header.appendChild(minimizeBtn);
        header.appendChild(closeBtn);
        win.appendChild(header);

        // Make header draggable — anchored by bottom so expanding grows upward.
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
                    win.style.left   = `${pos.clientX - ox}px`;
                    win.style.bottom = `${vh - pos.clientY - oyFromBottom}px`;
                    win.style.right  = "";
                    win.style.top    = "";
                },
                () => { /* nothing needed on release */ },
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

                const nameLabel = document.createElement("div");
                nameLabel.textContent = resolveName(isSent ? self : e.from);
                const nameColor = isSent ? "#e090b8" : "#80c0e0";
                nameLabel.style.cssText = `font-family:'Trebuchet MS',serif;font-size:10px;font-weight:600;color:${nameColor};margin-bottom:2px;padding:0 3px;`;
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
                    replyBtn.textContent = "↩ reply";
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
                try { this.renderNotes(); } catch { /* ignore */ }
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
            lblFText.textContent = "Friends";
            const lblFCount = document.createElement("span");
            lblFCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:normal;flex:1;";
            lblFCount.textContent = `${onlineCount} online · ${friendList.length} total`;

            lblF.appendChild(lblFText);
            lblF.appendChild(lblFCount);
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

            // Shared tooltip element (reused across all rows)
            let activeTooltip: HTMLElement | null = null;
            const hideTooltip = (): void => { activeTooltip?.remove(); activeTooltip = null; };

            // Container for offline friends (shown/hidden by toggle)
            const offlineContainer = document.createElement("div");

            const buildFriendRow = (num: number, container: HTMLElement): void => {
                const status = getFriendStatus(num);
                const name   = resolveName(num);
                const pinned = isFriendPinned(num);

                // Wrapper holds both the row and the expand panel
                const wrap = document.createElement("div");
                wrap.className = "ebc-friend-wrap";

                // ── Row ────────────────────────────────────────────────────
                const row = document.createElement("div");
                row.className = "ebc-friend-row" + (pinned ? " pinned" : "");

                const dot = document.createElement("div");
                dot.className = "ebc-friend-dot " + status;

                const pinDot = document.createElement("span");
                pinDot.textContent = "📌";
                pinDot.style.cssText = "font-size:9px;flex-shrink:0;line-height:1;" + (pinned ? "" : "display:none;");

                const nameEl = document.createElement("span");
                nameEl.className = "ebc-friend-name";
                nameEl.textContent = name;
                const vipFriend = VIP_MEMBERS[num];
                if (vipFriend) applyGradientText(nameEl, vipFriend.gradient[0], vipFriend.gradient[1]);

                const numEl = document.createElement("span");
                numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a9ab8;flex-shrink:0;";
                numEl.textContent = "#" + num;

                // Room info tag
                const info = status !== "away" ? getFriendOnlineInfo(num) : undefined;
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
                    const roomTag = document.createElement("span");
                    roomTag.textContent = icon + " " + label;
                    roomTag.title = roomName
                        ? roomName + (isPrivate ? " (private)" : " (public)") + (isFull ? " · full" : "")
                        : isLocked ? "In a locked room" : isPrivate ? "In a private room" : "Online";
                    roomTag.style.cssText = `font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 4px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;background:${bg};color:${color};border:1px solid ${border};`;
                    row.appendChild(dot);
                    row.appendChild(pinDot);
                    row.appendChild(nameEl);
                    row.appendChild(numEl);
                    row.appendChild(roomTag);
                } else {
                    row.appendChild(dot);
                    row.appendChild(pinDot);
                    row.appendChild(nameEl);
                    row.appendChild(numEl);
                }

                // EBC badge
                const ebcVer = (() => {
                    try {
                        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                            Array<{ MemberNumber?: number; OnlineSharedSettings?: Record<string, unknown> }> | undefined;
                        const char = room?.find(c => c.MemberNumber === num);
                        if (char?.OnlineSharedSettings) {
                            const sh = char.OnlineSharedSettings["EmeryBC"];
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
                if (ebcVer) {
                    const ebcBadge = document.createElement("span");
                    ebcBadge.textContent = "EBC " + ebcVer;
                    ebcBadge.title = "Uses EmeryBC v" + ebcVer;
                    ebcBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap;background:#2a0e1e;color:#cf6f98;border:1px solid #6b3048;";
                    row.appendChild(ebcBadge);
                }

                // ── Tag display area (first tag + "+N more", hover = tooltip) ──
                const tagArea = document.createElement("span");
                tagArea.style.cssText = "display:inline-flex;align-items:center;gap:3px;flex-shrink:0;";

                const renderTagArea = (): void => {
                    tagArea.innerHTML = "";
                    const tl = getFriendTagList(num);
                    if (!tl.length) return;
                    // First tag pill
                    const first = tl[0];
                    const pill = document.createElement("span");
                    pill.className = "ebc-friend-tag";
                    pill.textContent = first.text;
                    pill.style.cssText = `background:${first.color}22;color:${first.color};border:1px solid ${first.color}55;`;
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
                        chip.style.cssText = `background:${t.color}22;color:${t.color};border:1px solid ${t.color}55;`;
                        tt.appendChild(chip);
                    }
                    document.body.appendChild(tt);
                    activeTooltip = tt;
                    const rect = tagArea.getBoundingClientRect();
                    const ttW = tt.offsetWidth || 160;
                    let left = rect.left;
                    if (left + ttW > window.innerWidth - 8) left = window.innerWidth - ttW - 8;
                    const top = rect.bottom + 4;
                    tt.style.left = `${left}px`;
                    tt.style.top = `${top}px`;
                });
                tagArea.addEventListener("mouseleave", hideTooltip);

                if (getFriendTagList(num).length > 0) row.appendChild(tagArea);

                // Beep button — does NOT toggle expand
                const unread = this.beepUnread.get(num) ?? 0;
                const beepBtn = document.createElement("button");
                beepBtn.className = "ebc-friend-btn";
                beepBtn.style.cssText = "position:relative;margin-left:auto;flex-shrink:0;";
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
                row.appendChild(beepBtn);

                // ── Expand panel (lazy — DOM built on first click) ─────────
                const expand = document.createElement("div");
                expand.className = "ebc-friend-expand";

                let expandBuilt = false;
                let newTagInputRef: HTMLInputElement | null = null;

                const buildExpandPanel = (): void => {
                    if (expandBuilt) return;
                    expandBuilt = true;

                    // Tags label
                    const tagsLbl = document.createElement("div");
                    tagsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:1px;";
                    tagsLbl.textContent = "Tags";
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
                                if (updated.length > 0) { if (!row.contains(tagArea)) row.insertBefore(tagArea, beepBtn); }
                                else tagArea.remove();
                            });
                            chip.appendChild(dot2);
                            chip.appendChild(txt);
                            chip.appendChild(rmBtn);
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
                    newTagInput.placeholder = "new tag…";
                    newTagInput.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;background:#130810;color:#e8b4c8;border:1px solid #3a1928;border-radius:4px;padding:2px 6px;outline:none;min-width:0;";
                    newTagInput.addEventListener("focus", () => { newTagInput.style.borderColor = "#cf6f98"; });
                    newTagInput.addEventListener("blur",  () => { newTagInput.style.borderColor = "#3a1928"; });

                    const addTagBtn = document.createElement("button");
                    addTagBtn.textContent = "+ Add";
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
                        if (!row.contains(tagArea)) row.insertBefore(tagArea, beepBtn);
                    };
                    addTagBtn.addEventListener("click", doAddTag);
                    newTagInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doAddTag(); } });

                    // Pin button
                    const actRow = document.createElement("div");
                    actRow.style.cssText = "display:flex;gap:5px;margin-top:2px;";
                    const pinBtn = document.createElement("button");
                    const refreshPinBtn = (): void => {
                        const p = isFriendPinned(num);
                        pinBtn.textContent = p ? "📌 Unpin" : "📌 Pin to top";
                        pinBtn.style.cssText = `font-family:'Trebuchet MS',serif;font-size:9px;padding:3px 8px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid ${p ? "#cf6f98" : "#3a1928"};background:${p ? "#3a1028" : "transparent"};color:${p ? "#cf6f98" : "#7a5a6a"};`;
                        row.classList.toggle("pinned", p);
                        pinDot.style.display = p ? "" : "none";
                    };
                    refreshPinBtn();
                    pinBtn.addEventListener("click", () => { togglePinFriend(num); refreshPinBtn(); });
                    actRow.appendChild(pinBtn);
                    expand.appendChild(actRow);
                };

                // Toggle expand on row click — build panel on first open
                row.addEventListener("click", () => {
                    buildExpandPanel();
                    const open = expand.classList.toggle("visible");
                    row.classList.toggle("expanded", open);
                    if (open) window.setTimeout(() => newTagInputRef?.focus(), 50);
                });

                wrap.appendChild(row);
                wrap.appendChild(expand);
                container.appendChild(wrap);
            };

            // Render active friends
            for (const num of activeFriends) buildFriendRow(num, body);

            // Offline toggle header + collapsible section
            if (offlineFriends.length > 0) {
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
            const found: Array<{ gameName: string; nickname: string; id: number; version: string; isSelf: boolean }> = [];

            for (const c of room) {
                const memberNum = c.MemberNumber as number | undefined;
                const isSelf = memberNum === Player.MemberNumber;
                const gameName = String(c.Name ?? "?");
                const nickname = String((c.Nickname as string | undefined)?.trim() || gameName);
                if (isSelf) {
                    found.push({ gameName, nickname, id: memberNum ?? 0, version: "self", isSelf: true });
                    continue;
                }
                const shared = (c.OnlineSharedSettings as Record<string, unknown> | undefined)?.["EmeryBC"] as Record<string, unknown> | undefined;
                const presence = shared?.["presence"] as Record<string, unknown> | undefined;
                if (presence?.["marker"] === "EBC") {
                    found.push({ gameName, nickname, id: memberNum ?? 0, version: String(presence["version"] ?? "?"), isSelf: false });
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

                // Name block: "Nickname - (GameName)" when they differ, else just the name
                const nameWrap = document.createElement("span");
                nameWrap.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;";

                const nicknameEl = document.createElement("span");
                nicknameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

                if (p.isSelf) {
                    nicknameEl.textContent = p.nickname !== p.gameName ? p.nickname : p.gameName;
                } else {
                    nicknameEl.textContent = p.nickname !== p.gameName ? p.nickname : p.gameName;
                }

                nameWrap.appendChild(nicknameEl);

                // Show "(GameName)" sub-line when nickname differs from game name
                if (p.nickname !== p.gameName) {
                    const gameNameEl = document.createElement("span");
                    gameNameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#9a7888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                    gameNameEl.textContent = "(" + p.gameName + ")";
                    nameWrap.appendChild(gameNameEl);
                }

                const idEl = document.createElement("span");
                idEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;flex-shrink:0;";
                idEl.textContent = "#" + p.id;

                const verEl = document.createElement("span");
                verEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;flex-shrink:0;" +
                    (p.isSelf ? "color:#7a5a6a;background:#1b0d17;border:1px solid #3a1928;" : "color:#cf6f98;background:#2a1421;border:1px solid #6b3048;");
                verEl.textContent = p.isSelf ? "you" : ("v" + p.version);

                row.appendChild(nameWrap);
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

        // ── Addons Loaded ────────────────────────────────────────────────────────
        const hookLbl = document.createElement("div");
        hookLbl.className = "ebc-section-label";
        hookLbl.style.marginTop = "12px";
        hookLbl.textContent = "Addons Loaded";
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

                    topLine.appendChild(nameEl);
                    topLine.appendChild(verEl);
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
        hookRefreshBtn.textContent = "↻ Refresh";
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
        const getCustomBarks = (): string[] => {
            const raw = getPuppyStore().customBarks;
            return Array.isArray(raw) ? (raw as string[]) : [];
        };
        const saveCustomBarks = (barks: string[]): void => {
            getPuppyStore().customBarks = barks;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        };
        const getAllBarks = (): string[] => [...BUILTIN_BARKS, ...getCustomBarks()];

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
        barkBtn.textContent = "🐶 Bark!";
        barkBtn.addEventListener("mouseenter", () => { barkBtn.style.background = "#5a30a0"; });
        barkBtn.addEventListener("mouseleave", () => { barkBtn.style.background = "#3a2060"; });
        barkBtn.addEventListener("mousedown", () => { barkBtn.style.transform = "scale(0.95)"; });
        barkBtn.addEventListener("mouseup",   () => { barkBtn.style.transform = ""; });
        barkBtn.addEventListener("click", () => {
            const pool = getAllBarks();
            const bark = pool[Math.floor(Math.random() * pool.length)];
            try { ServerSend("ChatRoomChat", { Type: "Chat", Content: bark }); } catch { /* ignore */ }
            barkBtn.style.background = "#7a40c8";
            barkBtn.textContent = "🐶 " + bark;
            window.setTimeout(() => {
                barkBtn.style.background = "#3a2060";
                barkBtn.textContent = "🐶 Bark!";
            }, 700);
        });
        body.appendChild(barkBtn);

        // -- Custom barks section --
        const customLbl = document.createElement("div");
        customLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a7ab0;text-transform:uppercase;letter-spacing:0.05em;margin:18px 8px 5px;";
        customLbl.textContent = "Custom Sounds";
        body.appendChild(customLbl);

        const customList = document.createElement("div");
        customList.style.cssText = "display:flex;flex-direction:column;gap:3px;margin:0 8px;";
        body.appendChild(customList);

        const rebuildCustomList = (): void => {
            while (customList.firstChild) customList.removeChild(customList.firstChild);
            const barks = getCustomBarks();
            if (barks.length === 0) {
                const none = document.createElement("div");
                none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#6a5880;padding:2px 0;";
                none.textContent = "No custom sounds yet.";
                customList.appendChild(none);
                return;
            }
            for (let i = 0; i < barks.length; i++) {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:5px;background:rgba(58,32,96,0.4);border:1px solid #5a3a90;border-radius:5px;padding:3px 7px;";
                const txt = document.createElement("span");
                txt.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#d8c8ff;";
                txt.textContent = barks[i];
                const del = document.createElement("button");
                del.textContent = "×";
                del.title = "Remove";
                del.style.cssText = "background:none;border:none;cursor:pointer;color:#9b7de0;font-size:13px;line-height:1;padding:0;flex-shrink:0;";
                del.addEventListener("click", () => {
                    const updated = getCustomBarks().filter((_, j) => j !== i);
                    saveCustomBarks(updated);
                    rebuildCustomList();
                });
                row.appendChild(txt);
                row.appendChild(del);
                customList.appendChild(row);
            }
        };
        rebuildCustomList();

        // Add new custom sound
        const addRow = document.createElement("div");
        addRow.style.cssText = "display:flex;gap:5px;margin:6px 8px 0;";
        const addInp = document.createElement("input");
        addInp.type = "text";
        addInp.maxLength = 60;
        addInp.placeholder = "e.g. Woof woof~";
        addInp.className = "ebc-form-input";
        addInp.style.cssText = "flex:1;font-size:10px;";
        const addBtn = document.createElement("button");
        addBtn.textContent = "+ Add";
        addBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid #9b7de0;background:#3a2060;color:#d8c8ff;cursor:pointer;flex-shrink:0;transition:background 0.12s;";
        addBtn.addEventListener("mouseenter", () => { addBtn.style.background = "#5a30a0"; });
        addBtn.addEventListener("mouseleave", () => { addBtn.style.background = "#3a2060"; });
        const doAdd = (): void => {
            const val = addInp.value.trim();
            if (!val) return;
            saveCustomBarks([...getCustomBarks(), val]);
            addInp.value = "";
            rebuildCustomList();
        };
        addBtn.addEventListener("click", doAdd);
        addInp.addEventListener("keydown", (e) => { if (e.key === "Enter") doAdd(); });
        addRow.appendChild(addInp);
        addRow.appendChild(addBtn);
        body.appendChild(addRow);
    }

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
        intro.textContent = "People who made EBC possible. ";
        const introSub = document.createElement("span");
        introSub.style.cssText = "font-size:9px;color:#6a4a5e;font-family:'Trebuchet MS',serif;";
        introSub.textContent = "EmeryBC";
        intro.appendChild(introSub);
        body.appendChild(intro);

        const people = [
            {
                emoji: "🌺",
                name: "Emery",
                memberId: 130267,
                reason: "Creator of EBC — every line of code, every feature, every late night pushing updates. This whole thing is hers.",
                heart: "🎀",
            },
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
                reason: "Lost count of the hours a long time ago — what started as one very long late night turned into something much bigger, and she was there for all of it. Every idea, every problem, every version of this thing. She made it genuinely fun to build.",
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
            const vipCredit = VIP_MEMBERS[p.memberId];
            if (vipCredit) applyGradientText(namEl, vipCredit.gradient[0], vipCredit.gradient[1]);

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
            rescueStatus.textContent = count > 0 ? `✓ Removed ${count} item(s).` : "Nothing removed.";
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
                rescueStatus.textContent = "⚠ That person is no longer in the room.";
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
        try { this.refreshBadgeRow?.(); } catch { /* ignore */ }
        // Show the DOM tab only for the creator
        const domTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-dom");
        if (domTabEl) domTabEl.style.display = isDomEnabled() ? "" : "none";
        // Show the Puppy tab only for Lucy (#230466)
        const puppyTabEl = this.rootEl?.querySelector<HTMLElement>("#ebc-tab-puppy");
        if (puppyTabEl) puppyTabEl.style.display = Player.MemberNumber === 230466 ? "" : "none";
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
