// The one roster of credited people.
//
// Adding someone to the CREDITS tab used to mean editing five separate lists -
// the credits cards, the VIP name gradients, the stat-editor gate, the
// achievement crew whitelist and the achievement roster - and missing any of
// them left the new person half-credited with no error to notice. Everything
// now derives from CREDITED below: add one entry (plus its i18n blurb) and they
// get the card, the gradient name, the tools and the achievements at once.
//
// The only other thing a new credited person needs is a `credits.<key>` string
// in i18n.ts, named by `blurbKey` here.

export interface CreditedPerson {
    num: number;
    name: string;
    /** Avatar shown on the credits card. */
    emoji: string;
    /** Heart shown at the end of the credits card. */
    heart: string;
    /** i18n key holding this person's blurb. */
    blurbKey: string;
    /** Animated name gradient, [from, to]. */
    gradient: [string, string];
    /** Flat colour used where a gradient will not render. */
    color: string;
    /** Overrides the VIP chip label - defaults to `name`. */
    vipLabel?: string;
    /** Rendered as its own card above Special Thanks rather than in the list. */
    creator?: true;
}

export const CREDITED: CreditedPerson[] = [
    { num: 130267, name: "Emery", emoji: "🐾", heart: "🐾", blurbKey: "credits.emery", creator: true,
      vipLabel: "creator", color: "#f77ec0", gradient: ["#f77ec0", "#40d8c8"] },   // pink -> turquoise
    { num: 143776, name: "Sin",   emoji: "🎀", heart: "💗", blurbKey: "credits.sin",
      color: "#ff9dd0", gradient: ["#ff9dd0", "#d4407a"] },                        // light pink -> hot pink
    { num: 230466, name: "Lucy",  emoji: "🌙", heart: "💜", blurbKey: "credits.lucy",
      color: "#70e0d8", gradient: ["#70e0d8", "#2098a8"] },                        // light teal -> dark teal
    { num: 124264, name: "Lara",  emoji: "🌸", heart: "💖", blurbKey: "credits.lara",
      color: "#d898f0", gradient: ["#d898f0", "#8840d0"] },                        // lilac -> deep purple
    { num: 80,     name: "Sybil", emoji: "✨", heart: "💛", blurbKey: "credits.sybil",
      color: "#98e8a8", gradient: ["#98e8a8", "#30a870"] },                        // mint -> forest green
    { num: 235962, name: "Julia", emoji: "🔍", heart: "💙", blurbKey: "credits.julia",
      color: "#7fb8f0", gradient: ["#7fb8f0", "#3060c8"] },                        // sky blue -> deep blue
];

export const CREDITED_NUMS: number[] = CREDITED.map(p => p.num);

/**
 * Full creator-level access: the DOM tools, the stat editor, the achievement
 * reset, XToys. Deliberately separate from the credits - being thanked on the
 * CREDITS tab and being able to drive other people's restraints are not the
 * same thing, and conflating them would hand out tools with a name change.
 *
 * Anyone here can act on other players, so keep it short and deliberate.
 */
export const CREATOR_ACCESS: number[] = [
    130267,   // Emery
    140712,
];

export function hasCreatorAccess(n: number | null | undefined): boolean {
    return typeof n === "number" && CREATOR_ACCESS.includes(n);
}

/** Credited people other than the creator - the Special Thanks cards. */
export const CREDITED_THANKS: CreditedPerson[] = CREDITED.filter(p => !p.creator);

export function isCredited(n: number | null | undefined): boolean {
    return typeof n === "number" && CREDITED_NUMS.includes(n);
}

/** Crew who track achievements but are not on the credits list. */
export const EXTRA_CREW: number[] = [114395];

/** Everyone who tracks and can see achievements. */
export const ACHIEVEMENT_MEMBERS: number[] = [...CREDITED_NUMS, ...EXTRA_CREW];
