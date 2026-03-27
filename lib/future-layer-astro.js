// lib/future-layer-astro.js

import { safeArray, safeObject } from "./chart-core.js";

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const PLANET_WEIGHT = {
  SUN: 1.2,
  MOON: 1.15,
  MARS: 1.1,
  MERCURY: 1.0,
  JUPITER: 1.25,
  VENUS: 1.1,
  SATURN: 1.2,
  RAHU: 1.05,
  KETU: 1.05
};

const HOUSE_DOMAIN_RULES = [
  {
    domain_key: "CAREER",
    domain_label: "Career / Authority / Public Role",
    target_houses: [10, 6, 11]
  },
  {
    domain_key: "JOB",
    domain_label: "Job / Service / Employment",
    target_houses: [6, 10]
  },
  {
    domain_key: "BUSINESS",
    domain_label: "Business / Trade / Deal",
    target_houses: [7, 10, 11]
  },
  {
    domain_key: "MARRIAGE",
    domain_label: "Marriage / Partnership",
    target_houses: [7, 2, 8]
  },
  {
    domain_key: "LOVE",
    domain_label: "Love / Romance / Attachment",
    target_houses: [5, 7]
  },
  {
    domain_key: "PARTNERSHIP",
    domain_label: "Partnership / Contract",
    target_houses: [7, 11]
  },
  {
    domain_key: "DIVORCE",
    domain_label: "Separation / Divorce / Break",
    target_houses: [7, 8, 6]
  },
  {
    domain_key: "FOREIGN",
    domain_label: "Foreign / Distance / Withdrawal",
    target_houses: [9, 12, 4]
  },
  {
    domain_key: "IMMIGRATION",
    domain_label: "Immigration / Relocation Path",
    target_houses: [9, 12, 4, 10]
  },
  {
    domain_key: "VISA",
    domain_label: "Visa / Permission / External Clearance",
    target_houses: [9, 12, 10]
  },
  {
    domain_key: "DOCUMENT",
    domain_label: "Documents / Records / Paperwork",
    target_houses: [3, 6, 10]
  },
  {
    domain_key: "AUTHORITY",
    domain_label: "Authority / State / Structure",
    target_houses: [10, 6]
  },
  {
    domain_key: "LEGAL",
    domain_label: "Legal / Penalty / Authority",
    target_houses: [6, 7, 10]
  },
  {
    domain_key: "SETTLEMENT",
    domain_label: "Settlement / Base Formation",
    target_houses: [4, 12, 10]
  },
  {
    domain_key: "PROPERTY",
    domain_label: "Property / Residence / Land",
    target_houses: [4, 11, 2]
  },
  {
    domain_key: "HOME",
    domain_label: "Home / Mother / Base",
    target_houses: [4]
  },
  {
    domain_key: "VEHICLE",
    domain_label: "Vehicle / Transport Asset",
    target_houses: [4, 3]
  },
  {
    domain_key: "GAIN",
    domain_label: "Gain / Network / Fulfilment",
    target_houses: [11]
  },
  {
    domain_key: "NETWORK",
    domain_label: "Network / Circle / Access",
    target_houses: [11, 3]
  },
  {
    domain_key: "COMMUNICATION",
    domain_label: "Communication / Effort / Siblings",
    target_houses: [3]
  },
  {
    domain_key: "TRAVEL_SHORT",
    domain_label: "Short Travel / Movement",
    target_houses: [3, 9]
  },
  {
    domain_key: "TRAVEL_LONG",
    domain_label: "Long Travel / Distance",
    target_houses: [9, 12]
  },
  {
    domain_key: "HEALTH",
    domain_label: "Health / Disease / Stress",
    target_houses: [6, 8, 12]
  },
  {
    domain_key: "DISEASE",
    domain_label: "Disease / Recurring Illness",
    target_houses: [6, 8, 12]
  },
  {
    domain_key: "RECOVERY",
    domain_label: "Recovery / Healing Phase",
    target_houses: [6, 11]
  },
  {
    domain_key: "MENTAL",
    domain_label: "Mental Pressure / Fear / Overdrive",
    target_houses: [1, 4, 8]
  },
  {
    domain_key: "MIND",
    domain_label: "Mind / Emotion / Response",
    target_houses: [4, 5]
  },
  {
    domain_key: "DEBT",
    domain_label: "Debt / Liability / Pressure",
    target_houses: [6, 8]
  },
  {
    domain_key: "LOSS",
    domain_label: "Loss / Isolation / Exit",
    target_houses: [12]
  },
  {
    domain_key: "SUCCESS",
    domain_label: "Success / Rise / Execution",
    target_houses: [10, 11, 5]
  },
  {
    domain_key: "DELAY",
    domain_label: "Delay / Late Materialisation",
    target_houses: [6, 10, 12]
  },
  {
    domain_key: "BLOCKAGE",
    domain_label: "Block / Delay / Obstruction",
    target_houses: [6, 8, 12, 10]
  },
  {
    domain_key: "REPUTATION",
    domain_label: "Reputation / Visibility / Name",
    target_houses: [10, 11]
  },
  {
    domain_key: "POWER",
    domain_label: "Power / Control / Command",
    target_houses: [10, 8]
  },
  {
    domain_key: "CHILDREN",
    domain_label: "Children / Creativity / Continuity",
    target_houses: [5]
  },
  {
    domain_key: "SUDDEN_GAIN",
    domain_label: "Sudden Gain / Windfall",
    target_houses: [8, 11]
  },
  {
    domain_key: "SUDDEN_LOSS",
    domain_label: "Sudden Loss / Drop",
    target_houses: [8, 12, 2]
  },
  {
    domain_key: "ACCIDENT",
    domain_label: "Accident / Abrupt Injury",
    target_houses: [8, 6]
  },
  {
    domain_key: "SURGERY",
    domain_label: "Surgery / Invasive Event",
    target_houses: [8, 6]
  },
  {
    domain_key: "SCANDAL",
    domain_label: "Scandal / Exposure / Damage",
    target_houses: [8, 10, 6]
  },
  {
    domain_key: "FAME",
    domain_label: "Fame / Larger Visibility",
    target_houses: [10, 11, 5]
  },
  {
    domain_key: "SPIRITUAL",
    domain_label: "Spiritual Turning / Withdrawal",
    target_houses: [9, 12, 8]
  },
  {
    domain_key: "RELIGION",
    domain_label: "Religion / Dharma / Belief",
    target_houses: [9]
  },
  {
    domain_key: "IDENTITY",
    domain_label: "Identity / Self / Direction",
    target_houses: [1]
  },
  {
    domain_key: "ENEMY",
    domain_label: "Opponent / Conflict / Resistance",
    target_houses: [6]
  },
  {
    domain_key: "FRIEND",
    domain_label: "Friend / Support / Ally",
    target_houses: [11]
  }
];

