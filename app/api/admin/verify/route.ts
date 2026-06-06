import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

export async function POST(req: NextRequest) {
  const { secret } = await req.json();

  if (!secret || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const resolvedVar =
    process.env.STORAGE_DB_SUPABASE_URL ? 'STORAGE_DB_SUPABASE_URL' :
    process.env.POSTGRES_URL ? 'POSTGRES_URL' :
    process.env.STORAGE_URL ? 'STORAGE_URL' :
    process.env.STORAGE_POSTGRES_URL ? 'STORAGE_POSTGRES_URL' :
    process.env.DATABASE_URL ? 'DATABASE_URL' :
    'none';

  try {
    await sql`SELECT 1`;
  } catch (e) {
    return NextResponse.json(
      { error: 'Database unreachable', resolvedVar, detail: e instanceof Error ? e.message : String(e) },
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
