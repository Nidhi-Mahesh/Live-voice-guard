import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN in environment.');
    process.exit(1);
  }

  const db = createClient({ url, authToken });

  const sql = `
    SELECT
      id,
      user_id,
      email,
      voice_embedding,
      created_at
    FROM voice_templates
    ORDER BY id DESC
    LIMIT 10;
  `;

  try {
    const res = await db.execute(sql);
    const rows = res.rows.map((r) => {
      let vectorLength = null;
      let preview = null;
      try {
        const arr = JSON.parse(r.voice_embedding);
        if (Array.isArray(arr)) {
          vectorLength = arr.length;
          preview = JSON.stringify(arr.slice(0, 8));
        }
      } catch (_) {
        // keep nulls
      }
      return {
        id: r.id,
        user_id: r.user_id,
        email: r.email,
        vector_length: vectorLength,
        embedding_preview: preview,
        created_at: r.created_at,
      };
    });

    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Query error:', e?.message || e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
