const chatScroll = document.getElementById("chatScroll");
const composerForm = document.getElementById("composerForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const quickActions = document.getElementById("quickActions");
const statusDot = document.getElementById("statusDot");
const statusLabel = document.getElementById("statusLabel");

let history = []; // { role: 'user' | 'assistant', content: string }
let isStreaming = false;

function scrollToBottom() {
  chatScroll.scrollTop = chatScroll.scrollHeight;
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg msg--${role === "user" ? "user" : "bot"}`;

  const label = document.createElement("div");
  label.className = "msg__label";
  label.textContent = role === "user" ? "YOU" : "ADA";

  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatScroll.appendChild(wrapper);
  scrollToBottom();
  return bubble;
}

function setBusy(busy) {
  isStreaming = busy;
  sendBtn.disabled = busy;
  messageInput.disabled = busy;
  [...quickActions.children].forEach((chip) => (chip.disabled = busy));
  statusLabel.textContent = busy ? "Ada is typing…" : "Ada is online";
  statusDot.style.background = busy ? "#C1442E" : "#2F6F5E";
}

async function sendMessage(text) {
  if (!text.trim() || isStreaming) return;

  addMessage("user", text);
  history.push({ role: "user", content: text });
  messageInput.value = "";
  setBusy(true);

  const botBubble = addMessage("assistant", "");
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  botBubble.appendChild(cursor);

  let fullReply = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Network response was not ok");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // keep incomplete chunk in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();

        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) {
            fullReply += parsed.token;
            botBubble.textContent = fullReply;
            botBubble.appendChild(cursor);
            scrollToBottom();
          } else if (parsed.error) {
            fullReply = parsed.error;
            botBubble.textContent = fullReply;
          }
        } catch (e) {
          // ignore malformed chunk
        }
      }
    }
  } catch (err) {
    fullReply = "Sorry — I couldn't reach the support system just now. Please try again in a moment.";
    botBubble.textContent = fullReply;
  } finally {
    cursor.remove();
    history.push({ role: "assistant", content: fullReply });
    setBusy(false);
    messageInput.focus();
  }
}

composerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
});

quickActions.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  sendMessage(chip.dataset.prompt);
});
