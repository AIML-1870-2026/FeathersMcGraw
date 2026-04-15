'use strict';

// ── API key (in-memory only, never persisted) ─────────────────────────────────
let apiKey = '';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const modelSelect         = document.getElementById('model-select');      // left panel (single mode)
const modelSelectA        = document.getElementById('model-select-a');   // compare strip model A
const modelBSelect        = document.getElementById('model-b-select');   // compare strip model B
const compareConfigStrip  = document.getElementById('compare-config-strip');
const toggleCompare       = document.getElementById('toggle-compare');
const toggleStructured = document.getElementById('toggle-structured');
const schemaPanel      = document.getElementById('schema-panel');
const promptTA         = document.getElementById('prompt-textarea');
const schemaTA         = document.getElementById('schema-textarea');
const schemaSelect     = document.getElementById('schema-select');
const sendBtn          = document.getElementById('send-btn');
const mainGrid         = document.getElementById('main-grid');

// Single view
const singleView      = document.getElementById('single-view');
const responseOutput  = document.getElementById('response-output');
const statTokens      = document.getElementById('stat-tokens');
const statLatency     = document.getElementById('stat-latency');
const statMode        = document.getElementById('stat-mode');
const statModel       = document.getElementById('stat-model');
const statChars       = document.getElementById('stat-chars');

// Compare view
const compareView     = document.getElementById('compare-view');
const cmpLabelA       = document.getElementById('cmp-label-a');
const cmpLabelB       = document.getElementById('cmp-label-b');
const cmpOutputA      = document.getElementById('cmp-output-a');
const cmpOutputB      = document.getElementById('cmp-output-b');
const cmpStatusA      = document.getElementById('cmp-status-a');
const cmpStatusB      = document.getElementById('cmp-status-b');
const cmpTokensA      = document.getElementById('cmp-tokens-a');
const cmpLatencyA     = document.getElementById('cmp-latency-a');
const cmpCharsA       = document.getElementById('cmp-chars-a');
const cmpTokensB      = document.getElementById('cmp-tokens-b');
const cmpLatencyB     = document.getElementById('cmp-latency-b');
const cmpCharsB       = document.getElementById('cmp-chars-b');
const cmpMode         = document.getElementById('cmp-mode');

// Validator
const validatorPanel  = document.getElementById('validator-panel');
const validatorOutput = document.getElementById('validator-output');

// Metrics
const metCalls   = document.getElementById('met-calls');
const metLatency = document.getElementById('met-latency');
const metTokens  = document.getElementById('met-tokens');
const metChars   = document.getElementById('met-chars');
const metModelsRow = document.getElementById('met-models-row');
const metModels    = document.getElementById('met-models');

// Library
const libNameInput = document.getElementById('lib-name-input');
const libSaveBtn   = document.getElementById('lib-save-btn');
const libList      = document.getElementById('lib-list');

// ── Key loading ───────────────────────────────────────────────────────────────
const keyFileInput = document.getElementById('key-file-input');
const apiKeyInput  = document.getElementById('api-key-input');
const keyStatus    = document.getElementById('key-status');
const keyWarn      = document.getElementById('key-warn');

function extractKey(text) {
  const envMatch = text.match(/OPENAI_API_KEY\s*=\s*["']?([^\s"'\r\n]+)["']?/i);
  if (envMatch) return envMatch[1];
  const skMatch = text.match(/\bsk-[A-Za-z0-9_-]+/);
  return skMatch ? skMatch[0] : null;
}
function setKeyStatus(type, msg) {
  keyStatus.textContent = msg;
  keyStatus.className = 'key-status' + (type ? ' ' + type : '');
}

keyFileInput.addEventListener('change', () => {
  const file = keyFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const found = extractKey(e.target.result);
    if (found) { apiKey = found; apiKeyInput.value = ''; setKeyStatus('ok', '✓ Key loaded'); }
    else        { setKeyStatus('err', '✗ No key found'); }
    keyFileInput.value = '';
  };
  reader.readAsText(file);
});

apiKeyInput.addEventListener('input', () => {
  const val = apiKeyInput.value.trim();
  apiKey = val;
  setKeyStatus(val ? 'ok' : '', val ? '✓ Key ready' : '');
});

