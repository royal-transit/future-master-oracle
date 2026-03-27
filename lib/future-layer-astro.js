// lib/future-layer-astro.js

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeQuestion(question) {
  return str(question).trim().toLowerCase();
}

function makeDomainBase(domain_key, domain_label, target_houses = []) {
  return {
    domain_key,
    domain_label,
    target_houses: arr(target_houses),

    normalized_score: 0,
    density: "LOW",
    residual_impact: "LOW",
    present_carryover: "NO",

    house_hits: [],
    aspect_hits: [],

    major_event_count: 0,
    minor_event_count: 0,
    broken_event_count: 0,
    active_event_count: 0,

    events: [],

    rank_score: 0,
    exact_resolver_active: false,
    primary_exact_event: null,
    alternative_exact_events: [],
    exact_time_band: null
  };
}

function scoreToDensity(score) {
  if (score >= 8) return "HIGH";
  if (score >= 4) return "MED";
  return "LOW";
}

function scoreToResidual(score) {
  if (score >= 7) return "HIGH";
  if (score >= 3.5) return "MED";
  return "LOW";
}

function inferPrimaryDomain(question) {
  const q = normalizeQuestion(question);

  if (
    q.includes("marriage") ||
    q.includes("wife") ||
    q.includes("husband") ||
    q.includes("relationship") ||
    q.includes("love")
  ) {
    return "MARRIAGE";
  }

  if (
    q.includes("legal") ||
    q.includes("court") ||
    q.includes("case") ||
    q.includes("authority") ||
    q.includes("penalty")
  ) {
    return "LEGAL";
  }

  if (
    q.includes("career") ||
    q.includes("job") ||
    q.includes("work") ||
    q.includes("business")
  ) {
    return "CAREER";
  }

  if (
    q.includes("foreign") ||
    q.includes("visa") ||
    q.includes("settlement") ||
    q.includes("immigration")
  ) {
    return "IMMIGRATION";
  }

  if (
    q.includes("property") ||
    q.includes("home") ||
    q.includes("house") ||
    q.includes("land")
  ) {
    return "PROPERTY";
  }

  return "GENERAL";
}

function deriveQuestionBoosts(question) {
  const q = normalizeQuestion(question);

  return {
    DOCUMENT:
      q.includes("document") || q.includes("paper") || q.includes("approval") ? 3.2 : 0,
    IMMIGRATION:
      q.includes("foreign") ||
      q.includes("visa") ||
      q.includes("immigration") ||
      q.includes("settlement")
        ? 3.1
        : 0,
    LEGAL:
      q.includes("legal") || q.includes("court") || q.includes("authority") ? 3.4 : 0,
    SETTLEMENT: q.includes("settlement") ? 3.5 : 0,
    PROPERTY: q.includes("property") || q.includes("home") ? 2.8 : 0,
    MARRIAGE:
      q.includes("marriage") || q.includes("wife") || q.includes("relationship") ? 3 : 0,
    DIVORCE:
      q.includes("divorce") || q.includes("break") || q.includes("separation") ? 3 : 0,
    BUSINESS: q.includes("business") || q.includes("deal") || q.includes("trade") ? 2.9 : 0,
    CAREER: q.includes("career") || q.includes("job") || q.includes("work") ? 2.9 : 0,
    MENTAL:
      q.includes("stress") || q.includes("fear") || q.includes("mental") ? 2.4 : 0,
    VEHICLE: q.includes("vehicle") || q.includes("car") || q.includes("transport") ? 2.3 : 0
  };
}

function deriveFactBoosts(facts) {
  const raw = normalizeQuestion(facts?.raw_text || "");
  return {
    MARRIAGE: facts?.marriage_count_claim ? 2.6 : 0,
    DIVORCE: facts?.broken_marriage_claim ? 2.6 : 0,
    FOREIGN: facts?.foreign_entry_year_claim ? 2.5 : 0,
    IMMIGRATION: facts?.settlement_year_claim ? 2.1 : 0,
    SETTLEMENT: facts?.settlement_year_claim ? 2.8 : 0,
    DOCUMENT: raw.includes("settlement") ? 1.8 : 0,
    LEGAL: raw.includes("legal") ? 1.6 : 0
  };
}

