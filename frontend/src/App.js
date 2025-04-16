import React, { useState, useEffect } from 'react';
import './App.css';
import { configureAmplify, getCurrentUser, getIdToken, signIn, signOut, signUp } from './auth';

function App() {
  const [message, setMessage] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const region = process.env.REACT_APP_AWS_REGION || 'us-east-1';
    const userPoolId = process.env.REACT_APP_USER_POOL_ID;
    const userPoolClientId = process.env.REACT_APP_USER_POOL_CLIENT_ID;
    const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || `nebulabridge-${process.env.REACT_APP_AWS_ACCOUNT}`;
    const redirectSignIn = process.env.REACT_APP_REDIRECT_SIGN_IN || window.location.origin;
    const redirectSignOut = process.env.REACT_APP_REDIRECT_SIGN_OUT || window.location.origin;
    
    if (userPoolId && userPoolClientId) {
      configureAmplify({
        region,
        userPoolId,
        userPoolClientId,
        cognitoDomain,
        redirectSignIn,
        redirectSignOut
      });
    }
    
    const checkAuth = async () => {
      const { success, user } = await getCurrentUser();
      if (success && user) {
        setUser(user);
        setIsAuthenticated(true);
        fetchInitialData();
      }
    };
    
    checkAuth();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setError('Authentication required. Please sign in.');
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const url = apiUrl.includes('/api') || apiUrl.endsWith('/prod') 
        ? apiUrl 
        : `${apiUrl}/api`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to send data to the backend. Please try again later.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const token = await getIdToken();
      if (!token) {
        setError('Authentication required. Please sign in.');
        setLoading(false);
        return;
      }
      
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const url = apiUrl.includes('/api') || apiUrl.endsWith('/prod') 
        ? apiUrl 
        : `${apiUrl}/api`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { success, error } = await signIn(email, password);
      if (success) {
        const { success: userSuccess, user } = await getCurrentUser();
        if (userSuccess) {
          setUser(user);
          setIsAuthenticated(true);
          fetchInitialData();
        }
      } else {
        setError(error.message || 'Failed to sign in. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Failed to sign in. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
      setMessage('');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const { success, error, nextStep } = await signUp(email, password, email);
      if (success) {
        setIsRegistering(false);
        setError('Registration successful! Please sign in with your new account.');
      } else if (nextStep && nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setIsRegistering(false);
        setError('Registration successful! Please check your email for a verification code and confirm your account.');
      } else {
        setError(error?.message || 'Failed to register. Please try again.');
      }
    } catch (error) {
      console.error('Error registering:', error);
      setError('Failed to register. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NebulaBridge</h1>
        <p>React Frontend + Python Lambda Backend Demo</p>
        
        {isAuthenticated ? (
          <>
            <div className="user-info">
              <p>Signed in as: {user?.attributes?.email || user?.username}</p>
              <button onClick={handleSignOut} className="auth-button" disabled={loading}>
                {loading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
            
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
          </>
        ) : (
          <div className="auth-container">
            <h2>{isRegistering ? 'Create Account' : 'Sign In'}</h2>
            {error && (
              <div className="error-container">
                <p>{error}</p>
              </div>
            )}
            <form onSubmit={isRegistering ? handleRegistration : handleSignIn} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                />
              </div>
              {isRegistering && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password:</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="auth-input"
                  />
                </div>
              )}
              <button type="submit" className="auth-button primary-button" disabled={loading}>
                {loading 
                  ? (isRegistering ? 'Creating Account...' : 'Signing in...') 
                  : (isRegistering ? 'Create Account' : 'Sign In')}
              </button>
            </form>
            <div className="auth-toggle">
              <button onClick={toggleAuthMode} className="toggle-button">
                {isRegistering 
                  ? 'Already have an account? Sign In' 
                  : 'Need an account? Register'}
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
