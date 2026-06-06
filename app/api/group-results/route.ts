import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { GROUPS } from '@/lib/groups';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'changeme';

// GET: actual results + per-player scores (1pt per correct position)
export async function GET() {
  const { rows: results } = await sql`
    SELECT group_name, position, team FROM group_results ORDER BY group_name, position
  `;

  const { rows: scores } = await sql`
    SELECT gp.player_name, COUNT(*)::int AS group_points
    FROM group_predictions gp
    JOIN group_results gr
      ON gr.group_name = gp.group_name
      AND gr.position  = gp.position
      AND gr.team      = gp.team
    GROUP BY gp.player_name
  `;

  return NextResponse.json({ results, scores });
}

// POST: admin sets a team's final position in a group
export async function POST(req: NextRequest) {
  const { secret, group, position, team } = await req.json();
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const validTeams = GROUPS[group];
  if (!validTeams) return NextResponse.json({ error: 'Invalid group' }, { status: 400 });
  if (![1, 2, 3, 4].includes(position)) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });

  if (!team) {
    await sql`DELETE FROM group_results WHERE group_name = ${group} AND position = ${position}`;
  } else {
    if (!validTeams.includes(team)) return NextResponse.json({ error: 'Team not in group' }, { status: 400 });
    // Remove any existing entry for this team in this group first
    await sql`DELETE FROM group_results WHERE group_name = ${group} AND team = ${team}`;
    await sql`
      INSERT INTO group_results (group_name, position, team)
      VALUES (${group}, ${position}, ${team})
      ON CONFLICT (group_name, position) DO UPDATE SET team = ${team}
    `;
  }

  return NextResponse.json({ ok: true });
}
