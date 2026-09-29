/**
 * Local offline demo responder for Avatar.
 * Provides word-boundary matching responses with simulated thinking latency
 * to ensure bulletproof stage demos when the backend is unreachable.
 */

/**
 * Generates an offline demo reply based on the user's latest message.
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{ content: string, provider: "demo", conversationId: null }>}
 */
export async function generateDemoResponse(messages) {
  // Simulate 500-900ms thinking latency
  const delay = Math.floor(Math.random() * 400) + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUserMsg ? lastUserMsg.content : "").trim().toLowerCase();

  let reply = "I'm currently running in offline demo mode, so my answers are limited. Connect to the backend for full AI responses!";

  if (/\b(hello|hi|hey|greetings|howdy)\b/i.test(text)) {
    reply = "Hello! I'm Avatar. How can I help you today?";
  } else if (/\b(who are you|your name)\b/i.test(text)) {
    reply = "I'm Avatar, your personal AI assistant. I'm here to chat, answer questions, and help you work through ideas.";
  } else if (/\b(what can you do|how can you help|features)\b/i.test(text)) {
    reply = "I can chat with you, listen through voice input, read responses aloud with speech synthesis, and keep track of your conversation history!";
  } else if (/\b(fun fact|trivia)\b/i.test(text)) {
    reply = "Did you know that honey never spoils? Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible!";
  } else if (/\b(plan|schedule|todo|agenda)\b/i.test(text)) {
    reply = "I'd be glad to help you organize! Tell me what tasks or priorities you have on your mind today.";
  } else if (/\b(thank you|thanks|thx|appreciate it)\b/i.test(text)) {
    reply = "You're very welcome! Feel free to ask if there's anything else I can do for you.";
  }

  return {
    content: reply,
    provider: "demo",
    conversationId: null,
  };
}
