const WebSocket = require('ws');

// Render assigns a dynamic PORT environment variable
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

// ==========================================================
// EXISTING WEBRTC VIDEO CONSULTATION SYSTEM
// ==========================================================

wss.on('connection', (ws) => {
    let currentRoom = null;
    let supportRoom = null;
    let deviceInfo = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // ==================================================
            // EXISTING VIDEO CONSULTATION SYSTEM
            // DO NOT CHANGE
            // ==================================================

            switch (data.type) {

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


                // ==================================================
                // EXISTING PRESCRIPTION / PATIENT MESSAGES
                // ADDED RELAY SUPPORT
                // ==================================================

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

                // Doctor/admin joins a support room
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

                    // Prevent duplicate socket registration
                    if (!rooms[supportRoom].includes(ws)) {
                        rooms[supportRoom].push(ws);
                    }

                    // Tell the new client that they successfully joined
                    ws.send(JSON.stringify({
                        type: 'support-joined',
                        room: supportRoom,
                        device: deviceInfo
                    }));

                    // Tell everyone else about this device
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


                // ==================================================
                // SUPPORT DEVICE DISCOVERY
                // ==================================================

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


                // ==================================================
                // ADMIN REQUESTS SUPPORT FROM DOCTOR DEVICE
                // ==================================================

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


                // ==================================================
                // DOCTOR ACCEPTS SUPPORT REQUEST
                // ==================================================

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


                // ==================================================
                // DOCTOR REJECTS SUPPORT REQUEST
                // ==================================================

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


                // ==================================================
                // SUPPORT WEBRTC OFFER
                // Used for screen sharing
                // ==================================================

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


                // ==================================================
                // SUPPORT WEBRTC ANSWER
                // ==================================================

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


                // ==================================================
                // SUPPORT ICE CANDIDATES
                // ==================================================

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


                // ==================================================
                // SUPPORT STARTED
                // ==================================================

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


                // ==================================================
                // SCREEN SHARING STOPPED
                // ==================================================

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


                // ==================================================
                // SUPPORT CHAT / COMMAND MESSAGES
                // ==================================================

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


                // ==================================================
                // SUPPORT DISCONNECT
                // ==================================================

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

            console.error(
                "Error parsing message:",
                err
            );

        }
    });


    // ==========================================================
    // CONNECTION CLOSED
    // ==========================================================

    ws.on('close', () => {

        // ------------------------------------------------------
        // EXISTING VIDEO ROOM CLEANUP
        // ------------------------------------------------------

        if (currentRoom && rooms[currentRoom]) {

            rooms[currentRoom] =
                rooms[currentRoom].filter(
                    client => client !== ws
                );

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


        // ------------------------------------------------------
        // SUPPORT ROOM CLEANUP
        // ------------------------------------------------------

        if (supportRoom && rooms[supportRoom]) {

            rooms[supportRoom] =
                rooms[supportRoom].filter(
                    client => client !== ws
                );

            rooms[supportRoom].forEach(client => {

                if (client.readyState === WebSocket.OPEN) {

                    client.send(JSON.stringify({
                        type: 'support-device-left',
                        deviceId: deviceInfo
                            ? deviceInfo.deviceId
                            : null
                    }));

                }

            });

            if (rooms[supportRoom].length === 0) {
                delete rooms[supportRoom];
            }

            console.log(
                `[SUPPORT] Device disconnected from ${supportRoom}`
            );
        }

    });

});

console.log(
    `WebRTC Signaling Server running on port ${PORT}`
);
```
