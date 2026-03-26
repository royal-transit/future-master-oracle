// api/future-oracle.js

import { buildFutureOracleContract } from "../lib/future-oracle-contract.js";
import { buildChartCore } from "../lib/chart-core.js";
import { buildProviderAdapter } from "../lib/provider-adapter.js";
import { runFutureAstroLayer } from "../lib/future-layer-astro.js";
import { runFutureIntelligenceLayer } from "../lib/future-layer-intelligence.js";
import { runFutureTimingLayer } from "../lib/future-layer-timing.js";
import { runFutureMicroTimingLayer } from "../lib/future-layer-micro-timing.js";
import { runFutureEvidenceLayer } from "../lib/future-layer-evidence.js";

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(v) {
  return String(v || "").trim();
}

function toLower(v) {
  return normalizeText(v).toLowerCase();
}

function normalizeName(v) {
  return normalizeText(v).toLowerCase();
}

function normalizeDateOnly(v) {
  const raw = normalizeText(v);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmySlash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlash) {
    return `${dmySlash[3]}-${String(dmySlash[2]).padStart(2, "0")}-${String(
      dmySlash[1]
    ).padStart(2, "0")}`;
  }

  const dmyDash = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDash) {
    return `${dmyDash[3]}-${String(dmyDash[2]).padStart(2, "0")}-${String(
      dmyDash[1]
    ).padStart(2, "0")}`;
  }

  return raw;
}

function normalizeTimeOnly(v) {
  const raw = normalizeText(v);
  if (!raw) return null;

  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return `${String(hm[1]).padStart(2, "0")}:${hm[2]}`;

  const hms = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hms) return `${String(hms[1]).padStart(2, "0")}:${hms[2]}`;

  return raw;
}

