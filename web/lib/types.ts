export interface AssetData {
  year: number;
  assets: number;
  liabilities: number;
}

export interface CriminalCase {
  id: string;
  ipc_sections: string[];
  description: string;
  severity: 'high' | 'medium' | 'low';
  court_details: string;
}

export interface ElectoralHistory {
  year: number;
  party: string;
  won: boolean;
  votes: number;
  vote_share: number;
  margin: number;
  total_votes: number;
}

export interface Candidate {
  id: string;
  name: string;
  age: number;
  party: string;
  constituency_id: string;
  constituency_name: string;
  state: string;
  terms_served: number;
  education: string;
  total_assets: number;
  total_liabilities: number;
  asset_growth_percent: number;
  criminal_cases_count: number;
  criminal_cases: CriminalCase[];
  convicted: boolean;
  chargesheeted: boolean;
  attendance_pct: number;
  questions_asked: number;
  debates_participated: number;
  bills_introduced: number;
  fund_allocated: number;
  fund_utilized: number;
  fund_categories: Record<string, number>;
  electoral_history: ElectoralHistory[];
  summary: string;
  photo_url?: string;
}

export interface CandidatePreview {
  id: string;
  name: string;
  party: string;
  constituency_name: string;
  total_assets: number;
  criminal_cases_count: number;
  attendance_pct: number;
  education: string;
}

export interface Constituency {
  id: string;
  name: string;
  state: string;
  type: string;
  candidates: CandidatePreview[];
  election_date?: string;
  active_election: boolean;
}
