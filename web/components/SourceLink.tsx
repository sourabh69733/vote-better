interface SourceLinkProps {
  label?: string;
  url: string;
}

export default function SourceLink({
  label = "View Official Source",
  url,
}: SourceLinkProps) {
  if (!url || url === "https://myneta.info/...") return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors mt-2"
    >
      📄 {label} →
    </a>
  );
}
