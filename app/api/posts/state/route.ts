import { setState, CAPTURE_STATES, type CaptureState } from '@/lib/captureStateStore';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST { platform, id, state } → set a post's triage state (inbox/kept/archived/discarded).
export async function POST(request: Request): Promise<Response> {
  const { platform, id, state } = (await request.json().catch(() => ({}))) as {
    platform?: Platform;
    id?: string;
    state?: CaptureState;
  };
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 });
  }
  if (!state || !CAPTURE_STATES.includes(state)) {
    return Response.json({ error: 'valid state required' }, { status: 400 });
  }
  const saved = setState(platform === 'x' ? 'x' : 'threads', id, state);
  return Response.json({ state: saved });
}
