/**
 * EmeryBC Drawer
 *
 * A CRABS-inspired sliding side panel aligned to the right edge of the
 * chat log. Shows saved outfits with one-click Wear and Update buttons,
 * plus an inline New Outfit form.
 *
 * UI pattern inspired by CRABS by Sin (https://github.com/sin-1337/CRABS).
 * Thank you Sin for the open design!
 */
import {
    getOutfits,
    applyOutfit,
    saveCurrentAppearanceToOutfit,
    createOutfitFromCurrent,
    type ConfiguredOutfit,
} from "./outfitManager";

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
#emerybc-drawer {
    position: fixed;
    z-index: 99;
    display: flex;
    align-items: flex-start;
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

#emerybc-drawer.ebc-closed { transform: translateX(calc(100% + 40px)); }
#emerybc-drawer.ebc-open   { transform: translateX(0); }

/* Tab button - sits just below CRABS's tab at the top of the chat area */
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
    top: 50px;
    z-index: 99;
    transition: background 0.18s;
    flex-shrink: 0;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }

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
    padding: 8px 12px;
    border-bottom: 1px solid #4c2537;
    background: rgba(36, 17, 29, 0.9);
    flex-shrink: 0;
    gap: 8px;
}

.ebc-title {
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    font-weight: bold;
    color: #cf6f98;
    letter-spacing: 0.07em;
    white-space: nowrap;
}

.ebc-header-btns { display: flex; gap: 5px; align-items: center; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 6px;
    color: #967281;
    cursor: pointer;
    padding: 3px 7px;
    font-size: 12px;
    line-height: 1.3;
    font-family: "Trebuchet MS", serif;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.ebc-icon-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

/* -- Body -- */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
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
    padding: 4px 4px 6px;
}

/* -- Outfit rows -- */
.ebc-outfit-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 8px;
    border-radius: 8px;
    margin-bottom: 5px;
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
    letter-spacing: 0.04em;
}

