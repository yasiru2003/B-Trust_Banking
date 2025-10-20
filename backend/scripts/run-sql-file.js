const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const sqlFile = process.argv[2];
    if (!sqlFile) {
      console.error('Usage: node run-sql-file.js <sql-file>');
      process.exit(1);
    }

    const absolutePath = path.isAbsolute(sqlFile)
      ? sqlFile
      : path.join(__dirname, sqlFile);

    if (!fs.existsSync(absolutePath)) {
      console.error(`SQL file not found: ${absolutePath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(absolutePath, 'utf8');

    const connectionConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        }
      : {
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'postgres',
          password: process.env.DB_PASSWORD || '',
          port: Number(process.env.DB_PORT || 5432),
          ssl: { rejectUnauthorized: false },
        };

    const client = new Client(connectionConfig);
    await client.connect();

    console.log(`Running SQL from: ${absolutePath}`);

    // Split into individual statements by semicolon while preserving PL/pgSQL blocks safely
    // Easiest here: run as a single batch when the driver supports it; otherwise simple split
    // Many Neon/pg servers accept multiple statements in one query
    const statements = sql
      .split(/;\s*(?=([^']*'[^']*')*[^']*$)/g) // naive split on semicolons not within single quotes
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      console.log('Executing:', stmt.substring(0, 120).replace(/\s+/g, ' ') + (stmt.length > 120 ? ' ...' : ''));
      await client.query(stmt);
    }

    console.log('✅ SQL executed successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();






