/* ── WhereToLookSection — narrative-layered WHERE TO LOOK ──
   Layer 0:  Summary verdict (prose or bullets)
   Layer 1A: Dataset-wide findings (global tests, no numbers)
   Layer 1B: Localised findings (non-global tests, numbered, click-to-highlight)
   Layer 2:  Spatial clusters (convergence hotspots) — via middleContent
   Layer 3:  Structural patterns (duplicate/offset groups) — via middleContent
   Layer 4:  Individual localizing findings — via middleContent
   Owns activeTestKey state for click-to-highlight between Layer 1B ↔ HotspotExcerpt.
   Clean dataset rule: ≤3 total items → skip layered structure for Layers 2-4.

   S126a: reads findings[] for Layer 0/1A/1B/4 instead of deriving from
   results directly. Hotspots and groups still come from convergence
   (cross-finding aggregations). results retained for the layoutTitle
   summary text and as a fallback when the parent doesn't pass findings. */

import { useState, useRef, useMemo, useCallback } from "react";
import { C, FS, FW, FF, CR, SIGNAL, MECH_COLOR } from "../../constants/tokens.js";
import { MECHANISMS, TEST_MECHANISM, DISPLAY_NAMES, GLOBAL_TESTS, MECHANISM_ORDER, RANK_NUMS, GROUP_MARKERS, TEST_KEY_TO_NAME } from "../../constants/mechanisms.js";
import { buildLayerZeroSummary } from "../../analysis/layerZeroSummary.js";
import { HotspotExcerpt } from "./HotspotExcerpt.jsx";

// ── Collapsible wrapper ──
function Collapsible({ label, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 4 }}>
      <div onClick={() => setOpen(!open)} style={{
        cursor: "pointer", fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3,
        padding: "4px 0", userSelect: "none",
      }}>
        <span style={{ marginRight: 4 }}>{open ? "▾" : "▸"}</span>
        {label}{count != null ? ` (${count})` : ""}
      </div>
      {open && <div style={{ paddingLeft: 4 }}>{children}</div>}
    </div>
  );
}

