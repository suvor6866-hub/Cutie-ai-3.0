import React, { useState, useRef } from 'react';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor, registerPlugin } from '@capacitor/core';
const DeviceControl = registerPlugin('DeviceControl');
import './App.css';
import { createLiveVoice } from './liveVoice';

const features = [
  { icon: '💬', name: 'AI Chat', desc: 'Talk with Cutie', color: 'pink' },
  { icon: '🎨', name: 'AI Image', desc: 'Generate Images', color: 'purple' },
  { icon: '🎬', name: 'AI Video', desc: 'Create Videos', color: 'blue' },
  { icon: '🎙️', name: 'AI Voice', desc: 'Speak with me', color: 'pink' },
  { icon: '💡', name: 'AI Tools', desc: 'More AI Utilities', color: 'purple' }
];

const menu = [
  { icon: '⌂', name: 'Home' },
  { icon: '☏', name: 'Chat' },
  { icon: '▦', name: 'Tools' },
  { icon: '◷', name: 'History' },
  { icon: '♙', name: 'Profile' }
];

export default function App() {
  const voiceLoopRef = useRef(false);
  const liveVoiceRef = useRef(null);
  const [liveStatus, setLiveStatus] = useState('Live বন্ধ');
  const [active, setActive] = useState('Home');
  const [messages, setMessages] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [smsRecipient, setSmsRecipient] = useState(null);
  const [draft, setDraft] = useState('');
  const [userId] = useState(() => {
    let id = localStorage.getItem("cutieUserId");
    if (!id) {
      id = "cutie-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem("cutieUserId", id);
    }
    return id;
  });
  const [profileName, setProfileName] = useState(() => localStorage.getItem('cutieProfileName') || 'Boss');
  const [profileLanguage, setProfileLanguage] = useState(() => localStorage.getItem('cutieProfileLanguage') || 'বাংলা');
  const [profileVoice, setProfileVoice] = useState(() => localStorage.getItem('cutieProfileVoice') || 'Female');
  const saveProfile = () => {
    localStorage.setItem('cutieProfileName', profileName);
    localStorage.setItem('cutieProfileLanguage', profileLanguage);
    localStorage.setItem('cutieProfileVoice', profileVoice);
    alert('Profile saved successfully! 💜');
  };


  const startVoice = async () => {
    if (voiceLoopRef.current) {
      voiceLoopRef.current = false;
      try { await SpeechRecognition.stop(); } catch {}
      return;
    }

    voiceLoopRef.current = true;
    try {
      await SpeechRecognition.requestPermissions();
      const { available } = await SpeechRecognition.available();
      if (!available) throw new Error('Speech recognition unavailable');

      while (voiceLoopRef.current) {
        const result = await SpeechRecognition.start({
          language: 'bn-IN',
          maxResults: 1,
          partialResults: false
        });

        if (!voiceLoopRef.current) break;
        const transcript = result.matches?.[0]?.trim();
        if (transcript) await sendMessage(null, transcript);
      }
    } catch (error) {
      voiceLoopRef.current = false;
      alert('Voice error: ' + (error?.message || error));
    }
  };

  const toggleLiveVoice = async () => {
    if (liveVoiceRef.current) {
      liveVoiceRef.current.stop();
      liveVoiceRef.current = null;
      return;
    }

    const live = createLiveVoice({
      userId,
      onStatus: setLiveStatus,
      onText: (text) => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text,
          role: 'cutie'
        }]);
      },
      onError: (message) => {
        setLiveStatus('সমস্যা: ' + message);
      }
    });

    liveVoiceRef.current = live;
    await live.start();
  };



  const handleDeviceControl = async (text) => {
    if (Capacitor.getPlatform() !== 'android') return false;
    
const command = text.toLowerCase();

// YouTube Music Voice Command
if (/(গান|সঙ্গীত|song|music|youtube|ইউটিউব|play)/i.test(command) &&
    /(চালাও|শোনাও|চালাও|chalao|chalaw|chala|play|খোলো|খুলে|open|start)/i.test(command)) {
  try {
    await DeviceControl.openYouTubeSearch({
            query: text
          });
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'cutie',
      text: 'Boss, YouTube-এ তোমার গান খুঁজছি 🎵💜'
    }]);
  } catch (error) {
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'cutie',
      text: 'Boss, YouTube খুলতে পারলাম না।'
    }]);
  }
  return true;
}


    try {
      if (/অ্যাক্সেসিবিলিটি সেটিংস|accessibility settings/.test(command)) {
        await DeviceControl.openAccessibilitySettings();
        return true;
      }

      if (/ব্যাক যাও|পেছনে যাও|back যাও|go back/i.test(command)) {
        await DeviceControl.control({ action: 'BACK' });
        return true;
      }

      if (/হোমে যাও|হোম স্ক্রিন|go home/i.test(command)) {
        await DeviceControl.control({ action: 'HOME' });
        return true;
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'cutie',
        text: 'Boss, Accessibility Service চালু আছে কি না পরীক্ষা করো 💜'
      }]);
      return true;
    }
    return false;
  };

  const openRequestedApp = async (text) => {
    if (Capacitor.getPlatform() !== 'android') return false;
    const command = text.toLowerCase();
    if (!/(খোলো|খুলে দাও|চালু করো|চালাও|শোনাও|ওপেন কর|ওপেন করে দাও|open|launch|start|play)/i.test(command)) return false;

    const apps = [
      { names: ['whatsapp', 'হোয়াটসঅ্যাপ', 'হোয়াটসঅ্যাপ'], id: 'com.whatsapp', label: 'WhatsApp' },
      { names: ['chrome', 'ক্রোম'], id: 'com.android.chrome', label: 'Chrome' },
      { names: ['instagram', 'ইনস্টাগ্রাম'], id: 'com.instagram.android', label: 'Instagram' }
    ];
    const app = apps.find(a => a.names.some(n => command.includes(n)));
    if (!app) return false;

    try {
      await DeviceControl.openYouTubeSearch({ query: text });
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'cutie', text: app.label + ' খোলার চেষ্টা করেছি Boss 💜'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'cutie', text: app.label + ' খুলতে পারিনি Boss।'
      }]);
    }
    return true;
  };

  const executePendingPhoneAction = async () => {
    const action = pendingAction;
    if (!action) return;
    setPendingAction(null);
    try {
      if (action.type === "call") await DeviceControl.dialNumber({number: action.contact.number});
      if (action.type === "sms") await DeviceControl.composeSms({number: action.contact.number, message: action.message});
      if (action.type === "readSms") {
        const result = await DeviceControl.readLatestSms();
        const list = result.messages || [];
        setMessages(prev => [...prev, {id: Date.now(), role: "cutie", text: list.length ? list.slice(0,5).map(m => m.number + ": " + m.message).join("\n") : "কোনো SMS পাওয়া যায়নি।"}]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {id: Date.now(), role: "cutie", text: "সমস্যা হয়েছে Boss: " + err.message}]);
    }
  };
  const handlePhoneCommand = async (text) => {
  if (Capacitor.getPlatform() !== 'android') return false;

  const value = text.trim().toLowerCase();
  const yes = /^(হ্যাঁ|হ্যা|জি|জ্বি|yes|yeah|হ্যাঁ করো|করো|ঠিক আছে|কর)$/u.test(value);
  const no = /^(না|নাহ|no|বাতিল|করবে না|করো না|থাক)$/u.test(value);

  if (pendingAction) {
    if (yes) {
      await executePendingPhoneAction();
      return true;
    }
    if (no) {
      setPendingAction(null);
      setSmsRecipient(null);
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'ঠিক আছে Boss, কাজটি বাতিল করলাম 💜'}]);
      return true;
    }
    setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'Boss, কাজটি করতে হ্যাঁ অথবা বাতিল করতে না বলো।'}]);
    return true;
  }

  if (smsRecipient) {
    if (no) {
      setSmsRecipient(null);
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'ঠিক আছে Boss, মেসেজ লেখা বাতিল করলাম 💜'}]);
      return true;
    }
    const recipient = smsRecipient;
    setSmsRecipient(null);
    setPendingAction({type: 'sms', contact: recipient, message: text.trim()});
    setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: recipient.name + ' কে এই মেসেজ পাঠাব: ' + text.trim() + '। পাঠাতে হ্যাঁ, বাতিল করতে না বলো Boss।'}]);
    return true;
  }

  if (/(এসএমএস|sms).*(পড়|পড়|শোনাও)|(পড়|পড়|শোনাও).*(এসএমএস|sms)/i.test(value)) {
    setPendingAction({type: 'readSms'});
    setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'সাম্প্রতিক SMS পড়ে শোনাব Boss? হ্যাঁ বলো।'}]);
    return true;
  }

  const isCall = /(ফোন|কল|call|ডায়াল|ডায়াল)/i.test(value);
  const isSms = /(মেসেজ|sms|message|টেক্সট)/i.test(value);
  const isFind = /(খুঁজে|নম্বর|নাম্বার|contact|কন্টাক্ট)/i.test(value);
  if (!isCall && !isSms && !isFind) return false;

  let name = text
      .replace(/^(?:(?:please|boss|cutie|একটু|আমাকে)\s*)+/giu, '')
      .replace(/\b(?:please|call|phone|dial|message|sms|koro|karo|karna|kijiye|bhejo|bhej|find|search|contact|number)\b/giu, ' ')
      .replace(/(?:ফোন করো|ফোন করুন|কল করো|কল করুন|কল দাও|ডায়াল করো|ডায়াল করো|মেসেজ পাঠাও|এসএমএস পাঠাও|খুঁজে দাও|খুঁজে বের করো|নম্বর বলো|নাম্বার বলো|কন্টাক্ট খোঁজো)/giu, ' ')
      .replace(/\b(?:ke|ko|ka|ki|keliye|liye|mein|par|se)\b/giu, ' ')
      .replace(/(কে|এর কাছে|র কাছে)$/u, '')
      .replace(/[।,?!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const relations = [
      [/মাকে|মায়ের|মায়ের/g, 'মা'],
      [/বাবাকে|বাবার/g, 'বাবা'],
      [/দাদাকে|দাদার/g, 'দাদা'],
      [/দিদিকে|দিদির/g, 'দিদি'],
      [/ভাইকে|ভাইয়ের|ভাইয়ের/g, 'ভাই'],
      [/বোনকে|বোনের/g, 'বোন']
    ];

    for (const [pattern, replacement] of relations) {
      name = name.replace(pattern, replacement);
    }

    name = name.replace(/\s+/g, ' ').trim();

    if (!name) {
    setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'কাকে খুঁজব Boss? নামটা বলো।'}]);
    return true;
  }

  try {
    const result = await DeviceControl.searchContact({name});
    const contacts = result.contacts || [];

    if (!contacts.length) {
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: name + ' নামে কোনো Contact পেলাম না Boss।'}]);
      return true;
    }

    if (contacts.length > 1) {
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'একাধিক Contact পেয়েছি: ' + contacts.slice(0, 5).map(c => c.name + ' (' + c.number + ')').join(', ') + '। সঠিক নামটি বলো Boss।'}]);
      return true;
    }

    const contact = contacts[0];
    if (isCall) {
      setPendingAction({type: 'call', contact});
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: contact.name + ' (' + contact.number + ') কে কল করব Boss? হ্যাঁ বলো, না বললে বাতিল।'}]);
    } else if (isSms) {
      setSmsRecipient(contact);
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: contact.name + ' কে কী মেসেজ পাঠাব Boss? মেসেজটি বলো। বাতিল করতে না বলো।'}]);
    } else {
      setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: contact.name + ' এর নম্বর ' + contact.number}]);
    }
  } catch (err) {
    setMessages(prev => [...prev, {id: Date.now(), role: 'cutie', text: 'Contact খুঁজতে সমস্যা হয়েছে Boss: ' + err.message}]);
  }
  return true;
};

