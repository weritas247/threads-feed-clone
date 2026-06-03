import type { Platform, ScrapeResult } from './types';
import { fetchAccountFeed as fetchThreadsFeed, fetchProfileAvatar as fetchThreadsAvatar } from './threads';
import { fetchXAccountFeed, fetchXProfileAvatar } from './x';

// Dispatch feed/avatar fetching to the right platform scraper. The rest of the
// app stays platform-agnostic and works against normalized Post objects.
export function fetchFeed(platform: Platform, username: string): Promise<ScrapeResult> {
  return platform === 'x' ? fetchXAccountFeed(username) : fetchThreadsFeed(username);
}

export function fetchAvatar(platform: Platform, username: string): Promise<string | null> {
  return platform === 'x' ? fetchXProfileAvatar(username) : fetchThreadsAvatar(username);
}
