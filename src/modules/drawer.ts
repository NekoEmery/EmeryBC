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
    setOutfitPreserveRestraints,
    RESTRAINT_GROUPS,
    type ConfiguredOutfit,
    type SerializedItem,
} from "./outfitManager";
import { getNotes, saveNote, type CharacterNote } from "./notes";
import { getAnnounceSettings, saveAnnounceSettings, type AutoAnnounceSettings } from "./autoAnnounce";
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

// -- Icon ----------------------------------------------------------------------

const TAB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 90 90">'
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
    width: 36px;
    height: 36px;
    background: rgba(42, 20, 33, 0.93);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(207, 111, 152, 0.45);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: -3px 0 10px rgba(0,0,0,0.55);
    position: absolute;
    left: -36px;
    top: 10px;
    transition: background 0.18s;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }

/* Sliding panel - only this element transforms, not the tab */
#emerybc-panel {
    position: absolute;
    right: 0;
    top: 0;
    width: 300px;
    height: 100%;
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

#emerybc-panel.ebc-closed { transform: translateX(calc(100% + 40px)); }
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

.ebc-slot-del:hover { background: #3a1017; color: #cf6f98; border-color: #7a4a5e; }

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

/* -- Settings tab -- */
.ebc-setting-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 7px;
    border-radius: 6px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    margin-bottom: 4px;
}

.ebc-setting-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    flex: 1;
    min-width: 0;
}