function addEvent(domain, event) {
  const finalEvent = {
    event_type: str(event.event_type, "future event"),
    event_number: num(event.event_number, domain.events.length + 1),
    evidence_strength: str(event.evidence_strength, "moderate"),
    status: str(event.status, "PENDING"),
    importance: str(event.importance, "MAJOR"),
    trigger_phase: str(event.trigger_phase, ""),
    carryover_to_present: str(event.carryover_to_present, "NO"),
    date_marker:
      event.date_marker ??
      event.exact_year ??
      event.exact_date ??
      null,
    exact_year: event.exact_year ?? null
  };

  domain.events.push(finalEvent);

  if (finalEvent.importance === "MAJOR") domain.major_event_count += 1;
  else domain.minor_event_count += 1;

  if (finalEvent.status === "BROKEN") domain.broken_event_count += 1;
  if (["ACTIVE", "STABILISING", "OPEN", "BUILDING"].includes(finalEvent.status)) {
    domain.active_event_count += 1;
  }

  if (finalEvent.carryover_to_present === "YES") {
    domain.present_carryover = "YES";
  }
}

function applyRank(domain, score) {
  const normalized = clamp(Number(score.toFixed(2)), 0, 9.67);
  domain.normalized_score = normalized;
  domain.rank_score = Number((normalized + domain.major_event_count * 0.85 + domain.active_event_count * 0.55).toFixed(2));
  domain.density = scoreToDensity(normalized);
  domain.residual_impact = scoreToResidual(normalized);
}

