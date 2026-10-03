import { getModel } from '../../../lib/models';
import { getClient, getProviderLabel, MissingKeyError } from '../../../lib/providers';
import { buildSystemPrompt } from '../../../lib/personality';

// Vercel: allow up to 60s for streaming AI responses (requires Pro plan;
// Hobby plan caps at 10s which can cut off long responses).
export const maxDuration = 60;

// Turn provider errors into something a person can act on.
function describeError(err, providerLabel) {
  if (err instanceof MissingKeyError) return err.message;
  const status = err?.status;
  const badKey = status === 401 || status === 403 || (status === 400 && /api key/i.test(err?.message ?? ''));
  if (badKey) return `${providerLabel} rejected the API key. Check it in .env.local, then restart the dev server.`;
  if (status === 404) return `${providerLabel} doesn't recognise this model. Pick another one on the Model page.`;
  if (status === 429) return `${providerLabel} rate limit hit. Wait a minute or switch models.`;
  return `${providerLabel} isn't responding right now.`;
}

function creativityToTemp(c) {
  // creativity 1–5 → temperature 0.4–1.3
  return [0.4, 0.65, 0.85, 1.05, 1.3][(c ?? 3) - 1] ?? 0.85;
}

const MAX_MESSAGES    = 100;
const MAX_MSG_CHARS   = 12000;
const MAX_TOTAL_CHARS = 80000;

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const { messages, model: requestedModel, personality, memory } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'No messages provided.' }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json({ error: 'Too many messages in request.' }, { status: 400 });
  }
  const totalChars = messages.reduce((sum, m) => sum + (m?.content?.length ?? 0), 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return Response.json({ error: 'Message history too large.' }, { status: 400 });
  }
  for (const m of messages) {
    if (typeof m?.content === 'string' && m.content.length > MAX_MSG_CHARS) {
      return Response.json({ error: 'A single message exceeds the character limit.' }, { status: 400 });
    }
  }

  const model = getModel(requestedModel);
  const providerLabel = getProviderLabel(model.provider);

  let stream;
  try {
    const client = getClient(model.provider);
    const reqBody = {
      model: model.id,
      messages: [{ role: 'system', content: buildSystemPrompt(personality, Array.isArray(memory) ? memory : []) }, ...messages],
      stream: true,
      temperature: creativityToTemp(personality?.creativity),
    };
    if (model.maxTokens) reqBody.max_tokens = model.maxTokens;
    stream = await client.chat.completions.create(reqBody);
  } catch (err) {
    console.error(`[chat] ${providerLabel} / ${model.id}:`, err?.status ?? '', err?.message);
    return Response.json({ error: describeError(err, providerLabel) }, { status: 502 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let sent = false;
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            controller.enqueue(encoder.encode(delta));
            sent = true;
          }
        }
      } catch (err) {
        console.error(`[chat] stream ${providerLabel} / ${model.id}:`, err?.message);
        const note = describeError(err, providerLabel);
        controller.enqueue(encoder.encode(sent ? `\n\n[${note}]` : note));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
