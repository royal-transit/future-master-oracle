// lib/future-layer-intelligence.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const CORE_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "RELATIONSHIP",
  "MULTIPLE_MARRIAGE",
  "FOREIGN",
  "SETTLEMENT",
  "IMMIGRATION",
  "VISA",
  "CAREER",
  "JOB",
  "BUSINESS",
  "MONEY",
  "DEBT",
  "GAIN",
  "LOSS",
  "HEALTH",
  "MENTAL",
  "DISEASE",
  "RECOVERY",
  "PROPERTY",
  "HOME",
  "LEGAL",
  "DOCUMENT",
  "FAMILY",
  "CHILDREN"
]);

const NOISY_DOMAINS = new Set([
  "NETWORK",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "COMMUNICATION",
  "POWER",
  "FAME",
  "SCANDAL",
  "SUCCESS",
  "REPUTATION",
  "AUTHORITY",
  "CITIZENSHIP",
  "FRIEND",
  "ENEMY",
  "SUDDEN_GAIN",
  "SUDDEN_LOSS",
  "RELIGION",
  "SPIRITUAL",
  "TANTRIC",
  "SEX",
  "TRANSFORMATION"
]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function safeUpper(value, fallback = "UNKNOWN") {
  const s = safeString(value, "").trim();
  return s ? s.toUpperCase() : fallback;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

function normalizeDomainRow(row = {}) {
  const r = safeObject(row);

  return {
    domain_key: safeUpper(r.domain_key, "UNKNOWN"),
    domain_label: safeString(r.domain_label, "Unknown Domain"),
    normalized_score: safeNumber(r.normalized_score, 0),
    rank_score: safeNumber(r.rank_score, safeNumber(r.normalized_score, 0)),
    density: safeUpper(r.density, "LOW"),
    residual_impact: safeUpper(r.residual_impact, "LOW"),
    present_carryover: safeUpper(r.present_carryover, "NO"),
    major_event_count: safeNumber(r.major_event_count, 0),
    minor_event_count: safeNumber(r.minor_event_count, 0),
    broken_event_count: safeNumber(r.broken_event_count, 0),
    active_event_count: safeNumber(r.active_event_count, 0),
    exact_time_band: r.exact_time_band ?? null,
    events: safeArray(r.events),
    primary_exact_event: r.primary_exact_event ?? null,
    alternative_exact_events: safeArray(r.alternative_exact_events)
  };
}

export function buildQuestionProfile(question) {
  const q = safeString(question, "").toLowerCase();

  const primary_domain =
    hasAny(q, ["marriage", "bea", "wife", "husband", "divorce"])
      ? "MARRIAGE"
      : hasAny(q, ["relationship", "love", "partner", "breakup", "affair"])
        ? "RELATIONSHIP"
        : hasAny(q, ["career", "job", "work", "business", "profession"])
          ? "CAREER"
          : hasAny(q, ["money", "income", "cash", "debt", "finance"])
            ? "MONEY"
            : hasAny(q, ["foreign", "abroad", "uk", "visa", "migration", "settlement"])
              ? "FOREIGN"
              : hasAny(q, ["health", "disease", "hospital", "stress", "illness"])
                ? "HEALTH"
                : hasAny(q, ["property", "land", "house", "home", "flat"])
                  ? "PROPERTY"
                  : hasAny(q, ["legal", "court", "penalty", "case", "authority"])
                    ? "LEGAL"
                    : hasAny(q, ["child", "children", "daughter", "son"])
                      ? "CHILDREN"
                      : "GENERAL";

  return {
    raw_question: safeString(question, ""),
    primary_domain,
    asks_count: hasAny(q, ["koita", "how many", "count", "number", "mot", "total"]),
    asks_timing: hasAny(q, [
      "when",
      "kobe",
      "date",
      "time",
      "exact",
      "year",
      "month",
      "timeline",
      "next",
      "upcoming"
    ]),
    asks_status: hasAny(q, ["current", "now", "status", "active", "ase", "ongoing"]),
    asks_general: primary_domain === "GENERAL"
  };
}

export function getLinkedDomains(primary) {
  const map = {
    MARRIAGE: [
      "MARRIAGE",
      "DIVORCE",
      "RELATIONSHIP",
      "LOVE",
      "MULTIPLE_MARRIAGE",
      "FAMILY",
      "CHILDREN",
      "PARTNERSHIP",
      "LEGAL"
    ],
    RELATIONSHIP: [
      "RELATIONSHIP",
      "LOVE",
      "MARRIAGE",
      "DIVORCE",
      "FAMILY"
    ],
    CAREER: [
      "CAREER",
      "JOB",
      "BUSINESS",
      "MONEY",
      "GAIN",
      "FAILURE",
      "REPUTATION",
      "AUTHORITY"
    ],
    MONEY: [
      "MONEY",
      "DEBT",
      "GAIN",
      "LOSS",
      "CAREER",
      "BUSINESS"
    ],
    FOREIGN: [
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "VISA",
      "PROPERTY",
      "DOCUMENT"
    ],
    HEALTH: [
      "HEALTH",
      "DISEASE",
      "RECOVERY",
      "MENTAL",
      "ACCIDENT",
      "SURGERY"
    ],
    PROPERTY: [
      "PROPERTY",
      "HOME",
      "SETTLEMENT",
      "FOREIGN",
      "VEHICLE"
    ],
    LEGAL: [
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY",
      "IMMIGRATION",
      "DEBT",
      "BUSINESS"
    ],
    CHILDREN: [
      "CHILDREN",
      "LOVE",
      "MARRIAGE",
      "FAMILY"
    ],
    GENERAL: [
      "MARRIAGE",
      "DIVORCE",
      "MULTIPLE_MARRIAGE",
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "VISA",
      "CAREER",
      "JOB",
      "BUSINESS",
      "MONEY",
      "DEBT",
      "GAIN",
      "LOSS",
      "HEALTH",
      "MENTAL",
      "DISEASE",
      "RECOVERY",
      "PROPERTY",
      "HOME",
      "VEHICLE",
      "FAMILY",
      "RELATIONSHIP",
      "LOVE",
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY"
    ]
  };

  return map[primary] || map.GENERAL;
}

export function rankDomains(domainResults, questionProfile) {
  const linked = getLinkedDomains(questionProfile.primary_domain);

  return safeArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .map((d) => {
      let boost = 0;

      if (linked.includes(d.domain_key)) boost += 2.2;
      if (d.domain_key === questionProfile.primary_domain) boost += 4.2;

      if (questionProfile.asks_timing) {
        if (d.primary_exact_event || d.exact_time_band) boost += 1.5;
      }

      if (questionProfile.asks_status) {
        if (d.active_event_count > 0) boost += 1.4;
        if (d.present_carryover === "YES") boost += 1.1;
      }

      if (questionProfile.primary_domain === "GENERAL") {
        if (NOISY_DOMAINS.has(d.domain_key)) boost -= 2.5;
        if (CORE_DOMAINS.has(d.domain_key)) boost += 1.6;

        if (
          [
            "MARRIAGE",
            "DIVORCE",
            "FOREIGN",
            "SETTLEMENT",
            "PROPERTY",
            "MENTAL",
            "IMMIGRATION"
          ].includes(d.domain_key)
        ) {
          boost += 1.4;
        }
      }

      return {
        ...d,
        rank_score: round2((d.normalized_score || 0) + boost)
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

export function narrowCarryover(rankedDomains) {
  const priority = [
    "MARRIAGE",
    "SETTLEMENT",
    "PROPERTY",
    "MENTAL",
    "HEALTH",
    "BUSINESS",
    "CAREER",
    "IMMIGRATION",
    "FOREIGN",
    "LEGAL"
  ];

  const carryoverDomains = safeArray(rankedDomains)
    .filter(
      (d) =>
        (d.present_carryover === "YES" || safeNumber(d.active_event_count, 0) > 0) &&
        priority.includes(d.domain_key)
    )
    .slice(0, 8)
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact
    }));

  return {
    present_carryover_detected: carryoverDomains.length > 0,
    carryover_domains: carryoverDomains
  };
}

export function buildTopRankedDomains(rankedDomains, limit = 12) {
  return safeArray(rankedDomains)
    .slice(0, limit)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      rank_score: d.rank_score,
      normalized_score: d.normalized_score,
      density: d.density,
      residual_impact: d.residual_impact,
      major_event_count: d.major_event_count,
      broken_event_count: d.broken_event_count,
      active_event_count: d.active_event_count
    }));
}

export function runIntelligenceLayer({ domainResults, question }) {
  const questionProfile = buildQuestionProfile(question);
  const linkedDomains = getLinkedDomains(questionProfile.primary_domain);
  const rankedDomains = rankDomains(domainResults, questionProfile);
  const carryover = narrowCarryover(rankedDomains);
  const topRankedDomains = buildTopRankedDomains(rankedDomains, 12);

  return {
    question_profile: questionProfile,
    linked_domain_expansion: linkedDomains,
    ranked_domains: rankedDomains,
    top_ranked_domains: topRankedDomains,
    carryover
  };
}