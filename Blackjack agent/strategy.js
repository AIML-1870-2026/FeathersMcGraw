// Basic strategy for multi-deck blackjack (H=Hit, S=Stand, D=Double)
// Dealer columns: 2,3,4,5,6,7,8,9,10,A → indices 0–9

const HARD_STRATEGY = {
  8:  ['H','H','H','H','H','H','H','H','H','H'],
  9:  ['H','D','D','D','D','H','H','H','H','H'],
  10: ['D','D','D','D','D','D','D','D','H','H'],
  11: ['D','D','D','D','D','D','D','D','D','H'],
  12: ['H','H','S','S','S','H','H','H','H','H'],
  13: ['S','S','S','S','S','H','H','H','H','H'],
  14: ['S','S','S','S','S','H','H','H','H','H'],
  15: ['S','S','S','S','S','H','H','H','H','H'],
  16: ['S','S','S','S','S','H','H','H','H','H'],
  17: ['S','S','S','S','S','S','S','S','S','S'],
  18: ['S','S','S','S','S','S','S','S','S','S'],
  19: ['S','S','S','S','S','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
  21: ['S','S','S','S','S','S','S','S','S','S'],
};

const SOFT_STRATEGY = {
  13: ['H','H','H','D','D','H','H','H','H','H'],
  14: ['H','H','H','D','D','H','H','H','H','H'],
  15: ['H','H','D','D','D','H','H','H','H','H'],
  16: ['H','H','D','D','D','H','H','H','H','H'],
  17: ['H','D','D','D','D','H','H','H','H','H'],
  18: ['S','D','D','D','D','S','S','H','H','H'],
  19: ['S','S','S','S','S','S','S','S','S','S'],
  20: ['S','S','S','S','S','S','S','S','S','S'],
};

const DEALER_COLS = ['2','3','4','5','6','7','8','9','10','A'];
const ACTION_CLASS = { H: 'cell-hit', S: 'cell-stand', D: 'cell-double' };

function _dealerColIndex(rank) {
  if (rank === 'A') return 9;
  if (['J','Q','K'].includes(rank)) return 8;
  return parseInt(rank) - 2;
}

function getBasicStrategyAction(playerTotal, isSoft, dealerRank) {
  const col = _dealerColIndex(dealerRank);
  if (isSoft) {
    const t = Math.min(Math.max(playerTotal, 13), 20);
    return SOFT_STRATEGY[t]?.[col] ?? 'S';
  }
  if (playerTotal >= 17) return 'S';
  if (playerTotal <= 7)  return 'H';
  return HARD_STRATEGY[playerTotal]?.[col] ?? 'H';
}

let _highlightedCell = null;

function renderStrategyMatrix(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  function makeRows(type, totals, strategy, labelFn) {
    return totals.map(t => {
      const cells = DEALER_COLS.map((_, i) => {
        const action = strategy[t]?.[i] ?? (t >= 17 ? 'S' : 'H');
        return `<td class="${ACTION_CLASS[action]}" data-col="${i}">${action}</td>`;
      }).join('');
      return `<tr data-type="${type}" data-total="${t}"><td class="row-label">${labelFn(t)}</td>${cells}</tr>`;
    }).join('');
  }

  const hardRows = makeRows('hard',
    [8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    HARD_STRATEGY,
    t => String(t)
  );
  const softRows = makeRows('soft',
    [13,14,15,16,17,18,19,20],
    SOFT_STRATEGY,
    t => `A+${t - 11}`
  );

  const headerCols = DEALER_COLS.map(d => `<th>${d}</th>`).join('');

  el.innerHTML = `
    <table class="strategy-table">
      <thead><tr><th></th>${headerCols}</tr></thead>
      <tbody>
        <tr><td class="section-divider" colspan="11">Hard</td></tr>
        ${hardRows}
        <tr><td class="section-divider" colspan="11">Soft</td></tr>
        ${softRows}
      </tbody>
    </table>`;
}

function highlightMatrixCell(playerTotal, isSoft, dealerRank) {
  clearMatrixHighlight();
  if (playerTotal > 21) return;
  if (!isSoft && playerTotal < 8) return;

  const col = _dealerColIndex(dealerRank);
  const type = isSoft ? 'soft' : 'hard';
  const t = isSoft
    ? Math.min(Math.max(playerTotal, 13), 20)
    : Math.min(Math.max(playerTotal, 8), 21);

  const row = document.querySelector(`.strategy-table tr[data-type="${type}"][data-total="${t}"]`);
  if (!row) return;

  const cell = row.querySelector(`td[data-col="${col}"]`);
  if (!cell) return;

  cell.classList.add('cell-highlight');
  _highlightedCell = cell;
  cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMatrixHighlight() {
  if (_highlightedCell) {
    _highlightedCell.classList.remove('cell-highlight');
    _highlightedCell = null;
  }
}
