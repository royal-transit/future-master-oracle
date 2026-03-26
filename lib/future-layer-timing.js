// lib/future-layer-timing.js

import { FUTURE_TIME_WINDOWS } from "./future-oracle-contract.js";

function strengthToWeight(strength) {
  if (strength === "PEAK") return 5;
  if (strength === "HIGH") return 4;
  if (strength === "MODERATE") return 3;
  if (strength === "LOW") return 2;
  return 1;
}

function confidenceToWeight(confidence) {
  if (confidence === "HIGH") return 3;
  if (confidence === "MEDIUM") return 2;
  return 1;
}

function buildWindowBaseScore(domain) {
  const strengthWeight = strengthToWeight(domain.future_strength);
  const confidenceWeight = confidenceToWeight(domain.confidence);
  return domain.rank_score + strengthWeight + confidenceWeight;
}

function assignWindowBias(domainKey) {
  // Domain timing tendency
  if (["MENTAL", "HEALTH", "DEBT", "LEGAL", "DOCUMENT", "JOB"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 2.0,
      DAY_31_TO_90: 1.4,
      MONTH_4_TO_6: 0.8,
      MONTH_7_TO_12: 0.3
    };
  }

  if (["MARRIAGE", "RELATIONSHIP", "LOVE", "PARTNERSHIP"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 0.8,
      DAY_31_TO_90: 1.8,
      MONTH_4_TO_6: 1.7,
      MONTH_7_TO_12: 1.0
    };
  }

  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 0.7,
      DAY_31_TO_90: 1.6,
      MONTH_4_TO_6: 2.0,
      MONTH_7_TO_12: 1.4
    };
  }

  if (["CAREER", "BUSINESS", "CAREER", "REPUTATION", "AUTHORITY"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 1.0,
      DAY_31_TO_90: 1.5,
      MONTH_4_TO_6: 1.8,
      MONTH_7_TO_12: 1.5
    };
  }

  if (["PROPERTY", "HOME", "VEHICLE"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 0.5,
      DAY_31_TO_90: 1.2,
      MONTH_4_TO_6: 1.9,
      MONTH_7_TO_12: 1.8
    };
  }

  if (["SUCCESS", "GAIN", "MONEY"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 0.9,
      DAY_31_TO_90: 1.4,
      MONTH_4_TO_6: 1.6,
      MONTH_7_TO_12: 1.3
    };
  }

  if (["LOSS", "FAILURE", "BLOCKAGE", "DELAY", "SCANDAL"].includes(domainKey)) {
    return {
      NOW_TO_30_DAYS: 1.2,
      DAY_31_TO_90: 1.6,
      MONTH_4_TO_6: 1.2,
      MONTH_7_TO_12: 0.8
    };
  }

  return {
    NOW_TO_30_DAYS: 1.0,
    DAY_31_TO_90: 1.2,
    MONTH_4_TO_6: 1.1,
    MONTH_7_TO_12: 0.9
  };
}

function computeWindowScoresForDomain(domain) {
  const base = buildWindowBaseScore(domain);
  const bias = assignWindowBias(domain.domain_key);

  return FUTURE_TIME_WINDOWS.map((w) => ({
    window_key: w.key,
    score: Number((base * bias[w.key]).toFixed(2))
  }));
}

function classifyRiskDomain(domainKey) {
  return [
    "HEALTH",
    "MENTAL",
    "DEBT",
    "LEGAL",
    "BLOCKAGE",
    "DELAY",
    "FAILURE",
    "SCANDAL",
    "LOSS",
    "DISEASE",
    "ACCIDENT",
    "SURGERY"
  ].includes(domainKey);
}

function sortByScoreDesc(arr) {
  return [...arr].sort((a, b) => b.score - a.score);
}