// ── Layer 0: Summary verdict ──
function LayerZeroSummary({ results }) {
  const summary = buildLayerZeroSummary(results);
  if (!summary) return null;

  const { count, phrases } = summary;
  const noun = count === 1 ? "test" : "tests";

  // 1 category: single sentence
  if (phrases.length === 1) {
    return (
      <div style={{ fontSize: FS.base, fontFamily: FF.UI, color: C.TEXT_2, lineHeight: "1.6", marginBottom: 12 }}>
        {count} {noun} flagged. {phrases[0]}.
      </div>
    );
  }

  // 2 categories: sentence with "and"
  if (phrases.length === 2) {
    return (
      <div style={{ fontSize: FS.base, fontFamily: FF.UI, color: C.TEXT_2, lineHeight: "1.6", marginBottom: 12 }}>
        {count} {noun} flagged. {phrases[0]} and {phrases[1].charAt(0).toLowerCase() + phrases[1].slice(1)}.
      </div>
    );
  }

  // 3+ categories: bullet list
  return (
    <div style={{ fontSize: FS.base, fontFamily: FF.UI, color: C.TEXT_2, lineHeight: "1.6", marginBottom: 12 }}>
      <div>{count} {noun} flagged:</div>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
        {phrases.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Shared: format hotspot location ──
function fmtHotspotLoc(h, coordCtx) {
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const r1 = fr(h.rowStart), r2 = fr(h.rowEnd);
  return r1 === r2 ? `Row ${r1}` : `Rows ${r1}–${r2}`;
}

// ── Main component ──
//
// S126b: optional `omitHotspotExcerpt` mode — when true, renders Layer
// 0/1A/1B narrative + middleContent (Layers 2-3) as flat siblings without
// embedding HotspotExcerpt. Click-to-highlight on Layer 1B has no inline
// minimap to drive in this mode; activeTestKey is still tracked so a
// future hover/highlight surface can read it. middleContent's hotspot
// click handler uses `externalScrollRef` (parent-supplied) to drive the
// HotspotExcerpt rendered elsewhere (e.g. inside StickySurface).
export function WhereToLookSection({ findings, results, heatmapProps,
  omitHotspotExcerpt = false, externalScrollRef = null }) {
  const [activeTestKey, setActiveTestKey] = useState(null);
  const scrollFnRef = useRef(null);
  const { convergence, coordCtx, rowMap } = heatmapProps;
  // S126a: findings[] is the canonical source. Fall back to an empty
  // list if the parent didn't provide one — keeps the component callable
  // outside ReportView (e.g. from tests).
  const findingsList = findings || [];
  const rawHotspots = convergence?.hotspots || [];
  // Dedup hotspots that share the same row range (can happen when separate column
  // regions at the same row produce distinct connected components)
  const hotspots = useMemo(() => {
    if (rawHotspots.length <= 1) return rawHotspots;
    const merged = [];
    const seen = new Set();
    for (const h of rawHotspots) {
      const key = `${h.rowStart}-${h.rowEnd}`;
      if (seen.has(key)) {
        // Merge into existing entry
        const prev = merged.find(m => `${m.rowStart}-${m.rowEnd}` === key);
        if (prev) {
          prev.colStart = Math.min(prev.colStart, h.colStart);
          prev.colEnd = Math.max(prev.colEnd, h.colEnd);
          prev.maxCount = Math.max(prev.maxCount, h.maxCount);
          for (const t of h.tests) { if (!prev.tests.includes(t)) prev.tests.push(t); }
          for (const c of h.categories) { if (!prev.categories.includes(c)) prev.categories.push(c); }
          prev.score = prev.maxCount * prev.tests.length;
          prev.cellCount += h.cellCount;
          prev.maxSeverity = Math.max(prev.maxSeverity, h.maxSeverity);
        }
      } else {
        seen.add(key);
        merged.push({ ...h, tests: [...h.tests], categories: [...h.categories] });
      }
    }
    return merged;
  }, [rawHotspots]);
  const groups = convergence?.groups || [];
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  // Convert 0-based matrix row → display file row (for finding templates)
  const toFileRow = useCallback((matRow) => fr(rowMap ? (rowMap[matRow] ?? matRow) : matRow), [fr, rowMap]);

  // Compute group marker map: globalId → marker string
  const groupMarkerMap = useMemo(() => {
    const map = new Map();
    const typeIdx = { exact: 0, offset: 0 };
    for (const g of groups) {
      const markers = GROUP_MARKERS[g.type] || RANK_NUMS;
      const idx = typeIdx[g.type] ?? 0;
      map.set(g.id, markers[idx] || `(${idx + 1})`);
      if (g.type in typeIdx) typeIdx[g.type]++;
    }
    return map;
  }, [groups]);

  // Individual localizing findings: flagged non-global findings whose test
  // isn't already represented as a structural group (DupDet/ConstOffset).
  // S126a: derive from findings[] rather than re-filtering results.
  const coveredByGroups = useMemo(() => {
    const names = new Set();
    for (const key of Object.keys(TEST_KEY_TO_NAME)) {
      if (groups.some(g => g.testKey === key)) names.add(TEST_KEY_TO_NAME[key]);
    }
    return names;
  }, [groups]);

  const individualFindings = useMemo(() => {
    return findingsList.filter(f =>
      f.type === "localised" &&
      !coveredByGroups.has(f.tests?.[0]?.testId)
    );
  }, [findingsList, coveredByGroups]);

  // Total narrative items for clean-dataset rule (Layers 2-4 only)
  const totalItems = hotspots.length + groups.length + individualFindings.length;
  const useLayered = totalItems > 3;

  // Scroll coordination: HotspotExcerpt registers its scrollToHotspot
  const onScrollReady = useCallback((fn) => { scrollFnRef.current = fn; }, []);

  // Hotspot scroll dispatch — uses external ref (sticky path) if supplied,
  // otherwise the internal scrollFnRef set via HotspotExcerpt's onScrollReady.
  const dispatchHotspotScroll = useCallback((idx) => {
    const ext = externalScrollRef?.current;
    if (ext && typeof ext.scrollToHotspot === "function") {
      ext.scrollToHotspot(idx);
    } else {
      scrollFnRef.current?.(idx);
    }
  }, [externalScrollRef]);

  // ── Build middleContent (Layers 2-4) for layered mode ──
  const middleContent = useLayered ? (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Layer 2: Spatial clusters */}
      {hotspots.length > 0 && (() => {
        const multiRow = hotspots.map((h, i) => ({ ...h, origIdx: i })).filter(h => h.rowStart !== h.rowEnd);
        const singleRow = hotspots.map((h, i) => ({ ...h, origIdx: i })).filter(h => h.rowStart === h.rowEnd);
        const largest = multiRow[0] || hotspots[0]; // prefer largest multi-row
        const mainCount = multiRow.length || hotspots.length;
        const summaryText = `${mainCount} convergence hotspot${mainCount !== 1 ? "s" : ""} detected. The largest spans ${fmtHotspotLoc(largest, coordCtx)}.`;

        const renderMultiRow = () => multiRow.map((h, i) => (
          <div key={`h${h.origIdx}`} onClick={() => dispatchHotspotScroll(h.origIdx)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
            cursor: "pointer", borderRadius: CR.SM,
          }}>
            <span style={{ fontSize: FS.base, fontWeight: FW.BOLD, color: C.TEXT }}>{RANK_NUMS[i] || `(${i + 1})`}</span>
            <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT }}>{fmtHotspotLoc(h, coordCtx)}</span>
            <span style={{ fontSize: FS.xs, color: C.TEXT_3 }}>
              — {h.categories.map(cat => MECHANISMS[cat]?.label || cat).join(", ")}
            </span>
          </div>
        ));

        const renderSingleRow = () => singleRow.map(h => (
          <div key={`h${h.origIdx}`} onClick={() => dispatchHotspotScroll(h.origIdx)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
            cursor: "pointer", borderRadius: CR.SM,
          }}>
            <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT }}>{fmtHotspotLoc(h, coordCtx)}</span>
            <span style={{ fontSize: FS.xs, color: C.TEXT_3 }}>
              — {h.categories.map(cat => MECHANISMS[cat]?.label || cat).join(", ")}
            </span>
          </div>
        ));

        return (
          <div>
            <div style={{ fontSize: FS.base, color: C.TEXT_2, padding: "4px 8px" }}>{summaryText}</div>
            {multiRow.length > 3
              ? <Collapsible label="Show all hotspots" count={multiRow.length}>{renderMultiRow()}</Collapsible>
              : multiRow.length > 0 ? renderMultiRow() : null
            }
            {singleRow.length > 0 && (
              <Collapsible label={`${singleRow.length} additional single-row hotspot${singleRow.length !== 1 ? "s" : ""} detected`}>
                {renderSingleRow()}
              </Collapsible>
            )}
          </div>
        );
      })()}

      {/* Layer 3: Structural patterns */}
      {groups.length > 0 && (() => {
        // Partition by type
        const byType = {};
        for (const g of groups) {
          if (!byType[g.type]) byType[g.type] = [];
          byType[g.type].push(g);
        }
        const typeLabel = { exact: "duplicate group", offset: "constant-offset pair" };
        // DupDet (exact) groups are redundant with click-to-highlight on the card — omit from Layer 3
        delete byType.exact;

        return Object.entries(byType).map(([type, tGroups]) => {
          const label = typeLabel[type] || type;
          const plural = tGroups.length !== 1 ? "s" : "";
          const summaryText = `${tGroups.length} ${label}${plural} detected.`;

          const renderEntries = () => tGroups.map(g => {
            const marker = groupMarkerMap.get(g.id) || `(${g.id + 1})`;
            const rowNums = g.rows.map(r => fr(r)).join(" & ");
            const desc = g.type === "exact" ? "Exact duplicates"
              : g.type === "offset" ? `Constant offset (${g.offset})`
              : `Cross-condition pair${g.cond1 ? ` (${g.cond1} ↔ ${g.cond2})` : ""}`;
            return (
              <div key={`g${g.id}`} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                fontSize: FS.base, color: C.TEXT_2,
              }}>
                <span style={{ color: MECH_COLOR[TEST_MECHANISM[TEST_KEY_TO_NAME[g.testKey]]] || C.TEXT_3, fontWeight: FW.BOLD, flexShrink: 0 }}>
                  {marker}
                </span>
                <span>Rows {rowNums} — {desc}</span>
              </div>
            );
          });

          return (
            <div key={type}>
              <div style={{ fontSize: FS.base, color: C.TEXT_2, padding: "4px 8px" }}>{summaryText}</div>
              {tGroups.length > 3
                ? <Collapsible label={`Show all ${label}${plural}`} count={tGroups.length}>{renderEntries()}</Collapsible>
                : renderEntries()
              }
            </div>
          );
        });
      })()}

      {/* Layer 4: Individual localizing findings — omitted; already shown in Layer 1B Key Findings */}
    </div>
  ) : null;

  return (
    <>
      {/* Layer 0: Summary verdict — "<N> tests flagged: <bullets>" intro */}
      <LayerZeroSummary results={results} />

      {/* S126b addendum 2: structured Layer 1A Dataset-wide / Layer 1B
          Localised finding blocks suppressed in §3 WHERE TO LOOK. The
          sticky surface owns the structured nav layer (pills + chips);
          §3 is the deep-look surface (intro + minimap+table). */}

      {/* Layers 2-4 + hotspot detail table.
          omitHotspotExcerpt: caller renders HotspotExcerpt itself (sticky path).
          We just emit the layered middleContent (Layers 2-3) inline, with
          its hotspot click handlers wired to externalScrollRef. */}
      {omitHotspotExcerpt
        ? (middleContent || null)
        : (
          <HotspotExcerpt {...heatmapProps} activeTestKey={activeTestKey}
            groupMarkerMap={groupMarkerMap} middleContent={middleContent}
            onScrollReady={onScrollReady} results={results} />
        )}
    </>
  );
}
