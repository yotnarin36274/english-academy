// AI-generated supplemental grammar exercises via Groq (OpenAI-compatible API).
// Optional feature: without GROQ_API_KEY the client falls back to the static bank.

import { QUIZ_SETS, isQuizKey } from '@/lib/quizData';

const VALID_TYPES = ['fill_blank', 'choose', 'rewrite_negative', 'rewrite_question', 'unscramble', 'correct_mistake'];

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no_key' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const quizKey = body?.quizKey as string | undefined;
  const weakSubskills = (body?.weakSubskills ?? []) as string[];
  const count = Math.min(Math.max(Number(body?.count) || 12, 4), 24);

  if (!quizKey || !isQuizKey(quizKey)) {
    return Response.json({ error: 'invalid quizKey' }, { status: 400 });
  }
  const set = QUIZ_SETS[quizKey];
  const validKeys = new Set(set.subskills.map(s => s.key));
  const targets = weakSubskills.filter(sk => validKeys.has(sk)).slice(0, 3);
  const targetInfos = (targets.length > 0 ? targets : set.subskills.map(s => s.key))
    .map(sk => set.subskills.find(s => s.key === sk)!)
    .filter(Boolean);

  const systemPrompt = `You write English grammar practice exercises for Thai school students (grades 4-12). Keep vocabulary simple and sentences short. Never include the answer inside the prompt itself.`;

  const userPrompt = `Tense: ${set.thaiLabel}.
Target subskills (use the exact "key" value in your output):
${targetInfos.map(s => `- key: ${s.key} — ${s.englishLabel} (${s.thaiLabel})`).join('\n')}

Create ${count} practice items spread across the target subskills.
Allowed types: fill_blank (prompt has a blank "______" with base verb in parentheses), choose (two options in parentheses like "( go / goes )"), rewrite_negative (give an affirmative sentence to rewrite as negative), rewrite_question (give a statement to rewrite as a yes/no question), unscramble (words separated by " / " to reorder into a sentence), correct_mistake (a sentence containing exactly one grammar mistake to fix).

Respond with JSON only: {"items":[{"subskill":"<key>","type":"<type>","prompt":"...","answer":"..."}]}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Groq API error:', res.status, text);
      return Response.json({ error: 'groq_failed' }, { status: 502 });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content ?? '{}');
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    // Drop malformed items; assign ids
    const items = rawItems
      .filter((it: Record<string, unknown>) =>
        typeof it?.prompt === 'string' && it.prompt.trim() &&
        typeof it?.answer === 'string' && it.answer.trim() &&
        typeof it?.subskill === 'string' && validKeys.has(it.subskill) &&
        typeof it?.type === 'string' && VALID_TYPES.includes(it.type))
      .slice(0, count)
      .map((it: { subskill: string; type: string; prompt: string; answer: string }, i: number) => ({
        id: `ai-${String(i + 1).padStart(2, '0')}`,
        subskill: it.subskill,
        type: it.type,
        prompt: it.prompt.trim(),
        answer: it.answer.trim(),
      }));

    if (items.length === 0) {
      return Response.json({ error: 'no_valid_items' }, { status: 502 });
    }
    return Response.json({ items });
  } catch (err) {
    console.error('Quiz generate error:', err);
    return Response.json({ error: 'generate_failed' }, { status: 502 });
  }
}
