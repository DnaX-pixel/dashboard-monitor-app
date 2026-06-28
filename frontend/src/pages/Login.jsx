import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await api.post(path, body);
      login(res.token, res.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left: Visual Branding */}
      <section className="hidden lg:flex lg:w-1/2 relative indigo-violet-gradient items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/20 blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-lg w-full">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                <span className="material-symbols-outlined text-white text-3xl">monitor_heart</span>
              </div>
              <span className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-white">Dashboard Monitor</span>
            </div>
            <h2 className="font-[Plus_Jakarta_Sans] text-[42px] leading-tight text-white mb-6">Master your monitoring ecosystem.</h2>
            <p className="font-[DM_Sans] text-base text-white/80 leading-relaxed">The unified platform for automated site reliability, deep-tech security analysis, and high-performance dashboarding.</p>
          </div>
          <div className="space-y-6">
            <Feature icon="screenshot_region" title="Automated Screenshots" desc="Capture visual regressions and state changes across viewports automatically." />
            <Feature icon="document_scanner" title="AI OCR Extraction" desc="Transform visual data into actionable text with our neural network engine." />
            <Feature icon="analytics" title="Predictive Analytics" desc="Identify bottlenecks before they affect your users with ML-driven forecasting." />
          </div>
          {/* Floating mockup */}
          <div className="mt-16 relative">
            <div className="w-full h-48 rounded-2xl glass-panel border border-white/10 p-6 flex flex-col justify-between animate-float">
              <div className="flex justify-between items-center">
                <span className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-white/40">System Health</span>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-success glow-dot"></div>
                  <div className="w-2 h-2 rounded-full bg-white/20"></div>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-[Plus_Jakarta_Sans] text-[28px] font-extrabold text-white">99.98%</div>
                  <div className="font-[DM_Sans] text-sm text-white/60">Uptime Reliability</div>
                </div>
                <div className="w-24 h-12 flex items-end gap-1">
                  <div className="w-2 bg-white/20 rounded-t-sm" style={{ height: '40%' }}></div>
                  <div className="w-2 bg-white/40 rounded-t-sm" style={{ height: '60%' }}></div>
                  <div className="w-2 bg-white/60 rounded-t-sm" style={{ height: '50%' }}></div>
                  <div className="w-2 bg-white/80 rounded-t-sm" style={{ height: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Auth Card */}
      <main className="w-full lg:w-1/2 bg-background flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="max-w-[420px] w-full">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">monitor_heart</span>
            <span className="font-[Plus_Jakarta_Sans] text-2xl font-extrabold text-text-primary">Dashboard Monitor</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="font-[Plus_Jakarta_Sans] text-[32px] font-extrabold text-text-primary mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="font-[DM_Sans] text-base text-text-dim">
              {mode === 'login' ? 'Enter your credentials to access your workspace.' : 'Start monitoring in minutes.'}
            </p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-6 shadow-2xl">
            {/* Tab toggle */}
            <div className="flex border-b border-border-subtle mb-8">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 font-[DM_Sans] text-sm font-bold transition-all ${mode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-3 font-[DM_Sans] text-sm font-bold transition-all ${mode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-primary'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={submit} className="space-y-[18px]">
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block ml-1">Full Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 px-4 text-text-primary font-[DM_Sans] text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim block ml-1">Work Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">mail</span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 pl-12 pr-4 text-text-primary font-[DM_Sans] text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-text-dim">Password</label>
                  {mode === 'login' && (
                    <Link to="/forgot-password" className="font-[DM_Sans] text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">Forgot?</Link>
                  )}
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                    className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-3 pl-12 pr-4 text-text-primary font-[DM_Sans] text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="text-error text-sm font-[DM_Sans] flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full indigo-violet-gradient text-white font-[DM_Sans] text-sm font-bold py-4 rounded-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin-slow">refresh</span> Please wait…</>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In to Dashboard' : 'Create Free Account'}
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <Link to="/forgot-password" className="font-[DM_Sans] text-sm text-text-dim hover:text-text-primary transition-colors">Forgot password?</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 group cursor-default">
      <div className="mt-1 w-10 h-10 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:bg-white/20">
        <span className="material-symbols-outlined text-white">{icon}</span>
      </div>
      <div>
        <h4 className="font-[Plus_Jakarta_Sans] text-base font-bold text-white">{title}</h4>
        <p className="font-[DM_Sans] text-sm text-white/60">{desc}</p>
      </div>
    </div>
  );
}