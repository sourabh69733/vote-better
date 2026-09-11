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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Location detection not supported by your browser");
      return;
    }

    // For MVP, redirect to a default PIN code
    // In production, reverse-geocode coordinates to PIN
    setError("Location detection coming soon. Please enter your PIN code.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Hero */}
      <div className="text-center max-w-lg mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
          Know your candidates.
          <br />
          <span className="text-indigo-600">Vote with facts.</span>
        </h1>
        <p className="text-lg text-slate-600">
          Enter your PIN code to instantly see your elected representatives —
          their attendance, wealth, criminal cases, and development work.
        </p>
      </div>

      {/* PIN Code Entry */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
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
            placeholder="Enter 6-digit PIN code"
            className="flex-1 h-14 px-4 text-lg rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-900 placeholder:text-slate-400"
            autoFocus
          />
          <button
            type="submit"
            className="h-14 px-6 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Go
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={handleDetectLocation}
          className="w-full mt-3 h-11 flex items-center justify-center gap-2 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm"
        >
          📍 Detect My Location
        </button>
      </form>

      {/* Sample PIN codes for testing */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400 mb-2">Try a sample PIN code:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["110001", "411001", "226001", "600001", "700001"].map((pin) => (
            <button
              key={pin}
              onClick={() => {
                setPincode(pin);
                router.push(`/area/${pin}`);
              }}
              className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {pin}
            </button>
          ))}
        </div>
      </div>

      {/* What you'll see */}
      <div className="mt-12 max-w-lg grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        {[
          { icon: "🏛️", label: "Attendance" },
          { icon: "💰", label: "Wealth" },
          { icon: "⚖️", label: "Cases" },
          { icon: "🏗️", label: "Fund Spent" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
