/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const SYSTEM_PROMPT = `You are a friendly L'Oréal beauty assistant. Answer only questions about L'Oréal products, skincare, makeup, haircare, fragrances, beauty routines, and related recommendations. If the user asks about something unrelated, politely say you can only help with beauty topics and gently guide them toward skincare, makeup, haircare, fragrance, or L'Oréal product advice. Keep your response clear, concise, and helpful.`;
const workerUrl = "https://loralchatbot-worker.raven-prewitt1.workers.dev";
const MEMORY_KEY = "loreal-chatbot-memory";
const conversation = [];
const memory = loadMemory();
let sessionName = "";

function loadMemory() {
  try {
    const savedMemory = localStorage.getItem(MEMORY_KEY);
    return savedMemory ? JSON.parse(savedMemory) : {};
  } catch (error) {
    console.warn("Could not load memory:", error);
    return {};
  }
}

function saveMemory() {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch (error) {
    console.warn("Could not save memory:", error);
  }
}

function updateMemoryFromMessage(message) {
  const lowerMessage = message.toLowerCase();

  if (!memory.name) {
    const nameMatch = message.match(
      /(?:^|\b)(?:i am|i'm|my name is|call me)\s+([a-zA-ZÀ-ÿ\s-]+)/i,
    );
    if (nameMatch) {
      memory.name = nameMatch[1].trim();
      sessionName = memory.name;
    }
  }

  if (!memory.preferences) {
    memory.preferences = [];
  }

  const topicMatches = [];
  if (lowerMessage.includes("skincare")) topicMatches.push("skincare");
  if (lowerMessage.includes("makeup")) topicMatches.push("makeup");
  if (lowerMessage.includes("hair")) topicMatches.push("haircare");
  if (lowerMessage.includes("fragrance")) topicMatches.push("fragrance");

  topicMatches.forEach((topic) => {
    if (!memory.preferences.includes(topic)) {
      memory.preferences.push(topic);
    }
  });

  if (!memory.details) {
    memory.details = {};
  }

  const hairTypePatterns = [
    { pattern: /\bstraight hair\b/i, value: "straight hair" },
    { pattern: /\bwavy hair\b/i, value: "wavy hair" },
    { pattern: /\bcurly hair\b/i, value: "curly hair" },
    { pattern: /\bcoily hair\b/i, value: "coily hair" },
    { pattern: /\bthin hair\b/i, value: "thin hair" },
    { pattern: /\bthick hair\b/i, value: "thick hair" },
    { pattern: /\bfine hair\b/i, value: "fine hair" },
  ];

  const skinTypePatterns = [
    { pattern: /\bdry skin\b/i, value: "dry skin" },
    { pattern: /\boily skin\b/i, value: "oily skin" },
    { pattern: /\bsensitive skin\b/i, value: "sensitive skin" },
    { pattern: /\bcombination skin\b/i, value: "combination skin" },
    { pattern: /\bnormal skin\b/i, value: "normal skin" },
    { pattern: /\bacne\b/i, value: "acne-prone skin" },
  ];

  const hairMatch = hairTypePatterns.find((entry) =>
    entry.pattern.test(message),
  );
  if (hairMatch && !memory.details.hairType) {
    memory.details.hairType = hairMatch.value;
  }

  const skinMatch = skinTypePatterns.find((entry) =>
    entry.pattern.test(message),
  );
  if (skinMatch && !memory.details.skinType) {
    memory.details.skinType = skinMatch.value;
  }

  if (!memory.details.budget && /\bbudget\b/i.test(message)) {
    memory.details.budget = "budget-conscious";
  }

  if (!memory.details.preferNatural && /\bnatural\b/i.test(message)) {
    memory.details.preferNatural = true;
  }

  saveMemory();
}

function buildMemoryPrompt() {
  const memoryParts = [];

  if (sessionName) {
    memoryParts.push(`The user's name is ${sessionName}.`);
  }

  if (memory.preferences && memory.preferences.length > 0) {
    memoryParts.push(
      `The user has shown interest in ${memory.preferences.join(", ")}.`,
    );
  }

  if (memory.details && Object.keys(memory.details).length > 0) {
    const detailsText = Object.entries(memory.details)
      .map(([key, value]) => {
        if (key === "hairType") return `hair type: ${value}`;
        if (key === "skinType") return `skin type: ${value}`;
        if (key === "budget") return `budget preference: ${value}`;
        if (key === "preferNatural") return "prefers natural products";
        return `${key}: ${value}`;
      })
      .join(", ");
    memoryParts.push(`The user has shared these details: ${detailsText}.`);
  }

  return memoryParts.length > 0
    ? `User memory: ${memoryParts.join(" ")}`
    : "User memory: none yet.";
}

function renderMessageContent(messageElement, text) {
  const contentElement = document.createElement("div");
  contentElement.className = "msg-content";

  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    messageElement.appendChild(contentElement);
    return;
  }

  const blocks = normalizedText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length > 1) {
    blocks.forEach((block) => {
      if (/^[-*•]\s+/.test(block)) {
        const list = document.createElement("ul");
        block.split(/\n/).forEach((line) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            return;
          }

          const listItem = document.createElement("li");
          listItem.textContent = trimmedLine.replace(/^[-*•]\s+/, "");
          list.appendChild(listItem);
        });
        contentElement.appendChild(list);
      } else {
        const paragraph = document.createElement("p");
        paragraph.textContent = block;
        contentElement.appendChild(paragraph);
      }
    });
  } else {
    const sentences = normalizedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [
      normalizedText,
    ];

    if (sentences.length > 1) {
      let currentParagraph = "";
      const paragraphChunks = [];

      sentences.forEach((sentence) => {
        const cleanedSentence = sentence.trim();
        if (!cleanedSentence) {
          return;
        }

        if (
          currentParagraph &&
          currentParagraph.length + cleanedSentence.length > 140
        ) {
          paragraphChunks.push(currentParagraph.trim());
          currentParagraph = cleanedSentence;
        } else {
          currentParagraph = currentParagraph
            ? `${currentParagraph} ${cleanedSentence}`
            : cleanedSentence;
        }
      });

      if (currentParagraph) {
        paragraphChunks.push(currentParagraph.trim());
      }

      paragraphChunks.forEach((chunk) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = chunk;
        contentElement.appendChild(paragraph);
      });
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = normalizedText;
      contentElement.appendChild(paragraph);
    }
  }

  messageElement.appendChild(contentElement);
}

function addMessage(text, role) {
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${role}`;
  renderMessageContent(messageElement, text);
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

function showGreeting() {
  const greeting = sessionName
    ? `👋 Hello ${sessionName}! How can I help you today?`
    : "👋 Hello! How can I help you today?";
  addMessage(greeting, "ai");
}

function updateLastMessage(text) {
  const lastMessage = chatWindow.lastElementChild;
  if (lastMessage) {
    while (lastMessage.firstChild) {
      lastMessage.removeChild(lastMessage.firstChild);
    }
    renderMessageContent(lastMessage, text);
  }
}

showGreeting();

// This section keeps your added worker logic, but uses the existing chat UI.
async function sendToWorker(message) {
  updateMemoryFromMessage(message);
  conversation.push({ role: "user", content: message });

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n${buildMemoryPrompt()}`,
        },
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
}

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
    await sendToWorker(message);
  } catch (error) {
    updateLastMessage(error.message || "Something went wrong.");
  }
});
