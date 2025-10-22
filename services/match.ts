// app/services/match.ts
import API from '../android/app/src/config';

const BASE = (API as any).BASE_URL || '';

export async function matchFromFH(fhId: number) {
  const url = `${BASE}/post/match_posts.php?mode=from_fh&id=${fhId}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.status !== 'success') throw new Error(j.message || 'match failed');
  return j.data as any[];
}

export async function matchFromFP(fpId: number) {
  const url = `${BASE}/post/match_posts.php?mode=from_fp&id=${fpId}`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.status !== 'success') throw new Error(j.message || 'match failed');
  return j.data as any[];
}
