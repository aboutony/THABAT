import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function main() {
    console.log('Adding theme_preference column...');
    try {
        await client.execute("ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'dark'");
        console.log('✅ Column added');
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('duplicate column')) {
            console.log('Column already exists — skipping');
        } else {
            throw e;
        }
    }
    process.exit(0);
}

main().catch((err) => { console.error('Migration failed:', err); process.exit(1); });
