const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("Clinical OS WebRTC Signaling Server Running");
});

// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss = new WebSocket.Server({
    server: server
});

// ============================================================
// ROOMS
// ============================================================
//
// rooms = {
//    "SUPPORT-ROOM-9021": [
//       websocket,
//       websocket
//    ]
// }
//

const rooms = {};

// ============================================================
// HELPER: SEND TO EVERYONE IN ROOM EXCEPT SENDER
// ============================================================

function broadcast(room, sender, data) {

    if (!room) {
        return;
    }

    if (!rooms[room]) {
        return;
    }

    const message = JSON.stringify(data);

    rooms[room].forEach(client => {

        if (
            client !== sender &&
            client.readyState === WebSocket.OPEN
        ) {

            try {
                client.send(message);
            } catch (error) {
                console.error("Broadcast error:", error);
            }

        }

    });
}

// ============================================================
// HELPER: SEND TO EVERYONE IN ROOM
// ============================================================

function broadcastAll(room, data) {

    if (!room || !rooms[room]) {
        return;
    }

    const message = JSON.stringify(data);

    rooms[room].forEach(client => {

        if (client.readyState === WebSocket.OPEN) {

            try {
                client.send(message);
            } catch (error) {
                console.error("Broadcast all error:", error);
            }

        }

    });
}

// ============================================================
// CONNECTION
// ============================================================

