/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Conversation stored in-memory (role: 'user' | 'assistant')
const conversation = [];

// System prompt instructing the assistant to only answer L'Oréal-related queries
const SYSTEM_PROMPT = `You are a helpful assistant that ONLY answers questions about L'Oréal products, routines, and recommendations. Follow these rules:

- If the user asks about L'Oréal products, provide concise, factual answers using product names, suggested routines, application tips, and ingredient guidance when relevant.
- If the user asks about general beauty topics, only answer if you can relate the response directly to L'Oréal products or suggest L'Oréal alternatives.
- If the user asks about topics unrelated to L'Oréal (for example: politics, programming, personal therapy, or other brands without asking for L'Oréal alternatives), politely refuse.
  When refusing, respond briefly and politely using this pattern: "Sorry — I can only help with L'Oréal products, routines, and recommendations. If you'd like, I can help with [suggest a related L'Oréal product or routine]."
- Never provide medical, legal, or diagnostic advice. For medical or legal requests, reply: "I can't provide medical/legal/diagnostic advice. Please consult a qualified professional. I can, however, recommend L'Oréal products for common beauty concerns."

Keep answers friendly and concise (1–3 short paragraphs). Always steer the user back to L'Oréal products or routines when possible.`;

// Set initial assistant message
appendMessage(
  "assistant",
  "👋 Hello! I can help with L'Oréal products, routines, and recommendations. What would you like to know?"
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // URL of the deployed Cloudflare Worker (proxies to OpenAI)
  const WORKER_URL = "https://loreal-chatbot-worker.kmiddagh.workers.dev/";

  // Add user message to local conversation and UI
  conversation.push({ role: "user", content: text });
  appendMessage("user", text);

  // Add loading indicator
  const loading = appendMessage("assistant", "Thinking...", { loading: true });

  try {
    // Build messages: system prompt first, then the conversation history
    const messagesToSend = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation,
    ];

    const body = { messages: messagesToSend };

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    // Remove loading indicator element
    if (loading && loading.parentNode) loading.parentNode.removeChild(loading);

    // Extract assistant text from OpenAI Chat Completions response
    const assistantText =
      (data?.choices && data.choices[0]?.message?.content) ||
      data?.choices?.[0]?.text ||
      "Sorry, I did not get a response.";

    // Push assistant response into conversation history and UI
    conversation.push({ role: "assistant", content: assistantText });
    appendMessage("assistant", assistantText);
  } catch (err) {
    if (loading && loading.parentNode) loading.parentNode.removeChild(loading);
    appendMessage(
      "assistant",
      "Error contacting worker: " + (err.message || err),
      { error: true }
    );
    console.error("Worker request failed", err);
  } finally {
    userInput.value = "";
  }
});

// Minimal HTML-escaping to avoid accidental markup injection when inserting messages
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Append a message element to the chat window.
// role: 'user' | 'assistant'
// opts: { loading: boolean, error: boolean }
function appendMessage(role, text, opts = {}) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  if (opts.loading) el.classList.add("loading");
  if (opts.error) el.classList.add("error");
  el.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}
