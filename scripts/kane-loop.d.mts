export interface KaneFailure {
  stepIndex: number | null;
  heading: string;
  assertion: string;
  passed: false;
  reason: string;
  observed: Record<string, string>;
}

export interface KaneParse {
  ok: boolean;
  source: string;
  overallStatus: string;
  bugTitle: string | null;
  bugOneLiner: string | null;
  failures: KaneFailure[];
}

export function parseKaneNdjson(text: string, source?: string): KaneParse;
