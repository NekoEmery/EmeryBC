import { UI } from "./ui";

/**
 * One dismissible block in the chat log, rather than a run of separate lines.
 *
 * Long output posted line by line cannot be cleared without scrolling past all
 * of it, which is why a dismiss control was asked for - and a control per line
 * would be worse than none. Kept scrollable so a long list never buries the
 * conversation underneath it.
 */
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
