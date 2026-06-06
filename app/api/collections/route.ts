import {
  listCollections,
  createCollection,
  renameCollection,
  deleteCollection,
} from '@/lib/collectionStore';

export const dynamic = 'force-dynamic';

// GET → all collections (newest first).
export function GET(): Response {
  return Response.json({ collections: listCollections() });
}

// POST → create / rename / delete, by `action`. Returns the updated list so the client
// can refresh in one round-trip.
//   { action: 'create', name }
//   { action: 'rename', id, name }
//   { action: 'delete', id }
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'create' | 'rename' | 'delete';
    id?: string;
    name?: string;
  };
  switch (body.action) {
    case 'create': {
      const c = createCollection(body.name ?? '');
      return Response.json({ collection: c, collections: listCollections() });
    }
    case 'rename': {
      if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
      renameCollection(body.id, body.name ?? '');
      return Response.json({ collections: listCollections() });
    }
    case 'delete': {
      if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
      deleteCollection(body.id);
      return Response.json({ collections: listCollections() });
    }
    default:
      return Response.json({ error: 'unknown action' }, { status: 400 });
  }
}
