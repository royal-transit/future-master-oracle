// lib/future-layer-evidence.js

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirstNonEmpty(...values) {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

function safeUpper(value, fallback = "UNKNOWN") {
  const s = asString(value, "").trim();
  return s ? s.toUpperCase() : fallback;
}

function normalizeDomainRow(row = {}) {
  const r = asObject(row);
  const primaryExact = asObject(r.primary_exact_event);

  return {
    domain_key: safeUpper(r.domain_key, "UNKNOWN"),
    domain_label: asString(r.domain_label, "Unknown Domain"),
    normalized_score: asNumber(r.normalized_score, 0),
    rank_score: asNumber(r.rank_score, asNumber(r.normalized_score, 0)),
    density: safeUpper(r.density, "LOW"),
    residual_impact: safeUpper(r.residual_impact, "LOW"),
    present_carryover: safeUpper(r.present_carryover, "NO"),
    major_event_count: asNumber(r.major_event_count, 0),
    minor_event_count: asNumber(r.minor_event_count, 0),
    broken_event_count: asNumber(r.broken_event_count, 0),
    active_event_count: asNumber(r.active_event_count, 0),
    exact_time_band: pickFirstNonEmpty(r.exact_time_band, primaryExact.exact_time_band, null),
    events: asArray(r.events).map((e) => normalizeEvent(e)),
    primary_exact_event:
      Object.keys(primaryExact).length > 0 ? normalizeExactEvent(primaryExact) : null,
    alternative_exact_events: asArray(r.alternative_exact_events).map((e) =>
      normalizeExactEvent(e)
    )
  };
}

function normalizeEvent(event = {}) {
  const e = asObject(event);

  return {
    domain: asString(e.domain, ""),
    domain_key: safeUpper(e.domain_key, "UNKNOWN"),
    event_type: asString(e.event_type, "unknown event"),
    event_number: asNumber(e.event_number, 0),
    status: safeUpper(e.status, "UNKNOWN"),
    trigger_phase: asString(e.trigger_phase, ""),
    evidence_strength: safeUpper(e.evidence_strength, "UNKNOWN"),
    importance: safeUpper(e.importance, "MINOR"),
    exact_year:
      e.exact_year === null || e.exact_year === undefined
        ? null
        : asNumber(e.exact_year, null),
    date_marker:
      e.date_marker === null || e.date_marker === undefined
        ? (e.exact_year === null || e.exact_year === undefined
            ? null
            : asNumber(e.exact_year, null))
        : e.date_marker,
    carryover_to_present: safeUpper(e.carryover_to_present, "NO"),
    exact_time_band: pickFirstNonEmpty(e.exact_time_band, null)
  };
}

function normalizeExactEvent(event = {}) {
  const e = asObject(event);

  return {
    domain: asString(e.domain, "Unknown Domain"),
    domain_key: safeUpper(e.domain_key, "UNKNOWN"),
    event_type: asString(e.event_type, "unknown event"),
    event_number: asNumber(e.event_number, 0),
    status: safeUpper(e.status, "UNKNOWN"),
    trigger_phase: asString(e.trigger_phase, ""),
    evidence_strength: safeUpper(e.evidence_strength, "UNKNOWN"),
    importance: safeUpper(e.importance, "MINOR"),
    exact_date: e.exact_date ?? null,
    date_marker:
      e.date_marker === null || e.date_marker === undefined ? null : e.date_marker,
    exact_time_band: pickFirstNonEmpty(e.exact_time_band, null),
    score: asNumber(e.score, 0)
  };
}

function buildExactDomainSummary(domainResults) {
  return asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .filter(
      (row) =>
        row.primary_exact_event ||
        row.alternative_exact_events.length > 0 ||
        row.exact_time_band
    )
    .map((row) => ({
      domain_key: row.domain_key,
      domain_label: row.domain_label,
      exact_time_band: row.exact_time_band,
      primary_exact_event: row.primary_exact_event,
      alternative_exact_events: row.alternative_exact_events
    }));
}

function buildTopRankedDomains(domainResults) {
  return asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, 12)
    .map((row) => ({
      domain_key: row.domain_key,
      domain_label: row.domain_label,
      rank_score: row.rank_score,
      normalized_score: row.normalized_score,
      density: row.density,
      residual_impact: row.residual_impact,
      major_event_count: row.major_event_count,
      broken_event_count: row.broken_event_count,
      active_event_count: row.active_event_count
    }));
}

