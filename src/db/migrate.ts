import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

/**
 * Simple migration runner — executes SQL files in order.
 * Run via: npx tsx src/db/migrate.ts
 */
async function migrate() {
    const connectionString = process.env.DATABASE_URL
        || 'postgresql://thabat:thabat_dev_2024@localhost:5432/thabat';

    const sql = postgres(connectionString);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration(s):`);

    for (const file of files) {
        console.log(`  → Running: ${file}`);
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await sql.unsafe(content);
        console.log(`  ✓ ${file} applied`);
    }

    console.log('\nAll migrations applied successfully.');
    await sql.end();
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
