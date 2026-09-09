export function translateIPC(section: string) {
  // Simple mock mapping for MVP
  const map: Record<string, { desc: string, severity: 'high'|'medium'|'low', emoji: string }> = {
    '420': { desc: 'Cheating and dishonesty', severity: 'high', emoji: '🔴' },
    '302': { desc: 'Murder', severity: 'high', emoji: '🔴' },
    '307': { desc: 'Attempt to murder', severity: 'high', emoji: '🔴' },
    '188': { desc: 'Disobedience to order', severity: 'low', emoji: '🟡' },
    '153A': { desc: 'Promoting enmity', severity: 'medium', emoji: '🟠' },
  };
  return map[section] || { desc: `Offense under Section ${section}`, severity: 'medium', emoji: '🟠' };
}

export function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'good': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function formatCurrency(amount: number) {
  if (!amount) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function getAttendanceLabel(pct: number, avg: number) {
  if (pct >= avg + 10) return { label: 'Excellent', color: 'good' };
  if (pct >= avg) return { label: 'Above Average', color: 'good' };
  if (pct >= avg - 10) return { label: 'Below Average', color: 'medium' };
  return { label: 'Poor', color: 'high' };
}

export function getWealthGrowthLabel(growth: number, inflation: number) {
  if (growth > inflation + 100) return { label: 'Extremely High', color: 'high' };
  if (growth > inflation + 50) return { label: 'High', color: 'medium' };
  if (growth >= 0) return { label: 'Normal', color: 'good' };
  return { label: 'Decreased', color: 'good' };
}
