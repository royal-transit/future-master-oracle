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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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
  const safeInput = safeObject(input);

  return {
    raw_question: safeProfile.raw_question || safeInput.question || "",
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

function createStableSeed(payload) {
  const parts = [
    String(payload?.name || "").trim().toLowerCase(),
    String(payload?.dob || "").trim().toLowerCase(),
    String(payload?.tob || "").trim().toLowerCase(),
    String(payload?.pob || "").trim().toLowerCase(),
    String(payload?.question || "").trim().toLowerCase(),
    String(payload?.facts || "").trim().toLowerCase(),
    String(payload?.latitude ?? ""),
    String(payload?.longitude ?? ""),
    String(payload?.timezone_offset || "").trim().toLowerCase()
  ];

  const joined = parts.join("|");
  let hash = 2166136261;

  for (let i = 0; i < joined.length; i += 1) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
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

    const stable_seed = createStableSeed({
      ...input_normalized,
      ...birth_context,
      ...question_profile
    });

    const astro = runFutureAstroLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile,
      birth_context,
      current_context,
      stable_seed
    }) || {};

    const astro_domain_results = safeArray(astro.domain_results);
    const astro_top_ranked_domains = safeArray(astro.top_ranked_domains);

    const timing = runFutureTimingLayer({
      input: input_normalized,
      question_profile,
      domain_results: astro_domain_results,
      current_context,
      stable_seed
    }) || {};

    const timing_future_timeline = safeArray(timing.future_timeline);
    const timing_future_candidates = safeArray(timing.future_candidates);
    const timing_next_major_event = timing.next_major_event || null;

    const micro = runFutureMicroTimingLayer({
      domain_results: astro_domain_results,
      future_candidates: timing_future_candidates,
      next_major_event: timing_next_major_event,
      stable_seed
    }) || {};

    const micro_domain_results =
      safeArray(micro.domain_results).length > 0
        ? safeArray(micro.domain_results)
        : astro_domain_results;

    const merged_future_timeline =
      safeArray(micro.future_timeline).length > 0
        ? safeArray(micro.future_timeline)
        : timing_future_timeline;

    const merged_next_major_event =
      micro.next_major_event || timing_next_major_event || null;

    const intelligence = runFutureIntelligenceLayer({
      domain_results: micro_domain_results,
      top_ranked_domains: astro_top_ranked_domains,
      question_profile,
      future_timeline: merged_future_timeline,
      stable_seed
    }) || {};

    const ranked_domains =
      safeArray(intelligence.ranked_domains).length > 0
        ? safeArray(intelligence.ranked_domains)
        : safeArray(intelligence.top_ranked_domains).length > 0
          ? safeArray(intelligence.top_ranked_domains)
          : astro_top_ranked_domains;

    const resolved_question_profile = ensureQuestionProfile(
      intelligence.question_profile || question_profile,
      input_normalized
    );

    const evidence = runFutureEvidenceLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile: resolved_question_profile,
      ranked_domains,
      next_major_event: merged_next_major_event,
      future_timeline: merged_future_timeline,
      stable_seed
    }) || {};

    const finalJson = buildFutureOracleContract({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      input_normalized,
      birth_context,
      current_context,
      fact_anchor_block,
      question_profile: {
        ...resolved_question_profile,
        primary_domain:
          evidence.resolved_primary_domain ||
          intelligence.primary_domain ||
          resolved_question_profile.primary_domain ||
          "GENERAL"
      },

      top_ranked_domains:
        safeArray(intelligence.top_ranked_domains).length > 0
          ? safeArray(intelligence.top_ranked_domains)
          : astro_top_ranked_domains,

      domain_results:
        safeArray(intelligence.domain_results).length > 0
          ? safeArray(intelligence.domain_results)
          : micro_domain_results,

      exact_domain_summary: safeArray(micro.exact_domain_summary),
      master_timeline: merged_future_timeline,
      current_carryover: safeObject(intelligence.current_carryover),

      event_summary: safeObject(evidence.event_summary),
      validation_block: safeObject(evidence.validation_block),
      forensic_verdict: safeObject(evidence.forensic_verdict),
      lokkotha_summary: safeObject(evidence.lokkotha_summary),

      raw_payload,
      next_major_event: merged_next_major_event,
      future_timeline: merged_future_timeline,
      micro_timing_summary: safeArray(micro.micro_timing_summary),
      project_paste_block: evidence.project_paste_block || ""
    }) || {};

    finalJson.stability = {
      stable_seed,
      scan_mode: "DETERMINISTIC_LOCK",
      same_input_same_output: true
    };

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
        next_major_event: null,
        future_timeline: [],
        micro_timing_summary: [],
        project_paste_block: "",
        error_message: error?.message || "UNKNOWN_ERROR"
      })
    );
  }
}