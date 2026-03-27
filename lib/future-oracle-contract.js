// lib/future-oracle-contract.js

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export default function buildFutureOracleContract(payload = {}) {
  const safePayload = safeObject(payload);

  return {
    engine_status:
      safePayload.engine_status || "FUTURE_ORACLE_LAYERED_NANO_V1",
    system_status: safePayload.system_status || "OK",

    input_normalized: safeObject(safePayload.input_normalized),
    birth_context: safeObject(safePayload.birth_context),
    current_context: safeObject(safePayload.current_context),
    fact_anchor_block: safeObject(safePayload.fact_anchor_block),
    question_profile: safeObject(safePayload.question_profile),

    top_ranked_domains: safeArray(safePayload.top_ranked_domains),
    domain_results: safeArray(safePayload.domain_results),
    exact_domain_summary: safeArray(safePayload.exact_domain_summary),
    master_timeline: safeArray(safePayload.master_timeline),
    current_carryover: safeObject(safePayload.current_carryover),

    event_summary: safeObject(safePayload.event_summary),
    validation_block: safeObject(safePayload.validation_block),
    forensic_verdict: safeObject(safePayload.forensic_verdict),
    lokkotha_summary: safeObject(safePayload.lokkotha_summary),

    raw_payload: safeObject(safePayload.raw_payload),
    error_message:
      safePayload.error_message !== undefined
        ? safePayload.error_message
        : null,

    next_major_event:
      safePayload.next_major_event !== undefined
        ? safePayload.next_major_event
        : null,

    future_timeline: safeArray(safePayload.future_timeline),
    micro_timing_summary: safeArray(safePayload.micro_timing_summary),

    project_paste_block:
      safePayload.project_paste_block || ""
  };
}