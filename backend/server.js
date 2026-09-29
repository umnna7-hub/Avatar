const http = require("http");
const https = require("https");

const PORT = 3000;
const API_KEY = process.env.OPENAI_API_KEY;

function demoResponse(messages) {
    const lastMessage = messages[messages.length - 1]?.content || "";
    const text = lastMessage.toLowerCase();

    if (text.includes("hello") || text.includes("hi")) {
        return "Hello! I'm Avatar. How can I help you?";
    }

    if (text.includes("who are you")) {
        return "I'm Avatar, your personal AI assistant.";
    }

    return "I'm currently running in demo mode.";
}

function askOpenAI(messages) {
    return new Promise((resolve) => {

        if (!API_KEY) {
            console.log("No OpenAI API key. Using demo mode.");
            resolve(demoResponse(messages));
            return;
        }

        const body = JSON.stringify({
            model: "gpt-5.6-luna",
            input: messages
        });

        const options = {
            hostname: "api.openai.com",
            path: "/v1/responses",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Length": Buffer.byteLength(body)
            }
        };

        const request = https.request(options, (response) => {

            let data = "";

            response.on("data", chunk => {
                data += chunk;
            });

            response.on("end", () => {

                try {
                    const result = JSON.parse(data);

                    if (response.statusCode >= 400) {
                        console.log("OpenAI error:", result);
                        resolve(demoResponse(messages));
                        return;
                    }

                    resolve(
                        result.output_text ||
                        demoResponse(messages)
                    );

                } catch (error) {
                    console.log("Invalid OpenAI response.");
                    resolve(demoResponse(messages));
                }
            });
        });

        request.on("error", (error) => {
            console.log("OpenAI connection failed:", error.message);
            resolve(demoResponse(messages));
        });

        request.write(body);
        request.end();
    });
}

const server = http.createServer(async (request, response) => {

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    response.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
    }

    if (request.method === "GET" && request.url === "/") {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });

        response.end(JSON.stringify({
            status: "online",
            service: "Avatar AI Backend"
        }));

        return;
    }

    if (request.method === "POST" && request.url === "/api/chat") {

        let body = "";

        request.on("data", chunk => {
            body += chunk;
        });

        request.on("end", async () => {

            try {

                const data = JSON.parse(body);
                const messages = data.messages;

                if (!Array.isArray(messages)) {
                    response.writeHead(400, {
                        "Content-Type": "application/json"
                    });

                    response.end(JSON.stringify({
                        error: "messages must be an array"
                    }));

                    return;
                }

                const reply = await askOpenAI(messages);

                response.writeHead(200, {
                    "Content-Type": "application/json"
                });

                response.end(JSON.stringify({
                    reply
                }));

            } catch (error) {

                console.error(error);

                response.writeHead(500, {
                    "Content-Type": "application/json"
                });

                response.end(JSON.stringify({
                    error: "Something went wrong"
                }));
            }
        });

        return;
    }

    response.writeHead(404);
    response.end("Not found");
});

server.listen(PORT, "0.0.0.0", () =>  {
    console.log(
        `Avatar backend running at http://localhost:${PORT}`
    );
});