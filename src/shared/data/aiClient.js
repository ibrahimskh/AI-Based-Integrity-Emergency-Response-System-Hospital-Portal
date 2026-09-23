// Connects to Person C's Flask AI API.
// Set VITE_AI_API_URL in a .env file (e.g. VITE_AI_API_URL=http://localhost:5000)
// to go live. Until then this honestly reports the service as unavailable —
// it never fabricates a prediction.

const AI_API_URL = import.meta.env.VITE_AI_API_URL || '';

export async function requestAIPrediction(payload) {
  if (!AI_API_URL) {
    await new Promise((r) => setTimeout(r, 900));
    const err = new Error('AI service is currently unavailable.');
    err.code = 'ai/not-configured';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${AI_API_URL.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI service returned an error (${res.status}).`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI service timed out.');
    const wrapped = new Error('AI service is currently unavailable.');
    wrapped.code = 'ai/unreachable';
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
}
