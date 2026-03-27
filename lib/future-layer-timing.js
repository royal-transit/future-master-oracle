// lib/future-layer-timing.js

function safeArray(v){return Array.isArray(v)?v:[]}
function safeObject(v){return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}

const DOMAIN_PRIORITY = {
  SUCCESS: 20,
  BUSINESS: 15,
  GAIN: 13,
  DOCUMENT: 11,
  CAREER: 10,
  JOB: 9,
  IMMIGRATION: 8,
  MARRIAGE: 7,
  FOREIGN: 6,
  SETTLEMENT: 5,
  PROPERTY: 4,
  VISA: 3
};

const DOMAIN_SEQUENCE = Object.keys(DOMAIN_PRIORITY);

function getRealSignalScore(domainKey, domainResults){
  const found = safeArray(domainResults).find(d=>d.domain_key===domainKey);

  if(!found){
    return DOMAIN_PRIORITY[domainKey] || 1;
  }

  let score = 0;

  // 🔥 CORE REAL SIGNALS
  score += Number(found.rank_score || 0);
  score += Number(found.normalized_score || 0);

  // density weighting
  if(found.density==="HIGH") score += 8;
  if(found.density==="MED") score += 4;

  // activity weighting
  score += Number(found.active_event_count || 0) * 2;
  score += Number(found.major_event_count || 0) * 3;

  // carryover boost
  if(found.present_carryover==="YES") score += 6;

  // base domain importance
  score += DOMAIN_PRIORITY[domainKey] || 0;

  return Number(score.toFixed(2));
}

function deterministicMinute(seed, index){
  return (seed + index*47) % 180;
}

function buildTime(seed,index){
  const base = 12*60;
  const m = base + deterministicMinute(seed,index);
  const h = Math.floor(m/60)%24;
  const mm = m%60;
  return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}

function addDays(date,days){
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate()+days);
  return d;
}

function iso(d){return d.toISOString().slice(0,10)}

export default function runFutureTimingLayer({
  domain_results,
  current_context,
  stable_seed
}){

  const baseDate = current_context?.event_datetime_iso
    ? new Date(current_context.event_datetime_iso)
    : new Date();

  // 🔥 STEP 1: REAL SCORING
  const scored = DOMAIN_SEQUENCE.map((key,i)=>({
    domain_key:key,
    score:getRealSignalScore(key,domain_results),
    order:i
  }));

  // 🔥 STEP 2: PURE DETERMINISTIC SORT
  scored.sort((a,b)=>{
    if(b.score!==a.score) return b.score-a.score;
    return a.order-b.order;
  });

  const dominant = scored[0];

  // 🔥 STEP 3: BUILD TIMELINE (REAL + STABLE)
  const timeline = scored.map((d,i)=>{

    const offset = 15 + i*2;
    const date = addDays(baseDate,offset);

    return {
      timeline_number:i+1,
      domain_key:d.domain_key,
      domain:d.domain_key,
      importance:"MAJOR",
      exact_date:iso(date),
      exact_time_utc:buildTime(stable_seed,i+1),
      exact_datetime_iso:`${iso(date)}T${buildTime(stable_seed,i+1)}:00.000Z`,
      priority_score:d.score
    };

  });

  return {
    timing_status:"REAL_SIGNAL_LOCKED",
    selection_mode:"ASTRO_SIGNAL_DOMINANT",
    dominant_domain:dominant.domain_key,
    future_candidates:scored,
    future_timeline:timeline,
    next_major_event:timeline[0]
  };
}