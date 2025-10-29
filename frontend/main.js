// ✅ Frontend logic for Cartesia Conversational Bot
const BASE_URL = "https://cartesia-tts-demo.onrender.com"; // Render backend URL

const player = document.getElementById('player');
const status = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const sendBtn = document.getElementById('send');
const chatInput = document.getElementById('chatInput');
const speakToggle = document.getElementById('speakToggle');
const voiceSelect = document.getElementById('voice');
const btn = document.getElementById('generate');
const askAI = document.getElementById('askAI');

let conversation = [];

// 🟢 Render messages
function renderMessages() {
  if (!messagesEl) return;
  messagesEl.innerHTML = '';
  conversation.forEach(m => {
    const row = document.createElement('div');
    row.className = `msg ${m.role}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.content;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// 🟣 Load voices from backend
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${BASE_URL}/voices`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const voices = data.data || [];

    voiceSelect.innerHTML = '';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} (${v.language || 'unknown'})`;
      opt.setAttribute('data-model', 'sonic-2');
      voiceSelect.appendChild(opt);
    });

    if (voices.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No voices available';
      voiceSelect.appendChild(opt);
    }
  } catch (err) {
    console.error('Error loading voices:', err);
    voiceSelect.innerHTML = '<option>Server offline — please retry</option>';
  }
});

// 🟠 Manual text-to-speech generation
btn.addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  const voiceId = voiceSelect.value.trim();
  if (!text) return alert('Enter text first');
  status.textContent = '⏳ Generating voice...';

  try {
    const res = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId })
    });

    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    player.src = URL.createObjectURL(blob);
    await player.play();
    status.textContent = '✅ Playing audio!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  }
});

// 🧠 Ask AI & play response
askAI.addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  const voiceId = voiceSelect.value.trim();
  if (!text) return alert('Type your question');
  status.textContent = '💬 Thinking...';

  try {
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const chatData = await chatRes.json();
    const aiReply = chatData.reply;
    document.getElementById('text').value = aiReply;

    status.textContent = '🔊 Speaking...';
    const ttsRes = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiReply, voice_id: voiceId })
    });

    if (!ttsRes.ok) throw new Error(await ttsRes.text());
    const blob = await ttsRes.blob();
    player.src = URL.createObjectURL(blob);
    await player.play();
    status.textContent = '✅ Done!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  }
});

// 🟢 Chat (conversational)
async function sendChat() {
  const content = chatInput.value.trim();
  if (!content) return;
  const voiceId = voiceSelect.value;
  conversation.push({ role: 'user', content });
  chatInput.value = '';
  renderMessages();

  try {
    status.textContent = '💬 Thinking...';
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation })
    });

    const chatData = await chatRes.json();
    const aiReply = chatData.reply;
    conversation.push({ role: 'assistant', content: aiReply });
    renderMessages();

    if (speakToggle.checked) {
      status.textContent = '🔊 Speaking...';
      const res = await fetch(`${BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiReply, voice_id: voiceId })
      });

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      player.src = URL.createObjectURL(blob);
      await player.play();
    }

    status.textContent = '✅ Done!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  }
}

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});
