import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret } = await req.json();

  if (!secret || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    await sql`SELECT 1`;
  } catch (e) {
    return NextResponse.json(
      { error: 'Database unreachable', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 }
    );
  }

  try {
    const { rows } = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'matches'
      ) AS tables_exist
    `;
    const tablesExist = rows[0]?.tables_exist;
    return NextResponse.json({ ok: true, tablesExist });
  } catch (e) {
    return NextResponse.json(
      { error: 'Schema check failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
