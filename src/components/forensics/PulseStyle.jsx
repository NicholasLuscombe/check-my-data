/* ── Pulse keyframe injection (S126b §1.7) ──
   Mounted once near the top of the Forensics document branch so the
   `@keyframes df-pulse` rule is available for all surfaces using
   `usePulseAnimation`. Pure CSS — no JS animation loop.

   Restart pattern: React's `key` prop doesn't restart CSS animations on
   the same DOM node; we replay via `el.style.animation = 'none'` +
   forced reflow + reassign. The `usePulseAnimation` hook below
   encapsulates this so call sites just wire a ref. */

import { useEffect, useRef } from "react";
import { usePulseTick } from "./pulseContext.jsx";

const STYLE_ID = "df-pulse-keyframes";
const KEYFRAMES = `
@keyframes df-pulse {
  0%   { box-shadow: 0 0 0 0 var(--df-pulse-color, transparent); }
  20%  { box-shadow: 0 0 0 4px var(--df-pulse-color, transparent); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
}
`;

export function PulseStyle() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = KEYFRAMES;
    document.head.appendChild(el);
  }, []);
  return null;
}

const ANIMATION = "df-pulse 2.4s ease-out 1";

/**
 * Subscribe to pulse ticks for `key` and replay the CSS animation on the
 * returned ref's element each time the tick increments. Color is the
 * severity-tinted CSS value piped into the keyframe via the
 * --df-pulse-color custom property.
 */
export function usePulseAnimation(key, color) {
  const tick = usePulseTick(key);
  const ref = useRef(null);
  useEffect(() => {
    if (!tick || !ref.current) return;
    const el = ref.current;
    el.style.setProperty("--df-pulse-color", color);
    el.style.animation = "none";
    // Force reflow so the next assignment restarts the animation.
    void el.offsetHeight;
    el.style.animation = ANIMATION;
  }, [tick, color]);
  return ref;
}
