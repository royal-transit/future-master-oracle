// api/oracle.js

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";

import {
  FUTURE_ORACLE_VERSION,
  FUTURE_OUTPUT_REQUIREMENTS
} from "../lib/future-oracle-contract.js";

import { runFutureIntelligenceLayer } from "../lib/future-layer-intelligence.js";
import { runFutureAstroLayer } from "../lib/future-layer-astro.js";
import { runFutureTimingLayer } from "../lib/future-layer-timing.js";
import { runFutureEvidenceLayer } from "../lib/future-layer-evidence.js";
import { runFutureMicroTimingLayer } from "../lib/future-layer-micro-timing.js";

/* =====================================
   BASIC HELPERS
===================================== */

const str = (v) => (v == null ? "" : String(v).trim());

const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeFormat = (v) => {
  const x = str(v).toLowerCase();
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
};

function extractAllYears(text) {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function wordToNum(w) {
  return ({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    ek: 1,
    ekta: 1,
    dui: 2,
    duita: 2,
    tin: 3,
    tinta: 3,
    char: 4,
    charta: 4,
    pach: 5,
    pachta: 5
  })[(w || "").toLowerCase()] ?? null;
}

function parseFlexibleCountToken(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return wordToNum(token);
}

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

/* =====================================
   FACT PARSER
===================================== */

function extractMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i
  ];

  for (const rx of patterns) {
    const m = text.match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }

  return null;
}

function extractBrokenMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i
  ];

  for (const rx of patterns) {
    const m = text.match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }

  return null;
}

function extractYearNearKeyword(text, keywords) {
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx === -1) continue;

    const tail = text.slice(idx);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }

  return null;
}

function parseFactAnchors(facts, question) {
  const text = `${facts || ""} ${question || ""}`.toLowerCase();
  const allYears = extractAllYears(text);

  let marriageCount = extractMarriageCount(text);
  let brokenMarriageCount = extractBrokenMarriageCount(text);

  let foreignEntryYear = extractYearNearKeyword(text, [
    "uk",
    "foreign",
    "abroad",
    "came",
    "arrived",
    "entry",
    "moved"
  ]);

  let settlementYear = extractYearNearKeyword(text, [
    "settlement",
    "settled",
    "stable",
    "stabil",
    "base"
  ]);

  if (
    foreignEntryYear == null &&
    hasAny(text, ["uk", "foreign", "abroad", "came", "arrived", "entry", "moved"]) &&
    allYears.length
  ) {
    foreignEntryYear = allYears[0];
  }

  if (
    settlementYear == null &&
    hasAny(text, ["settlement", "settled", "stable", "stabil", "base"]) &&
    allYears.length >= 2
  ) {
    settlementYear = allYears[allYears.length - 1];
  }

  if (
    settlementYear != null &&
    foreignEntryYear != null &&
    settlementYear === foreignEntryYear &&
    allYears.length >= 2
  ) {
    settlementYear = allYears[allYears.length - 1];
  }

  return {
    provided: !!(facts || question),
    raw_text: text,
    marriage_count_claim: marriageCount,
    broken_marriage_claim: brokenMarriageCount,
    foreign_entry_year_claim: foreignEntryYear,
    settlement_year_claim: settlementYear,
    all_years: allYears
  };
}

/* =====================================
   SHAPE / OUTPUT HELPERS
===================================== */

function minifyDomain(d) {
  return {
    domain_key: d.domain_key,
    domain_label: d.domain_label,
    rank_score: d.rank_score,
    normalized_score: d.normalized_score,
    density: d.density,
    residual_impact: d.residual_impact,
    future_strength: d.future_strength,
    confidence: d.confidence
  };
}

function ensureRequirementShape(payload) {
  const missing = FUTURE_OUTPUT_REQUIREMENTS.must_include.filter(
    (k) => !(k in payload)
  );

  return {
    ok: missing.length === 0,
    missing
  };
}

/* =====================================
   MAIN HANDLER
===================================== */

