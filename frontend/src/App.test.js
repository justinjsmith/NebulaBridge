import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
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
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    expect(fetch).toHaveBeenCalledWith(expect.any(String));
    await waitFor(() => {
      expect(screen.getByText('Hello from NebulaBridge Lambda function!')).toBeInTheDocument();
    });
  });

  test('sends text input to API and displays response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'NebulaBridge received your message: Test message' }),
    });

    render(<App />);
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    
    const input = screen.getByPlaceholderText('Enter text to send to Lambda');
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    const button = screen.getByText('Send');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send data to the backend. Please try again later.')).toBeInTheDocument();
    });
  });
});
