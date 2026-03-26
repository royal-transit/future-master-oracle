// lib/future-layer-astro.js

import {
  FUTURE_DOMAIN_REGISTRY,
  FUTURE_CORE_DOMAINS,
  FUTURE_NOISY_DOMAINS
} from "./future-oracle-contract.js";

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function signToIndex(sign) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs.indexOf(sign);
}

function normalizeEvidence(packet) {
  const natalPlanets = packet?.natal?.planets || [];
  const transitPlanets = packet?.transit_now?.planets || [];
  const natalAspects = packet?.natal?.aspects || [];
  const transitAspects = packet?.transit_now?.aspects || [];
  const asc = packet?.natal?.ascendant || null;

  const natalMap = {};
  natalPlanets.forEach((p) => {
    natalMap[(p.planet || "").toUpperCase()] = p;
  });

  const transitMap = {};
  transitPlanets.forEach((p) => {
    transitMap[(p.planet || "").toUpperCase()] = p;
  });

  const natalHousesByPlanet = {};
  if (asc) {
    const ascIndex = signToIndex(asc.sign);
    natalPlanets.forEach((p) => {
      const pIndex = signToIndex(p.sign);
      if (ascIndex >= 0 && pIndex >= 0) {
        natalHousesByPlanet[(p.planet || "").toUpperCase()] =
          ((pIndex - ascIndex + 12) % 12) + 1;
      }
    });
  }

  const transitHousesByPlanet = {};
  if (asc) {
    const ascIndex = signToIndex(asc.sign);
    transitPlanets.forEach((p) => {
      const pIndex = signToIndex(p.sign);
      if (ascIndex >= 0 && pIndex >= 0) {
        transitHousesByPlanet[(p.planet || "").toUpperCase()] =
          ((pIndex - ascIndex + 12) % 12) + 1;
      }
    });
  }

  return {
    natalMap,
    transitMap,
    natalAspects,
    transitAspects,
    ascendant: asc,
    natalHousesByPlanet,
    transitHousesByPlanet,
    dasha: packet?.dasha || {},
    kp: packet?.kp || {},
    divisional: packet?.divisional || {},
    meta: {
      natal_planet_count: natalPlanets.length,
      transit_planet_count: transitPlanets.length,
      natal_aspect_count: natalAspects.length,
      transit_aspect_count: transitAspects.length,
      ascendant_present: !!asc,
      natal_house_mapping_present: Object.keys(natalHousesByPlanet).length > 0,
      transit_house_mapping_present: Object.keys(transitHousesByPlanet).length > 0
    }
  };
}

function getTargetHouses(domainKey) {
  const map = {
    IDENTITY: [1],
    MIND: [4, 5],
    COMMUNICATION: [3],
    FAMILY: [2],
    HOME: [4],
    LOVE: [5, 7],
    CHILDREN: [5],
    HEALTH: [6, 8, 12],
    MARRIAGE: [7, 2, 8],
    SEX: [8],
    TRANSFORMATION: [8],
    FOREIGN: [9, 12, 4],
    RELIGION: [9],
    CAREER: [10, 6],
    GAIN: [11],
    LOSS: [12],
    DEBT: [6, 8],
    LEGAL: [6, 7, 10],
    ENEMY: [6],
    FRIEND: [11],
    NETWORK: [11, 3],
    REPUTATION: [10, 11],
    POWER: [10, 8],
    AUTHORITY: [10, 6],
    BUSINESS: [7, 10, 11],
    JOB: [6, 10],
    PARTNERSHIP: [7, 11],
    DIVORCE: [7, 8, 6],
    MULTIPLE_MARRIAGE: [7, 8, 2],
    TRAVEL_SHORT: [3, 9],
    TRAVEL_LONG: [9, 12],
    SETTLEMENT: [4, 12, 10],
    CITIZENSHIP: [9, 10, 11],
    ACCIDENT: [8, 6],
    SURGERY: [8, 6],
    DISEASE: [6, 8, 12],
    RECOVERY: [6, 11],
    MENTAL: [1, 4, 8],
    SPIRITUAL: [9, 12, 8],
    TANTRIC: [8, 12],
    BLOCKAGE: [6, 8, 12, 10],
    SUCCESS: [10, 11, 5],
    FAILURE: [8, 6, 12],
    DELAY: [6, 10, 12],
    SUDDEN_GAIN: [8, 11],
    SUDDEN_LOSS: [8, 12, 2],
    FAME: [10, 11, 5],
    SCANDAL: [8, 10, 6],
    DOCUMENT: [3, 6, 10],
    VISA: [9, 12, 10],
    IMMIGRATION: [9, 12, 4, 10],
    PROPERTY: [4, 11, 2],
    VEHICLE: [4, 3]
  };

  return map[domainKey] || [];
}

