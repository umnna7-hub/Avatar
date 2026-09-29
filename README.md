Ask Mr. Saleem: AI Teacher Chatbot

A ChatGPT-style chat application that answers as an AI representation of Mr. Muhammad Saleem, a Computer Science lecturer. It has a Node.js backend that calls the OpenAI API with a custom teacher personality, and a responsive single-file frontend.

This is an AI representation built from provided background and style notes. It is not the real person and can make mistakes.

Features
Teacher personality: serious when needed, witty, strict but supportive, mixing Urdu (Roman) and English
Focused on Java, OOP, and programming concepts
Responsive chat interface for desktop and mobile, with dark mode
Addresses the student by name (optional name entry)
Code blocks with a Copy button, typing indicator, starter questions
Chat history saved in the browser, with a "New chat" button
Live server status indicator, and clear error messages with a retry button
Optional demo mode for testing without a working API
Project structure
clone-ai/
├── Avatar/
│   └── backend/
│       ├── server.js          # HTTP server + OpenAI integration
│       ├── personality.js     # Teacher system prompt
│       ├── package.json
│       └── package-lock.json
└── frontend/
    └── index.html             # Complete chat UI (HTML + CSS + JS)
Requirements
Node.js 18 or newer
An OpenAI API key with available credits (API billing is separate from a ChatGPT subscription)
Setup
1. Install backend dependencies
bash
cd Avatar/backend
npm install
2. Add your API key

Create a file named .env in Avatar/backend/:

OPENAI_API_KEY=your-key-here

Then add this as the first line of server.js so the file is loaded:

js
require("dotenv").config();

Alternatively, set the variable in your terminal for the current session only.

PowerShell

powershell
$env:OPENAI_API_KEY = "your-key-here"

macOS / Linux

bash
export OPENAI_API_KEY="your-key-here"

Never commit your key. Add .env to .gitignore.

3. Start the backend
bash
node server.js

Expected output:

API key detected: true
Avatar backend running at http://localhost:3000
4. Open the frontend

Open frontend/index.html in your browser. To serve it instead:

bash
cd frontend
python -m http.server 5500     # then visit http://localhost:5500

The status under the teacher's name should show a green dot and Online.

Configuration

Backend environment variables:

Variable	Default	Purpose
OPENAI_API_KEY	none (required)	Your OpenAI API key
OPENAI_MODEL	gpt-5.6-luna	Model name. Change it to one your account can use
PORT	3000	Server port
DEMO_MODE	false	If true, returns placeholder replies when the OpenAI request fails

Frontend: change API_URL at the top of the <script> in index.html if the backend is not at http://localhost:3000.

API reference
GET /health

Returns server status.

json
{
  "status": "online",
  "service": "Avatar AI Backend",
  "model": "gpt-5.6-luna",
  "apiKeyDetected": true,
  "demoMode": false
}
POST /api/chat

Request:

json
{
  "messages": [
    { "role": "user", "content": "Explain encapsulation in Java" }
  ]
}
messages must be a non-empty array
Allowed roles: user, assistant, system, developer
Each content must be a non-empty string

Success (200):

json
{ "reply": "…", "mode": "openai" }

Errors: 400 for invalid input, 502 if the OpenAI request fails ({ "error", "message" }).

Customizing the personality

Edit Avatar/backend/personality.js. The systemPrompt string controls tone, teaching style, language mix, and boundaries. Restart the server after changes.

Troubleshooting
Problem	Fix
Status shows "Server offline"	Start the backend, and check API_URL and the port
API key detected: false	The key isn't set in this terminal, or dotenv isn't loaded in server.js
"You have no credits remaining"	Add credits at the OpenAI billing page, then click Try again
Error about the model	Set OPENAI_MODEL to a model your account can access
Port 3000 is already in use	Stop the old Node process, or set a different PORT and update API_URL
PowerShell rejects the key command	Use $env:OPENAI_API_KEY = "your-key" (variable name, then =, then the key in quotes)

Demo mode only activates after an OpenAI request fails, so it still needs OPENAI_API_KEY to be set.

Security notes

This project is intended for local or classroom use. Before any public deployment:

Restrict CORS to your own domain instead of *
Accept only user and assistant roles from clients, so users can't override the personality
Add rate limiting, message length and count limits, and max_output_tokens
Add authentication, since anyone who can reach the server can use your API credits
Consider store: false in the OpenAI request so conversations aren't retained
If a key is ever exposed, delete it and create a new one
Known limitations
Replies arrive all at once (no streaming)
Chat history is stored only in the browser (localStorage), not on the server
Only the last 30 messages are sent with each request
Tech stack

Node.js (built-in http/https), OpenAI Responses API, vanilla HTML/CSS/JavaScript. No frontend build step.
