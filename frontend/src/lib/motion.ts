import type { Transition } from "motion/react";

/** Critically damped default: settles without overshoot. */
export const spring: Transition = { type: "spring", bounce: 0, duration: 0.4 };
/** Snappier variant for small elements (menus, chips). */
export const springFast: Transition = { type: "spring", bounce: 0, duration: 0.28 };
/** Sheets and drawers: a touch of give, as Apple ships them. */
export const springSheet: Transition = { type: "spring", bounce: 0.12, duration: 0.38 };
