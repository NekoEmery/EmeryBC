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
    setOutfitPreserveRestraints,
    RESTRAINT_GROUPS,
    type ConfiguredOutfit,
    type SerializedItem,
} from "./outfitManager";
import { getNotes, saveNote, type CharacterNote } from "./notes";
import {
    getButtons,
    getSlotCount,
    saveButtons,
    normalizeHex,
    DEFAULT_BUTTONS,
    ABSOLUTE_MAX,
    type ActionButton,
    type ActionStyle,
} from "./actionButtons";
import { releaseRestraints, unlockItems } from "./restraints";
import { getBadgeEnabled, setBadgeEnabled } from "./settings";

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
    cursor: pointer;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.5);
    position: absolute;
    left: -44px;
    top: 58px;
    transition: background 0.18s;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }

/* Sliding panel - only this element transforms, not the tab */
#emerybc-panel {
    position: absolute;
    right: 44px;   /* leave the 44px tab strip uncovered — tab is to our right */
    top: 0;
    width: 300px;
    height: 100%;  /* full chat log height — no vertical conflict with tab */
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

/* +60px extra so the panel clears the 44px tab offset when closed */
#emerybc-panel.ebc-closed { transform: translateX(calc(100% + 60px)); }
#emerybc-panel.ebc-open   { transform: translateX(0); pointer-events: auto; }

.ebc-panel {
    pointer-events: auto;
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
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.06em;
    padding: 6px 0;
    transition: color 0.14s, border-color 0.14s;
}

