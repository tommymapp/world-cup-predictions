import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/third-place-lookup?groups=ABCDEFGH
// Returns the match slot assignments for the given 8-group combination.
export async function GET(req: NextRequest) {
  const groupsParam = req.nextUrl.searchParams.get('groups') ?? '';
  const groups = [...new Set(groupsParam.toUpperCase().split('').filter(c => /[A-L]/.test(c)))];

  if (groups.length !== 8) {
    return NextResponse.json({ error: 'Exactly 8 distinct group letters required' }, { status: 400 });
  }

  const key = [...groups].sort().join('');

  const { rows } = await sql`
    SELECT m74, m77, m79, m80, m81, m82, m85, m87
    FROM third_place_table
    WHERE groups_key = ${key}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ found: false, key });
  }

  const r = rows[0];
  return NextResponse.json({
    found: true,
    assignments: {
      74: r.m74, 77: r.m77, 79: r.m79, 80: r.m80,
      81: r.m81, 82: r.m82, 85: r.m85, 87: r.m87,
    },
  });
}
