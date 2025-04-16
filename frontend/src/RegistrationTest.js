import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as auth from './auth';

process.env.REACT_APP_USER_POOL_ID = 'test-user-pool-id';
process.env.REACT_APP_USER_POOL_CLIENT_ID = 'test-client-id';
process.env.REACT_APP_AWS_REGION = 'us-east-1';
process.env.REACT_APP_COGNITO_DOMAIN = 'test-domain';

jest.mock('./auth', () => ({
  configureAmplify: jest.fn(),
  getCurrentUser: jest.fn().mockResolvedValue({ success: false }),
  getIdToken: jest.fn().mockResolvedValue(null),
  signIn: jest.fn().mockResolvedValue({ success: true, user: { username: 'test@example.com' } }),
  signOut: jest.fn().mockResolvedValue({ success: true }),
  signUp: jest.fn().mockResolvedValue({
    success: true,
    user: {
      username: 'test@example.com',
      userId: 'test-user-id'
    }
  })
}));

global.fetch = jest.fn();

describe('Registration Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => [false, jest.fn()]) // isRegistering
      .mockImplementationOnce(() => ['', jest.fn()]) // email
      .mockImplementationOnce(() => ['', jest.fn()]) // password
      .mockImplementationOnce(() => ['', jest.fn()]) // confirmPassword
      .mockImplementationOnce(() => [null, jest.fn()]) // error
      .mockImplementationOnce(() => [null, jest.fn()]); // user - set to null to show login form
  });

  test('registration form can be toggled and submitted', async () => {
    render(<App />);
    
    const registerToggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(registerToggleButton);
    
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password:');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    
    const registerButton = screen.getByText('Create Account');
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith('test@example.com', 'Password123', 'test@example.com');
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Registration successful/)).toBeInTheDocument();
    });
  });

  test('shows error when passwords do not match', async () => {
    render(<App />);
    
    const registerToggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(registerToggleButton);
    
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password:');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword' } });
    
    const registerButton = screen.getByText('Create Account');
    fireEvent.click(registerButton);
    
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test('handles registration error from Cognito', async () => {
    auth.signUp.mockResolvedValueOnce({
      success: false,
      error: { message: 'User already exists' }
    });
    
    render(<App />);
    
    const registerToggleButton = screen.getByText('Need an account? Register');
    fireEvent.click(registerToggleButton);
    
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password:');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    
    const registerButton = screen.getByText('Create Account');
    fireEvent.click(registerButton);
    
    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalled();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/User already exists/)).toBeInTheDocument();
    });
  });
});