.ebc-tab-btn:hover { color: #967281; }
.ebc-tab-btn.ebc-tab-active { color: #cf6f98; border-bottom-color: #cf6f98; }

/* -- Body -- */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 7px;
    scrollbar-width: thin;
    scrollbar-color: #4c2537 transparent;
}

.ebc-body::-webkit-scrollbar { width: 4px; }
.ebc-body::-webkit-scrollbar-track { background: transparent; }
.ebc-body::-webkit-scrollbar-thumb { background: #4c2537; border-radius: 2px; }

/* -- Section label -- */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #553142;
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

.ebc-preserve-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    padding: 2px 5px;
    line-height: 1;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-preserve-btn.on  { border-color: #7a4a5e; color: #cf6f98; }
.ebc-preserve-btn:hover { background: #3a1928; border-color: #7a4a5e; color: #cf6f98; }

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
    border-top: 1px solid #2a1421;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #2a1421;
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
    color: #7a4a5e;
    text-align: center;
    padding: 6px 4px 10px;
    line-height: 1.6;
}
`;

// -- Class ---------------------------------------------------------------------

type DrawerTab = "outfits" | "buttons" | "notes" | "thanks";

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
    private lastRect = { top: -1, width: -1, height: -1, right: -1 };
    private lastCrabsBottom = -1;
    private crabsPoller: ReturnType<typeof window.setInterval> | null = null;

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

        // Tab button - child of root, OUTSIDE the sliding panel so it never moves
        const tab = document.createElement("div");
        tab.id = "ebc-tab";
        tab.title = "EmeryBC";
        tab.innerHTML = TAB_ICON;
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

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-icon-btn";
        closeBtn.title = "Close";
        closeBtn.textContent = "X";

        headerBtns.appendChild(refreshBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);

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

        const notesTabBtn = document.createElement("button");
        notesTabBtn.className = "ebc-tab-btn";
        notesTabBtn.id = "ebc-tab-notes";
        notesTabBtn.textContent = "NOTES";

        const thanksTabBtn = document.createElement("button");
        thanksTabBtn.className = "ebc-tab-btn";
        thanksTabBtn.id = "ebc-tab-thanks";
        thanksTabBtn.textContent = "CREDITS";
        thanksTabBtn.title = "Special Thanks";

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(buttonsTabBtn);
        tabBar.appendChild(notesTabBtn);
        tabBar.appendChild(thanksTabBtn);

        // Quick actions bar (always visible below tabs)
        const quickActions = document.createElement("div");
        quickActions.className = "ebc-quick-actions";

        const releaseBtn = document.createElement("button");
        releaseBtn.className = "ebc-action-btn danger";
        releaseBtn.title = "Remove all restraints (skips owner/lover/family locks)";
        releaseBtn.textContent = "Release Restraints";

        const unlockBtn = document.createElement("button");
        unlockBtn.className = "ebc-action-btn danger";
        unlockBtn.title = "Remove all locks (skips owner/lover/family locks)";
        unlockBtn.textContent = "Remove Locks";

        quickActions.appendChild(releaseBtn);
        quickActions.appendChild(unlockBtn);

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

        // Footer
        const footer = document.createElement("div");
        footer.className = "ebc-footer";
        footer.textContent = "UI inspired by CRABS by Sin";

        panel.appendChild(header);
        panel.appendChild(tabBar);
        panel.appendChild(quickActions);
        panel.appendChild(badgeRow);
        panel.appendChild(body);
        panel.appendChild(footer);
        slideContainer.appendChild(panel);
        root.appendChild(slideContainer);

        document.body.appendChild(root);
        this.rootEl  = root;
        this.panelEl = slideContainer;

        // Events
        tab.addEventListener("click", () => this.toggle());
        closeBtn.addEventListener("click", () => this.close());
        refreshBtn.addEventListener("click", () => {
            refreshBtn.classList.add("spinning");
            refreshBtn.addEventListener("animationend", () => refreshBtn.classList.remove("spinning"), { once: true });
            this.renderCurrentTab();
        });

        releaseBtn.addEventListener("click", () => {
            releaseBtn.disabled = true;
            releaseRestraints();
            window.setTimeout(() => { releaseBtn.disabled = false; }, 1500);
        });

        unlockBtn.addEventListener("click", () => {
            unlockBtn.disabled = true;
            unlockItems();
            window.setTimeout(() => { unlockBtn.disabled = false; }, 1500);
        });

        outfitTabBtn.addEventListener("click",   () => this.switchTab("outfits"));
        buttonsTabBtn.addEventListener("click",  () => this.switchTab("buttons"));
        notesTabBtn.addEventListener("click",    () => this.switchTab("notes"));
        thanksTabBtn.addEventListener("click",   () => this.switchTab("thanks"));

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
            this.rootEl.style.top    = `${rect.top}px`;
            this.rootEl.style.right  = `${rightOffset}px`;
            this.rootEl.style.height = `${rect.height * 1.5}px`;
            this.lastRect = { top: rect.top, width: rect.width, height: rect.height, right: rightOffset };
            this.positioned = true;
            // Chat log moved — force a fresh CRABS position read next tick
            this.lastCrabsBottom = -1;
        }

        // Do an immediate CRABS position read (poller may not have fired yet).
        this.updateCrabsPosition();

        return true;
    }

    // Reads CRABS's #drawer-tab position and updates our tab's top accordingly.
    // Safe to call at any frequency — writes the DOM only when the value changes.
    private updateCrabsPosition(): void {
        if (!this.rootEl || !this.positioned) return;
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
            this.positioned = false;
            this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            this.stopCrabsPoller();
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
    }

    // -- Tab switching ---------------------------------------------------------

    private switchTab(tab: DrawerTab): void {
        this.currentTab = tab;

        for (const [id, name] of [
            ["ebc-tab-outfits", "outfits"],
            ["ebc-tab-buttons", "buttons"],
            ["ebc-tab-notes",   "notes"],
            ["ebc-tab-thanks",  "thanks"],
        ] as [string, DrawerTab][]) {
            const el = this.rootEl?.querySelector(`#${id}`);
            if (el) el.className = "ebc-tab-btn" + (tab === name ? " ebc-tab-active" : "");
        }

        this.renderCurrentTab();
    }

    private renderCurrentTab(): void {
        if      (this.currentTab === "outfits")  this.renderOutfits();
        else if (this.currentTab === "buttons")  this.renderButtons();
        else if (this.currentTab === "notes")    this.renderNotes();
        else if (this.currentTab === "thanks")   this.renderThanks();
    }

    // -- Outfits tab -----------------------------------------------------------

    private renderOutfits(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const outfits = getOutfits();

        if (outfits.length > 0) {
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "Saved Outfits";
            body.appendChild(lbl);

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

        info.appendChild(nameEl);
        info.appendChild(cmdEl);

        const isPreserving = o.preserveRestraints !== false;

        const preserveBtn = document.createElement("button");
        preserveBtn.className = "ebc-preserve-btn" + (isPreserving ? " on" : "");
        preserveBtn.textContent = isPreserving ? "🔒" : "🔓";
        preserveBtn.title = isPreserving
            ? "Keeps existing restraints when worn — click to change"
            : "Removes existing restraints when worn — click to change";

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
        row.appendChild(preserveBtn);
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

        const eSaveBtn = document.createElement("button");
        eSaveBtn.className = "ebc-create-btn";
        eSaveBtn.textContent = "Save Changes";
        editPanel.appendChild(eSaveBtn);

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
            const nowPreserving = preserveBtn.classList.contains("on");
            const next = !nowPreserving;
            preserveBtn.className = "ebc-preserve-btn" + (next ? " on" : "");
            preserveBtn.textContent = next ? "🔒" : "🔓";
            preserveBtn.title = next
                ? "Keeps existing restraints when worn — click to change"
                : "Removes existing restraints when worn — click to change";
            setOutfitPreserveRestraints(o.id, next);
            // Keep edit panel in sync if open
            ePreserveCheck.checked = next;
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
            );
            if (ok) this.renderOutfits();
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
                seqBadge.title = "Animation button — edit the pose sequence below";
                seqBadge.style.display = isSeq ? "inline" : "none";

                const emoteInp = document.createElement("input");
                emoteInp.className = "ebc-slot-emote";
                emoteInp.type = "text";
                emoteInp.maxLength = 240;
                emoteInp.placeholder = isSeq ? "e.g. OverTheHead|_|OverTheHead|_" : "e.g. nods.";
                emoteInp.value = btn.emote;
                emoteInp.title = isSeq
                    ? "Pose sequence: pipe-separated BC pose names, _ to clear"
                    : currentStyle === "emote" ? "Text sent as * Name text *" : "Text sent as ( Name text )";

                botLine.appendChild(styleBtn);
                botLine.appendChild(seqBadge);
                botLine.appendChild(emoteInp);

                row.appendChild(topLine);
                row.appendChild(botLine);
                slotList.appendChild(row);

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
                if (eInp) btns[i].emote = eInp.value;
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

    // -- Notes tab -------------------------------------------------------------

    private renderNotes(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const notes = getNotes();
        const roomChars: Character[] = ((window as unknown as Record<string, unknown>).ChatRoomCharacter as Character[] | undefined) ?? [];
        const roomOthers = roomChars.filter(c => c.MemberNumber !== Player.MemberNumber);

        if (roomOthers.length > 0) {
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

        const roomNums = new Set(roomOthers.map(c => String(c.MemberNumber)));
        const offlineEntries = Object.entries(notes).filter(([k]) => !roomNums.has(k));

        if (offlineEntries.length > 0) {
            const div = document.createElement("div");
            div.className = "ebc-divider";
            body.appendChild(div);
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "Saved Notes";
            body.appendChild(lbl);
            for (const [key, data] of offlineEntries) {
                body.appendChild(this.buildNoteRow(parseInt(key), data.name, data.note));
            }
        }

        if (roomOthers.length === 0 && offlineEntries.length === 0) {
            const empty = document.createElement("div");
            empty.className = "ebc-empty";
            empty.innerHTML = "No notes saved yet.<br><span style='color:#4c2537'>Join a room to add notes about people.</span>";
            body.appendChild(empty);
        }
    }

    private charDisplayName(char: Character): string {
        const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
        if (typeof nickFn === "function") {
            try { return (nickFn as (c: Character) => string)(char); } catch { /* ignore */ }
        }
        return (char as unknown as Record<string, unknown>).Nickname as string || char.Name || "Unknown";
    }

    private buildNoteRow(memberNumber: number, displayName: string, currentNote: string): HTMLElement {
        const hasNote = !!currentNote.trim();

        const container = document.createElement("div");
        container.className = "ebc-notes-person";

        const header = document.createElement("div");
        header.className = "ebc-notes-person-header";

        const dot = document.createElement("div");
        dot.className = "ebc-notes-dot" + (hasNote ? " has-note" : "");

        const name = document.createElement("span");
        name.className = "ebc-notes-person-name";
        name.textContent = displayName;

        const num = document.createElement("span");
        num.className = "ebc-notes-member-num";
        num.textContent = "#" + memberNumber;

        header.appendChild(dot);
        header.appendChild(name);
        header.appendChild(num);
        container.appendChild(header);

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

    // -- Special Thanks tab ----------------------------------------------------

    private renderThanks(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        const intro = document.createElement("div");
        intro.className = "ebc-thanks-intro";
        intro.textContent = "People who made EmeryBC possible.";
        body.appendChild(intro);

        const people = [
            {
                emoji: "🎀",
                name: "Sin",
                reason: "Creator of CRABS — the UI inspiration behind this whole drawer. Open design, open heart.",
                heart: "💗",
            },
            {
                emoji: "🌸",
                name: "Lara",
                reason: "Keeping my bratty side in check, endless support and inspiration, and simply being the best friend anyone could ask for around here~",
                heart: "💖",
            },
            {
                emoji: "🌙",
                name: "Lucy",
                reason: "Stayed up nearly 19 hours with me while this came to life, sharing ideas and keeping the energy going the whole way through.",
                heart: "💜",
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

            const namEl = document.createElement("span");
            namEl.className = "ebc-thanks-name";
            namEl.textContent = p.name;

            const reason = document.createElement("span");
            reason.className = "ebc-thanks-reason";
            reason.textContent = p.reason;

            info.appendChild(namEl);
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

    // -- Open / Close / Toggle -------------------------------------------------

    public toggle(): void { this.isOpen ? this.close() : this.open(); }

    public open(): void {
        if (!this.panelEl) return;
        this.isOpen = true;
        this.panelEl.className = "ebc-open";
        if (!this.positioned) this.syncToChat();
        try { this.refreshBadgeRow?.(); } catch { /* ignore */ }
        this.renderCurrentTab();
    }

    public close(): void {
        if (!this.panelEl) return;
        this.isOpen = false;
        this.panelEl.className = "ebc-closed";
    }

    // -- Lifecycle -------------------------------------------------------------

    public destroy(): void {
        this.resizeObserver?.disconnect();
        this.stopCrabsPoller();
        this.rootEl?.remove();
        this.rootEl  = null;
        this.panelEl = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
