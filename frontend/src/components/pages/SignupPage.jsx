import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
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
      const response = await authService.googleAuth(credentialResponse.credential);
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
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="rectangular"
              text="signup_with"
              size="large"
              width="100%"
            />
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
