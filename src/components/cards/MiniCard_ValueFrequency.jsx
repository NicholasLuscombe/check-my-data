import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { FW } from "../../constants/tokens.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { SUB_HEAD } from "../shared/styles.js";

export function MiniCard_ValueFrequency({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const passCounts = `${result.nSpikesPass1 || 0} full · ${result.nSpikesPass2 || 0} digit`;
  return (
    <MiniCardLayout result={result}
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
