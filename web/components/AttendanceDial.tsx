interface AttendanceDialProps {
  percentage: number;
  nationalAverage: number;
}

export default function AttendanceDial({
  percentage,
  nationalAverage,
}: AttendanceDialProps) {
  const radius = 60;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (percentage / 100) * circumference;

  let color = "#10B981"; // green
  let label = "Above Average";
  let bgColor = "bg-emerald-50 text-emerald-700";

  if (percentage < nationalAverage - 15) {
    color = "#F43F5E"; // red
    label = "Poor";
    bgColor = "bg-red-50 text-red-700";
  } else if (percentage < nationalAverage) {
    color = "#F59E0B"; // amber
    label = "Below Average";
    bgColor = "bg-amber-50 text-amber-700";
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-24">
        <svg viewBox="0 0 140 80" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
          {/* National average marker */}
          {(() => {
            const angle = Math.PI - (nationalAverage / 100) * Math.PI;
            const x = 70 + 60 * Math.cos(angle);
            const y = 70 - 60 * Math.sin(angle);
            return (
              <g>
                <circle cx={x} cy={y} r="3" fill="#64748b" />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#64748b"
                >
                  Avg {nationalAverage}%
                </text>
              </g>
            );
          })()}
          {/* Center text */}
          <text
            x="70"
            y="65"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill={color}
          >
            {percentage}%
          </text>
        </svg>
      </div>
      <span
        className={`mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${bgColor}`}
      >
        {label}
      </span>
    </div>
  );
}
