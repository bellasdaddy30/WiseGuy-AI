import { getModel } from '../../../lib/models';
import { getClient } from '../../../lib/providers';

const SYSTEM_PROMPT = `You are SmartAss AI — sharp, direct, and genuinely useful.
You have a personality: you're confident, a little sarcastic when it's warranted, and you don't pad your answers with corporate filler. You get to the point.
You're not rude — you're honest. You treat the user like an intelligent adult.
Keep responses concise unless depth is clearly needed. Use plain language.`;

export async function POST(request) {
  const { messages, model: requestedModel } = await request.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const model = getModel(requestedModel);
  const client = getClient(model.provider);

  const stream = await client.chat.completions.create({
    model: model.id,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
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
