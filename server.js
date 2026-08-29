const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";


// ==========================================================
// HTTP SERVER
// ==========================================================

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end(
        "Clinical OS WebRTC Signaling Server Running"
    );

});


// ==========================================================
// WEBSOCKET SERVER
// ==========================================================

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
// SEND TO EVERYONE EXCEPT SENDER
// ==========================================================

function sendToOthers(
    room,
    sender,
    data
) {

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
// SEND TO ROLE
// ==========================================================

function sendToRole(
    room,
    sender,
    targetRole,
    data
) {

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
// CONNECTION
// ==========================================================

wss.on(
    "connection",
    (ws, request) => {

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "NEW WEBSOCKET CONNECTION"
        );
        console.log(
            "IP:",
            request.socket.remoteAddress
        );
        console.log(
            "========================================"
        );


        ws.room = null;
        ws.role = null;


        // ==================================================
        // MESSAGE
        // ==================================================

        ws.on(
            "message",
            raw => {

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
                    "| ROLE:",
                    data.role || ws.role,
                    "| ROOM:",
                    data.room || ws.room
                );


                // ==========================================
                // JOIN
                // ==========================================

                if (
                    data.type ===
                    "join"
                ) {

                    const room =
                        data.room ||
                        "SUPPORT-ROOM-9021";


                    const role =
                        data.role ||
                        "unknown";


                    ws.room =
                        room;

                    ws.role =
                        role;


                    if (
                        !rooms[room]
                    ) {

                        rooms[room] =
                            [];

                    }


                    // Prevent duplicate socket

                    if (
                        !rooms[room].includes(ws)
                    ) {

                        rooms[room].push(ws);

                    }


                    console.log(
                        "JOINED:",
                        role,
                        "ROOM:",
                        room,
                        "TOTAL:",
                        rooms[room].length
                    );


                    // --------------------------------------
                    // Confirm join to this client
                    // --------------------------------------

                    send(
                        ws,
                        {

                            type:
                                "joined",

                            room:
                                room,

                            role:
                                role

                        }
                    );


                    // --------------------------------------
                    // Tell existing clients
                    // --------------------------------------

                    sendToOthers(
                        room,
                        ws,
                        {

                            type:
                                "peer-joined",

                            role:
                                role

                        }
                    );


                    // ======================================
                    // IMPORTANT FIX
                    // ======================================
                    //
                    // If ADMIN joins and DOCTOR is already
                    // inside the room:
                    //
                    // Tell ADMIN:
                    // "doctor-connected"
                    //
                    // ======================================

                    if (
                        role ===
                        "admin-support"
                    ) {

                        console.log(
                            "Admin joined."
                        );


                        const doctorExists =
                            rooms[room]
                                .some(
                                    client =>
                                        client !== ws &&
                                        client.role ===
                                            "doctor-support"
                                );


                        if (
                            doctorExists
                        ) {

                            console.log(
                                "Doctor already exists."
                            );


                            send(
                                ws,
                                {

                                    type:
                                        "doctor-connected",

                                    room:
                                        room

                                }
                            );

                        }

                    }


                    // ======================================
                    // If DOCTOR joins and ADMIN already
                    // exists:
                    //
                    // Tell DOCTOR:
                    // "admin-connected"
                    // ======================================

                    if (
                        role ===
                        "doctor-support"
                    ) {

                        console.log(
                            "Doctor joined."
                        );


                        const adminExists =
                            rooms[room]
                                .some(
                                    client =>
                                        client !== ws &&
                                        client.role ===
                                            "admin-support"
                                );


                        if (
                            adminExists
                        ) {

                            console.log(
                                "Admin already exists."
                            );


                            send(
                                ws,
                                {

                                    type:
                                        "admin-connected",

                                    room:
                                        room

                                }
                            );

                        }

                    }


                    return;

                }


                // ==================================================
                // MAKE SURE CLIENT JOINED
                // ==================================================

                if (
                    !ws.room
                ) {

                    send(
                        ws,
                        {

                            type:
                                "error",

                            message:
                                "You must join a room first."

                        }
                    );


                    return;

                }


                const room =
                    ws.room;


                // ==================================================
                // ADMIN REQUESTS SCREEN
                // ==================================================

                if (
                    data.type ===
                    "screen-share-request"
                ) {

                    console.log(
                        "SCREEN REQUEST"
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
                // DOCTOR SCREEN OFFER
                // ==================================================

                if (
                    data.type ===
                    "screen-offer"
                ) {

                    console.log(
                        "SCREEN OFFER"
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
                // ADMIN SCREEN ANSWER
                // ==================================================

                if (
                    data.type ===
                    "screen-answer"
                ) {

                    console.log(
                        "SCREEN ANSWER"
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
                // SCREEN ICE CANDIDATE
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


                    console.log(
                        "SCREEN ICE:",
                        ws.role,
                        "->",
                        targetRole
                    );


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

                    console.log(
                        "SCREEN STOPPED"
                    );


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
                // EXISTING CONSULTATION SIGNALING
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

            }
        );


        // ==================================================
        // CLOSE
        // ==================================================

        ws.on(
            "close",
            () => {

                const room =
                    ws.room;

                const role =
                    ws.role;


                console.log(
                    "DISCONNECTED:",
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
                        rooms[room].length ===
                        0
                    ) {

                        delete rooms[room];

                    }

                }

            }
        );


        // ==================================================
        // ERROR
        // ==================================================

        ws.on(
            "error",
            error => {

                console.error(
                    "WEBSOCKET ERROR:",
                    error
                );

            }
        );

    }
);


// ==========================================================
// START SERVER
// ==========================================================

server.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "CLINICAL OS SIGNALING SERVER"
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
