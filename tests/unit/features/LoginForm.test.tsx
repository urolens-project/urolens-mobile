// Path: urolens-mobile/tests/unit/features/LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LoginForm } from '@features/auth/components/LoginForm';
import { useAuth } from '@features/auth/hooks/useAuth';

jest.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockLogin = jest.fn();

const defaultHook = {
  login:       mockLogin,
  logout:      jest.fn(),
  isSubmitting: false,
  error:        null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue(defaultHook);
});

describe('LoginForm', () => {
  describe('rendering', () => {
    it('shows the UroLens app title', () => {
      render(<LoginForm />);
      expect(screen.getByText('UroLens')).toBeTruthy();
    });

    it('shows the system subtitle', () => {
      render(<LoginForm />);
      expect(screen.getByText(/Clinical Laboratory Management System/i)).toBeTruthy();
    });

    it('renders the username input with correct placeholder', () => {
      render(<LoginForm />);
      expect(screen.getByPlaceholderText('Enter laboratory ID')).toBeTruthy();
    });

    it('renders the password input with correct placeholder', () => {
      render(<LoginForm />);
      expect(screen.getByPlaceholderText('Enter password')).toBeTruthy();
    });

    it('renders the Login button', () => {
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy();
    });

    it('renders compliance footer badges', () => {
      render(<LoginForm />);
      expect(screen.getAllByText('HIPAA Compliant')).toBeTruthy();
    });
  });

  describe('login action', () => {
    it('calls login with username and password when Login button pressed', () => {
      render(<LoginForm />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter laboratory ID'), 'medtech01');
      fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'secret123');
      fireEvent.press(screen.getByRole('button', { name: 'Login' }));
      expect(mockLogin).toHaveBeenCalledWith('medtech01', 'secret123');
    });

    it('calls login when password input submit editing is triggered', () => {
      render(<LoginForm />);
      fireEvent.changeText(screen.getByPlaceholderText('Enter laboratory ID'), 'medtech01');
      fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'pass');
      fireEvent(screen.getByPlaceholderText('Enter password'), 'submitEditing');
      expect(mockLogin).toHaveBeenCalledWith('medtech01', 'pass');
    });
  });

  describe('submitting state', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ ...defaultHook, isSubmitting: true });
    });

    it('disables the Login button while submitting', () => {
      render(<LoginForm />);
      const btn = screen.getByRole('button', { name: 'Login' });
      expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBe(true);
    });

    it('renders ActivityIndicator instead of button text while submitting', () => {
      render(<LoginForm />);
      expect(screen.queryByText(/Login/i)).toBeNull();
    });

    it('marks username input as non-editable while submitting', () => {
      render(<LoginForm />);
      expect(screen.getByPlaceholderText('Enter laboratory ID').props.editable).toBe(false);
    });

    it('marks password input as non-editable while submitting', () => {
      render(<LoginForm />);
      expect(screen.getByPlaceholderText('Enter password').props.editable).toBe(false);
    });
  });

  describe('error state', () => {
    it('shows the error message when error is set', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...defaultHook,
        error: 'Invalid username or password.',
      });
      render(<LoginForm />);
      expect(screen.getByText('Invalid username or password.')).toBeTruthy();
    });

    it('does not show an error row when error is null', () => {
      render(<LoginForm />);
      expect(screen.queryByText(/invalid/i)).toBeNull();
    });
  });

  describe('keep logged in toggle', () => {
    it('toggles keep-logged-in when the row is pressed', () => {
      render(<LoginForm />);
      const toggleRow = screen.getByRole('checkbox');
      expect(toggleRow.props.accessibilityState?.checked).toBe(false);
      fireEvent.press(toggleRow);
      expect(screen.getByRole('checkbox').props.accessibilityState?.checked).toBe(true);
    });
  });
});
