// lib/future-layer-intelligence.js

import { safeArray } from "./chart-core.js";

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const EVENT_TEMPLATES = {
  CAREER: {
    event_type: "career rise event",
    trigger_phase: "authority / role / public movement",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  JOB: {
    event_type: "job / service event",
    trigger_phase: "service / duty / hiring motion",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  BUSINESS: {
    event_type: "business / trade event",
    trigger_phase: "deal / client / trade expansion",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  MARRIAGE: {
    event_type: "marriage / partnership event",
    trigger_phase: "union / bonding / commitment",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  LOVE: {
    event_type: "love / attachment event",
    trigger_phase: "romance / attraction / attachment",
    importance: "MINOR",
    default_status: "FORMING"
  },
  PARTNERSHIP: {
    event_type: "partnership / contract event",
    trigger_phase: "agreement / mutual link / contract",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  DIVORCE: {
    event_type: "separation / break event",
    trigger_phase: "rupture / severance / detachment",
    importance: "MAJOR",
    default_status: "RISK"
  },
  FOREIGN: {
    event_type: "foreign movement event",
    trigger_phase: "travel / distance / foreign shift",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  IMMIGRATION: {
    event_type: "immigration / clearance event",
    trigger_phase: "permission / relocation / paper route",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  VISA: {
    event_type: "visa / approval event",
    trigger_phase: "permission / approval / stamp path",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  DOCUMENT: {
    event_type: "document / paperwork event",
    trigger_phase: "paper / filing / formal submission",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  AUTHORITY: {
    event_type: "authority contact event",
    trigger_phase: "state / boss / structure contact",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  LEGAL: {
    event_type: "legal / penalty event",
    trigger_phase: "legal / challenge / authority pressure",
    importance: "MAJOR",
    default_status: "RISK"
  },
  SETTLEMENT: {
    event_type: "settlement / base event",
    trigger_phase: "base / position / stabilisation",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  PROPERTY: {
    event_type: "property / residence event",
    trigger_phase: "asset / home / residence movement",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  HOME: {
    event_type: "home / base event",
    trigger_phase: "home / family / base motion",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  VEHICLE: {
    event_type: "vehicle / transport event",
    trigger_phase: "vehicle / movement / transport matter",
    importance: "MINOR",
    default_status: "FORMING"
  },
  GAIN: {
    event_type: "gain / inflow event",
    trigger_phase: "income / gain / network fulfilment",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  NETWORK: {
    event_type: "network / access event",
    trigger_phase: "circle / connection / entry",
    importance: "MINOR",
    default_status: "FORMING"
  },
  COMMUNICATION: {
    event_type: "communication / effort event",
    trigger_phase: "message / document / effort line",
    importance: "MINOR",
    default_status: "FORMING"
  },
  TRAVEL_SHORT: {
    event_type: "short movement event",
    trigger_phase: "movement / visit / short travel",
    importance: "MINOR",
    default_status: "FORMING"
  },
  TRAVEL_LONG: {
    event_type: "long distance event",
    trigger_phase: "distance / route / relocation pull",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  HEALTH: {
    event_type: "health / stress event",
    trigger_phase: "fatigue / pressure / imbalance",
    importance: "MAJOR",
    default_status: "RISK"
  },
  DISEASE: {
    event_type: "disease / recurring strain event",
    trigger_phase: "weakness / recurrence / drain",
    importance: "MAJOR",
    default_status: "RISK"
  },
  RECOVERY: {
    event_type: "recovery / healing event",
    trigger_phase: "repair / recovery / improvement",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  MENTAL: {
    event_type: "mental pressure event",
    trigger_phase: "pressure / fear / overdrive",
    importance: "MAJOR",
    default_status: "RISK"
  },
  MIND: {
    event_type: "mind / emotion event",
    trigger_phase: "emotion / reaction / mental wave",
    importance: "MINOR",
    default_status: "FORMING"
  },
  DEBT: {
    event_type: "debt / liability event",
    trigger_phase: "liability / payment / pressure",
    importance: "MAJOR",
    default_status: "RISK"
  },
  LOSS: {
    event_type: "loss / exit event",
    trigger_phase: "drain / exit / detachment",
    importance: "MAJOR",
    default_status: "RISK"
  },
  SUCCESS: {
    event_type: "success / execution event",
    trigger_phase: "success / recognition / completion",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  DELAY: {
    event_type: "delay / slowdown event",
    trigger_phase: "delay / hold / late materialisation",
    importance: "MINOR",
    default_status: "RISK"
  },
  BLOCKAGE: {
    event_type: "block / obstruction event",
    trigger_phase: "obstruction / choke / freeze",
    importance: "MAJOR",
    default_status: "RISK"
  },
  REPUTATION: {
    event_type: "reputation / name event",
    trigger_phase: "visibility / name / public notice",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  POWER: {
    event_type: "power / control event",
    trigger_phase: "control / leverage / command",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  CHILDREN: {
    event_type: "children / continuity event",
    trigger_phase: "child / creativity / continuity",
    importance: "MINOR",
    default_status: "FORMING"
  },
  SUDDEN_GAIN: {
    event_type: "sudden gain event",
    trigger_phase: "windfall / surprise gain / jump",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  SUDDEN_LOSS: {
    event_type: "sudden loss event",
    trigger_phase: "drop / shock / sudden drain",
    importance: "MAJOR",
    default_status: "RISK"
  },
  ACCIDENT: {
    event_type: "accident / abrupt injury risk",
    trigger_phase: "impact / cut / abrupt disturbance",
    importance: "MAJOR",
    default_status: "RISK"
  },
  SURGERY: {
    event_type: "surgery / invasive event",
    trigger_phase: "invasive procedure / cut / intervention",
    importance: "MAJOR",
    default_status: "RISK"
  },
  SCANDAL: {
    event_type: "scandal / exposure event",
    trigger_phase: "exposure / damage / name hit",
    importance: "MAJOR",
    default_status: "RISK"
  },
  FAME: {
    event_type: "visibility / fame event",
    trigger_phase: "larger recognition / visibility rise",
    importance: "MAJOR",
    default_status: "FORMING"
  },
  SPIRITUAL: {
    event_type: "spiritual turn event",
    trigger_phase: "withdrawal / inner turn / detachment",
    importance: "MINOR",
    default_status: "FORMING"
  },
  RELIGION: {
    event_type: "religion / dharma event",
    trigger_phase: "belief / dharma / religious pull",
    importance: "MINOR",
    default_status: "FORMING"
  },
  IDENTITY: {
    event_type: "identity / self-direction event",
    trigger_phase: "self / direction / personal assertion",
    importance: "MINOR",
    default_status: "FORMING"
  },
  ENEMY: {
    event_type: "opponent / conflict event",
    trigger_phase: "resistance / challenge / open friction",
    importance: "MAJOR",
    default_status: "RISK"
  },
  FRIEND: {
    event_type: "friend / support event",
    trigger_phase: "ally / help / support line",
    importance: "MINOR",
    default_status: "FORMING"
  }
};

const POSITIVE_KEYS = new Set([
  "CAREER",
  "JOB",
  "BUSINESS",
  "MARRIAGE",
  "LOVE",
  "PARTNERSHIP",
  "FOREIGN",
  "IMMIGRATION",
  "VISA",
  "DOCUMENT",
  "SETTLEMENT",
  "PROPERTY",
  "HOME",
  "VEHICLE",
  "GAIN",
  "NETWORK",
  "COMMUNICATION",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "RECOVERY",
  "SUCCESS",
  "REPUTATION",
  "POWER",
  "CHILDREN",
  "SUDDEN_GAIN",
  "FAME",
  "SPIRITUAL",
  "RELIGION",
  "IDENTITY",
  "FRIEND"
]);

const RISK_KEYS = new Set([
  "DIVORCE",
  "LEGAL",
  "AUTHORITY",
  "HEALTH",
  "DISEASE",
  "MENTAL",
  "DEBT",
  "LOSS",
  "DELAY",
  "BLOCKAGE",
  "SUDDEN_LOSS",
  "ACCIDENT",
  "SURGERY",
  "SCANDAL",
  "ENEMY"
]);

function getTemplate(domainKey) {
  return (
    EVENT_TEMPLATES[String(domainKey || "").toUpperCase()] || {
      event_type: "future domain event",
      trigger_phase: "domain activation",
      importance: "MINOR",
      default_status: "FORMING"
    }
  );
}

function getEvidenceStrength(score) {
  if (score >= 10) return "strong";
  if (score >= 6) return "moderate";
  return "light";
}

function getDefaultStatus(domainKey, score) {
  const key = String(domainKey || "").toUpperCase();

  if (RISK_KEYS.has(key)) {
    if (score >= 7) return "ACTIVE";
    if (score >= 4) return "FORMING";
    return "LOW";
  }

  if (POSITIVE_KEYS.has(key)) {
    if (score >= 7) return "FORMING";
    if (score >= 4) return "BUILDING";
    return "LOW";
  }

  return score >= 5 ? "FORMING" : "LOW";
}

function getEventCount(score) {
  if (score >= 10) return 2;
  if (score >= 4) return 1;
  return 0;
}

function getImportanceLabel(templateImportance, score) {
  if (templateImportance === "MAJOR") return "MAJOR";
  return score >= 7 ? "MAJOR" : "MINOR";
}

function toEvent(domain, idx, baseScore) {
  const template = getTemplate(domain.domain_key);
  const evidenceStrength = getEvidenceStrength(baseScore);
  const status = getDefaultStatus(domain.domain_key, baseScore);
  const importance = getImportanceLabel(template.importance, baseScore);

  return {
    event_type: template.event_type,
    event_number: idx + 1,
    evidence_strength: evidenceStrength,
    status,
    importance,
    trigger_phase: template.trigger_phase,
    carryover_to_present:
      String(domain.present_carryover || "NO").toUpperCase() === "YES"
        ? "YES"
        : "NO",
    date_marker: null,
    exact_year: null
  };
}

function enrichDomain(domain) {
  const score = Number(domain.normalized_score || 0);
  const eventCount = getEventCount(score);
  const events = Array.from({ length: eventCount }, (_, idx) =>
    toEvent(domain, idx, score - idx * 0.85)
  );

  const major_event_count = events.filter((e) => e.importance === "MAJOR").length;
  const minor_event_count = events.filter((e) => e.importance === "MINOR").length;
  const broken_event_count = events.filter(
    (e) => e.status === "BROKEN" || e.status === "RISK"
  ).length;
  const active_event_count = events.filter(
    (e) => e.status === "ACTIVE" || e.status === "FORMING" || e.status === "BUILDING"
  ).length;

  return {
    ...domain,
    major_event_count,
    minor_event_count,
    broken_event_count,
    active_event_count,
    events
  };
}

function buildTopRanked(domainResults) {
  return [...safeArray(domainResults)]
    .sort((a, b) => Number(b.rank_score || 0) - Number(a.rank_score || 0))
    .slice(0, 12)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      rank_score: round2(d.rank_score || 0),
      normalized_score: round2(d.normalized_score || 0),
      density: d.density,
      residual_impact: d.residual_impact,
      major_event_count: d.major_event_count || 0,
      broken_event_count: d.broken_event_count || 0,
      active_event_count: d.active_event_count || 0
    }));
}

export function runFutureIntelligenceLayer({
  domain_results = [],
  top_ranked_domains = [],
  question_profile = {}
} = {}) {
  const enriched = safeArray(domain_results).map(enrichDomain);

  const rebuiltTop =
    safeArray(top_ranked_domains).length > 0
      ? buildTopRanked(enriched)
      : buildTopRanked(enriched);

  const primaryDomain = String(
    question_profile.primary_domain || ""
  ).toUpperCase();

  const primary_domain_result =
    enriched.find((d) => d.domain_key === primaryDomain) || null;

  return {
    domain_results: enriched,
    top_ranked_domains: rebuiltTop,
    primary_domain_result
  };
}