export default async function handler(req, res) {
  try {
    const q = req.query || {};

    const input = {
      name: str(q.name),
      dob: str(q.dob),
      tob: str(q.tob),
      pob: str(q.pob),
      latitude: toNum(q.latitude),
      longitude: toNum(q.longitude),
      timezone_offset: str(q.timezone_offset || "+06:00"),
      question: str(q.question),
      facts: str(q.facts),
      format: normalizeFormat(q.format),
      current_datetime_iso: str(q.current_datetime_iso)
    };

    /* ---------------------------------
       STEP 0: CORE CHART ENGINE
    --------------------------------- */
    const core = await buildChartCore(input, astroProvider);

    if (core.system_status !== "OK") {
      return res.status(400).json({
        engine_status: FUTURE_ORACLE_VERSION,
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    /* ---------------------------------
       STEP 1: FACT PARSER
    --------------------------------- */
    const facts = parseFactAnchors(input.facts, input.question);

    /* ---------------------------------
       STEP 2: INTELLIGENCE PASS 1
    --------------------------------- */
    const stage1 = runFutureIntelligenceLayer({
      domainResults: [],
      question: input.question
    });

    /* ---------------------------------
       STEP 3: ASTRO DOMAIN SCAN
    --------------------------------- */
    const astro = runFutureAstroLayer({
      evidence_packet: core.evidence_packet,
      facts,
      question_profile: stage1.question_profile
    });

    /* ---------------------------------
       STEP 4: INTELLIGENCE PASS 2
    --------------------------------- */
    const stage2 = runFutureIntelligenceLayer({
      domainResults: astro.domain_results,
      question: input.question
    });

    /* ---------------------------------
       STEP 5: TIMING WINDOWS
    --------------------------------- */
    const timing = runFutureTimingLayer({
      ranked_domains: stage2.ranked_domains,
      top_5_future_domains: stage2.top_5_future_domains,
      primary_future_domain: stage2.primary_future_domain
    });

    /* ---------------------------------
       STEP 6: EVIDENCE / VERDICT
    --------------------------------- */
    const evidenceLayer = runFutureEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      primary_future_domain: timing.primary_future_domain,
      top_5_future_domains: timing.top_5_future_domains,
      activation_windows: timing.activation_windows,
      best_window: timing.best_window,
      risk_window: timing.risk_window
    });

    /* ---------------------------------
       STEP 7: MICRO TIMING
    --------------------------------- */
    const microTiming = runFutureMicroTimingLayer({
      primary_future_domain: evidenceLayer.primary_future_domain,
      top_5_future_domains: evidenceLayer.top_5_future_domains,
      best_window: timing.best_window,
      current_context: core.current_context
    });

    /* ---------------------------------
       FINAL PAYLOAD
    --------------------------------- */
    const payload = {
      engine_status: FUTURE_ORACLE_VERSION,
      system_status: "OK",

      mode: core.mode,
      input_normalized: core.input_normalized,
      birth_context: core.birth_context,
      current_context: core.current_context,

      fact_anchor_block: facts,
      question_profile: stage2.question_profile,
      linked_domain_expansion: stage2.linked_domain_expansion,

      evidence_normalized: astro.evidence_normalized,

      domain_results: stage2.ranked_domains,
      top_ranked_domains: stage2.ranked_domains
        .slice(0, 12)
        .map(minifyDomain),

      primary_future_domain: evidenceLayer.primary_future_domain,
      top_5_future_domains: evidenceLayer.top_5_future_domains,

      activation_windows: timing.activation_windows,
      best_window: timing.best_window,
      risk_window: timing.risk_window,

      validation_block: evidenceLayer.validation_block,
      future_verdict: evidenceLayer.future_verdict,
      lokkotha_summary: evidenceLayer.lokkotha_summary,
      project_paste_block: evidenceLayer.project_paste_block,

      exact_date_time_block: microTiming.exact_date_time_block,
      top_5_micro_timing: microTiming.top_5_micro_timing
    };

    const requirementCheck = ensureRequirementShape(payload);

    if (!requirementCheck.ok) {
      return res.status(500).json({
        engine_status: FUTURE_ORACLE_VERSION,
        system_status: "OUTPUT_SHAPE_ERROR",
        missing_keys: requirementCheck.missing
      });
    }

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: FUTURE_ORACLE_VERSION,
        output_format: "project",
        project_paste_block: evidenceLayer.project_paste_block
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: FUTURE_ORACLE_VERSION,
        output_format: "compact",
        question_profile: stage2.question_profile,
        primary_future_domain: evidenceLayer.primary_future_domain,
        top_5_future_domains: evidenceLayer.top_5_future_domains,
        best_window: timing.best_window,
        risk_window: timing.risk_window,
        future_verdict: evidenceLayer.future_verdict,
        lokkotha_summary: evidenceLayer.lokkotha_summary,
        exact_date_time_block: microTiming.exact_date_time_block,
        top_5_micro_timing: microTiming.top_5_micro_timing
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      engine_status: FUTURE_ORACLE_VERSION,
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}