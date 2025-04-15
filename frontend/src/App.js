import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setMessage('Hello from NebulaBridge Lambda function!');
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>NebulaBridge</h1>
        <p>React Frontend + Python Lambda Backend</p>
        {loading ? (
          <p>Loading message from backend...</p>
        ) : (
          <div className="message-container">
            <h2>Response from Lambda:</h2>
            <p>{message}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
