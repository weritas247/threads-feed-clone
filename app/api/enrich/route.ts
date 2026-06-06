import { pipelineStatus, runPipeline } from '@/lib/pipeline';
import type { AiProvider } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// GET → how much of the archive is datafied (enriched + embedded), and with what
// backends. Drives the /manage progress + the "needs enriching" badge.
export function GET(): Response {
  return Response.json(pipelineStatus());
}

// POST {provider?, limit?} → run one bounded batch of enrichment + embedding over the
// posts that still need it. Returns counts + remaining, so the UI can loop to drain.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    provider?: AiProvider;
    limit?: number;
  };
  const limit = Math.max(1, Math.min(200, body.limit ?? 50));
  try {
    const result = await runPipeline(limit, body.provider);
    return Response.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
