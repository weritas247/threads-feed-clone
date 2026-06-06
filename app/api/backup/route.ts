import { createBackup, restoreBackup, isBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// GET → download the whole knowledge base as one JSON bundle.
export function GET(): Response {
  const backup = createBackup(Math.floor(Date.now() / 1000));
  const date = new Date(backup.createdAt * 1000).toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="knowledge-base-${date}.json"`,
    },
  });
}

// POST <backup json> → restore. Overwrites the data files in the bundle. Returns count.
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!isBackup(body)) {
    return Response.json({ error: 'Not a valid knowledge-base backup file.' }, { status: 400 });
  }
  const { restored } = restoreBackup(body);
  return Response.json({ restored });
}
