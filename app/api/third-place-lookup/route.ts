import { NextRequest, NextResponse } from 'next/server';
import { parseThirdPlaceWikitext, lookupThirdPlace } from '@/lib/third-place';

const WIKI_PAGE = '2026 FIFA World Cup third-place table';
const WIKI_API  = 'https://en.wikipedia.org/w/api.php';

// Cache parsed table for the lifetime of the serverless instance
let cachedTable: Map<string, Record<number, string>> | null = null;

async function getTable(): Promise<Map<string, Record<number, string>>> {
  if (cachedTable) return cachedTable;

  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WC2026Predictions/1.0' },
    next: { revalidate: 3600 },
  });
  const json = await res.json();
  const wikitext: string = json?.parse?.wikitext ?? '';
  cachedTable = parseThirdPlaceWikitext(wikitext);
  return cachedTable;
}

// GET /api/third-place-lookup?groups=ABCDEFGH
// Returns: { assignments: { "74": "A", "77": "H", ... }, found: true }
// or      { found: false } if combination not in table
export async function GET(req: NextRequest) {
  const groupsParam = req.nextUrl.searchParams.get('groups') ?? '';
  const groups = groupsParam.toUpperCase().split('').filter(c => /[A-L]/.test(c));

  if (groups.length !== 8) {
    return NextResponse.json({ error: 'Exactly 8 group letters required' }, { status: 400 });
  }

  try {
    const table = await getTable();
    const result = lookupThirdPlace(groups, table);

    if (!result) {
      return NextResponse.json({
        found: false,
        tableSize: table.size,
        key: [...groups].sort().join(''),
      });
    }

    return NextResponse.json({ found: true, assignments: result });
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to fetch table', detail: String(e) },
      { status: 503 }
    );
  }
}