.ebc-wear-btn {
    flex-shrink: 0;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 6px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    padding: 4px 10px;
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
    border-radius: 6px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 4px 8px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-update-btn:hover    { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-update-btn:active   { transform: scale(0.96); }
.ebc-update-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Empty -- */
.ebc-empty {
    color: #553142;
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    text-align: center;
    padding: 20px 8px;
    line-height: 1.7;
}

/* -- New outfit area -- */
.ebc-divider {
    height: 1px;
    background: #2a1421;
    margin: 6px 0;
}

.ebc-new-outfit-btn {
    width: 100%;
    background: transparent;
    border: 1px dashed #4c2537;
    border-radius: 6px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 6px 0;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    text-align: center;
}

.ebc-new-outfit-btn:hover { background: #2a1421; color: #cf6f98; border-color: #7a4a5e; border-style: solid; }

.ebc-new-form {
    margin-top: 6px;
    display: none;
    flex-direction: column;
    gap: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    border-radius: 8px;
    padding: 8px;
}

.ebc-form-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.ebc-form-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    white-space: nowrap;
    width: 60px;
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
    padding: 3px 6px;
    min-width: 0;
    outline: none;
    transition: border-color 0.14s;
}

.ebc-form-input:focus { border-color: #cf6f98; }

.ebc-form-check-row {
    display: flex;
    align-items: center;
    gap: 6px;
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
    border-radius: 6px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    padding: 5px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}

.ebc-create-btn:hover    { background: #91405f; color: #f7e6ee; }
.ebc-create-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Footer -- */
.ebc-footer {
    flex-shrink: 0;
    padding: 5px 12px;
    border-top: 1px solid #2a1421;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #3a1a28;
    text-align: center;
}

.ebc-footer a { color: #553142; text-decoration: none; transition: color 0.14s; }
.ebc-footer a:hover { color: #cf6f98; }
`;

// -- Class ---------------------------------------------------------------------

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    private el: HTMLElement | null = null;
    private isOpen = false;
    private resizeObserver: ResizeObserver | null = null;
    private positioned = false;

    constructor() {
        EBCDrawer._instance = this;
        if (document.body) {
            this.setup();
        } else {
            document.addEventListener("DOMContentLoaded", () => this.setup());
        }
    }

    // -- Setup -----------------------------------------------------------------

    private setup(): void {
        if (this.el) return;
        this.injectStyles();

        const el = document.createElement("div");
        el.id = "emerybc-drawer";
        el.className = "ebc-closed";
        // Start truly off-screen until syncToChat gives us real coordinates
        el.style.display = "none";
        el.style.right = "-9999px";

        // Tab button
        const tab = document.createElement("div");
        tab.id = "ebc-tab";
        tab.title = "EmeryBC outfits";
        tab.innerHTML = TAB_ICON;
        el.appendChild(tab);

        // Panel
        const panel = document.createElement("div");
        panel.className = "ebc-panel";

        // Header
        const header = document.createElement("div");
        header.className = "ebc-header";

        const title = document.createElement("span");
        title.className = "ebc-title";
        title.textContent = "EmeryBC - Outfits";

        const headerBtns = document.createElement("div");
        headerBtns.className = "ebc-header-btns";

        const refreshBtn = document.createElement("button");
        refreshBtn.className = "ebc-icon-btn";
        refreshBtn.id = "ebc-refresh-btn";
        refreshBtn.title = "Refresh outfit list";
        refreshBtn.textContent = "R";

        const closeBtn = document.createElement("button");
        closeBtn.className = "ebc-icon-btn";
        closeBtn.id = "ebc-close-btn";
        closeBtn.title = "Close";
        closeBtn.textContent = "X";

        headerBtns.appendChild(refreshBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);

        // Body
        const body = document.createElement("div");
        body.className = "ebc-body";
        body.id = "ebc-body";

        // Footer
        const footer = document.createElement("div");
        footer.className = "ebc-footer";
        footer.textContent = "UI inspired by CRABS by Sin - thank you! <3";

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(footer);
        el.appendChild(panel);

        document.body.appendChild(el);
        this.el = el;

        tab.addEventListener("click", () => this.toggle());
        closeBtn.addEventListener("click", () => this.close());
        refreshBtn.addEventListener("click", () => this.renderOutfits());

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
    // Aligns to the full height of TextAreaChatLog. The tab button is offset
    // 50px from the top via CSS so it sits just below CRABS's tab.

    private syncToChat(): boolean {
        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog || !this.el) return false;
        const rect = chatLog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        this.el.style.top    = `${rect.top}px`;
        this.el.style.right  = `${document.documentElement.clientWidth - rect.right}px`;
        this.el.style.width  = `${rect.width}px`;
        this.el.style.height = `${rect.height}px`;
        this.positioned = true;
        return true;
    }

    // -- Visibility ------------------------------------------------------------

    public updateVisibility(): void {
        if (!this.el) return;
        const inRoom = typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";

        if (!inRoom) {
            this.el.style.display = "none";
            this.isOpen = false;
            this.el.className = "ebc-closed";
            this.positioned = false;
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            return;
        }

        // In room: try to position. If the chat log isn't laid out yet retry
        // via requestAnimationFrame so the element never floats in the centre.
        const synced = this.syncToChat();
        if (synced) {
            this.el.style.display = "flex";
        } else {
            // Keep hidden and retry next frame
            requestAnimationFrame(() => {
                if (this.syncToChat() && this.el) {
                    this.el.style.display = "flex";
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

    // -- Render outfits --------------------------------------------------------

    private renderOutfits(): void {
        const body = this.el?.querySelector("#ebc-body") as HTMLElement | null;
        if (!body) return;

        // Clear existing content
        while (body.firstChild) body.removeChild(body.firstChild);

        const outfits = getOutfits();

        if (outfits.length > 0) {
            const sectionLabel = document.createElement("div");
            sectionLabel.className = "ebc-section-label";
            sectionLabel.textContent = "Saved Outfits";
            body.appendChild(sectionLabel);

            for (const o of outfits) {
                body.appendChild(this.buildOutfitRow(o, body));
            }
        } else {
            const empty = document.createElement("div");
            empty.className = "ebc-empty";
            const line1 = document.createTextNode("No outfits saved yet.");
            const br = document.createElement("br");
            const line2 = document.createElement("b");
            line2.textContent = "Preferences - Extensions - EmeryBC - Outfits";
            empty.appendChild(line1);
            empty.appendChild(br);
            empty.appendChild(line2);
            body.appendChild(empty);
        }

        // New outfit section
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

        const updateBtn = document.createElement("button");
        updateBtn.className = "ebc-update-btn";
        updateBtn.textContent = "Update";
        updateBtn.title = "Save current appearance to this outfit";

        const wearBtn = document.createElement("button");
        wearBtn.className = "ebc-wear-btn";
        wearBtn.textContent = "Wear";
        wearBtn.title = "Apply this outfit";

        row.appendChild(info);
        row.appendChild(updateBtn);
        row.appendChild(wearBtn);

        const setAllDisabled = (disabled: boolean): void => {
            body.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn, .ebc-update-btn").forEach(b => {
                b.disabled = disabled;
            });
        };

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
        const divider = document.createElement("div");
        divider.className = "ebc-divider";
        body.appendChild(divider);

        const newBtn = document.createElement("button");
        newBtn.className = "ebc-new-outfit-btn";
        newBtn.textContent = "+ New Outfit from Current Look";
        body.appendChild(newBtn);

        const form = document.createElement("div");
        form.className = "ebc-new-form";
        body.appendChild(form);

        // Command row
        const cmdRow = document.createElement("div");
        cmdRow.className = "ebc-form-row";
        const cmdLabel = document.createElement("span");
        cmdLabel.className = "ebc-form-label";
        cmdLabel.textContent = "Command";
        const cmdInput = document.createElement("input");
        cmdInput.className = "ebc-form-input";
        cmdInput.type = "text";
        cmdInput.placeholder = "e.g. dom";
        cmdInput.maxLength = 20;
        cmdRow.appendChild(cmdLabel);
        cmdRow.appendChild(cmdInput);
        form.appendChild(cmdRow);

        // Name row
        const nameRow = document.createElement("div");
        nameRow.className = "ebc-form-row";
        const nameLabel = document.createElement("span");
        nameLabel.className = "ebc-form-label";
        nameLabel.textContent = "Name";
        const nameInput = document.createElement("input");
        nameInput.className = "ebc-form-input";
        nameInput.type = "text";
        nameInput.placeholder = "e.g. Dom Clothes";
        nameInput.maxLength = 40;
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        form.appendChild(nameRow);

        // Announce row
        const announceRow = document.createElement("div");
        announceRow.className = "ebc-form-row";
        const announceLabel = document.createElement("span");
        announceLabel.className = "ebc-form-label";
        announceLabel.textContent = "Announce";
        const announceInput = document.createElement("input");
        announceInput.className = "ebc-form-input";
        announceInput.type = "text";
        announceInput.placeholder = "e.g. changes into dom mode";
        announceInput.maxLength = 120;
        announceRow.appendChild(announceLabel);
        announceRow.appendChild(announceInput);
        form.appendChild(announceRow);

        // Restraints checkbox
        const checkRow = document.createElement("label");
        checkRow.className = "ebc-form-check-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        const checkLabel = document.createElement("span");
        checkLabel.className = "ebc-form-check-label";
        checkLabel.textContent = "Include restraints";
        checkRow.appendChild(checkbox);
        checkRow.appendChild(checkLabel);
        form.appendChild(checkRow);

        // Create button
        const createBtn = document.createElement("button");
        createBtn.className = "ebc-create-btn";
        createBtn.textContent = "Save as New Outfit";
        form.appendChild(createBtn);

        // Toggle form open/close
        newBtn.addEventListener("click", () => {
            const isOpen = form.style.display !== "none";
            form.style.display = isOpen ? "none" : "flex";
            newBtn.textContent = isOpen ? "+ New Outfit from Current Look" : "- Cancel";
            if (!isOpen) {
                cmdInput.focus();
            }
        });

        createBtn.addEventListener("click", () => {
            const cmd = cmdInput.value.trim();
            const name = nameInput.value.trim();
            const announce = announceInput.value.trim();
            const restraints = checkbox.checked;

            if (!cmd || !name) {
                cmdInput.style.borderColor = cmd ? "" : "#cf6f98";
                nameInput.style.borderColor = name ? "" : "#cf6f98";
                return;
            }

            cmdInput.style.borderColor = "";
            nameInput.style.borderColor = "";
            createBtn.disabled = true;
            createBtn.textContent = "Saving...";

            const result = createOutfitFromCurrent(cmd, name, announce, restraints);
            if (result) {
                // Reset and close form, refresh list
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

    // -- Open / Close / Toggle -------------------------------------------------

    public toggle(): void { this.isOpen ? this.close() : this.open(); }

    public open(): void {
        if (!this.el) return;
        this.isOpen = true;
        this.el.className = "ebc-open";
        // Always re-sync position when opening (handles first-open after room join)
        if (!this.positioned) {
            this.syncToChat();
        }
        this.renderOutfits();
    }

    public close(): void {
        if (!this.el) return;
        this.isOpen = false;
        this.el.className = "ebc-closed";
    }

    // -- Lifecycle -------------------------------------------------------------

    public destroy(): void {
        this.resizeObserver?.disconnect();
        this.el?.remove();
        this.el = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
