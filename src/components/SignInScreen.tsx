import React, { FormEvent, useState } from "react";
import { Lock, User } from "lucide-react";

interface SignInScreenProps {
  onSignIn: () => void;
}

export default function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSignIn();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-red-600 flex items-center justify-center text-white font-black tracking-tighter text-base">
              KO
            </div>
            <div>
              <h1 className="font-sans font-bold text-slate-950 tracking-tight text-lg">picOS Store Assist</h1>
              <p className="text-xs text-slate-500 mt-0.5">Welcome to field execution</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="signin-username" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Username
            </label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="signin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signin-password" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition-colors"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-4 rounded text-xs transition-all uppercase tracking-wider font-mono cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
