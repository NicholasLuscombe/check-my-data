/* ── HotspotExcerpt — back-compat re-export shim (S126c-b) ──
   The canonical home of the deep-look table-excerpt surface moved to
   `src/components/forensics/ExcerptTable.jsx` at S126c-b (Phase 1
   physical decouple of HotspotExcerpt's table internals from the
   inline MinimapStrip surface that S126c-a extracted).

   This shim exists solely so that `views/WhereToLookSection.jsx`'s
   import (`import { HotspotExcerpt } from "./HotspotExcerpt.jsx"`)
   continues to resolve — WhereToLookSection itself is dormant in
   source post-S126b add-3 (no live import path mounts it), so this
   re-export is a dead branch in the active build graph.

   Disposition (surfaced for Chat at S126c-b close-out): keep the
   shim + WhereToLookSection dormant for now; both retire together
   in the post-S126c dead-code prune. Removing today would conflate
   the dead-code prune with the S126c-b decouple, mixing two
   independent decisions. */

export { ExcerptTable as HotspotExcerpt } from "../forensics/ExcerptTable.jsx";
