import { createPool } from '@vercel/postgres';

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL ||
  process.env.STORAGE_POSTGRES_URL ||
  process.env.DATABASE_URL;

const pool = createPool({ connectionString });
export const sql = pool.sql.bind(pool);

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
