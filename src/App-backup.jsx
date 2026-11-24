import React, { useState } from 'react';
import './App.css';

const tools = [
  ['💬','Chat','Talk with Cutie'],
  ['🎨','Image','Generate Images'],
  ['🎬','Video','Create Videos'],
  ['🎙️','Voice','Speak with me'],
  ['💡','Tools','AI Utilities'],
  ['✨','Explore','More Features']
];

export default function App() {
  const [active, setActive] = useState('Home');
  const [message, setMessage] = useState('');

  const menu = ['Home','Chat','Tools','History','Profile'];

  return (
    <div className="app">
      <header className="top">
        <div className="avatar">💜</div>
        <div>
          <h2>Cutie AI <span>2.0</span></h2>
          <small>● Online · Your Personal AI Companion</small>
        </div>
        <button className="pro">♛ Pro</button>
      </header>

      <main>
        {active === 'Home' ? (
          <>
            <section className="hero">
              <div className="girl">👩🏻‍🎤</div>
              <h1>Hey Boss! 💜</h1>
              <p>আমি Cutie, তোমার AI বন্ধু!</p>
              <p>Your Personal AI Companion</p>
            </section>

            <section className="tools">
              {tools.map(([icon,title,desc]) => (
                <button className="tool" key={title}
                  onClick={() => setActive(title)}>
                  <span>{icon}</span>
                  <div><b>{title}</b><small>{desc}</small></div>
                  <strong>›</strong>
                </button>
              ))}
            </section>

            <section className="quick">
              <h3>✦ Quick message to Cutie</h3>
              <form onSubmit={e => {
                e.preventDefault();
                if(message.trim()) setActive('Chat');
              }}>
                <input value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type a message, Boss..." />
                <button>➤</button>
              </form>
            </section>
          </>
        ) : (
          <section className="page">
            <h1>{active === 'Chat' ? '💜 Chat with Cutie' : active}</h1>
            <p>Welcome Boss! 💕</p>
            <p>{active === 'Chat'
              ? 'তোমার মেসেজ লিখে শুরু করো।'
              : 'This feature will be connected soon.'}</p>
            <button onClick={() => setActive('Home')}>← Back Home</button>
            {active === 'Chat' && (
              <form onSubmit={e => e.preventDefault()}>
                <input placeholder="Message Cutie..." />
                <button>➤</button>
              </form>
            )}
          </section>
        )}
      </main>

      <nav className="bottom">
        {menu.map((name,i) => (
          <button className={active === name ? 'selected' : ''}
            key={name} onClick={() => setActive(name)}>
            <span>{['⌂','☏','▦','◷','♙'][i]}</span>
            {name}
          </button>
        ))}
      </nav>
      <footer>Made with 💜 for Boss · Cutie AI 2.0</footer>
    </div>
  );
}
D
+d
