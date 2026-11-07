import { rightsReferences } from "@/lib/rights-references";

export default function RightsCitation({ ids }: { ids: readonly string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-6">
      {ids.map((id) => {
        const reference = rightsReferences[id];
        if (!reference) throw new Error("Unknown rights citation");
        return (
          <a key={id} href={reference.url} target="_blank" rel="noopener noreferrer"
            title={reference.locator + ". Source checked " + reference.checkedAt}
            className="min-h-11 content-center font-semibold text-[#176447] underline decoration-[#aac9b3] underline-offset-4 hover:decoration-[#176447] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#176447]">
            {reference.label} <span aria-hidden="true">↗</span>
          </a>
        );
      })}
    </div>
  );
}
