import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { forwardFill, detectHeaderRows, preprocessRaw, detectBlocks, blockSummary } from "../../import/parser.js";
import { detectLongFormat, pivotLongToWide } from "../../import/longFormat.js";
import { suggestRowSemantics } from "../../import/rowSemantics.js";
import { inferRoles, assayPlausibilityHint } from "../../import/roles.js";
import { summarize } from "../../import/summary.js";
import { makeDemo, makeDemo2Row } from "../../import/demo.js";
import { detectVST } from "../../stats/vst.js";
import { detectAssay, ASSAYS, DATA_TYPES, ASSAY_DATATYPE_MAP } from "../../constants/assays.js";
import { getApplicabilityTests } from "../../analysis/severity.js";
import { extractAnalysisInputs } from "../../analysis/engine.js";
import { LongFormatModal } from "./LongFormatModal.jsx";
import { C, FF, FW, TF, FS, CR, CC, M, UI, BADGE, SIGNAL, ACCENT } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";
import { ROLES, ROLE_KEYS, COND_COLORS } from "../../constants/roles.js";
import { MECHANISMS, MECHANISM_ORDER, TEST_MECHANISM, DISPLAY_NAMES } from "../../constants/mechanisms.js";
import { buildCondSpans, colToExcelLetter, originalFileRow } from "../shared/coordinates.js";
import { COL_W, FREEZE_COL_W, FREEZE_Z, countFrozenCols } from "../shared/styles.js";
import { ScrollTable } from "../shared/ScrollTable.jsx";

