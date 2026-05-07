import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { C, TF, FW, FF, CC } from "../../constants/tokens.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { SUB_HEAD } from "../shared/styles.js";

export function MiniCard_ValueFrequency({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const nSpikes = result.nSpikes || 0;
  const drivingPass = result.drivingPass;
  // Pass-2 multi-spike gate (S114 Phase 2): single-spike pass-2 is
  // informational only; headline degrades to LOW-style copy (with a
  // brief note) to match existing LOW conventions.
  const pass2SingleSpikeInformational = result.pass2SpikeCount === 1
    && result.pass2MultiSpikeCleared === false
    && (result.nSpikesPass1 || 0) === 0;

  let headline;
  if (result.flag === "LOW" && pass2SingleSpikeInformational) {
    headline = "Fractional digit patterns noted — one substring exceeds local expectation, but single-substring evidence is informational only.";
  } else if (result.flag === "LOW") {
    headline = "No values appear more often than expected — frequency distribution is consistent with instrument output.";
  } else if (result.keyboardPattern) {
    headline = `${nSpikes} value${nSpikes !== 1 ? "s appear" : " appears"} far more often than expected, with a numpad-adjacent pattern suggesting keyboard entry.`;
  } else if (drivingPass === "digit") {
    const topSpike = details.find(d => d.pass === "digit") || details[0];
    const nP2 = result.nSpikesPass2 || 0;
    headline = topSpike
      ? `Pattern: ${topSpike.value} appears ${topSpike.observed}× (expected ${topSpike.expected}) across differing integer parts — ${nP2} fractional template${nP2 !== 1 ? "s" : ""} over-represented.`
      : `${nP2} fractional-digit template${nP2 !== 1 ? "s" : ""} repeat more often than expected.`;
  } else {
    const topSpike = details.find(d => d.pass === "full") || details[0];
    headline = topSpike
      ? `Value ${topSpike.value} appears ${topSpike.observed}× (expected ${topSpike.expected}) — ${nSpikes} value${nSpikes !== 1 ? "s" : ""} over-represented.`
      : `${nSpikes} value${nSpikes !== 1 ? "s" : ""} appear more often than expected.`;
  }
  const desc = "Instruments produce values whose frequencies follow a smooth distribution. When data is typed by hand, certain 'easy' values (round numbers, repeated digits) get used too often — creating detectable frequency spikes. The digit-substring pass additionally detects reuse of fractional-digit templates (e.g. '.07' repeating across differing integer parts).";
  const passCounts = `${result.nSpikesPass1 || 0} full · ${result.nSpikesPass2 || 0} digit`;
  return (
    <MiniCardLayout result={result} headline={headline} desc={desc}
      footer={`${result.nValues||"?"} values · ${passCounts} · ${fmtPBadge(result.primaryP)}`}
      lookFor="Check whether the over-represented values are round numbers (10, 50, 100) or follow a numpad pattern (12, 23, 34). For digit-pass spikes, look at whether the same fractional substring repeats across otherwise-unrelated rows — template-copied fabrication. Cross-reference with the terminal digit test — if both flag, the evidence for manual entry is stronger. Look at where these values appear in the dataset: are they clustered in specific rows or conditions?"
      implications="Individual values that spike above their neighbours can reflect natural modes in the data — for example, a detection limit that many samples hit. They can also indicate keyboard-entry patterns, where certain values are typed more often due to motor habits or cognitive biases. Spikes at adjacent numpad values (e.g. 67 and 78) are particularly characteristic of manual entry. A digit-substring spike (same fractional digits across differing integer parts) is characteristic of template-copied fabrication.">

      {details.length > 0 && (<>
        {result.keyboardPattern && (
          <CardBanner type="caution">
            <strong>Adjacent-key pattern detected</strong> — spike values include numpad diagonal entries (12, 23, 34, 45…). Consistent with keyboard entry rather than instrument output.
          </CardBanner>
        )}
        <div style={SUB_HEAD}>Over-represented values</div>
        <EvidenceTable
          columns={[
            {label:"Value"}, {label:"Pass"}, {label:"Observed"}, {label:"Expected"}, {label:"Ratio"}, {label:"Adj P"},
          ]}
          identifierColumns={2}
          rows={details.map(d => [
            {value:d.value, style:{fontWeight:FW.BOLD}},
            d.pass === "digit" ? "digit" : "full",
            d.observed,
            d.expected,
            d.ratio,
            fmtP(parseFloat(d.adjP)),
          ])}
        />
      </>)}

    </MiniCardLayout>
  );
}
