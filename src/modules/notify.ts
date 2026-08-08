import { UI } from "./ui";

/**
 * One dismissible block in the chat log, rather than a run of separate lines.
 *
 * Long output posted line by line cannot be cleared without scrolling past all
 * of it, which is why a dismiss control was asked for - and a control per line
 * would be worse than none. Kept scrollable so a long list never buries the
 * conversation underneath it.
 */
/**
 * One changelog entry, split into the parts worth styling differently.
 *
 * The entries are written as prose beginning with a category ("Fix:",
 * "IMPORTANT fix:", "Fix (reported by Julia):"). Read as a block of identical
 * text that prefix is just noise in front of every line, but it is the single
 * most useful thing for deciding whether a line matters to you - so it is lifted
 * out into a tag you can scan down instead of read through.
 */
interface ParsedChange {
    tag: string | null;
    tone: string;
    /** First sentence - carries the actual change. */
    headline: string;
    /** The rest: why it happened, what it cost. Worth reading, not worth leading with. */
    detail: string;
    credit: string | null;
}

function parseChange(raw: string): ParsedChange {
    let text = raw.trim().replace(/^[••]\s*/, "");
    let tag: string | null = null;
    let tone = UI.accent;
    let credit: string | null = null;

    const lead = /^(IMPORTANT fix|Fix|New|Added|Removed|Changed)\s*(?:\(reported by ([^)]+)\))?\s*:\s*/i.exec(text);
    if (lead) {
        const label = lead[1].toLowerCase();
        if (label === "important fix")  { tag = "IMPORTANT"; tone = UI.gold; }
        else if (label === "fix")       { tag = "FIX";       tone = UI.success; }
        else if (label === "new" || label === "added") { tag = "NEW"; tone = UI.accent; }
        else                            { tag = label.toUpperCase(); tone = UI.textSoft; }
        if (lead[2]) credit = lead[2].trim();
        text = text.slice(lead[0].length);
    }

    // Some entries credit at the end instead ("Requested by Julia."). Same
    // information, so it is shown the same way rather than left mid-sentence.
    const trail = /\s*(?:Requested|Reported|Suggested|Found)\s+by\s+([A-Za-z0-9 #]+?)\.?\s*$/i.exec(text);
    if (trail) {
        credit = credit ?? trail[1].trim();
        text = text.slice(0, trail.index);
    }

    text = text.trim();
    // Split after the first sentence so there is something short to scan and the
    // reasoning sits behind it, instead of one undifferentiated paragraph.
    const stop = /\.\s+(?=[A-Z"'(])/.exec(text);
    const headline = stop ? text.slice(0, stop.index + 1) : text;
    const detail   = stop ? text.slice(stop.index + 1).trim() : "";
    return { tag, tone, headline, detail, credit };
}

/**
 * The changelog, rendered to be skimmed.
 *
 * Every line used to be the same italic pink at the same weight, which for
 * entries this long meant reading all of it to find out whether any of it
 * applied to you. Category becomes a tag, the first sentence carries the change,
 * the reasoning sits underneath in a quieter colour, and who reported it moves
 * out of the sentence.
 */
export function appendChangelogBlock(title: string, changes: string[], footer?: string): void {
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;

        const box = document.createElement("div");
        box.style.cssText = `background:${UI.cardMuted};border-left:3px solid ${UI.accent};`
            + "border-radius:4px;padding:6px 9px 8px;margin:3px 0;font-size:12px;position:relative;";

        const head = document.createElement("div");
        head.style.cssText = `color:${UI.gold};font-weight:bold;padding-right:18px;`
            + `border-bottom:1px solid ${UI.accentSoft};padding-bottom:4px;margin-bottom:2px;`;
        head.textContent = title;
        box.appendChild(head);

        const close = document.createElement("span");
        close.textContent = "×";
        close.title = "Dismiss";
        close.style.cssText = `position:absolute;top:3px;right:6px;cursor:pointer;color:${UI.textSoft};`
            + "font-size:16px;line-height:1;padding:0 3px;";
        close.addEventListener("mouseenter", () => { close.style.color = UI.accent; });
        close.addEventListener("mouseleave", () => { close.style.color = UI.textSoft; });
        close.addEventListener("click", () => box.remove());
        box.appendChild(close);

        const body = document.createElement("div");
        body.style.cssText = "max-height:230px;overflow-y:auto;margin-top:4px;";

        changes.forEach((raw, i) => {
            const c = parseChange(raw);

            const row = document.createElement("div");
            row.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:7px;align-items:start;"
                + `padding:5px 0;${i > 0 ? `border-top:1px solid ${UI.accentSoft};` : ""}`;

            const chip = document.createElement("span");
            if (c.tag) {
                chip.textContent = c.tag;
                chip.style.cssText = `color:${c.tone};border:1px solid ${c.tone};border-radius:8px;`
                    + "font-size:9px;font-weight:bold;letter-spacing:0.05em;padding:1px 6px;"
                    + "line-height:13px;white-space:nowrap;display:inline-block;margin-top:1px;";
            } else {
                // No category - keep the column so the text still lines up.
                chip.textContent = "•";
                chip.style.cssText = `color:${UI.accentDeep};font-size:11px;padding:0 4px;line-height:15px;`;
            }
            row.appendChild(chip);

            const textCol = document.createElement("div");
            textCol.style.cssText = "min-width:0;";

            const h = document.createElement("div");
            h.style.cssText = `color:${UI.text};line-height:1.45;`;
            h.textContent = c.headline;
            textCol.appendChild(h);

            if (c.detail) {
                const d = document.createElement("div");
                d.style.cssText = `color:${UI.textSoft};line-height:1.4;margin-top:2px;font-size:11px;`;
                d.textContent = c.detail;
                textCol.appendChild(d);
            }

            if (c.credit) {
                const cr = document.createElement("div");
                cr.style.cssText = `color:${UI.accentDeep};font-size:10px;margin-top:2px;`;
                cr.textContent = `reported by ${c.credit}`;
                textCol.appendChild(cr);
            }

            row.appendChild(textCol);
            body.appendChild(row);
        });

        box.appendChild(body);

        if (footer) {
            const f = document.createElement("div");
            f.style.cssText = `color:${UI.textSoft};font-size:10.5px;margin-top:5px;`
                + `border-top:1px solid ${UI.accentSoft};padding-top:4px;`;
            f.textContent = footer;
            box.appendChild(f);
        }

        log.appendChild(box);
        log.scrollTop = log.scrollHeight;
        return true;
    };
    if (!doAppend()) window.setTimeout(() => doAppend(), 300);
}

export function appendLocalLogBlock(title: string, lines: string[], color = UI.accent): void {
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;

        const box = document.createElement("div");
        box.style.cssText = `background:${UI.cardMuted};border-left:3px solid ${UI.accent};`
            + "border-radius:4px;padding:5px 8px 7px;margin:3px 0;font-size:12px;position:relative;";

        const head = document.createElement("div");
        head.style.cssText = `color:${UI.gold};font-weight:bold;padding-right:18px;`;
        head.textContent = title;
        box.appendChild(head);

        const close = document.createElement("span");
        close.textContent = "×";
        close.title = "Dismiss";
        close.style.cssText = `position:absolute;top:2px;right:6px;cursor:pointer;color:${UI.textMuted};`
            + "font-size:15px;line-height:1;padding:0 3px;";
        close.addEventListener("mouseenter", () => { close.style.color = UI.accent; });
        close.addEventListener("mouseleave", () => { close.style.color = UI.textMuted; });
        close.addEventListener("click", () => box.remove());
        box.appendChild(close);

        const body = document.createElement("div");
        body.style.cssText = "max-height:190px;overflow-y:auto;margin-top:3px;";
        for (const line of lines) {
            const row = document.createElement("div");
            row.style.cssText = `color:${color};font-style:italic;line-height:1.45;padding:1px 0;`;
            row.textContent = line;
            body.appendChild(row);
        }
        box.appendChild(body);

        log.appendChild(box);
        log.scrollTop = log.scrollHeight;
        return true;
    };
    if (!doAppend()) window.setTimeout(() => doAppend(), 300);
}

export function appendLocalLogLine(text: string, color = UI.accent): void {
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;
        const msg = document.createElement("div");
        msg.style.cssText = `
            background: ${UI.cardMuted};
            color: ${color};
            border-left: 3px solid ${UI.accent};
            padding: 4px 8px;
            margin: 2px 0;
            font-style: italic;
            font-size: 12px;
        `;
        msg.textContent = text;
        log.appendChild(msg);
        log.scrollTop = log.scrollHeight;
        return true;
    };
    if (!doAppend()) {
        window.setTimeout(() => doAppend(), 300);
    }
}
