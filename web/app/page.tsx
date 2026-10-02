"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit PIN code");
      return;
    }

    router.push(`/area/${pincode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[82vh] px-4">
      {/* Hero */}
      <div className="text-center max-w-md mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium mb-5">
          🇮🇳 Open Source · Facts Only · No Ads
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight tracking-tight">
          Know your candidates.
        </h1>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-500 mt-1 tracking-tight">
          Vote with facts.
        </h2>
        <p className="text-base text-slate-500 mt-4 leading-relaxed">
          Enter your PIN code to see your MP&apos;s attendance, wealth, criminal
          cases, and development spending — all from official sources.
        </p>
      </div>

      {/* PIN Code Entry Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            📍 Your PIN Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPincode(val);
                setError("");
              }}
              placeholder="e.g. 110001"
              className="flex-1 h-12 px-4 text-base bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 placeholder:text-slate-400"
              autoFocus
            />
            <button
              type="submit"
              className="h-12 px-5 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 active:scale-95 shadow-sm"
            >
              Go →
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}

          <button
            type="button"
            onClick={() =>
              setError(
                "Location detection coming soon. Please enter your PIN code."
              )
            }
            className="w-full mt-3 h-10 flex items-center justify-center gap-2 text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 text-sm border border-slate-100"
          >
            📍 Detect My Location
          </button>
        </form>
      </div>

      {/* Sample PINs */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 mb-2">Try a sample PIN:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { pin: "110001", city: "Delhi" },
            { pin: "411001", city: "Pune" },
            { pin: "600001", city: "Chennai" },
            { pin: "700001", city: "Kolkata" },
            { pin: "226001", city: "Lucknow" },
          ].map(({ pin, city }) => (
            <button
              key={pin}
              onClick={() => router.push(`/area/${pin}`)}
              className="px-3 py-1.5 text-xs bg-white text-slate-600 rounded-lg border border-slate-100 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
            >
              {city}
              <span className="text-slate-400 ml-1">{pin}</span>
            </button>
          ))}
        </div>
      </div>

      {/* What you'll see */}
      <div className="mt-14 max-w-md w-full">
        <p className="text-xs text-slate-400 text-center mb-4 uppercase tracking-wider font-medium">
          What you&apos;ll see
        </p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: "🏛️", label: "Attendance", desc: "Did they show up?" },
            { icon: "💰", label: "Wealth", desc: "How much they own" },
            { icon: "⚖️", label: "Cases", desc: "Criminal record" },
            { icon: "🏗️", label: "Fund Spent", desc: "Your area's money" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-xs font-semibold text-slate-700 mt-1.5">
                {item.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