function scoreHouseHits(houseMap, targetHouses) {
  const benefics = ["JUPITER", "VENUS", "MOON", "MERCURY"];
  const malefics = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

  const hits = [];
  let score = 0;

  for (const [planetName, houseNum] of Object.entries(houseMap || {})) {
    if (targetHouses.includes(houseNum)) {
      hits.push({ planet: planetName, house: houseNum });

      let weight = 1;
      if (benefics.includes(planetName)) weight += 0.6;
      if (malefics.includes(planetName)) weight += 0.8;

      score += weight;
    }
  }

  return { hits, score };
}

function scoreAspectHits(aspects, houseMap, targetHouses) {
  const hits = [];
  let score = 0;

  for (const asp of aspects || []) {
    const p1 = String(asp.planet1 || "").toUpperCase();
    const p2 = String(asp.planet2 || "").toUpperCase();
    const h1 = houseMap[p1];
    const h2 = houseMap[p2];

    if (targetHouses.includes(h1) || targetHouses.includes(h2)) {
      hits.push({
        planet1: p1,
        planet2: p2,
        type: asp.type,
        orb_gap: asp.orb_gap
      });
      score += 0.4;
    }
  }

  return { hits, score };
}

function getFactBoost(domainKey, facts) {
  let boost = 0;

  if (domainKey === "MARRIAGE" && facts.marriage_count_claim != null) boost += 2.5;
  if (domainKey === "DIVORCE" && facts.broken_marriage_claim != null) boost += 2.2;
  if (domainKey === "FOREIGN" && facts.foreign_entry_year_claim != null) boost += 2.6;
  if (domainKey === "SETTLEMENT" && facts.settlement_year_claim != null) boost += 2.8;
  if (domainKey === "IMMIGRATION" && (facts.foreign_entry_year_claim != null || facts.settlement_year_claim != null)) boost += 2.0;
  if (domainKey === "PROPERTY" && facts.settlement_year_claim != null) boost += 1.6;
  if (domainKey === "HOME" && facts.settlement_year_claim != null) boost += 1.2;
  if (domainKey === "MULTIPLE_MARRIAGE" && (facts.marriage_count_claim ?? 0) >= 2) boost += 1.4;

  return boost;
}

function getFutureBias(domainKey, questionProfile) {
  let boost = 0;

  if (domainKey === questionProfile.primary_domain) boost += 2.5;
  if (FUTURE_CORE_DOMAINS.has(domainKey)) boost += 1.1;
  if (questionProfile.primary_domain === "GENERAL" && FUTURE_NOISY_DOMAINS.has(domainKey)) boost -= 1.6;

  return boost;
}

