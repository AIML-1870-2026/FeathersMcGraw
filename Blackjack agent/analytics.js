const analytics = {
  handsPlayed: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  streakCount: 0,
  streakType: null,
  biggestWin: 0,
  biggestLoss: 0,
  balanceHistory: [1000],
  aiCorrect: 0,
  aiTotal: 0,
};

function recordHand({ result, payout, balance, aiRecommendation, basicStrategyAction }) {
  analytics.handsPlayed++;
  analytics.balanceHistory.push(balance);

  const isWin  = result === 'win' || result === 'blackjack';
  const isLoss = result === 'loss' || result === 'bust';

  if (isWin) {
    analytics.wins++;
    if (analytics.streakType === 'W') analytics.streakCount++;
    else { analytics.streakType = 'W'; analytics.streakCount = 1; }
    if (payout > analytics.biggestWin) analytics.biggestWin = payout;
  } else if (isLoss) {
    analytics.losses++;
    if (analytics.streakType === 'L') analytics.streakCount++;
    else { analytics.streakType = 'L'; analytics.streakCount = 1; }
    if (payout < analytics.biggestLoss) analytics.biggestLoss = payout;
  } else {
    analytics.pushes++;
    analytics.streakType = 'P';
    analytics.streakCount = 0;
  }

  if (aiRecommendation && basicStrategyAction) {
    analytics.aiTotal++;
    if (aiRecommendation === basicStrategyAction) analytics.aiCorrect++;
  }
}

function updateStatsDisplay() {
  const $ = id => document.getElementById(id);

  $('stat-hands').textContent = analytics.handsPlayed;

  const resolved = analytics.wins + analytics.losses;
  $('stat-winrate').textContent = resolved > 0
    ? `${Math.round((analytics.wins / resolved) * 100)}%` : '—';

  const sc = analytics.streakCount, st = analytics.streakType;
  $('stat-streak').textContent = (sc > 0 && st !== 'P') ? `${sc}${st}` : '—';

  $('stat-best-win').textContent  = analytics.biggestWin  > 0 ? `+$${analytics.biggestWin}` : '—';
  $('stat-worst-loss').textContent = analytics.biggestLoss < 0 ? `-$${Math.abs(analytics.biggestLoss)}` : '—';

  $('stat-ai-accuracy').textContent = analytics.aiTotal > 0
    ? `${Math.round((analytics.aiCorrect / analytics.aiTotal) * 100)}%` : '—';
}

function drawBankrollChart() {
  const canvas = document.getElementById('bankroll-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = canvas.parentElement.clientWidth;
  const H = 100;
  canvas.width  = W;
  canvas.height = H;

  const hist = analytics.balanceHistory;
  ctx.clearRect(0, 0, W, H);

  const pL = 44, pR = 8, pT = 8, pB = 16;
  const cW = W - pL - pR;
  const cH = H - pT - pB;

  const minV = Math.min(...hist);
  const maxV = Math.max(...hist);
  const range = maxV - minV || 200;

  // Horizontal grid lines + Y labels
  ctx.font = '8px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  [0, 0.5, 1].forEach(frac => {
    const y = pT + frac * cH;
    ctx.strokeStyle = '#EFEFEF';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke();
    ctx.fillStyle = '#BBBBBB';
    ctx.fillText(`$${Math.round(maxV - frac * range)}`, pL - 4, y + 3);
  });

  if (hist.length < 2) {
    ctx.beginPath();
    ctx.arc(pL + cW / 2, pT + cH / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#2D6BE4';
    ctx.fill();
    return;
  }

  const n  = hist.length;
  const toX = i => pL + (i / (n - 1)) * cW;
  const toY = v => pT + cH - ((v - minV) / range) * cH;

  // Line
  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = toX(i), y = toY(v);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#2D6BE4';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Fill area under line
  ctx.lineTo(toX(n - 1), pT + cH);
  ctx.lineTo(pL, pT + cH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(45,107,228,0.07)';
  ctx.fill();

  // Endpoint dot
  ctx.beginPath();
  ctx.arc(toX(n - 1), toY(hist[n - 1]), 3, 0, Math.PI * 2);
  ctx.fillStyle = '#2D6BE4';
  ctx.fill();
}
