// api/future-oracle.js

import { buildChartCore, buildBirthContext, buildCurrentContext } from "../lib/chart-core.js";
import { adaptFutureOracleInput } from "../lib/provider-adapter.js";
import { validateFutureOracleInput } from "../lib/future-oracle-contract.js";
import { runFutureAstroLayer } from "../lib/future-layer-astro.js";
import { runFutureIntelligenceLayer } from "../lib/future-layer-intelligence.js";
import { runFutureTimingLayer } from "../lib/future-layer-timing.js";
import { runFutureMicroTimingLayer } from "../lib/future-layer-micro-timing.js";
import { runEvidenceLayer } from "../lib/future-layer-evidence.js";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const safeString = (v, f = "") => (v == null ? f : String(v));

function mergeQueryToBody(req) {
  if (req.method === "GET") {
    return {
      ...req.query,
      // convert query params → usable types
      latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
      longitude: req.query.longitude ? Number(req.query.longitude) : undefined
    };
  }
  return safeObject(req.body);
}

function extractPrimary(domainResults = []) {
  return safeArray(domainResults)
    .map((d) => ({
      ...d,
      primary_exact_event: d.primary_exact_event || null
    }))
    .filter((d) => d.primary_exact_event)
    .sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0))[0] || null;
}

function buildTimeline(domainResults = []) {
  return safeArray(domainResults).flatMap((d) => {
    const primary = d.primary_exact_event
      ? [{
          domain: d.domain_label,
          event: d.primary_exact_event.event_type,
          exact_datetime_iso: d.primary_exact_event.exact_datetime_iso
        }]
      : [];

    const alt = safeArray(d.alternative_exact_events).map((e) => ({
      domain: d.domain_label,
      event: e.event_type,
      exact_datetime_iso: e.exact_datetime_iso
    }));

    return [...primary, ...alt];
  }).sort((a,b)=> new Date(a.exact_datetime_iso) - new Date(b.exact_datetime_iso));
}

export default async function handler(req, res) {
  try {
    // ✅ GET + POST unified
    const raw = mergeQueryToBody(req);

    // ✅ allow name-only
    const adapted = adaptFutureOracleInput(raw);
    const validation = validateFutureOracleInput(adapted);

    const input = safeObject(validation.normalized_input || adapted);

    // fallback minimal mode
    if (!input.name && !input.dob) {
      return res.status(200).json({
        engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
        system_status: "FALLBACK",
        message: "Insufficient data — minimal scan only",
        suggestion: "Provide at least name or dob for deeper scan"
      });
    }

    const birth = buildBirthContext(input);
    const current = buildCurrentContext(input);

    const chart = buildChartCore({
      natal_planets: safeArray(input.natal_planets),
      transit_planets: safeArray(input.transit_planets),
      ascendant_degree: input.ascendant_degree ?? 0
    });

    // STEP 1 astro
    const astro = runFutureAstroLayer({
      transit_house_mapping: safeArray(chart.transit_house_mapping),
      aspect_table: safeArray(chart.aspect_table),
      question_profile: { primary_domain: "GENERAL" },
      linked_domain_expansion: []
    });

    // STEP 2 intelligence
    const intelligence = runFutureIntelligenceLayer({
      domain_results: safeArray(astro.domain_results),
      top_ranked_domains: safeArray(astro.top_ranked_domains),
      question_profile: {
        raw_question: safeString(input.question),
        primary_domain: safeString(input.primary_domain || "GENERAL")
      }
    });

    // STEP 3 timing
    const timing = runFutureTimingLayer({
      domain_results: safeArray(intelligence.domain_results),
      current_context: current,
      input
    });

    // STEP 4 micro timing
    const micro = runFutureMicroTimingLayer({
      domain_results: safeArray(timing.domain_results)
    });

    // timeline
    const timeline = buildTimeline(micro.domain_results);

    const evidence = runEvidenceLayer({
      input,
      facts: safeObject(input.facts),
      question_profile: {
        raw_question: safeString(input.question),
        primary_domain: safeString(input.primary_domain || "GENERAL")
      },
      domain_results: safeArray(micro.domain_results),
      ranked_domains: safeArray(intelligence.top_ranked_domains),
      master_timeline: timeline,
      carryover: null
    });

    const primary = extractPrimary(micro.domain_results);

    return res.status(200).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      mode:
        input.dob && input.tob ? "PRECISION_FULL" :
        input.name ? "ADAPTIVE_PARTIAL" :
        "MINIMAL",

      primary_future_event: primary,
      micro_timing_summary: micro.micro_timing_summary,

      final_verdict: primary
        ? `Event locked: ${primary.primary_exact_event.event_type} at ${primary.primary_exact_event.exact_datetime_iso}`
        : "No strong event lock",

      lokkotha:
        primary
          ? "ক্ষণ পাকলে ঘটনা নামবেই।"
          : "সময় না এলে ফল ধরে না।",

      timeline,
      event_summary: evidence.event_summary
    });

  } catch (err) {
    return res.status(500).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "ERROR",
      error: err.message
    });
  }
}