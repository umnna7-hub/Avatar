const http = require("http");
const https = require("https");

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

// You can change the model from PowerShell using:
// $env:OPENAI_MODEL = "your-model-name"
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

// Demo mode is OFF by default.
// This is important because API errors should NOT be hidden.
// To enable demo mode intentionally:
// $env:DEMO_MODE = "true"
const DEMO_MODE = process.env.DEMO_MODE === "true";


// ============================================================
// LOAD PERSONALITY
// ============================================================

let personality = null;

try {
    personality = require("./personality");

    console.log("Personality file loaded successfully.");
} catch (error) {
    console.log(
        "No personality.js loaded. Continuing without personality instructions."
    );
}


// ============================================================
// SERVER STARTUP INFORMATION
// ============================================================

console.log("========================================");
console.log("Avatar AI Backend");
console.log("API key detected:", Boolean(API_KEY));
console.log("Model:", MODEL);
console.log("Demo mode:", DEMO_MODE);
console.log("========================================");


// ============================================================
// SEND JSON RESPONSE
// ============================================================

function sendJson(response, statusCode, data) {

    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8"
    });

    response.end(JSON.stringify(data));
}


// ============================================================
// DEMO RESPONSE
// ============================================================

function demoResponse(messages) {

    const lastMessage =
        messages[messages.length - 1]?.content || "";

    const text = String(lastMessage).trim();


    /*
        IMPORTANT BUG FIX

        DO NOT use:

        text.includes("hi")

        because words like:

        polymorphism
        this
        inheritance

        may contain those letters.

        We only want "hi" when the user actually says hi.
    */

    if (/^(hi|hello|hey)(\s|[!.?,]|$)/i.test(text)) {

        return "Hello! I'm Avatar. How can I help you?";
    }


    if (/\bwho are you\b/i.test(text)) {

        return "I'm Avatar, your personal AI assistant.";
    }


    return "I'm currently running in demo mode.";
}


// ============================================================
// EXTRACT TEXT FROM OPENAI RESPONSE
// ============================================================

function extractOutputText(result) {

    // Normal Responses API response
    if (
        typeof result.output_text === "string" &&
        result.output_text.trim()
    ) {

        return result.output_text.trim();
    }


    // Backup extraction
    if (Array.isArray(result.output)) {

        const parts = [];


        for (const item of result.output) {

            if (!Array.isArray(item.content)) {
                continue;
            }


            for (const content of item.content) {

                if (
                    content &&
                    content.type === "output_text" &&
                    typeof content.text === "string"
                ) {

                    parts.push(content.text);
                }
            }
        }


        const text = parts.join("\n").trim();


        if (text) {
            return text;
        }
    }


    return "";
}


// ============================================================
// CALL OPENAI
// ============================================================

