// Imported from the website's teamOVR calculation over its full season roster.
// A match substitution or red card does not change the published team rating.
export function teamOverall(team){
  return Number.isFinite(team?.overall)?team.overall:null;
}
