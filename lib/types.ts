export interface Author {
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Stats {
  likes: number;
  replies: number;
  reposts: number;
  shares: number;
}

export interface Post {
  id: string;
  code: string;          // permalink slug
  author: Author;
  text: string;
  createdAt: number;     // unix seconds
  media: Media[];
  stats: Stats;
  chain: Post[];         // self-thread continuation posts (empty for single posts)
}

export type ScrapeResult =
  | { ok: true; posts: Post[] }
  | { ok: false; reason: 'private' | 'not_found' | 'blocked' | 'parse_error' };
