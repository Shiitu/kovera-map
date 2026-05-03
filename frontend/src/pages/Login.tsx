/**
 * @file frontend/src/pages/Login.tsx
 * @description Premium login page with luxury real estate background and glassmorphic form.
 */

import React, { useState } from 'react';
import { authApi } from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, CheckCircle, Headphones } from 'lucide-react';
import { useNetworkContext } from '../context/NetworkContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { refreshGraph } = useNetworkContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('kovera_token', res.data.token);
      localStorage.setItem('kovera_role', res.data.role);
      
      // Force app refresh
      window.location.href = '/network';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/login-bg.png')` }}
      />
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      {/* Subtle vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
        
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
            <div className="w-6 h-6 rounded-full bg-white" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white text-center">
            Welcome to <em className="font-semibold not-italic" style={{ fontFamily: 'Georgia, serif' }}>Kovera</em> Admin
          </h1>
          <p className="text-white/50 text-sm mt-2 tracking-wide">
            Sign in to manage your real estate dashboard
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="w-full rounded-2xl border border-white/10 p-8 relative overflow-hidden"
          style={{ 
            background: 'rgba(255, 255, 255, 0.06)', 
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Subtle shimmer line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                  placeholder="admin@kovera.io"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-white/30 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                  placeholder="Enter your password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                    rememberMe ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 bg-white/5'
                  }`}
                >
                  {rememberMe && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className="text-white/50 text-xs group-hover:text-white/70 transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors font-medium">
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center animate-pulse">
                {error}
              </div>
            )}

            {/* Submit */}
            <button 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Secure Login Badge */}
        <p className="mt-5 text-white/30 text-xs tracking-wider">Secure enterprise login</p>

        {/* Trust Badges */}
        <div className="mt-4 flex items-center gap-6 text-white/30">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400/60" />
            <div className="text-left">
              <p className="text-[10px] font-semibold text-white/50">SSL</p>
              <p className="text-[9px]">Encrypted</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400/60" />
            <div className="text-left">
              <p className="text-[10px] font-semibold text-white/50">SOC 2</p>
              <p className="text-[9px]">Compliant</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-emerald-400/60" />
            <div className="text-left">
              <p className="text-[10px] font-semibold text-white/50">24/7</p>
              <p className="text-[9px]">Support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
