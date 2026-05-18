import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { authService } from "../../services/authService";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleGoogleSuccess({ credential: tokenResponse.access_token });
    },
    onError: () => handleGoogleError(),
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (/\s/.test(formData.username)) {
      setError("Username cannot contain spaces");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.register({
        username: formData.username,
        email: formData.email,
        plain_password: formData.password,
        role: "buyer",
      });

      if (response.message) {
        navigate("/login");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const response = await authService.googleAuth(credentialResponse.credential, true);
      if (response.access_token) {
        authService.setAuthToken(response.access_token);
        navigate("/studio");
      } else {
        // Fallback if no token is immediately provided but creation was successful
        navigate("/login");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Google signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was unsuccessful. Try again.");
  };

  return (
    <div className="min-h-screen bg-backgroundColor flex items-center justify-center px-paddingLarge">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-borderRadiusLg bg-surfaceColor flex items-center justify-center mb-marginLarge">
            <UserPlus size={40} className="text-primaryColor" />
          </div>
          <h2 className="text-textColorMain text-3xl font-fontWeightBold">
            Create Account
          </h2>
          <p className="text-textColorMuted mt-marginSmall">
            Join Takhleeq and start designing
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-errorColor/10 border border-errorColor text-errorColor px-paddingMedium py-paddingSmall rounded-borderRadiusMd text-fontSizeSm">
              {error}
            </div>
          )}

          <div>
          
            <label
              htmlFor="name"
              className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall"
            ></label>

            <label htmlFor="username" className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall">
              User Name

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
                placeholder="Enter your user name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={20} className="text-textColorMuted" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none relative block w-full pl-10 pr-3 py-paddingMedium border border-borderColor bg-surfaceColor text-textColorMain rounded-borderRadiusMd focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-textColorMuted" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full pl-10 pr-10 py-paddingMedium border border-borderColor bg-surfaceColor text-textColorMain rounded-borderRadiusMd focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                placeholder="Create a password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff
                    size={20}
                    className="text-textColorMuted hover:text-textColorMain"
                  />
                ) : (
                  <Eye
                    size={20}
                    className="text-textColorMuted hover:text-textColorMain"
                  />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-textColorMain text-fontSizeSm font-fontWeightMedium mb-marginSmall"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={20} className="text-textColorMuted" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none relative block w-full pl-10 pr-10 py-paddingMedium border border-borderColor bg-surfaceColor text-textColorMain rounded-borderRadiusMd focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff
                    size={20}
                    className="text-textColorMuted hover:text-textColorMain"
                  />
                ) : (
                  <Eye
                    size={20}
                    className="text-textColorMuted hover:text-textColorMain"
                  />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="h-4 w-4 text-primaryColor focus:ring-primaryColor border-borderColor rounded"
            />
            <label
              htmlFor="agree-terms"
              className="ml-2 block text-fontSizeSm text-textColorMuted"
            >
              I agree to the{" "}
              <a
                href="#"
                className="text-primaryColor hover:text-primaryColor/80"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-primaryColor hover:text-primaryColor/80"
              >
                Privacy Policy
              </a>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-paddingMedium px-paddingLarge border border-transparent text-fontSizeSm font-fontWeightMedium rounded-borderRadiusMd text-textColorInverse bg-primaryColor hover:bg-primaryColor/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryColor disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-textColorInverse"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
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
            <button
              type="button"
              onClick={() => login()}
              className="flex items-center justify-center w-full bg-black border border-borderColor rounded-borderRadiusMd px-paddingLarge py-paddingMedium hover:bg-black/90 transition-all group"
            >
              <div className="flex items-center gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#EBB924"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#EBB924"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#EBB924"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EBB924"
                  />
                </svg>
                <span className="text-white text-fontSizeSm font-fontWeightMedium">
                  Sign up with Google
                </span>
              </div>
            </button>
          </div>

          <div className="text-center">
            <span className="text-textColorMuted text-fontSizeSm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-fontWeightMedium text-primaryColor hover:text-primaryColor/80"
              >
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
