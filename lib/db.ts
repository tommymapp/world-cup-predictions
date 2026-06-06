import { Pool } from 'pg';

// Parse the pooler URL into individual params so sslmode=require in the
// query string doesn't override our ssl config object.
const rawUrl = process.env.STORAGE_POSTGRES_URL!;
const parsed = new URL(rawUrl);

const pool = new Pool({
  host: parsed.hostname,
  port: Number(parsed.port),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: false },
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
  await sql`
    CREATE TABLE IF NOT EXISTS award_predictions (
      id SERIAL PRIMARY KEY,
      player_name TEXT NOT NULL,
      award_key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(player_name, award_key)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS award_results (
      award_key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS knockout_matches (
      id SERIAL PRIMARY KEY,
      match_number INTEGER UNIQUE NOT NULL,
      round TEXT NOT NULL,
      home_slot TEXT NOT NULL,
      away_slot TEXT NOT NULL,
      home_team TEXT,
      away_team TEXT,
      result TEXT CHECK (result IN ('home', 'away'))
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS knockout_predictions (
      id SERIAL PRIMARY KEY,
      player_name TEXT NOT NULL,
      match_id INTEGER REFERENCES knockout_matches(id),
      prediction TEXT NOT NULL CHECK (prediction IN ('home', 'away')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(player_name, match_id)
    )
  `;
}
