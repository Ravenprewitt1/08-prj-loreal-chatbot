/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const SYSTEM_PROMPT = `You are a friendly L'Oréal beauty assistant. Answer only questions about L'Oréal products, skincare, makeup, haircare, fragrances, and beauty routines. If the user asks about something unrelated, politely redirect them back to L'Oréal products or recommendations. Keep answers clear, concise, and helpful.`;

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  // Send the user's message and the system prompt to the chatbot worker.
  const response = await fetch(
    "https://loreal-chatbot.your-subdomain.workers.dev/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
      }),
    },
  );

  const data = await response.json();
  const reply = data.choices[0].message.content;

  chatWindow.textContent = reply;
});
