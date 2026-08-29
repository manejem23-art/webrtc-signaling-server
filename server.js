const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

// Create a simple HTTP server without SSL/HTTPS overhead
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebRTC Signaling Server Running');
});

// Attach WebSocket Server
const wss = new WebSocket.Server({ server });

const rooms = {};

// ==========================================================
// WEBRTC CONSULTATION & PMS REMOTE SUPPORT SYSTEM
// ==========================================================

wss.on('connection', (ws) => {
    let currentRoom = null;
    let supportRoom = null;
    let deviceInfo = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {

                // ==================================================
                // VIDEO CONSULTATION SYSTEM
                // ==================================================

                case 'join':
                    currentRoom = data.room;

                    if (!rooms[currentRoom]) {
                        rooms[currentRoom] = [];
                    }

                    rooms[currentRoom].push(ws);

                    rooms[currentRoom].forEach(client => {
                        if (
                            client !== ws &&
                            client.readyState === WebSocket.OPEN
                        ) {
                            client.send(JSON.stringify({
                                type: 'peer-joined'
                            }));
                        }
                    });

                    break;

                case 'offer':
                case 'answer':
                case 'ice-candidate':

                    if (rooms[currentRoom]) {
                        rooms[currentRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    }

                    break;

                case 'prescription-update':
                case 'patient-vitals':
                case 'patient-allergy':
                case 'vitals-update':
                case 'allergy-update':

                    if (rooms[currentRoom]) {
                        rooms[currentRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify(data));
                            }
                        });
                    }

                    break;


                // ==================================================
                // PMS SUPPORT SYSTEM
                // ==================================================

                case 'support-join':

                    supportRoom = data.room || data.supportRoom;

                    deviceInfo = {
                        deviceId: data.deviceId || null,
                        deviceName: data.deviceName || 'Unknown Device',
                        role: data.role || 'unknown',
                        platform: data.platform || 'unknown',
                        browser: data.browser || 'unknown',
                        userAgent: data.userAgent || '',
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
                        if (
                            client !== ws &&
                            client.readyState === WebSocket.OPEN
                        ) {
                            client.send(JSON.stringify({
                                type: 'support-device',
                                device: deviceInfo
                            }));
                        }
                    });

                    console.log(
                        `[SUPPORT] ${deviceInfo.role} joined room ${supportRoom} - ${deviceInfo.deviceName}`
                    );

                    break;

                case 'support-device-info':

                    if (supportRoom && rooms[supportRoom]) {
                        const info = {
                            deviceId: data.deviceId || null,
                            deviceName: data.deviceName || 'Unknown Device',
                            role: data.role || 'unknown',
                            platform: data.platform || 'unknown',
                            browser: data.browser || 'unknown',
                            userAgent: data.userAgent || '',
                            timestamp: new Date().toISOString()
                        };

                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-device',
                                    device: info
                                }));
                            }
                        });
                    }

                    break;

                case 'support-request':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-request',
                                    requestId: data.requestId || null,
                                    adminId: data.adminId || null,
                                    message: data.message || 'Admin requested remote support',
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'support-accepted':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-accepted',
                                    requestId: data.requestId || null,
                                    deviceId: data.deviceId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'support-rejected':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-rejected',
                                    requestId: data.requestId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'support-offer':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-offer',
                                    offer: data.offer,
                                    fromDeviceId: data.deviceId || null
                                }));
                            }
                        });
                    }

                    break;

                case 'support-answer':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-answer',
                                    answer: data.answer,
                                    fromDeviceId: data.deviceId || null
                                }));
                            }
                        });
                    }

                    break;

                case 'support-ice-candidate':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-ice-candidate',
                                    candidate: data.candidate,
                                    fromDeviceId: data.deviceId || null
                                }));
                            }
                        });
                    }

                    break;

                case 'support-started':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-started',
                                    deviceId: data.deviceId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'screen-share-stopped':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'screen-share-stopped',
                                    deviceId: data.deviceId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'support-message':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-message',
                                    message: data.message || '',
                                    fromDeviceId: data.deviceId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;

                case 'support-disconnect':

                    if (supportRoom && rooms[supportRoom]) {
                        rooms[supportRoom].forEach(client => {
                            if (
                                client !== ws &&
                                client.readyState === WebSocket.OPEN
                            ) {
                                client.send(JSON.stringify({
                                    type: 'support-disconnect',
                                    deviceId: data.deviceId || null,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });
                    }

                    break;
            }

        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    // ==========================================================
    // DISCONNECT HANDLER
    // ==========================================================

    ws.on('close', () => {

        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(client => client !== ws);

            rooms[currentRoom].forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'peer-left'
                    }));
                }
            });

            if (rooms[currentRoom].length === 0) {
                delete rooms[currentRoom];
            }
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

            if (rooms[supportRoom].length === 0) {
                delete rooms[supportRoom];
            }

            console.log(`[SUPPORT] Device disconnected from ${supportRoom}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[NO-SSL] WebRTC Signaling Server running on port ${PORT}`);
});