wss.on("connection", (ws, request) => {

    console.log("WebSocket client connected");

    let currentRoom = null;
    let role = "unknown";
    let deviceInfo = null;

    // ========================================================
    // MESSAGE
    // ========================================================

    ws.on("message", rawMessage => {

        try {

            const data = JSON.parse(rawMessage.toString());

            console.log(
                "Message:",
                data.type,
                "Room:",
                data.room || currentRoom
            );

            // =================================================
            // JOIN ROOM
            // =================================================

            if (data.type === "join") {

                const room =
                    data.room ||
                    "SUPPORT-ROOM-9021";

                currentRoom = room;

                role =
                    data.role ||
                    "unknown";

                // Create room
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = [];
                }

                // Don't add same socket twice
                if (!rooms[currentRoom].includes(ws)) {

                    rooms[currentRoom].push(ws);

                }

                console.log(
                    `Client joined room ${currentRoom} as ${role}`
                );

                // Tell joining client
                ws.send(JSON.stringify({

                    type: "joined",

                    room: currentRoom,

                    role: role

                }));

                // Tell everyone else
                broadcast(
                    currentRoom,
                    ws,
                    {

                        type: "peer-joined",

                        role: role

                    }
                );

                // If doctor joins, tell admin
                if (role === "doctor-support") {

                    broadcast(
                        currentRoom,
                        ws,
                        {

                            type: "doctor-connected"

                        }
                    );

                }

                // If admin joins, tell doctor
                if (role === "admin-support") {

                    broadcast(
                        currentRoom,
                        ws,
                        {

                            type: "admin-connected"

                        }
                    );

                }

                return;
            }

            // =================================================
            // SUPPORT JOIN
            // =================================================
            //
            // Keep compatibility with older code.
            //

            if (data.type === "support-join") {

                const room =
                    data.room ||
                    data.supportRoom ||
                    "SUPPORT-ROOM-9021";

                currentRoom = room;

                role =
                    data.role ||
                    "unknown";

                deviceInfo = {

                    deviceId:
                        data.deviceId ||
                        null,

                    deviceName:
                        data.deviceName ||
                        "Unknown Device",

                    role:
                        role,

                    platform:
                        data.platform ||
                        "unknown",

                    browser:
                        data.browser ||
                        "unknown",

                    joinedAt:
                        new Date().toISOString()

                };

                if (!rooms[currentRoom]) {

                    rooms[currentRoom] = [];

                }

                if (!rooms[currentRoom].includes(ws)) {

                    rooms[currentRoom].push(ws);

                }

                ws.send(JSON.stringify({

                    type: "support-joined",

                    room: currentRoom,

                    device: deviceInfo

                }));

                broadcast(
                    currentRoom,
                    ws,
                    {

                        type: "support-device",

                        device: deviceInfo

                    }
                );

                return;
            }

            // =================================================
            // MAKE SURE CLIENT IS IN A ROOM
            // =================================================

            const room =
                data.room ||
                currentRoom;

            if (!room) {

                ws.send(JSON.stringify({

                    type: "error",

                    message:
                        "Client has not joined a room."

                }));

                return;
            }

            // =================================================
            // SCREEN SHARE REQUEST
            // =================================================

            if (data.type === "screen-share-request") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "screen-share-request",

                        room:
                            room

                    }
                );

                return;
            }

            // =================================================
            // SCREEN OFFER
            // =================================================

            if (data.type === "screen-offer") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "screen-offer",

                        room:
                            room,

                        offer:
                            data.offer

                    }
                );

                return;
            }

            // =================================================
            // SCREEN ANSWER
            // =================================================

            if (data.type === "screen-answer") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "screen-answer",

                        room:
                            room,

                        answer:
                            data.answer

                    }
                );

                return;
            }

            // =================================================
            // SCREEN ICE
            // =================================================

            if (data.type === "screen-ice-candidate") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "screen-ice-candidate",

                        room:
                            room,

                        candidate:
                            data.candidate

                    }
                );

                return;
            }

            // =================================================
            // SCREEN STOPPED
            // =================================================

            if (data.type === "screen-stopped") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "screen-stopped",

                        room:
                            room

                    }
                );

                return;
            }

            // =================================================
            // SCREEN SHARE STARTED
            // =================================================

            if (data.type === "support-started") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "support-started",

                        room:
                            room

                    }
                );

                return;
            }

            // =================================================
            // SUPPORT MESSAGE
            // =================================================

            if (data.type === "support-message") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "support-message",

                        message:
                            data.message || ""

                    }
                );

                return;
            }

            // =================================================
            // SUPPORT DISCONNECT
            // =================================================

            if (data.type === "support-disconnect") {

                broadcast(
                    room,
                    ws,
                    {

                        type:
                            "support-disconnect"

                    }
                );

                return;
            }

            // =================================================
            // NORMAL WEBRTC CONSULTATION SIGNALING
            // =================================================

            const normalWebRTC =
                [
                    "offer",
                    "answer",
                    "ice-candidate",
                    "prescription-update",
                    "patient-vitals",
                    "patient-allergy",
                    "vitals-update",
                    "allergy-update"
                ];

            if (normalWebRTC.includes(data.type)) {

                broadcast(
                    room,
                    ws,
                    data
                );

                return;
            }

            // =================================================
            // UNKNOWN MESSAGE
            // =================================================

            console.log(
                "Unknown message type:",
                data.type
            );

        } catch (error) {

            console.error(
                "Message processing error:",
                error
            );

        }

    });

    // ========================================================
    // CLOSE
    // ========================================================

    ws.on("close", () => {

        console.log(
            "WebSocket client disconnected:",
            role,
            currentRoom
        );

        if (
            currentRoom &&
            rooms[currentRoom]
        ) {

            rooms[currentRoom] =
                rooms[currentRoom].filter(
                    client => client !== ws
                );

            // Tell remaining clients
            broadcastAll(
                currentRoom,
                {

                    type:
                        "peer-left",

                    role:
                        role

                }
            );

            // Delete empty room
            if (
                rooms[currentRoom].length === 0
            ) {

                delete rooms[currentRoom];

            }

        }

    });

    // ========================================================
    // ERROR
    // ========================================================

    ws.on("error", error => {

        console.error(
            "WebSocket error:",
            error
        );

    });

});

// ============================================================
// START SERVER
// ============================================================

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            `Clinical OS WebRTC Signaling Server running on port ${PORT}`
        );

    }
);
