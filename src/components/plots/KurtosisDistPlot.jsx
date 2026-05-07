import { CC, CP, CS, C, FF, CF } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

export function KurtosisDistPlot({ normDiffs, simDiffs }) {
  if(!normDiffs?.length) return null;

  const W=CP.W, H=160;
  const PL=44, PR=12, PT=14, PB=28;
  const CW=W-PL-PR, CH=H-PT-PB;
  const BINS=40, XMIN=-4.5, XMAX=4.5;
  const binW=(XMAX-XMIN)/BINS;

  function buildHist(vals) {
    const counts=new Array(BINS).fill(0);
    vals.forEach(v=>{const bi=Math.floor((v-XMIN)/binW);if(bi>=0&&bi<BINS)counts[bi]++;});
    const n=vals.length;
    return counts.map(c=>c/(n*binW));
  }

  const obsDens=buildHist(normDiffs);
  const simDens=simDiffs?.length?buildHist(simDiffs):null;

  const rawMax=Math.max(...obsDens,...(simDens||[]));
  // ~5 ticks: pick a tidy step from rawMax/4, round up to nearest nice number
  const NICE=[0.1,0.2,0.25,0.3,0.5,1.0];
  const rough=rawMax/4;
  const tickStep=NICE.find(n=>n>=rough)||1.0;
  const topTick=Math.ceil(rawMax/tickStep)*tickStep;
  const maxDens=topTick*1.08;

  function xs(x){ return PL+(x-XMIN)/(XMAX-XMIN)*CW; }
  function ys(y){ return PT+CH-(y/maxDens)*CH; }

  const yTicks=[];
  for(let v=0;v<=topTick+1e-9;v+=tickStep) yTicks.push(parseFloat(v.toFixed(4)));
  const xTicks=[-4,-3,-2,-1,0,1,2,3,4];

  // Build stepped path for simulated null
  const simPath = simDens ? (() => {
    let d = `M${xs(XMIN)},${ys(0)}`;
    for (let i = 0; i < simDens.length; i++) {
      const x0 = xs(XMIN + i * binW), x1 = xs(XMIN + (i+1) * binW);
      const y = ys(simDens[i]);
      d += ` L${x0},${y} L${x1},${y}`;
    }
    d += ` L${xs(XMAX)},${ys(0)}`;
    return d;
  })() : null;

  return (
    <PlotSVG W={W} H={H}>
      {/* gridlines */}
      {yTicks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={ys(v)} x2={PL+CW} y2={ys(v)}
            stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>
          <text x={PL-4} y={ys(v)+3.5} fontSize={CF.SMALL} fill={C.TEXT_4}
            textAnchor="end" fontFamily={FF.MONO}>{v.toFixed(1)}</text>
        </g>
      ))}

      {/* observed histogram bars */}
      {obsDens.map((d,i)=>{
        const x=XMIN+i*binW;
        const bx=xs(x), bw=Math.max(0,xs(x+binW)-xs(x)-0.5);
        return <rect key={i} x={bx} y={ys(d)} width={bw}
          height={Math.max(0,(d/maxDens)*CH)}
          fill={CC.OBS} fillOpacity="0.35" stroke={CC.OBS} strokeWidth="1"/>;
      })}

      {/* simulated null (teal stepped line) */}
      {simPath && <path d={simPath} fill="none" stroke={CC.EXP} strokeWidth={CS.FIT.w} opacity="0.9"/>}

      {/* axes */}
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {xTicks.map(v=>(
        <g key={v}>
          <line x1={xs(v)} y1={PT+CH} x2={xs(v)} y2={PT+CH+3} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
          <text x={xs(v)} y={PT+CH+12} fontSize={CF.SMALL} fill={C.TEXT_4}
            textAnchor="middle" fontFamily={FF.MONO}>{v}</text>
        </g>
      ))}
      <text x={PL+CW/2} y={H-PB+28} fontSize={CF.LABEL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}>Normalised replicate difference (d / local σ)</text>
      <text x={12} y={PT+CH/2} fontSize={CF.LABEL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,12,${PT+CH/2})`}>Density</text>

    </PlotSVG>
  );
}
