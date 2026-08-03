/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const SYSTEM_PROMPT = `You are a friendly L'Oréal beauty assistant. Answer only questions about L'Oréal products, skincare, makeup, haircare, fragrances, beauty routines, and related recommendations. If the user asks about something unrelated, politely refuse to answer and gently redirect them to beauty, skincare, makeup, haircare, fragrance, or L'Oréal product guidance. Keep your response clear, concise, and helpful.`;
const workerUrl = "https://loreal-chatbot.your-subdomain.workers.dev/";
const conversation = [];

function addMessage(text, role) {
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${role}`;
  messageElement.textContent = text;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

function showGreeting() {
  addMessage("👋 Hello! How can I help you today?", "ai");
}

function updateLastMessage(text) {
  const lastMessage = chatWindow.lastElementChild;
  if (lastMessage) {
    lastMessage.textContent = text;
  }
}

showGreeting();

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  addMessage(message, "user");
  userInput.value = "";
  addMessage("Thinking...", "ai");

  try {
    conversation.push({ role: "user", content: message });

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversation.map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("The chatbot could not respond right now.");
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "I’m sorry, I could not generate a reply.";

    conversation.push({ role: "assistant", content: reply });
    updateLastMessage(reply);
  } catch (error) {
    updateLastMessage(error.message || "Something went wrong.");
  }
});
