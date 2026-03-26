// lib/future-layer-intelligence.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const PRIMARY_DOMAIN_KEYWORDS = {
  MARRIAGE: [
    "marriage",
    "wife",
    "husband",
    "bea",
    "wedding",
    "second marriage",
    "third marriage",
    "union"
  ],
  RELATIONSHIP: [
    "relationship",
    "love",
    "partner",
    "affair",
    "breakup",
    "reconcile",
    "valobasha"
  ],
  CAREER: [
    "career",
    "job",
    "work",
    "profession",
    "employment",
    "promotion"
  ],
  BUSINESS: [
    "business",
    "deal",
    "trade",
    "client",
    "sales",
    "profit",
    "customer"
  ],
  MONEY: [
    "money",
    "income",
    "cash",
    "finance",
    "debt",
    "loan",
    "gain",
    "loss"
  ],
  FOREIGN: [
    "foreign",
    "abroad",
    "uk",
    "visa",
    "settlement",
    "migration",
    "immigration",
    "overseas"
  ],
  HEALTH: [
    "health",
    "illness",
    "disease",
    "stress",
    "hospital",
    "recovery",
    "surgery",
    "accident"
  ],
  PROPERTY: [
    "property",
    "house",
    "home",
    "flat",
    "land",
    "residence",
    "vehicle",
    "car"
  ],
  LEGAL: [
    "legal",
    "case",
    "court",
    "penalty",
    "authority",
    "document",
    "record"
  ],
  CHILDREN: [
    "child",
    "children",
    "daughter",
    "son",
    "pregnancy",
    "baby"
  ]
};

const DOMAIN_RELATION_MAP = {
  MARRIAGE: [
    "MARRIAGE",
    "DIVORCE",
    "RELATIONSHIP",
    "LOVE",
    "MULTIPLE_MARRIAGE",
    "PARTNERSHIP",
    "FAMILY",
    "CHILDREN",
    "LEGAL"
  ],
  RELATIONSHIP: [
    "RELATIONSHIP",
    "LOVE",
    "MARRIAGE",
    "DIVORCE",
    "PARTNERSHIP",
    "FAMILY"
  ],
  CAREER: [
    "CAREER",
    "JOB",
    "BUSINESS",
    "MONEY",
    "GAIN",
    "REPUTATION",
    "AUTHORITY",
    "SUCCESS"
  ],
  BUSINESS: [
    "BUSINESS",
    "CAREER",
    "JOB",
    "MONEY",
    "GAIN",
    "LOSS",
    "AUTHORITY",
    "REPUTATION"
  ],
  MONEY: [
    "MONEY",
    "GAIN",
    "LOSS",
    "DEBT",
    "BUSINESS",
    "CAREER",
    "JOB",
    "PROPERTY"
  ],
  FOREIGN: [
    "FOREIGN",
    "IMMIGRATION",
    "VISA",
    "SETTLEMENT",
    "DOCUMENT",
    "PROPERTY",
    "LEGAL"
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
    "VEHICLE",
    "SETTLEMENT",
    "MONEY",
    "FOREIGN"
  ],
  LEGAL: [
    "LEGAL",
    "DOCUMENT",
    "AUTHORITY",
    "IMMIGRATION",
    "BUSINESS",
    "DEBT"
  ],
  CHILDREN: [
    "CHILDREN",
    "MARRIAGE",
    "RELATIONSHIP",
    "FAMILY",
    "LOVE"
  ],
  GENERAL: [
    "MARRIAGE",
    "DIVORCE",
    "RELATIONSHIP",
    "LOVE",
    "MULTIPLE_MARRIAGE",
    "CAREER",
    "JOB",
    "BUSINESS",
    "MONEY",
    "GAIN",
    "LOSS",
    "DEBT",
    "FOREIGN",
    "IMMIGRATION",
    "VISA",
    "SETTLEMENT",
    "DOCUMENT",
    "LEGAL",
    "AUTHORITY",
    "PROPERTY",
    "HOME",
    "VEHICLE",
    "HEALTH",
    "DISEASE",
    "RECOVERY",
    "MENTAL",
    "ACCIDENT",
    "SURGERY",
    "CHILDREN",
    "FAMILY"
  ]
};

const STRONG_CORE_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "RELATIONSHIP",
  "CAREER",
  "BUSINESS",
  "MONEY",
  "GAIN",
  "LOSS",
  "DEBT",
  "FOREIGN",
  "IMMIGRATION",
  "VISA",
  "SETTLEMENT",
  "DOCUMENT",
  "LEGAL",
  "PROPERTY",
  "HEALTH",
  "DISEASE",
  "RECOVERY",
  "MENTAL",
  "CHILDREN"
]);

const NOISY_DOMAINS = new Set([
  "FAME",
  "SCANDAL",
  "POWER",
  "FRIEND",
  "ENEMY",
  "COMMUNICATION",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "SPIRITUAL",
  "TANTRIC",
  "SEX",
  "TRANSFORMATION"
]);

