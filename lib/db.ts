import { Pool } from 'pg';

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  process.env.STORAGE_POSTGRES_URL ||
  process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined },
});

// Tagged template literal helper — same API as @vercel/postgres
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  let query = '';
  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) query += `$${i + 1}`;
  });
  const result = await pool.query(query, values as unknown[]);
  return { rows: result.rows };
}

export async function setupDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      group_name TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      match_date TIMESTAMPTZ NOT NULL,
      result TEXT CHECK (result IN ('home', 'draw', 'away'))
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      player_name TEXT NOT NULL,
      match_id INTEGER REFERENCES matches(id),
      prediction TEXT NOT NULL CHECK (prediction IN ('home', 'draw', 'away')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(player_name, match_id)
    )
  `;
}
