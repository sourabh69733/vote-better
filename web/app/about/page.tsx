import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
        About Vote Better
      </h1>

      {/* Mission */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">🎯 Mission</h2>
        <p className="text-slate-700 leading-relaxed">
          Make every Indian voter understand their candidates in 30 seconds.
          We take publicly available government data and present it so simply
          that anyone — a college student, a shopkeeper, a first-time voter —
          can make an informed choice.
        </p>
      </section>

      {/* What this is NOT */}
      <section className="bg-red-50 rounded-2xl border border-red-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-red-900 mb-3">
          ❌ What This Is NOT
        </h2>
        <ul className="space-y-2 text-sm text-red-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>
              <strong>NOT a recommendation engine.</strong> We never say
              &quot;vote for X.&quot; You decide.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>
              <strong>NOT an opinion platform.</strong> We never say a candidate
              is &quot;good&quot; or &quot;bad&quot; or &quot;corrupt.&quot;
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>
              <strong>NOT affiliated with any political party</strong>,
              government body, or NGO.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">•</span>
            <span>
              <strong>Every data point links to its official source.</strong> If
              we can&apos;t cite it, we don&apos;t show it.
            </span>
          </li>
        </ul>
      </section>

      {/* Data Sources */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          📊 Data Sources
        </h2>
        <div className="space-y-4">
          <DataSource
            name="MyNeta / ADR"
            url="https://myneta.info"
            description="Candidate assets, criminal records, education, and liabilities from self-sworn affidavits (ECI Form 26)."
            data="Assets, liabilities, criminal cases, education"
          />
          <DataSource
            name="PRS Legislative Research"
            url="https://prsindia.org"
            description="Independent think tank tracking MP/MLA performance in Parliament and State Assemblies."
            data="Attendance, questions asked, debates, bills"
          />
          <DataSource
            name="TCPD / Lok Dhaba (Ashoka University)"
            url="https://lokdhaba.ashoka.edu.in"
            description="Comprehensive historical election dataset maintained by the Trivedi Centre for Political Data."
            data="Election results, vote share, turnout, NOTA"
          />
          <DataSource
            name="MPLADS Portal"
            url="https://mplads.gov.in"
            description="Official portal tracking how MPs spend their Local Area Development Fund."
            data="Fund allocation, utilization, work categories"
          />
          <DataSource
            name="DataMeet"
            url="https://github.com/datameet/maps"
            description="Open community maintaining India's constituency boundary maps."
            data="GeoJSON/Shapefiles for constituency mapping"
          />
          <DataSource
            name="Election Commission of India"
            url="https://eci.gov.in"
            description="Official election results and voter data."
            data="Election results, voter turnout"
          />
        </div>
      </section>

      {/* Methodology */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          📐 Methodology
        </h2>

        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900">
              Traffic Light Colors
            </h3>
            <p>
              🟢 Green / 🟡 Yellow / 🔴 Red indicators are based on
              objective thresholds, not editorial judgment:
            </p>
            <ul className="mt-1 ml-4 space-y-1 text-xs text-slate-600">
              <li>
                • <strong>Attendance</strong>: 🟢 ≥ national average, 🟡 within
                15% below, 🔴 more than 15% below
              </li>
              <li>
                • <strong>Criminal Cases</strong>: 🟢 zero cases, 🟡 1-2
                cases, 🔴 3+ cases
              </li>
              <li>
                • <strong>Fund Utilization</strong>: 🟢 ≥75%, 🟡 40-75%, 🔴
                &lt;40%
              </li>
              <li>
                • <strong>Wealth Growth</strong>: 🟢 ≤2× inflation, 🟡 2-5×
                inflation, 🔴 &gt;5× inflation
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Criminal Case Translations
            </h3>
            <p>
              IPC section numbers are translated to plain language (e.g.,
              &quot;IPC 420&quot; → &quot;Cheating / Fraud&quot;). We also categorize cases as:
            </p>
            <ul className="mt-1 ml-4 space-y-1 text-xs text-slate-600">
              <li>
                • 🔴 <strong>Serious</strong>: Murder, assault, fraud, forgery,
                sexual offenses
              </li>
              <li>
                • 🟡 <strong>Political/Minor</strong>: Protest-related, unlawful
                assembly, disobeying orders
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Head-to-Head Trophies
            </h3>
            <p>
              The 🏆 trophy shows who has the objectively better number in
              each category. For most metrics, higher is better. For criminal
              cases and wealth growth, lower is better. Trophies are NOT
              endorsements.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">Priority Matcher</h3>
            <p>
              The quiz does not recommend candidates. It asks what YOU care
              about, then sorts candidates by those metrics. Weights are
              transparent and applied equally to all candidates.
            </p>
          </div>
        </div>
      </section>

      {/* Legal */}
      <section className="bg-slate-100 rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">
          ⚖️ Legal Disclaimer
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          All data on this platform is sourced from official government records,
          publicly filed affidavits, and established research institutions. This
          platform does not make editorial judgments about any candidate. A
          &quot;pending criminal case&quot; does not mean the person is guilty — Indian
          courts follow the principle of &quot;innocent until proven guilty.&quot;
          Declared assets are self-reported by candidates in their election
          affidavits and may not reflect actual holdings. We encourage voters to
          verify information using the source links provided on each profile.
        </p>
      </section>

      {/* Open Source */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">
          🔓 Open Source
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          Vote Better is 100% open source. Anyone can audit the code, data
          processing scripts, and methodology. We believe transparency in civic
          tech is non-negotiable.
        </p>
        <a
          href="https://github.com/vote-better"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          ⭐ View on GitHub
        </a>
      </section>

      {/* Back */}
      <div className="text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function DataSource({
  name,
  url,
  description,
  data,
}: {
  name: string;
  url: string;
  description: string;
  data: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-600 hover:underline"
        >
          {name}
        </a>
      </div>
      <p className="text-sm text-slate-600 mt-0.5">{description}</p>
      <p className="text-xs text-slate-400 mt-0.5">
        <strong>We use:</strong> {data}
      </p>
    </div>
  );
}