.ebc-setting-toggle {
    flex-shrink: 0;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    padding: 2px 8px;
    white-space: nowrap;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-setting-toggle.on  { background: #6b3048; color: #f7e6ee; border-color: #cf6f98; }
.ebc-setting-toggle:hover { border-color: #7a4a5e; }

.ebc-setting-input {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 2px 5px;
    outline: none;
    min-width: 0;
    transition: border-color 0.14s;
}

.ebc-setting-input:focus { border-color: #cf6f98; }

.ebc-setting-save-btn {
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
    margin-top: 4px;
    transition: background 0.14s, color 0.12s;
}

.ebc-setting-save-btn:hover { background: #91405f; color: #f7e6ee; }

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
`;

// -- Class ---------------------------------------------------------------------

type DrawerTab = "outfits" | "buttons" | "notes" | "settings";

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    private rootEl: HTMLElement | null = null;   // zero-width anchor (positioned)
    private panelEl: HTMLElement | null = null;  // sliding panel (transforms)
    private isOpen = false;
    private currentTab: DrawerTab = "outfits";
    private resizeObserver: ResizeObserver | null = null;
    private positioned = false;
    private version = "";

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

        const settingsTabBtn = document.createElement("button");
        settingsTabBtn.className = "ebc-tab-btn";
        settingsTabBtn.id = "ebc-tab-settings";
        settingsTabBtn.textContent = "SETTINGS";

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(buttonsTabBtn);
        tabBar.appendChild(notesTabBtn);
        tabBar.appendChild(settingsTabBtn);

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
        settingsTabBtn.addEventListener("click", () => this.switchTab("settings"));

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
    // Aligned to the right edge of TextAreaChatLog, 15% down from the top.
    // This places our tab just below CRABS's tab without overlapping.

    private syncToChat(): boolean {
        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog || !this.rootEl) return false;
        const rect = chatLog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const topOffset = rect.height * 0.15;
        const top = rect.top + topOffset;
        this.rootEl.style.top    = `${top}px`;
        this.rootEl.style.right  = `${document.documentElement.clientWidth - rect.right}px`;
        // Extend to the bottom of the viewport so the panel isn't cut short
        this.rootEl.style.height = `${document.documentElement.clientHeight - top}px`;
        this.positioned = true;
        return true;
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
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
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
    }

    // -- Tab switching ---------------------------------------------------------

    private switchTab(tab: DrawerTab): void {
        this.currentTab = tab;

        for (const [id, name] of [
            ["ebc-tab-outfits",  "outfits"],
            ["ebc-tab-buttons",  "buttons"],
            ["ebc-tab-notes",    "notes"],
            ["ebc-tab-settings", "settings"],
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
        else if (this.currentTab === "settings") this.renderSettings();
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

        const delBtn = document.createElement("button");
        delBtn.className = "ebc-outfit-del";
        delBtn.textContent = "×";
        delBtn.title = "Delete this outfit";

        row.appendChild(info);
        row.appendChild(preserveBtn);
        row.appendChild(diffBtn);
        row.appendChild(updateBtn);
        row.appendChild(wearBtn);
        row.appendChild(delBtn);

        const diffPanel = document.createElement("div");
        diffPanel.className = "ebc-diff-panel";
        wrapper.appendChild(row);
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

        diffBtn.addEventListener("click", () => {
            const isOpen = diffPanel.classList.contains("open");
            diffPanel.classList.toggle("open", !isOpen);
            diffBtn.classList.toggle("open", !isOpen);
            if (!isOpen) {
                row.style.borderRadius = "7px 7px 0 0";
                this.renderDiff(diffPanel, o);
            } else {
                row.style.borderRadius = "7px";
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

                delBtn.addEventListener("click", () => {
                    btns.splice(idx, 1);
                    btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                    slotCount = Math.max(1, slotCount - 1);
                    renderSlots();
                    updateFooterState();
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

        resetBtn.addEventListener("click", () => {
            btns = DEFAULT_BUTTONS.map(b => ({ ...b }));
            slotCount = DEFAULT_BUTTONS.length;
            saveButtons([...btns], slotCount);
            renderSlots();
            updateFooterState();
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

    // -- Settings tab ----------------------------------------------------------

    private renderSettings(): void {
        const body = this.rootEl?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;
        while (body.firstChild) body.removeChild(body.firstChild);

        let s: AutoAnnounceSettings = getAnnounceSettings();

        // Section label
        const lbl = document.createElement("div");
        lbl.className = "ebc-section-label";
        lbl.textContent = "Room Auto-Announce";
        body.appendChild(lbl);

        // Enabled
        const enableRow = this.makeSettingRow("Announce on room join");
        const enableToggle = this.makeToggle(s.enabled);
        enableRow.appendChild(enableToggle);
        body.appendChild(enableRow);

        // Message
        const msgRow = this.makeSettingRow("Message");
        const msgInput = document.createElement("input");
        msgInput.className = "ebc-setting-input";
        msgInput.type = "text";
        msgInput.value = s.message;
        msgInput.placeholder = "slips in quietly.";
        msgInput.maxLength = 150;
        msgRow.appendChild(msgInput);
        body.appendChild(msgRow);

        // Style
        const styleRow = this.makeSettingRow("Style");
        const styleToggle = this.makeToggle(s.style === "emote", s.style === "emote" ? "* *" : "( )");
        styleToggle.title = "Toggle between ( action ) and * emote * style";
        styleRow.appendChild(styleToggle);
        body.appendChild(styleRow);

        // Friends-only mode
        const modeRow = this.makeSettingRow("Only when a friend is present");
        const modeToggle = this.makeToggle(s.mode === "friends");
        modeRow.appendChild(modeToggle);
        body.appendChild(modeRow);

        // Friend list section (conditionally visible)
        const friendSection = document.createElement("div");
        friendSection.style.display = s.mode === "friends" ? "" : "none";

        const friendLbl = document.createElement("div");
        friendLbl.className = "ebc-section-label";
        friendLbl.style.marginTop = "6px";
        friendLbl.textContent = "Friend member numbers";
        friendSection.appendChild(friendLbl);

        const addRow = document.createElement("div");
        addRow.className = "ebc-setting-row";
        const numInput = document.createElement("input");
        numInput.className = "ebc-setting-input";
        numInput.type = "number";
        numInput.placeholder = "Member number...";
        numInput.min = "1";
        const addBtn = document.createElement("button");
        addBtn.className = "ebc-setting-toggle";
        addBtn.textContent = "+ Add";
        addRow.appendChild(numInput);
        addRow.appendChild(addBtn);
        friendSection.appendChild(addRow);

        const friendListEl = document.createElement("div");
        friendSection.appendChild(friendListEl);
        body.appendChild(friendSection);

        const renderFriendList = (): void => {
            while (friendListEl.firstChild) friendListEl.removeChild(friendListEl.firstChild);
            if (s.friendNumbers.length === 0) {
                const empty = document.createElement("div");
                empty.className = "ebc-notes-save-hint";
                empty.style.padding = "4px 2px";
                empty.textContent = "No friends added yet.";
                friendListEl.appendChild(empty);
                return;
            }
            const notes = getNotes();
            for (const num of s.friendNumbers) {
                const row = document.createElement("div");
                row.className = "ebc-setting-row";
                const label = document.createElement("span");
                label.className = "ebc-setting-label";
                const noteData: CharacterNote | undefined = notes[String(num)];
                label.textContent = noteData ? `${noteData.name} (#${num})` : `#${num}`;
                const removeBtn = document.createElement("button");
                removeBtn.className = "ebc-slot-del";
                removeBtn.textContent = "x";
                removeBtn.addEventListener("click", () => {
                    s = { ...s, friendNumbers: s.friendNumbers.filter(n => n !== num) };
                    renderFriendList();
                });
                row.appendChild(label);
                row.appendChild(removeBtn);
                friendListEl.appendChild(row);
            }
        };
        renderFriendList();

        // Save button
        const div2 = document.createElement("div");
        div2.className = "ebc-divider";
        body.appendChild(div2);

        const saveBtn = document.createElement("button");
        saveBtn.className = "ebc-setting-save-btn";
        saveBtn.textContent = "Save Settings";
        body.appendChild(saveBtn);

        // Events
        enableToggle.addEventListener("click", () => {
            s = { ...s, enabled: !s.enabled };
            this.setToggle(enableToggle, s.enabled);
        });

        styleToggle.addEventListener("click", () => {
            const next = s.style === "action" ? "emote" : "action";
            s = { ...s, style: next };
            this.setToggle(styleToggle, next === "emote", next === "emote" ? "* *" : "( )");
        });

        modeToggle.addEventListener("click", () => {
            const next = s.mode === "always" ? "friends" : "always";
            s = { ...s, mode: next };
            this.setToggle(modeToggle, next === "friends");
            friendSection.style.display = next === "friends" ? "" : "none";
        });

        msgInput.addEventListener("input", () => { s = { ...s, message: msgInput.value }; });

        addBtn.addEventListener("click", () => {
            const num = parseInt(numInput.value);
            if (isNaN(num) || num < 1 || s.friendNumbers.includes(num)) return;
            s = { ...s, friendNumbers: [...s.friendNumbers, num] };
            numInput.value = "";
            renderFriendList();
        });
        numInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

        saveBtn.addEventListener("click", () => {
            saveAnnounceSettings(s);
            saveBtn.textContent = "Saved!";
            window.setTimeout(() => { saveBtn.textContent = "Save Settings"; }, 1200);
        });
    }

    private makeSettingRow(labelText: string): HTMLElement {
        const row = document.createElement("div");
        row.className = "ebc-setting-row";
        const lbl = document.createElement("span");
        lbl.className = "ebc-setting-label";
        lbl.textContent = labelText;
        row.appendChild(lbl);
        return row;
    }

    private makeToggle(on: boolean, onLabel = "ON", offLabel = "OFF"): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.className = "ebc-setting-toggle" + (on ? " on" : "");
        btn.textContent = on ? onLabel : offLabel;
        (btn as HTMLButtonElement & { _onLabel: string; _offLabel: string })._onLabel  = onLabel;
        (btn as HTMLButtonElement & { _onLabel: string; _offLabel: string })._offLabel = offLabel;
        return btn as HTMLButtonElement;
    }

    private setToggle(btn: HTMLButtonElement, on: boolean, onLabel?: string, offLabel?: string): void {
        const b = btn as HTMLButtonElement & { _onLabel?: string; _offLabel?: string };
        const ol = onLabel  ?? b._onLabel  ?? "ON";
        const fl = offLabel ?? b._offLabel ?? "OFF";
        btn.className = "ebc-setting-toggle" + (on ? " on" : "");
        btn.textContent = on ? ol : fl;
    }

    // -- Open / Close / Toggle -------------------------------------------------

    public toggle(): void { this.isOpen ? this.close() : this.open(); }

    public open(): void {
        if (!this.panelEl) return;
        this.isOpen = true;
        this.panelEl.className = "ebc-open";
        if (!this.positioned) this.syncToChat();
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
        this.rootEl?.remove();
        this.rootEl  = null;
        this.panelEl = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
