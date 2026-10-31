import RightsCitation from "./RightsCitation";

const points = [
  { title: "At arrest", text: "Grounds, officer identification, arrest memorandum and nominated-person notification.", references: ["bnss-36", "bnss-47"] },
  { title: "Soon after arrest", text: "Medical examination, injury record and a copy for the person or nominee.", references: ["bnss-53"] },
  { title: "Ordinary 24-hour limit", text: "Production before a magistrate, excluding necessary journey time. Further custody needs judicial authority.", references: ["constitution-22", "bnss-58"] },
  { title: "Court and bail", text: "The applicable law and court orders determine further custody or release. Release is not automatic at 24 hours.", references: ["bnss-58", "bnss-478", "bnss-480"] },
];

export default function RightsCustodyTimeline() {
  return <section aria-labelledby="custody-heading" className="rounded-[28px] border border-[#d7e3d8] bg-white p-5 sm:p-8">
    <h2 id="custody-heading" className="text-2xl font-semibold tracking-[-0.04em] text-[#193b2f]">How the ordinary custody timeline works</h2>
    <p className="mt-3 max-w-3xl text-base leading-7 text-[#52685a]">Timing and court oversight are different from a guarantee of release.</p>
    <ol className="mt-6 grid gap-5 lg:grid-cols-4">
      {points.map((point, index) => <li key={point.title} className="border-l-2 border-[#b7d3be] pl-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#eaf4eb] text-sm font-bold text-[#206444]">{index + 1}</span>
        <h3 className="mt-3 text-lg font-bold leading-6 text-[#284d39]">{point.title}</h3>
        <p className="mt-2 text-base leading-7 text-[#516658]">{point.text}</p>
        <RightsCitation ids={point.references} />
      </li>)}
    </ol>
    <div className="mt-6 rounded-xl border border-[#e0d2b4] bg-[#faf6ea] p-4">
      <p className="text-base leading-7 text-[#66532b]"><strong>Different custody routes:</strong> Article 22(3) excludes enemy aliens and detention under a preventive-detention law from clauses (1)-(2). BNSS section 170 preventive arrest has its own 24-hour limit, subject to further detention authorised by another legal provision.</p>
      <RightsCitation ids={["constitution-22", "bnss-170"]} />
    </div>
  </section>;
}
