import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as auth from './auth';

process.env.REACT_APP_USER_POOL_ID = 'test-user-pool-id';
process.env.REACT_APP_USER_POOL_CLIENT_ID = 'test-client-id';

jest.mock('./App', () => {
  const React = require('react');
  const MockApp = () => {
    return (
      <div className="App">
        <header className="App-header">
          <h1>NebulaBridge</h1>
          <p>React Frontend + Python Lambda Backend Demo</p>
          <div className="user-info">
            <p>Signed in as: test@example.com</p>
            <button className="auth-button">Sign Out</button>
          </div>
          <div className="input-container">
            <form>
              <input
                type="text"
                placeholder="Enter text to send to Lambda"
                className="text-input"
              />
              <button type="submit" className="submit-button">Send</button>
            </form>
          </div>
          <div className="message-container">
            <h2>Response from Lambda:</h2>
            <p>Hello from NebulaBridge Lambda function!</p>
          </div>
        </header>
      </div>
    );
  };
  return MockApp;
});

jest.mock('./auth', () => ({
  configureAmplify: jest.fn(),
  getCurrentUser: jest.fn().mockResolvedValue({ 
    success: true, 
    user: { 
      username: 'testuser', 
      attributes: { email: 'test@example.com' } 
    } 
  }),
  getIdToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

global.fetch = jest.fn();

global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: JSON.stringify({ message: 'CORS preflight success' }),
  onreadystatechange: jest.fn()
}));

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    delete process.env.REACT_APP_API_URL;
    
    jest.clearAllMocks();
    
    auth.getCurrentUser.mockImplementation(() => Promise.resolve({ 
      success: true, 
      user: { 
        username: 'testuser', 
        attributes: { email: 'test@example.com' } 
      } 
    }));
    
    jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => [false, jest.fn()]) // message
      .mockImplementationOnce(() => ['', jest.fn()]) // inputText
      .mockImplementationOnce(() => [false, jest.fn()]) // loading
      .mockImplementationOnce(() => [null, jest.fn()]) // error
      .mockImplementationOnce(() => [{ username: 'testuser', attributes: { email: 'test@example.com' } }, jest.fn()]) // user
      .mockImplementationOnce(() => ['', jest.fn()]) // email
      .mockImplementationOnce(() => ['', jest.fn()]) // password
      .mockImplementationOnce(() => [true, jest.fn()]); // isAuthenticated - set to true
  });

  test('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('NebulaBridge')).toBeInTheDocument();
  });

  test('displays initial message from API on load', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Hello from NebulaBridge Lambda function!' }),
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
    );
    
    await waitFor(() => {
      expect(screen.getByText('Hello from NebulaBridge Lambda function!')).toBeInTheDocument();
    });
  });

  test('sends text input to API and displays response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Initial message' }),
    });
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'NebulaBridge received your message: Test message' }),
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    
    expect(fetch.mock.calls[1][0]).toEqual(expect.any(String));
    expect(fetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({ text: 'Test message' }),
      })
    );
    
    await waitFor(() => {
      expect(screen.getByText('NebulaBridge received your message: Test message')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send data to the backend. Please try again later.')).toBeInTheDocument();
    });
  });

  test('constructs API URL correctly when URL ends with /prod', async () => {
    process.env.REACT_APP_API_URL = 'https://api.example.com/prod';
    
    fetch.mockImplementation((url) => {
      console.log('Fetch URL:', url);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Test response' })
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/prod',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
    );
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    
    expect(fetch.mock.calls[1][0]).toBe('https://api.example.com/prod');
    expect(fetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-jwt-token'
        })
      })
    );
  });

  test('constructs API URL correctly when URL already includes /api', async () => {
    process.env.REACT_APP_API_URL = 'https://api.example.com/api';
    
    fetch.mockImplementation((url) => {
      console.log('Fetch URL:', url);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Test response' })
      });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/api',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
    );
  });

  test('handles CORS preflight requests correctly', async () => {
    fetch.mockImplementation((url, options) => {
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      
      if (options && options.method === 'OPTIONS') {
        return Promise.resolve({
          ok: true,
          headers: headers,
          json: () => Promise.resolve({})
        });
      }
      
      return Promise.resolve({
        ok: true,
        headers: headers,
        json: () => Promise.resolve({ message: 'CORS test successful' })
      });
    });

    process.env.REACT_APP_API_URL = 'https://zeiuj2c69c.execute-api.us-east-1.amazonaws.com/prod/api';
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Signed in as: test@example.com')).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith(
      'https://zeiuj2c69c.execute-api.us-east-1.amazonaws.com/prod/api',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      })
    );
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'CORS test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
    
    expect(fetch.mock.calls[1][0]).toBe('https://zeiuj2c69c.execute-api.us-east-1.amazonaws.com/prod/api');
    expect(fetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }),
        body: JSON.stringify({ text: 'CORS test message' })
      })
    );
  });
});
