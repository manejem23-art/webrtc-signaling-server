const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const HOST = '127.0.0.1';

// HTTP Server instance
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Signaling Server Running');
});

// WebSocket Server attached to HTTP Server
const wss = new WebSocket.Server({ server });

const rooms = {};

// Connection Handler
wss.on('connection', (ws) => {
    let currentRoom = null;
    let supportRoom = null;
    let deviceInfo = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {

                // Video Consultation Actions
                case 'join':
                    currentRoom = data.room;
                    if (!rooms[currentRoom]) {
                        rooms[currentRoom] = [];
                    }
                    rooms[currentRoom].push(ws);

                    rooms[currentRoom].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'peer-joined' }));
                        }
                    });
                    break;

                case 'offer':
                case 'answer':
                case 'ice-candidate':
                case 'prescription-update':
                case 'patient-vitals':
                case 'patient-allergy':
                case 'vitals-update':
                case 'allergy-update':
                    if (rooms[currentRoom]) {
                        rooms[currentRoom].forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    }
                    break;

                // Support System Actions
                case 'support-join':
                    supportRoom = data.room || data.supportRoom;
                    deviceInfo = {
                        deviceId: data.deviceId || null,
                        deviceName: data.deviceName || 'Unknown Device',
                        role: data.role || 'unknown',
                        platform: data.platform || 'unknown',
                        browser: data.browser || 'unknown',
                        joinedAt: new Date().toISOString()
                    };

                    if (!rooms[supportRoom]) {
                        rooms[supportRoom] = [];
                    }
                    if (!rooms[supportRoom].includes(ws)) {
                        rooms[supportRoom].push(ws);
                    }

                    ws.send(JSON.stringify({
                        type: 'support-joined',
                        room: supportRoom,
                        device: deviceInfo
                    }));

                    rooms[supportRoom].forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'support-device',
                                device: deviceInfo
                            }));
                        }
                    });
                    break;

                case 'support-request':
                case 'support-accepted':
                case 'support-rejected':
                case 'support-offer':
                case 'support-answer':
                case 'support-ice-candidate':
                case 'support-started':
                case 'screen-share-stopped':
                case 'support-message':
                case 'support-disconnect':
                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    }
                    break;
            }
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(client => client !== ws);
            rooms[currentRoom].forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'peer-left' }));
                }
            });
            if (rooms[currentRoom].length === 0) delete rooms[currentRoom];
        }

        if (supportRoom && rooms[supportRoom]) {
            rooms[supportRoom] = rooms[supportRoom].filter(client => client !== ws);
            rooms[supportRoom].forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'support-device-left',
                        deviceId: deviceInfo ? deviceInfo.deviceId : null
                    }));
                }
            });
            if (rooms[supportRoom].length === 0) delete rooms[supportRoom];
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`WebRTC Signaling Server running on http://${HOST}:${PORT}`);
});
