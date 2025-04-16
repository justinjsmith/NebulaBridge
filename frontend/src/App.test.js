import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as auth from './auth';

jest.mock('./auth', () => ({
  configureAmplify: jest.fn(),
  getCurrentUser: jest.fn().mockResolvedValue({ success: true, user: { username: 'testuser', attributes: { email: 'test@example.com' } } }),
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
