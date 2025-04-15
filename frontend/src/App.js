import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || '/api';
        const response = await fetch(`${apiUrl}/api`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setMessage(data.message);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data from the backend. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>NebulaBridge</h1>
        <p>React Frontend + Python Lambda Backend</p>
        {loading ? (
          <p>Loading message from backend...</p>
        ) : error ? (
          <div className="error-container">
            <h2>Error:</h2>
            <p>{error}</p>
          </div>
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
