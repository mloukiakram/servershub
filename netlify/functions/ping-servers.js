const { schedule } = require("@netlify/functions");
const { createClient } = require("@supabase/supabase-js");
const net = require("net");
const pLimit = require("p-limit");

// Requires SUPABASE_SERVICE_ROLE_KEY environment variable in Netlify
// to bypass RLS and authenticate securely from the backend worker.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to check if a TCP port is open
async function checkPort(port, host) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

// Ping an IP by trying common web/ssh ports
async function pingIP(ip) {
    let isUp = await checkPort(80, ip);
    if (!isUp) isUp = await checkPort(443, ip);
    if (!isUp) isUp = await checkPort(22, ip);
    return isUp;
}

const handler = async function (event, context) {
    try {
        console.log("Starting Scheduled 12-Hour Ping Workflow...");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase credentials in environment variables.");
        }

        // 1. Fetch servers
        const { data: servers, error: fetchError } = await supabase.from('servers').select('id, status, ip_data');
        if (fetchError) throw fetchError;

        if (!servers || servers.length === 0) {
            console.log("No servers available to ping.");
            return { statusCode: 200, body: "No servers available to ping." };
        }

        // Limit concurrent TCP connections to 10
        const limit = pLimit(10);

        const updates = await Promise.all(servers.map(server => limit(async () => {
            if (!server.ip_data || server.ip_data.length === 0 || !server.ip_data[0].address) {
                return null; // Skip if no IPs
            }

            const mainIp = server.ip_data[0].address;
            const isUp = await pingIP(mainIp);
            const newStatus = isUp ? 'Active' : 'Down';

            // Log & track update only if the status actually flips
            if (server.status !== newStatus) {
                console.log(`Server ${server.id} status changed: ${server.status} => ${newStatus}`);
                return { id: server.id, status: newStatus };
            }
            return null;
        })));

        const serversToUpdate = updates.filter(Boolean);

        // 2. Push updates to DB
        if (serversToUpdate.length > 0) {
            for (const s of serversToUpdate) {
                await supabase.from('servers').update({ status: s.status, updated_at: new Date().toISOString() }).eq('id', s.id);
            }
        }

        return { statusCode: 200, body: `Status check complete. Updated ${serversToUpdate.length} servers.` };
    } catch (err) {
        console.error("Scheduled Ping Failed:", err);
        return { statusCode: 500, body: err.message };
    }
};

// Netlify Cron Schedule: 9am and 9pm (UTC)
exports.handler = schedule("0 9,21 * * *", handler);
