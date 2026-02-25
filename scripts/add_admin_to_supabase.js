/**
 * Add Admin User to Supabase
 * 
 * Run this script to add the admin user to your Supabase database.
 * Usage: node scripts/add_admin_to_supabase.js
 * 
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function addAdminUser() {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Error: Missing Supabase credentials');
        console.log('\nPlease set these environment variables in server/.env:');
        console.log('  SUPABASE_URL=https://your-project.supabase.co');
        console.log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
        console.log('\nOr provide them directly when running this script.');
        process.exit(1);
    }

    console.log('🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Create admin_users table
        console.log('📋 Creating admin_users table...');
        const { error: createTableError } = await supabase.rpc('create_admin_users_table', {
            create_sql: `
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          role TEXT DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Allow service role to read
        CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);
      `
        });

        // If RPC doesn't work, try direct SQL via console
        if (createTableError) {
            console.log('⚠️  RPC call failed, trying alternative method...');

            // Check if table exists
            const { data: tables, error: tableCheckError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .eq('table_name', 'admin_users');

            if (!tables || tables.length === 0) {
                console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:\n');
                console.log(`
-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow server to read admin_users
CREATE POLICY "Service role can read admin_users" ON admin_users FOR SELECT USING (true);

-- Insert admin user
INSERT INTO admin_users (username, password, email, role)
VALUES ('admin', 'admin123', 'admin@lostfound.com', 'admin')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
        `);
                console.log('\n');
            }
        }

        // Try to insert the admin user directly
        console.log('👤 Inserting admin user...');
        const { data, error } = await supabase
            .from('admin_users')
            .upsert({
                username: 'admin',
                password: 'admin123',
                email: 'admin@lostfound.com',
                role: 'admin'
            }, {
                onConflict: 'username',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.log('⚠️  Could not insert admin user directly.');
            console.log('   Error:', error.message);
            console.log('\n📝 Please run the SQL above in your Supabase SQL Editor.');
        } else {
            console.log('✅ Admin user added successfully!');
            console.log('   Username: admin');
            console.log('   Password: admin123');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📝 Please run the SQL in scripts/add_admin_user.sql in your Supabase SQL Editor.');
    }
}

addAdminUser();
