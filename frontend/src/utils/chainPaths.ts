/**
 * Maps API chain participant IDs (e.g. user-54416778, seeded-114) to graph node ids.
 */

export type NormalizedChain = {
  id: string;
  chainType?: string;
  length: number;
  readinessScore?: number;
  orderedPath: string[];
  path: string[];
  participants?: unknown[];
  isReady?: boolean;
};

function uidFromGraphNode(n: any): string | undefined {
  const u = n.uid ?? n.userId;
  if (u !== undefined && u !== null) return String(u);
  const id = String(n.id || '');
  const m = id.match(/^user[_-]?(\d+)$/i);
  return m ? m[1] : undefined;
}

export function buildGraphNodeResolver(nodes: any[]) {
  const map = new Map<string, string>();

  for (const n of nodes) {
    const gid = n?.id;
    if (!gid) continue;

    map.set(String(gid), gid);
    map.set(String(gid).toLowerCase(), gid);

    const uid = uidFromGraphNode(n);
    if (uid) {
      map.set(`user-${uid}`, gid);
      map.set(`user_${uid}`, gid);
      map.set(uid, gid);
    }

    const tid = String(gid);
    const digits = tid.match(/(\d+)/g);
    if (digits) {
      for (const d of digits) {
        if (d.length >= 2) {
          map.set(`seeded-${d}`, gid);
          map.set(`seeded_${d}`, gid);
        }
      }
    }
  }

  return function resolve(apiId: string): string | null {
    if (!apiId) return null;
    if (map.has(apiId)) return map.get(apiId)!;
    const lower = apiId.toLowerCase();
    if (map.has(lower)) return map.get(lower)!;

    const userM = apiId.match(/^user[_-]?(\d+)$/i);
    if (userM) {
      const num = userM[1];
      const candidates = [`user-${num}`, `user_${num}`, `user-${num}`];
      for (const c of candidates) {
        if (map.has(c)) return map.get(c)!;
      }
      for (const n of nodes) {
        if (String(uidFromGraphNode(n)) === num) return String(n.id);
      }
    }

    const seedM = apiId.match(/^seeded[_-]?(\d+)$/i);
    if (seedM) {
      const num = seedM[1];
      for (const k of [`seeded-${num}`, `seeded_${num}`]) {
        if (map.has(k)) return map.get(k)!;
      }
      for (const n of nodes) {
        const nt = String(n.type || '').toLowerCase();
        if (!['seeded_listing', 'public_listing', 'pocket_listing'].includes(nt)) continue;
        if (String(n.id).includes(num)) return String(n.id);
      }
    }

    return null;
  };
}

/** API sometimes sends a single id string instead of an array — normalize safely. */
export function asStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    const s = v.trim();
    return s ? [s] : [];
  }
  return [];
}

export function normalizeChainsFromApi(raw: any[], nodes: any[]): NormalizedChain[] {
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  if (!Array.isArray(raw) || !safeNodes.length) return [];

  const resolve = buildGraphNodeResolver(safeNodes);

  return raw
    .filter((c) => c != null && typeof c === 'object')
    .map((c, idx) => {
    const orderedPath = asStringArray(c.orderedPath ?? c.path);
    const path = orderedPath.map((pid) => resolve(pid)).filter((id): id is string => Boolean(id));
    const readinessScore = typeof c.readinessScore === 'number' ? c.readinessScore : undefined;
    const isReady =
      c.isReady === true ||
      (readinessScore !== undefined && readinessScore >= 0.65);

    return {
      id: String(c.chainId || c.id || `chain-${idx}`),
      chainType: c.chainType,
      length: c.length ?? orderedPath.length,
      readinessScore,
      orderedPath,
      path,
      participants: Array.isArray(c.participants) ? c.participants : [],
      isReady
    };
  });
}
