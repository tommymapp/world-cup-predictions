import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const { rows } = await sql`SELECT name FROM players ORDER BY name`;
  return NextResponse.json(rows.map((r) => r.name));
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  const clean = name.trim().slice(0, 50);
  await sql`INSERT INTO players (name) VALUES (${clean}) ON CONFLICT DO NOTHING`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { name } = await req.json();
  await sql`DELETE FROM players WHERE name = ${name}`;
  return NextResponse.json({ ok: true });
}
