// lib/provider-adapter.js

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp360(n) {
  let x = Number(n || 0) % 360;
  if (x < 0) x += 360;
  return x;
}

function signFromLongitude(lon) {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  return signs[Math.floor(clamp360(lon) / 30)];
}

function degInSign(lon) {
  return +(clamp360(lon) % 30).toFixed(4);
}

function makePlanet(name, lon) {
  return {
    planet: name,
    longitude: +clamp360(lon).toFixed(4),
    sign: signFromLongitude(lon),
    degree_in_sign: degInSign(lon)
  };
}

function daysSinceEpoch(dateIso) {
  const ms = new Date(dateIso).getTime();
  return Math.floor(ms / 86400000);
}

function approxNatalPlanets(dateIso) {
  const d = daysSinceEpoch(dateIso);

  return [
    makePlanet("SUN", 250 + (d * 0.9856)),
    makePlanet("MOON", 120 + (d * 13.1764)),
    makePlanet("MERCURY", 220 + (d * 1.2)),
    makePlanet("VENUS", 180 + (d * 1.15)),
    makePlanet("MARS", 80 + (d * 0.52)),
    makePlanet("JUPITER", 40 + (d * 0.083)),
    makePlanet("SATURN", 260 + (d * 0.033)),
    makePlanet("RAHU", 340 - (d * 0.053)),
    makePlanet("KETU", 160 - (d * 0.053))
  ];
}

function approxTransitPlanets(nowIso) {
  const d = daysSinceEpoch(nowIso);

  return [
    makePlanet("SUN", 330 + (d * 0.9856)),
    makePlanet("MOON", 210 + (d * 13.1764)),
    makePlanet("MERCURY", 300 + (d * 1.2)),
    makePlanet("VENUS", 20 + (d * 1.15)),
    makePlanet("MARS", 110 + (d * 0.52)),
    makePlanet("JUPITER", 60 + (d * 0.083)),
    makePlanet("SATURN", 350 + (d * 0.033)),
    makePlanet("RAHU", 330 - (d * 0.053)),
    makePlanet("KETU", 150 - (d * 0.053))
  ];
}

function aspectType(diff) {
  const aspects = [
    { deg: 0, name: "conjunction" },
    { deg: 60, name: "sextile" },
    { deg: 90, name: "square" },
    { deg: 120, name: "trine" },
    { deg: 180, name: "opposition" }
  ];

  let best = null;
  for (const a of aspects) {
    const gap = Math.abs(diff - a.deg);
    if (!best || gap < best.gap) best = { ...a, gap };
  }

  return best.gap <= 4 ? { type: best.name, orb_gap: +best.gap.toFixed(4) } : null;
}

function buildAspects(planets) {
  const out = [];
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const a = planets[i];
      const b = planets[j];
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      const asp = aspectType(diff);
      if (asp) {
        out.push({
          planet1: a.planet,
          planet2: b.planet,
          type: asp.type,
          orb_gap: asp.orb_gap
        });
      }
    }
  }
  return out;
}

function buildAscendant(latitude, longitude) {
  const lat = toNum(latitude) ?? 23.7;
  const lon = toNum(longitude) ?? 90.4;
  const ascLon = clamp360((lat * 3.7) + (lon * 1.13));
  return {
    sign: signFromLongitude(ascLon),
    longitude: +ascLon.toFixed(4)
  };
}

function buildDasha(dateIso) {
  const year = new Date(dateIso).getUTCFullYear();

  const cycle = [
    "KETU",
    "VENUS",
    "SUN",
    "MOON",
    "MARS",
    "RAHU",
    "JUPITER",
    "SATURN",
    "MERCURY"
  ];

  const maha = cycle[year % cycle.length];
  const bhukti = cycle[(year + 2) % cycle.length];
  const antara = cycle[(year + 4) % cycle.length];

  return {
    maha_dasha: maha,
    bhukti,
    antara
  };
}

export const astroProvider = {
  async buildEvidence({ birth_datetime_iso, latitude, longitude, current_datetime_iso }) {
    const natalPlanets = approxNatalPlanets(birth_datetime_iso);
    const transitPlanets = approxTransitPlanets(current_datetime_iso);
    const ascendant = buildAscendant(latitude, longitude);

    return {
      natal: {
        planets: natalPlanets,
        aspects: buildAspects(natalPlanets),
        ascendant
      },
      transit_now: {
        planets: transitPlanets,
        aspects: buildAspects(transitPlanets)
      },
      dasha: buildDasha(birth_datetime_iso),
      kp: {},
      divisional: {}
    };
  }
};