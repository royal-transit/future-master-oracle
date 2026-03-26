// lib/future-oracle-contract.js

const asArray = (v) => (Array.isArray(v) ? v : []);
const asObj = (v) => (v && typeof v === "object" ? v : {});
const asStr = (v, fallback = "") => (v == null ? fallback : String(v));
const asNum = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function safeEvent(e = {}) {
  const x = asObj(e);
  return {
    domain: asStr(x.domain, "UNKNOWN"),
    domain_key: asStr(x.domain_key, "UNKNOWN"),
    event_type: asStr(x.event_type, "UNKNOWN"),
    event_number: asNum(x.event_number, null),
    status: asStr(x.status, "UNKNOWN"),
    trigger_phase: asStr(x.trigger_phase, ""),
    evidence_strength: asStr(x.evidence_strength, ""),
    importance: asStr(x.importance, ""),
    exact_date: x.exact_date ?? null,
    date_marker: x.date_marker ?? null,
    exact_time_band: x.exact_time_band ?? null,
    score: asNum(x.score, null)
  };
}

function safeDomain(d = {}) {
  const x = asObj(d);
  return {
    domain_key: asStr(x.domain_key, "UNKNOWN"),
    domain_label: asStr(x.domain_label, "UNKNOWN"),
    rank_score: asNum(x.rank_score, 0),
    normalized_score: asNum(x.normalized_score, 0),
    density: asStr(x.density, "LOW"),
    residual_impact: asStr(x.residual_impact, "LOW"),
    major_event_count: asNum(x.major_event_count, 0),
    broken_event_count: asNum(x.broken_event_count, 0),
    active_event_count: asNum(x.active_event_count, 0),
    exact_time_band: x.exact_time_band ?? null,
    primary_exact_event: x.primary_exact_event ? safeEvent(x.primary_exact_event) : null,
    alternative_exact_events: asArray(x.alternative_exact_events).map(safeEvent),
    events: asArray(x.events).map((ev) => ({
      ...safeEvent(ev),
      carryover_to_present: asStr(ev?.carryover_to_present, "NO")
    }))
  };
}

export function buildFutureOracleContract({
  input = {},
  birth_context = {},
  current_context = {},
  provider_adapter = {},
  intelligence_layer = {},
  astro_layer = {},
  timing_layer = {},
  micro_timing_layer = {},
  evidence_layer = {}
} = {}) {
  const safeInput = asObj(input);
  const safeBirth = asObj(birth_context);
  const safeCurrent = asObj(current_context);
  const safeProvider = asObj(provider_adapter);
  const safeIntel = asObj(intelligence_layer);
  const safeAstro = asObj(astro_layer);
  const safeTiming = asObj(timing_layer);
  const safeMicro = asObj(micro_timing_layer);
  const safeEvidence = asObj(evidence_layer);

  const rankedDomains = asArray(
    safeIntel.ranked_domains ??
      safeAstro.ranked_domains ??
      safeEvidence.ranked_domains
  ).map(safeDomain);

  const domainResults = asArray(
    safeAstro.domain_results ??
      safeIntel.domain_results ??
      safeEvidence.domain_results
  ).map(safeDomain);

  const exactDomainSummary = asArray(
    safeMicro.exact_domain_summary ??
      safeTiming.exact_domain_summary ??
      safeEvidence.exact_domain_summary
  ).map((d) => ({
    domain_key: asStr(d?.domain_key, "UNKNOWN"),
    domain_label: asStr(d?.domain_label, "UNKNOWN"),
    exact_time_band: d?.exact_time_band ?? null,
    primary_exact_event: d?.primary_exact_event ? safeEvent(d.primary_exact_event) : null,
    alternative_exact_events: asArray(d?.alternative_exact_events).map(safeEvent)
  }));

  const masterTimeline = asArray(
    safeEvidence.master_timeline ??
      safeTiming.master_timeline ??
      safeAstro.master_timeline
  ).map((e) => ({
    ...safeEvent(e),
    carryover_to_present: asStr(e?.carryover_to_present, "NO")
  }));

  const eventSummary = asObj(safeEvidence.event_summary);
  const validationBlock = asObj(safeEvidence.validation_block);
  const futureVerdict = asObj(
    safeEvidence.future_verdict ?? safeEvidence.forensic_verdict
  );
  const lokkothaSummary = asObj(safeEvidence.lokkotha_summary);
  const carryover = asObj(
    safeIntel.carryover ?? safeEvidence.current_carryover
  );

  const topRankedDomains = rankedDomains.slice(0, 12).map((d) => ({
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
    engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
    system_status: "OK",

    input_normalized: {
      name: asStr(safeInput.name, "UNKNOWN"),
      dob: safeInput.dob ?? null,
      tob: safeInput.tob ?? null,
      pob: safeInput.pob ?? null,
      latitude: asNum(safeInput.latitude, null),
      longitude: asNum(safeInput.longitude, null),
      timezone_offset: asStr(safeInput.timezone_offset, "+06:00"),
      question: asStr(safeInput.question, ""),
      facts: asStr(safeInput.facts, ""),
      current_datetime_iso: safeInput.current_datetime_iso ?? null
    },

    birth_context: {
      birth_datetime_iso: safeBirth.birth_datetime_iso ?? null,
      birthplace: safeBirth.birthplace ?? safeInput.pob ?? null,
      latitude: asNum(safeBirth.latitude, null),
      longitude: asNum(safeBirth.longitude, null),
      timezone_offset: asStr(
        safeBirth.timezone_offset,
        asStr(safeInput.timezone_offset, "+06:00")
      )
    },

    current_context: {
      event_datetime_iso: safeCurrent.event_datetime_iso ?? null,
      latitude: asNum(safeCurrent.latitude, null),
      longitude: asNum(safeCurrent.longitude, null),
      timezone_offset: asStr(
        safeCurrent.timezone_offset,
        asStr(safeInput.timezone_offset, "+06:00")
      )
    },

    provider_adapter: safeProvider,

    question_profile: asObj(safeIntel.question_profile),
    linked_domain_expansion: asArray(safeIntel.linked_domain_expansion),
    top_ranked_domains: topRankedDomains,
    domain_results: domainResults,
    exact_domain_summary: exactDomainSummary,

    event_summary: eventSummary,
    master_timeline: masterTimeline,

    current_carryover: {
      present_carryover_detected:
        Boolean(carryover.present_carryover_detected) ||
        asArray(carryover.carryover_domains).length > 0,
      carryover_domains: asArray(carryover.carryover_domains).map((x) => ({
        domain: asStr(x?.domain, "UNKNOWN"),
        residual_impact: asStr(x?.residual_impact, "LOW")
      }))
    },

    validation_block: validationBlock,
    future_verdict: futureVerdict,
    lokkotha_summary: lokkothaSummary,
    project_paste_block: asStr(safeEvidence.project_paste_block, "")
  };
}