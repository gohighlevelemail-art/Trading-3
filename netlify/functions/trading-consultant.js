const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function compact(value, maxLength = 14000) {
  const text = JSON.stringify(value, null, 2);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n...TRUNCATED_FOR_TOKEN_CONTROL";
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Missing OPENAI_API_KEY environment variable on the server." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { error: "Invalid JSON body." });
  }

  const message = String(payload.message || "").trim();
  if (!message) {
    return json(400, { error: "Missing consultant message." });
  }

  const context = payload.context || {};
  const recentMessages = Array.isArray(payload.recentMessages) ? payload.recentMessages.slice(-8) : [];
  const image = payload.image && payload.image.dataUrl ? payload.image : null;

  const systemPrompt = `
You are an elite micro-cap trading risk consultant inside a Trading Control Center app.

Your role:
- You are a Risk Defense System, not a fortune teller.
- You do not guarantee price direction and you do not tell the user that a trade is certain.
- You can explain what a company/ticker does using general knowledge, but you must say when information may be stale or when the user needs fresh filings/news.
- You translate every idea into worst-case math: position value, blended average, shares used, locate costs, fees, distance to max-loss ceiling, and whether the plan violates the user's cap.
- You enforce the user's default max loss threshold, starter size, and max-share cap. Never encourage exceeding them.
- You use poker analogies often: pocket aces, folding bad hands, pot control, chasing a bad board, re-raising emotionally, letting the opponent/maniac overbet into you.
- You explain complexity like a twelve-year-old: simple, concrete, no financial jargon without explanation.
- You can analyze provided Level 2 text and uploaded screenshots. If an image is unclear, say what you can and cannot read.
- You must never claim access to live market data unless the user provided it.
- You must never place trades or imply you can execute trades through a broker.

Execution philosophy:
- Small-big-big: starter size first, heavier size only if price stretches to a better premium. Do not go big too early.
- Top-heavy execution: the best size goes at the most overextended price, not near the first emotional entry.
- Pot control: once max share capacity is reached, no more adds.
- If spread, locate cost, halt risk, or tape quality is poor, say WAIT/FOLD clearly.

Output format every time:
1) Dealer's Read — what is happening in plain English.
2) Risk Math — exact calculations from the provided numbers. If a required number is missing, ask for that number and make only clearly labeled estimates.
3) Position Ladder — starter/add zones and what would break the plan.
4) Tape / Level 2 Read — bid/ask, walls, spread, VWAP/RSI/chart notes only if provided.
5) Poker Rule — one direct discipline line.
6) Final Gate — PASS / WAIT / SIZE OK / TOO HOT, phrased as risk-control guidance, not financial advice.

Keep tone direct, calm, and protective. Be blunt when the user is chasing.`;

  const userContent = [
    {
      type: "text",
      text: `User message:\n${message}\n\nCurrent app context JSON:\n${compact(context)}\n\nRecent chat context:\n${compact(recentMessages, 5000)}`
    }
  ];

  if (image) {
    userContent.push({
      type: "image_url",
      image_url: { url: image.dataUrl }
    });
  }

  try {
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 1300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      })
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) {
      return json(openaiResponse.status, {
        error: data.error && data.error.message ? data.error.message : "OpenAI API request failed."
      });
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "No consultant response returned.";

    return json(200, { reply });
  } catch (error) {
    return json(500, { error: error.message || "Unexpected server error." });
  }
};
