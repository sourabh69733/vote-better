"use client";

import { useState } from "react";

type Level = "union" | "state" | "local";

const levels: { id: Level; name: string; body: string; person: string; list: string }[] = [
  { id: "union", name: "Union", body: "Parliament", person: "Your MP", list: "Union List" },
  { id: "state", name: "State", body: "State assembly", person: "Your MLA", list: "State List" },
  { id: "local", name: "Local", body: "Panchayat or municipality", person: "Your sarpanch or ward councillor", list: "Eleventh and Twelfth Schedules" },
];

const issues: { label: string; levels: Level[]; note: string }[] = [
  { label: "Railways", levels: ["union"], note: "Railways are on the Union List. Parliament and the Union government decide." },
  { label: "Passport", levels: ["union"], note: "Passports and visas are on the Union List." },
  { label: "Army and defence", levels: ["union"], note: "Defence of India is on the Union List." },
  { label: "Income tax", levels: ["union"], note: "Taxes on income other than agricultural income are on the Union List." },
  { label: "Police", levels: ["state"], note: "Police and public order are on the State List." },
  { label: "Hospitals", levels: ["state"], note: "Public health, sanitation and hospitals are on the State List." },
  { label: "Farming", levels: ["state"], note: "Agriculture is on the State List." },
  { label: "Schools", levels: ["union", "state"], note: "Education is on the Concurrent List, so both can make laws. Most schools are run by states." },
  { label: "Electricity", levels: ["union", "state"], note: "Electricity is on the Concurrent List. Distribution is usually handled by state companies." },
  { label: "Street lights", levels: ["local"], note: "States can hand public amenities like street lighting to municipalities." },
  { label: "Drains and garbage", levels: ["local"], note: "Sanitation and solid waste management can be handed to local bodies." },
  { label: "Drinking water", levels: ["local", "state"], note: "Drinking water is listed for panchayats and municipalities. States often run large water schemes." },
];

export default function WhoDoesWhat() {
  const [selected, setSelected] = useState(0);
  const issue = issues[selected];

  return (
    <div className="rounded-[24px] border border-[#dce6dc] bg-white p-5 sm:p-8">
      <p className="text-sm font-bold text-[#19372d]">Pick an everyday issue</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Everyday issues">
        {issues.map((item, i) => (
          <button key={item.label} type="button" onClick={() => setSelected(i)} aria-pressed={i === selected} className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${i === selected ? "border-[#1c6047] bg-[#1c6047] text-white" : "border-[#d5e3d7] bg-[#f6faf5] text-[#2c6249] hover:bg-[#e8f2e9]"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {levels.map((level) => {
          const active = issue.levels.includes(level.id);
          return (
            <div key={level.id} className={`rounded-2xl border-2 p-5 transition-[transform,opacity,border-color,background-color] duration-300 motion-reduce:transition-none ${active ? "-translate-y-1 border-[#43896a] bg-[#eff7ef] opacity-100" : "border-[#e6ede6] bg-white opacity-50"}`}>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#4c8063]">{level.name}</p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#18372b]">{level.body}</p>
              <p className="mt-1 text-sm text-[#5f7465]">{level.list}</p>
              <p className={`mt-4 text-sm font-bold ${active ? "text-[#1c6047]" : "text-[#8a9b8e]"}`}>{active ? "✓ " : ""}{level.person}</p>
            </div>
          );
        })}
      </div>

      <p key={selected} className="mt-5 rounded-2xl bg-[#f6faf5] p-4 text-[15px] leading-7 text-[#43594a] animate-[fadeUp_.35s_ease-out] motion-reduce:animate-none" aria-live="polite">
        <strong className="text-[#19372d]">{issue.label}:</strong> {issue.note}
      </p>
      <p className="mt-3 text-xs leading-5 text-[#7a8c7e]">Article 246 and the Seventh Schedule split subjects between Union and State. Articles 243G and 243W let states hand local subjects to panchayats and municipalities, so the exact split varies by state.</p>
    </div>
  );
}
