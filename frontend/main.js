// 🎯 Base backend URL (Render)
const BASE_URL = "https://cartesia-tts-demo.onrender.com";

// 🎛 UI Elements
const btn = document.getElementById('generate');
const askAI = document.getElementById('askAI');
const player = document.getElementById('player');
const status = document.getElementById('status');
const messagesEl = document.getElementById('messages');
const sendBtn = document.getElementById('send');
const chatInput = document.getElementById('chatInput');
const speakToggle = document.getElementById('speakToggle');

let conversation = [];

// 🧩 Render chat messages dynamically
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

// 🟢 Load available voices
window.addEventListener('DOMContentLoaded', async () => {
  const voiceSelect = document.getElementById('voice');
  try {
    const res = await fetch(`${BASE_URL}/voices`);
    const data = await res.json();
    const voices = data.data || data;
    voiceSelect.innerHTML = '';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name || v.id} (${v.language || 'unknown'})`;
      opt.setAttribute('data-model', v.model_id || 'sonic-2');
      voiceSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading voices:', err);
    voiceSelect.innerHTML = '<option>Error loading voices</option>';
  }
});

// 🟣 Generate voice manually
btn.addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  const voiceId = document.getElementById('voice').value.trim();
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

// 🧠 Ask AI and play the response
askAI.addEventListener('click', async () => {
  const text = document.getElementById('text').value.trim();
  const voiceSelect = document.getElementById('voice');
  const voiceId = voiceSelect.value;
  const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
  const modelId = selectedOption.getAttribute('data-model') || 'sonic-2';

  if (!text) return alert('Type your question');

  try {
    status.textContent = '💬 Thinking...';
    const chatRes = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const chatData = await chatRes.json();
    if (!chatData.reply) throw new Error('AI did not reply');
    const aiReply = chatData.reply;
    document.getElementById('text').value = aiReply;

    status.textContent = '🔊 Speaking...';
    const res = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiReply, voice_id: voiceId, model_id: modelId })
    });

    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    player.src = URL.createObjectURL(blob);
    await player.play();
    status.textContent = '✅ Done!';
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  }
});

// 💬 Conversational chat
async function sendChat() {
  if (!chatInput) return;
  const content = chatInput.value.trim();
  if (!content) return;
  const voiceSelect = document.getElementById('voice');
  const voiceId = voiceSelect.value;
  const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
  const modelId = selectedOption.getAttribute('data-model') || 'sonic-2';

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
    if (!chatData.reply) throw new Error('AI did not reply');

    const aiReply = chatData.reply;
    conversation.push({ role: 'assistant', content: aiReply });
    renderMessages();

    if (speakToggle && speakToggle.checked) {
      status.textContent = '🔊 Speaking...';
      const res = await fetch(`${BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiReply, voice_id: voiceId, model_id: modelId })
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

if (sendBtn) {
  sendBtn.addEventListener('click', sendChat);
}
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
}
