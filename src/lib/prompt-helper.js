/**
 * Prompt Helper for AI Moda Stüdyosu
 * 
 * Kullanıcının yazdığı moda promptundan sadece ortam betimlemesini çekerek,
 * Flux için boş bir arka plan promptu oluşturur.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Kullanıcı promptundan sadece ortam betimlemesini ayıklar ve boş arka plan promptu hazırlar.
 * @param {string} customPrompt - Türkçe veya İngilizce moda promptu
 * @returns {Promise<string>} Empty background description in English
 */
export async function extractBackgroundPrompt(customPrompt) {
  if (!OPENAI_API_KEY) {
    console.warn('[Prompt Helper] OPENAI_API_KEY missing. Using fallback background.');
    return 'empty minimalist high-end clothing showroom, luxury boutique interior';
  }

  if (!customPrompt || !customPrompt.trim()) {
    return 'empty minimalist high-end clothing showroom, luxury boutique interior';
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant specialized in image prompt engineering.
Your task is to extract ONLY the environment/scene/background description from a fashion model video prompt and write a clean, short English text-to-image prompt to generate an EMPTY version of that environment.

RULES:
1. The output must describe a completely EMPTY scene.
2. Absolutely NO people, NO models, NO mannequin, NO clothing, NO text, and NO logos in the output.
3. Keep the prompt short, focused on the architectural details, lighting, floor, and depth.
4. Output ONLY the English prompt, no extra text, explanations, or quotes.

Examples:
- Input: "karlı paris caddelerinde yürüyen manken, üzerinde lacivert triko kazak ve kot pantolon var"
  Output: "empty snowy Paris street, cozy winter atmosphere, historic buildings, soft focus depth of field, realistic street lighting"
- Input: "A gorgeous model walking on a runway in a modern gallery, luxury boutique lobby background"
  Output: "empty modern art gallery runway, luxury boutique lobby, clean floors, volumetric lighting, minimal architecture"
`
          },
          {
            role: 'user',
            content: customPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    const data = await res.json();
    const extracted = data.choices?.[0]?.message?.content?.trim();
    if (extracted) {
      console.log('[Prompt Helper] Extracted background prompt:', extracted);
      return extracted;
    }
  } catch (err) {
    console.error('[Prompt Helper] Extraction failed:', err);
  }

  return 'empty minimalist high-end clothing showroom, luxury boutique interior';
}