function buildMasterTimeline(domainResults) {
  return asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .flatMap((row) =>
      row.events.map((event) => ({
        domain: row.domain_label,
        domain_key: row.domain_key,
        event_type: event.event_type,
        event_number: event.event_number,
        status: event.status,
        importance: event.importance,
        trigger_phase: event.trigger_phase,
        evidence_strength: event.evidence_strength,
        date_marker: pickFirstNonEmpty(event.date_marker, event.exact_year, null),
        carryover_to_present: event.carryover_to_present
      }))
    )
    .sort((a, b) => {
      const ay = a.date_marker === null || a.date_marker === undefined ? 999999 : Number(a.date_marker);
      const by = b.date_marker === null || b.date_marker === undefined ? 999999 : Number(b.date_marker);
      if (ay !== by) return ay - by;
      return asNumber(a.event_number, 0) - asNumber(b.event_number, 0);
    });
}

function getMarriageSummary(domainResults) {
  const marriageDomain = asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .find((row) => row.domain_key === "MARRIAGE");

  const marriageEvents = marriageDomain ? marriageDomain.events : [];
  const brokenMarriageCount = marriageEvents.filter((e) => e.status === "BROKEN").length;

  let currentMarriageStatus = "UNKNOWN";
  if (marriageEvents.length > 0) {
    const stabilising = [...marriageEvents].reverse().find((e) =>
      ["ACTIVE", "STABILISING", "PROMISED"].includes(e.status)
    );
    currentMarriageStatus = stabilising
      ? stabilising.status
      : marriageEvents[marriageEvents.length - 1].status;
  }

  return {
    marriage_count: marriageEvents.length,
    broken_marriage_count: brokenMarriageCount,
    current_marriage_status: currentMarriageStatus
  };
}

function getForeignSummary(domainResults) {
  const foreignDomain = asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .find((row) => row.domain_key === "FOREIGN");

  const foreignEvents = foreignDomain ? foreignDomain.events : [];
  const foreignEntry = foreignEvents.find((e) => e.event_type === "foreign entry event");

  return {
    foreign_shift_count: foreignEvents.length,
    foreign_entry_year: foreignEntry ? pickFirstNonEmpty(foreignEntry.exact_year, foreignEntry.date_marker, null) : null
  };
}

function getSettlementSummary(domainResults) {
  const settlementDomain = asArray(domainResults)
    .map((row) => normalizeDomainRow(row))
    .find((row) => row.domain_key === "SETTLEMENT");

  const settlementEvents = settlementDomain ? settlementDomain.events : [];
  const settlement = settlementEvents.find((e) => e.event_type === "settlement event");

  return {
    settlement_year: settlement
      ? pickFirstNonEmpty(settlement.exact_year, settlement.date_marker, null)
      : null
  };
}

function buildCarryover(domainResults) {
  const rows = asArray(domainResults).map((row) => normalizeDomainRow(row));

  const carryoverDomains = rows
    .filter((row) => row.present_carryover === "YES" || row.active_event_count > 0)
    .slice(0, 8)
    .map((row) => ({
      domain: row.domain_label,
      residual_impact: row.residual_impact
    }));

  return {
    present_carryover_detected: carryoverDomains.length > 0,
    carryover_domains: carryoverDomains
  };
}

function buildEventSummary(domainResults, topRankedDomains) {
  const rows = asArray(domainResults).map((row) => normalizeDomainRow(row));

  const marriage = getMarriageSummary(rows);
  const foreign = getForeignSummary(rows);
  const settlement = getSettlementSummary(rows);

  return {
    total_estimated_events: rows.reduce((sum, row) => sum + row.events.length, 0),
    total_major_events: rows.reduce((sum, row) => sum + row.major_event_count, 0),
    total_minor_events: rows.reduce((sum, row) => sum + row.minor_event_count, 0),
    total_broken_events: rows.reduce((sum, row) => sum + row.broken_event_count, 0),
    total_active_events: rows.reduce((sum, row) => sum + row.active_event_count, 0),

    marriage_count: marriage.marriage_count,
    broken_marriage_count: marriage.broken_marriage_count,
    current_marriage_status: marriage.current_marriage_status,

    foreign_shift_count: foreign.foreign_shift_count,
    foreign_entry_year: foreign.foreign_entry_year,
    settlement_year: settlement.settlement_year,

    top_5_domains: asArray(topRankedDomains)
      .slice(0, 5)
      .map((d) => asString(d.domain_label, "Unknown Domain"))
  };
}