function askOpenAI(messages) {

    return new Promise((resolve, reject) => {


        // ------------------------------------------------------
        // CHECK API KEY
        // ------------------------------------------------------

        if (!API_KEY) {

            reject(
                new Error(
                    "OPENAI_API_KEY is not set in this terminal."
                )
            );

            return;
        }


        // ------------------------------------------------------
        // REQUEST BODY
        // ------------------------------------------------------

        const payload = {

            model: MODEL,

            input: messages
        };


        // ------------------------------------------------------
        // ADD PERSONALITY
        // ------------------------------------------------------

        if (
            personality &&
            typeof personality.systemPrompt === "string" &&
            personality.systemPrompt.trim()
        ) {

            payload.instructions =
                personality.systemPrompt;
        }


        const body = JSON.stringify(payload);


        // ------------------------------------------------------
        // HTTPS OPTIONS
        // ------------------------------------------------------

        const options = {

            hostname: "api.openai.com",

            path: "/v1/responses",

            method: "POST",

            timeout: 60000,

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    `Bearer ${API_KEY}`,

                "Content-Length":
                    Buffer.byteLength(body)
            }
        };


        console.log(
            `Sending request to OpenAI using model: ${MODEL}`
        );


        // ------------------------------------------------------
        // SEND REQUEST
        // ------------------------------------------------------

        const request =
            https.request(
                options,
                (apiResponse) => {

                    let data = "";


                    apiResponse.setEncoding("utf8");


                    apiResponse.on(
                        "data",
                        (chunk) => {

                            data += chunk;
                        }
                    );


                    apiResponse.on(
                        "end",
                        () => {

                            let result;


                            // ------------------------------------------------
                            // PARSE RESPONSE
                            // ------------------------------------------------

                            try {

                                result =
                                    JSON.parse(data);

                            } catch (error) {

                                console.error(
                                    "OpenAI returned invalid JSON."
                                );

                                console.error(
                                    "HTTP status:",
                                    apiResponse.statusCode
                                );

                                console.error(
                                    "Raw response:",
                                    data
                                );


                                reject(
                                    new Error(
                                        `OpenAI returned invalid JSON. HTTP status: ${apiResponse.statusCode}`
                                    )
                                );

                                return;
                            }


                            // ------------------------------------------------
                            // OPENAI ERROR
                            // ------------------------------------------------

                            if (
                                apiResponse.statusCode < 200 ||
                                apiResponse.statusCode >= 300
                            ) {

                                const apiError =
                                    result?.error || {};


                                console.error(
                                    "========================================"
                                );

                                console.error(
                                    "OPENAI API ERROR"
                                );

                                console.error(
                                    "HTTP status:",
                                    apiResponse.statusCode
                                );

                                console.error(
                                    "Error type:",
                                    apiError.type ||
                                    "unknown"
                                );

                                console.error(
                                    "Error code:",
                                    apiError.code ||
                                    "unknown"
                                );

                                console.error(
                                    "Error message:",
                                    apiError.message ||
                                    "Unknown OpenAI error"
                                );

                                console.error(
                                    "========================================"
                                );


                                reject(
                                    new Error(
                                        apiError.message ||
                                        `OpenAI request failed with HTTP ${apiResponse.statusCode}`
                                    )
                                );

                                return;
                            }


                            // ------------------------------------------------
                            // EXTRACT ANSWER
                            // ------------------------------------------------

                            const reply =
                                extractOutputText(
                                    result
                                );


                            // ------------------------------------------------
                            // NO TEXT
                            // ------------------------------------------------

                            if (!reply) {

                                console.error(
                                    "OpenAI request succeeded but no text was found."
                                );

                                console.error(
                                    JSON.stringify(
                                        result,
                                        null,
                                        2
                                    )
                                );


                                reject(
                                    new Error(
                                        "OpenAI returned no text in the response."
                                    )
                                );

                                return;
                            }


                            // ------------------------------------------------
                            // SUCCESS
                            // ------------------------------------------------

                            console.log(
                                "OpenAI response received successfully."
                            );


                            resolve(reply);
                        }
                    );
                }
            );


        // ------------------------------------------------------
        // TIMEOUT
        // ------------------------------------------------------

        request.on(
            "timeout",
            () => {

                request.destroy();


                reject(
                    new Error(
                        "OpenAI request timed out after 60 seconds."
                    )
                );
            }
        );


        // ------------------------------------------------------
        // CONNECTION ERROR
        // ------------------------------------------------------

        request.on(
            "error",
            (error) => {

                reject(
                    new Error(
                        `Could not connect to OpenAI: ${error.message}`
                    )
                );
            }
        );


        // ------------------------------------------------------
        // SEND BODY
        // ------------------------------------------------------

        request.write(body);

        request.end();
    });
}


// ============================================================
// CREATE SERVER
// ============================================================

