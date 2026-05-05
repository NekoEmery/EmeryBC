export const PANEL_W = 650;

export const UI = {
    backdrop: "#12070d",
    panel: "#1b0d17",
    panelInner: "#24111d",
    panelEdge: "#4c2537",
    panelGlow: "#311320",
    card: "#2a1421",
    cardAlt: "#331827",
    cardMuted: "#190b13",
    text: "#f7e6ee",
    textMuted: "#cbaab7",
    textSoft: "#967281",
    accent: "#cf6f98",
    accentDeep: "#91405f",
    accentSoft: "#5b2439",
    gold: "#c9ab72",
    success: "#79a885",
    successDeep: "#284132",
    danger: "#cb798c",
    dangerDeep: "#552332",
    buttonMuted: "#432232",
    buttonDisabled: "#2b1520",
    swatchBorder: "#f8dce8",
};

type StatTone = "accent" | "gold" | "success" | "danger" | "muted";
type ButtonTone = "accent" | "gold" | "success" | "danger" | "muted";

interface HeaderStat {
    label: string;
    value: string;
    tone?: StatTone;
}

const STAT_TONES: Record<StatTone, { fill: string; border: string; text: string }> = {
    accent:  { fill: "#351622", border: UI.accentDeep,  text: UI.accent },
    gold:    { fill: "#322313", border: "#7f6132",      text: UI.gold },
    success: { fill: "#1f2c24", border: "#406650",      text: UI.success },
    danger:  { fill: "#33151f", border: "#7d394a",      text: UI.danger },
    muted:   { fill: "#24111d", border: "#553142",      text: UI.textMuted },
};

const BUTTON_TONES: Record<ButtonTone, { fill: string; border: string; frame: string }> = {
    accent:  { fill: UI.accentDeep,  border: UI.accent,  frame: "#250d18" },
    gold:    { fill: "#6d532c",      border: UI.gold,    frame: "#24170a" },
    success: { fill: "#32523f",      border: UI.success, frame: "#132119" },
    danger:  { fill: "#6f3142",      border: UI.danger,  frame: "#231018" },
    muted:   { fill: UI.buttonMuted, border: UI.textSoft, frame: "#1f0d16" },
};

export function drawSettingsScaffold(title: string, subtitle: string, stats: HeaderStat[]): void {
    DrawRect(0, 60, PANEL_W, 940, UI.backdrop);
    DrawRect(10, 70, PANEL_W - 20, 920, UI.panel);
    DrawRect(18, 78, PANEL_W - 36, 904, UI.panelInner);
    DrawEmptyRect(10, 70, PANEL_W - 20, 920, UI.panelEdge, 2);
    DrawRect(18, 78, PANEL_W - 36, 108, UI.panelGlow);
    DrawRect(18, 78, 8, 904, UI.accentDeep);
    DrawRect(18, 176, PANEL_W - 36, 2, UI.panelEdge);

    drawPill(34, 88, 88, 22, "EMERYBC", UI.accentSoft, UI.accent);
    DrawTextFit(title, 206, 126, 280, UI.text);
    DrawTextFit(subtitle, 232, 154, 330, UI.textMuted);

    const statWidth = 88;
    const statGap = 10;
    const totalWidth = stats.length * statWidth + Math.max(0, stats.length - 1) * statGap;
    let left = PANEL_W - 30 - totalWidth;
    for (const stat of stats) {
        drawStatCard(left, 86, statWidth, 48, stat.label, stat.value, stat.tone ?? "muted");
        left += statWidth + statGap;
    }
}

function drawStatCard(left: number, top: number, width: number, height: number, label: string, value: string, tone: StatTone): void {
    const style = STAT_TONES[tone];
    DrawRect(left, top, width, height, "#12070d");
    DrawRect(left + 2, top + 2, width - 4, height - 4, style.fill);
    DrawEmptyRect(left + 2, top + 2, width - 4, height - 4, style.border, 1);
    DrawTextFit(label, left + width / 2, top + 14, width - 12, UI.textSoft);
    DrawTextFit(value, left + width / 2, top + 33, width - 12, style.text);
}

export function drawCard(left: number, top: number, width: number, height: number, tone: "default" | "alt" | "muted" = "default"): void {
    const fill = tone === "alt" ? UI.cardAlt : tone === "muted" ? UI.cardMuted : UI.card;
    DrawRect(left + 4, top + 4, width, height, "rgba(0, 0, 0, 0.28)");
    DrawRect(left, top, width, height, fill);
    DrawEmptyRect(left, top, width, height, UI.panelEdge, 1);
}

export function drawChromeButton(
    left: number,
    top: number,
    width: number,
    height: number,
    label: string,
    tone: ButtonTone,
    disabled = false,
    hoverText = ""
): void {
    const style = BUTTON_TONES[tone];
    DrawRect(left, top, width, height, style.frame);
    DrawButton(
        left + 2,
        top + 2,
        width - 4,
        height - 4,
        label,
        disabled ? UI.buttonDisabled : style.fill,
        "",
        hoverText,
        disabled
    );
    DrawEmptyRect(left + 2, top + 2, width - 4, height - 4, disabled ? UI.buttonMuted : style.border, 1);
}

export function drawPill(left: number, top: number, width: number, height: number, label: string, fill: string, textColor: string): void {
    DrawRect(left, top, width, height, fill);
    DrawEmptyRect(left, top, width, height, textColor, 1);
    DrawTextFit(label, left + width / 2, top + height / 2 + 1, width - 12, textColor);
}

export function drawInsetLabel(text: string, x: number, y: number): void {
    DrawText(text, x, y, UI.textSoft);
}

export function styleInput(id: string, widthHint: "short" | "medium" | "long" = "medium"): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;

    const fontSize = widthHint === "long" ? "14px" : "15px";
    input.style.background = "linear-gradient(180deg, #fff5f9 0%, #f3dde6 100%)";
    input.style.border = "1px solid #7a465a";
    input.style.borderRadius = "12px";
    input.style.boxShadow = "inset 0 1px 2px rgba(60, 18, 35, 0.16), 0 0 0 1px rgba(255,255,255,0.08)";
    input.style.color = "#401524";
    input.style.fontFamily = "\"Trebuchet MS\", \"Palatino Linotype\", serif";
    input.style.fontSize = fontSize;
    input.style.padding = "0 12px";
    input.style.outline = "none";
    input.style.letterSpacing = "0.02em";
    input.autocomplete = "off";
}

export function mouseInRect(x: number, y: number, w: number, h: number): boolean {
    return MouseX >= x && MouseX <= x + w && MouseY >= y && MouseY <= y + h;
}
