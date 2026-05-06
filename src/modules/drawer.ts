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
    type ConfiguredOutfit,
} from "./outfitManager";
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

.ebc-slot-seq {
    flex-shrink: 0;
    width: 30px;
    height: 22px;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.04em;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-seq.on  { background: #111b0d; color: #7aba55; border-color: #4a7a2e; }
.ebc-slot-seq:hover { border-color: #4a7a2e; color: #7aba55; }

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

type DrawerTab = "outfits" | "buttons";

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
        refreshBtn.textContent = "R";

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

        tabBar.appendChild(outfitTabBtn);
        tabBar.appendChild(buttonsTabBtn);

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
        refreshBtn.addEventListener("click", () => this.renderCurrentTab());

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

        outfitTabBtn.addEventListener("click", () => this.switchTab("outfits"));
        buttonsTabBtn.addEventListener("click", () => this.switchTab("buttons"));

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
        this.rootEl.style.top    = `${rect.top + topOffset}px`;
        this.rootEl.style.right  = `${document.documentElement.clientWidth - rect.right}px`;
        this.rootEl.style.height = `${rect.height - topOffset}px`;
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

        const outfitBtn = this.rootEl?.querySelector("#ebc-tab-outfits");
        const buttonBtn = this.rootEl?.querySelector("#ebc-tab-buttons");
        if (outfitBtn) outfitBtn.className = "ebc-tab-btn" + (tab === "outfits" ? " ebc-tab-active" : "");
        if (buttonBtn) buttonBtn.className = "ebc-tab-btn" + (tab === "buttons" ? " ebc-tab-active" : "");

        this.renderCurrentTab();
    }

    private renderCurrentTab(): void {
        if (this.currentTab === "outfits") {
            this.renderOutfits();
        } else {
            this.renderButtons();
        }
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
        const row = document.createElement("div");
        row.className = "ebc-outfit-row";

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

        row.appendChild(info);
        row.appendChild(preserveBtn);
        row.appendChild(updateBtn);
        row.appendChild(wearBtn);

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

        return row;
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
            while (slotList.firstChild) slotList.removeChild(slotList.firstChild);

            for (let i = 0; i < slotCount; i++) {
                const btn = btns[i] ?? { label: "", emote: "", color: "#c2185b", enabled: false, style: "action" as const };

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

                // SEQ toggle lives in the top row so the ( )/( *) toggle stays two-way
                const currentStyle: ActionStyle = (btn.style as ActionStyle) ?? "action";
                const isSeq = currentStyle === "seq";

                const seqBtn = document.createElement("button");
                seqBtn.className = "ebc-slot-seq" + (isSeq ? " on" : "");
                seqBtn.textContent = "SEQ";
                seqBtn.title = isSeq
                    ? "Animation/sequence mode ON — click to turn off"
                    : "Turn on animation/sequence mode";

                topLine.appendChild(toggle);
                topLine.appendChild(labelInp);
                topLine.appendChild(colorInp);
                topLine.appendChild(seqBtn);
                topLine.appendChild(delBtn);

                // Bottom line: ( )/( *) style toggle | emote input
                const botLine = document.createElement("div");
                botLine.className = "ebc-slot-bottom";

                // The non-seq base style (remembered when toggling seq off)
                const baseStyle: "action" | "emote" = isSeq ? "action" : (currentStyle as "action" | "emote");

                const styleBtn = document.createElement("button");
                styleBtn.className = "ebc-slot-style" + (baseStyle === "emote" ? " emote" : "");
                styleBtn.textContent = baseStyle === "emote" ? "* *" : "( )";
                styleBtn.title = baseStyle === "emote"
                    ? "Style: * emote * — click to switch"
                    : "Style: ( action ) — click to switch";
                styleBtn.style.display = isSeq ? "none" : "";

                const emoteInp = document.createElement("input");
                emoteInp.className = "ebc-slot-emote";
                emoteInp.type = "text";
                emoteInp.maxLength = 240;
                emoteInp.placeholder = isSeq ? "e.g. _|HandsUp|_|HandsUp|_" : "e.g. nods.";
                emoteInp.value = btn.emote;
                emoteInp.title = isSeq
                    ? "Pipe-separated steps: PoseName | _ (clear) | !action text | *emote text"
                    : baseStyle === "emote" ? "Text sent as * Name text *" : "Text sent as ( Name text )";

                botLine.appendChild(styleBtn);
                botLine.appendChild(emoteInp);

                // Hint shown only in seq mode
                const seqHint = document.createElement("div");
                seqHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#4a7a2e;padding:1px 2px 0;line-height:1.4;";
                seqHint.textContent = "Steps by | : PoseName  _=reset  !action  *emote";
                seqHint.style.display = isSeq ? "block" : "none";

                row.appendChild(topLine);
                row.appendChild(botLine);
                row.appendChild(seqHint);
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
                    const cur = btns[idx].style === "emote" ? "emote" : "action";
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

                seqBtn.addEventListener("click", () => {
                    const nowSeq = btns[idx].style === "seq";
                    if (nowSeq) {
                        // turn off seq, restore base style
                        btns[idx].style = styleBtn.classList.contains("emote") ? "emote" : "action";
                        seqBtn.className = "ebc-slot-seq";
                        seqBtn.title = "Turn on animation/sequence mode";
                        styleBtn.style.display = "";
                        emoteInp.placeholder = "e.g. nods.";
                        emoteInp.title = btns[idx].style === "emote"
                            ? "Text sent as * Name text *"
                            : "Text sent as ( Name text )";
                        seqHint.style.display = "none";
                    } else {
                        // turn on seq
                        btns[idx].style = "seq";
                        seqBtn.className = "ebc-slot-seq on";
                        seqBtn.title = "Animation/sequence mode ON — click to turn off";
                        styleBtn.style.display = "none";
                        emoteInp.placeholder = "e.g. _|HandsUp|_|HandsUp|_";
                        emoteInp.title = "Pipe-separated steps: PoseName | _ (clear) | !action text | *emote text";
                        seqHint.style.display = "block";
                    }
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
