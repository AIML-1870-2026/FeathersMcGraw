let _apiKey = '';

function setApiKey(key) { _apiKey = key; }
function getApiKey()    { return _apiKey; }

const SYSTEM_PROMPT = `You are a Blackjack strategy expert. You will be given the current game state and must respond with a JSON object only — no prose, no markdown, no explanation outside the JSON fields.

Respond with exactly this shape:
{
  "action": "hit" | "stand",
  "confidence": 0.0–1.0,
  "brief_reason": "one sentence",
  "full_analysis": "2–3 sentences of statistical reasoning",
  "basic_strategy_agrees": true | false
}`;

function _buildUserMessage({ playerHand, dealerUpCard, playerTotal, isSoft, riskProfile }) {
  const handStr = playerHand
    .filter(c => !c.faceDown)
    .map(c => `${c.rank}${c.suit}`)
    .join(', ');
  return `Player hand: [${handStr}], total: ${playerTotal} (${isSoft ? 'soft' : 'hard'})
Dealer up card: ${dealerUpCard.rank}${dealerUpCard.suit}
Risk profile: ${riskProfile}`;
}

async function callBlackjackAgent(gameState) {
  if (!_apiKey) throw new Error('No API key loaded. Upload a .env file first.');

  const model = gameState.model || 'gpt-4o-mini';
  const userMessage = _buildUserMessage(gameState);

  console.log('[BLACKJACK AGENT] --- New LLM Call ---');
  console.log('Model:', model);
  console.log('Game state:', {
    playerHand: gameState.playerHand.filter(c => !c.faceDown).map(c => `${c.rank}${c.suit}`),
    dealerUpCard: `${gameState.dealerUpCard.rank}${gameState.dealerUpCard.suit}`,
    playerTotal: gameState.playerTotal,
    riskProfile: gameState.riskProfile,
  });

  const isO1 = model.startsWith('o1');
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage   },
    ],
  };
  if (!isO1) body.response_format = { type: 'json_object' };

  let resp;
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (_) {
    throw new Error('Network error. Check your connection and try again.');
  }

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { const e = await resp.json(); msg = e?.error?.message || msg; } catch (_) {}
    if (resp.status === 401) throw new Error('Invalid API key. Check platform.openai.com/api-keys');
    if (resp.status === 429) throw new Error('Rate limit exceeded. Check platform.openai.com/usage');
    throw new Error(msg);
  }

  const data = await resp.json();
  const rawText = data?.choices?.[0]?.message?.content ?? '';
  console.log('[BLACKJACK AGENT] Raw response:', rawText);

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_) {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); }
      catch (_2) {
        console.error('[BLACKJACK AGENT] JSON parse error. Raw:', rawText);
        throw new Error('Could not parse recommendation. Please try again.');
      }
    } else {
      console.error('[BLACKJACK AGENT] No JSON found. Raw:', rawText);
      throw new Error('Could not parse recommendation. Please try again.');
    }
  }

  if (!parsed.action || !['hit', 'stand'].includes(parsed.action)) {
    throw new Error('Unexpected response format. Please try again.');
  }

  console.log('[BLACKJACK AGENT] Parsed action:', parsed.action);
  console.log('[BLACKJACK AGENT] Confidence:', parsed.confidence);

  return parsed;
}
