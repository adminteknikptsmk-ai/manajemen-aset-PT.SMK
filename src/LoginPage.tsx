import React, { useState } from 'react';
import { useAuth } from './firebase/AuthContext';
import { CompanyLogo } from './components/CompanyLogo';
import { LogIn, ShieldAlert, KeyRound, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className="min-h-screen bg-[#EEEEEE] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#D8D2CB] p-8 flex flex-col items-center text-center">
        <CompanyLogo size="lg" className="mb-6 justify-center" />
        
        <h2 className="text-2xl font-bold text-[#1C658C] mb-2">Portal Manajemen PT SMK</h2>
        <p className="text-sm text-slate-500 mb-6">
          Sistem Manajemen Aset, Keuangan, SPH, SPK, dan Penjadwalan Kalibrasi RS.
        </p>

        {error && (
          <div className="w-full mb-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#398AB9] focus:ring-1 focus:ring-[#398AB9] text-sm"
            />
            <UserIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="relative mb-6">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-[#398AB9] focus:ring-1 focus:ring-[#398AB9] text-sm"
            />
            <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
          </div>

          {loading ? (
            <div className="py-4 text-[#398AB9] text-sm font-semibold animate-pulse">
              Memuat otentikasi...
            </div>
          ) : (
            <button
              type="submit"
              className="w-full bg-[#1C658C] hover:bg-[#398AB9] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors shadow-sm"
            >
              <LogIn className="w-5 h-5" />
              <span>Login</span>
            </button>
          )}
        </form>

        <div className="mt-8 flex items-start gap-3 p-4 bg-[#EEEEEE]/60 rounded-xl border border-[#D8D2CB] text-left">
          <ShieldAlert className="w-5 h-5 text-[#398AB9] shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Sistem ini dilindungi dengan kontrol akses (RBAC). Hanya akun Admin terdaftar yang dapat melakukan pengelolaan data secara penuh.
          </p>
        </div>
      </div>
    </div>
  );
};