function normalizeText(v) {
  return String(v || "").toLowerCase().trim();
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w));
}

function inferPrimaryDomain(question) {
  const q = normalizeText(question);

  for (const [domain, keywords] of Object.entries(PRIMARY_DOMAIN_KEYWORDS)) {
    if (hasAny(q, keywords)) return domain;
  }

  return "GENERAL";
}

function buildQuestionIntent(question) {
  const q = normalizeText(question);

  return {
    raw_question: question || "",
    primary_domain: inferPrimaryDomain(question),
    asks_when: hasAny(q, ["when", "kobe", "date", "time", "kokhon", "exact"]),
    asks_yes_no: hasAny(q, ["will", "hobe", "happen", "possible", "promise"]),
    asks_count: hasAny(q, ["how many", "koita", "count", "number", "mot"]),
    asks_money: hasAny(q, ["money", "income", "profit", "cash", "gain"]),
    asks_relationship: hasAny(q, ["marriage", "wife", "husband", "love", "partner"]),
    asks_health: hasAny(q, ["health", "illness", "recovery", "surgery", "stress"]),
    asks_legal: hasAny(q, ["legal", "case", "court", "penalty", "document"]),
    asks_foreign: hasAny(q, ["foreign", "visa", "settlement", "migration", "uk"]),
    is_general: inferPrimaryDomain(question) === "GENERAL"
  };
}

function getLinkedDomains(primaryDomain) {
  return DOMAIN_RELATION_MAP[primaryDomain] || DOMAIN_RELATION_MAP.GENERAL;
}

function scoreEvidenceStrength(value) {
  const v = normalizeText(value);
  if (v === "strong") return 2.4;
  if (v === "moderate") return 1.2;
  if (v === "weak") return 0.4;
  return 0;
}

function scoreDensity(value) {
  const v = normalizeText(value);
  if (v === "high") return 1.4;
  if (v === "med" || v === "medium") return 0.8;
  if (v === "low") return 0.2;
  return 0;
}

function scoreResidual(value) {
  const v = normalizeText(value);
  if (v === "high") return 0.9;
  if (v === "med" || v === "medium") return 0.4;
  if (v === "low") return 0.1;
  return 0;
}

function scoreUrgency(domain) {
  const activeCount = Number(domain.active_event_count || 0);
  const pendingCount = (domain.events || []).filter((e) =>
    ["PENDING", "FORMING", "PROMISED", "BUILDING", "APPROACHING"].includes(
      String(e.status || "").toUpperCase()
    )
  ).length;

  return round2(activeCount * 0.7 + pendingCount * 1.15);
}

function scoreFutureWeight(domain) {
  const events = Array.isArray(domain.events) ? domain.events : [];

  const futureLike = events.filter((e) =>
    [
      "PENDING",
      "FORMING",
      "PROMISED",
      "BUILDING",
      "APPROACHING",
      "ACTIVE",
      "STABILISING"
    ].includes(String(e.status || "").toUpperCase())
  ).length;

  return round2(futureLike * 1.3);
}

function deterministicDomainTieBreak(a, b) {
  const aKey = String(a.domain_key || "");
  const bKey = String(b.domain_key || "");

  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

function deterministicEventTieBreak(a, b) {
  const aDate = String(a.date_marker ?? "");
  const bDate = String(b.date_marker ?? "");

  if (aDate !== bDate) return aDate.localeCompare(bDate);

  const aNum = Number(a.event_number || 0);
  const bNum = Number(b.event_number || 0);

  if (aNum !== bNum) return aNum - bNum;

  return String(a.event_type || "").localeCompare(String(b.event_type || ""));
}

function buildEventScore(event, domain, questionProfile) {
  let score = 0;

  const status = String(event.status || "").toUpperCase();

  if (["PROMISED", "FORMING", "PENDING", "BUILDING", "APPROACHING"].includes(status)) {
    score += 5.2;
  } else if (["ACTIVE", "STABILISING"].includes(status)) {
    score += 4.1;
  } else if (["EXECUTED"].includes(status)) {
    score += 0.8;
  } else if (["BROKEN", "FAILED", "DENIED"].includes(status)) {
    score -= 0.5;
  }

  if (String(event.importance || "").toUpperCase() === "MAJOR") score += 2.4;
  if (String(event.evidence_strength || "").toLowerCase() === "strong") score += 1.6;
  if (domain.domain_key === questionProfile.primary_domain) score += 3.1;
  if (getLinkedDomains(questionProfile.primary_domain).includes(domain.domain_key)) score += 1.4;

  if (questionProfile.asks_when) score += 0.8;
  if (questionProfile.asks_yes_no) score += 0.5;

  const dateMarker = event.date_marker;
  if (dateMarker != null && dateMarker !== "") score += 0.3;

  return round2(score);
}

function rankDomainEvents(domain, questionProfile) {
  const events = Array.isArray(domain.events) ? domain.events : [];

  return events
    .map((event) => ({
      ...event,
      intelligence_event_score: buildEventScore(event, domain, questionProfile)
    }))
    .sort((a, b) => {
      if (b.intelligence_event_score !== a.intelligence_event_score) {
        return b.intelligence_event_score - a.intelligence_event_score;
      }
      return deterministicEventTieBreak(a, b);
    });
}

function buildDomainScore(domain, questionProfile, linkedDomains) {
  let score = Number(domain.normalized_score || 0);

  score += scoreDensity(domain.density);
  score += scoreResidual(domain.residual_impact);
  score += scoreUrgency(domain);
  score += scoreFutureWeight(domain);

  if (linkedDomains.includes(domain.domain_key)) score += 2.2;
  if (domain.domain_key === questionProfile.primary_domain) score += 4.4;

  if (STRONG_CORE_DOMAINS.has(domain.domain_key)) score += 0.9;
  if (NOISY_DOMAINS.has(domain.domain_key) && questionProfile.is_general) score -= 2.1;

  if (questionProfile.asks_relationship) {
    if (["MARRIAGE", "DIVORCE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(domain.domain_key)) {
      score += 1.5;
    }
  }

  if (questionProfile.asks_money) {
    if (["MONEY", "GAIN", "LOSS", "DEBT", "BUSINESS", "CAREER"].includes(domain.domain_key)) {
      score += 1.5;
    }
  }

  if (questionProfile.asks_health) {
    if (["HEALTH", "DISEASE", "RECOVERY", "MENTAL", "SURGERY", "ACCIDENT"].includes(domain.domain_key)) {
      score += 1.5;
    }
  }

  if (questionProfile.asks_foreign) {
    if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "DOCUMENT"].includes(domain.domain_key)) {
      score += 1.5;
    }
  }

  if (questionProfile.asks_legal) {
    if (["LEGAL", "DOCUMENT", "AUTHORITY", "DEBT", "BUSINESS"].includes(domain.domain_key)) {
      score += 1.5;
    }
  }

  score += scoreEvidenceStrength(domain.evidence_strength);

  return round2(score);
}

