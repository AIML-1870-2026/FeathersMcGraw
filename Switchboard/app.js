'use strict';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const apiKeyInput      = document.getElementById('api-key');
const modelSelect      = document.getElementById('model-select');
const toggleStructured = document.getElementById('toggle-structured');
const schemaPanel      = document.getElementById('schema-panel');
const promptTA         = document.getElementById('prompt-textarea');
const schemaTA         = document.getElementById('schema-textarea');
const schemaSelect     = document.getElementById('schema-select');
const sendBtn          = document.getElementById('send-btn');
const responseOutput   = document.getElementById('response-output');
const keyWarn          = document.getElementById('key-warn');

const statTokens  = document.getElementById('stat-tokens');
const statLatency = document.getElementById('stat-latency');
const statMode    = document.getElementById('stat-mode');
const statModel   = document.getElementById('stat-model');


// ── Schema templates ──────────────────────────────────────────────────────────
const SCHEMAS = {
  entities: JSON.stringify({
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
  }, null, 2),

  sentiment: JSON.stringify({
    type: 'object',
    properties: {
      sentiment:  { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasoning:  { type: 'string' }
    },
    required: ['sentiment', 'confidence', 'reasoning']
  }, null, 2),

  product: JSON.stringify({
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
  }, null, 2),

  summary: JSON.stringify({
    type: 'object',
    properties: {
      headline:   { type: 'string' },
      summary:    { type: 'string' },
      key_points: { type: 'array', items: { type: 'string' } },
      source:     { type: 'string' }
    },
    required: ['headline', 'summary', 'key_points', 'source']
  }, null, 2)
};

// ── Preset prompt text ────────────────────────────────────────────────────────
const PRESETS = {
  summary: {
    prompt: `Here is a news article. Please summarize it.\n\n[Paste your article text here]`,
    schema: 'summary'
  },
  entities: {
    prompt: `Extract all named entities (people, organizations, locations, dates, products) from the following text:\n\n[Paste your text here]`,
    schema: 'entities'
  },
  sentiment: {
    prompt: `Classify the sentiment of the following customer review:\n\n[Paste your review here]`,
    schema: 'sentiment'
  },
  product: {
    prompt: `Generate a sample product catalog with 3 example products across different categories.`,
    schema: 'product'
  }
};

// ── State ─────────────────────────────────────────────────────────────────────
let isLoading = false;

// ── Structured mode toggle ────────────────────────────────────────────────────
toggleStructured.addEventListener('change', () => {
  schemaPanel.style.display = toggleStructured.checked ? '' : 'none';
});

// ── Schema select → populate schema textarea ──────────────────────────────────
schemaSelect.addEventListener('change', () => {
  const key = schemaSelect.value;
  if (key && SCHEMAS[key]) {
    schemaTA.value = SCHEMAS[key];
    if (toggleStructured.checked) schemaTA.scrollTop = 0;
  }
});

// ── Preset buttons ────────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    promptTA.value = preset.prompt;
    schemaTA.value = SCHEMAS[preset.schema] || '';
    schemaSelect.value = preset.schema;
    // Auto-enable structured mode for these presets
    if (!toggleStructured.checked) {
      toggleStructured.checked = true;
      schemaPanel.style.display = '';
    }
    promptTA.focus();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setStatus({ tokens = '—', latency = '—', mode = '—', model = '—' } = {}) {
  statTokens.textContent  = `tokens: ${tokens}`;
  statLatency.textContent = `latency: ${latency}`;
  statMode.textContent    = `mode: ${mode}`;
  statModel.textContent   = `model: ${model}`;
}

function showLoading() {
  responseOutput.innerHTML = '';
  responseOutput.classList.add('cursor-blink');
}

function showResponse(text) {
  responseOutput.classList.remove('cursor-blink');
  responseOutput.textContent = text;
}

function showError(msg) {
  responseOutput.classList.remove('cursor-blink');
  responseOutput.innerHTML = `<span class="error-text">[error] ${escapeHtml(msg)}</span>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  if (state) showLoading();
}

// ── Send ──────────────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', send);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
});

async function send() {
  if (isLoading) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    keyWarn.classList.add('visible');
    apiKeyInput.focus();
    setTimeout(() => keyWarn.classList.remove('visible'), 2500);
    return;
  }

  keyWarn.classList.remove('visible');

  const prompt     = promptTA.value.trim();
  const model      = modelSelect.value;
  const structured = toggleStructured.checked;
  const schemaText = schemaTA.value.trim();
  const t0         = Date.now();

  setLoading(true);
  setStatus();

  try {
    const messages = [];

    if (structured) {
      messages.push({
        role: 'system',
        content: 'Respond only with valid JSON matching the provided schema.'
      });
      messages.push({
        role: 'user',
        content: schemaText
          ? `Schema: ${schemaText}\n\nPrompt: ${prompt}`
          : prompt
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const body = {
      model,
      messages
    };

    if (structured) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const latencyMs = Date.now() - t0;
    const latencyStr = (latencyMs / 1000).toFixed(2) + 's';

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}`;
      showError(msg);
      setLoading(false);
      return;
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content ?? '';
    const tokens = data?.usage?.total_tokens ?? '—';

    if (structured) {
      try {
        const parsed = JSON.parse(rawContent);
        showResponse(JSON.stringify(parsed, null, 2));
      } catch {
        responseOutput.classList.remove('cursor-blink');
        responseOutput.innerHTML =
          `<span class="parse-warn">[parse error — raw output shown]</span>\n${escapeHtml(rawContent)}`;
      }
    } else {
      showResponse(rawContent);
    }

    setStatus({
      tokens:  tokens,
      latency: latencyStr,
      mode:    structured ? 'structured' : 'unstructured',
      model:   model
    });

  } catch (err) {
    showError(err.message || 'Network error');
  } finally {
    setLoading(false);
  }
}
