import type { RightsTopic } from "@/lib/protest-guide";
import RightsCitation from "./RightsCitation";

export default function RightsReading({ topics, expanded = false }: { topics: RightsTopic[]; expanded?: boolean }) {
  return <div className="divide-y divide-[#dce5dd]">
    {topics.map((topic, index) => (
      <details key={topic.id} id={topic.id} open={expanded}
        className="group scroll-mt-28 py-2">
        <summary className="flex min-h-24 cursor-pointer list-none items-start gap-4 rounded-xl py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176447] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="pt-1 text-xs font-bold tabular-nums text-[#668171]">{String(index + 1).padStart(2, "0")}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-semibold leading-7 tracking-[-0.025em] text-[#193b2f]">{topic.title}</span>
            <span className="mt-2 block text-base leading-7 text-[#516558]">{topic.summary}</span>
          </span>
          <span aria-hidden="true" className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#cadbcc] text-[#176447] group-open:rotate-45 motion-safe:transition-transform">+</span>
        </summary>
        <div className="space-y-6 pb-7 pl-0 sm:pl-8">
          {topic.paragraphs.map((paragraph, i) => <div key={i} className="max-w-[76ch]">
            <p className="text-base leading-8 text-[#304b3c]">{paragraph.text}</p>
            <RightsCitation ids={paragraph.references} />
          </div>)}
        </div>
      </details>
    ))}
  </div>;
}