const server =
    http.createServer(
        (request, response) => {


            // --------------------------------------------------
            // CORS
            // --------------------------------------------------

            response.setHeader(
                "Access-Control-Allow-Origin",
                "*"
            );

            response.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS"
            );

            response.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type"
            );


            // --------------------------------------------------
            // OPTIONS / PREFLIGHT
            // --------------------------------------------------

            if (request.method === "OPTIONS") {

                response.writeHead(204);

                response.end();

                return;
            }


            // ==================================================
            // HEALTH CHECK
            // ==================================================

            if (
                request.method === "GET" &&
                (
                    request.url === "/" ||
                    request.url === "/health"
                )
            ) {

                sendJson(
                    response,
                    200,
                    {

                        status: "online",

                        service:
                            "Avatar AI Backend",

                        model:
                            MODEL,

                        apiKeyDetected:
                            Boolean(API_KEY),

                        demoMode:
                            DEMO_MODE
                    }
                );

                return;
            }


            // ==================================================
            // CHAT API
            // ==================================================

            if (
                request.method === "POST" &&
                request.url === "/api/chat"
            ) {


                let body = "";


                // ------------------------------------------------
                // RECEIVE REQUEST BODY
                // ------------------------------------------------

                request.on(
                    "data",
                    (chunk) => {

                        body += chunk;


                        // Prevent extremely large requests
                        if (body.length > 1000000) {

                            request.destroy();
                        }
                    }
                );


                // ------------------------------------------------
                // REQUEST COMPLETE
                // ------------------------------------------------

                request.on(
                    "end",
                    async () => {


                        try {


                            // ----------------------------------------
                            // PARSE JSON
                            // ----------------------------------------

                            const data =
                                JSON.parse(body);


                            const messages =
                                data.messages;


                            // ----------------------------------------
                            // VALIDATE MESSAGES
                            // ----------------------------------------

                            if (
                                !Array.isArray(messages) ||
                                messages.length === 0
                            ) {

                                sendJson(
                                    response,
                                    400,
                                    {

                                        error:
                                            "messages must be a non-empty array"
                                    }
                                );

                                return;
                            }


                            // ----------------------------------------
                            // CLEAN MESSAGES
                            // ----------------------------------------

                            const cleanMessages =
                                messages.map(
                                    (message) => ({

                                        role:
                                            message.role,

                                        content:
                                            message.content
                                    })
                                );


                            // ----------------------------------------
                            // VALIDATE EACH MESSAGE
                            // ----------------------------------------

                            for (
                                const message
                                of cleanMessages
                            ) {


                                if (
                                    ![
                                        "user",
                                        "assistant",
                                        "system",
                                        "developer"
                                    ].includes(
                                        message.role
                                    )
                                ) {

                                    sendJson(
                                        response,
                                        400,
                                        {

                                            error:
                                                `Invalid message role: ${message.role}`
                                        }
                                    );

                                    return;
                                }


                                if (
                                    typeof message.content !==
                                        "string" ||
                                    !message.content.trim()
                                ) {

                                    sendJson(
                                        response,
                                        400,
                                        {

                                            error:
                                                "Each message must contain non-empty string content"
                                        }
                                    );

                                    return;
                                }
                            }


                            // ----------------------------------------
                            // ASK OPENAI
                            // ----------------------------------------

                            try {


                                const reply =
                                    await askOpenAI(
                                        cleanMessages
                                    );


                                // ------------------------------------
                                // SUCCESS RESPONSE
                                // ------------------------------------

                                sendJson(
                                    response,
                                    200,
                                    {

                                        reply:

                                            reply,

                                        mode:
                                            "openai"
                                    }
                                );


                            } catch (error) {


                                console.error(
                                    "========================================"
                                );

                                console.error(
                                    "BACKEND AI ERROR"
                                );

                                console.error(
                                    error.message
                                );

                                console.error(
                                    "========================================"
                                );


                                // ------------------------------------
                                // OPTIONAL DEMO MODE
                                // ------------------------------------

                                if (DEMO_MODE) {


                                    sendJson(
                                        response,
                                        200,
                                        {

                                            reply:
                                                demoResponse(
                                                    cleanMessages
                                                ),

                                            mode:
                                                "demo",

                                            warning:
                                                error.message
                                        }
                                    );


                                    return;
                                }


                                // ------------------------------------
                                // REAL ERROR
                                // ------------------------------------

                                sendJson(
                                    response,
                                    502,
                                    {

                                        error:
                                            "OpenAI request failed",

                                        message:
                                            error.message
                                    }
                                );
                            }


                        } catch (error) {


                            // ----------------------------------------
                            // INVALID REQUEST JSON
                            // ----------------------------------------

                            console.error(
                                "Request parsing error:",
                                error.message
                            );


                            sendJson(
                                response,
                                400,
                                {

                                    error:
                                        "Invalid JSON request",

                                    message:
                                        error.message
                                }
                            );
                        }
                    }
                );


                return;
            }


            // ==================================================
            // 404
            // ==================================================

            sendJson(
                response,
                404,
                {

                    error:
                        "Not found"
                }
            );
        }
    );


// ============================================================
// SERVER ERROR HANDLING
// ============================================================

server.on(
    "error",
    (error) => {


        if (
            error.code ===
            "EADDRINUSE"
        ) {

            console.error(
                `Port ${PORT} is already in use.`
            );

            console.error(
                "Stop the old Node.js process and start the server again."
            );

        } else {

            console.error(
                "Server error:",
                error
            );
        }
    }
);


// ============================================================
// START SERVER
// ============================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Avatar backend running at http://localhost:${PORT}`
        );
    }
);