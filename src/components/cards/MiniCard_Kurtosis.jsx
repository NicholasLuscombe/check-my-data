/* ── MiniCard: Kurtosis ── */

import { C, CC, FS, FW, FF, M, CP, CS, CF, CR, SIGNAL, BADGE } from "../../constants/tokens.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { KurtosisDistPlot } from "../plots/KurtosisDistPlot.jsx";
import { DotStrip } from "../plots/DotStrip.jsx";
import { HBarPlot } from "../plots/HBarPlot.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_Kurtosis({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const normDiffs = result.normDiffs;
  const pk = result.pooledKurtosis;
  const condK = result.condKurtosis;
  // Direction from kurtDeviation (observed - simulated): negative = platykurtic, positive = leptokurtic
  const kDev = result.kurtDeviation != null ? Number(result.kurtDeviation) : null;
  const isPlat = kDev != null ? kDev < 0 : (pk != null && pk < -0.5);

  // ── Chart legend ──
  const legendItems = [
    { color: CC.OBS, label: "Observed", opacity: 0.35 },
    { color: CC.EXP, label: "Expected (simulated null)", swatchType: "line" },
  ];

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? (isPlat ? "Noise distribution too flat and wide" : "Noise distribution too peaked and narrow")
        : "Noise distribution as expected"}
      lookFor={isPlat ? "This pattern is not visible by scanning individual cells — each value looks plausible on its own, but replicate differences are more evenly spaced than real instruments produce. Ask the authors for the original instrument output files and compare them against the submitted dataset. Check whether data was rounded, averaged, or manually adjusted before upload." : "Replicate differences cluster too tightly around zero with occasional large jumps — suggesting data from mixed sources or selective editing of outliers. Check whether the large-jump rows correspond to key experimental results, and whether different conditions show different noise patterns." }
      implications={isPlat
        ? "Noise that is flatter than expected — evenly spread without the central peak of a bell curve — is unusual for instrument noise and can indicate values generated from a uniform distribution rather than measured."
        : "Noise that is more peaked than expected — concentrated near the centre with sparse shoulders — can result from heavy-tailed biological variation or heterogeneous sample quality."}>

      {/* ── Global distribution chart ── */}
      {normDiffs?.length ? <>
        {/* S210 (multi-surface): primary-surface heading dropped — the footer
            fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
        <PlotLayout>
          <KurtosisDistPlot normDiffs={normDiffs} simDiffs={result.simDiffs}
            pooledKurtosis={pk} simKurtosis={result.simKurtosis} flag={result.flag}/>
        </PlotLayout>
        <ChartLegend items={legendItems} />
      </> : (() => {
        const pairData = sub.length ? sub : details;
        if(pairData.length && pairData[0].kurtosis!==undefined) {
          return <PlotLayout><DotStrip items={pairData} valueKey="kurtosis" refMin={-0.5} refMax={0.5}
            refLabel="≈ 0 (bell-shaped)" xlabel="Noise shape index (negative = too uniform, positive = too peaked)"
            colorKey="significant"/></PlotLayout>;
        }
        const items=details.map(d=>({...d,frac:d.ofPairs>0?(d.platykurtic/d.ofPairs)*100:0}));
        return <PlotLayout><HBarPlot items={items} accessor={d=>d.frac}
          xlabel="% replicate pairs with unusually uniform noise"
          refVal={0} refLabel="0 expected" maxOverride={100}/></PlotLayout>;
      })()}

      {/* ── Condition-stratified section ── */}
      {condK?.length >= 2 && (isAgg || result.flag === "HIGH" || condK.some(c => c.verdict !== "clear")) && (
        <div style={{marginTop: BLOCK_GAP}}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>
            Noise shape by condition
            {condK.promoted && <span style={{marginLeft:"8px",fontSize:FS.xs,color:BADGE.PROMOTED.text,background:BADGE.PROMOTED.bg,border:`1px solid ${BADGE.PROMOTED.border}`,borderRadius:CR.SM,padding:"1px 5px"}}>differs between conditions — promoted</span>}
          </div>
          {(() => {
            const simK = result.simKurtosis;
            const expectedKStr = simK != null ? simK.toFixed(4) : "—";
            const etCols = [{label:"Condition"},{label:"Rows",align:"right"},{label:"Observed κ",align:"right"},{label:"Expected κ",align:"right"},{label:"p",align:"right"},{label:"Finding"}];
            const etRows = condK.map(c => {
              const isFlagged = c.verdict === "flagged";
              const isNoted = c.verdict === "noted" || isFlagged;
              const cIsPlat = c.platykurtic && isNoted;
              const cIsLepto = c.isLeptokurtic;
              const flagColor = cIsPlat ? (isFlagged ? CC.THRESH : SIGNAL.AMBER.dot) : cIsLepto ? (isFlagged ? CC.THRESH : SIGNAL.AMBER.dot) : CC.OBS;
              const shapeLabel = cIsPlat ? (isFlagged ? "Too uniform" : "Possibly uniform") : cIsLepto ? (isFlagged ? "Too peaked" : "Possibly peaked") : "Normal";
              const condColor = condColorMap[c.condition]?.text;
              return [
                condColor ? {value: c.condition, style: {color: condColor}} : c.condition,
                c.n,
                c.kurtosis,
                expectedKStr,
                c.p,
                {value:shapeLabel, style:{color:flagColor,fontFamily:FF.UI}},
              ];
            });
            return <EvidenceTable columns={etCols} rows={etRows} identifierColumns={1} />;
          })()}

          {/* ── Per-condition sparklines ── */}
          {condK.some(c => c.normDiffs?.length >= 20) && (() => {
            const W=CP.W_XS, H=110, PL=28, PR=8, PT=10, PB=32;
            const CW=W-PL-PR, CH=H-PT-PB;
            const BINS=24, XMIN=-4.5, XMAX=4.5, binW=(XMAX-XMIN)/BINS;
            function buildH(vals) {
              const c=new Array(BINS).fill(0);
              vals.forEach(v=>{const bi=Math.floor((v-XMIN)/binW);if(bi>=0&&bi<BINS)c[bi]++;});
              const n=vals.length;
              return c.map(x=>x/(n*binW));
            }
            const allDens = condK.flatMap(c => c.normDiffs?.length>=20 ? buildH(c.normDiffs) : []);
            const simD = result.simDiffs?.length ? buildH(result.simDiffs) : [];
            const rawMax = Math.max(...allDens, ...simD, 0.35);
            // ~3 ticks for small multiples
            const NICE=[0.1,0.2,0.25,0.3,0.5,1.0];
            const rough=rawMax/3;
            const tickStep=NICE.find(n=>n>=rough)||1.0;
            const topTick = Math.ceil(rawMax / tickStep) * tickStep;
            const yMax = topTick * 1.08;
            const xs = x => PL+(x-XMIN)/(XMAX-XMIN)*CW;
            const ys = y => PT+CH-(y/yMax)*CH;
            const xTicks=[-3,-1,0,1,3];
            const miniSimPath = simD.length ? (() => {
              let d = `M${xs(XMIN)},${ys(0)}`;
              for (let i = 0; i < simD.length; i++) {
                const x0 = xs(XMIN + i * binW), x1 = xs(XMIN + (i+1) * binW);
                d += ` L${x0},${ys(simD[i])} L${x1},${ys(simD[i])}`;
              }
              d += ` L${xs(XMAX)},${ys(0)}`;
              return d;
            })() : null;
            return (
              <>
                {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
                <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Per-condition noise shape</div>
                <PlotLayout>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px",justifyContent:"center"}}>
                    {condK.filter(c=>c.normDiffs?.length>=20).map((c,ci)=>{
                      const obsDens=buildH(c.normDiffs);
                      const cIsFlagged = c.verdict === "flagged";
                      const cIsNoted = c.verdict === "noted" || cIsFlagged;
                      const cIsPlat=c.platykurtic && cIsNoted;
                      const cIsLepto=c.isLeptokurtic;
                      const col=cIsPlat?(cIsFlagged?CC.THRESH:SIGNAL.AMBER.dot):cIsLepto?(cIsFlagged?CC.THRESH:SIGNAL.AMBER.dot):CC.OBS;
                      const cLabel=cIsPlat?"flatter":cIsLepto?"more peaked":"typical";
                      return (
                        <div key={ci} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                          <div style={{fontSize:FS.sm,fontWeight:FW.SEMI,marginBottom:"2px"}}>
                            <span style={{color:condColorMap[c.condition]?.text||col}}>{c.condition}</span>
                            <span style={{color:col}}> ({cLabel})</span>
                          </div>
                          <PlotSVG W={W} H={H}>
                            {/* y gridlines + ticks (behind data) */}
                            {(() => { const t=[]; for(let v=tickStep;v<=topTick+1e-9;v+=tickStep) t.push(parseFloat(v.toFixed(4))); return t; })().map(v=>(
                              <g key={v}>
                                <line x1={PL} y1={ys(v)} x2={PL+CW} y2={ys(v)} stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>
                                <text x={PL-3} y={ys(v)+3} fontSize={CF.TINY} fill={C.TEXT_3} textAnchor="end" fontFamily={FF.MONO}>{v.toFixed(1)}</text>
                              </g>
                            ))}
                            {/* observed bars */}
                            {obsDens.map((d,i)=>{
                              const bx=xs(XMIN+i*binW), bw=Math.max(0,xs(XMIN+(i+1)*binW)-xs(XMIN+i*binW)-0.4);
                              return <rect key={i} x={bx} y={ys(d)} width={bw} height={Math.max(0,(d/yMax)*CH)} fill={col} fillOpacity="0.35" stroke={col} strokeWidth="1"/>;
                            })}
                            {/* sim null stepped line */}
                            {miniSimPath && <path d={miniSimPath} fill="none" stroke={CC.EXP} strokeWidth={CS.FIT.w} opacity="0.85"/>}
                            {/* axes */}
                            <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
                            <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
                            {xTicks.map(v=>(
                              <g key={v}>
                                <line x1={xs(v)} y1={PT+CH} x2={xs(v)} y2={PT+CH+3} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
                                <text x={xs(v)} y={PT+CH+11} fontSize={CF.SMALL} fill={C.TEXT_3} textAnchor="middle">{v}</text>
                              </g>
                            ))}
                          </PlotSVG>
                        </div>
                      );
                    })}
                  </div>
                </PlotLayout>
                <ChartLegend items={legendItems} />
              </>
            );
          })()}
        </div>
      )}

    </MiniCardLayout>
  );
}
