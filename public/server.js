const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let privateClients = [];

// Private local HTML file connects here to stream live updates
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    privateClients.push(res);

    req.on('close', () => {
        privateClients = privateClients.filter(client => client !== res);
    });
});

// Public GitHub Pages website hits this to fire a ping
app.post('/api/ping', (req, res) => {
    const timestamp = new Date().toLocaleTimeString();
    
    privateClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ alert: true, time: timestamp })}\n\n`);
    });

    console.log(`Ping broadcasted at ${timestamp}`);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ping Server running on port ${PORT}`));