// ── Schema templates ──────────────────────────────────────────────────────────
const SCHEMAS = {
  entities: {
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' }
          },
          required: ['name', 'type']
        }
      }
    },
    required: ['entities']
  },
  sentiment: {
    type: 'object',
    properties: {
      sentiment:  { type: 'string' },
      confidence: { type: 'number' },
      reasoning:  { type: 'string' }
    },
    required: ['sentiment', 'confidence', 'reasoning']
  },
  product: {
    type: 'object',
    properties: {
      products: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:     { type: 'string' },
            price:    { type: 'number' },
            category: { type: 'string' },
            in_stock: { type: 'boolean' }
          },
          required: ['name', 'price', 'category', 'in_stock']
        }
      }
    },
    required: ['products']
  },
  summary: {
    type: 'object',
    properties: {
      headline:   { type: 'string' },
      summary:    { type: 'string' },
      key_points: { type: 'array', items: { type: 'string' } },
      source:     { type: 'string' }
    },
    required: ['headline', 'summary', 'key_points', 'source']
  }
};

const SCHEMAS_STR = Object.fromEntries(
  Object.entries(SCHEMAS).map(([k, v]) => [k, JSON.stringify(v, null, 2)])
);

// ── Preset prompts ────────────────────────────────────────────────────────────
const PRESETS = {
  summary:  { prompt: 'Here is a news article. Please summarize it.\n\n[Paste your article text here]', schema: 'summary' },
  entities: { prompt: 'Extract all named entities (people, organizations, locations, dates, products) from the following text:\n\n[Paste your text here]', schema: 'entities' },
  sentiment:{ prompt: 'Classify the sentiment of the following customer review:\n\n[Paste your review here]', schema: 'sentiment' },
  product:  { prompt: 'Generate a sample product catalog with 3 example products across different categories.', schema: 'product' }
};

// ── Session metrics store ─────────────────────────────────────────────────────
const metricsLog = []; // { model, latencyMs, tokens, chars }

// ── Prompt library store (in-memory) ─────────────────────────────────────────
const promptLibrary = []; // { id, name, prompt, schema }
let libIdCounter = 0;

// ── State ─────────────────────────────────────────────────────────────────────
let isLoading = false;

// ── Compare mode toggle ───────────────────────────────────────────────────────
toggleCompare.addEventListener('change', () => {
  const on = toggleCompare.checked;
  mainGrid.classList.toggle('compare-wide', on);
  compareConfigStrip.style.display = on ? '' : 'none';
  singleView.style.display         = on ? 'none' : '';
  compareView.style.display        = on ? '' : 'none';
  validatorPanel.style.display     = 'none';
  if (on) syncCompareLabelA();
});

// Keep Model A label in compare pane in sync with the strip selector
function syncCompareLabelA() {
  cmpLabelA.textContent = modelSelectA.value;
}
function syncCompareLabelB() {
  cmpLabelB.textContent = modelBSelect.value;
}

modelSelectA.addEventListener('change', syncCompareLabelA);
modelBSelect.addEventListener('change', syncCompareLabelB);

// ── Structured mode toggle ────────────────────────────────────────────────────
toggleStructured.addEventListener('change', () => {
  schemaPanel.style.display = toggleStructured.checked ? '' : 'none';
  if (!toggleStructured.checked) validatorPanel.style.display = 'none';
});

// ── Schema select → populate textarea ────────────────────────────────────────
schemaSelect.addEventListener('change', () => {
  const key = schemaSelect.value;
  if (key && SCHEMAS_STR[key]) schemaTA.value = SCHEMAS_STR[key];
});

// ── Preset buttons ────────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    promptTA.value = preset.prompt;
    schemaTA.value = SCHEMAS_STR[preset.schema] || '';
    schemaSelect.value = preset.schema;
    if (!toggleStructured.checked) {
      toggleStructured.checked = true;
      schemaPanel.style.display = '';
    }
    promptTA.focus();
  });
});

// ── Prompt Library ────────────────────────────────────────────────────────────
libSaveBtn.addEventListener('click', savePrompt);
libNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') savePrompt(); });