function normalizeIsoDateTime(v) {
  const raw = normalizeText(v);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeInput(body = {}) {
  const latitude =
    body.latitude == null || body.latitude === ""
      ? null
      : Number(body.latitude);

  const longitude =
    body.longitude == null || body.longitude === ""
      ? null
      : Number(body.longitude);

  return {
    name: normalizeName(body.name),
    dob: normalizeDateOnly(body.dob),
    tob: normalizeTimeOnly(body.tob),
    pob: normalizeText(body.pob),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    timezone_offset: normalizeText(body.timezone_offset || body.timezoneOffset || "+06:00"),
    question: normalizeText(body.question),
    facts: normalizeText(body.facts),
    current_datetime_iso: normalizeIsoDateTime(
      body.current_datetime_iso || body.currentDateTime || body.current_datetime
    ),
    raw_payload: body
  };
}

function buildBirthContext(input) {
  const birth_datetime_iso =
    input.dob && input.tob
      ? `${input.dob}T${input.tob}:00${input.timezone_offset || "+06:00"}`
      : input.dob
        ? `${input.dob}T00:00:00${input.timezone_offset || "+06:00"}`
        : null;

  return {
    birth_datetime_iso,
    birthplace: input.pob || null,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset || "+06:00"
  };
}

function buildCurrentContext(input) {
  const nowIso = input.current_datetime_iso || new Date().toISOString();

  return {
    event_datetime_iso: nowIso,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset || "+06:00"
  };
}

function parseFactAnchors(input) {
  const raw = `${input.facts || ""} ${input.question || ""}`.trim().toLowerCase();

  const marriageCountMatch = raw.match(/(\d+)\s+(marriage|marriages|bea)/i);
  const brokenMarriageMatch = raw.match(/(\d+)\s+(broken|divorce|divorced|break)/i);
  const foreignYearMatch = raw.match(/\b(20\d{2})\b(?=.*\b(uk|foreign|abroad|visa|migration|immigration)\b)/i);
  const settlementYearMatch = raw.match(/\bsettlement\b.*?\b(20\d{2})\b|\b(20\d{2})\b.*?\bsettlement\b/i);

  const allYears = Array.from(raw.matchAll(/\b(20\d{2})\b/g)).map((m) => Number(m[1]));

  return {
    provided: raw.length > 0,
    raw_text: raw || null,
    marriage_count_claim: marriageCountMatch ? Number(marriageCountMatch[1]) : null,
    broken_marriage_claim: brokenMarriageMatch ? Number(brokenMarriageMatch[1]) : null,
    foreign_entry_year_claim: foreignYearMatch ? Number(foreignYearMatch[1]) : null,
    settlement_year_claim: settlementYearMatch
      ? Number(settlementYearMatch[1] || settlementYearMatch[2])
      : null,
    all_years: allYears
  };
}

function buildEvidenceNormalized(chartPacket = {}) {
  return {
    natal_planet_count: Number(chartPacket.natal_planet_count || 0),
    transit_planet_count: Number(chartPacket.transit_planet_count || 0),
    aspect_count: Number(chartPacket.aspect_count || 0),
    ascendant_present: Boolean(chartPacket.ascendant_present),
    house_mapping_present: Boolean(chartPacket.house_mapping_present)
  };
}

function safeTopRankedDomains(rankedDomains = []) {
  return rankedDomains.slice(0, 12).map((d) => ({
    domain_key: d.domain_key,
    domain_label: d.domain_label,
    rank_score:
      d.intelligence_rank_score != null
        ? round2(d.intelligence_rank_score)
        : round2(d.rank_score || d.normalized_score || 0),
    normalized_score: round2(d.normalized_score || 0),
    density: d.density || null,
    residual_impact: d.residual_impact || null,
    major_event_count: Number(d.major_event_count || 0),
    broken_event_count: Number(d.broken_event_count || 0),
    active_event_count: Number(d.active_event_count || 0)
  }));
}

function buildPrimaryFutureEvent({
  dominant_date_lock,
  exact_time_lock,
  primary_future_date_packet,
  primary_future_time_packet,
  ranked_domains
}) {
  const domainKey =
    primary_future_time_packet?.source_domain_key ||
    primary_future_date_packet?.source_domain_key ||
    dominant_date_lock?.winning_domain_key ||
    null;

  const domain = (ranked_domains || []).find((d) => d.domain_key === domainKey) || null;

  return {
    domain_key: domainKey,
    domain_label:
      primary_future_time_packet?.source_domain_label ||
      primary_future_date_packet?.source_domain_label ||
      dominant_date_lock?.winning_domain_label ||
      null,
    event_type:
      primary_future_time_packet?.source_event_type ||
      primary_future_date_packet?.source_event_type ||
      dominant_date_lock?.winning_event_type ||
      null,
    event_number:
      primary_future_time_packet?.source_event_number ||
      primary_future_date_packet?.source_event_number ||
      dominant_date_lock?.winning_event_number ||
      null,
    event_status:
      primary_future_time_packet?.source_event_status ||
      primary_future_date_packet?.source_event_status ||
      dominant_date_lock?.winning_event_status ||
      null,
    exact_date: dominant_date_lock?.exact_date || null,
    exact_time_24: exact_time_lock?.exact_time_24 || null,
    exact_time_12: exact_time_lock?.exact_time_12 || null,
    exact_datetime_utc: exact_time_lock?.exact_datetime_utc || null,
    date_tolerance: dominant_date_lock?.tolerance || null,
    time_tolerance: exact_time_lock?.tolerance || null,
    date_confidence_score: dominant_date_lock?.confidence_score || 0,
    time_confidence_score: exact_time_lock?.confidence_score || 0,
    why_this_time_wins: exact_time_lock?.why_this_time_wins || null,
    domain_rank_score:
      domain?.intelligence_rank_score != null
        ? round2(domain.intelligence_rank_score)
        : round2(domain?.rank_score || 0)
  };
}

function buildNanoVerdict({
  primary_future_event,
  winner_lock,
  dominant_date_lock,
  exact_time_lock
}) {
  if (!primary_future_event?.domain_key) {
    return {
      outcome_existence: "NO_LOCK",
      deterministic_state: "UNRESOLVED",
      sentence: "No deterministic future event lock was achieved."
    };
  }

  const status = String(primary_future_event.event_status || "").toUpperCase();
  const positive =
    ["PROMISED", "FORMING", "PENDING", "BUILDING", "APPROACHING", "ACTIVE", "STABILISING"].includes(status);

  return {
    outcome_existence: positive ? "WILL_HAPPEN" : "CONDITIONAL",
    deterministic_state:
      winner_lock?.lock_state === "HARD_LOCK" &&
      dominant_date_lock?.lock_state === "DATE_LOCKED" &&
      exact_time_lock?.lock_state === "TIME_LOCKED"
        ? "FULLY_LOCKED"
        : "PARTIAL_LOCK",
    sentence:
      `${primary_future_event.domain_label || "Future event"} shows a locked trigger on ` +
      `${primary_future_event.exact_date || "UNKNOWN_DATE"} ` +
      `${primary_future_event.exact_time_12 || ""}`.trim()
  };
}

function buildLokkothaVerdict(primary_future_event) {
  if (!primary_future_event?.exact_date || !primary_future_event?.exact_time_12) {
    return {
      text: "সময় এখনো পাকা দাগে নামেনি; ছায়া আছে, কিন্তু ঘণ্টা এখনো সিল হয়নি।"
    };
  }

  return {
    text:
      `${primary_future_event.exact_date} তারিখে ${primary_future_event.exact_time_12}-এর দাগ সবচেয়ে পাকা; ` +
      `ভাগ্যের ঘড়ি ওই ক্ষণেই জোরে বাজে।`
  };
}

function buildProjectPasteBlock({
  input_normalized,
  winner_lock,
  dominant_date_lock,
  exact_time_lock,
  primary_future_event,
  nano_verdict,
  lokkotha_verdict,
  timing_radar,
  micro_timing_radar
}) {
  return [
    "FUTURE UNIVERSAL NANO SCAN BLOCK",
    `Subject: ${input_normalized.name || "UNKNOWN"}`,
    `Primary Domain: ${winner_lock?.winning_domain_key || "UNKNOWN"}`,
    `Winner Lock: ${winner_lock?.lock_state || "UNKNOWN"}`,
    `Winning Domain Label: ${winner_lock?.winning_domain_label || "UNKNOWN"}`,
    `Winning Event Type: ${winner_lock?.winning_event_type || "UNKNOWN"}`,
    `Winning Event Status: ${winner_lock?.winning_event_status || "UNKNOWN"}`,
    `Exact Date: ${dominant_date_lock?.exact_date || "UNKNOWN"}`,
    `Date Tolerance: ${dominant_date_lock?.tolerance || "UNKNOWN"}`,
    `Date Confidence: ${dominant_date_lock?.confidence_score ?? 0}`,
    `Exact Time 24: ${exact_time_lock?.exact_time_24 || "UNKNOWN"}`,
    `Exact Time 12: ${exact_time_lock?.exact_time_12 || "UNKNOWN"}`,
    `Time Tolerance: ${exact_time_lock?.tolerance || "UNKNOWN"}`,
    `Time Confidence: ${exact_time_lock?.confidence_score ?? 0}`,
    `Exact Datetime UTC: ${exact_time_lock?.exact_datetime_utc || "UNKNOWN"}`,
    `Why This Time Wins: ${exact_time_lock?.why_this_time_wins || "UNKNOWN"}`,
    `Primary Future Event Domain: ${primary_future_event?.domain_label || "UNKNOWN"}`,
    `Primary Future Event Number: ${primary_future_event?.event_number ?? "UNKNOWN"}`,
    `Primary Future Event Status: ${primary_future_event?.event_status || "UNKNOWN"}`,
    `Nano Verdict: ${nano_verdict?.sentence || "UNKNOWN"}`,
    `Lokkotha: ${lokkotha_verdict?.text || "UNKNOWN"}`,
    "Timing Radar:",
    ...(timing_radar || []).slice(0, 5).map(
      (r) =>
        `DATE#${r.rank} | ${r.iso_date} | score=${r.total_score} | ${r.strongest_domain_label || r.strongest_domain_key || "UNKNOWN"} | ${r.strongest_event_type || "UNKNOWN"}`
    ),
    "Micro Timing Radar:",
    ...(micro_timing_radar || []).slice(0, 5).map(
      (r) =>
        `TIME#${r.rank} | ${r.exact_time_12 || r.exact_time_24 || "UNKNOWN"} | score=${r.total_score} | ${r.source_domain_label || r.source_domain_key || "UNKNOWN"} | ${r.source_event_type || "UNKNOWN"}`
    ),
    "FUTURE UNIVERSAL NANO SCAN BLOCK END"
  ].join("\n");
}

function buildErrorResponse(res, err, input_normalized = null) {
  return res.status(500).json({
    engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
    system_status: "ERROR",
    input_normalized,
    error_message: err?.message || "Unknown future oracle failure"
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "METHOD_NOT_ALLOWED"
    });
  }

  const input_normalized = normalizeInput(req.body || {});
  const birth_context = buildBirthContext(input_normalized);
  const current_context = buildCurrentContext(input_normalized);
  const fact_anchor_block = parseFactAnchors(input_normalized);

  try {
    const contract_packet = buildFutureOracleContract({
      input: input_normalized,
      birth_context,
      current_context
    });

    const provider_adapter = await buildProviderAdapter({
      input: input_normalized,
      birth_context,
      current_context,
      contract_packet
    });

    const chart_core = await buildChartCore({
      input: input_normalized,
      birth_context,
      current_context,
      provider_adapter,
      contract_packet
    });

    const astro_layer = await runFutureAstroLayer({
      input: input_normalized,
      birth_context,
      current_context,
      fact_anchor_block,
      contract_packet,
      provider_adapter,
      chart_core
    });

    const intelligence_layer = runFutureIntelligenceLayer({
      domainResults: astro_layer?.domain_results || [],
      question: input_normalized.question
    });

    const timing_layer = runFutureTimingLayer({
      ranked_domains: intelligence_layer?.ranked_domains || [],
      question_profile: intelligence_layer?.question_profile || {},
      winner_lock: intelligence_layer?.winner_lock || {},
      current_context
    });

    const micro_timing_layer = runFutureMicroTimingLayer({
      compressed_date_rows: timing_layer?.compressed_date_rows || [],
      primary_future_date_packet: timing_layer?.primary_future_date_packet || null
    });

    const evidence_layer = runFutureEvidenceLayer({
      input: input_normalized,
      facts: fact_anchor_block,
      question_profile: intelligence_layer?.question_profile || {},
      ranked_domains: intelligence_layer?.ranked_domains || [],
      dominant_date_lock: timing_layer?.dominant_date_lock || {},
      primary_future_date_packet: timing_layer?.primary_future_date_packet || null,
      exact_time_lock: micro_timing_layer?.exact_time_lock || {},
      primary_future_time_packet: micro_timing_layer?.primary_future_time_packet || null,
      winner_lock: intelligence_layer?.winner_lock || {}
    });

    const primary_future_event = buildPrimaryFutureEvent({
      dominant_date_lock: timing_layer?.dominant_date_lock || {},
      exact_time_lock: micro_timing_layer?.exact_time_lock || {},
      primary_future_date_packet: timing_layer?.primary_future_date_packet || null,
      primary_future_time_packet: micro_timing_layer?.primary_future_time_packet || null,
      ranked_domains: intelligence_layer?.ranked_domains || []
    });

    const nano_verdict = buildNanoVerdict({
      primary_future_event,
      winner_lock: intelligence_layer?.winner_lock || {},
      dominant_date_lock: timing_layer?.dominant_date_lock || {},
      exact_time_lock: micro_timing_layer?.exact_time_lock || {}
    });

    const lokkotha_verdict = buildLokkothaVerdict(primary_future_event);

    const project_paste_block = buildProjectPasteBlock({
      input_normalized,
      winner_lock: intelligence_layer?.winner_lock || {},
      dominant_date_lock: timing_layer?.dominant_date_lock || {},
      exact_time_lock: micro_timing_layer?.exact_time_lock || {},
      primary_future_event,
      nano_verdict,
      lokkotha_verdict,
      timing_radar: timing_layer?.timing_radar || [],
      micro_timing_radar: micro_timing_layer?.micro_timing_radar || []
    });

    return res.status(200).json({
      engine_status: "FUTURE_ORACLE_LAYERED_NANO_V1",
      system_status: "OK",

      input_normalized,
      birth_context,
      current_context,
      fact_anchor_block,

      contract_packet:
        typeof contract_packet === "object" && contract_packet !== null
          ? contract_packet
          : { contract_state: "UNKNOWN" },

      evidence_normalized: buildEvidenceNormalized(chart_core || {}),

      question_profile: intelligence_layer?.question_profile || {},
      linked_domain_expansion: intelligence_layer?.linked_domain_expansion || [],
      winner_lock: intelligence_layer?.winner_lock || {},
      current_carryover: intelligence_layer?.carryover || {
        present_carryover_detected: false,
        carryover_domains: []
      },

      top_ranked_domains: safeTopRankedDomains(intelligence_layer?.ranked_domains || []),
      domain_results: intelligence_layer?.ranked_domains || [],

      dominant_date_lock: timing_layer?.dominant_date_lock || {},
      primary_future_date_packet: timing_layer?.primary_future_date_packet || null,
      timing_radar: timing_layer?.timing_radar || [],

      exact_time_lock: micro_timing_layer?.exact_time_lock || {},
      primary_future_time_packet: micro_timing_layer?.primary_future_time_packet || null,
      alternative_time_candidates: micro_timing_layer?.alternative_time_candidates || [],
      micro_timing_radar: micro_timing_layer?.micro_timing_radar || [],

      primary_future_event,
      evidence_verdict:
        typeof evidence_layer === "object" && evidence_layer !== null
          ? evidence_layer
          : {},

      nano_verdict,
      lokkotha_verdict,
      project_paste_block
    });
  } catch (err) {
    return buildErrorResponse(res, err, input_normalized);
  }
}