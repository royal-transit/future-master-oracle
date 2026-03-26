// lib/future-layer-evidence.js

function buildValidationBlock({
  facts,
  primary_future_domain,
  top_5_future_domains,
  best_window,
  risk_window
}) {
  const hasCoreFacts =
    facts.marriage_count_claim != null ||
    facts.broken_marriage_claim != null ||
    facts.foreign_entry_year_claim != null ||
    facts.settlement_year_claim != null;

  return {
    reality_validation_active: facts.provided,
    anchored_fact_context_present: hasCoreFacts,
    primary_domain_detected: primary_future_domain?.domain_key || "NONE",
    top_domains_count: top_5_future_domains?.length || 0,
    best_window_detected: best_window?.window_key || null,
    risk_window_detected: risk_window?.window_key || null,
    validation_state:
      primary_future_domain?.domain_key && best_window?.window_key
        ? "STABLE"
        : "PARTIAL"
  };
}

function buildFutureWhy(primary_future_domain, activation_windows) {
  if (!primary_future_domain || primary_future_domain.domain_key === "NONE") {
    return "No strong future domain could be isolated from the current signal pattern.";
  }

  const reasons = [];
  if (primary_future_domain.strength) {
    reasons.push(`strength ${primary_future_domain.strength.toLowerCase()}`);
  }
  if (primary_future_domain.confidence) {
    reasons.push(`confidence ${primary_future_domain.confidence.toLowerCase()}`);
  }
  if (primary_future_domain.best_window_label) {
    reasons.push(`best activation window ${primary_future_domain.best_window_label}`);
  }

  const matchedWindow = (activation_windows || []).find(
    (w) => w.window_key === primary_future_domain.best_window_key
  );

  if (matchedWindow?.strongest_domains?.[0]?.future_activation_reason) {
    reasons.push(matchedWindow.strongest_domains[0].future_activation_reason);
  }

  return reasons.length
    ? reasons.join(", ")
    : "Rising due to current chart pressure and timing concentration.";
}

function buildTop5Summary(top_5_future_domains) {
  return (top_5_future_domains || []).map((d) => ({
    domain_key: d.domain_key,
    domain_label: d.domain_label,
    strength: d.strength,
    confidence: d.confidence,
    best_window_key: d.best_window_key || null,
    best_window_label: d.best_window_label || null
  }));
}

function buildFutureVerdict({
  question_profile,
  primary_future_domain,
  top_5_future_domains,
  best_window,
  risk_window
}) {
  const primaryLabel =
    primary_future_domain?.domain_label || "No Strong Domain Detected";

  const strongestCount = (top_5_future_domains || []).length;

  return {
    future_direction:
      `${question_profile.primary_domain} future scan shows ` +
      `${strongestCount} strong forward domains, ` +
      `with primary rise in ${primaryLabel}.`,
    primary_future_domain: primary_future_domain?.domain_key || "NONE",
    best_window_key: best_window?.window_key || null,
    best_window_label: best_window?.window_label || null,
    risk_window_key: risk_window?.window_key || null,
    risk_window_label: risk_window?.window_label || null,
    timing_state:
      best_window?.window_key && risk_window?.window_key ? "TIMED" : "PARTIAL"
  };
}

function buildLokkothaSummary({
  primary_future_domain,
  best_window,
  risk_window
}) {
  const p = primary_future_domain?.domain_label || "চিহ্ন";
  const b = best_window?.window_label || "আগামী সময়";
  const r = risk_window?.window_label || "সতর্কতার সময়";

  return {
    text:
      `${p}-এর দিকেই হাওয়া ঘুরছে; ` +
      `সুযোগের দরজা বেশি খুলবে ${b}-এ, ` +
      `আর সাবধানে পা ফেলতে হবে ${r}-এ।`
  };
}

function buildProjectPasteBlock({
  input,
  question_profile,
  primary_future_domain,
  top_5_future_domains,
  activation_windows,
  best_window,
  risk_window,
  validation_block,
  future_verdict,
  lokkotha_summary
}) {
  const lines = [
    "FUTURE UNIVERSAL FORENSIC NANO BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Question Domain: ${question_profile.primary_domain}`,

    `Primary Future Domain: ${primary_future_domain?.domain_label || "NONE"}`,
    `Primary Strength: ${primary_future_domain?.strength || "UNKNOWN"}`,
    `Primary Confidence: ${primary_future_domain?.confidence || "UNKNOWN"}`,
    `Primary Best Window: ${primary_future_domain?.best_window_label || "UNKNOWN"}`,

    `Best Window Overall: ${best_window?.window_label || "UNKNOWN"}`,
    `Risk Window Overall: ${risk_window?.window_label || "UNKNOWN"}`,

    `Validation State: ${validation_block.validation_state}`,
    `Future Direction: ${future_verdict.future_direction}`,
    `Lokkotha: ${lokkotha_summary.text}`,

    "Top 5 Future Domains:"
  ];

  (top_5_future_domains || []).forEach((d, idx) => {
    lines.push(
      `#${idx + 1} | ${d.domain_label} | ${d.strength} | ${d.confidence} | ${d.best_window_label || "UNKNOWN"}`
    );
  });

  lines.push("Activation Windows:");

  (activation_windows || []).forEach((w) => {
    const strong = (w.strongest_domains || [])
      .slice(0, 3)
      .map((x) => x.domain_label)
      .join(" | ") || "NONE";

    const risk = (w.risk_domains || [])
      .slice(0, 3)
      .map((x) => x.domain_label)
      .join(" | ") || "NONE";

    lines.push(
      `${w.window_label} => Strongest: ${strong} || Risk: ${risk} || Note: ${w.notes || ""}`
    );
  });

  lines.push("FUTURE UNIVERSAL FORENSIC NANO BLOCK END");

  return lines.join("\n");
}

export function runFutureEvidenceLayer({
  input,
  facts,
  question_profile,
  primary_future_domain,
  top_5_future_domains,
  activation_windows,
  best_window,
  risk_window
}) {
  const enriched_primary_future_domain = {
    ...primary_future_domain,
    why_rising: buildFutureWhy(primary_future_domain, activation_windows)
  };

  const top5Summary = buildTop5Summary(top_5_future_domains);

  const validation_block = buildValidationBlock({
    facts,
    primary_future_domain: enriched_primary_future_domain,
    top_5_future_domains: top5Summary,
    best_window,
    risk_window
  });

  const future_verdict = buildFutureVerdict({
    question_profile,
    primary_future_domain: enriched_primary_future_domain,
    top_5_future_domains: top5Summary,
    best_window,
    risk_window
  });

  const lokkotha_summary = buildLokkothaSummary({
    primary_future_domain: enriched_primary_future_domain,
    best_window,
    risk_window
  });

  const project_paste_block = buildProjectPasteBlock({
    input,
    question_profile,
    primary_future_domain: enriched_primary_future_domain,
    top_5_future_domains: top5Summary,
    activation_windows,
    best_window,
    risk_window,
    validation_block,
    future_verdict,
    lokkotha_summary
  });

  return {
    primary_future_domain: enriched_primary_future_domain,
    top_5_future_domains: top5Summary,
    validation_block,
    future_verdict,
    lokkotha_summary,
    project_paste_block
  };
}