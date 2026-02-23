import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with actual keys if not running via npm script with env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error("Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, or run this via `npm run migrate` if set up.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Starting migration...");

    // Read old data
    const oldDataPath = path.resolve('C:/Users/Akram Mlouki/.gemini/antigravity/scratch/Servers-management/servers.json'); // HARDCODE FIX
    if (!fs.existsSync(oldDataPath)) {
        console.error(`Could not find old servers.json at ${oldDataPath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(oldDataPath, 'utf-8');
    const oldServers = JSON.parse(rawData);

    console.log(`Found ${oldServers.length} servers to migrate.`);

    // Map to new schema format
    const newServers = oldServers.map(s => ({
        id: s.id,
        provider: s.provider,
        category: s.category,
        status: s.status,
        global_domains: "",
        // Create an initial IP entry from the old single IP format
        ip_data: s.ip ? [{
            id: `ip_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            address: s.ip,
            useGlobal: true,
            customDomains: ""
        }] : []
    }));

    // Insert into Supabase
    const { data, error } = await supabase.from('servers').upsert(newServers);

    if (error) {
        console.error("Migration failed:", error.message);
    } else {
        console.log("Migration successful! Uploaded", newServers.length, "servers.");
    }
}

migrate();
