/* ── Pulse-target context (S126b §1.7) ──
   Symmetric click model: clicking a pill/chip/card/minimap-region
   triggers a transient pulse on every related surface. This context
   is the shared bus.

   Targets are keyed by string:
     "pill:<testId>"
     "chip:<regionNumber>"
     "region:<regionNumber>"
     "card:<testId>"

   trigger(...keys) sets each key's tick to a monotonic counter; surfaces
   subscribed to that key listen for tick changes and play a CSS keyframe.

   The provider stores a Map<key, tick>. Surfaces re-render only via the
   `usePulseTick(key)` hook, which subscribes selectively. CSS keyframes
   are driven from the rendered key+tick string via React's animationend
   plus a re-key trick: the surface element's `key` includes the tick so
   each new pulse remounts the animation cleanly. */

import { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";

const PulseContext = createContext({
  ticks: new Map(),
  trigger: () => {},
});

export function PulseProvider({ children }) {
  // Internal counter — guarantees a strictly increasing tick per fire so
  // back-to-back pulses on the same target re-mount the keyframe.
  const counterRef = useRef(0);
  const [ticks, setTicks] = useState(() => new Map());

  const trigger = useCallback((...keys) => {
    if (!keys.length) return;
    counterRef.current += 1;
    const tick = counterRef.current;
    setTicks(prev => {
      const next = new Map(prev);
      for (const k of keys) {
        if (k) next.set(k, tick);
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ticks, trigger }), [ticks, trigger]);
  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

/** Subscribe a single key. Returns the latest tick (0 if never fired). */
export function usePulseTick(key) {
  const { ticks } = useContext(PulseContext);
  return key ? (ticks.get(key) || 0) : 0;
}

export function usePulseTrigger() {
  return useContext(PulseContext).trigger;
}
