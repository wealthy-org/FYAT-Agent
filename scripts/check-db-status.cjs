import('pg').then(async ({ Client }) => {
  const c = new Client({
    connectionString:
      process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
  });
  await c.connect();
  try {
    const r = await c.query(`
      SELECT
        (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'mandates'
           AND column_name IN (
             'mandate_pda', 'onchain_id',
             'create_signature', 'revoke_signature'
           )) AS onchain_columns,
        (SELECT count(*) FROM pg_trigger t
         JOIN pg_class r ON r.oid = t.tgrelid
         JOIN pg_namespace n ON n.oid = r.relnamespace
         WHERE n.nspname = 'public'
           AND r.relname = 'mandates'
           AND t.tgname = 'mandates_guard_update'
           AND NOT t.tgisinternal) AS guard_trigger
    `);
    const m = await c.query(
      "SELECT name FROM schema_migrations ORDER BY name"
    );
    console.log("Schema status:", r.rows);
    console.log("Applied migrations:", m.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await c.end();
  }
});
