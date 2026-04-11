import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignupForm } from '@/components/auth/signup-form'
import { LoginForm } from '@/components/auth/login-form'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock next/link
vi.mock('next/link', () => {
  return {
    default: ({
      children,
      href,
    }: {
      children: React.ReactNode
      href: string
    }) => <a href={href}>{children}</a>,
  }
})

// Mock the auth client
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: vi.fn(),
    },
    signIn: {
      email: vi.fn(),
    },
  },
}))

// Mock the analytics utility
vi.mock('@/lib/analytics-utils', () => ({
  captureAnalyticsEvent: vi.fn(),
}))

import { authClient } from '@/lib/auth-client'
import { captureAnalyticsEvent } from '@/lib/analytics-utils'

describe('SignupForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  describe('Rendering', () => {
    it('should render name field', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })

    it('should render email field', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('should render password field', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should render confirm password field', () => {
      render(<SignupForm />)
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('should render submit button with correct text', () => {
      render(<SignupForm />)
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render sign in link', () => {
      render(<SignupForm />)
      const signInLink = screen.getByRole('link', { name: 'Sign in' })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Password Validation', () => {
    it('should show error when passwords do not match', async () => {
      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password456' },
      })

      fireEvent.click(submitButton)

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('should not show password mismatch error when passwords match', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(authClient.signUp.email).toHaveBeenCalled()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during form submission', async () => {
      ;(authClient.signUp.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Creating account...' }),
        ).toBeInTheDocument()
      })
    })

    it('should disable submit button during loading', async () => {
      ;(authClient.signUp.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', {
          name: 'Creating account...',
        })
        expect(loadingButton).toBeDisabled()
      })
    })

    it('should disable input fields during loading', async () => {
      ;(authClient.signUp.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(nameInput.disabled).toBe(true)
        expect(emailInput.disabled).toBe(true)
        expect(passwordInput.disabled).toBe(true)
        expect(confirmPasswordInput.disabled).toBe(true)
      })
    })
  })

  describe('Server Error Messages', () => {
    it('should display server error message when signup fails', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: { message: 'An error occurred' },
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument()
      })
    })

    it('should display custom message for email already taken', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: { message: 'User with this email already exists' },
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(
            'Email already taken. Please use a different email.',
          ),
        ).toBeInTheDocument()
      })
    })

    it('should display error from catch block for unexpected errors', async () => {
      ;(authClient.signUp.email as any).mockRejectedValueOnce(
        new Error('Network error'),
      )

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show error message with role="alert"', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: { message: 'Test error' },
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent('Test error')
      })
    })
  })

  describe('Successful Signup', () => {
    it('should call authClient.signUp.email with correct data', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(authClient.signUp.email).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
        })
      })
    })

    it('should redirect to dashboard on successful signup', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should capture analytics event on successful signup', async () => {
      ;(authClient.signUp.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<SignupForm />)

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        'Confirm Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })

      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, {
        target: { value: 'password123' },
      })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(captureAnalyticsEvent).toHaveBeenCalledWith('user-signed-up', {})
      })
    })
  })
})

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  describe('Rendering', () => {
    it('should render email field', () => {
      render(<LoginForm />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('should render password field', () => {
      render(<LoginForm />)
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('should render submit button with correct text', () => {
      render(<LoginForm />)
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).toBeInTheDocument()
    })

    it('should render sign up link', () => {
      render(<LoginForm />)
      const signUpLink = screen.getByRole('link', { name: 'Sign up' })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/signup')
    })

    it('should render forgot password link', () => {
      render(<LoginForm />)
      const forgotLink = screen.getByRole('link', { name: 'Forgot password?' })
      expect(forgotLink).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state during form submission', async () => {
      ;(authClient.signIn.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Signing in...' }),
        ).toBeInTheDocument()
      })
    })

    it('should disable submit button during loading', async () => {
      ;(authClient.signIn.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', {
          name: 'Signing in...',
        })
        expect(loadingButton).toBeDisabled()
      })
    })

    it('should disable input fields during loading', async () => {
      ;(authClient.signIn.email as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100)
          }),
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(emailInput.disabled).toBe(true)
        expect(passwordInput.disabled).toBe(true)
      })
    })
  })

  describe('Server Error Messages', () => {
    it('should display server error message when signin fails', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: { message: 'Invalid credentials' },
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display default error message if error object is missing message', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: {},
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to sign in')).toBeInTheDocument()
      })
    })

    it('should display error from catch block for unexpected errors', async () => {
      ;(authClient.signIn.email as any).mockRejectedValueOnce(
        new Error('Network error'),
      )

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show error message with role="alert"', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: { message: 'Test error' },
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent('Test error')
      })
    })
  })

  describe('Successful Login', () => {
    it('should call authClient.signIn.email with correct credentials', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(authClient.signIn.email).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
        })
      })
    })

    it('should redirect to dashboard on successful login', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should capture analytics event on successful login', async () => {
      ;(authClient.signIn.email as any).mockResolvedValueOnce({
        error: null,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement
      const passwordInput = screen.getByLabelText(
        'Password',
      ) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(captureAnalyticsEvent).toHaveBeenCalledWith('user-logged-in', {})
      })
    })
  })
})
