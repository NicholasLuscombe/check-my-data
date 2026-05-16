import { useState, useCallback } from "react";

/* ── Constants ────────────────────────────────────────────────────────── */
import { C, ACCENT, FF, FS, CR, CC, SIGNAL, M } from "./constants/tokens.js";
import { ROLES } from "./constants/roles.js";

/* ── Analysis engine ──────────────────────────────────────────────────── */
import { extractAnalysisInputs, runFullAnalysis } from "./analysis/engine.js";
import { detectVST } from "./stats/vst.js";

/* ── View components ──────────────────────────────────────────────────── */
import { Logo } from "./components/shared/Logo.jsx";
import { AnalysisErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { ImportView } from "./components/views/ImportView.jsx";
import { BatchView } from "./components/views/BatchView.jsx";
import { ReportView } from "./components/views/ReportView.jsx";

export default function CheckMyData() {
  const [phase,setPhase]=useState("import"); // "import" | "running" | "report" | "batch"
  const [results,setResults]=useState(null);
  const [analysisMatrix,setAnalysisMatrix]=useState(null);
  const [importConfig,setImportConfig]=useState(null);
  const [rowMap,setRowMap]=useState(null); // matrix row index → original data row index

  const [runProgress,setRunProgress]=useState("");
  const [pendingFile,setPendingFile]=useState(null); // File object queued from report "Change file"
  const [importKey,setImportKey]=useState(0); // incremented to force ImportView remount

  const handleProceed=useCallback(async(config)=>{
    setImportConfig(config);
    setRunProgress("");
    setPhase("running");

    try {
      // Build DATA column headers for conditions-mode naming
      const dataColHeaders = config.roles
        ? config.roles.map((r,i) => r==='data' ? (config.hdrs?.[i] || `Col ${i+1}`) : null).filter(h => h !== null)
        : null;
      const{matrix,rawMatrix,filteredIndices,condCtx}=extractAnalysisInputs({
        ...config, colRelationship: config.colRelationship||'replicates', dataColHeaders
      });
      // Use user-confirmed VST decision if provided (general assay prompt);
      // otherwise auto-detect (domain-specific assays, or general with raw proposal)
      const vst = config.vstDecision !== undefined ? config.vstDecision : detectVST(matrix, config.assay);
      setImportConfig({...config, vst});
      setAnalysisMatrix(matrix);
      setRowMap(filteredIndices);
      const testResults=await runFullAnalysis(
        matrix,rawMatrix,condCtx,config.assay,setRunProgress,vst,
        {isPivoted:!!config.isPivoted},config.dataType||'continuous',
        config.rowSemantics||'ordered'
      );
      setResults(testResults);
      setPhase("report");
      window.scrollTo(0,0);
    } catch(e) {
      console.error("Analysis error:", e);
      setRunProgress("Error: "+e.message);
      // Don't leave user stuck — fall back to import after a moment
      setTimeout(()=>setPhase("import"), 3000);
    }
  },[]);

  const handleBack=useCallback(()=>{
    setPhase("import");setResults(null);
    window.scrollTo(0,0);
  },[]);

  const handleChangeFile=useCallback((file)=>{
    setPendingFile(file||null);
    setPhase("import");setResults(null);setImportConfig(null);
    if(!file) setImportKey(k=>k+1); // force ImportView remount when clearing (logo click)
    window.scrollTo(0,0);
  },[]);

  return (
    <div style={{minHeight:"100vh",background:C.BG_L,color:C.TEXT,fontFamily:FF.UI,fontSize:FS.base}}>
      <style>{`@media print { button { display: none !important; } .no-print { display: none !important; } }`}</style>
      {/* Header banner — hidden on in-Report views (Forensics / Review / QC).
          ReportView's own navbar (Back + filename + tab row) carries identity
          there. SESSION126-DESIGN-SPEC §1.2. */}
      {phase!=="report" && (
        <div style={{borderBottom:`1px solid ${C.BORDER_L}`,background:C.WHITE}}>
          <div style={{maxWidth:"980px",margin:"0 auto",padding:"12px 24px",display:"flex",alignItems:"center",gap:"16px"}}>
            <div onClick={()=>handleChangeFile()} style={{cursor:"pointer"}}>
              <Logo width={240}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginLeft:"4px"}}>
              <span style={{...M,color:C.TEXT_3,fontSize:FS.xs}}>v0.8</span>
              {phase==="batch"&&<span style={{...M,color:ROLES.label.color,fontSize:FS.xs,padding:"2px 8px",background:ROLES.label.bg,border:`1px solid ${ACCENT.PURPLE.border}`,borderRadius:CR.SM}}>Batch Analysis</span>}
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:"980px",margin:"0 auto",padding:"20px 24px 60px"}}>
        {phase==="running"&&(
          <div style={{textAlign:"center",padding:"80px 20px"}}>
            {runProgress.startsWith("Error")?(
              <div style={{color:SIGNAL.RED.dot,fontSize:FS.base,marginBottom:"8px"}}>{runProgress}</div>
            ):(
              <div style={{display:"inline-flex",alignItems:"center",gap:"12px",color:CC.OBS,fontSize:FS.base}}>
                <span style={{display:"inline-block",width:"16px",height:"16px",border:`2px solid ${ACCENT.BLUE.border}`,borderTopColor:CC.OBS,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                Running statistical tests…
              </div>
            )}
            {runProgress&&!runProgress.startsWith("Error")&&(
              <div style={{marginTop:"10px",...M,fontSize:FS.xs,color:C.TEXT_3}}>{runProgress}</div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {phase==="import"&&<ImportView key={importKey} onProceed={handleProceed} onBatch={()=>setPhase("batch")} initialConfig={importConfig} pendingFile={pendingFile} onPendingFileConsumed={()=>setPendingFile(null)}/>}
        {phase==="batch"&&<AnalysisErrorBoundary onReset={handleBack}><BatchView onBack={()=>setPhase("import")}/></AnalysisErrorBoundary>}
        {phase==="report"&&results&&(
          <AnalysisErrorBoundary onReset={handleBack}>
            <ReportView
              results={results}
              importConfig={importConfig}
              matrix={analysisMatrix}
              rowMap={rowMap}
              onBack={handleBack}
              onChangeFile={handleChangeFile}
            />
          </AnalysisErrorBoundary>
        )}
      </div>
    </div>
  );
}
