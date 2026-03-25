export default function handler(req, res) {
  try {
    const { dob = "", question = "", name = "" } = req.query;
    const now = new Date();

    // DOB VALIDATION
    const birthYear = dob ? new Date(dob).getFullYear() : null;
    const currentYear = now.getFullYear();
    const age = birthYear ? currentYear - birthYear : null;

    // INTENSITY
    let intensity = "LOW";
    if (age >= 36 && age <= 42) intensity = "HIGH";

    // DOMAIN DETECTION
    let domain = "GENERAL";
    const q = question.toLowerCase();

    if (q.includes("money") || q.includes("income")) domain = "MONEY";
    if (q.includes("career") || q.includes("business")) domain = "CAREER";
    if (q.includes("love") || q.includes("relationship")) domain = "RELATIONSHIP";
    if (q.includes("marriage")) domain = "MARRIAGE";

    // PRECISION WINDOWS
    const precisionEvents = {
      immediate: {
        window: "0-30 days",
        signal: "incoming communication / opportunity",
        action: "stay alert, respond fast"
      },
      near_term: {
        window: "1-3 months",
        signal: "decision pressure / visible movement",
        action: "make calculated decision"
      },
      expansion: {
        window: "3-9 months",
        signal: "growth / income increase",
        action: "push expansion"
      },
      peak: {
        window: "9-18 months",
        signal: "major life shift / breakthrough",
        action: "commit fully"
      }
    };

    // SUMMARY
    const summary = `Age ${age} is in a high-activation phase. The strongest movement is expected in ${precisionEvents.peak.window}, with earlier signals starting from ${precisionEvents.immediate.window}. Domain focus: ${domain}.`;

    // LOKKOTHA
    const lokkotha = "ছোট ঢেউ উঠেছে, বড় জোয়ার আসতে দেরি নেই।";

    return res.status(200).json({
      engine_status: "FUTURE_MASTER_PHASE_4",

      input_block: {
        name: name || null,
        dob: dob || null,
        question: question || null
      },

      core_analysis: {
        age: age,
        intensity_zone: intensity,
        dominant_domain: domain
      },

      event_block: precisionEvents,

      summary_block: {
        readable: summary
      },

      lokkotha_block: {
        text: lokkotha
      },

      final_verdict:
        "High activation phase. Major shift window within 9–18 months. Early signals already active."
    });

  } catch (err) {
    return res.status(500).json({
      engine_status: "FUTURE_MASTER_PHASE_4",
      error: "SYSTEM_ERROR"
    });
  }
}