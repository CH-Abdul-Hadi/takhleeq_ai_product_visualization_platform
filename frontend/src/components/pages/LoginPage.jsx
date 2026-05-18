import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { GoogleLogin } from "@react-oauth/google";
import { authService } from '../../services/authService';
import { loginSuccess } from '../../store/authSlice';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '', 
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({
        username: formData.username,
        plain_password: formData.password,
      });

      if (response.access_token) {
        // Store the token so subsequent API calls are authenticated
        authService.setAuthToken(response.access_token);

        // Fetch the full user profile now that the token is set
        const userProfile = await authService.getCurrentUser();

        // Hydrate Redux with real user data
        dispatch(loginSuccess(userProfile));

        navigate('/');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === 'Could Not Validate User') {
        setError('Incorrect email or password.');
      } else {
        setError(detail || err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.googleAuth(credentialResponse.credential);
      if (response.access_token) {
        authService.setAuthToken(response.access_token);
        const userProfile = await authService.getCurrentUser();
        dispatch(loginSuccess(userProfile));
        navigate('/');
      } else {
        setError('Google login failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was unsuccessful. Try again.');
  };

  return (
    <div className="min-h-screen bg-backgroundColor flex items-center justify-center px-paddingLarge">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-borderRadiusLg bg-surfaceColor flex items-center justify-center mb-marginLarge">
            <User size={40} className="text-primaryColor" />
          </div>
          <h2 className="text-textColorMain text-3xl font-fontWeightBold">
            Welcome Back
          </h2>
          <p className="text-textColorMuted mt-marginSmall">
            Sign in to your Takhleeq account
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-errorColor/10 border border-errorColor text-errorColor px-paddingMedium py-paddingSmall rounded-borderRadiusMd text-fontSizeSm">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall">
            Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={20} className="text-textColorMuted" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                className="appearance-none relative block w-full pl-10 pr-3 py-paddingMedium border border-borderColor bg-surfaceColor text-textColorMain rounded-borderRadiusMd focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                placeholder="Enter your username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-textColorMuted" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full pl-10 pr-10 py-paddingMedium border border-borderColor bg-surfaceColor text-textColorMain rounded-borderRadiusMd focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-textColorMuted hover:text-textColorMain" />
                ) : (
                  <Eye size={20} className="text-textColorMuted hover:text-textColorMain" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primaryColor focus:ring-primaryColor border-borderColor rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-fontSizeSm text-textColorMuted">
                Remember me
              </label>
            </div>
            <div className="text-fontSizeSm">
              <a href="#" className="font-fontWeightMedium text-primaryColor hover:text-primaryColor/80">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-paddingMedium px-paddingLarge border border-transparent text-fontSizeSm font-fontWeightMedium rounded-borderRadiusMd text-textColorInverse bg-primaryColor hover:bg-primaryColor/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryColor disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-textColorInverse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-borderColor"></div>
            </div>
            <div className="relative flex justify-center text-fontSizeSm">
              <span className="px-2 bg-backgroundColor text-textColorMuted">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex justify-center w-full">
              <button>
            <img src='/google_icon.png'/>
            </button>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="rectangular"
              text="signin_with"
              size="large"
              width="100%"
            />
          </div>

          <div className="text-center">
            <span className="text-textColorMuted text-fontSizeSm">
              Don't have an account?{' '}
              <Link to="/signup" className="font-fontWeightMedium text-primaryColor hover:text-primaryColor/80">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