function buildActivationWindows(rankedDomains) {
  const windows = FUTURE_TIME_WINDOWS.map((w) => ({
    window_key: w.key,
    window_label: w.label,
    strongest_domains: [],
    risk_domains: [],
    notes: ""
  }));

  const matrix = rankedDomains.map((domain) => ({
    domain,
    window_scores: computeWindowScoresForDomain(domain)
  }));

  windows.forEach((windowObj) => {
    const scored = matrix.map((row) => {
      const match = row.window_scores.find((x) => x.window_key === windowObj.window_key);
      return {
        domain_key: row.domain.domain_key,
        domain_label: row.domain.domain_label,
        strength: row.domain.future_strength,
        confidence: row.domain.confidence,
        rank_score: row.domain.rank_score,
        score: match?.score ?? 0,
        future_activation_reason: row.domain.future_activation_reason
      };
    });

    const strongest = sortByScoreDesc(scored)
      .filter((x) => x.strength !== "DORMANT")
      .slice(0, 5);

    const riskDomains = sortByScoreDesc(
      scored.filter((x) => classifyRiskDomain(x.domain_key))
    ).slice(0, 3);

    windowObj.strongest_domains = strongest;
    windowObj.risk_domains = riskDomains;

    if (strongest.length > 0) {
      windowObj.notes = `Strongest activation: ${strongest[0].domain_label}`;
    } else {
      windowObj.notes = "No strong activation detected";
    }
  });

  return windows;
}

function pickBestWindow(activation_windows) {
  const scored = activation_windows.map((w) => ({
    window_key: w.window_key,
    window_label: w.window_label,
    score: (w.strongest_domains[0]?.score ?? 0) + (w.strongest_domains[1]?.score ?? 0)
  }));

  return sortByScoreDesc(scored)[0] || null;
}

function pickRiskWindow(activation_windows) {
  const scored = activation_windows.map((w) => ({
    window_key: w.window_key,
    window_label: w.window_label,
    score: (w.risk_domains[0]?.score ?? 0) + (w.risk_domains[1]?.score ?? 0)
  }));

  return sortByScoreDesc(scored)[0] || null;
}

function attachBestWindowToTopDomains(topDomains, activationWindows) {
  return topDomains.map((domain) => {
    let best = null;

    activationWindows.forEach((w) => {
      const found = w.strongest_domains.find((x) => x.domain_key === domain.domain_key);
      if (!found) return;

      if (!best || found.score > best.score) {
        best = {
          best_window_key: w.window_key,
          best_window_label: w.window_label,
          best_window_score: found.score
        };
      }
    });

    return {
      ...domain,
      best_window_key: best?.best_window_key || null,
      best_window_label: best?.best_window_label || null,
      best_window_score: best?.best_window_score ?? null
    };
  });
}

function attachBestWindowToPrimary(primaryDomain, activationWindows) {
  let best = null;

  activationWindows.forEach((w) => {
    const found = w.strongest_domains.find((x) => x.domain_key === primaryDomain.domain_key);
    if (!found) return;

    if (!best || found.score > best.score) {
      best = {
        best_window_key: w.window_key,
        best_window_label: w.window_label,
        best_window_score: found.score
      };
    }
  });

  return {
    ...primaryDomain,
    best_window_key: best?.best_window_key || null,
    best_window_label: best?.best_window_label || null,
    best_window_score: best?.best_window_score ?? null
  };
}

export function runFutureTimingLayer({
  ranked_domains,
  top_5_future_domains,
  primary_future_domain
}) {
  const activation_windows = buildActivationWindows(ranked_domains);
  const best_window = pickBestWindow(activation_windows);
  const risk_window = pickRiskWindow(activation_windows);

  const enriched_top_5_future_domains = attachBestWindowToTopDomains(
    top_5_future_domains,
    activation_windows
  );

  const enriched_primary_future_domain = attachBestWindowToPrimary(
    primary_future_domain,
    activation_windows
  );

  return {
    activation_windows,
    best_window,
    risk_window,
    top_5_future_domains: enriched_top_5_future_domains,
    primary_future_domain: enriched_primary_future_domain
  };
}