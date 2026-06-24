const express = require('express');
const cors = require('cors');
const path = require('path'); // Built-in Node.js module to handle file paths safely
const app = express();

app.use(cors());
app.use(express.json());

// Forces Express to find your 'public' folder accurately on Render's servers
app.use(express.static(path.join(__dirname, 'public'))); 

let privateClients = [];

// Private local HTML file connects here to stream live updates
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Extra header to bypass Render proxy buffering issues
    res.setHeader('X-Accel-Buffering', 'no'); 

    // Send an initial connection confirmation
    res.write('data: {"connected": true}\n\n');

    privateClients.push(res);

    // Setup a heartbeat to prevent Render from killing the connection during silence
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            res.write(':\n\n'); // SSE comment format acts as a heartbeat ping
        }
    }, 20000); 

    req.on('close', () => {
        clearInterval(heartbeat);
        privateClients = privateClients.filter(client => client !== res);
    });
});

// Public GitHub Pages website hits this to fire a ping
app.post('/api/ping', (req, res) => {
    const timestamp = new Date().toLocaleTimeString();
    
    privateClients.forEach(client => {
        // Only write if the connection is active and healthy to prevent server crashes
        if (!client.writableEnded) {
            try {
                client.write(`data: ${JSON.stringify({ alert: true, time: timestamp })}\n\n`);
            } catch (err) {
                console.error("Failed to write to a client:", err);
            }
        }
    });

    console.log(`Ping broadcasted at ${timestamp}`);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ping Server running on port ${PORT}`));
