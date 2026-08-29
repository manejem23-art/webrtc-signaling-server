const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end(
        "Clinical OS WebRTC Signaling Server Running"
    );

});

const wss = new WebSocket.Server({
    server
});


// ==========================================================
// ROOMS
// ==========================================================

const rooms = {};


// ==========================================================
// SEND
// ==========================================================

function send(ws, data) {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {

        ws.send(
            JSON.stringify(data)
        );

    }

}


// ==========================================================
// SEND TO OTHER CLIENTS IN ROOM
// ==========================================================

function sendToOthers(room, sender, data) {

    if (!rooms[room]) {
        return;
    }

    rooms[room].forEach(client => {

        if (
            client !== sender &&
            client.readyState === WebSocket.OPEN
        ) {

            send(client, data);

        }

    });

}


// ==========================================================
// SEND TO SPECIFIC ROLE
// ==========================================================

function sendToRole(room, sender, targetRole, data) {

    if (!rooms[room]) {
        return;
    }

    rooms[room].forEach(client => {

        if (
            client !== sender &&
            client.readyState === WebSocket.OPEN &&
            client.role === targetRole
        ) {

            send(client, data);

        }

    });

}


// ==========================================================
// WEBSOCKET CONNECTION
// ==========================================================

wss.on("connection", (ws, request) => {

    console.log("----------------------------------------");
    console.log("WebSocket connected");
    console.log(
        "IP:",
        request.socket.remoteAddress
    );
    console.log("----------------------------------------");


    ws.room = null;
    ws.role = null;


    // ======================================================
    // MESSAGE
    // ======================================================

    ws.on("message", raw => {

        let data;

        try {

            data =
                JSON.parse(
                    raw.toString()
                );

        } catch(error) {

            console.error(
                "Invalid JSON:",
                raw.toString()
            );

            return;

        }


        console.log(
            "MESSAGE:",
            data.type,
            "ROLE:",
            data.role || ws.role,
            "ROOM:",
            data.room || ws.room
        );


        // ==================================================
        // JOIN
        // ==================================================

        if (data.type === "join") {

            const room =
                data.room ||
                "SUPPORT-ROOM-9021";

            const role =
                data.role ||
                "unknown";


            ws.room = room;
            ws.role = role;


            if (!rooms[room]) {

                rooms[room] = [];

            }


            // Remove duplicate socket

            if (!rooms[room].includes(ws)) {

                rooms[room].push(ws);

            }


            console.log(
                "JOIN:",
                role,
                "->",
                room,
                "clients:",
                rooms[room].length
            );


            // Tell joining client

            send(ws, {

                type: "joined",

                room: room,

                role: role

            });


            // Tell existing clients

            sendToOthers(
                room,
                ws,
                {

                    type: "peer-joined",

                    role: role

                }
            );


            // Explicit role notification

            if (role === "doctor-support") {

                sendToRole(
                    room,
                    ws,
                    "admin-support",
                    {

                        type:
                            "doctor-connected"

                    }
                );

            }


            if (role === "admin-support") {

                sendToRole(
                    room,
                    ws,
                    "doctor-support",
                    {

                        type:
                            "admin-connected"

                    }
                );

            }


            return;

        }


        // ==================================================
        // REQUIRE JOIN
        // ==================================================

        if (!ws.room) {

            send(ws, {

                type: "error",

                message:
                    "You must join a room first."

            });

            return;

        }


        const room = ws.room;


        // ==================================================
        // SCREEN REQUEST
        // ADMIN -> DOCTOR
        // ==================================================

        if (
            data.type ===
            "screen-share-request"
        ) {

            console.log(
                "Screen request:",
                room
            );


            sendToRole(
                room,
                ws,
                "doctor-support",
                {

                    type:
                        "screen-share-request",

                    room:
                        room

                }
            );


            return;

        }


        // ==================================================
        // SCREEN OFFER
        // DOCTOR -> ADMIN
        // ==================================================

        if (
            data.type ===
            "screen-offer"
        ) {

            console.log(
                "Screen offer:",
                room
            );


            sendToRole(
                room,
                ws,
                "admin-support",
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


        // ==================================================
        // SCREEN ANSWER
        // ADMIN -> DOCTOR
        // ==================================================

        if (
            data.type ===
            "screen-answer"
        ) {

            console.log(
                "Screen answer:",
                room
            );


            sendToRole(
                room,
                ws,
                "doctor-support",
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


        // ==================================================
        // SCREEN ICE
        // BOTH DIRECTIONS
        // ==================================================

        if (
            data.type ===
            "screen-ice-candidate"
        ) {

            const targetRole =
                ws.role ===
                "doctor-support"
                    ? "admin-support"
                    : "doctor-support";


            sendToRole(
                room,
                ws,
                targetRole,
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


        // ==================================================
        // SCREEN STOPPED
        // ==================================================

        if (
            data.type ===
            "screen-stopped"
        ) {

            sendToOthers(
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


        // ==================================================
        // SUPPORT MESSAGE
        // ==================================================

        if (
            data.type ===
            "support-message"
        ) {

            sendToOthers(
                room,
                ws,
                data
            );

            return;

        }


        // ==================================================
        // OTHER WEBRTC / PMS EVENTS
        // ==================================================

        const allowedMessages = [

            "offer",
            "answer",
            "ice-candidate",
            "prescription-update",
            "patient-vitals",
            "patient-allergy",
            "vitals-update",
            "allergy-update"

        ];


        if (
            allowedMessages.includes(
                data.type
            )
        ) {

            sendToOthers(
                room,
                ws,
                data
            );

            return;

        }


        console.log(
            "Unhandled message:",
            data.type
        );

    });


    // ======================================================
    // CLOSE
    // ======================================================

    ws.on("close", () => {

        const room = ws.room;
        const role = ws.role;


        console.log(
            "WebSocket disconnected:",
            role,
            room
        );


        if (
            room &&
            rooms[room]
        ) {

            rooms[room] =
                rooms[room].filter(
                    client =>
                        client !== ws
                );


            sendToOthers(
                room,
                null,
                {

                    type:
                        "peer-left",

                    role:
                        role

                }
            );


            if (
                rooms[room].length === 0
            ) {

                delete rooms[room];

            }

        }

    });


    // ======================================================
    // ERROR
    // ======================================================

    ws.on("error", error => {

        console.error(
            "WebSocket error:",
            error
        );

    });

});


// ==========================================================
// START
// ==========================================================

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "Clinical OS WebRTC Signaling Server"
        );

        console.log(
            "HOST:",
            HOST
        );

        console.log(
            "PORT:",
            PORT
        );

        console.log(
            "========================================"
        );

    }
);
