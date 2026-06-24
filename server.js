const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 🟢 Serves your index.html directly from the main root folder now!
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let privateClients = [];

// Private local file on your laptop connects here to listen for logs
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); 

    res.write('data: {"connected": true}\n\n');
    privateClients.push(res);

    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            res.write(':\n\n');
        }
    }, 20000); 

    req.on('close', () => {
        clearInterval(heartbeat);
        privateClients = privateClients.filter(client => client !== res);
    });
});

// The public sender button hits this route
app.post('/api/ping', (req, res) => {
    const timestamp = new Date().toLocaleTimeString();
    
    privateClients.forEach(client => {
        if (!client.writableEnded) {
            try {
                client.write(`data: ${JSON.stringify({ alert: true, time: timestamp })}\n\n`);
            } catch (err) {
                console.error("Failed to write to local client:", err);
            }
        }
    });

    console.log(`Ping broadcasted at ${timestamp}`);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