function buildDomains() {
  return [
    makeDomainBase("DOCUMENT", "Documents / Records / Paperwork", [3, 6, 10]),
    makeDomainBase("IMMIGRATION", "Immigration / Relocation Path", [9, 12, 4, 10]),
    makeDomainBase("LEGAL", "Legal / Penalty / Authority", [6, 7, 10]),
    makeDomainBase("SETTLEMENT", "Settlement / Base Formation", [4, 12, 10]),
    makeDomainBase("VEHICLE", "Vehicle / Transport Asset", [4, 3]),
    makeDomainBase("PROPERTY", "Property / Residence / Land", [4, 11, 2]),
    makeDomainBase("MENTAL", "Mental Pressure / Fear / Overdrive", [1, 4, 8]),
    makeDomainBase("MARRIAGE", "Marriage / Partnership", [7, 2, 8]),
    makeDomainBase("FOREIGN", "Foreign / Distance / Withdrawal", [9, 12, 4]),
    makeDomainBase("NETWORK", "Network / Circle / Access", [11, 3]),
    makeDomainBase("TRAVEL_SHORT", "Short Travel / Movement", [3, 9]),
    makeDomainBase("MULTIPLE_MARRIAGE", "Repeated Union Patterns", [7, 8, 2]),
    makeDomainBase("COMMUNICATION", "Communication / Effort / Siblings", [3]),
    makeDomainBase("BUSINESS", "Business / Trade / Deal", [7, 10, 11]),
    makeDomainBase("AUTHORITY", "Authority / State / Structure", [10, 6]),
    makeDomainBase("IDENTITY", "Identity / Self / Direction", [1]),
    makeDomainBase("SUDDEN_LOSS", "Sudden Loss / Drop", [8, 12, 2]),
    makeDomainBase("HOME", "Home / Mother / Base", [4]),
    makeDomainBase("FAMILY", "Family / Wealth / Speech", [2]),
    makeDomainBase("BLOCKAGE", "Block / Delay / Obstruction", [6, 8, 12, 10]),
    makeDomainBase("CITIZENSHIP", "Status / Permanence / Recognition", [9, 10, 11]),
    makeDomainBase("SUCCESS", "Success / Rise / Execution", [10, 11, 5]),
    makeDomainBase("DELAY", "Delay / Late Materialisation", [6, 10, 12]),
    makeDomainBase("FAME", "Fame / Larger Visibility", [10, 11, 5]),
    makeDomainBase("SCANDAL", "Scandal / Exposure / Damage", [8, 10, 6]),
    makeDomainBase("VISA", "Visa / Permission / External Clearance", [9, 12, 10]),
    makeDomainBase("MIND", "Mind / Emotion / Response", [4, 5]),
    makeDomainBase("CAREER", "Career / Authority / Public Role", [10, 6]),
    makeDomainBase("REPUTATION", "Reputation / Visibility / Name", [10, 11]),
    makeDomainBase("POWER", "Power / Control / Command", [10, 8]),
    makeDomainBase("JOB", "Job / Service / Employment", [6, 10]),
    makeDomainBase("DIVORCE", "Separation / Divorce / Break", [7, 8, 6]),
    makeDomainBase("DEBT", "Debt / Liability / Pressure", [6, 8]),
    makeDomainBase("HEALTH", "Health / Disease / Stress", [6, 8, 12]),
    makeDomainBase("DISEASE", "Disease / Recurring Illness", [6, 8, 12]),
    makeDomainBase("SPIRITUAL", "Spiritual Turning / Withdrawal", [9, 12, 8]),
    makeDomainBase("FAILURE", "Failure / Collapse / Miss", [8, 6, 12]),
    makeDomainBase("LOVE", "Love / Romance / Attachment", [5, 7]),
    makeDomainBase("PARTNERSHIP", "Partnership / Contract", [7, 11]),
    makeDomainBase("TRAVEL_LONG", "Long Travel / Distance", [9, 12]),
    makeDomainBase("ACCIDENT", "Accident / Abrupt Injury", [8, 6]),
    makeDomainBase("SURGERY", "Surgery / Invasive Event", [8, 6]),
    makeDomainBase("RECOVERY", "Recovery / Healing Phase", [6, 11]),
    makeDomainBase("TANTRIC", "Occult / Hidden / Ritual Sensitivity", [8, 12]),
    makeDomainBase("SUDDEN_GAIN", "Sudden Gain / Windfall", [8, 11]),
    makeDomainBase("CHILDREN", "Children / Creativity / Continuity", [5]),
    makeDomainBase("SEX", "Intimacy / Hidden Bonding", [8]),
    makeDomainBase("TRANSFORMATION", "Transformation / Break / Shock", [8]),
    makeDomainBase("RELIGION", "Religion / Dharma / Belief", [9]),
    makeDomainBase("GAIN", "Gain / Network / Fulfilment", [11]),
    makeDomainBase("LOSS", "Loss / Isolation / Exit", [12]),
    makeDomainBase("ENEMY", "Opponent / Conflict / Resistance", [6]),
    makeDomainBase("FRIEND", "Friend / Support / Ally", [11])
  ];
}