function savePrompt() {
  const name = libNameInput.value.trim() ||
    (promptTA.value.trim().slice(0, 36) + (promptTA.value.trim().length > 36 ? '…' : '')) ||
    'untitled';
  const entry = {
    id: ++libIdCounter,
    name,
    prompt: promptTA.value,
    schema: schemaTA.value
  };
  promptLibrary.unshift(entry);
  libNameInput.value = '';
  renderLibrary();
}

function loadPrompt(id) {
  const entry = promptLibrary.find(e => e.id === id);
  if (!entry) return;
  promptTA.value = entry.prompt;
  schemaTA.value = entry.schema;
  if (entry.schema && !toggleStructured.checked) {
    toggleStructured.checked = true;
    schemaPanel.style.display = '';
  }
  promptTA.focus();
}

function deletePrompt(id) {
  const idx = promptLibrary.findIndex(e => e.id === id);
  if (idx !== -1) promptLibrary.splice(idx, 1);
  renderLibrary();
}

function renderLibrary() {
  if (promptLibrary.length === 0) {
    libList.innerHTML = '<div class="lib-empty">no saved prompts yet</div>';
    return;
  }
  libList.innerHTML = promptLibrary.map(entry => `
    <div class="lib-item">
      <span class="lib-item-name" title="${escapeHtml(entry.prompt)}">${escapeHtml(entry.name)}</span>
      <button class="lib-btn" onclick="loadPrompt(${entry.id})">LOAD</button>
      <button class="lib-btn del-btn" onclick="deletePrompt(${entry.id})">DEL</button>
    </div>
  `).join('');
}

// ── Session Metrics ───────────────────────────────────────────────────────────
function recordMetric({ model, latencyMs, tokens, chars }) {
  metricsLog.push({ model, latencyMs, tokens, chars });
  updateMetricsDisplay();
}

