import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || '/api';
        const response = await fetch(`${apiUrl}/api`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setMessage(data.message);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to fetch data from the backend. Please try again later.');
      }
    };

    fetchInitialData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${apiUrl}/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessage(data.message);
      setLoading(false);
    } catch (error) {
      console.error('Error sending data:', error);
      setError('Failed to send data to the backend. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NebulaBridge</h1>
        <p>React Frontend + Python Lambda Backend</p>
        
        <div className="input-container">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to send to Lambda"
              className="text-input"
            />
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
        
        {error ? (
          <div className="error-container">
            <h2>Error:</h2>
            <p>{error}</p>
          </div>
        ) : message ? (
          <div className="message-container">
            <h2>Response from Lambda:</h2>
            <p>{message}</p>
          </div>
        ) : null}
      </header>
    </div>
  );
}

export default App;