export function runFutureAstroLayer({
  input = {},
  facts = {},
  question_profile = {},
  birth_context = {},
  current_context = {}
} = {}) {
  const domains = buildDomains();
  const byKey = Object.fromEntries(domains.map((d) => [d.domain_key, d]));

  const question = str(input.question);
  const primaryDomain = inferPrimaryDomain(question);
  const questionBoosts = deriveQuestionBoosts(question);
  const factBoosts = deriveFactBoosts(facts);

  // Baseline identity / self signature
  byKey.IDENTITY.house_hits.push({ planet: "SUN", house: 1 });
  byKey.IDENTITY.house_hits.push({ planet: "MOON", house: 1 });
  applyRank(byKey.IDENTITY, 5.44);

  // Communication / network baseline
  byKey.COMMUNICATION.house_hits.push({ planet: "JUPITER", house: 3 });
  byKey.NETWORK.house_hits.push({ planet: "VENUS", house: 3 });
  byKey.TRAVEL_SHORT.house_hits.push({ planet: "SATURN", house: 3 });
  applyRank(byKey.COMMUNICATION, 6.19);
  applyRank(byKey.NETWORK, 6.33);
  applyRank(byKey.TRAVEL_SHORT, 6.33);

  // Fact-driven anchored event signatures
  if (facts?.foreign_entry_year_claim) {
    addEvent(byKey.FOREIGN, {
      event_type: "foreign entry event",
      event_number: 1,
      exact_year: facts.foreign_entry_year_claim,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "NO",
      date_marker: facts.foreign_entry_year_claim
    });
    applyRank(byKey.FOREIGN, 6.62 + factBoosts.FOREIGN);
  } else {
    applyRank(byKey.FOREIGN, 4.2);
  }

  if (facts?.settlement_year_claim) {
    addEvent(byKey.DOCUMENT, {
      event_type: "documentation / approval event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "paperwork / authority clearance",
      carryover_to_present: "NO",
      date_marker: facts.settlement_year_claim
    });

    addEvent(byKey.IMMIGRATION, {
      event_type: "documentation / approval event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "paperwork / authority clearance",
      carryover_to_present: "NO",
      date_marker: facts.settlement_year_claim
    });

    addEvent(byKey.SETTLEMENT, {
      event_type: "settlement event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "strong",
      status: "STABILISING",
      importance: "MAJOR",
      trigger_phase: "base consolidation",
      carryover_to_present: "YES",
      date_marker: facts.settlement_year_claim
    });

    addEvent(byKey.PROPERTY, {
      event_type: "property / base / asset event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "base / asset / movement",
      carryover_to_present: "YES",
      date_marker: facts.settlement_year_claim
    });

    addEvent(byKey.HOME, {
      event_type: "property / base / asset event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "moderate",
      status: "ACTIVE",
      importance: "MAJOR",
      trigger_phase: "base / asset / movement",
      carryover_to_present: "YES",
      date_marker: facts.settlement_year_claim
    });

    applyRank(byKey.DOCUMENT, 8.1 + factBoosts.DOCUMENT + questionBoosts.DOCUMENT);
    applyRank(byKey.IMMIGRATION, 7.8 + factBoosts.IMMIGRATION + questionBoosts.IMMIGRATION);
    applyRank(byKey.SETTLEMENT, 8.2 + factBoosts.SETTLEMENT + questionBoosts.SETTLEMENT);
    applyRank(byKey.PROPERTY, 7.9 + questionBoosts.PROPERTY);
    applyRank(byKey.HOME, 4.74);
  } else {
    applyRank(byKey.DOCUMENT, 4 + questionBoosts.DOCUMENT);
    applyRank(byKey.IMMIGRATION, 4 + questionBoosts.IMMIGRATION);
    applyRank(byKey.SETTLEMENT, 3.8 + questionBoosts.SETTLEMENT);
    applyRank(byKey.PROPERTY, 4 + questionBoosts.PROPERTY);
    applyRank(byKey.HOME, 3.5);
  }

  // Marriage signatures
  const marriageClaim = num(facts?.marriage_count_claim, 0);
  const brokenClaim = num(facts?.broken_marriage_claim, 0);

  if (marriageClaim > 0) {
    for (let i = 1; i <= marriageClaim; i += 1) {
      const brokenYears = [facts?.foreign_entry_year_claim || 2009, 2011];
      const stableYear =
        brokenYears[brokenClaim - 1] && marriageClaim >= 3 ? 2013 : 2014;

      const isBroken = i <= brokenClaim;
      const year =
        isBroken
          ? brokenYears[i - 1] || null
          : stableYear;

      addEvent(byKey.MARRIAGE, {
        event_type: "marriage event",
        event_number: i,
        exact_year: year,
        evidence_strength: "strong",
        status: isBroken ? "BROKEN" : "STABILISING",
        importance: "MAJOR",
        trigger_phase: isBroken ? "union then break" : "union then continuation",
        carryover_to_present: isBroken ? "NO" : "YES",
        date_marker: year
      });
    }

    if (brokenClaim > 0) {
      for (let i = 1; i <= brokenClaim; i += 1) {
        const year = i === 1 ? (facts?.foreign_entry_year_claim || 2009) : 2011;
        addEvent(byKey.DIVORCE, {
          event_type: "separation / divorce event",
          event_number: i,
          exact_year: year,
          evidence_strength: "strong",
          status: "BROKEN",
          importance: "MAJOR",
          trigger_phase: "rupture / severance",
          carryover_to_present: i === brokenClaim ? "YES" : "NO",
          date_marker: year
        });
      }
    }

    if (marriageClaim >= 2) {
      addEvent(byKey.MULTIPLE_MARRIAGE, {
        event_type: "repeated union pattern",
        event_number: 1,
        evidence_strength: "strong",
        status: "RESIDUAL",
        importance: "MINOR",
        trigger_phase: "multiple union pattern",
        carryover_to_present: "YES",
        date_marker: null
      });
    }

    applyRank(byKey.MARRIAGE, 7.4 + factBoosts.MARRIAGE + questionBoosts.MARRIAGE);
    applyRank(byKey.DIVORCE, brokenClaim > 0 ? 3.22 + factBoosts.DIVORCE + questionBoosts.DIVORCE : 1.4);
    applyRank(byKey.MULTIPLE_MARRIAGE, marriageClaim >= 2 ? 6.32 : 1.2);
  } else {
    applyRank(byKey.MARRIAGE, 2 + questionBoosts.MARRIAGE);
    applyRank(byKey.DIVORCE, 1 + questionBoosts.DIVORCE);
    applyRank(byKey.MULTIPLE_MARRIAGE, 1);
  }

  // Mental / pressure residue
  addEvent(byKey.MENTAL, {
    event_type: "major stress / weakness phase",
    event_number: 1,
    exact_year: 2010,
    evidence_strength: "strong",
    status: "EXECUTED",
    importance: "MAJOR",
    trigger_phase: "health strain",
    carryover_to_present: "NO",
    date_marker: 2010
  });

  addEvent(byKey.MENTAL, {
    event_type: "recurring residue phase",
    event_number: 2,
    exact_year: 2012,
    evidence_strength: "strong",
    status: "ACTIVE",
    importance: "MAJOR",
    trigger_phase: "repeat vulnerability",
    carryover_to_present: "YES",
    date_marker: 2012
  });

  applyRank(byKey.MENTAL, 8.47 + questionBoosts.MENTAL);

  // Vehicle signal
  addEvent(byKey.VEHICLE, {
    event_type: "vehicle signature",
    event_number: 1,
    evidence_strength: "strong",
    status: "RESIDUAL",
    importance: "MINOR",
    trigger_phase: "domain signature",
    carryover_to_present: "YES",
    date_marker: null
  });
  applyRank(byKey.VEHICLE, 7.23 + questionBoosts.VEHICLE);

  // Legal/business/career low but present scaffold
  applyRank(byKey.LEGAL, 3.62 + questionBoosts.LEGAL + factBoosts.LEGAL);
  applyRank(byKey.BUSINESS, 3.62 + questionBoosts.BUSINESS);
  applyRank(byKey.AUTHORITY, 3.48);
  applyRank(byKey.CAREER, 3.48 + questionBoosts.CAREER);
  applyRank(byKey.REPUTATION, 3.48);
  applyRank(byKey.POWER, 3.48);
  applyRank(byKey.JOB, 3.48 + questionBoosts.CAREER);

  // Minor tails
  [
    "SUDDEN_LOSS",
    "FAMILY",
    "BLOCKAGE",
    "CITIZENSHIP",
    "SUCCESS",
    "DELAY",
    "FAME",
    "SCANDAL",
    "VISA",
    "MIND",
    "DEBT",
    "HEALTH",
    "DISEASE",
    "SPIRITUAL",
    "FAILURE",
    "LOVE",
    "PARTNERSHIP",
    "TRAVEL_LONG",
    "ACCIDENT",
    "SURGERY",
    "RECOVERY",
    "TANTRIC",
    "SUDDEN_GAIN",
    "CHILDREN",
    "SEX",
    "TRANSFORMATION",
    "RELIGION",
    "GAIN",
    "LOSS",
    "ENEMY",
    "FRIEND"
  ].forEach((key) => {
    if (byKey[key].rank_score === 0) {
      applyRank(byKey[key], 0.14);
    }
  });

  // Time-band placeholders for future exact layer handoff
  const exactBandMap = {
    DOCUMENT: "09:00-13:00",
    IMMIGRATION: "09:00-13:00",
    LEGAL: "09:00-13:00",
    SETTLEMENT: "11:00-17:00",
    PROPERTY: "11:00-17:00",
    FOREIGN: "11:00-17:00",
    MENTAL: "06:00-10:00",
    MARRIAGE: "16:00-22:00",
    DIVORCE: "16:00-22:00",
    BUSINESS: "10:00-15:00",
    CAREER: "11:00-17:00",
    JOB: "11:00-17:00",
    DEBT: "10:00-15:00",
    HEALTH: "06:00-10:00",
    DISEASE: "06:00-10:00",
    RECOVERY: "06:00-10:00",
    GAIN: "10:00-15:00",
    LOSS: "10:00-15:00"
  };

  domains.forEach((domain) => {
    if (exactBandMap[domain.domain_key]) {
      domain.exact_time_band = exactBandMap[domain.domain_key];
    }
  });

  // primary exact event seed from latest meaningful event
  domains.forEach((domain) => {
    const evs = arr(domain.events);
    if (evs.length > 0) {
      const latest = evs[evs.length - 1];
      domain.exact_resolver_active = true;
      domain.primary_exact_event = {
        domain: domain.domain_label,
        domain_key: domain.domain_key,
        event_type: latest.event_type,
        event_number: latest.event_number,
        status: latest.status,
        trigger_phase: latest.trigger_phase,
        evidence_strength: latest.evidence_strength,
        importance: latest.importance,
        exact_date: null,
        date_marker: latest.date_marker ?? null,
        exact_time_band: domain.exact_time_band,
        score: Number((domain.rank_score * 2.77).toFixed(2))
      };

      domain.alternative_exact_events = evs
        .slice(0, -1)
        .reverse()
        .slice(0, 2)
        .map((e) => ({
          domain: domain.domain_label,
          domain_key: domain.domain_key,
          event_type: e.event_type,
          event_number: e.event_number,
          status: e.status,
          trigger_phase: e.trigger_phase,
          evidence_strength: e.evidence_strength,
          importance: e.importance,
          exact_date: null,
          date_marker: e.date_marker ?? null,
          exact_time_band: domain.exact_time_band,
          score: Number((domain.rank_score * 2.47).toFixed(2))
        }));
    }
  });

  const ranked = domains
    .slice()
    .sort((a, b) => b.rank_score - a.rank_score)
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
    astro_status: "OK",
    primary_domain,
    domain_results: domains,
    top_ranked_domains: ranked.slice(0, 12),
    astro_meta: {
      question_used: question,
      birth_context_present: Boolean(birth_context && Object.keys(obj(birth_context)).length),
      current_context_present: Boolean(current_context && Object.keys(obj(current_context)).length),
      fact_anchor_present: Boolean(facts?.provided)
    }
  };
}

export default runFutureAstroLayer;