function updateMetricsDisplay() {
  const n = metricsLog.length;
  metCalls.textContent = n;

  const avgLatency = metricsLog.reduce((s, e) => s + e.latencyMs, 0) / n;
  metLatency.textContent = (avgLatency / 1000).toFixed(2) + 's';

  const withTokens = metricsLog.filter(e => typeof e.tokens === 'number');
  metTokens.textContent = withTokens.length
    ? Math.round(withTokens.reduce((s, e) => s + e.tokens, 0) / withTokens.length)
    : '—';

  metChars.textContent = Math.round(metricsLog.reduce((s, e) => s + e.chars, 0) / n);

  const modelSet = [...new Set(metricsLog.map(e => e.model))];
  if (modelSet.length > 1) {
    metModelsRow.style.display = '';
    metModels.textContent = modelSet.join(', ');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setElLoading(el) {
  el.innerHTML = '';
  el.classList.add('cursor-blink');
}

function setElContent(el, text) {
  el.classList.remove('cursor-blink');
  el.textContent = text;
}

function setElError(el, msg) {
  el.classList.remove('cursor-blink');
  el.innerHTML = `<span class="error-text">[error] ${escapeHtml(msg)}</span>`;
}

function setElParseError(el, raw) {
  el.classList.remove('cursor-blink');
  el.innerHTML = `<span class="parse-warn">[parse error — raw output shown]</span>\n${escapeHtml(raw)}`;
}

function latencyStr(ms) { return (ms / 1000).toFixed(2) + 's'; }

// ── API call ──────────────────────────────────────────────────────────────────
async function callOpenAI(apiKey, model, prompt, structured, schemaText) {
  const t0 = Date.now();
  const messages = [];

  if (structured) {
    messages.push({ role: 'system', content: 'Respond only with valid JSON matching the provided schema.' });
    messages.push({ role: 'user', content: schemaText ? `Schema: ${schemaText}\n\nPrompt: ${prompt}` : prompt });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const body = { model, messages };
  if (structured) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { latencyMs });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  const tokens  = data?.usage?.total_tokens ?? null;

  return { content, tokens, latencyMs };
}

// ── Render response (handles structured parse + return parsed obj) ─────────────
function renderResponse(el, content, structured) {
  if (structured) {
    try {
      const parsed = JSON.parse(content);
      setElContent(el, JSON.stringify(parsed, null, 2));
      return parsed;
    } catch {
      setElParseError(el, content);
      return null;
    }
  } else {
    setElContent(el, content);
    return null;
  }
}

// ── Schema Validator ──────────────────────────────────────────────────────────
function getJsonType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function validateNode(schema, data, path, findings) {
  if (!schema || typeof schema !== 'object') return;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return;

  const props    = schema.properties || {};
  const required = schema.required   || [];

  // Check required fields presence
  for (const key of required) {
    if (!(key in data)) {
      findings.push({ path: path ? `${path}.${key}` : key, status: 'missing', expected: props[key]?.type || '?' });
    }
  }

  // Check each property in schema
  for (const [key, propSchema] of Object.entries(props)) {
    const fieldPath = path ? `${path}.${key}` : key;
    if (!(key in data)) continue; // already reported if required

    const val          = data[key];
    const expectedType = propSchema.type;
    const actualType   = getJsonType(val);

    if (expectedType && actualType !== expectedType) {
      findings.push({ path: fieldPath, status: 'wrong-type', expected: expectedType, actual: actualType });
    } else {
      findings.push({ path: fieldPath, status: 'ok', expected: expectedType, actual: actualType });
      // Recurse into nested objects
      if (expectedType === 'object' && propSchema.properties) {
        validateNode(propSchema, val, fieldPath, findings);
      }
      // Check array items
      if (expectedType === 'array' && propSchema.items && Array.isArray(val)) {
        const itemSchema = propSchema.items;
        if (itemSchema.type === 'object' && itemSchema.properties) {
          val.forEach((item, i) => validateNode(itemSchema, item, `${fieldPath}[${i}]`, findings));
        } else if (itemSchema.type) {
          val.forEach((item, i) => {
            const aType = getJsonType(item);
            if (aType !== itemSchema.type) {
              findings.push({ path: `${fieldPath}[${i}]`, status: 'wrong-type', expected: itemSchema.type, actual: aType });
            } else {
              findings.push({ path: `${fieldPath}[${i}]`, status: 'ok', expected: itemSchema.type, actual: aType });
            }
          });
        }
      }
    }
  }

  // Extra fields not in schema
  for (const key of Object.keys(data)) {
    if (!(key in props)) {
      findings.push({ path: path ? `${path}.${key}` : key, status: 'extra' });
    }
  }
}

function runValidator(parsedData, schemaText) {
  let schema;
  try { schema = JSON.parse(schemaText); } catch { return; }
  if (!schema || typeof schema !== 'object') return;

  const findings = [];
  validateNode(schema, parsedData, '', findings);
  renderValidatorFindings(findings);
  validatorPanel.style.display = '';
}

function renderValidatorFindings(findings) {
  if (findings.length === 0) {
    validatorOutput.innerHTML = '<div class="validator-summary">no fields to validate</div>';
    return;
  }

  const ok       = findings.filter(f => f.status === 'ok').length;
  const missing  = findings.filter(f => f.status === 'missing').length;
  const wrongType= findings.filter(f => f.status === 'wrong-type').length;
  const extra    = findings.filter(f => f.status === 'extra').length;

  const summaryParts = [];
  if (ok)        summaryParts.push(`${ok} matched`);
  if (missing)   summaryParts.push(`${missing} missing`);
  if (wrongType) summaryParts.push(`${wrongType} wrong type`);
  if (extra)     summaryParts.push(`${extra} extra`);

  const rows = findings.map(f => {
    let detail = '';
    if (f.status === 'ok')         detail = `<span class="v-detail">${f.expected}</span>`;
    if (f.status === 'missing')    detail = `<span class="v-detail">expected ${f.expected}</span>`;
    if (f.status === 'wrong-type') detail = `<span class="v-detail">expected ${f.expected}, got ${f.actual}</span>`;
    if (f.status === 'extra')      detail = `<span class="v-detail">not in schema</span>`;

    return `<div class="v-row v-${f.status}">
      <span class="v-icon"></span>
      <span class="v-path">${escapeHtml(f.path)}</span>
      <span class="v-badge">${f.status}</span>
      ${detail}
    </div>`;
  }).join('');

  validatorOutput.innerHTML =
    `<div class="validator-summary">${summaryParts.join(' · ')}</div>` + rows;
}

// ── Send ──────────────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', send);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
});

