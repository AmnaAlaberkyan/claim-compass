export interface Citation {
  source: string;
  url: string;
  retrievedAt: string;
}

export interface EstimateLineItem {
  part: string;
  damageType: string;
  laborHours: number;
  laborRate: number;
  laborCost: number;
  partCostLow: number;
  partCostHigh: number;
  totalLow: number;
  totalHigh: number;
  sources: Citation[];
}

export interface Estimate {
  lineItems: EstimateLineItem[];
  subtotalLow: number;
  subtotalHigh: number;
  laborTotal: number;
  partsLow: number;
  partsHigh: number;
  grandTotalLow: number;
  grandTotalHigh: number;
  generatedAt: string;
}

export interface EstimateRecord {
  id: string;
  claim_id: string;
  payload: Estimate;
  created_at: string;
}
