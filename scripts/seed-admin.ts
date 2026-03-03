/**
 * THABAT Admin Seed Script
 *
 * Seeds the master admin user (Adonis) with role 'admin'.
 * Uses @libsql/client for Turso compatibility.
 *
 * Usage: npx tsx scripts/seed-admin.ts
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function seedAdmin() {
    console.log('🔐 THABAT Admin Seed — Creating master admin user...\n');

    // 1. Create or find the admin organization
    const existingOrg = await client.execute(
        `SELECT id FROM organizations WHERE name = 'THABAT Admin'`
    );

    let adminOrgId: string;

    if (existingOrg.rows.length > 0) {
        adminOrgId = existingOrg.rows[0].id as string;
        console.log(`   ✓ Admin org already exists: ${adminOrgId}`);
    } else {
        const orgResult = await client.execute({
            sql: `INSERT INTO organizations (id, name, industry, industry_code, revenue_band, growth_stage, country, company_size)
                  VALUES (lower(hex(randomblob(16))), 'THABAT Admin', 'Platform', 'PLATFORM', '50m+', 'mature', 'SAU', 'enterprise')
                  RETURNING id`,
            args: [],
        });
        adminOrgId = orgResult.rows[0].id as string;
        console.log(`   ✓ Admin org created: ${adminOrgId}`);
    }

    // 2. Hash password
    const password = 'Demo2026!';
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Create or update admin user
    const existingUser = await client.execute({
        sql: `SELECT id FROM users WHERE email = ?`,
        args: ['adonis@thabat.app'],
    });

    if (existingUser.rows.length > 0) {
        // Update existing user to ensure admin role
        await client.execute({
            sql: `UPDATE users SET role = 'admin', password_hash = ?, org_id = ? WHERE email = ?`,
            args: [passwordHash, adminOrgId, 'adonis@thabat.app'],
        });
        console.log(`   ✓ Admin user updated: adonis@thabat.app`);
    } else {
        await client.execute({
            sql: `INSERT INTO users (id, org_id, email, password_hash, full_name, role, language_preference, theme_preference)
                  VALUES (lower(hex(randomblob(16))), ?, ?, ?, 'Adonis', 'admin', 'en', 'dark')`,
            args: [adminOrgId, 'adonis@thabat.app', passwordHash],
        });
        console.log(`   ✓ Admin user created: adonis@thabat.app`);
    }

    console.log('\n✅ Admin seed complete!');
    console.log(`   🔐 Login: adonis@thabat.app / ${password}`);
    console.log(`   👑 Role: admin`);
}

seedAdmin().catch((err) => {
    console.error('Admin seed failed:', err);
    process.exit(1);
});
