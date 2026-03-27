// lib/future-oracle-contract.js

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

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildFutureOracleContract({
  engine_status = "FUTURE_ORACLE_LAYERED_NANO_V1",
  system_status = "OK",
  input_normalized = {},
  birth_context = {},
  current_context = {},
  fact_anchor_block = {},
  question_profile = {},
  astro_layer = {},
  timing_layer = {},
  micro_timing_layer = {},
  intelligence_layer = {},
  evidence_layer = {},
  raw_payload = null,
  error_message = null
} = {}) {
  const safeAstro = safeObject(astro_layer);
  const safeTiming = safeObject(timing_layer);
  const safeMicro = safeObject(micro_timing_layer);
  const safeIntel = safeObject(intelligence_layer);
  const safeEvidence = safeObject(evidence_layer);

  const domain_results = safeArray(safeAstro.domain_results);
  const ranked_domains =
    safeArray(safeAstro.top_ranked_domains).length > 0
      ? safeArray(safeAstro.top_ranked_domains)
      : domain_results
          .slice()
          .sort((a, b) => safeNumber(b.rank_score) - safeNumber(a.rank_score))
          .map((d) => ({
            domain_key: safeString(d.domain_key, "UNKNOWN"),
            domain_label: safeString(d.domain_label, "Unknown Domain"),
            rank_score: safeNumber(d.rank_score, 0),
            normalized_score: safeNumber(d.normalized_score, 0),
            density: safeString(d.density, "LOW"),
            residual_impact: safeString(d.residual_impact, "LOW"),
            major_event_count: safeNumber(d.major_event_count, 0),
            broken_event_count: safeNumber(d.broken_event_count, 0),
            active_event_count: safeNumber(d.active_event_count, 0)
          }));

  const master_timeline =
    safeArray(safeTiming.master_timeline).length > 0
      ? safeArray(safeTiming.master_timeline)
      : domain_results.flatMap((domain) =>
          safeArray(domain.events).map((event) => ({
            domain: safeString(domain.domain_label, "Unknown Domain"),
            domain_key: safeString(domain.domain_key, "UNKNOWN"),
            event_type: safeString(event.event_type, "future event"),
            event_number: safeNumber(event.event_number, 0),
            status: safeString(event.status, "PENDING"),
            importance: safeString(event.importance, "MAJOR"),
            trigger_phase: safeString(event.trigger_phase, ""),
            evidence_strength: safeString(event.evidence_strength, "moderate"),
            date_marker:
              event.date_marker ??
              event.exact_year ??
              event.exact_date ??
              null,
            carryover_to_present: safeString(event.carryover_to_present, "NO")
          }))
        );

  const exact_domain_summary =
    safeArray(safeMicro.exact_domain_summary).length > 0
      ? safeArray(safeMicro.exact_domain_summary)
      : domain_results
          .filter((d) => d.exact_time_band || d.primary_exact_event)
          .map((d) => ({
            domain_key: safeString(d.domain_key, "UNKNOWN"),
            domain_label: safeString(d.domain_label, "Unknown Domain"),
            exact_time_band: d.exact_time_band ?? null,
            primary_exact_event: d.primary_exact_event ?? null,
            alternative_exact_events: safeArray(d.alternative_exact_events)
          }));

  const top_ranked_domains = ranked_domains.slice(0, 12);

  const current_carryover = safeObject(safeIntel.current_carryover);
  const event_summary = safeObject(safeEvidence.event_summary);
  const validation_block = safeObject(safeEvidence.validation_block);
  const forensic_verdict = safeObject(safeEvidence.forensic_verdict);
  const lokkotha_summary = safeObject(safeEvidence.lokkotha_summary);

  return {
    engine_status,
    system_status,

    input_normalized: clone(safeObject(input_normalized)),
    birth_context: clone(safeObject(birth_context)),
    current_context: clone(safeObject(current_context)),
    fact_anchor_block: clone(safeObject(fact_anchor_block)),
    question_profile: clone(safeObject(question_profile)),

    top_ranked_domains: clone(top_ranked_domains),
    domain_results: clone(domain_results),
    exact_domain_summary: clone(exact_domain_summary),
    master_timeline: clone(master_timeline),

    current_carryover: clone(current_carryover),
    event_summary: clone(event_summary),
    validation_block: clone(validation_block),
    forensic_verdict: clone(forensic_verdict),
    lokkotha_summary: clone(lokkotha_summary),

    raw_payload: raw_payload ? clone(raw_payload) : null,
    error_message: error_message ? safeString(error_message) : null
  };
}

export { buildFutureOracleContract };
export default buildFutureOracleContract;