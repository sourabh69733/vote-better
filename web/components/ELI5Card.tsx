"use client";

import { useState } from "react";

interface ELI5CardProps {
  title: string;
  children: React.ReactNode;
}

export default function ELI5Card({ title, children }: ELI5CardProps) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left mt-2"
    >
      <div className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
        <span>{open ? "▾" : "ℹ️"}</span>
        <span className="underline underline-offset-2">{title}</span>
      </div>
      {open && (
        <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-slate-700 leading-relaxed">
          {children}
        </div>
      )}
    </button>
  );
}