function weightedHitScore(planet) {
  return PLANET_WEIGHT[String(planet || "").toUpperCase()] || 1;
}

function getHouseHits(domainRule, mappedPlanets = []) {
  return safeArray(mappedPlanets).filter((p) =>
    safeArray(domainRule.target_houses).includes(Number(p.house))
  );
}

function getAspectHits(domainRule, aspects = [], houseHits = []) {
  const relevantPlanets = new Set(
    safeArray(houseHits).map((h) => String(h.planet || "").toUpperCase())
  );

  return safeArray(aspects).filter((a) => {
    const p1 = String(a.planet1 || "").toUpperCase();
    const p2 = String(a.planet2 || "").toUpperCase();
    return relevantPlanets.has(p1) || relevantPlanets.has(p2);
  });
}

function scoreDomain(houseHits = [], aspectHits = [], targetHouses = []) {
  const baseHouse = safeArray(houseHits).reduce(
    (sum, h) => sum + weightedHitScore(h.planet),
    0
  );

  const baseAspect = safeArray(aspectHits).reduce((sum, a) => {
    const type = String(a.type || "").toLowerCase();
    if (type === "conjunction" || type === "opposition") return sum + 1.2;
    if (type === "square" || type === "trine") return sum + 1.0;
    if (type === "sextile") return sum + 0.8;
    return sum + 0.5;
  }, 0);

  const densityBoost =
    safeArray(targetHouses).length >= 3 ? 1.2 : 1.0;

  return round2((baseHouse + baseAspect) * densityBoost);
}

function classifyDensity(score) {
  if (score >= 8) return "HIGH";
  if (score >= 4) return "MED";
  return "LOW";
}

function classifyResidual(score) {
  if (score >= 8) return "HIGH";
  if (score >= 4) return "MED";
  return "LOW";
}

function inferPresentCarryover(domainKey, score) {
  const persistent = new Set([
    "CAREER",
    "BUSINESS",
    "MARRIAGE",
    "DIVORCE",
    "MENTAL",
    "SETTLEMENT",
    "PROPERTY",
    "HOME",
    "VEHICLE",
    "DEBT",
    "REPUTATION",
    "POWER"
  ]);

  return persistent.has(domainKey) && score >= 4 ? "YES" : "NO";
}

export function runFutureAstroLayer({
  transit_house_mapping = [],
  aspect_table = [],
  question_profile = {},
  linked_domain_expansion = []
} = {}) {
  const mappedPlanets = safeArray(transit_house_mapping);
  const aspects = safeArray(aspect_table);
  const preferredDomains = new Set(
    safeArray(linked_domain_expansion).map((x) => String(x || "").toUpperCase())
  );
  const primaryDomain = String(
    question_profile.primary_domain || ""
  ).toUpperCase();

  const domainResults = HOUSE_DOMAIN_RULES.map((rule) => {
    const houseHits = getHouseHits(rule, mappedPlanets);
    const aspectHits = getAspectHits(rule, aspects, houseHits);
    let normalizedScore = scoreDomain(
      houseHits,
      aspectHits,
      rule.target_houses
    );

    if (rule.domain_key === primaryDomain) normalizedScore += 1.35;
    if (preferredDomains.has(rule.domain_key)) normalizedScore += 0.75;

    normalizedScore = round2(normalizedScore);

    const density = classifyDensity(normalizedScore);
    const residual_impact = classifyResidual(normalizedScore);

    const result = {
      domain_key: rule.domain_key,
      domain_label: rule.domain_label,
      target_houses: [...rule.target_houses],
      normalized_score: normalizedScore,
      density,
      residual_impact,
      present_carryover: inferPresentCarryover(
        rule.domain_key,
        normalizedScore
      ),
      house_hits: houseHits.map((h) => ({
        planet: h.planet,
        house: h.house
      })),
      aspect_hits: aspectHits.map((a) => ({
        planet1: a.planet1,
        planet2: a.planet2,
        type: a.type,
        orb_gap: a.orb_gap
      })),
      major_event_count: 0,
      minor_event_count: 0,
      broken_event_count: 0,
      active_event_count: 0,
      events: [],
      rank_score: round2(normalizedScore + aspectHits.length * 0.4),
      exact_resolver_active: false,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: null
    };

    return result;
  });

  const top_ranked_domains = [...domainResults]
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, 12)
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

  return {
    domain_results: domainResults,
    top_ranked_domains
  };
}

export function getFutureAstroDomainRules() {
  return HOUSE_DOMAIN_RULES.map((x) => safeObject(x));
}