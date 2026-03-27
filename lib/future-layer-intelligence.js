// lib/future-layer-intelligence.js

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function obj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

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
  "TRANSFORMATION",
  "IDENTITY"
]);

function hasAny(text, words) {
  return arr(words).some((w) => text.includes(w));
}

function detectPrimaryDomain(question = "") {
  const q = str(question).toLowerCase();

  if (hasAny(q, ["marriage", "wife", "husband", "relationship", "love", "partner"])) {
    return "MARRIAGE";
  }

  if (hasAny(q, ["divorce", "break", "separation"])) {
    return "DIVORCE";
  }

  if (hasAny(q, ["career", "job", "profession", "work", "employment"])) {
    return "CAREER";
  }

  if (hasAny(q, ["business", "trade", "deal", "client", "sale"])) {
    return "BUSINESS";
  }

  if (hasAny(q, ["money", "income", "cash", "finance", "gain", "debt"])) {
    return "MONEY";
  }

  if (hasAny(q, ["foreign", "abroad", "visa", "settlement", "immigration"])) {
    return "IMMIGRATION";
  }

  if (hasAny(q, ["property", "land", "house", "home", "flat"])) {
    return "PROPERTY";
  }

  if (hasAny(q, ["legal", "court", "penalty", "authority", "case"])) {
    return "LEGAL";
  }

  if (hasAny(q, ["health", "stress", "illness", "disease", "recovery", "mental"])) {
    return "HEALTH";
  }

  if (hasAny(q, ["child", "children", "son", "daughter"])) {
    return "CHILDREN";
  }

  return "GENERAL";
}

function buildQuestionProfile(question = "") {
  const q = str(question).toLowerCase();
  const primary_domain = detectPrimaryDomain(q);

  return {
    raw_question: question || "",
    primary_domain,
    asks_count: hasAny(q, ["how many", "count", "koita", "koyta", "number", "mot"]),
    asks_timing: hasAny(q, ["when", "date", "time", "exact", "kobe", "kokhon"]),
    asks_status: hasAny(q, ["will", "possible", "status", "result", "outcome", "happen"]),
    asks_general: primary_domain === "GENERAL"
  };
}

function getLinkedDomains(primary = "GENERAL") {
  const map = {
    MARRIAGE: [
      "MARRIAGE",
      "DIVORCE",
      "LOVE",
      "PARTNERSHIP",
      "MULTIPLE_MARRIAGE",
      "FAMILY",
      "CHILDREN",
      "LEGAL"
    ],
    DIVORCE: [
      "DIVORCE",
      "MARRIAGE",
      "LEGAL",
      "PARTNERSHIP",
      "MENTAL",
      "FAMILY"
    ],
    CAREER: [
      "CAREER",
      "JOB",
      "BUSINESS",
      "SUCCESS",
      "GAIN",
      "REPUTATION",
      "AUTHORITY"
    ],
    BUSINESS: [
      "BUSINESS",
      "CAREER",
      "JOB",
      "GAIN",
      "DOCUMENT",
      "SUCCESS",
      "REPUTATION"
    ],
    MONEY: [
      "GAIN",
      "LOSS",
      "DEBT",
      "BUSINESS",
      "CAREER",
      "JOB",
      "PROPERTY"
    ],
    IMMIGRATION: [
      "IMMIGRATION",
      "FOREIGN",
      "VISA",
      "SETTLEMENT",
      "DOCUMENT",
      "LEGAL",
      "PROPERTY"
    ],
    PROPERTY: [
      "PROPERTY",
      "HOME",
      "SETTLEMENT",
      "FOREIGN",
      "VEHICLE",
      "GAIN"
    ],
    LEGAL: [
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY",
      "IMMIGRATION",
      "DIVORCE",
      "BUSINESS"
    ],
    HEALTH: [
      "HEALTH",
      "MENTAL",
      "DISEASE",
      "RECOVERY",
      "ACCIDENT",
      "SURGERY"
    ],
    CHILDREN: [
      "CHILDREN",
      "FAMILY",
      "MARRIAGE",
      "LOVE"
    ],
    GENERAL: [
      "MARRIAGE",
      "DIVORCE",
      "IMMIGRATION",
      "FOREIGN",
      "SETTLEMENT",
      "VISA",
      "DOCUMENT",
      "LEGAL",
      "CAREER",
      "JOB",
      "BUSINESS",
      "GAIN",
      "LOSS",
      "DEBT",
      "HEALTH",
      "MENTAL",
      "DISEASE",
      "RECOVERY",
      "PROPERTY",
      "HOME",
      "FAMILY"
    ]
  };

  return map[primary] || map.GENERAL;
}

