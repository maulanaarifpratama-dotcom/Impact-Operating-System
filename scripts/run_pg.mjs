import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

console.log('Has DB URL:', !!dbUrl);

async function main() {
  if (!dbUrl) {
    console.log('No direct postgres connection string available in .env');
    return;
  }
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  console.log('Connected to Postgres directly. Executing materialize_grantwriter_document...');
  try {
    const res = await client.query(
      `select public.materialize_grantwriter_document($1::uuid, $2::integer, $3::uuid)`,
      ['2c511c7b-564a-4a20-b5d3-cb44ddb42b1b', null, '08fc1b53-9bf9-4de2-921f-597ce44d8263']
    );
    console.log('Direct PG RPC Response:', JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('Direct PG Error:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