async function send() {
  if (isLoading) return;

  if (!apiKey) {
    keyWarn.classList.add('visible');
    setTimeout(() => keyWarn.classList.remove('visible'), 2500);
    return;
  }

  const prompt     = promptTA.value.trim();
  const compare    = toggleCompare.checked;
  // In compare mode, model A comes from the strip selector; otherwise from the left panel
  const modelA     = compare ? modelSelectA.value : modelSelect.value;
  const modelB     = modelBSelect.value;
  const structured = toggleStructured.checked;
  const schemaText = schemaTA.value.trim();

  isLoading = true;
  sendBtn.disabled = true;
  validatorPanel.style.display = 'none';

  if (compare) {
    // ── Compare mode ──────────────────────────────────────────────────────────
    singleView.style.display  = 'none';
    compareView.style.display = '';
    cmpLabelA.textContent = modelA;
    cmpLabelB.textContent = modelB;
    setElLoading(cmpOutputA);
    setElLoading(cmpOutputB);
    cmpStatusA.querySelectorAll('span').forEach(s => s.textContent = s.textContent.split(':')[0] + ': —');
    cmpStatusB.querySelectorAll('span').forEach(s => s.textContent = s.textContent.split(':')[0] + ': —');
    cmpMode.textContent = `mode: ${structured ? 'structured' : 'unstructured'}`;

    const [resultA, resultB] = await Promise.allSettled([
      callOpenAI(apiKey, modelA, prompt, structured, schemaText),
      callOpenAI(apiKey, modelB, prompt, structured, schemaText)
    ]);

    // Pane A
    if (resultA.status === 'fulfilled') {
      const { content, tokens, latencyMs } = resultA.value;
      renderResponse(cmpOutputA, content, structured);
      const chars = content.length;
      cmpTokensA.textContent  = `tokens: ${tokens ?? '—'}`;
      cmpLatencyA.textContent = `latency: ${latencyStr(latencyMs)}`;
      cmpCharsA.textContent   = `chars: ${chars}`;
      recordMetric({ model: modelA, latencyMs, tokens, chars });
    } else {
      setElError(cmpOutputA, resultA.reason.message);
    }

    // Pane B
    if (resultB.status === 'fulfilled') {
      const { content, tokens, latencyMs } = resultB.value;
      renderResponse(cmpOutputB, content, structured);
      const chars = content.length;
      cmpTokensB.textContent  = `tokens: ${tokens ?? '—'}`;
      cmpLatencyB.textContent = `latency: ${latencyStr(latencyMs)}`;
      cmpCharsB.textContent   = `chars: ${chars}`;
      recordMetric({ model: modelB, latencyMs, tokens, chars });
    } else {
      setElError(cmpOutputB, resultB.reason.message);
    }

  } else {
    // ── Single mode ───────────────────────────────────────────────────────────
    singleView.style.display  = '';
    compareView.style.display = 'none';
    setElLoading(responseOutput);
    [statTokens, statLatency, statMode, statModel, statChars].forEach(s => {
      s.textContent = s.textContent.split(':')[0] + ': —';
    });

    try {
      const { content, tokens, latencyMs } = await callOpenAI(apiKey, modelA, prompt, structured, schemaText);
      const chars = content.length;
      const parsed = renderResponse(responseOutput, content, structured);

      statTokens.textContent  = `tokens: ${tokens ?? '—'}`;
      statLatency.textContent = `latency: ${latencyStr(latencyMs)}`;
      statMode.textContent    = `mode: ${structured ? 'structured' : 'unstructured'}`;
      statModel.textContent   = `model: ${modelA}`;
      statChars.textContent   = `chars: ${chars}`;

      recordMetric({ model: modelA, latencyMs, tokens, chars });

      // Run validator if structured mode and we have parsed JSON + a schema
      if (structured && parsed !== null && schemaText) {
        runValidator(parsed, schemaText);
      }
    } catch (err) {
      setElError(responseOutput, err.message || 'Network error');
    }
  }

  isLoading = false;
  sendBtn.disabled = false;
}