function rankDomains(domainResults, questionProfile) {
  const linkedDomains = getLinkedDomains(questionProfile.primary_domain);

  return (Array.isArray(domainResults) ? domainResults : [])
    .map((domain) => {
      const rankedEvents = rankDomainEvents(domain, questionProfile);
      const primaryFutureEvent = rankedEvents[0] || null;

      return {
        ...domain,
        ranked_events: rankedEvents,
        primary_future_event: primaryFutureEvent,
        linked_to_question: linkedDomains.includes(domain.domain_key),
        intelligence_rank_score: buildDomainScore(domain, questionProfile, linkedDomains)
      };
    })
    .sort((a, b) => {
      if (b.intelligence_rank_score !== a.intelligence_rank_score) {
        return b.intelligence_rank_score - a.intelligence_rank_score;
      }

      const aEventScore = Number(a.primary_future_event?.intelligence_event_score || 0);
      const bEventScore = Number(b.primary_future_event?.intelligence_event_score || 0);

      if (bEventScore !== aEventScore) return bEventScore - aEventScore;

      return deterministicDomainTieBreak(a, b);
    });
}

function buildWinnerLock(rankedDomains, questionProfile) {
  const winner = rankedDomains[0] || null;
  const runnerUp = rankedDomains[1] || null;

  const winnerScore = Number(winner?.intelligence_rank_score || 0);
  const runnerScore = Number(runnerUp?.intelligence_rank_score || 0);
  const scoreGap = round2(winnerScore - runnerScore);

  let lockState = "SOFT_LOCK";
  if (scoreGap >= 4) lockState = "HARD_LOCK";
  else if (scoreGap >= 2) lockState = "MEDIUM_LOCK";

  return {
    lock_state: winner ? lockState : "NO_WINNER",
    score_gap: scoreGap,
    winning_domain_key: winner?.domain_key || null,
    winning_domain_label: winner?.domain_label || null,
    winning_event_type: winner?.primary_future_event?.event_type || null,
    winning_event_status: winner?.primary_future_event?.status || null,
    deterministic_mode: true,
    primary_domain_from_question: questionProfile.primary_domain
  };
}

function buildCarryover(rankedDomains) {
  const carry = rankedDomains
    .filter((d) => String(d.present_carryover || "").toUpperCase() === "YES")
    .slice(0, 8)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      residual_impact: d.residual_impact || "UNKNOWN"
    }));

  return {
    present_carryover_detected: carry.length > 0,
    carryover_domains: carry
  };
}

export function runFutureIntelligenceLayer({ domainResults, question }) {
  const question_profile = buildQuestionIntent(question);
  const linked_domain_expansion = getLinkedDomains(question_profile.primary_domain);
  const ranked_domains = rankDomains(domainResults, question_profile);
  const winner_lock = buildWinnerLock(ranked_domains, question_profile);
  const carryover = buildCarryover(ranked_domains);

  return {
    question_profile,
    linked_domain_expansion,
    ranked_domains,
    winner_lock,
    carryover
  };
}