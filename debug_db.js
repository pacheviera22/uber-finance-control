
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load env vars from .env or .env.local
const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

let supabaseUrl, supabaseKey;

function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        console.log(`Loading env from ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                if (key.trim() === 'VITE_SUPABASE_URL') supabaseUrl = value.trim();
                if (key.trim() === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value.trim();
            }
        });
    }
}

loadEnv(envPath);
loadEnv(envLocalPath);

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Could not find VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env or .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 Checking database connection...");

    // 1. Check Session Row
    const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

    if (sessionError) {
        console.error("❌ Error checking sessions:", sessionError.message);
    } else if (!session) {
        console.error("⚠️ Session row with ID 1 NOT FOUND. This is likely the problem.");
        console.log("Please run the initialization SQL to insert the default session row.");
    } else {
        console.log("✅ Session row found:", session);
    }

    // 2. Check Daily Records table existence (by trying to select 0 rows)
    const { error: dailyError } = await supabase
        .from('daily_records')
        .select('*')
        .limit(1);

    if (dailyError) {
        console.error("❌ Error checking daily_records table:", dailyError.message);
        console.log("Likely the table does not exist or RLS blocking access.");
    } else {
        console.log("✅ daily_records table seems accessible.");
    }

    // 3. Test Update Permission
    if (session) {
        console.log("Trying to update session meta to 12345 (Test)...");
        const { error: updateError } = await supabase
            .from('sessions')
            .update({ meta: 12345 })
            .eq('id', 1);

        if (updateError) {
            console.error("❌ Update FAILED:", updateError.message);
        } else {
            console.log("✅ Update SUCCESSFULL (Test value 12345 set).");
            // Revert
            await supabase.from('sessions').update({ meta: session.meta }).eq('id', 1);
            console.log("Reverted meta to original value.");
        }
    }
}

check();