function buildValidationBlock(facts = {}, eventSummary = {}) {
  const f = asObject(facts);
  const e = asObject(eventSummary);

  return {
    reality_validation_active: !!f.provided,

    marriage_fact_match:
      f.marriage_count_claim === null || f.marriage_count_claim === undefined
        ? "NOT_PROVIDED"
        : asNumber(f.marriage_count_claim, -1) === asNumber(e.marriage_count, -2)
          ? "EXACT"
          : "CONFLICT",

    broken_marriage_fact_match:
      f.broken_marriage_claim === null || f.broken_marriage_claim === undefined
        ? "NOT_PROVIDED"
        : asNumber(f.broken_marriage_claim, -1) === asNumber(e.broken_marriage_count, -2)
          ? "EXACT"
          : "CONFLICT",

    foreign_fact_match:
      f.foreign_entry_year_claim === null || f.foreign_entry_year_claim === undefined
        ? "NOT_PROVIDED"
        : asNumber(f.foreign_entry_year_claim, -1) === asNumber(e.foreign_entry_year, -2)
          ? "EXACT"
          : "CONFLICT",

    settlement_fact_match:
      f.settlement_year_claim === null || f.settlement_year_claim === undefined
        ? "NOT_PROVIDED"
        : asNumber(f.settlement_year_claim, -1) === asNumber(e.settlement_year, -2)
          ? "EXACT"
          : "CONFLICT"
  };
}

function buildForensicVerdict(questionProfile = {}, eventSummary = {}, carryover = {}, validationBlock = {}) {
  const primaryDomain = safeUpper(questionProfile.primary_domain, "GENERAL");

  const validationState =
    ["marriage_fact_match", "broken_marriage_fact_match", "foreign_fact_match", "settlement_fact_match"]
      .some((k) => validationBlock[k] === "CONFLICT")
      ? "CONFLICT_PRESENT"
      : "STABLE";

  return {
    forensic_direction:
      `${primaryDomain} scan shows ` +
      `${asNumber(eventSummary.total_major_events, 0)} major signals, ` +
      `${asNumber(eventSummary.total_broken_events, 0)} broken signatures, and ` +
      `${carryover.present_carryover_detected ? "active residue" : "limited residue"}.`,
    validation_state: validationState
  };
}

function buildLokkothaSummary(questionProfile = {}, eventSummary = {}, carryover = {}) {
  const primaryDomain = asString(questionProfile.primary_domain || "general", "general").toLowerCase();

  return {
    text:
      `${primaryDomain}-এর পথ সোজা নয়; ` +
      `বড় চিহ্ন ${asNumber(eventSummary.total_major_events, 0)}, ` +
      `ভাঙা দাগ ${asNumber(eventSummary.total_broken_events, 0)}, ` +
      `আর তার ঢেউ ` +
      `${carryover.present_carryover_detected ? "এখনও চলছে" : "ধীরে নেমে যাচ্ছে"}.`
  };
}

