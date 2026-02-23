import { createClient } from "@supabase/supabase-js";
import net from "net";
import pLimit from "p-limit";

// Requires SUPABASE_SERVICE_ROLE_KEY environment variable in Netlify
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function pingIP(ip) {
    let isUp = await checkPort(80, ip);
    if (!isUp) isUp = await checkPort(443, ip);
    if (!isUp) isUp = await checkPort(22, ip);
    return isUp;
}

export const handler = async function (event, context) {
    // Only accept POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase credentials in environment variables.");
        }

        const { data: servers, error: fetchError } = await supabase.from('servers').select('id, status, ip_data');
        if (fetchError) throw fetchError;

        if (!servers || servers.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: "No servers available to ping.", updated: 0 }) };
        }

        const limit = pLimit(10);

        const updates = await Promise.all(servers.map(server => limit(async () => {
            if (!server.ip_data || server.ip_data.length === 0 || !server.ip_data[0].address) return null;

            const mainIp = server.ip_data[0].address;
            const isUp = await pingIP(mainIp);
            const newStatus = isUp ? 'Active' : 'Down';

            if (server.status !== newStatus) {
                return { id: server.id, status: newStatus };
            }
            return null;
        })));

        const serversToUpdate = updates.filter(Boolean);

        if (serversToUpdate.length > 0) {
            for (const s of serversToUpdate) {
                await supabase.from('servers').update({ status: s.status, updated_at: new Date().toISOString() }).eq('id', s.id);
            }
        }

        return { statusCode: 200, body: JSON.stringify({ message: "Ping operation complete", updated: serversToUpdate.length }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
