// api/future-oracle.js

import { buildChartCore, buildBirthContext, buildCurrentContext } from "../lib/chart-core.js";
import { adaptFutureOracleInput } from "../lib/provider-adapter.js";
import { validateFutureOracleInput } from "../lib/future-oracle-contract.js";
import { runFutureAstroLayer } from "../lib/future-layer-astro.js";
import { runFutureIntelligenceLayer } from "../lib/future-layer-intelligence.js";
import { runFutureTimingLayer } from "../lib/future-layer-timing.js";
import { runFutureMicroTimingLayer } from "../lib/future-layer-micro-timing.js";
import { runEvidenceLayer } from "../lib/future-layer-evidence.js";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeObject(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function safeString(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function buildErrorPayload(message, extra = {}) {
  return {
    engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
    system_status: "ERROR",
    error: message,
    ...extra
  };
}

function extractPrimaryFutureEvent(domainResults = []) {
  const rows = safeArray(domainResults);

  const primaryCandidates = rows
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      rank_score: Number(d.rank_score || 0),
      primary_exact_event: d.primary_exact_event || null
    }))
    .filter((d) => d.primary_exact_event)
    .sort((a, b) => b.rank_score - a.rank_score);

  return primaryCandidates[0] || null;
}

function buildMasterTimeline(domainResults = []) {
  return safeArray(domainResults)
    .flatMap((domain) => {
      const primary = domain.primary_exact_event
        ? [
            {
              domain: domain.domain_label,
              domain_key: domain.domain_key,
              event_type: domain.primary_exact_event.event_type,
              event_number: domain.primary_exact_event.event_number,
              status: domain.primary_exact_event.status,
              importance: domain.primary_exact_event.importance,
              trigger_phase: domain.primary_exact_event.trigger_phase,
              evidence_strength: domain.primary_exact_event.evidence_strength,
              date_marker:
                domain.primary_exact_event.exact_date ||
                domain.primary_exact_event.date_marker ||
                null,
              exact_datetime_iso: domain.primary_exact_event.exact_datetime_iso || null,
              carryover_to_present:
                safeString(domain.present_carryover, "NO").toUpperCase() === "YES"
                  ? "YES"
                  : "NO"
            }
          ]
        : [];

      const alternatives = safeArray(domain.alternative_exact_events).map((event) => ({
        domain: domain.domain_label,
        domain_key: domain.domain_key,
        event_type: event.event_type,
        event_number: event.event_number,
        status: event.status,
        importance: event.importance,
        trigger_phase: event.trigger_phase,
        evidence_strength: event.evidence_strength,
        date_marker: event.exact_date || event.date_marker || null,
        exact_datetime_iso: event.exact_datetime_iso || null,
        carryover_to_present:
          safeString(domain.present_carryover, "NO").toUpperCase() === "YES"
            ? "YES"
            : "NO"
      }));

      return [...primary, ...alternatives];
    })
    .sort((a, b) => {
      const ad = a.exact_datetime_iso ? new Date(a.exact_datetime_iso).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.exact_datetime_iso ? new Date(b.exact_datetime_iso).getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });
}

