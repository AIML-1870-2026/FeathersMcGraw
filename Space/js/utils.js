// utils.js — unit conversions, formatters

const AU_TO_LD = 389.17;
const LD_TO_KM = 384400;

function auToLd(au) {
  return parseFloat(au) * AU_TO_LD;
}

function ldToKm(ld) {
  return ld * LD_TO_KM;
}

function formatCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, passed: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff, passed: false };
}

function formatCountdownStr(cd) {
  if (!cd || cd.passed) return 'PASSED';
  return `T− ${cd.days}d ${String(cd.hours).padStart(2,'0')}h ${String(cd.minutes).padStart(2,'0')}m ${String(cd.seconds).padStart(2,'0')}s`;
}

function fmt(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return parseFloat(n).toFixed(decimals);
}

function fmtLarge(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return parseFloat(n).toFixed(2);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nDaysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function parseMeanDiameter(neo) {
  try {
    const min = neo.estimated_diameter.meters.estimated_diameter_min;
    const max = neo.estimated_diameter.meters.estimated_diameter_max;
    return (min + max) / 2;
  } catch (e) { return null; }
}