function buildProjectPasteBlock({
  input,
  questionProfile,
  topRankedDomains,
  eventSummary,
  validationBlock,
  forensicVerdict,
  lokkothaSummary,
  masterTimeline,
  carryover
}) {
  const subject = asString(input?.name, "UNKNOWN");
  const primaryDomain = safeUpper(questionProfile?.primary_domain, "GENERAL");

  return [
    "FUTURE UNIVERSAL NANO BLOCK",
    `Subject: ${subject}`,
    `Primary Domain: ${primaryDomain}`,
    `Top Domains: ${asArray(topRankedDomains).slice(0, 6).map((d) => d.domain_label).join(" | ") || "UNKNOWN"}`,

    `Total Estimated Events: ${asNumber(eventSummary.total_estimated_events, 0)}`,
    `Total Major Events: ${asNumber(eventSummary.total_major_events, 0)}`,
    `Total Broken Events: ${asNumber(eventSummary.total_broken_events, 0)}`,

    `Marriage Count Signature: ${asNumber(eventSummary.marriage_count, 0)}`,
    `Broken Marriage Signature: ${asNumber(eventSummary.broken_marriage_count, 0)}`,
    `Current Marriage Status: ${asString(eventSummary.current_marriage_status, "UNKNOWN")}`,

    `Foreign Shift Count: ${asNumber(eventSummary.foreign_shift_count, 0)}`,
    `Foreign Entry Year: ${eventSummary.foreign_entry_year ?? "UNKNOWN"}`,
    `Settlement Year: ${eventSummary.settlement_year ?? "UNKNOWN"}`,

    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,

    `Marriage Validation: ${asString(validationBlock.marriage_fact_match, "NOT_PROVIDED")}`,
    `Broken Marriage Validation: ${asString(validationBlock.broken_marriage_fact_match, "NOT_PROVIDED")}`,
    `Foreign Validation: ${asString(validationBlock.foreign_fact_match, "NOT_PROVIDED")}`,
    `Settlement Validation: ${asString(validationBlock.settlement_fact_match, "NOT_PROVIDED")}`,

    `Direction: ${asString(forensicVerdict.forensic_direction, "")}`,
    `Lokkotha: ${asString(lokkothaSummary.text, "")}`,

    "Timeline:",
    ...asArray(masterTimeline).slice(0, 16).map(
      (e) =>
        `${asString(e.domain, "Unknown Domain")} | #${asNumber(e.event_number, 0)} | ${asString(e.event_type, "unknown")} | ${asString(e.status, "UNKNOWN")} | ${pickFirstNonEmpty(e.date_marker, "UNDATED")}`
    ),

    "FUTURE UNIVERSAL NANO BLOCK END"
  ].join("\n");
}

export function runEvidenceLayer({
  input = {},
  facts = {},
  question_profile = {},
  domain_results = [],
  ranked_domains = [],
  master_timeline = [],
  carryover = null
}) {
  const normalizedDomainResults = asArray(domain_results).map((row) => normalizeDomainRow(row));

  const topRankedDomains =
    asArray(ranked_domains).length > 0
      ? asArray(ranked_domains).map((row) => normalizeDomainRow(row)).slice(0, 12).map((row) => ({
          domain_key: row.domain_key,
          domain_label: row.domain_label,
          rank_score: row.rank_score,
          normalized_score: row.normalized_score,
          density: row.density,
          residual_impact: row.residual_impact,
          major_event_count: row.major_event_count,
          broken_event_count: row.broken_event_count,
          active_event_count: row.active_event_count
        }))
      : buildTopRankedDomains(normalizedDomainResults);

  const masterTimeline =
    asArray(master_timeline).length > 0
      ? asArray(master_timeline)
      : buildMasterTimeline(normalizedDomainResults);

  const carryoverBlock =
    carryover && typeof carryover === "object"
      ? {
          present_carryover_detected: !!carryover.present_carryover_detected,
          carryover_domains: asArray(carryover.carryover_domains)
        }
      : buildCarryover(normalizedDomainResults);

  const exactDomainSummary = buildExactDomainSummary(normalizedDomainResults);
  const eventSummary = buildEventSummary(normalizedDomainResults, topRankedDomains);
  const validationBlock = buildValidationBlock(facts, eventSummary);
  const forensicVerdict = buildForensicVerdict(
    question_profile,
    eventSummary,
    carryoverBlock,
    validationBlock
  );
  const lokkothaSummary = buildLokkothaSummary(
    question_profile,
    eventSummary,
    carryoverBlock
  );

  const projectPasteBlock = buildProjectPasteBlock({
    input,
    questionProfile: question_profile,
    topRankedDomains,
    eventSummary,
    validationBlock,
    forensicVerdict,
    lokkothaSummary,
    masterTimeline,
    carryover: carryoverBlock
  });

  return {
    top_ranked_domains: topRankedDomains,
    exact_domain_summary: exactDomainSummary,
    event_summary: eventSummary,
    master_timeline: masterTimeline,
    current_carryover: carryoverBlock,
    validation_block: validationBlock,
    forensic_verdict: forensicVerdict,
    lokkotha_summary: lokkothaSummary,
    project_paste_block: projectPasteBlock
  };
}