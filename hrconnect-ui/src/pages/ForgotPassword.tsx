import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { FiMail, FiArrowRight, FiCopy, FiCheck } from 'react-icons/fi';
import Button from '../components/Button';
import Input from '../components/Input';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.forgotPassword(email);
      if (response.data.success && response.data.resetCode) {
        setResetCode(response.data.resetCode);
      } else {
        setError(response.data.message || 'Failed to generate reset code');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-secondary-500 to-purple-600 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo & Title */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">HR</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Forgot Password
            </h1>
            <p className="text-gray-600 mt-2">Enter your email to get a reset code</p>
          </div>

          {!resetCode ? (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  icon={FiMail}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  icon={FiArrowRight}
                  iconPosition="right"
                >
                  {isLoading ? 'Processing...' : 'Get Reset Code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Success - Show Reset Code */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <p className="text-green-800 font-medium mb-4">
                  Reset Code Generated!
                </p>
                <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                  <p className="text-3xl font-bold text-gray-900 tracking-wider">
                    {resetCode}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copied ? FiCheck : FiCopy}
                  onClick={copyToClipboard}
                  fullWidth
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>
                <p className="text-sm text-gray-600 mt-4">
                  Code expires in 15 minutes
                </p>
              </div>

              {/* Demo Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> In production, this code would be sent to your email.
                </p>
              </div>

              {/* Reset Password Link */}
              <div className="text-center">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Proceed to Reset Password →
                </Link>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Remember your password?</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6 opacity-90">
          © 2024 HRConnect. All rights reserved.
        </p>
      </div>
    </div>
  );
};
