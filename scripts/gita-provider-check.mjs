import "dotenv/config";
const key = process.env.ELEVENLABS_API_KEY;
if (!key || /^(<|PASTE|your|ELEVENLABS_API_KEY$)/i.test(key)) {
  console.log(JSON.stringify({ keyAvailable: false, placeholder: Boolean(key) }));
  process.exit(0);
}
async function read(path) {
  const response = await fetch(`https://api.elevenlabs.io/v1/${path}`, { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) { const detail = await response.json().catch(() => ({})); const code = detail.detail?.status; console.log(JSON.stringify({ operation: path.startsWith("voices") ? "voice-access" : path, status: response.status, reason: typeof code === "string" && /^[a-z_]{1,80}$/.test(code) ? code : "provider rejected request" })); return null; }
  return response.json();
}
const models = await read("models");
if (Array.isArray(models)) console.log(JSON.stringify({ models: models.filter(m => m.model_id.includes("v4")).map(m => ({ id: m.model_id, name: m.name, canTts: m.can_do_text_to_speech, telugu: m.languages.filter(l => ["te", "tel"].includes(l.language_id)), maxCharacters: m.max_characters_request_subscribed_user, tokenCostFactor: m.token_cost_factor })) }));
const voice = await read("voices/RoLT1qx7XJRXxWSIG5hS");
if (voice) console.log(JSON.stringify({ voiceAccessible: true, id: voice.voice_id, name: voice.name, category: voice.category }));
const subscription = await read("user/subscription");
if (subscription) console.log(JSON.stringify({ tier: subscription.tier, usedCharacters: subscription.character_count, characterLimit: subscription.character_limit, remainingCharacters: subscription.character_limit - subscription.character_count, status: subscription.status }));
