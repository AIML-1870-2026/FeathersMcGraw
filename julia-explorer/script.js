// === Julia Set Explorer ===

(() => {
  // --- State ---
  const state = {
    c: { re: -0.7, im: 0.27 },
    maxIter: 200,
    viewport: { centerX: 0, centerY: 0, zoom: 1 },
    orbit: { active: false, angle: 0, speed: 0.5, radius: 0.7885 },
    minimap: { visible: false, dirty: true },
    infoVisible: false,
    colorScheme: 'ocean',
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragViewStart: { centerX: 0, centerY: 0 },
    lastTimestamp: 0,
  };

  // --- DOM Elements ---
  const juliaCanvas = document.getElementById('julia-canvas');
  const juliaCtx = juliaCanvas.getContext('2d');
  const mandelCanvas = document.getElementById('mandelbrot-canvas');
  const mandelCtx = mandelCanvas.getContext('2d');
  const tooltip = document.getElementById('coord-tooltip');
  const minimapContainer = document.getElementById('minimap-container');
  const crosshair = document.getElementById('minimap-crosshair');
  const infoPanel = document.getElementById('info-panel');
  const infoContent = document.getElementById('info-content');

  const reSlider = document.getElementById('re-slider');
  const imSlider = document.getElementById('im-slider');
  const iterSlider = document.getElementById('iter-slider');
  const speedSlider = document.getElementById('speed-slider');
  const colorSelect = document.getElementById('color-select');
  const orbitToggle = document.getElementById('orbit-toggle');
  const resetViewBtn = document.getElementById('reset-view');
  const toggleMinimapBtn = document.getElementById('toggle-minimap');
  const saveImageBtn = document.getElementById('save-image');
  const toggleInfoBtn = document.getElementById('toggle-info');
  const infoCloseBtn = document.getElementById('info-close');

  const cValueDisplay = document.getElementById('c-value');
  const reValueDisplay = document.getElementById('re-value');
  const imValueDisplay = document.getElementById('im-value');
  const iterValueDisplay = document.getElementById('iter-value');
  const speedValueDisplay = document.getElementById('speed-value');

  // --- Color Palettes ---
  const PALETTE_SIZE = 2048;
  const palette = new Uint8ClampedArray(PALETTE_SIZE * 3);

  const COLOR_SCHEMES = {
    ocean: [
      { pos: 0.0, r: 0, g: 7, b: 50 },
      { pos: 0.16, r: 32, g: 107, b: 203 },
      { pos: 0.42, r: 237, g: 255, b: 255 },
      { pos: 0.6425, r: 255, g: 170, b: 0 },
      { pos: 0.8575, r: 0, g: 2, b: 0 },
      { pos: 1.0, r: 0, g: 7, b: 50 },
    ],
    inferno: [
      { pos: 0.0, r: 0, g: 0, b: 4 },
      { pos: 0.2, r: 80, g: 18, b: 123 },
      { pos: 0.4, r: 182, g: 55, b: 84 },
      { pos: 0.6, r: 245, g: 125, b: 21 },
      { pos: 0.8, r: 252, g: 225, b: 56 },
      { pos: 1.0, r: 0, g: 0, b: 4 },
    ],
    emerald: [
      { pos: 0.0, r: 0, g: 12, b: 8 },
      { pos: 0.2, r: 0, g: 60, b: 40 },
      { pos: 0.4, r: 20, g: 180, b: 100 },
      { pos: 0.6, r: 200, g: 255, b: 220 },
      { pos: 0.8, r: 80, g: 120, b: 50 },
      { pos: 1.0, r: 0, g: 12, b: 8 },
    ],
    grayscale: [
      { pos: 0.0, r: 0, g: 0, b: 0 },
      { pos: 0.5, r: 255, g: 255, b: 255 },
      { pos: 1.0, r: 0, g: 0, b: 0 },
    ],
    psychedelic: [
      { pos: 0.0, r: 255, g: 0, b: 100 },
      { pos: 0.17, r: 255, g: 160, b: 0 },
      { pos: 0.33, r: 255, g: 255, b: 0 },
      { pos: 0.5, r: 0, g: 255, b: 80 },
      { pos: 0.67, r: 0, g: 100, b: 255 },
      { pos: 0.83, r: 180, g: 0, b: 255 },
      { pos: 1.0, r: 255, g: 0, b: 100 },
    ],
  };

  function buildPalette() {
    const stops = COLOR_SCHEMES[state.colorScheme];
    for (let i = 0; i < PALETTE_SIZE; i++) {
      const t = i / PALETTE_SIZE;
      let s0 = stops[0], s1 = stops[1];
      for (let j = 0; j < stops.length - 1; j++) {
        if (t >= stops[j].pos && t <= stops[j + 1].pos) {
          s0 = stops[j];
          s1 = stops[j + 1];
          break;
        }
      }
      const f = (t - s0.pos) / (s1.pos - s0.pos);
      const idx = i * 3;
      palette[idx] = s0.r + (s1.r - s0.r) * f;
      palette[idx + 1] = s0.g + (s1.g - s0.g) * f;
      palette[idx + 2] = s0.b + (s1.b - s0.b) * f;
    }
  }
  buildPalette();

  // --- Preset descriptions ---
  const PRESETS = {
    'Spiral': { re: -0.75, im: 0.11, desc: 'A classic spiral Julia set. The c value sits near the edge of the main cardioid of the Mandelbrot set, producing elegant spiral arms that repeat at every scale.' },
    'Dendrite': { re: 0, im: 1, desc: 'The Dendrite (or "lightning") Julia set. With c = i, the set forms a connected tree-like structure with infinitely branching filaments—no interior, just boundary.' },
    'Rabbit': { re: -0.123, im: 0.745, desc: 'The Douady Rabbit, named after mathematician Adrien Douady. This c value lies in the period-3 bulb of the Mandelbrot set, creating a fractal with three-fold rotational symmetry.' },
    'San Marco': { re: -0.75, im: 0, desc: 'Named for its resemblance to the San Marco basilica in Venice. This set lies along the real axis and features symmetric, cathedral-like arches.' },
    'Dragons': { re: 0.36, im: 0.1, desc: 'A dragon-curve-like Julia set. The c value produces swirling, flame-like tendrils reminiscent of mythical dragons.' },
    'Lightning': { re: -0.8, im: 0.156, desc: 'A Julia set with jagged, lightning-bolt boundaries. This c value creates highly irregular, electrically charged-looking fractal edges.' },
  };

  // --- Resize Handling ---
  const dpr = window.devicePixelRatio || 1;

  function resizeJuliaCanvas() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    juliaCanvas.width = w * dpr;
    juliaCanvas.height = h * dpr;
    juliaCanvas.style.width = w + 'px';
    juliaCanvas.style.height = h + 'px';
  }

  function resizeMandelCanvas() {
    const el = mandelCanvas;
    const w = parseInt(getComputedStyle(el).width);
    const h = parseInt(getComputedStyle(el).height);
    el.width = w * dpr;
    el.height = h * dpr;
  }

  // --- Rendering ---
  function renderJulia() {
    const w = juliaCanvas.width;
    const h = juliaCanvas.height;
    if (w === 0 || h === 0) return;

    const imageData = juliaCtx.createImageData(w, h);
    const data = imageData.data;
    const cRe = state.c.re;
    const cIm = state.c.im;
    const maxIter = state.maxIter;

    const aspect = w / h;
    const rangeY = 4.0 / state.viewport.zoom;
    const rangeX = rangeY * aspect;
    const xMin = state.viewport.centerX - rangeX / 2;
    const yMin = state.viewport.centerY - rangeY / 2;
    const dx = rangeX / w;
    const dy = rangeY / h;

    const log2 = Math.log(2);

    for (let py = 0; py < h; py++) {
      const zi = yMin + py * dy;
      for (let px = 0; px < w; px++) {
        let zr = xMin + px * dx;
        let zri = zi;

        let n = 0;
        let zr2 = zr * zr;
        let zi2 = zri * zri;

        while (zr2 + zi2 <= 4 && n < maxIter) {
          zri = 2 * zr * zri + cIm;
          zr = zr2 - zi2 + cRe;
          zr2 = zr * zr;
          zi2 = zri * zri;
          n++;
        }

        const idx = (py * w + px) * 4;

        if (n === maxIter) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          const smoothN = n - Math.log(Math.log(Math.sqrt(zr2 + zi2))) / log2;
          const colorIdx = ((smoothN * 20) % PALETTE_SIZE + PALETTE_SIZE) % PALETTE_SIZE;
          const ci = Math.floor(colorIdx) * 3;
          const ci2 = ((Math.floor(colorIdx) + 1) % PALETTE_SIZE) * 3;
          const frac = colorIdx - Math.floor(colorIdx);

          data[idx] = palette[ci] + (palette[ci2] - palette[ci]) * frac;
          data[idx + 1] = palette[ci + 1] + (palette[ci2 + 1] - palette[ci + 1]) * frac;
          data[idx + 2] = palette[ci + 2] + (palette[ci2 + 2] - palette[ci + 2]) * frac;
          data[idx + 3] = 255;
        }
      }
    }

    juliaCtx.putImageData(imageData, 0, 0);
    drawAxisLines();
  }

  function drawAxisLines() {
    const w = juliaCanvas.width;
    const h = juliaCanvas.height;
    const aspect = w / h;
    const rangeY = 4.0 / state.viewport.zoom;
    const rangeX = rangeY * aspect;
    const xMin = state.viewport.centerX - rangeX / 2;
    const yMin = state.viewport.centerY - rangeY / 2;

    juliaCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    juliaCtx.lineWidth = 1;

    const axisXpx = (-xMin / rangeX) * w;
    if (axisXpx >= 0 && axisXpx <= w) {
      juliaCtx.beginPath();
      juliaCtx.moveTo(axisXpx, 0);
      juliaCtx.lineTo(axisXpx, h);
      juliaCtx.stroke();
    }

    const axisYpx = (-yMin / rangeY) * h;
    if (axisYpx >= 0 && axisYpx <= h) {
      juliaCtx.beginPath();
      juliaCtx.moveTo(0, axisYpx);
      juliaCtx.lineTo(w, axisYpx);
      juliaCtx.stroke();
    }
  }

  function renderMandelbrot() {
    const w = mandelCanvas.width;
    const h = mandelCanvas.height;
    if (w === 0 || h === 0) return;

    const imageData = mandelCtx.createImageData(w, h);
    const data = imageData.data;
    const maxIter = state.maxIter;
    const log2 = Math.log(2);

    const xMin = -2, xMax = 2, yMin = -2, yMax = 2;
    const dx = (xMax - xMin) / w;
    const dy = (yMax - yMin) / h;

    for (let py = 0; py < h; py++) {
      const ci = yMin + py * dy;
      for (let px = 0; px < w; px++) {
        const cr = xMin + px * dx;
        let zr = 0, zi = 0;
        let n = 0;
        let zr2 = 0, zi2 = 0;

        while (zr2 + zi2 <= 4 && n < maxIter) {
          zi = 2 * zr * zi + ci;
          zr = zr2 - zi2 + cr;
          zr2 = zr * zr;
          zi2 = zi * zi;
          n++;
        }

        const idx = (py * w + px) * 4;

        if (n === maxIter) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        } else {
          const smoothN = n - Math.log(Math.log(Math.sqrt(zr2 + zi2))) / log2;
          const colorIdx = ((smoothN * 20) % PALETTE_SIZE + PALETTE_SIZE) % PALETTE_SIZE;
          const ci2 = Math.floor(colorIdx) * 3;
          const ci3 = ((Math.floor(colorIdx) + 1) % PALETTE_SIZE) * 3;
          const frac = colorIdx - Math.floor(colorIdx);

          data[idx] = palette[ci2] + (palette[ci3] - palette[ci2]) * frac;
          data[idx + 1] = palette[ci2 + 1] + (palette[ci3 + 1] - palette[ci2 + 1]) * frac;
          data[idx + 2] = palette[ci2 + 2] + (palette[ci3 + 2] - palette[ci2 + 2]) * frac;
          data[idx + 3] = 255;
        }
      }
    }

    mandelCtx.putImageData(imageData, 0, 0);
    state.minimap.dirty = false;
  }

  function updateMinimapCrosshair() {
    if (!state.minimap.visible) return;
    const w = parseInt(getComputedStyle(mandelCanvas).width);
    const h = parseInt(getComputedStyle(mandelCanvas).height);
    const px = ((state.c.re + 2) / 4) * w;
    const py = ((state.c.im + 2) / 4) * h;
    crosshair.style.left = px + 'px';
    crosshair.style.top = py + 'px';
  }

  // --- UI Update Helpers ---
  function formatComplex(re, im) {
    const reStr = re.toFixed(3);
    const sign = im >= 0 ? '+' : '\u2212';
    const imStr = Math.abs(im).toFixed(3);
    return `${reStr} ${sign} ${imStr}i`;
  }

  function updateCDisplay() {
    cValueDisplay.textContent = formatComplex(state.c.re, state.c.im);
    reValueDisplay.textContent = state.c.re.toFixed(3);
    imValueDisplay.textContent = state.c.im.toFixed(3);
    reSlider.value = state.c.re;
    imSlider.value = state.c.im;
    updateMinimapCrosshair();
    if (state.infoVisible) updateInfoPanel();
  }

  // --- Info Panel ---
  function getPresetName() {
    for (const [name, p] of Object.entries(PRESETS)) {
      if (Math.abs(state.c.re - p.re) < 0.002 && Math.abs(state.c.im - p.im) < 0.002) {
        return name;
      }
    }
    return null;
  }

  function updateInfoPanel() {
    const presetName = getPresetName();
    const mag = Math.sqrt(state.c.re * state.c.re + state.c.im * state.c.im);
    const connected = mag <= 2;

    let html = '';
    html += `<div class="info-row"><span class="info-label">c</span><span class="info-val">${formatComplex(state.c.re, state.c.im)}</span></div>`;
    html += `<div class="info-row"><span class="info-label">|c|</span><span class="info-val">${mag.toFixed(4)}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Zoom</span><span class="info-val">${state.viewport.zoom.toFixed(1)}x</span></div>`;
    html += `<div class="info-row"><span class="info-label">Iterations</span><span class="info-val">${state.maxIter}</span></div>`;
    html += `<div class="info-row"><span class="info-label">Palette</span><span class="info-val">${state.colorScheme}</span></div>`;

    if (presetName) {
      html += `<div class="info-row"><span class="info-label">Preset</span><span class="info-val">${presetName}</span></div>`;
    }

    html += '<div class="info-desc">';
    if (presetName && PRESETS[presetName]) {
      html += PRESETS[presetName].desc;
    } else {
      html += `This Julia set is generated by iterating z = z² + c for every point z in the complex plane. `;
      if (connected) {
        html += 'The current c value likely lies inside or near the Mandelbrot set, so this Julia set is connected (one piece).';
      } else {
        html += 'The current c value lies outside the Mandelbrot set, so this Julia set is totally disconnected — a fractal dust called a Fatou dust.';
      }
    }
    html += '</div>';

    infoContent.innerHTML = html;
  }

  // --- Pixel ↔ Complex Plane ---
  function pixelToComplex(px, py) {
    const w = juliaCanvas.width;
    const h = juliaCanvas.height;
    const aspect = w / h;
    const rangeY = 4.0 / state.viewport.zoom;
    const rangeX = rangeY * aspect;
    const xMin = state.viewport.centerX - rangeX / 2;
    const yMin = state.viewport.centerY - rangeY / 2;
    return {
      re: xMin + (px / w) * rangeX,
      im: yMin + (py / h) * rangeY,
    };
  }

  // --- Helper to stop orbit ---
  function stopOrbit() {
    if (state.orbit.active) {
      state.orbit.active = false;
      orbitToggle.textContent = '\u25B6 Orbit';
      orbitToggle.classList.remove('active');
    }
  }

  // --- Event Handlers ---

  // Slider: Re(c)
  reSlider.addEventListener('input', () => {
    state.c.re = parseFloat(reSlider.value);
    stopOrbit();
    updateCDisplay();
    requestRender();
  });

  // Slider: Im(c)
  imSlider.addEventListener('input', () => {
    state.c.im = parseFloat(imSlider.value);
    stopOrbit();
    updateCDisplay();
    requestRender();
  });

  // Slider: Iterations
  iterSlider.addEventListener('input', () => {
    state.maxIter = parseInt(iterSlider.value);
    iterValueDisplay.textContent = state.maxIter;
    state.minimap.dirty = true;
    requestRender();
  });

  // Slider: Speed
  speedSlider.addEventListener('input', () => {
    state.orbit.speed = parseFloat(speedSlider.value);
    speedValueDisplay.textContent = state.orbit.speed.toFixed(2);
  });

  // Color scheme selector
  colorSelect.addEventListener('change', () => {
    state.colorScheme = colorSelect.value;
    buildPalette();
    state.minimap.dirty = true;
    requestRender();
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.c.re = parseFloat(btn.dataset.re);
      state.c.im = parseFloat(btn.dataset.im);
      stopOrbit();
      // Reset view for presets
      state.viewport.centerX = 0;
      state.viewport.centerY = 0;
      state.viewport.zoom = 1;
      updateCDisplay();
      requestRender();

      // Highlight active preset
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Orbit toggle
  orbitToggle.addEventListener('click', () => {
    state.orbit.active = !state.orbit.active;
    if (state.orbit.active) {
      state.orbit.angle = Math.atan2(state.c.im, state.c.re);
      state.lastTimestamp = 0;
      orbitToggle.innerHTML = '\u23F8 Pause';
      orbitToggle.classList.add('active');
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      requestAnimationFrame(animationLoop);
    } else {
      orbitToggle.textContent = '\u25B6 Orbit';
      orbitToggle.classList.remove('active');
    }
  });

  // Reset view
  resetViewBtn.addEventListener('click', () => {
    state.viewport.centerX = 0;
    state.viewport.centerY = 0;
    state.viewport.zoom = 1;
    requestRender();
  });

  // Toggle minimap
  toggleMinimapBtn.addEventListener('click', () => {
    state.minimap.visible = !state.minimap.visible;
    if (state.minimap.visible) {
      minimapContainer.classList.remove('hidden');
      toggleMinimapBtn.classList.add('active');
      resizeMandelCanvas();
      if (state.minimap.dirty) renderMandelbrot();
      updateMinimapCrosshair();
    } else {
      minimapContainer.classList.add('hidden');
      toggleMinimapBtn.classList.remove('active');
    }
  });

  // Save image
  saveImageBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `julia_${state.c.re.toFixed(3)}_${state.c.im.toFixed(3)}.png`;
    link.href = juliaCanvas.toDataURL('image/png');
    link.click();
  });

  // Toggle info panel
  toggleInfoBtn.addEventListener('click', () => {
    state.infoVisible = !state.infoVisible;
    if (state.infoVisible) {
      infoPanel.classList.remove('hidden');
      toggleInfoBtn.classList.add('active');
      updateInfoPanel();
    } else {
      infoPanel.classList.add('hidden');
      toggleInfoBtn.classList.remove('active');
    }
  });

  infoCloseBtn.addEventListener('click', () => {
    state.infoVisible = false;
    infoPanel.classList.add('hidden');
    toggleInfoBtn.classList.remove('active');
  });

  // Click on minimap to set c
  mandelCanvas.addEventListener('click', (e) => {
    const rect = mandelCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    state.c.re = Math.max(-2, Math.min(2, (mx / w) * 4 - 2));
    state.c.im = Math.max(-2, Math.min(2, (my / h) * 4 - 2));
    stopOrbit();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateCDisplay();
    requestRender();
  });

  // Click on Julia canvas → show tooltip
  let tooltipTimeout = null;
  juliaCanvas.addEventListener('click', (e) => {
    if (state.dragging) return;
    const rect = juliaCanvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    const z = pixelToComplex(px, py);

    tooltip.textContent = `z = ${formatComplex(z.re, z.im)}`;
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 24) + 'px';
    tooltip.classList.remove('hidden');
    tooltip.classList.add('visible');

    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltip.classList.remove('visible');
      tooltip.classList.add('hidden');
    }, 2000);
  });

  // Pan: mouse drag
  let didDrag = false;
  juliaCanvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    state.dragging = true;
    didDrag = false;
    state.dragStart.x = e.clientX;
    state.dragStart.y = e.clientY;
    state.dragViewStart.centerX = state.viewport.centerX;
    state.dragViewStart.centerY = state.viewport.centerY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.dragging) return;
    didDrag = true;
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;
    const w = juliaCanvas.width;
    const h = juliaCanvas.height;
    const aspect = w / h;
    const rangeY = 4.0 / state.viewport.zoom;
    const rangeX = rangeY * aspect;

    state.viewport.centerX = state.dragViewStart.centerX - (dx * dpr / w) * rangeX;
    state.viewport.centerY = state.dragViewStart.centerY - (dy * dpr / h) * rangeY;
    requestRender();
  });

  window.addEventListener('mouseup', () => {
    if (state.dragging && didDrag) {
      setTimeout(() => { state.dragging = false; }, 10);
    } else {
      state.dragging = false;
    }
  });

  // Zoom: wheel
  juliaCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = state.viewport.zoom * zoomFactor;

    if (newZoom < 0.5 || newZoom > 1e13) return;

    const rect = juliaCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const z = pixelToComplex(mx, my);

    state.viewport.centerX = z.re + (state.viewport.centerX - z.re) / zoomFactor;
    state.viewport.centerY = z.im + (state.viewport.centerY - z.im) / zoomFactor;
    state.viewport.zoom = newZoom;

    requestRender();
  }, { passive: false });

  // Touch: pinch-to-zoom and pan
  let touches = [];
  let lastPinchDist = 0;
  let lastTouchCenter = { x: 0, y: 0 };

  juliaCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touches = Array.from(e.touches);
    if (touches.length === 1) {
      state.dragging = true;
      didDrag = false;
      state.dragStart.x = touches[0].clientX;
      state.dragStart.y = touches[0].clientY;
      state.dragViewStart.centerX = state.viewport.centerX;
      state.dragViewStart.centerY = state.viewport.centerY;
    } else if (touches.length === 2) {
      lastPinchDist = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      );
      lastTouchCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }
  }, { passive: false });

  juliaCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const curTouches = Array.from(e.touches);

    if (curTouches.length === 1 && state.dragging) {
      didDrag = true;
      const dx = curTouches[0].clientX - state.dragStart.x;
      const dy = curTouches[0].clientY - state.dragStart.y;
      const w = juliaCanvas.width;
      const h = juliaCanvas.height;
      const aspect = w / h;
      const rangeY = 4.0 / state.viewport.zoom;
      const rangeX = rangeY * aspect;
      state.viewport.centerX = state.dragViewStart.centerX - (dx * dpr / w) * rangeX;
      state.viewport.centerY = state.dragViewStart.centerY - (dy * dpr / h) * rangeY;
      requestRender();
    } else if (curTouches.length === 2) {
      const dist = Math.hypot(
        curTouches[1].clientX - curTouches[0].clientX,
        curTouches[1].clientY - curTouches[0].clientY
      );
      const center = {
        x: (curTouches[0].clientX + curTouches[1].clientX) / 2,
        y: (curTouches[0].clientY + curTouches[1].clientY) / 2,
      };

      if (lastPinchDist > 0) {
        const zoomFactor = dist / lastPinchDist;
        const newZoom = state.viewport.zoom * zoomFactor;
        if (newZoom >= 0.5 && newZoom <= 1e13) {
          const rect = juliaCanvas.getBoundingClientRect();
          const mx = (center.x - rect.left) * dpr;
          const my = (center.y - rect.top) * dpr;
          const z = pixelToComplex(mx, my);

          state.viewport.centerX = z.re + (state.viewport.centerX - z.re) / zoomFactor;
          state.viewport.centerY = z.im + (state.viewport.centerY - z.im) / zoomFactor;
          state.viewport.zoom = newZoom;
        }
      }

      lastPinchDist = dist;
      lastTouchCenter = center;
      requestRender();
    }
  }, { passive: false });

  juliaCanvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    state.dragging = false;
    touches = Array.from(e.touches);
    lastPinchDist = 0;
  }, { passive: false });

  // Window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeJuliaCanvas();
      requestRender();
      if (state.minimap.visible) {
        resizeMandelCanvas();
        renderMandelbrot();
        updateMinimapCrosshair();
      }
    }, 100);
  });

  // --- Animation Loop (orbit) ---
  function animationLoop(timestamp) {
    if (!state.orbit.active) return;

    if (state.lastTimestamp === 0) {
      state.lastTimestamp = timestamp;
    }

    const dt = (timestamp - state.lastTimestamp) / 1000;
    state.lastTimestamp = timestamp;

    state.orbit.angle += state.orbit.speed * dt;
    state.c.re = state.orbit.radius * Math.cos(state.orbit.angle);
    state.c.im = state.orbit.radius * Math.sin(state.orbit.angle);

    updateCDisplay();
    renderJulia();

    if (state.minimap.visible) {
      updateMinimapCrosshair();
    }

    requestAnimationFrame(animationLoop);
  }

  // --- Render Scheduling ---
  let renderPending = false;

  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderJulia();
      if (state.minimap.visible && state.minimap.dirty) {
        renderMandelbrot();
      }
      if (state.minimap.visible) {
        updateMinimapCrosshair();
      }
    });
  }

  // --- Slider Tooltips ---
  const sliderTooltip = document.getElementById('slider-tooltip');
  const sliderRows = document.querySelectorAll('.slider-row[data-tooltip]');

  sliderRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      sliderTooltip.textContent = row.dataset.tooltip;
      sliderTooltip.style.opacity = '1';
    });

    row.addEventListener('mousemove', (e) => {
      const rect = row.getBoundingClientRect();
      const tipWidth = sliderTooltip.offsetWidth;
      const margin = 8;

      let left = rect.left + rect.width / 2 - tipWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tipWidth - margin));

      sliderTooltip.style.left = left + 'px';
      sliderTooltip.style.top = (rect.top - sliderTooltip.offsetHeight - 8) + 'px';
    });

    row.addEventListener('mouseleave', () => {
      sliderTooltip.style.opacity = '0';
    });
  });

  // --- Init ---
  resizeJuliaCanvas();
  updateCDisplay();
  renderJulia();
})();