function getDashaBoost(domainKey, evidence) {
  const maha = String(
    evidence?.dasha?.maha_dasha ||
    evidence?.dasha?.mahadasha ||
    ""
  ).toUpperCase();

  const bhukti = String(evidence?.dasha?.bhukti || "").toUpperCase();
  const antara = String(evidence?.dasha?.antara || "").toUpperCase();

  const all = [maha, bhukti, antara].filter(Boolean).join("|");

  let boost = 0;

  if (["MARRIAGE", "RELATIONSHIP", "LOVE", "MULTIPLE_MARRIAGE"].includes(domainKey)) {
    if (all.includes("VENUS") || all.includes("MOON")) boost += 0.8;
  }

  if (["CAREER", "JOB", "BUSINESS", "AUTHORITY", "REPUTATION"].includes(domainKey)) {
    if (all.includes("SATURN") || all.includes("SUN") || all.includes("JUPITER")) boost += 0.8;
  }

  if (["FOREIGN", "IMMIGRATION", "SETTLEMENT", "VISA"].includes(domainKey)) {
    if (all.includes("RAHU") || all.includes("SATURN") || all.includes("JUPITER")) boost += 0.9;
  }

  if (["HEALTH", "DISEASE", "MENTAL", "RECOVERY"].includes(domainKey)) {
    if (all.includes("SATURN") || all.includes("KETU") || all.includes("MOON")) boost += 0.7;
  }

  return boost;
}

function buildFutureWhy(domainKey, normalizedScore, factBoost, futureBias, dashaBoost) {
  const reasons = [];

  if (normalizedScore >= 7.5) reasons.push("strong chart activation");
  else if (normalizedScore >= 4.5) reasons.push("moderate chart activation");

  if (factBoost > 0) reasons.push("anchored life pattern");
  if (futureBias > 0) reasons.push("question-relevant future focus");
  if (dashaBoost > 0) reasons.push("dasha support");

  if (!reasons.length) reasons.push("weak baseline activation");

  return reasons.join(", ");
}

export function runFutureAstroLayer({
  evidence_packet,
  facts,
  question_profile
}) {
  const evidence = normalizeEvidence(evidence_packet);

  const domain_results = FUTURE_DOMAIN_REGISTRY.map((domainKey) => {
    const domainLabel = domainKey
      .split("_")
      .map((x) => x.charAt(0) + x.slice(1).toLowerCase())
      .join(" / ");

    const targetHouses = getTargetHouses(domainKey);

    const natalHouse = scoreHouseHits(evidence.natalHousesByPlanet, targetHouses);
    const transitHouse = scoreHouseHits(evidence.transitHousesByPlanet, targetHouses);

    const natalAspect = scoreAspectHits(
      evidence.natalAspects,
      evidence.natalHousesByPlanet,
      targetHouses
    );

    const transitAspect = scoreAspectHits(
      evidence.transitAspects,
      evidence.transitHousesByPlanet,
      targetHouses
    );

    const factBoost = getFactBoost(domainKey, facts);
    const futureBias = getFutureBias(domainKey, question_profile);
    const dashaBoost = getDashaBoost(domainKey, evidence);

    const rawScore =
      natalHouse.score * 0.9 +
      transitHouse.score * 1.1 +
      natalAspect.score * 0.7 +
      transitAspect.score * 1.0 +
      factBoost +
      futureBias +
      dashaBoost;

    const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.12));

    const density =
      normalizedScore >= 7.5 ? "HIGH" :
      normalizedScore >= 4.5 ? "MED" : "LOW";

    const residualImpact =
      normalizedScore >= 7 ? "HIGH" :
      normalizedScore >= 4 ? "MED" : "LOW";

    return {
      domain_key: domainKey,
      domain_label: domainLabel,
      target_houses: targetHouses,
      normalized_score: normalizedScore,
      density,
      residual_impact: residualImpact,
      present_carryover: normalizedScore >= 6 ? "YES" : "NO",

      natal_house_hits: natalHouse.hits,
      transit_house_hits: transitHouse.hits,
      natal_aspect_hits: natalAspect.hits,
      transit_aspect_hits: transitAspect.hits,

      future_activation_reason: buildFutureWhy(
        domainKey,
        normalizedScore,
        factBoost,
        futureBias,
        dashaBoost
      ),

      fact_boost: round2(factBoost),
      future_bias: round2(futureBias),
      dasha_boost: round2(dashaBoost)
    };
  });

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    domain_results
  };
}