import React, { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { forwardFill, detectHeaderRows, preprocessRaw, detectBlocks } from "../../import/parser.js";
import { detectLongFormat } from "../../import/longFormat.js";
import { suggestRowSemantics, ROW_SEMANTICS_SKIP_REASON } from "../../import/rowSemantics.js";
import { inferRoles } from "../../import/roles.js";
import { summarize } from "../../import/summary.js";
import { detectVST } from "../../stats/vst.js";
import { detectAssay, ASSAY_DATATYPE_MAP } from "../../constants/assays.js";
import { computeSeverity } from "../../analysis/severity.js";
import { extractAnalysisInputs, runFullAnalysis } from "../../analysis/engine.js";
import { buildMechanismGroups } from "../../analysis/localization.js";
import { ReportView } from "./ReportView.jsx";
import { C, FF, FW, FS, CR, CC, M, UI, SIGNAL, ACCENT, SEV_VERDICT } from "../../constants/tokens.js";
import { fmtPBadge } from "../../constants/thresholds.js";
import { MECHANISM_ORDER } from "../../constants/mechanisms.js";
import { ROLES } from "../../constants/roles.js";

// S152 (A3-sibling): per-file severity badge migrated from SIGNAL.*.dot
// hex-math (sevC+"18"/sevC+"44") to SEV_VERDICT[s].{color,bg,border} — the
// canonical "Severity badge" register per the A6 inventory. SEV_COLORS map
// retired (sole consumer was the inline hex-math at the pill); ERROR maps
// to SEV_VERDICT[3] (red tier) since it semantically aligns.

export function BatchView({ onBack }) {
  const [files,setFiles]=useState([]); // [{name, text}]
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState("");
  const [results,setResults]=useState([]); // [{fileName, severity, high, mod, nTests, nApplicable, vst, vstFull, assay, zeroAsMissing, results}]
  const [copied,setCopied]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [selectedIdx,setSelectedIdx]=useState(null); // null=show table, int=show file detail

  const handleFiles=useCallback((fileList)=>{
    const promises=[];
    for(let i=0;i<fileList.length;i++){
      const file=fileList[i];
      const ext=file.name.split(".").pop()?.toLowerCase();
      if(!["csv","tsv","txt","xlsx","xls"].includes(ext)) continue;
      if(ext==="xlsx"||ext==="xls"){
        promises.push(
          import("../../import/excel.js").then(mod=>mod.parseExcel(file)).then(({rows})=>{
            const csvText=rows.map(r=>r.map(v=>v==null?"":(/[,"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v)).join(",")).join("\n");
            return {name:file.name, text:csvText};
          }).catch(e=>({name:file.name, text:null, error:e.message}))
        );
      } else {
        promises.push(new Promise((resolve)=>{
          const reader=new FileReader();
          reader.onload=e=>{resolve({name:file.name, text:e.target.result});};
          reader.readAsText(file);
        }));
      }
    }
    Promise.all(promises).then(loaded=>{
      setFiles(prev=>{
        const existing=new Set(prev.map(f=>f.name));
        const unique=loaded.filter(f=>!existing.has(f.name)&&f.text);
        return [...prev,...unique];
      });
    });
  },[]);

  const removeFile=useCallback((name)=>{
    setFiles(prev=>prev.filter(f=>f.name!==name));
  },[]);

  const runBatch=useCallback(async()=>{
    setRunning(true);
    setResults([]);
    const batchResults=[];

    for(let fi=0;fi<files.length;fi++){
      const file=files[fi];
      setProgress(`${fi+1}/${files.length} — ${file.name}`);
      await new Promise(r=>setTimeout(r,50)); // yield for UI update

      try {
        // Parse CSV
        const parsed=Papa.parse(file.text,{header:false,skipEmptyLines:false});
        const raw=parsed.data;
        if(!raw||!raw.length) throw new Error("Empty file");

        // Preprocess
        const prepResult=preprocessRaw(raw);
        const preprocessed=prepResult.rows;
        if(!preprocessed||!preprocessed.length) throw new Error("Empty after preprocessing");

        // Detect blocks — use first block if multiple
        const detectedBlocks=detectBlocks(preprocessed);
        let blockRows=detectedBlocks.length>1?detectedBlocks[0]:preprocessed;

        // Clean block: strip preamble rows with few cells, remove empty columns
        const maxC0=blockRows.reduce((m,r)=>Math.max(m,r.length),0);
        const minCells0=Math.max(2,Math.ceil(maxC0*0.1));
        while(blockRows.length>2){const nb=blockRows[0].filter(v=>v!=null&&String(v).trim()!=="").length;if(nb<minCells0)blockRows=blockRows.slice(1);else break;}

        // Detect headers
        const nH=detectHeaderRows(blockRows);

        // Apply headers
        const maxC=blockRows.reduce((m,r)=>Math.max(m,r.length),0);
        const pad=r=>{const o=[...r];while(o.length<maxC)o.push(null);return o;};
        let hdrs,data,condPerCol=null;
        if(nH===0){
          hdrs=Array.from({length:maxC},(_,i)=>"Col "+(i+1));
          data=blockRows.map(pad);
        } else if(nH===1){
          hdrs=pad(blockRows[0]).map((v,i)=>v!=null&&String(v).trim()?String(v).trim():"Col "+(i+1));
          data=blockRows.slice(1).map(pad);
        } else {
          // Two-row header — simplified version
          const rawGR=pad(blockRows[0]),nameRow=pad(blockRows[1]);
          const subNames=nameRow.map(v=>v!=null?String(v).trim():"");
          const groups=forwardFill(rawGR);
          condPerCol=new Array(maxC).fill(null);
          for(let i=0;i<maxC;i++){
            const g=groups[i]!=null?String(groups[i]).trim():"";
            if(g) condPerCol[i]=g;
          }
          hdrs=nameRow.map((v,i)=>v!=null&&String(v).trim()?String(v).trim():"Col "+(i+1));
          data=blockRows.slice(2).map(pad);
        }

        // S118 Track H — Long-format detection. Pre-S118 BatchView SKIPped
        // detected long-format files entirely. The Row Semantics Gate now
        // routes them via `rowSemantics='arbitrary'` instead — sequential /
        // spatial tests gate to N/A, the rest of the battery runs as normal.
        // The user is informed via the per-row detail entry that long-format
        // was auto-routed (see batchResults annotation below).
        let lfDetected=false;
        if(nH>0){
          const hdrRow=hdrs;
          const dataRows=data;
          lfDetected = !!detectLongFormat(hdrRow,dataRows);
        }

        // Infer roles
        const roles=inferRoles(data,hdrs,condPerCol);

        // Detect assay
        const detected=detectAssay(file.name, hdrs);
        const assay=detected?detected.assay:"general";

        // Check for genomics zero suggestion
        const sum=summarize(data,roles,condPerCol,false);
        const isGenomics=assay==="genomics"||assay==="cell_count";
        const zeroAsMissing=isGenomics&&sum.zeros>sum.total*0.1;

        // Extract analysis inputs (includes condCtx with unified condition handling)
        const batchColRel = 'replicates';
        // S118 Track H — Row Semantics Gate auto-suggest. Batch mode default
        // is 'ordered'; the suggest helper overrides to 'arbitrary' on
        // long-format detection or genomics assay (D2 precedence).
        const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: lfDetected });
        const batchRowSem = rsSuggestion.value || 'ordered';
        const config={data,roles,hdrs,condPerCol,zeroAsMissing,assay,dataType:ASSAY_DATATYPE_MAP[assay]||'continuous',fileName:file.name,colRelationship:batchColRel,rowSemantics:batchRowSem};
        const{matrix,rawMatrix,filteredIndices,condCtx}=extractAnalysisInputs(config);

        const vst=detectVST(matrix,assay);

        // Run analysis
        const testResults=await runFullAnalysis(matrix,rawMatrix,condCtx,assay,null,vst,{isPivoted:!!(config&&config.isPivoted)},config?.dataType||'continuous',batchRowSem);

        // Compute severity
        const sev=computeSeverity(testResults);
        const applicable=testResults.filter(r=>r.flag!=="N/A").length;

        batchResults.push({
          fileName:file.name,
          ...sev,
          nTests:testResults.length,
          nApplicable:applicable,
          vst:vst?.transform||"raw",
          vstFull:vst||null,
          assay,
          zeroAsMissing,
          rowSemantics:batchRowSem,
          rowSemanticsAuto:rsSuggestion.auto?rsSuggestion.reason:null,
          longFormatDetected:lfDetected,
          nRows:matrix.length,
          nCols:matrix[0]?.length||0,
          results:testResults,
          matrix,
          rowMap:filteredIndices||null,
          dataHeaders:Array.isArray(hdrs)?hdrs.filter((_,ci)=>roles[ci]==="data"):[],
          data, roles, hdrs,
          error:null
        });
      } catch(e) {
        batchResults.push({
          fileName:file.name,
          severity:"ERROR",high:0,mod:0,nFlaggedDimensions:0,
          nTests:0,nApplicable:0,vst:"—",assay:"—",
          nRows:0,nCols:0,results:[],error:e.message
        });
      }
      setResults([...batchResults]);
    }
    setRunning(false);
    setProgress("");
  },[files]);

  // Generate copyable batch summary
  const generateBatchSummary=useCallback(()=>{
    const lines=["=== Check My Data v0.7 — Batch Summary ===",""];
    const flagLabel = f => ({HIGH:"FLAGGED",MODERATE:"NOTED",LOW:"CLEAR","N/A":"N/A"}[f]||f);
    lines.push(`| File | Rows×Cols | Assay | VST | Severity | Flagged | Noted | Tests |`);
    lines.push(`|------|----------|-------|-----|----------|---------|-------|-------|`);
    for(const r of results){
      if(r.error){
        lines.push(`| ${r.fileName} | — | — | — | ERROR | — | — | ${r.error.slice(0,40)} |`);
      } else {
        lines.push(`| ${r.fileName} | ${r.nRows}×${r.nCols} | ${r.assay} | ${r.vst} | ${r.severity} | ${r.high} | ${r.mod} | ${r.nApplicable}/${r.nTests} |`);
      }
    }
    lines.push("");

    // Per-file mechanism-grouped details
    for(const r of results){
      if(r.error) continue;
      lines.push(`── ${r.fileName} (Severity ${r.severity}) ──`);
      const groups = buildMechanismGroups(r.results);
      let anyFlagged = false;
      for(const mechKey of MECHANISM_ORDER){
        const group = groups[mechKey];
        const flagged = group.tests.filter(t=>t.flag==="HIGH"||t.flag==="MODERATE");
        if(!flagged.length) continue;
        anyFlagged = true;
        lines.push(`  ${group.label}: ${group.highCount}F ${group.modCount}N`);
        for(const t of flagged){
          let detail="";
          if(t.primaryP!=null) detail+=` ${fmtPBadge(t.primaryP)}`;
          lines.push(`    ${flagLabel(t.flag).padEnd(8)} ${t.name}${detail}`);
        }
      }
      if(!anyFlagged) lines.push("  All tests clear");
      lines.push("");
    }
    return lines.join("\n");
  },[results]);

  const handleCopy=async()=>{
    const text=generateBatchSummary();
    try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    catch(e){const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  // Detail view — reuse ReportView 
  if(selectedIdx!==null&&results[selectedIdx]) {
    const r = results[selectedIdx];
    const batchImportConfig = {
      assay: r.assay,
      vst: r.vstFull,
      fileName: r.fileName,
      zeroAsMissing: r.zeroAsMissing,
      condPerCol: null,
      nRows: r.nRows,
      nCols: r.nCols,
      dataType: r.dataType || 'continuous',
      dataHeaders: r.dataHeaders || [],
      data: r.data || null,
      roles: r.roles || [],
      hdrs: r.hdrs || [],
      rowSemantics: r.rowSemantics,
      rowSemanticsAuto: r.rowSemanticsAuto,
      longFormatDetected: r.longFormatDetected,
    };
    return <div><ReportView results={r.results} importConfig={batchImportConfig} matrix={r.matrix||null} rowMap={r.rowMap||null} onBack={()=>setSelectedIdx(null)} backLabel="Back to batch"/></div>;
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
        <button onClick={onBack} style={{background:C.WHITE,border:`1px solid ${C.BORDER}`,color:C.TEXT_2,padding:"6px 14px",borderRadius:CR.MD,fontSize:FS.base,cursor:"pointer",...M}}>
          ← Back to Import
        </button>
        <h2 style={{margin:0,fontSize:FS.md,color:C.TEXT}}>Batch analysis</h2>
      </div>

      {/* Drop zone for multiple files */}
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer?.files);}}
        style={{border:"2px dashed "+(dragging?CC.OBS:C.BORDER),borderRadius:CR.XL,padding:"24px",textAlign:"center",marginBottom:"16px",background:dragging?C.BG:C.WHITE,transition:"all 0.2s"}}>
        <label style={{cursor:"pointer",display:"inline-block",padding:"10px 24px",background:C.BG,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,color:UI.INFO.text,fontSize:FS.base,fontWeight:FW.SEMI}}>
          Select Files
          <input type="file" multiple accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e=>handleFiles(e.target.files)} style={{display:"none"}}/>
        </label>
        <p style={{fontSize:FS.base,color:C.TEXT_3,marginTop:"8px"}}>Drop multiple CSV/TSV/XLSX files or click to select. Each file is analysed independently with auto-detected settings.</p>
      </div>

      {/* File list */}
      {files.length>0&&(
        <div style={{background:C.WHITE,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.LG,padding:"12px 16px",marginBottom:"16px"}}>
          <div style={{...M,fontSize:FS.xs,color:C.TEXT_3,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px",fontWeight:FW.BOLD}}>
            {files.length} file{files.length!==1?"s":""} queued
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {files.map(f=>(
              <span key={f.name} style={{display:"inline-flex",alignItems:"center",gap:"4px",fontSize:FS.base,
                padding:"3px 10px",background:ROLES.data.bg,border:`1px solid ${ACCENT.BLUE.border}`,borderRadius:CR.MD,color:CC.OBS}}>
                {f.name}
                {!running&&<button onClick={()=>removeFile(f.name)} style={{background:"none",border:"none",cursor:"pointer",
                  color:C.TEXT_3,fontSize:FS.base,padding:"0",lineHeight:1}} title="Remove">✕</button>}
              </span>
            ))}
          </div>
          {!running&&(
            <button onClick={runBatch} style={{marginTop:"12px",padding:"10px 28px",background:CC.OBS,border:"none",
              borderRadius:CR.LG,color:C.WHITE,fontSize:FS.base,fontWeight:FW.BOLD,cursor:"pointer",...M,letterSpacing:"0.02em"}}>
              Run All → {files.length} file{files.length!==1?"s":""}
            </button>
          )}
        </div>
      )}

      {/* Progress */}
      {running&&(
        <div style={{textAlign:"center",padding:"20px",color:CC.OBS,fontSize:FS.base}}>
          <span style={{display:"inline-block",width:"14px",height:"14px",border:`2px solid ${ACCENT.BLUE.border}`,borderTopColor:CC.OBS,borderRadius:"50%",animation:"spin 0.8s linear infinite",marginRight:"10px",verticalAlign:"middle"}}/>
          {progress}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Results table */}
      {results.length>0&&(
        <div style={{background:C.WHITE,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.LG,overflow:"hidden",marginBottom:"16px"}}>
          {/* Table header row with copy button */}
          <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.BORDER_L}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.BG_L}}>
            <span style={{...M,fontSize:FS.xs,fontWeight:FW.BOLD,color:C.TEXT_2}}>
              {results.length} file{results.length!==1?"s":""} analysed
              {running&&<span style={{marginLeft:"8px",color:CC.OBS}}>— running…</span>}
            </span>
            <button onClick={handleCopy}
              style={{padding:"5px 14px",background:copied?UI.OK.bg:C.WHITE,border:"1px solid "+(copied?UI.OK.border:C.BORDER),
                borderRadius:CR.MD,color:copied?UI.OK.text:C.TEXT_2,fontSize:FS.base,cursor:"pointer",...M,transition:"all 0.2s",fontWeight:FW.SEMI}}>
              {copied?"✓ Copied":"Copy all results"}
            </button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:FS.base,...M}}>
            <thead>
              <tr style={{background:C.BG_L,borderBottom:`2px solid ${C.BORDER_L}`}}>
                <th style={{padding:"8px 12px",textAlign:"left",fontWeight:FW.BOLD,color:C.TEXT}}>File</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}>Size</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}>VST</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}>Rating</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}>Flagged</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}>Noted</th>
                <th style={{padding:"8px 8px",textAlign:"left",fontWeight:FW.BOLD,color:C.TEXT}}>Flagged tests</th>
                <th style={{padding:"8px 8px",textAlign:"center",fontWeight:FW.BOLD,color:C.TEXT}}></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r,i)=>{
                const flagged=r.results.filter(t=>t.flag==="HIGH"||t.flag==="MODERATE");
                const sev=SEV_VERDICT[r.error?3:r.severity]||{color:C.TEXT_3,bg:C.BG_L,border:C.BORDER_L};
                const canView=!r.error&&r.results.length>0;
                return (
                  <tr key={i} onClick={canView?()=>setSelectedIdx(i):undefined}
                    style={{borderBottom:`1px solid ${C.BORDER_L}`,background:i%2===0?C.WHITE:C.BG_L,
                      cursor:canView?"pointer":"default",transition:"background 0.12s"}}
                    onMouseEnter={e=>{if(canView)e.currentTarget.style.background=C.BG_L;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?C.WHITE:C.BG_L;}}>
                    <td style={{padding:"6px 12px",color:UI.INFO.text,fontWeight:FW.SEMI,maxWidth:"260px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{r.fileName}</span>
                        {r.rowSemantics==='arbitrary'&&(()=>{
                          const auto=r.rowSemanticsAuto;
                          let label;
                          if(auto==='long-format') label='arbitrary · long-format';
                          else if(auto==='genomics') label='arbitrary · genomics';
                          else if(auto==null) label='arbitrary · user-set';
                          else {console.warn(`[BatchView] Unknown rowSemanticsAuto code: ${auto}`); label='arbitrary';}
                          return (
                            <span title={`${ROW_SEMANTICS_SKIP_REASON} Sequential tests gated to N/A — see test applicability in drill-in.`}
                              style={{display:"inline-block",flexShrink:0,fontSize:FS.xs,fontFamily:FF.UI,
                                padding:"1px 6px",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,
                                borderRadius:CR.SM,color:C.TEXT_3,fontWeight:FW.NORM,letterSpacing:"0.02em",
                                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"160px"}}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center",color:C.TEXT_3}}>{r.error?"—":`${r.nRows}×${r.nCols}`}</td>
                    <td style={{padding:"6px 8px",textAlign:"center",color:r.vst==="log"?ROLES.label.color:r.vst==="anscombe"?ACCENT.TEAL.text:C.TEXT_3}}>{r.vst}</td>
                    <td style={{padding:"6px 8px",textAlign:"center"}}>
                      <span style={{fontFamily:FF.UI,fontWeight:FW.SEMI,fontSize:FS.xs,color:sev.color,padding:"2px 8px",background:sev.bg,border:`1px solid ${sev.border}`,borderRadius:CR.SM}}>
                        {r.error?"ERROR":r.severity}
                      </span>
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center",fontWeight:FW.BOLD,color:r.high>0?SIGNAL.RED.dot:C.TEXT_3}}>{r.high||"—"}</td>
                    <td style={{padding:"6px 8px",textAlign:"center",fontWeight:FW.BOLD,color:r.mod>0?SIGNAL.AMBER.dot:C.TEXT_3}}>{r.mod||"—"}</td>
                    <td style={{padding:"6px 8px",color:C.TEXT,fontSize:FS.xs}}>
                      {r.error?<span style={{color:SIGNAL.RED.dot}}>{r.error}</span>:
                        flagged.length===0?"All LOW/N/A":
                        flagged.map(t=><span key={t.name} style={{display:"inline-block",marginRight:"6px",
                          color:t.flag==="HIGH"?SIGNAL.RED.dot:SIGNAL.AMBER.dot}}>
                          {t.flag==="HIGH"?"▲":"●"} {t.name.replace("Exact ","").replace(" Partitioning","").replace(" Homogeneity","").replace("Benford's Law ","Benf")}
                        </span>)}
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center"}}>
                      {canView&&<span style={{fontSize:FS.xs,color:CC.OBS,...M,fontWeight:FW.SEMI}}>View →</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