const sendMessage = async (e, voiceText) => {
    if (e) e.preventDefault();
    const message = (voiceText || draft).trim();
    if (!message) return;
    if (await handlePhoneCommand(message)) { setDraft(''); return; }
    if (await handleDeviceControl(message)) { setDraft(''); return; }
    if (await openRequestedApp(message)) { setDraft(''); return; }

    setMessages(prev => [...prev, {
      id: Date.now(), text: message, role: 'boss'
    }]);
    setDraft('');

    try {
      const response = await fetch('https://cutie-ai-3-0.onrender.com/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message, userId})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI request failed');

      setMessages(prev => [...prev, {
        id: Date.now() + 1, text: data.reply, role: 'cutie'
      }]);

      const voiceResponse = await fetch('https://cutie-ai-3-0.onrender.com/api/voice', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: data.reply})
      });

      if (voiceResponse.ok) {
        const audioBlob = await voiceResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await new Promise(resolve => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'cutie',
        text: 'Sorry Boss! ' + error.message
      }]);
    }
  };

  const speakMessage = async () => {
    const lastReply = [...messages].reverse().find(msg => msg.role === "cutie");
    if (!lastReply) {
      alert("আগে Cutie-কে একটি message পাঠাও!");
      return;
    }
    try {
      const response = await fetch("https://cutie-ai-3-0.onrender.com/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lastReply.text })
      });
      if (!response.ok) throw new Error("Voice API failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (error) {
      alert("Voice error: " + error.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">💜</div>
          <div>
            <h2>Cutie AI <span>3.0</span></h2>
            <p><i/> Online · Your Personal AI Companion</p>
          </div>
        </div>
        <button className="pro">♛ Pro</button>
      </header>

      <main>
        {active === 'Home' ? (
          <>
            <section className="hero">
              <div className="avatar">👩🏻‍🎤</div>
              <div className="tag">✦ AI COMPANION</div>
              <h1>Hey Boss! <span>💜</span></h1>
              <h3>আমি তোমার Cutie! 🥰</h3>
              <p>Your Personal AI Companion</p>
              <div className="wave">〰〰〰〰〰</div>
            </section>

            <div className="section-title">
              <h3>Explore Features</h3>
              <span>✨ AI POWERED</span>
            </div>

            <section className="features">
              {features.map((item, i) => (
                <button
                  key={item.name}
                  className={`feature ${item.color} ${i === 4 ? 'wide' : ''}`}
                  onClick={() => setActive(item.name === 'AI Voice' ? 'Voice' : item.name === 'AI Chat' ? 'Chat' : item.name)}
                >
                  <span className="feature-icon">{item.icon}</span>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <b>›</b>
                </button>
              ))}
            </section>

          </>
        ) : active === "Chat" ? (
        <section className="premium-chat-room">
          <div className="premium-chat-header">
            <button onClick={() => setActive('Home')}>←</button>
            <span>💜</span>
            <div>
              <h3>Cutie AI</h3>
              <p>🟢 Online · Your AI Companion</p>
            </div>
          </div>
          <div className="premium-chat-body">
            <div className="chat-welcome">
              <div className="welcome-avatar">👩🏻‍🎤</div>
              <h2>Hey Boss! 💜</h2>
              <p>আমি তোমার Cutie! 🥰</p>
            </div>
            <div className="premium-message cutie-msg">
              <span>💜</span>
              <div><b>Cutie</b><p>হ্যালো Boss! কেমন আছো? ❤️</p></div>
            </div>
            {messages.map(msg => (
              <div className="premium-message boss-msg" key={msg.id}>
                <div><b>{(msg.role === "cutie" || msg.text.startsWith("Sorry Boss!")) ? "💜 Cutie" : "Boss"}</b><p>{msg.text}</p></div>
              </div>
            ))}
          </div>
          {pendingAction && <div className="confirmation-actions">
<p>Boss, কাজটি করতে অনুমতি দেবে? 💜</p>
<button type="button" onClick={executePendingPhoneAction}>হ্যাঁ, করো</button>
<button type="button" onClick={() => { setPendingAction(null); setMessages(prev => [...prev, {id: Date.now(), role: "cutie", text: "ঠিক আছে Boss, বাতিল করলাম 💜"}]); }}>না, করো না</button>
</div>}
<form className="premium-chat-input" onSubmit={sendMessage}>
            <button type="button">＋</button>
            <input value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Message Cutie..." />
            <button type="button" onClick={speakMessage}>🎙️</button>
            <button className="premium-send" type="submit">➤</button>
          </form>
        </section>) : active === "Voice" ? (
        <section className="voice-room">
          <header className="voice-top">
            <button onClick={() => setActive('Home')}>☰</button>
            <span>Cutie AI Voice</span>
            <button onClick={() => setActive('Home')}>⚙</button>
          </header>
          <div className="voice-center">
            <button className="voice-orb" onClick={toggleLiveVoice}>
              <span></span>
            </button>
            <h2>হ্যাঁ Boss! 💜</h2>
            <p>{liveStatus}</p>
          </div>
          <div className="voice-bottom">
            <input value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Live-এ কথা বলো Boss..." />
            <button onClick={startVoice}>🎙️</button>
            <button onClick={sendMessage}>➤</button>
          </div>
        </section>
) : active === "Profile" ? (
          <section className="other-page">
            <div className="avatar">💜</div>
            <h1>My Profile</h1>
            <p>Your Cutie AI Personal Settings</p>
            <label>Your Name</label>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Enter your name" />
            <label>Language</label>
            <select value={profileLanguage} onChange={e => setProfileLanguage(e.target.value)}>
              <option>বাংলা</option><option>English</option><option>हिन्दी</option>
            </select>
            <label>Voice Preference</label>
            <select value={profileVoice} onChange={e => setProfileVoice(e.target.value)}>
              <option value="Female">Female Voice</option><option value="Male">Male Voice</option>
            </select>
            <button onClick={saveProfile}>💾 Save Profile</button>
            <p>Cutie AI 3.0 · Personal AI Companion</p>
          </section>
        ) : (
            <section className="other-page">
            <div className="avatar">💜</div>
            <h1>{active}</h1>
            <p>Welcome to Cutie AI 3.0</p>
            <p className="coming">✨ This feature will be connected soon.</p>
            <button onClick={() => setActive('Home')}>← Back Home</button>
          </section>
        )}
      </main>

      <nav className="bottom">
        {menu.map(item => (
          <button
            key={item.name}
            className={active === item.name ? 'selected' : ''}
            onClick={() => setActive(item.name)}
          >
            <span>{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
