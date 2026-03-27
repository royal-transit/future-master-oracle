// api/future-oracle.js

import buildProviderAdapter from "../lib/provider-adapter.js";
import runFutureAstroLayer from "../lib/future-layer-astro.js";
import runFutureTimingLayer from "../lib/future-layer-timing.js";
import runFutureMicroTimingLayer from "../lib/future-layer-micro-timing.js";
import runFutureIntelligenceLayer from "../lib/future-layer-intelligence.js";
import runFutureEvidenceLayer from "../lib/future-layer-evidence.js";
import buildFutureOracleContract from "../lib/future-oracle-contract.js";

function safeObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function normalizeRequestInput(req) {
  if (req.method === "GET") {
    return {
      ...req.query,
      latitude:
        req.query.latitude !== undefined && req.query.latitude !== ""
          ? Number(req.query.latitude)
          : undefined,
      longitude:
        req.query.longitude !== undefined && req.query.longitude !== ""
          ? Number(req.query.longitude)
          : undefined
    };
  }

  return safeObject(req.body);
}

export default async function handler(req, res) {
  try {
    const rawPayload = normalizeRequestInput(req);

    const provider = buildProviderAdapter(rawPayload);

    const input_normalized = provider.input_normalized || {};
    const birth_context = provider.birth_context || {};
    const current_context = provider.current_context || {};
    const fact_anchor_block = provider.fact_anchor_block || {};
    const question_profile = provider.question_profile || {};

    const astro = runFutureAstroLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile,
      birth_context,
      current_context
    });

    const timing = runFutureTimingLayer({
      input: input_normalized,
      question_profile,
      domain_results: astro.domain_results || [],
      current_context
    });

    const micro = runFutureMicroTimingLayer({
      domain_results: astro.domain_results || [],
      future_candidates: timing.future_candidates || [],
      next_major_event: timing.next_major_event || null
    });

    const intelligence = runFutureIntelligenceLayer({
      domain_results: micro.domain_results || [],
      top_ranked_domains: astro.top_ranked_domains || [],
      question_profile
    });

    const evidence = runFutureEvidenceLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile: intelligence.question_profile || question_profile,
      ranked_domains: intelligence.ranked_domains || [],
      next_major_event: micro.next_major_event || null
    });

    const finalJson = buildFutureOracleContract({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      input_normalized,
      birth_context,
      current_context,
      fact_anchor_block,
      question_profile: intelligence.question_profile || question_profile,

      astro_layer: {
        domain_results: intelligence.domain_results || micro.domain_results || [],
        top_ranked_domains: intelligence.top_ranked_domains || astro.top_ranked_domains || []
      },

      timing_layer: {
        master_timeline: micro.future_timeline || timing.future_timeline || []
      },

      micro_timing_layer: {
        exact_domain_summary: micro.exact_domain_summary || [],
        micro_timing_summary: micro.micro_timing_summary || []
      },

      intelligence_layer: {
        current_carryover: intelligence.current_carryover || {
          present_carryover_detected: false,
          carryover_domains: []
        }
      },

      evidence_layer: evidence,
      raw_payload: rawPayload
    });

    // extra live keys for easy Safari checking
    finalJson.next_major_event = micro.next_major_event || null;
    finalJson.future_timeline = micro.future_timeline || timing.future_timeline || [];
    finalJson.micro_timing_summary = micro.micro_timing_summary || [];
    finalJson.project_paste_block =
      evidence.project_paste_block || finalJson.project_paste_block || "";

    return res.status(200).json(finalJson);
  } catch (error) {
    return res.status(500).json(
      buildFutureOracleContract({
        engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
        system_status: "ERROR",
        error_message: error?.message || "UNKNOWN_ERROR",
        raw_payload: normalizeRequestInput(req)
      })
    );
  }
}