function keywordBoost(domainKey, question = "") {
  const q = str(question).toLowerCase();
  const key = str(domainKey).toUpperCase();

  const map = {
    MARRIAGE: ["marriage", "wife", "husband", "relationship", "love", "partner"],
    DIVORCE: ["divorce", "break", "separation"],
    CAREER: ["career", "job", "profession", "work"],
    BUSINESS: ["business", "deal", "trade", "client", "sale"],
    GAIN: ["money", "income", "cash", "gain", "profit"],
    DEBT: ["debt", "loan", "liability"],
    IMMIGRATION: ["immigration", "foreign", "settlement", "abroad"],
    FOREIGN: ["foreign", "abroad", "distance"],
    VISA: ["visa", "permission", "clearance"],
    DOCUMENT: ["document", "paper", "approval", "record"],
    LEGAL: ["legal", "court", "authority", "case", "penalty"],
    PROPERTY: ["property", "land", "house", "home", "flat"],
    HOME: ["home", "house", "base"],
    HEALTH: ["health", "illness", "stress"],
    MENTAL: ["mental", "fear", "pressure", "stress"],
    DISEASE: ["disease", "illness", "recurring"],
    RECOVERY: ["recovery", "healing"],
    CHILDREN: ["child", "children", "son", "daughter"]
  };

  const words = map[key] || [];
  let boost = 0;

  words.forEach((w) => {
    if (q.includes(w)) boost += 1.2;
  });

  return round2(boost);
}

function buildCarryover(rankedDomains) {
  const carryoverDomains = arr(rankedDomains)
    .filter(
      (d) =>
        str(d.present_carryover, "NO") === "YES" &&
        ["MARRIAGE", "SETTLEMENT", "PROPERTY", "MENTAL", "HEALTH", "BUSINESS", "CAREER", "IMMIGRATION"].includes(
          str(d.domain_key)
        )
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

function rankDomains(domainResults = [], questionProfile = {}) {
  const linked = getLinkedDomains(questionProfile.primary_domain);
  const question = questionProfile.raw_question || "";

  const ranked = arr(domainResults).map((d) => {
    let boost = 0;
    const key = str(d.domain_key).toUpperCase();

    if (linked.includes(key)) boost += 2.4;
    if (key === questionProfile.primary_domain) boost += 4.5;

    boost += keywordBoost(key, question);

    if (questionProfile.asks_timing && d.primary_exact_event) boost += 1.1;
    if (questionProfile.asks_status && num(d.active_event_count, 0) > 0) boost += 0.8;
    if (questionProfile.asks_count && num(d.major_event_count, 0) > 0) boost += 0.5;

    if (questionProfile.primary_domain === "GENERAL") {
      if (NOISY_DOMAINS.has(key)) boost -= 2.5;
      if (CORE_DOMAINS.has(key)) boost += 1.7;
    }

    if (num(d.active_event_count, 0) > 0) boost += 0.9;
    if (num(d.major_event_count, 0) > 0) boost += 0.6;

    return {
      ...d,
      rank_score: round2(num(d.normalized_score, 0) + boost)
    };
  });

  return ranked.sort((a, b) => num(b.rank_score, 0) - num(a.rank_score, 0));
}

export function runFutureIntelligenceLayer({
  domain_results = [],
  top_ranked_domains = [],
  question_profile = {}
} = {}) {
  const finalQuestionProfile =
    obj(question_profile).raw_question
      ? {
          ...buildQuestionProfile(question_profile.raw_question),
          ...obj(question_profile)
        }
      : buildQuestionProfile("");

  const ranked_domains = rankDomains(
    arr(domain_results).length ? arr(domain_results) : arr(top_ranked_domains),
    finalQuestionProfile
  );

  const carryover = buildCarryover(ranked_domains);

  return {
    intelligence_status: "OK",
    question_profile: finalQuestionProfile,
    linked_domain_expansion: getLinkedDomains(finalQuestionProfile.primary_domain),
    ranked_domains,
    top_ranked_domains: ranked_domains.slice(0, 12),
    domain_results: ranked_domains,
    current_carryover: carryover
  };
}

export default runFutureIntelligenceLayer;