// lib/future-oracle-contract.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default function buildFutureOracleContract(payload = {}) {
  const p = safeObject(payload);

  return {
    engine_status: p.engine_status || "FUTURE_ORACLE_LAYERED_NANO_V1",
    system_status: p.system_status || "OK",

    input_normalized: safeObject(p.input_normalized),
    birth_context: safeObject(p.birth_context),
    current_context: safeObject(p.current_context),
    fact_anchor_block: safeObject(p.fact_anchor_block),
    question_profile: safeObject(p.question_profile),

    top_ranked_domains: safeArray(p.top_ranked_domains),
    domain_results: safeArray(p.domain_results),
    exact_domain_summary: safeArray(p.exact_domain_summary),
    master_timeline: safeArray(p.master_timeline),
    current_carryover: safeObject(p.current_carryover),

    event_summary: safeObject(p.event_summary),
    validation_block: safeObject(p.validation_block),
    forensic_verdict: safeObject(p.forensic_verdict),
    lokkotha_summary: safeObject(p.lokkotha_summary),

    raw_payload: safeObject(p.raw_payload),
    error_message: p.error_message !== undefined ? p.error_message : null,

    next_major_event: p.next_major_event !== undefined ? p.next_major_event : null,
    future_timeline: safeArray(p.future_timeline),
    micro_timing_summary: safeArray(p.micro_timing_summary),

    project_paste_block: p.project_paste_block || ""
  };
}