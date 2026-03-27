// api/future-oracle.js

import buildProviderAdapter from "../lib/provider-adapter.js";
import runFutureAstroLayer from "../lib/future-layer-astro.js";
import runFutureTimingLayer from "../lib/future-layer-timing.js";
import runFutureMicroTimingLayer from "../lib/future-layer-micro-timing.js";
import runFutureIntelligenceLayer from "../lib/future-layer-intelligence.js";
import runFutureEvidenceLayer from "../lib/future-layer-evidence.js";
import buildFutureOracleContract from "../lib/future-oracle-contract.js";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNumberOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeRequestInput(req) {
  if (req.method === "GET") {
    return {
      ...req.query,
      latitude: toNumberOrUndefined(req.query.latitude),
      longitude: toNumberOrUndefined(req.query.longitude)
    };
  }

  const body = safeObject(req.body);

  return {
    ...body,
    latitude: toNumberOrUndefined(body.latitude),
    longitude: toNumberOrUndefined(body.longitude)
  };
}

function ensureQuestionProfile(profile, input) {
  const safeProfile = safeObject(profile);

  return {
    raw_question: safeProfile.raw_question || input?.question || "",
    asks_count: Boolean(safeProfile.asks_count),
    asks_timing:
      safeProfile.asks_timing !== undefined
        ? Boolean(safeProfile.asks_timing)
        : true,
    asks_status: Boolean(safeProfile.asks_status),
    asks_general:
      safeProfile.asks_general !== undefined
        ? Boolean(safeProfile.asks_general)
        : false,
    primary_domain: safeProfile.primary_domain || "GENERAL"
  };
}

export default async function handler(req, res) {
  const raw_payload = normalizeRequestInput(req);

  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "METHOD_NOT_ALLOWED"
    });
  }

  try {
    const provider = buildProviderAdapter(raw_payload) || {};

    const input_normalized = safeObject(provider.input_normalized);
    const birth_context = safeObject(provider.birth_context);
    const current_context = safeObject(provider.current_context);
    const fact_anchor_block = safeObject(provider.fact_anchor_block);
    const question_profile = ensureQuestionProfile(
      provider.question_profile,
      input_normalized
    );

    const astro = runFutureAstroLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile,
      birth_context,
      current_context
    }) || {};

    const astro_domain_results = Array.isArray(astro.domain_results)
      ? astro.domain_results
      : [];

    const astro_top_ranked_domains = Array.isArray(astro.top_ranked_domains)
      ? astro.top_ranked_domains
      : [];

    const timing = runFutureTimingLayer({
      input: input_normalized,
      question_profile,
      domain_results: astro_domain_results,
      current_context
    }) || {};

    const micro = runFutureMicroTimingLayer({
      domain_results: astro_domain_results,
      future_candidates: Array.isArray(timing.future_candidates)
        ? timing.future_candidates
        : [],
      next_major_event: timing.next_major_event || null
    }) || {};

    const micro_domain_results = Array.isArray(micro.domain_results)
      ? micro.domain_results
      : astro_domain_results;

    const intelligence = runFutureIntelligenceLayer({
      domain_results: micro_domain_results,
      top_ranked_domains: astro_top_ranked_domains,
      question_profile
    }) || {};

    const ranked_domains = Array.isArray(intelligence.ranked_domains)
      ? intelligence.ranked_domains
      : Array.isArray(intelligence.top_ranked_domains)
        ? intelligence.top_ranked_domains
        : astro_top_ranked_domains;

    const evidence = runFutureEvidenceLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile: ensureQuestionProfile(
        intelligence.question_profile || question_profile,
        input_normalized
      ),
      ranked_domains,
      next_major_event: micro.next_major_event || timing.next_major_event || null
    }) || {};

    const finalJson = buildFutureOracleContract({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      input_normalized,
      birth_context,
      current_context,
      fact_anchor_block,
      question_profile: ensureQuestionProfile(
        intelligence.question_profile || question_profile,
        input_normalized
      ),

      top_ranked_domains: Array.isArray(intelligence.top_ranked_domains)
        ? intelligence.top_ranked_domains
        : astro_top_ranked_domains,

      domain_results: Array.isArray(intelligence.domain_results)
        ? intelligence.domain_results
        : micro_domain_results,

      exact_domain_summary: Array.isArray(micro.exact_domain_summary)
        ? micro.exact_domain_summary
        : [], 

      master_timeline: Array.isArray(micro.future_timeline)
        ? micro.future_timeline
        : Array.isArray(timing.future_timeline)
          ? timing.future_timeline
          : [],

      current_carryover: safeObject(intelligence.current_carryover),
      event_summary: safeObject(evidence.event_summary),
      validation_block: safeObject(evidence.validation_block),
      forensic_verdict: safeObject(evidence.forensic_verdict),
      lokkotha_summary: safeObject(evidence.lokkotha_summary),
      project_paste_block: evidence.project_paste_block || "",
      raw_payload
    }) || {};

    finalJson.next_major_event =
      micro.next_major_event || timing.next_major_event || null;

    finalJson.future_timeline = Array.isArray(micro.future_timeline)
      ? micro.future_timeline
      : Array.isArray(timing.future_timeline)
        ? timing.future_timeline
        : [];

    finalJson.micro_timing_summary = Array.isArray(micro.micro_timing_summary)
      ? micro.micro_timing_summary
      : [];

    return res.status(200).json(finalJson);
  } catch (error) {
    return res.status(500).json(
      buildFutureOracleContract({
        engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
        system_status: "ERROR",
        input_normalized: {},
        birth_context: {},
        current_context: {},
        fact_anchor_block: {},
        question_profile: {},
        top_ranked_domains: [],
        domain_results: [],
        exact_domain_summary: [],
        master_timeline: [],
        current_carryover: {},
        event_summary: {},
        validation_block: {},
        forensic_verdict: {},
        lokkotha_summary: {},
        raw_payload,
        error_message: error?.message || "UNKNOWN_ERROR"
      })
    );
  }
}