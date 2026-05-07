// Truncate group name for axis labels
export function shortName(s) {
  if(!s) return "";
  return s.replace("Anc4+ LII ","").replace("Anc4+ Loop II","A4+LII")
          .replace("Anc5ΔLoop I","Anc5ΔLI").replace("Anc4+","A4+")
          .replace("Anc","A").slice(0,13);
}