export function ImportView({ onProceed, onBatch, initialConfig, pendingFile, onPendingFileConsumed }) {
  const [fileName,setFileName]=useState("");
  const fileNameRef=useRef("");
  const [err,setErr]=useState(null);
  const [rawRows,setRawRows]=useState(null);
  const [prepInfo,setPrepInfo]=useState(null);
  const [blocks,setBlocks]=useState(null);
  const [selectedBlock,setSelectedBlock]=useState(0);
  const [data,setData]=useState(null);
  const [hdrs,setHdrs]=useState([]);
  const [roles,setRoles]=useState([]);
  const [condPerCol,setCondPerCol]=useState(null);
  const [condColorMap,setCondColorMap]=useState({});
  const [headerRows,setHeaderRows]=useState(1);
  const [assay,setAssay]=useState("general");
  const [assayAutoDetected,setAssayAutoDetected]=useState(false);
  const [assaySuggestion,setAssaySuggestion]=useState(null);
  const [dataType,setDataType]=useState("continuous");
  const [zeroAsMissing,setZeroAsMissing]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [assayOpen,setAssayOpen]=useState(false);
  const assayRef=useRef(null);
  const [longFormatModal,setLongFormatModal]=useState(null); // {detection,headers,dataRows,nH,cleaned}
  const [pivotConfig,setPivotConfig]=useState(null); // {measureCol,condCol,idCol,measureCandidates,originalHeaders,originalDataRows}
  const [vstProposal,setVstProposal]=useState(null); // detectVST result when transform proposed (any non-raw assay/slope path)
  const [vstDecision,setVstDecision]=useState(null); // 'apply' | 'raw' | null (unset) — user's VST choice
  const [vstAutoSet,setVstAutoSet]=useState(false); // S123 — true while the pre-selected choice is the auto default; user click freezes it false
  const [applicExpanded,setApplicExpanded]=useState(false);
  const [colRelationship,setColRelationship]=useState(null); // 'replicates' | 'conditions' | null (unset)
  const [colRelAutoSet,setColRelAutoSet]=useState(false); // true when auto-set by pivot, two-row header, or COND column
  const [rowSemantics,setRowSemantics]=useState(null); // 'ordered' | 'arbitrary' | null (unset) — S118 Track H
  const [rowSemAutoSet,setRowSemAutoSet]=useState(false); // true when auto-set by long-format / assay
  const [longFormatDetected,setLongFormatDetected]=useState(false); // sticky after the pivot modal resolves either way
  const [excelMeta,setExcelMeta]=useState(null); // forensic metadata from .xlsx files (passed through to ReportView)
  const [excelSheetPicker,setExcelSheetPicker]=useState(null); // {file, buf, sheetNames} — multi-sheet picker

  useEffect(()=>{
    const h=e=>{if(assayRef.current&&!assayRef.current.contains(e.target))setAssayOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  // On mount: restore from initialConfig (back from report)
  useEffect(()=>{
    if(initialConfig && initialConfig.data){
      // Restore directly from the config that was used for analysis
      setFileName(initialConfig.fileName||"");
      setData(initialConfig.data);
      setHdrs(initialConfig.hdrs||[]);
      setRoles(initialConfig.roles||[]);
      setCondPerCol(initialConfig.condPerCol||null);
      setAssay(initialConfig.assay||"general");
      setDataType(initialConfig.dataType||"continuous");
      setZeroAsMissing(!!initialConfig.zeroAsMissing);
      setColRelationship(initialConfig.colRelationship||null);
      setRowSemantics(initialConfig.rowSemantics||null);
      setExcelMeta(initialConfig.excelMeta||null);
      if(initialConfig.headerRows) setHeaderRows(initialConfig.headerRows);
      if(initialConfig.condPerCol){
        const names=[...new Set(initialConfig.condPerCol.filter(c=>c))];
        const ccm={};
        names.forEach((n,i)=>{ccm[n]=COND_COLORS[i%COND_COLORS.length];});
        setCondColorMap(ccm);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Process a file queued from report page "Change file" picker
  useEffect(()=>{
    if(pendingFile){
      onFile(pendingFile);
      if(onPendingFileConsumed) onPendingFileConsumed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingFile]);

  const applyHeaders=useCallback((raw,nH)=>{
    if(!raw||!raw.length){setErr("File is empty.");return;}
    const maxC=raw.reduce((m,r)=>Math.max(m,r.length),0);
    const pad=r=>{const o=[...r];while(o.length<maxC)o.push(null);return o;};
    let h,d,cpc=null,ccm={};
    if(nH===0){
      h=Array.from({length:maxC},(_,i)=>"Col "+(i+1));d=raw.map(pad);
    } else if(nH===1){
      h=pad(raw[0]).map((v,i)=>v!=null&&String(v).trim()?String(v).trim():"Col "+(i+1));
      d=raw.slice(1).map(pad);
    } else {
      const rawGR=pad(raw[0]),nameRow=pad(raw[1]);
      const subNames=nameRow.map(v=>v!=null?String(v).trim():"");
      const counts={};subNames.forEach(s=>{if(s)counts[s]=(counts[s]||0)+1;});
      const repeatedName=subNames.find(s=>s&&counts[s]>1);
      let groupStarts=[];
      if(repeatedName)subNames.forEach((s,i)=>{if(s===repeatedName)groupStarts.push(i);});
      cpc=new Array(maxC).fill(null);
      if(groupStarts.length>=2){
        for(let g=0;g<groupStarts.length;g++){
          const gS=groupStarts[g],gE=g+1<groupStarts.length?groupStarts[g+1]-1:maxC-1;
          let cn=null;
          for(let c=gS;c<=gE;c++){const v=rawGR[c]!=null?String(rawGR[c]).trim():"";if(v){cn=v;break;}}
          if(!cn)for(let c=gS-1;c>=Math.max(0,gS-2);c--){const v=rawGR[c]!=null?String(rawGR[c]).trim():"";if(v){cn=v;break;}}
          if(cn)for(let c=gS;c<=gE;c++)cpc[c]=cn;
        }
      } else {
        const filled=forwardFill(rawGR);
        cpc=filled.map(v=>v?String(v).trim()||null:null);
      }
      h=nameRow.map((v,i)=>{const nm=v!=null&&String(v).trim()?String(v).trim():"Col "+(i+1);const grp=cpc[i]||"";return grp?grp+" · "+nm:nm;});
      const uniqConds=[...new Set(cpc.filter(Boolean))];
      ccm={};uniqConds.forEach((c,i)=>{ccm[c]=COND_COLORS[i%COND_COLORS.length];});
      d=raw.slice(2).map(pad);
    }
    d=d.filter(r=>r.some(v=>v!=null&&v!==""));
    if(!d.length){setErr("No data rows found.");return;}
    setHdrs(h);setData(d);setCondPerCol(cpc);setCondColorMap(ccm);setErr(null);
    setRoles(inferRoles(d,h,cpc));
    // Auto-detect assay from current fileName + headers
    // (fileName is in closure scope via the outer state — we pass it via a ref)
    const det=detectAssay(fileNameRef.current,h);
    // Apply detection: "high" (headers match) → auto badge; "low" (filename only) → apply but show as suggestion.
    // Matches batch mode behaviour (both confidence levels apply the assay).
    if(det&&(det.confidence==="high"||det.confidence==="low")){setAssay(det.assay);setAssayAutoDetected(det.confidence==="high");setAssaySuggestion(det.confidence==="low"?det.assay:null);const _dt=ASSAY_DATATYPE_MAP[det.assay]||'continuous';setDataType(_dt);}
    else{setAssay("general");setAssayAutoDetected(false);setAssaySuggestion(null);}
  },[]);

  const loadBlock=useCallback(blockRows=>{
    let rows=blockRows;
    const maxC=rows.reduce((m,r)=>Math.max(m,r.length),0);
    const minCells=Math.max(2,Math.ceil(maxC*0.1));
    while(rows.length>2){const nb=rows[0].filter(v=>v!=null&&String(v).trim()!=="").length;if(nb<minCells)rows=rows.slice(1);else break;}
    const emptySet=new Set();
    for(let c=0;c<maxC;c++){let all=true;for(const row of rows){const v=row[c];if(v!=null&&String(v).trim()!==""){all=false;break;}}if(all)emptySet.add(c);}
    let cleaned=rows;
    if(emptySet.size>0&&emptySet.size<maxC)cleaned=rows.map(row=>row.filter((_,ci)=>!emptySet.has(ci)));
    setRawRows(cleaned);const nH=detectHeaderRows(cleaned);setHeaderRows(nH);applyHeaders(cleaned,nH);
  },[applyHeaders]);

  const parseAndLoad=useCallback((text,autoDetect)=>{
    // File size guard
    if (text.length > 50 * 1024 * 1024) { setErr("File exceeds 50 MB limit. Consider splitting into smaller files."); return; }
    if (text.length > 10 * 1024 * 1024) { console.warn("[Import] Large file: " + (text.length / 1024 / 1024).toFixed(1) + " MB — analysis may be slow."); }
    // S131 — Reset gate state to detect-output on every new file load.
    // Without this, a user-frozen rowSemantics or colRelationship from a
    // prior file silently overrides the auto-suggest useEffects below
    // (their `rowSemantics===null || rowSemAutoSet` guard fails when the
    // prior session left the gate user-set). Pivot iteration handlers
    // (confirmPivot / dismissPivot / changeMeasureCol) call applyHeaders
    // directly and don't trip this reset. Mount-effect's initialConfig
    // restore path also bypasses parseAndLoad, preserving Back-from-report.
    setRowSemantics(null); setRowSemAutoSet(false);
    setColRelationship(null); setColRelAutoSet(false);
    setPivotConfig(null);
    setLongFormatDetected(false);
    const result=Papa.parse(text.trim(),{skipEmptyLines:false});
    // Surface PapaParse errors
    if (result.errors && result.errors.length > 0) {
      const fatal = result.errors.filter(e => e.type === "Quotes" || e.type === "FieldMismatch");
      if (fatal.length > 0 && (!result.data || result.data.length < 3)) {
        setErr("CSV parse error: " + fatal[0].message + (fatal[0].row != null ? " (row " + (fatal[0].row + 1) + ")" : "")); return;
      }
      // Non-fatal: log but continue
      console.warn("[Import] PapaParse warnings:", result.errors.slice(0, 5));
    }
    const raw=result.data;if(!raw||!raw.length){setErr("File is empty.");return;}
    const{rows:cleaned,removedCols,skippedRows,trimmedRows}=preprocessRaw(raw);
    if(!cleaned||!cleaned.length){setErr("File appears empty after cleaning.");return;}
    setPrepInfo({skippedRows:skippedRows||0,removedCols:removedCols||[],trimmedRows:trimmedRows||0});
    const det=detectBlocks(cleaned);
    if(det.length>1){setBlocks(det);setSelectedBlock(0);loadBlock(det[0]);}
    else{
      setBlocks(null);setSelectedBlock(0);
      const nH=autoDetect?detectHeaderRows(cleaned):1;
      // Long-format detection: intercept before applyHeaders
      // Long-format detection result is sticky from this point — used by the
      // S118 row-semantics auto-suggest even if the user dismisses the pivot
      // modal (long-format → arbitrary regardless of pivot outcome).
      let lfDet = null;
      if(autoDetect&&cleaned.length>20&&nH>0){
        const hdrRow=cleaned[0].map(v=>v!=null?String(v).trim():"");
        const dataRows=cleaned.slice(nH);
        lfDet=detectLongFormat(hdrRow,dataRows);
        if(lfDet){
          setLongFormatDetected(true);
          setRawRows(cleaned);setHeaderRows(nH);
          setLongFormatModal({detection:lfDet,headers:hdrRow,dataRows,nH,cleaned});
          return;
        }
      }
      if(!lfDet) setLongFormatDetected(false);
      setRawRows(cleaned);setHeaderRows(nH);applyHeaders(cleaned,nH);
    }
  },[applyHeaders,loadBlock]);

  const loadExcelSheet=useCallback(async(file, sheetName)=>{
    try {
      const { parseExcel } = await import("../../import/excel.js");
      const { rows } = await parseExcel(file, sheetName);
      // Run forensic metadata extraction (non-blocking — don't hold up analysis)
      // Uses JSZip for direct XML parsing (not SheetJS — see excelMeta.js)
      file.arrayBuffer().then(buf=>{
        import("../../import/excelMeta.js").then(async mod=>{
          try { setExcelMeta(await mod.extractExcelMeta(buf)); }
          catch(e){ console.warn("[ExcelMeta] extraction failed:",e); }
        }).catch(()=>{});
      });
      // Convert 2D array to CSV text for parseAndLoad (reuses entire existing pipeline)
      const csvText=rows.map(r=>r.map(v=>v==null?"":(/[,"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v)).join(",")).join("\n");
      parseAndLoad(csvText,true);
      setExcelSheetPicker(null);
    } catch(e){
      setErr("Excel import error: "+e.message);
      setExcelSheetPicker(null);
    }
  },[parseAndLoad]);

  const onFile=useCallback(async(file)=>{
    if(!file)return;
    const ext=file.name.split(".").pop()?.toLowerCase();
    if(!["csv","tsv","txt","xlsx","xls"].includes(ext)){
      const hint=ext==="pdf"?"Extract to CSV via Tabula (tabula.technology) first.":"Convert to CSV or XLSX format first.";
      setErr("Unsupported file type: ."+ext+". "+hint);return;
    }
    if (file.size > 50 * 1024 * 1024) { setErr("File exceeds 50 MB limit. Consider splitting into smaller files."); return; }
    setFileName(file.name);fileNameRef.current=file.name;setErr(null);setData(null);setBlocks(null);setExcelMeta(null);setVstProposal(null);setVstDecision(null);setVstAutoSet(false);

    if(ext==="xlsx"||ext==="xls"){
      try {
        const { getSheetNames } = await import("../../import/excel.js");
        const sheetNames = await getSheetNames(file);
        if(!sheetNames.length){ setErr("Workbook contains no sheets."); return; }
        if(sheetNames.length===1){
          // Single sheet — proceed directly
          loadExcelSheet(file, sheetNames[0]);
        } else {
          // Multiple sheets — show picker
          setExcelSheetPicker({file, sheetNames});
        }
      } catch(e){
        setErr("Excel import error: "+e.message);
      }
      return;
    }

    const reader=new FileReader();
    reader.onload=e=>{
      parseAndLoad(e.target.result,true);
    };
    reader.readAsText(file);
  },[parseAndLoad]);

  const loadDemo=useCallback(()=>{setFileName("demo-1row-header.csv");setErr(null);setData(null);parseAndLoad(makeDemo(),true);},[parseAndLoad]);
  const loadDemo2=useCallback(()=>{setFileName("demo-2row-header.csv");setErr(null);setData(null);parseAndLoad(makeDemo2Row(),true);},[parseAndLoad]);

  const confirmPivot=useCallback(({measureCol,condCol,idCol})=>{
    const{detection,headers,dataRows}=longFormatModal;
    setPivotConfig({measureCol,condCol,idCol,measureCandidates:detection.measureCandidates,originalHeaders:headers,originalDataRows:dataRows});
    setLongFormatModal(null);
    const pivoted=pivotLongToWide(dataRows,headers,{measureCol,condCol,idCol});
    setRawRows(pivoted);setHeaderRows(1);applyHeaders(pivoted,1);
    // Pivoted data: columns came from condition values → they ARE conditions, not replicates
    setColRelationship('conditions');setColRelAutoSet(true);
    // Re-run assay detection on original pre-pivot headers — pivoted headers are
    // condition names with no instrument signal. Original headers (CT, Tm1, Eff…) have full signal.
    const det=detectAssay(fileNameRef.current, headers);
    if(det&&(det.confidence==="high"||det.confidence==="low")){setAssay(det.assay);setAssayAutoDetected(det.confidence==="high");setAssaySuggestion(det.confidence==="low"?det.assay:null);const _dt=ASSAY_DATATYPE_MAP[det.assay]||'continuous';setDataType(_dt);}
  },[longFormatModal,applyHeaders]);

  const dismissPivot=useCallback(()=>{
    const{cleaned,nH}=longFormatModal;
    setLongFormatModal(null);setPivotConfig(null);
    setColRelationship(null);setColRelAutoSet(false); // pivot conditions no longer apply
    setRawRows(cleaned);setHeaderRows(nH);applyHeaders(cleaned,nH);
  },[longFormatModal,applyHeaders]);

  const changeMeasureCol=useCallback((newMeasureCol)=>{
    if(!pivotConfig)return;
    const{condCol,idCol,originalHeaders,originalDataRows,measureCandidates}=pivotConfig;
    setPivotConfig(prev=>({...prev,measureCol:newMeasureCol}));
    const pivoted=pivotLongToWide(originalDataRows,originalHeaders,{measureCol:newMeasureCol,condCol,idCol});
    setRawRows(pivoted);setHeaderRows(1);applyHeaders(pivoted,1);
    // Re-detect assay on original headers (same as confirmPivot)
    const det=detectAssay(fileNameRef.current, originalHeaders);
    if(det&&(det.confidence==="high"||det.confidence==="low")){setAssay(det.assay);setAssayAutoDetected(det.confidence==="high");setAssaySuggestion(det.confidence==="low"?det.assay:null);const _dt=ASSAY_DATATYPE_MAP[det.assay]||'continuous';setDataType(_dt);}
    else{setAssay("general");setAssayAutoDetected(false);setAssaySuggestion(null);}
  },[pivotConfig,applyHeaders]);

  const sum=useMemo(()=>data&&roles.length?summarize(data,roles,condPerCol,zeroAsMissing):null,[data,roles,condPerCol,zeroAsMissing]);

  // Determine if condition structure already exists from header or COND column.
  // When it does, columns within each group are replicates — no gate needed.
  const hasCondStructure=useMemo(()=>{
    const uniqGrps=condPerCol?[...new Set(condPerCol.filter(Boolean))]:[];
    if(uniqGrps.length>=2) return 'header'; // two-row header with column groups
    if(roles.some(r=>r==='condition')) return 'cond'; // COND column assigned
    return false;
  },[condPerCol,roles]);

  // Effective column relationship: prefer user/auto-set choice; fall back to
  // 'replicates' when condition structure exists but the colRel useEffect
  // (below) has not yet run on this render. The fallback also lets a user
  // click 'Non-replicates' to override the auto-resolved 'replicates' on
  // structured input — the click sets colRelationship and wins this OR.
  const effectiveColRel = colRelationship || (hasCondStructure ? 'replicates' : null);

  // S122 — Auto-resolve colRelationship to 'replicates' when condition
  // structure is detectable (two-row header → 'header', COND column → 'cond').
  // Mirror of the rowSem useEffect below: only auto-apply if the user has
  // not frozen a choice (colRelationship === null OR currently in AUTO).
  // The pivot path (confirmPivot) sets 'conditions' explicitly and is not
  // affected because hasCondStructure is false on pivoted output.
  // S123 — Deps fully enumerated so the effect re-checks when any of its
  // read state changes. setState with identical values is a no-op so there
  // is no re-fire loop. A user click setting colRelAutoSet=false freezes
  // the choice (condition evaluates false on re-check).
  useEffect(() => {
    if (hasCondStructure && (colRelationship === null || colRelAutoSet)) {
      setColRelationship('replicates');
      setColRelAutoSet(true);
    }
  }, [hasCondStructure, colRelationship, colRelAutoSet]);

  // S118 Track H — Row Semantics Gate auto-suggest.
  // Recomputed reactively when assay or long-format detection changes.
  // The user can override at any time; once they touch the buttons,
  // `rowSemAutoSet` flips false and the suggestion no longer overwrites.
  const rowSemSuggestion = useMemo(
    () => suggestRowSemantics({ assay, longFormatDetected }),
    [assay, longFormatDetected]
  );
  useEffect(() => {
    // Only auto-apply when the user has not already chosen explicitly.
    // `rowSemAutoSet` is true while the gate is in AUTO state — user clicks
    // flip it false and freeze the choice.
    if (rowSemSuggestion.value && (rowSemantics === null || rowSemAutoSet)) {
      setRowSemantics(rowSemSuggestion.value);
      setRowSemAutoSet(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSemSuggestion.value]);

  // Resolved row-semantics sent to the engine; defaults to 'ordered' when
  // unresolved (Run is gated when this would be null, see handleProceed).
  const effectiveRowSem = rowSemantics || 'ordered';
  const rowSemRequired = !rowSemantics && data && roles.length > 0 && rowSemSuggestion.value === null;
  const tests=useMemo(()=>sum?getApplicabilityTests(sum,effectiveColRel):[],[sum,effectiveColRel]);
  const nOk=tests.filter(t=>t.ok).length;
  const fams=useMemo(()=>{const f={};for(const t of tests){if(!f[t.fam])f[t.fam]={ok:0,n:0};f[t.fam].n++;if(t.ok)f[t.fam].ok++;}return f;},[tests]);

  const condSpans=useMemo(()=>buildCondSpans(condPerCol),[condPerCol]);

  // ── Frozen column computation — reactive to role changes ──
  const freeze=useMemo(()=>{
    const n=countFrozenCols(roles);
    if(n===0) return null;
    const offsets=[0]; // index 0 = # col (left:0)
    let left=FREEZE_COL_W.ROW_NUM;
    for(let i=0;i<n;i++){offsets.push(left);left+=FREEZE_COL_W.ID_COL;}
    // Condition span freeze analysis
    const spanFrozen=[];
    if(condSpans.length>0){
      let s=0;
      for(const sp of condSpans){const e=s+sp.len-1;spanFrozen.push(e<n);s+=sp.len;}
    }
    return{n,offsets,totalW:left,spanFrozen};
  },[roles,condSpans]);

  // Build column entries for ScrollTable
  const tableColumns=useMemo(()=>{
    const removed=prepInfo?.removedCols||[];
    return hdrs.map((h,i)=>{
      let origIdx=i;
      for(const rc of removed){if(rc<=origIdx)origIdx++;}
      return{letter:colToExcelLetter(origIdx),name:h,role:roles[i]};
    });
  },[hdrs,roles,prepInfo]);

  // Auto-detect VST when data is available and dataType is not ordinal.
  // Runs eagerly so the selector card appears without needing to click Run first.
  // S123 — Removed `assay !== 'general'` early-return so domain-specific
  // assays (elisa, densitometry, proteomics, genomics, cell_count …) also
  // surface a Zone 3 card when detectVST proposes a non-raw transform.
  // Default pre-selection: 'apply' for domain-specific assays (the assay
  // IS the user's expert signal, matching pre-S123 engine routing);
  // 'raw' for assay='general' (unchanged safe default — user must opt in).
  useMemo(()=>{
    if(!data||!roles.length||dataType==='ordinal')return;
    // Build a temporary config to extract the matrix for VST detection
    const config={data,roles,hdrs,condPerCol,zeroAsMissing,assay,dataType,colRelationship:effectiveColRel};
    try{
      const{matrix}=extractAnalysisInputs(config);
      const proposed=detectVST(matrix,assay);
      if(proposed && proposed.transform!=='raw'){
        setVstProposal(proposed);
        setVstDecision('apply');
        setVstAutoSet(true);
      } else {
        setVstProposal(null);
        setVstDecision(null);
        setVstAutoSet(false);
      }
    }catch(e){/* ignore — matrix extraction may fail during partial setup */}
  },[data,roles,hdrs,condPerCol,zeroAsMissing,assay,dataType,effectiveColRel]);

  const EDGE=10;
  const previewRows=useMemo(()=>{
    if(!data)return[];
    if(data.length<=EDGE*2+5)return data.map((row,i)=>({row,idx:i}));
    return[...data.slice(0,EDGE).map((row,i)=>({row,idx:i})),{gap:true,skipped:data.length-EDGE*2},...data.slice(-EDGE).map((row,i)=>({row,idx:data.length-EDGE+i}))];
  },[data]);

  const fmtCell=(v,role)=>{
    if(v==null||v==="")return <span style={{color:C.TEXT_4}}>—</span>;
    if(role==="data"){if(!isNaN(Number(v)))return <span style={{...M,color:C.TEXT}}>{v}</span>;return <span style={{...M,color:UI.WARN.text,fontStyle:"italic"}}>{v}</span>;}
    if(role==="condition")return <span style={{color:UI.WARN.text}}>{v}</span>;
    if(role==="label")return <span style={{color:ROLES.label.color}}>{v}</span>;
    return <span style={{color:C.TEXT_4}}>{v}</span>;
  };

  const handleProceed=()=>{
    const config={data,roles,hdrs,condPerCol,zeroAsMissing,assay,dataType,fileName,isPivoted:!!pivotConfig,colRelationship:effectiveColRel,rowSemantics:effectiveRowSem,excelMeta,
      skippedRows:prepInfo?.skippedRows||0,
      headerRows:headerRows||0,
      removedCols:prepInfo?.removedCols||[],
      headerContent:rawRows?rawRows.slice(0,headerRows||0):[],
      summary:sum,
    };
    if(dataType==='ordinal'){
      onProceed({...config, vstDecision:{transform:'raw',reason:'Ordinal data — no transform applied'}});
      return;
    }
    // S123 — Any assay with a non-raw VST proposal routes through the
    // user's (possibly auto-pre-selected) card choice. Pre-S123 domain-
    // specific assays bypassed this and re-ran detectVST in App.jsx with
    // no pre-run surface; post-S123 the default pre-selection matches the
    // pre-S123 engine result, so batch parity is preserved.
    if(vstProposal && vstDecision){
      const vst = vstDecision==='apply' ? vstProposal : {transform:'raw',reason:'User override — raw values used'};
      onProceed({...config, vstDecision:vst});
      return;
    }
    // No proposal (detectVST returned 'raw'): let App.jsx fall back to
    // detectVST with full assay context.
    onProceed(config);
  };

  const card={background:C.BG_L,border:`1px solid ${C.BORDER}`,borderRadius:CR.LG,padding:"14px 18px",marginBottom:"12px"};
  // Identity-row-label register per typography system.
  const fieldLabel={fontSize:FS.base,color:C.TEXT_3,marginBottom:"4px",fontWeight:FW.NORM};
  const zoneHeader = (num, label) => (
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
      <div style={{flex:1,height:"1px",background:C.BORDER}}/>
      <span style={{fontSize:FS.lg,color:C.TEXT,fontWeight:FW.SEMI,whiteSpace:"nowrap"}}>{num} · {label}</span>
      <div style={{flex:1,height:"1px",background:C.BORDER}}/>
    </div>
  );
  // All zones are rounded panels on white page background
  const zonePanel={background:C.BG_ZONE,borderRadius:CR.LG,padding:"20px 18px",width:"100%",boxSizing:"border-box"};
  const zoneGap={height:"16px"}; // gap between panels — white page shows through

  return (
    <div>
      {/* Long-format pivot modal */}
      {longFormatModal&&(
        <LongFormatModal
          detection={longFormatModal.detection}
          headers={longFormatModal.headers}
          onConfirm={confirmPivot}
          onDismiss={dismissPivot}
        />
      )}
      {/* Upload zone — full drop zone before load, compact bar after */}
      {!data ? (
        <div>
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);onFile(e.dataTransfer?.files?.[0]);}}
          style={{border:"2px dashed "+(dragging?CC.OBS:C.BORDER),borderRadius:CR.XL,padding:"48px 28px",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"180px",
            width:"100%",boxSizing:"border-box",background:dragging?C.BG:C.WHITE,transition:"all 0.2s"}}>
          <p style={{color:C.TEXT,fontSize:FS.base,fontWeight:FW.NORM,marginTop:0,marginBottom:"12px"}}>Upload a dataset to begin analysis</p>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <label style={{cursor:"pointer",display:"inline-block",padding:"10px 24px",background:C.BG,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED}}>
              Upload File
              <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
            </label>
            {onBatch&&<button onClick={onBatch} style={{padding:"10px 16px",background:C.BG,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,color:C.TEXT,fontSize:FS.base,cursor:"pointer",fontWeight:FW.MED}}>Batch Analysis</button>}
          </div>
          <p style={{color:C.TEXT_3,fontSize:FS.sm,marginTop:"10px",marginBottom:0}}>Drop a .csv / .tsv / .xlsx file</p>
        </div>
        <div style={{textAlign:"center",marginTop:"20px"}}>
          <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:C.TEXT,marginBottom:"4px"}}>🔒 Your data never leaves your computer</div>
          <div style={{fontSize:FS.base,fontWeight:FW.NORM,color:C.TEXT_3}}>All analyses run in your browser. No data is uploaded, transmitted, or stored by this software.</div>
        </div>
        </div>
      ) : (
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);onFile(e.dataTransfer?.files?.[0]);}}
          style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",
            background:dragging?C.BG:C.WHITE,border:`1px solid ${dragging?CC.OBS:C.BORDER}`,borderRadius:CR.MD,
            fontSize:FS.base,flexWrap:"wrap",transition:"all 0.2s"}}>
          <button onClick={()=>{setData(null);setRawRows(null);setFileName("");setErr(null);setPrepInfo(null);setBlocks(null);setSelectedBlock(0);setHdrs([]);setRoles([]);setCondPerCol(null);setCondColorMap({});setAssay("general");setAssayAutoDetected(false);setAssaySuggestion(null);setDataType("continuous");setZeroAsMissing(false);setColRelationship(null);setColRelAutoSet(false);setRowSemantics(null);setRowSemAutoSet(false);setLongFormatDetected(false);setPivotConfig(null);setVstProposal(null);setVstDecision(null);setVstAutoSet(false);setExcelMeta(null);setExcelSheetPicker(null);setApplicExpanded(false);}}
            style={{background:"none",border:"none",cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,padding:0}}>← Back</button>
          <span style={{color:C.BORDER}}>|</span>
          <span style={{color:C.TEXT,fontWeight:FW.SEMI,fontSize:FS.base}}>{fileName}</span>
          <span style={{flex:1}}/>
          <label style={{cursor:"pointer",padding:"4px 12px",background:C.BG,border:`1px solid ${C.BORDER}`,borderRadius:CR.SM,color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED}}>
            Change file
            <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
          </label>
          {prepInfo&&(prepInfo.skippedRows>0||prepInfo.removedCols.length>0||prepInfo.trimmedRows>0)&&(
            <div style={{width:"100%",fontSize:FS.sm,color:C.TEXT_3,marginTop:"2px"}}>
              Auto-cleaned:
              {prepInfo.skippedRows>0&&<span> stripped {prepInfo.skippedRows} preamble row{prepInfo.skippedRows>1?"s":""}</span>}
              {prepInfo.trimmedRows>0&&<span> · trimmed {prepInfo.trimmedRows} trailing row{prepInfo.trimmedRows>1?"s":""}</span>}
              {prepInfo.removedCols.length>0&&<span> · removed {prepInfo.removedCols.length} sparse separator column{prepInfo.removedCols.length>1?"s":""}</span>}
            </div>
          )}
        </div>
      )}

      {err&&<div style={{background:FLAG_STYLES.HIGH.bg,border:`1px solid ${SIGNAL.RED.border}`,borderRadius:CR.LG,padding:"12px 16px",color:FLAG_STYLES.HIGH.text,fontSize:FS.base,marginBottom:"12px"}}>{err}</div>}

      {/* Excel sheet picker — shown when workbook has multiple sheets */}
      {excelSheetPicker&&(
        <div style={{background:UI.INFO.bg,border:`1px solid ${ACCENT.BLUE.border}`,borderRadius:CR.LG,padding:"14px 18px",marginBottom:"12px"}}>
          <div style={{fontSize:FS.sm,color:UI.INFO.text,fontWeight:FW.SEMI,marginBottom:"8px"}}>Select sheet</div>
          <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:"10px"}}>
            This workbook contains {excelSheetPicker.sheetNames.length} sheets. Select which sheet to analyse:
          </div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {excelSheetPicker.sheetNames.map((name,i)=>(
              <button key={name} onClick={()=>loadExcelSheet(excelSheetPicker.file,name)}
                style={{padding:"8px 16px",background:i===0?CC.OBS:C.WHITE,border:`1px solid ${i===0?CC.OBS:C.BORDER}`,
                  borderRadius:CR.MD,color:i===0?C.WHITE:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer"}}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}


      {blocks&&blocks.length>1&&(
        <div style={card}>
          <div style={{...fieldLabel,color:C.TEXT}}>Multiple data blocks detected — select one to analyse</div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {blocks.map((block,bi)=>{
              const info=blockSummary(block);const active=bi===selectedBlock;
              return <button key={bi} onClick={()=>{setSelectedBlock(bi);loadBlock(block);}} style={{padding:"10px 16px",borderRadius:CR.MD,cursor:"pointer",background:active?C.BG:C.BG,border:"1px solid "+(active?CC.OBS:C.BORDER),textAlign:"left",minWidth:"160px"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:active?CC.OBS:C.TEXT,marginBottom:"4px"}}>Block {bi+1}</div>
                <div style={{fontSize:FS.base,color:C.TEXT_3}}>{info.dataRows} data rows, {info.cols} cols</div>
                <div style={{fontSize:FS.sm,color:C.TEXT_3,marginTop:"2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"200px"}}>{info.preview}</div>
              </button>;
            })}
          </div>
        </div>
      )}

      {data&&<div style={zoneGap}/>}
      {data&&(
        <div style={zonePanel}>
        {zoneHeader("1", "Describe your data")}
        <div style={{display:"flex",gap:"14px",flexWrap:"wrap",alignItems:"flex-start",marginBottom:"8px",width:"100%"}}>
          <div style={{flex:"0 0 auto"}}>
            <div style={fieldLabel}># Header rows</div>
            <div style={{display:"flex"}}>
              {[0,1,2].map(n=>(
                <button key={n} onClick={()=>{setHeaderRows(n);if(rawRows)applyHeaders(rawRows,n);}}
                  style={{padding:"0 14px",height:"36px",boxSizing:"border-box",fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",
                    background:headerRows===n?C.BG:C.WHITE,border:"1px solid "+(headerRows===n?CC.OBS:C.BORDER),
                    color:headerRows===n?C.TEXT:C.TEXT_3,borderRadius:n===0?`${CR.MD} 0 0 ${CR.MD}`:n===2?`0 ${CR.MD} ${CR.MD} 0`:"0",marginLeft:n>0?"-1px":0}}>{n}</button>
              ))}
            </div>
          </div>
          <div ref={assayRef} style={{position:"relative",flex:"1 1 240px",minWidth:"240px"}}>
            <div style={fieldLabel}>Measurement type</div>
            <button onClick={()=>setAssayOpen(!assayOpen)} style={{width:"100%",textAlign:"left",height:"36px",boxSizing:"border-box",
              background:data&&assay==="general"?UI.WARN.bg:C.WHITE,
              border:`1px solid ${data&&assay==="general"?UI.WARN.border:C.BORDER}`,
              borderRadius:CR.MD,padding:"0 12px",cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{display:"flex",alignItems:"center",gap:"6px"}}>
                {ASSAYS.find(a=>a.v===assay)?.l}
                {/* S123 — AUTO badge covers both high-confidence detection
                    (assayAutoDetected=true) and low-confidence silent
                    application (assay was set by detectAssay to the
                    suggestion value; user has not touched it). User click
                    clears assaySuggestion → badge drops. S141 — passive
                    provenance badge: sentence-case content, chrome
                    preserved pending C.5b chip-family redesign. */}
                {(assayAutoDetected||(assay!=="general"&&assaySuggestion===assay))&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                {data&&assay==="general"&&<span style={{display:"inline-block",fontSize:FS.xs,background:C.BG,color:C.TEXT_2,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,letterSpacing:"0.02em",userSelect:"none"}}>SET ME</span>}
              </span>
              <span style={{color:C.TEXT_3,transform:assayOpen?"rotate(180deg)":"",transition:"0.15s"}}>▾</span>
            </button>
            {assayOpen&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:"3px",zIndex:50,background:C.WHITE,border:`1px solid ${C.BORDER}`,borderRadius:CR.LG,boxShadow:"0 8px 24px rgba(0,0,0,.1)",maxHeight:"260px",overflowY:"auto"}}>
                {ASSAYS.map(a=>(
                  <button key={a.v} onClick={()=>{setAssay(a.v);setAssayAutoDetected(false);setAssaySuggestion(null);setAssayOpen(false);const _dt=ASSAY_DATATYPE_MAP[a.v]||'continuous';setDataType(_dt);setVstProposal(null);setVstDecision(null);setVstAutoSet(false);}}
                    style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",border:"none",background:a.v===assay?C.BG:C.WHITE,cursor:"pointer",borderBottom:`1px solid ${C.BORDER_L}`}}>
                    <div style={{fontSize:FS.base,fontWeight:FW.MED,color:C.TEXT}}>{a.l}</div>
                    <div style={{fontSize:FS.sm,color:C.TEXT_3,marginTop:"2px"}}>{a.d}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{flex:"0 0 160px"}}>
            {(()=>{const locked=assay!=="general"&&!!ASSAY_DATATYPE_MAP[assay];return <>
            <div style={fieldLabel}>Data type</div>
            <select value={dataType} disabled={locked} onChange={e=>setDataType(e.target.value)}
              style={{width:"100%",height:"36px",boxSizing:"border-box",padding:"0 12px",border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,fontSize:FS.base,fontWeight:FW.MED,color:locked?C.TEXT_3:C.TEXT,background:locked?C.BG:C.WHITE,cursor:locked?"default":"pointer",opacity:locked?0.7:1}}>
              {DATA_TYPES.map(dt=>(
                <option key={dt.v} value={dt.v}>{dt.l}</option>
              ))}
            </select>
            {locked&&<div style={{fontSize:FS.sm,color:C.TEXT_3,marginTop:"3px"}}>Set by measurement type</div>}
            </>;})()}
          </div>
        </div>
        {/* Assay hints — below the control row, not embedded in the assay column */}
        {data&&assay==="general"&&<div style={{fontSize:FS.sm,color:UI.WARN.text,marginBottom:"4px"}}>Select a measurement type for instrument-specific noise flagging{assaySuggestion&&(()=>{
          const sug=ASSAYS.find(a=>a.v===assaySuggestion);
          return sug?<span> · Suggested: <button onClick={()=>{setAssay(sug.v);setAssayAutoDetected(false);setAssaySuggestion(null);setAssayOpen(false);}}
            style={{background:"none",border:"none",color:CC.OBS,fontWeight:FW.MED,cursor:"pointer",textDecoration:"underline",fontSize:FS.sm,padding:0}}>{sug.l}</button></span>:null;
        })()}</div>}
        {(()=>{const hint=assayPlausibilityHint(assay,sum);return hint&&(
          <div style={{fontSize:FS.sm,marginBottom:"8px",padding:"5px 8px",borderRadius:CR.MD,lineHeight:"1.5",
            background:hint.level==="warn"?UI.WARN.bg:UI.INFO.bg,
            border:`1px solid ${hint.level==="warn"?UI.WARN.border:UI.INFO.border}`,
            color:hint.level==="warn"?FLAG_STYLES.MODERATE.text:C.TEXT}}>
            {hint.level==="warn"?"⚠ ":"ℹ "}{hint.text}
          </div>
        );})()}
        </div>
      )}

      {data&&<div style={zoneGap}/>}
      {data&&(
        <div style={zonePanel}>
        {zoneHeader("2", "Review columns")}
        <div style={{marginBottom:"0"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px",flexWrap:"wrap"}}>
            <span style={{fontSize:FS.base,color:C.TEXT}}>▼ Click headers to set column roles.</span>
            <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
              {[["Auto",()=>{if(data)setRoles(inferRoles(data,hdrs,condPerCol));}],["All data",()=>setRoles(p=>p.map(()=>"data"))],["All off",()=>setRoles(p=>p.map(()=>"ignore"))]].map(([label,fn])=>(
                <button key={label} onClick={fn}
                  onMouseEnter={e=>e.currentTarget.style.background=C.BG_L}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  style={{background:"transparent",border:`1px solid ${C.BORDER}`,color:C.TEXT,fontSize:FS.sm,fontWeight:FW.NORM,padding:"4px 10px",borderRadius:CR.SM,cursor:"pointer"}}>{label}</button>
              ))}
            </span>
          </div>
        </div>

      {/* Preview table */}
      {hdrs.length>0&&(
        <div>
          <ScrollTable
            columns={tableColumns}
            condSpans={condSpans.length>0?condSpans:null}
            condColorMap={condColorMap}
            freeze={freeze}
            previewRows={previewRows}
            height="360px"
            renderRowNum={(ri)=>originalFileRow(ri,prepInfo?.skippedRows,headerRows)}
            renderCell={(row,col,ci,ri,zebraBg)=>{
              const isFrz=freeze&&ci<freeze.n;
              return{
                content:fmtCell(row[ci],roles[ci]),
                style:{
                  padding:"4px 6px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                  opacity:roles[ci]==="ignore"?0.4:1,textAlign:"center",
                  ...(isFrz?{background:zebraBg}:{}),
                },
              };
            }}
            onHeaderClick={(ci)=>{setRoles(p=>{const n=[...p];n[ci]=ROLE_KEYS[(ROLE_KEYS.indexOf(n[ci])+1)%4];return n;});}}
          />
          {data.length>EDGE*2+5&&<div style={{padding:"6px 12px",borderTop:`1px solid ${C.BORDER_L}`,fontSize:FS.sm,color:C.TEXT_3,textAlign:"center"}}>Showing first {EDGE} and last {EDGE} of {data.length.toLocaleString()} rows</div>}
        </div>
      )}
      </div>
      )}

      {sum&&<div style={zoneGap}/>}
      {sum&&(
        <div style={zonePanel}>
        {zoneHeader("3", "Configure analysis")}

        {/* Treat 0 as missing */}
        <div style={{background:C.WHITE,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.LG,padding:"14px 18px",marginBottom:"8px"}}>
          <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",color:zeroAsMissing?ROLES.condition.color:C.TEXT,fontSize:FS.base}}>
            <input type="checkbox" checked={zeroAsMissing} onChange={()=>setZeroAsMissing(v=>!v)} style={{accentColor:CC.OBS}}/>
            Treat 0 as missing
            {sum.zeros>0&&<span style={{fontSize:FS.base,color:C.TEXT_3}}>({sum.zeros} zeros in dataset)</span>}
            {(sum.zeros===0||sum.zeros==null)&&<span style={{fontSize:FS.base,color:C.TEXT_3}}>No zeros detected</span>}
          </label>
          {!zeroAsMissing && sum.zeros > 0 && (assay === 'genomics' || assay === 'cell_count') && (
            <div style={{fontSize:FS.sm,color:ROLES.condition.color,background:UI.WARN.bg,border:`1px solid ${ACCENT.GOLD.border}`,borderRadius:CR.MD,padding:"6px 10px",marginTop:"6px"}}>
              <strong>Recommended:</strong> {assay === 'genomics' ? 'RNA-seq' : 'Cell count'} data has {sum.zeros} zero values.
              Zero-count {assay === 'genomics' ? 'genes' : 'entries'} are uninformative for forensic screening and can distort duplicate detection and variance estimates.
              <button onClick={()=>setZeroAsMissing(true)}
                style={{marginLeft:"8px",background:C.WHITE,border:`1px solid ${ACCENT.GOLD.border}`,borderRadius:CR.SM,padding:"2px 8px",fontSize:FS.sm,cursor:"pointer",color:UI.WARN.text,fontWeight:FW.MED}}>
                Enable
              </button>
            </div>
          )}
        </div>

        {/* Column Relationship Gate (S46, AUTO-render S122). Always renders
            when nDC ≥ 2: pre-filled with AUTO badge on the selected button
            when auto-resolved (two-row header, COND column, or pivot →
            'conditions'); REQUIRED state with orange left border when no
            structure auto-resolves and the user has not yet chosen. */}
        {sum.nDC>=2&&(()=>{
          const isAuto = colRelAutoSet;
          const isRequired = !colRelationship && !isAuto;
          return (
          <div style={{background:C.WHITE, border:`1px solid ${C.BORDER_L}`, borderLeft:isRequired?`3px solid #F59E0B`:`3px solid ${C.BORDER_L}`, borderRadius:CR.LG,padding:"14px 18px",marginBottom:"8px"}}>
            <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:"10px",lineHeight:"1.5",display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap"}}>
              <span>Are the {sum.nDC} DATA columns <strong>replicates</strong> or <strong>non-replicates</strong>?</span>
              {isRequired&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.REQUIRED.bg,color:BADGE.REQUIRED.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,letterSpacing:"0.02em",userSelect:"none"}}>REQUIRED</span>}
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"6px"}}>
              <button onClick={()=>{setColRelationship('replicates');setColRelAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:colRelationship==='replicates'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${colRelationship==='replicates'?CC.OBS:C.BORDER}`,
                  opacity:colRelationship&&colRelationship!=='replicates'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:colRelationship==='replicates'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!isAuto&&colRelationship==='replicates'?"✓ ":""}Replicates</span>
                  {isAuto&&colRelationship==='replicates'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>Columns measure the same thing</div>
              </button>
              <button onClick={()=>{setColRelationship('conditions');setColRelAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:colRelationship==='conditions'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${colRelationship==='conditions'?CC.OBS:C.BORDER}`,
                  opacity:colRelationship&&colRelationship!=='conditions'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:colRelationship==='conditions'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!isAuto&&colRelationship==='conditions'?"✓ ":""}Non-replicates</span>
                  {isAuto&&colRelationship==='conditions'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>Columns measure different things</div>
              </button>
            </div>
            {isRequired&&(
              <div style={{fontSize:FS.sm,color:C.TEXT_3,lineHeight:"1.4"}}>
                Select the column relationship before running analysis.
              </div>
            )}
          </div>
          );
        })()}

        {/* Row Semantics Gate (S118 Track H, AUTO-render S122). Always
            renders when nDC ≥ 1: pre-filled with AUTO badge on the selected
            button when auto-resolved (long-format → arbitrary, genomics →
            arbitrary, instrument assay → ordered); REQUIRED state with
            orange left border when assay is ambiguous (general / proteomics
            / survey on wide-format input). Five sequential tests
            (§2.3 Runs, §2.4 Row-Mean Runs, §2.6b Blocked Mahalanobis,
            §2.7 LOESS, §4.2 Regional Noise) and two sub-units (§2.5 IRC
            windowed, §4.3 Within-Row Variance windowed) gate on this
            choice. See METHODOLOGY.md §"Row Semantics Gate". */}
        {sum.nDC>=1&&(()=>{
          const isAuto = rowSemAutoSet;
          const isRequired = !rowSemantics && !isAuto;
          const autoSubText = isAuto
            ? (rowSemSuggestion.reason==='long-format' ? "Auto: long-format detected"
              : rowSemSuggestion.reason==='genomics'   ? "Auto: genomics assay"
              : rowSemSuggestion.reason==='assay'      ? "Auto: instrument assay"
              : null)
            : null;
          return (
          <div style={{background:C.WHITE, border:`1px solid ${C.BORDER_L}`, borderLeft:isRequired?`3px solid #F59E0B`:`3px solid ${C.BORDER_L}`, borderRadius:CR.LG,padding:"14px 18px",marginBottom:"8px"}}>
            <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:autoSubText?"4px":"10px",lineHeight:"1.5",display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap"}}>
              <span>Is the row order <strong>meaningful</strong> (plate position, instrument sequence, dose gradient) or <strong>arbitrary</strong> (gene list, alphabetised protein IDs, subject ID)?</span>
              {isRequired&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.REQUIRED.bg,color:BADGE.REQUIRED.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,letterSpacing:"0.02em",userSelect:"none"}}>REQUIRED</span>}
            </div>
            {autoSubText&&<div style={{fontSize:FS.xs,color:C.TEXT_3,marginBottom:"10px",lineHeight:"1.4"}}>{autoSubText}</div>}
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"6px"}}>
              <button onClick={()=>{setRowSemantics('ordered');setRowSemAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:rowSemantics==='ordered'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${rowSemantics==='ordered'?CC.OBS:C.BORDER}`,
                  opacity:rowSemantics&&rowSemantics!=='ordered'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:rowSemantics==='ordered'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!isAuto&&rowSemantics==='ordered'?"✓ ":""}Ordered</span>
                  {isAuto&&rowSemantics==='ordered'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>Row order carries forensic meaning</div>
              </button>
              <button onClick={()=>{setRowSemantics('arbitrary');setRowSemAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:rowSemantics==='arbitrary'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${rowSemantics==='arbitrary'?CC.OBS:C.BORDER}`,
                  opacity:rowSemantics&&rowSemantics!=='arbitrary'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:rowSemantics==='arbitrary'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!isAuto&&rowSemantics==='arbitrary'?"✓ ":""}Arbitrary</span>
                  {isAuto&&rowSemantics==='arbitrary'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>Row order is not meaningful (e.g. gene list)</div>
              </button>
            </div>
            {isRequired&&(
              <div style={{fontSize:FS.sm,color:C.TEXT_3,lineHeight:"1.4"}}>
                Select the row order before running analysis.
              </div>
            )}
          </div>
          );
        })()}

        {/* VST selector card (S123 — renders for ANY assay whose
            detectVST proposes a non-raw transform). Pre-selection + AUTO
            badge follow the S122 gate pattern: domain-specific assays
            pre-select 'apply' (the assay is the user's expert signal,
            matching pre-S123 engine routing); assay='general'
            pre-selects 'raw' (safe default — user opt-in to log/Anscombe).
            User click freezes the choice (vstAutoSet=false). */}
        {vstProposal&&(()=>{
          const assayLabel = ASSAYS.find(a=>a.v===assay)?.l || assay;
          const transformLabel = vstProposal.transform==='log' ? 'log transform' : 'Anscombe transform';
          const autoSubText = vstAutoSet && vstDecision==='apply'
            ? `Auto: ${transformLabel} for ${assayLabel} assay`
            : null;
          return (
          <div style={{background:C.WHITE, border:`1px solid ${C.BORDER_L}`, borderLeft:`3px solid ${C.BORDER_L}`, borderRadius:CR.LG,padding:"14px 18px",marginBottom:"8px"}}>
            <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:autoSubText?"4px":"10px",lineHeight:"1.55"}}>
              {assay==='general'
                ? (vstProposal.transform==='log'
                    ? <>Proportional noise detected (slope = {vstProposal.dataSlope?.toFixed(2)}, 95% CI [{vstProposal.slopeCI?.[0]?.toFixed(2)}, {vstProposal.slopeCI?.[1]?.toFixed(2)}]). <strong>Apply log transform?</strong></>
                    : <>Integer data with Poisson-like variance detected. <strong>Apply Anscombe transform?</strong></>)
                : <><strong>{assayLabel}</strong> assays typically use {transformLabel} to stabilise variance before forensic screening.</>
              }
            </div>
            {autoSubText&&<div style={{fontSize:FS.xs,color:C.TEXT_3,marginBottom:"10px",lineHeight:"1.4"}}>{autoSubText}</div>}
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"6px"}}>
              <button onClick={()=>{setVstDecision('raw');setVstAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:vstDecision==='raw'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${vstDecision==='raw'?CC.OBS:C.BORDER}`,
                  opacity:vstDecision&&vstDecision!=='raw'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:vstDecision==='raw'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!vstAutoSet&&vstDecision==='raw'?"✓ ":""}Keep raw (no transform)</span>
                  {vstAutoSet&&vstDecision==='raw'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>
                  Safe default for most data
                </div>
              </button>
              <button onClick={()=>{setVstDecision('apply');setVstAutoSet(false);}}
                style={{flex:"1 1 180px",padding:"10px 14px",borderRadius:CR.MD,cursor:"pointer",textAlign:"left",
                  background:vstDecision==='apply'?ACCENT.BLUE.bg:C.WHITE,
                  border:`1.5px solid ${vstDecision==='apply'?CC.OBS:C.BORDER}`,
                  opacity:vstDecision&&vstDecision!=='apply'?0.65:1,transition:"opacity 0.15s"}}>
                <div style={{fontSize:FS.base,fontWeight:FW.SEMI,color:vstDecision==='apply'?CC.OBS:C.TEXT,marginBottom:"3px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <span>{!vstAutoSet&&vstDecision==='apply'?"✓ ":""}Apply {transformLabel}</span>
                  {vstAutoSet&&vstDecision==='apply'&&<span style={{display:"inline-block",fontSize:FS.xs,background:BADGE.AUTO.bg,color:BADGE.AUTO.text,borderRadius:"4px",padding:"2px 6px",fontWeight:FW.MED,userSelect:"none"}}>Auto</span>}
                </div>
                <div style={{fontSize:FS.base,color:C.TEXT_3,lineHeight:"1.4"}}>
                  {vstProposal.transform==='log'
                    ? "For instrument data with proportional noise"
                    : "For count data (cell counts, colonies)"}
                </div>
              </button>
            </div>
          </div>
          );
        })()}
        </div>
      )}

      {sum&&<div style={zoneGap}/>}
      {sum&&<div style={zonePanel}>
      {zoneHeader("4", "Summary")}
          {/* Stats grid — clean 3×3 + precision */}
          {(()=>{
            const precLabel = sum.prec&&Object.keys(sum.prec).length>0
              ? (()=>{const dps=Object.keys(sum.prec).map(Number).sort((a,b)=>a-b);
                  return dps.length>1?`mixed (${dps[0]}–${dps[dps.length-1]}dp)`:dps[0]+"dp";})()
              : null;
            const precTooltip = sum.prec&&Object.keys(sum.prec).length>0
              ? Object.entries(sum.prec).sort((a,b)=>Number(a[0])-Number(b[0])).map(([dp,n])=>{
                  const tz=sum.precTrailingZero&&sum.precTrailingZero[dp];
                  const note=tz===n?" (all trailing-zero)":tz?` (${tz} trailing-zero)`:"";
                  return `${dp}dp: ${n}${note}`;
                }).join(", ")
              : null;
            const gridItems=[
              ["Rows",sum.nR],["Data cols",sum.nDC],["Values",sum.total],
              ["Missing",sum.miss],
              ["Non-numeric",sum.nText],
              ["Zeros",sum.zeros],
              ["Range",sum.mn!=null?sum.mn.toPrecision(4)+" – "+sum.mx.toPrecision(4):"—"],
              ["Mag. span",sum.span!=null?sum.span.toFixed(1)+" orders":"—"],
              ["Integer values",((sum.intF||0)*100).toFixed(0)+"%"],
              ...(precLabel?[["Precision",precLabel,null,precTooltip]]:[]),
            ];
            return (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px 18px"}}>
                {gridItems.map(([k,v,c,tip])=>(
                  <div key={k} style={{fontSize:FS.base}} title={tip||undefined}>
                    <span style={{color:C.TEXT_3}}>{k} </span>
                    <span style={{color:c||C.TEXT,fontWeight:FW.SEMI,fontSize:FS.base,whiteSpace:"nowrap"}}>{v}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Conditions — label + badges inline */}
          {sum.nC>0&&(
            <div style={{marginTop:"12px",display:"flex",alignItems:"center",flexWrap:"wrap",gap:"4px 8px"}}>
              <span style={{color:C.TEXT_3,fontSize:FS.base}}>Conditions</span>
              {sum.cNames.map((c,i)=>(
                <span key={i} style={{display:"inline-block",background:condColorMap[c]?.bg||C.BG,color:condColorMap[c]?.text||C.TEXT_2,padding:"2px 6px",borderRadius:"4px",fontSize:FS.xs,fontWeight:FW.NORM,userSelect:"none"}}>{c}</span>
              ))}
            </div>
          )}
          {pivotConfig&&(
            <div style={{marginTop:"8px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
              <span style={{color:C.TEXT_3,fontSize:FS.sm}}>Measuring</span>
              <select value={pivotConfig.measureCol}
                onChange={e=>changeMeasureCol(Number(e.target.value))}
                style={{padding:"3px 8px",border:`1px solid ${ACCENT.BLUE.border}`,borderRadius:CR.MD,fontSize:FS.base,fontFamily:FF.UI,background:ROLES.data.bg,color:C.TEXT,fontWeight:FW.MED,cursor:"pointer"}}>
                {pivotConfig.measureCandidates.map(c=>{
                  const k=String(c.h).toLowerCase().replace(/[^a-z0-9]/g,"");
                  const isPrimary=["ct","cq","od","absorbance","fluorescence","rfu","intensity"].includes(k);
                  const isSecondary=["tm1","tm2","tm","eff","efficiency","cpd1","cpd2"].includes(k);
                  return (
                    <option key={c.ci} value={c.ci}>
                      {isPrimary?"⭐ ":isSecondary?"○ ":""}{c.h}
                    </option>
                  );
                })}
              </select>
              <span style={{fontSize:FS.sm,color:C.TEXT_3}}>— switch to re-run on a different column</span>
            </div>
          )}

      {/* Test Applicability — collapsible, grouped by category */}
      <div style={{height:"16px"}}/>
      {effectiveColRel&&(()=>{
        const byMech={};
        for(const t of tests){
          const mech=t.fam||TEST_MECHANISM[t.name]||"replicate";
          if(!byMech[mech])byMech[mech]={ok:0,total:0,tests:[]};
          byMech[mech].total++;
          if(t.ok)byMech[mech].ok++;
          byMech[mech].tests.push({...t,mech});
        }
        const summaryParts=MECHANISM_ORDER.map(mech=>{
          const g=byMech[mech];if(!g)return null;
          return {mech,m:MECHANISMS[mech],g};
        }).filter(Boolean);
        return (
          <div style={{marginBottom:"12px"}}>
            <button onClick={()=>setApplicExpanded(p=>!p)}
              style={{background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontSize:FS.base,fontWeight:FW.MED,color:C.TEXT,display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
              <span style={{color:C.TEXT_3,fontSize:FS.sm,transform:applicExpanded?"rotate(90deg)":"",transition:"0.15s"}}>▶</span>
              <span>{nOk} of {tests.length} tests applicable</span>
              {!applicExpanded&&<span style={{fontSize:FS.sm,color:C.TEXT_3}}>
                — {summaryParts.map(({m,g})=>`${m.label} ${g.ok}/${g.total}`).join(" · ")}
              </span>}
            </button>
            {applicExpanded&&(
              <div style={{marginTop:"6px"}}>
                {MECHANISM_ORDER.map(mech=>{
                  const g=byMech[mech];if(!g)return null;
                  const m=MECHANISMS[mech];
                  return (
                    <div key={mech} style={{marginBottom:"10px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                        <span style={{width:"8px",height:"8px",borderRadius:"50%",background:m.color,display:"inline-block",flexShrink:0}}/>
                        <span style={{fontSize:FS.base,color:C.TEXT,fontWeight:FW.SEMI}}>{m.label}</span>
                        <span style={{fontSize:FS.sm,color:C.TEXT_3}}>{g.ok}/{g.total}</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"2px 14px",paddingLeft:"14px"}}>
                        {g.tests.map(t=>(
                          <div key={t.name} style={{fontSize:FS.sm,color:t.ok?C.TEXT_2:C.TEXT_3,display:"flex",alignItems:"center",gap:"3px",minWidth:"140px"}}>
                            <span style={{color:t.ok?m.color:C.TEXT_3}}>{t.ok?"✓":"✗"}</span>
                            <span>{DISPLAY_NAMES[t.name]||t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      </div>}

      {/* Run Analysis — page-level action, sibling of Zone 4. Gated on
          column-relationship and row-semantics resolution (S118 Track H). */}
      {sum&&<div style={zoneGap}/>}
      {sum&&(
        <div style={{display:"flex",gap:"8px"}}>
          {sum.nDC>=2?(() => {
            const ready = !!effectiveColRel && !rowSemRequired;
            const label = !effectiveColRel
              ? "Select column relationship above to proceed"
              : rowSemRequired
                ? "Select row order above to proceed"
                : "Run analyses";
            return (
              <button onClick={handleProceed} disabled={!ready}
                style={{flex:1,padding:"13px 24px",background:ready?CC.OBS:C.TEXT_4,border:"none",borderRadius:CR.LG,color:C.WHITE,fontSize:FS.md,fontWeight:FW.SEMI,cursor:ready?"pointer":"not-allowed",opacity:ready?1:0.7}}>
                {label}
              </button>
            );
          })():(
            <div style={{flex:1,padding:"12px 16px",textAlign:"center",color:C.TEXT_2,fontSize:FS.base}}>
              Assign at least 2 columns as data to proceed.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
