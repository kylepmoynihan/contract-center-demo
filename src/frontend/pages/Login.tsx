import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';

/**
 * Login Page Component
 *
 * Features:
 * - Email/password authentication via AWS Cognito
 * - Password visibility toggle
 * - Error handling and validation
 * - "Remember me" option
 * - Links to signup and password reset
 * - Loading states
 *
 * Future enhancements:
 * - SSO integration (Google, Microsoft)
 * - Multi-factor authentication
 * - Biometric authentication
 */

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.email || !isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  // Handle input changes
  const handleChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: field === 'rememberMe' ? event.target.checked : event.target.value,
    });
    setError(null); // Clear error on input change
  };

  // Handle input blur (for validation)
  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched({ ...touched, [field]: true });
  };

  // Handle login submission
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Authenticate with AWS Cognito
      const user = await Auth.signIn(formData.email, formData.password);

      // Check if MFA is required
      if (user.challengeName === 'SOFTWARE_TOKEN_MFA' ||
          user.challengeName === 'SMS_MFA') {
        // Redirect to MFA verification page (Phase 1B)
        navigate('/mfa-verify', { state: { user } });
        return;
      }

      // Check if new password is required (first-time login)
      if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
        navigate('/set-password', { state: { user } });
        return;
      }

      // Get user attributes and organization
      const userAttributes = await Auth.currentUserInfo();
      const organizationId = userAttributes.attributes['custom:organization_id'];

      if (!organizationId) {
        throw new Error('User is not associated with an organization');
      }

      // Store organization context
      localStorage.setItem('organizationId', organizationId);

      // Optional: Remember me functionality
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err: any) {
      console.error('Login error:', err);

      // Handle specific error cases
      switch (err.code) {
        case 'UserNotFoundException':
          setError('No account found with this email address');
          break;
        case 'NotAuthorizedException':
          setError('Incorrect email or password');
          break;
        case 'UserNotConfirmedException':
          setError('Please confirm your email address before logging in');
          navigate('/confirm-email', { state: { email: formData.email } });
          break;
        case 'PasswordResetRequiredException':
          setError('Password reset required. Redirecting...');
          setTimeout(() => navigate('/reset-password', { state: { email: formData.email } }), 2000);
          break;
        case 'TooManyRequestsException':
          setError('Too many login attempts. Please try again later');
          break;
        default:
          setError(err.message || 'An error occurred during login. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle "Forgot Password" click
  const handleForgotPassword = () => {
    navigate('/forgot-password', { state: { email: formData.email } });
  };

  // Handle "Sign Up" click
  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <CardContent sx={{ padding: 4 }}>
          {/* Logo/Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
              RECC
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real Estate Contract Center
            </Typography>
          </Box>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Email Field */}
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={touched.email && (!formData.email || !isValidEmail(formData.email))}
              helperText={
                touched.email && (!formData.email || !isValidEmail(formData.email))
                  ? 'Please enter a valid email address'
                  : ''
              }
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Password Field */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={touched.password && formData.password.length < 8}
              helperText={
                touched.password && formData.password.length < 8
                  ? 'Password must be at least 8 characters'
                  : ''
              }
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />

            {/* Remember Me & Forgot Password */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange('rememberMe')}
                  disabled={loading}
                  style={{ marginRight: 8 }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: 14, cursor: 'pointer' }}>
                  Remember me
                </label>
              </Box>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleForgotPassword}
                disabled={loading}
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mb: 2,
                py: 1.5,
                textTransform: 'none',
                fontSize: 16,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            {/* Sign Up Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleSignUp}
                  disabled={loading}
                  sx={{ fontWeight: 'bold', textDecoration: 'none' }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          </form>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Development Mode Indicator (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: 1,
            borderRadius: 1,
            fontSize: 12,
          }}
        >
          Development Mode - localhost
        </Box>
      )}
    </Box>
  );
};

export default Login;
