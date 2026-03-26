// lib/future-layer-timing.js

const asArray = (v) => (Array.isArray(v) ? v : []);
const asObj = (v) => (v && typeof v === "object" ? v : {});
const asNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

// ----------------------------
// SAFE DATE GENERATOR
// ----------------------------
function buildDateCandidates(ranked_domains = []) {
  const safeDomains = asArray(ranked_domains);

  return safeDomains.flatMap((d, i) => {
    const events = asArray(d?.events);

    return events.map((e, idx) => ({
      iso_date:
        e?.exact_date ||
        e?.date_marker ||
        new Date(Date.now() + (i + idx + 1) * 86400000).toISOString().slice(0, 10),

      total_score: round2(
        asNum(d?.rank_score) + asNum(e?.score) + (idx === 0 ? 1.2 : 0)
      ),

      strongest_domain_key: d?.domain_key || "UNKNOWN",
      strongest_domain_label: d?.domain_label || "UNKNOWN",
      strongest_event_type: e?.event_type || "UNKNOWN"
    }));
  });
}

// ----------------------------
// MAIN TIMING ENGINE
// ----------------------------
export function runFutureTimingLayer({
  ranked_domains,
  question_profile,
  winner_lock,
  current_context
}) {
  const safeDomains = asArray(ranked_domains);

  const dateCandidates = buildDateCandidates(safeDomains);

  const sorted = asArray(dateCandidates).sort(
    (a, b) => b.total_score - a.total_score
  );

  const winner = sorted[0] || null;

  const dominant_date_lock = winner
    ? {
        lock_state: "DATE_LOCKED",
        exact_date: winner.iso_date,
        tolerance: "±1 day",
        confidence_score: round2(winner.total_score),
        winning_domain_key: winner.strongest_domain_key,
        winning_domain_label: winner.strongest_domain_label,
        winning_event_type: winner.strongest_event_type,
        winning_event_number: 1,
        winning_event_status: "PENDING"
      }
    : {
        lock_state: "NO_DATE"
      };

  const primary_future_date_packet = winner
    ? {
        source_domain_key: winner.strongest_domain_key,
        source_domain_label: winner.strongest_domain_label,
        source_event_type: winner.strongest_event_type,
        source_event_number: 1,
        source_event_status: "PENDING"
      }
    : null;

  const timing_radar = sorted.slice(0, 7).map((d, i) => ({
    rank: i + 1,
    iso_date: d.iso_date,
    total_score: d.total_score,
    strongest_domain_key: d.strongest_domain_key,
    strongest_domain_label: d.strongest_domain_label,
    strongest_event_type: d.strongest_event_type
  }));

  return {
    dominant_date_lock,
    primary_future_date_packet,
    compressed_date_rows: sorted,
    timing_radar
  };
}