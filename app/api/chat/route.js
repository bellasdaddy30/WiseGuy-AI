import { getModel } from '../../../lib/models';
import { getClient, getProviderLabel, MissingKeyError } from '../../../lib/providers';
import { buildSystemPrompt } from '../../../lib/personality';

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

export async function POST(request) {
  const { messages, model: requestedModel, personality } = await request.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const model = getModel(requestedModel);
  const providerLabel = getProviderLabel(model.provider);

  let stream;
  try {
    const client = getClient(model.provider);
    stream = await client.chat.completions.create({
      model: model.id,
      messages: [{ role: 'system', content: buildSystemPrompt(personality) }, ...messages],
      stream: true,
    });
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
