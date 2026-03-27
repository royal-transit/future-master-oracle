// lib/future-layer-timing.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const DOMAIN_EVENT_MAP = {
  SUCCESS: {
    domain: "Success / Rise / Execution",
    event_type: "rise / success event",
    status: "BUILDING"
  },
  BUSINESS: {
    domain: "Business / Trade / Deal",
    event_type: "business / trade opening event",
    status: "BUILDING"
  },
  GAIN: {
    domain: "Gain / Network / Fulfilment",
    event_type: "gain / inflow event",
    status: "OPENING"
  },
  DOCUMENT: {
    domain: "Documents / Records / Paperwork",
    event_type: "paperwork / approval opening",
    status: "OPENING"
  },
  CAREER: {
    domain: "Career / Authority / Public Role",
    event_type: "career movement event",
    status: "BUILDING"
  },
  JOB: {
    domain: "Job / Service / Employment",
    event_type: "job / role movement event",
    status: "BUILDING"
  },
  IMMIGRATION: {
    domain: "Immigration / Relocation Path",
    event_type: "immigration / clearance movement",
    status: "OPENING"
  },
  MARRIAGE: {
    domain: "Marriage / Partnership",
    event_type: "future union / relationship event",
    status: "BUILDING"
  },
  FOREIGN: {
    domain: "Foreign / Distance / Withdrawal",
    event_type: "foreign pathway movement",
    status: "OPENING"
  },
  SETTLEMENT: {
    domain: "Settlement / Base Formation",
    event_type: "base strengthening event",
    status: "STABILISING"
  },
  PROPERTY: {
    domain: "Property / Residence / Land",
    event_type: "property / base event",
    status: "STABILISING"
  },
  VISA: {
    domain: "Visa / Permission / External Clearance",
    event_type: "future major event",
    status: "BUILDING"
  }
};

const STABLE_DOMAIN_CHAIN = [
  "SUCCESS",
  "BUSINESS",
  "GAIN",
  "DOCUMENT",
  "CAREER",
  "JOB",
  "IMMIGRATION",
  "MARRIAGE",
  "FOREIGN",
  "SETTLEMENT",
  "PROPERTY",
  "VISA"
];

function minutesToHHMM(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addDaysUTC(baseDate, days) {
  const d = new Date(baseDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function deterministicMinute(seed, offset) {
  return (seed + offset * 37) % 180;
}

function buildUtcTime(seed, offset) {
  const baseMinutes = 12 * 60;
  const plus = deterministicMinute(seed, offset);
  return minutesToHHMM(baseMinutes + plus);
}

function buildEventDate(baseDate, offsetDays) {
  return addDaysUTC(baseDate, offsetDays);
}

function getPriorityBoost(domainKey) {
  switch (domainKey) {
    case "SUCCESS":
      return 20;
    case "BUSINESS":
      return 12;
    case "GAIN":
      return 10;
    case "DOCUMENT":
      return 8;
    case "CAREER":
      return 7;
    default:
      return 0;
  }
}

function scoreCandidate(domainKey, domainResults) {
  const found = safeArray(domainResults).find((d) => d?.domain_key === domainKey);
  const base = Number(found?.rank_score || found?.normalized_score || 0);
  return Number((base + getPriorityBoost(domainKey)).toFixed(2));
}

function buildTimelineItem({ seed, baseDate, index, domainKey, score }) {
  const meta = DOMAIN_EVENT_MAP[domainKey] || {
    domain: domainKey,
    event_type: "future event",
    status: "BUILDING"
  };

  const eventDate = buildEventDate(baseDate, [15, 16, 17, 18, 19, 21, 24, 26, 28, 30, 34, 44][index] || (15 + index));
  const exactDate = isoDate(eventDate);
  const exactTimeUtc = buildUtcTime(seed, index + 1);
  const exactDatetimeIso = `${exactDate}T${exactTimeUtc}:00.000Z`;

  return {
    timeline_number: index + 1,
    domain: meta.domain,
    domain_key: domainKey,
    event_type: meta.event_type,
    status: meta.status,
    importance: "MAJOR",
    trigger_phase: "future activation",
    exact_date: exactDate,
    exact_time_utc: exactTimeUtc,
    exact_datetime_iso: exactDatetimeIso,
    exact_time_band: "12:00-15:00",
    tolerance_minutes: 15,
    source: "DOMAIN_SCAN",
    priority_score: score
  };
}

export default function runFutureTimingLayer({
  input,
  question_profile,
  domain_results,
  current_context,
  stable_seed
}) {
  const safeInput = safeObject(input);
  const safeQuestionProfile = safeObject(question_profile);
  const safeDomainResults = safeArray(domain_results);

  const baseDate = current_context?.event_datetime_iso
    ? new Date(current_context.event_datetime_iso)
    : new Date();

  const future_candidates = STABLE_DOMAIN_CHAIN.map((domainKey, index) => ({
    candidate_number: index + 1,
    domain_key: domainKey,
    candidate_score: scoreCandidate(domainKey, safeDomainResults),
    sequence_priority: index + 1
  })).sort((a, b) => {
    if (b.candidate_score !== a.candidate_score) {
      return b.candidate_score - a.candidate_score;
    }
    return a.sequence_priority - b.sequence_priority;
  });

  const dominant = future_candidates[0] || {
    domain_key: "SUCCESS",
    candidate_score: 1
  };

  const future_timeline = STABLE_DOMAIN_CHAIN.map((domainKey, index) =>
    buildTimelineItem({
      seed: stable_seed || 1,
      baseDate,
      index,
      domainKey,
      score: scoreCandidate(domainKey, safeDomainResults)
    })
  );

  const next_major_event = safeObject(future_timeline[0]);

  return {
    timing_status: "OK",
    stable_seed: stable_seed || 1,
    selection_mode: "DETERMINISTIC_DOMAIN_LOCK",
    question_profile: {
      ...safeQuestionProfile,
      primary_domain: dominant.domain_key || safeQuestionProfile.primary_domain || "GENERAL"
    },
    future_candidates,
    future_timeline,
    next_major_event
  };
}