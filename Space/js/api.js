// api.js — All fetch logic with sessionStorage caching

const NASA_KEY = 'DEMO_KEY';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch (e) { return null; }
}

function cacheSet(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
}

// Normalize an asteroid from NeoWs into a common object
function normalizeNeoWs(neo) {
  const ca = (neo.close_approach_data || [])[0] || {};
  const diameterM = parseMeanDiameter(neo);
  const velocityKms = parseFloat(ca.relative_velocity?.kilometers_per_second) || null;
  const missDistanceLd = parseFloat(ca.miss_distance?.lunar) || null;
  const approachDate = ca.close_approach_date_full ? new Date(ca.close_approach_date_full) : null;

  return {
    id: neo.id || neo.neo_reference_id,
    name: neo.name?.replace(/[()]/g, '').trim(),
    diameterM,
    velocityKms,
    missDistanceLd,
    approachDate,
    isHazardous: neo.is_potentially_hazardous_asteroid,
    sentryProbability: 0,
    cts: 0,
    source: 'neows',
    raw: neo,
  };
}

// Parse SBDB date strings like "2025-Apr-15 14:30" or "2025-Apr-15.61"
// The native Date constructor can't handle named months in ISO format.
const SBDB_MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
function parseSBDBDate(str) {
  if (!str) return null;
  // "YYYY-Mon-DD HH:MM"
  let m = str.match(/^(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], SBDB_MONTHS[m[2]], +m[3], +m[4], +m[5]));
  // "YYYY-Mon-DD.fraction"
  m = str.match(/^(\d{4})-([A-Za-z]{3})-(\d{2})\.(\d+)/);
  if (m) {
    const frac = parseFloat('0.' + m[4]);
    const hh = Math.floor(frac * 24);
    const mm = Math.floor((frac * 24 - hh) * 60);
    return new Date(Date.UTC(+m[1], SBDB_MONTHS[m[2]], +m[3], hh, mm));
  }
  // "YYYY-Mon-DD"
  m = str.match(/^(\d{4})-([A-Za-z]{3})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], SBDB_MONTHS[m[2]], +m[3]));
  return new Date(str); // last-resort fallback
}

// Normalize an asteroid from SBDB CAD API
function normalizeSBDB(row, fields) {
  const get = (name) => {
    const i = fields.indexOf(name);
    return i >= 0 ? row[i] : null;
  };
  const distAU = parseFloat(get('dist'));
  const missDistanceLd = isNaN(distAU) ? null : auToLd(distAU);
  const velocityKms = parseFloat(get('v_rel')) || parseFloat(get('v-rel')) || null;
  const diameterStr = get('diameter');
  const diameterM = diameterStr ? parseFloat(diameterStr) * 1000 : null; // km -> m
  const cdStr = get('cd');
  const approachDate = parseSBDBDate(cdStr);
  const des = get('des') || '';
  const fullname = get('fullname') || des;

  return {
    id: des,
    name: fullname.trim(),
    diameterM,
    velocityKms,
    missDistanceLd,
    approachDate,
    isHazardous: false,
    sentryProbability: 0,
    cts: 0,
    source: 'sbdb',
    raw: { des, fields, row },
  };
}

// Normalize Sentry object
function normalizeSentry(obj) {
  const diameterM = obj.diameter ? parseFloat(obj.diameter) * 1000 : null;
  const ip = parseFloat(obj.ip) || 0;
  const velocityKms = parseFloat(obj.v_inf) || 5; // fallback
  // Sentry objects are impact candidates — miss distance not meaningful in same way
  // Use a very small miss distance to reflect impact risk
  const missDistanceLd = 0.01;

  return {
    id: obj.des || obj.id,
    name: (obj.fullname || obj.name || obj.des || '').trim(),
    diameterM,
    velocityKms,
    missDistanceLd,
    approachDate: obj.pdate ? new Date(obj.pdate) : null,
    isHazardous: true,
    sentryProbability: ip,
    cts: 0,
    impactProbability: ip,
    palermo: obj.ps_max || obj.ps_cum,
    torino: obj.ts_max,
    pdate: obj.pdate,
    source: 'sentry',
    raw: obj,
  };
}

async function fetchNeoWs() {
  const cacheKey = 'neows_' + todayStr();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const start = todayStr();
  const end = nDaysFromNow(7);
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${NASA_KEY}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`NeoWs HTTP ${resp.status}`);
  const json = await resp.json();

  const neos = [];
  const dateMap = json.near_earth_objects || {};
  for (const date of Object.keys(dateMap)) {
    for (const neo of dateMap[date]) {
      neos.push(normalizeNeoWs(neo));
    }
  }
  // Compute CTS for each
  neos.forEach(n => {
    n.cts = computeThreatScore(n.diameterM, n.velocityKms, n.missDistanceLd, n.sentryProbability);
  });
  cacheSet(cacheKey, neos);
  return neos;
}

async function fetchSBDB(days = 365) {
  const cacheKey = `sbdb_${days}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B${days}&dist-max=0.05&sort=dist`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`SBDB HTTP ${resp.status}`);
  const json = await resp.json();

  const fields = json.fields || [];
  const rows = json.data || [];
  const asteroids = rows.map(r => normalizeSBDB(r, fields));
  asteroids.forEach(n => {
    n.cts = computeThreatScore(n.diameterM, n.velocityKms, n.missDistanceLd, n.sentryProbability);
  });
  cacheSet(cacheKey, asteroids);
  return asteroids;
}

async function fetchSentry() {
  const cacheKey = 'sentry';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://ssd-api.jpl.nasa.gov/sentry.api`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Sentry HTTP ${resp.status}`);
  const json = await resp.json();

  const objects = (json.data || []).map(normalizeSentry);
  objects.forEach(n => {
    n.cts = computeThreatScore(n.diameterM, n.velocityKms, n.missDistanceLd, n.sentryProbability);
  });
  cacheSet(cacheKey, objects);
  return objects;
}
