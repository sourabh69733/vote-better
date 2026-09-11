interface CriminalCasePillProps {
  ipcSection: string;
  description: string;
  severity: string;
  court?: string;
  status?: string;
}

const IPC_PLAIN_LANGUAGE: Record<
  string,
  { plain: string; severity: "serious" | "moderate" | "political" }
> = {
  "302": { plain: "Murder", severity: "serious" },
  "307": { plain: "Attempt to murder", severity: "serious" },
  "376": { plain: "Rape / Sexual assault", severity: "serious" },
  "420": { plain: "Cheating / Fraud", severity: "serious" },
  "467": { plain: "Forgery of valuable document", severity: "serious" },
  "468": { plain: "Forgery for cheating", severity: "serious" },
  "120B": { plain: "Criminal conspiracy", severity: "serious" },
  "354": { plain: "Assault on woman", severity: "serious" },
  "506": { plain: "Criminal intimidation", severity: "moderate" },
  "153A": { plain: "Promoting enmity between groups", severity: "moderate" },
  "505": { plain: "Public mischief / Rumor spreading", severity: "moderate" },
  "143": { plain: "Unlawful assembly (often political rally)", severity: "political" },
  "147": { plain: "Rioting (often political rally)", severity: "political" },
  "188": { plain: "Disobeying public order (often protest)", severity: "political" },
  "171E": { plain: "Election bribery", severity: "serious" },
};

const SEVERITY_STYLES = {
  serious: "bg-red-100 text-red-800 border-red-200",
  moderate: "bg-orange-100 text-orange-800 border-orange-200",
  political: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const SEVERITY_EMOJI = {
  serious: "🔴",
  moderate: "🟠",
  political: "🟡",
};

export default function CriminalCasePill({
  ipcSection,
  description,
  severity,
  court,
  status,
}: CriminalCasePillProps) {
  const ipcInfo = IPC_PLAIN_LANGUAGE[ipcSection];
  const displaySeverity = ipcInfo?.severity ?? (severity === "serious" ? "serious" : "moderate");
  const plainText = ipcInfo?.plain ?? description;

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${SEVERITY_STYLES[displaySeverity]}`}
    >
      <div className="flex items-center gap-2">
        <span>{SEVERITY_EMOJI[displaySeverity]}</span>
        <span className="font-semibold text-sm">{plainText}</span>
        <span className="text-xs opacity-60">(IPC {ipcSection})</span>
      </div>
      {(court || status) && (
        <div className="mt-1 text-xs opacity-70 ml-6">
          {court && <span>{court}</span>}
          {court && status && <span> · </span>}
          {status && <span className="font-medium">{status}</span>}
        </div>
      )}
    </div>
  );
}
