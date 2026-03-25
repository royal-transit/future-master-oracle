export default function handler(req, res) {
  const { dob } = req.query;

  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // AGE INTENSITY
  let eventIntensity = "LOW";
  if (age >= 36 && age <= 42) {
    eventIntensity = "HIGH";
  }

  // DOMAIN
  let dominantDomain = "GENERAL";
  if (eventIntensity === "HIGH") {
    dominantDomain = "CAREER_AND_MONEY";
  }

  // EVENT DETECTION
  const events = {
    short_term: {
      window: "0-7 days",
      event: "communication trigger / small opportunity",
      impact: "LOW"
    },
    mid_term: {
      window: "7-90 days",
      event: "income movement / decision phase",
      impact: "MEDIUM"
    },
    long_term: {
      window: "3-24 months",
      event: "major career shift / financial upgrade",
      impact: eventIntensity
    }
  };

  res.status(200).json({
    engine_status: "FUTURE_MASTER_PHASE_2",
    system_status: "ACTIVE",
    input: { dob },
    age_context: {
      age_years: age,
      intensity_zone: eventIntensity
    },
    domain_detection: dominantDomain,
    event_detection_engine: events,
    next_stage: "FULL_LIFE_SCAN_PHASE"
  });
}