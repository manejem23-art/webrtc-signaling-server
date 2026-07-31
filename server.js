const WebSocket = require('ws');
// Render assigns a dynamic PORT environment variable
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    currentRoom = data.room;
                    if (!rooms[currentRoom]) rooms[currentRoom] = [];
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
                    if (rooms[currentRoom]) {
                        rooms[currentRoom].forEach(client => {
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
    });
});

console.log(`WebRTC Signaling Server running on port ${PORT}`);
