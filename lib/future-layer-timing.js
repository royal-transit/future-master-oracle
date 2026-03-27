// lib/future-layer-timing.js

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

const DOMAIN_META = {
  SUCCESS: {
    domain_label: "Success / Rise / Execution",
    event_type: "rise / success event",
    status: "BUILDING"
  },
  BUSINESS: {
    domain_label: "Business / Trade / Deal",
    event_type: "business / trade opening event",
    status: "BUILDING"
  },
  GAIN: {
    domain_label: "Gain / Network / Fulfilment",
    event_type: "gain / inflow event",
    status: "OPENING"
  },
  DOCUMENT: {
    domain_label: "Documents / Records / Paperwork",
    event_type: "paperwork / approval opening",
    status: "OPENING"
  },
  CAREER: {
    domain_label: "Career / Authority / Public Role",
    event_type: "career movement event",
    status: "BUILDING"
  },
  JOB: {
    domain_label: "Job / Service / Employment",
    event_type: "job / role movement event",
    status: "BUILDING"
  },
  IMMIGRATION: {
    domain_label: "Immigration / Relocation Path",
    event_type: "immigration / clearance movement",
    status: "OPENING"
  },
  MARRIAGE: {
    domain_label: "Marriage / Partnership",
    event_type: "future union / relationship event",
    status: "BUILDING"
  },
  FOREIGN: {
    domain_label: "Foreign / Distance / Withdrawal",
    event_type: "foreign pathway movement",
    status: "OPENING"
  },
  SETTLEMENT: {
    domain_label: "Settlement / Base Formation",
    event_type: "base strengthening event",
    status: "STABILISING"
  },
  PROPERTY: {
    domain_label: "Property / Residence / Land",
    event_type: "property / base event",
    status: "STABILISING"
  },
  VISA: {
    domain_label: "Visa / Permission / External Clearance",
    event_type: "visa / external clearance movement",
    status: "BUILDING"
  }
};

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

function getRealSignalScore(domainKey, domainResults) {
  const found = safeArray(domainResults).find((d) => d?.domain_key === domainKey);

  if (!found) {
    return DOMAIN_PRIORITY[domainKey] || 1;
  }

  let score = 0;

  score += Number(found.rank_score || 0);
  score += Number(found.normalized_score || 0);

  if (found.density === "HIGH") score += 8;
  if (found.density === "MED") score += 4;

  score += Number(found.active_event_count || 0) * 2;
  score += Number(found.major_event_count || 0) * 3;

  if (found.present_carryover === "YES") score += 6;

  score += DOMAIN_PRIORITY[domainKey] || 0;

  return Number(score.toFixed(2));
}

function deterministicMinute(seed, index) {
  return (seed + index * 47) % 180;
}

function buildTime(seed, index) {
  const base = 12 * 60;
  const m = base + deterministicMinute(seed, index);
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function buildTimelineItem({ item, index, baseDate, stableSeed }) {
  const meta = DOMAIN_META[item.domain_key] || {
    domain_label: item.domain_key,
    event_type: "future major event",
    status: "BUILDING"
  };

  const offset = 15 + index * 2;
  const date = addDays(baseDate, offset);
  const exactDate = iso(date);
  const exactTimeUtc = buildTime(stableSeed, index + 1);

  return {
    timeline_number: index + 1,
    domain_key: item.domain_key,
    domain: meta.domain_label,
    domain_label: meta.domain_label,
    event_type: meta.event_type,
    status: meta.status,
    importance: "MAJOR",
    trigger_phase: "future activation",
    exact_date: exactDate,
    exact_time_utc: exactTimeUtc,
    exact_datetime_iso: `${exactDate}T${exactTimeUtc}:00.000Z`,
    exact_time_band: "12:00-15:00",
    tolerance_minutes: 15,
    source: "DOMAIN_SCAN",
    priority_score: Number(item.score.toFixed(2))
  };
}

export default function runFutureTimingLayer({
  domain_results,
  current_context,
  stable_seed
}) {
  const safeDomainResults = safeArray(domain_results);
  const baseDate = current_context?.event_datetime_iso
    ? new Date(current_context.event_datetime_iso)
    : new Date();

  const scored = DOMAIN_SEQUENCE.map((key, i) => ({
    domain_key: key,
    score: getRealSignalScore(key, safeDomainResults),
    order: i
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.order - b.order;
  });

  const dominant = scored[0] || { domain_key: "SUCCESS", score: 1 };

  const future_timeline = scored.map((item, index) =>
    buildTimelineItem({
      item,
      index,
      baseDate,
      stableSeed: stable_seed || 1
    })
  );

  const next_major_event = safeObject(future_timeline[0]);

  return {
    timing_status: "REAL_SIGNAL_LOCKED",
    selection_mode: "ASTRO_SIGNAL_DOMINANT",
    dominant_domain: dominant.domain_key,
    future_candidates: scored.map((item, index) => ({
      candidate_number: index + 1,
      domain_key: item.domain_key,
      candidate_score: Number(item.score.toFixed(2)),
      sequence_priority: index + 1
    })),
    future_timeline,
    next_major_event
  };
}