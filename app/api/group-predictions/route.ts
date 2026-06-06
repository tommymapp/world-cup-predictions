import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { GROUPS } from '@/lib/groups';

export async function GET(req: NextRequest) {
  const player = req.nextUrl.searchParams.get('player');
  if (!player) return NextResponse.json({ error: 'player required' }, { status: 400 });

  const { rows } = await sql`
    SELECT group_name, position, team FROM group_predictions WHERE player_name = ${player}
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { player, group, position, team } = await req.json();

  const validTeams = GROUPS[group];
  if (!validTeams) return NextResponse.json({ error: 'Invalid group' }, { status: 400 });
  if (![1, 2, 3, 4].includes(position)) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
  if (!validTeams.includes(team)) return NextResponse.json({ error: 'Team not in group' }, { status: 400 });

  // Remove any existing pick for this team in this group (handles re-assignment)
  await sql`
    DELETE FROM group_predictions
    WHERE player_name = ${player} AND group_name = ${group} AND team = ${team}
  `;
  await sql`
    INSERT INTO group_predictions (player_name, group_name, position, team)
    VALUES (${player}, ${group}, ${position}, ${team})
    ON CONFLICT (player_name, group_name, position)
    DO UPDATE SET team = ${team}, created_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