function buildFinalVerdict(primaryFutureEvent, questionProfile) {
  if (!primaryFutureEvent || !primaryFutureEvent.primary_exact_event) {
    return {
      outcome_existence: "NO STRONG EVENT LOCK",
      final_verdict_text:
        "Current cycle-e strong future event lock milche na; scanner aro stronger trigger dorkar.",
      lokkotha_line:
        "মেঘ আছে, কিন্তু বজ্র নামার দাগ এখনও শক্ত নয়।"
    };
  }

  const event = primaryFutureEvent.primary_exact_event;
  const domain = primaryFutureEvent.domain_label;
  const primaryDomain = safeString(questionProfile?.primary_domain, "GENERAL").toUpperCase();

  return {
    outcome_existence: "WILL HAPPEN",
    final_verdict_text:
      `${primaryDomain} future scan-e strongest event holo ${event.event_type} under ${domain}. ` +
      `Locked date ${event.exact_date}, locked time ${event.exact_time_utc || event.exact_time_band}.`,
    lokkotha_line:
      "যে ক্ষণ পাকে, সে ক্ষণই নামে; আগে ছায়া আসে, পরে ঘটনা নামে।"
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json(
        buildErrorPayload("Method not allowed. Use POST.")
      );
    }

    const rawBody = safeObject(req.body);

    const adapted = adaptFutureOracleInput(rawBody);
    const validation = validateFutureOracleInput(adapted);

    if (!validation.valid) {
      return res.status(400).json(
        buildErrorPayload("Input validation failed.", {
          validation_errors: safeArray(validation.errors)
        })
      );
    }

    const input_normalized = safeObject(validation.normalized_input || adapted);

    const birth_context = buildBirthContext(input_normalized);
    const current_context = buildCurrentContext(input_normalized);

    const chart_core = buildChartCore({
      natal_planets: safeArray(input_normalized.natal_planets),
      transit_planets: safeArray(input_normalized.transit_planets),
      ascendant_degree: input_normalized.ascendant_degree ?? null
    });

    const question_profile_seed = {
      primary_domain: "GENERAL"
    };

    const astro_layer = runFutureAstroLayer({
      transit_house_mapping: safeArray(chart_core.transit_house_mapping),
      aspect_table: safeArray(chart_core.aspect_table),
      question_profile: safeObject(question_profile_seed),
      linked_domain_expansion: []
    });

    const intelligence_layer = runFutureIntelligenceLayer({
      domain_results: safeArray(astro_layer.domain_results),
      top_ranked_domains: safeArray(astro_layer.top_ranked_domains),
      question_profile: safeObject({
        raw_question: safeString(input_normalized.question, ""),
        primary_domain: safeString(
          input_normalized.primary_domain ||
            validation.question_profile?.primary_domain ||
            question_profile_seed.primary_domain,
          "GENERAL"
        )
      })
    });

    const timing_layer = runFutureTimingLayer({
      domain_results: safeArray(intelligence_layer.domain_results),
      current_context,
      input: input_normalized
    });

    const micro_timing_layer = runFutureMicroTimingLayer({
      domain_results: safeArray(timing_layer.domain_results)
    });

    const master_timeline = buildMasterTimeline(
      safeArray(micro_timing_layer.domain_results)
    );

    const evidence_layer = runEvidenceLayer({
      input: input_normalized,
      facts: safeObject(input_normalized.facts || {}),
      question_profile: safeObject({
        raw_question: safeString(input_normalized.question, ""),
        primary_domain: safeString(
          input_normalized.primary_domain ||
            validation.question_profile?.primary_domain ||
            "GENERAL",
          "GENERAL"
        )
      }),
      domain_results: safeArray(micro_timing_layer.domain_results),
      ranked_domains: safeArray(intelligence_layer.top_ranked_domains),
      master_timeline,
      carryover: null
    });

    const primary_future_event = extractPrimaryFutureEvent(
      safeArray(micro_timing_layer.domain_results)
    );

    const final_verdict = buildFinalVerdict(
      primary_future_event,
      safeObject({
        raw_question: safeString(input_normalized.question, ""),
        primary_domain: safeString(
          input_normalized.primary_domain ||
            validation.question_profile?.primary_domain ||
            "GENERAL",
          "GENERAL"
        )
      })
    );

    return res.status(200).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      input_normalized,
      birth_context,
      current_context,

      question_profile: {
        raw_question: safeString(input_normalized.question, ""),
        primary_domain: safeString(
          input_normalized.primary_domain ||
            validation.question_profile?.primary_domain ||
            "GENERAL",
          "GENERAL"
        )
      },

      evidence_normalized: safeObject(chart_core.evidence_normalized),

      top_ranked_domains: safeArray(evidence_layer.top_ranked_domains),
      domain_results: safeArray(micro_timing_layer.domain_results),
      exact_domain_summary: safeArray(evidence_layer.exact_domain_summary),
      micro_timing_summary: safeArray(micro_timing_layer.micro_timing_summary),
      event_summary: safeObject(evidence_layer.event_summary),
      master_timeline: safeArray(evidence_layer.master_timeline),
      current_carryover: safeObject(evidence_layer.current_carryover),
      validation_block: safeObject(evidence_layer.validation_block),
      forensic_verdict: safeObject(evidence_layer.forensic_verdict),
      lokkotha_summary: safeObject(evidence_layer.lokkotha_summary),

      primary_future_event,
      final_verdict,

      project_paste_block: safeString(evidence_layer.project_paste_block, "")
    });
  } catch (error) {
    return res.status(500).json(
      buildErrorPayload("Future oracle runtime failure.", {
        runtime_message: safeString(error?.message, "Unknown runtime error"),
        runtime_stack: process.env.NODE_ENV === "development"
          ? safeString(error?.stack, "")
          : undefined
      })
    );
  }
}