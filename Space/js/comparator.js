// comparator.js — Size Comparator SVG

const SIZE_REFERENCES = [
  { name: 'School bus',       size: 12   },
  { name: 'Boeing 747',       size: 70   },
  { name: 'Football stadium', size: 300  },
  { name: 'Manhattan (width)',size: 3000 },
  { name: 'Mt. Everest (ht)', size: 8849 },
];

function renderSizeComparator(diameterM) {
  if (!diameterM) return '<p class="data-na">Diameter data unavailable.</p>';

  const allSizes = [...SIZE_REFERENCES.map(r => r.size), diameterM];
  const maxSize = Math.max(...allSizes);
  const BAR_MAX = 260;

  const smallerThanBus = diameterM < 12;

  let rows = SIZE_REFERENCES.map((ref, i) => {
    const w = (ref.size / maxSize) * BAR_MAX;
    return `
      <div class="comp-row" style="--delay:${i * 60}ms">
        <span class="comp-label">${ref.name}</span>
        <div class="comp-track">
          <div class="comp-bar comp-bar--ref" style="--w:${w}px"></div>
          <span class="comp-size">${fmtLarge(ref.size)} m</span>
        </div>
      </div>`;
  });

  const asteroidW = (diameterM / maxSize) * BAR_MAX;
  const asteroidRow = `
    <div class="comp-row comp-row--asteroid" style="--delay:${SIZE_REFERENCES.length * 60}ms">
      <span class="comp-label">THIS ASTEROID</span>
      <div class="comp-track">
        <div class="comp-bar comp-bar--asteroid" style="--w:${asteroidW}px"></div>
        <span class="comp-size">${fmtLarge(diameterM)} m</span>
      </div>
    </div>`;

  return `
    <div class="comparator">
      ${smallerThanBus ? '<p class="comp-note">Smaller than a school bus — micro-asteroid</p>' : ''}
      ${rows.join('')}
      ${asteroidRow}
    </div>`;
}
