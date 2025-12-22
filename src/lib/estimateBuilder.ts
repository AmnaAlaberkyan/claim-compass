// Canonical estimate builder - single source of truth for estimate calculations
// This ensures consistent numbers across all views (results page, estimate card, line items)

import { Estimate, EstimateLineItem, Citation } from '@/types/estimates';
import { DamagedPart } from '@/types/claims';

// Standard labor rate used across all estimates
export const STANDARD_LABOR_RATE = 94; // $/hr

// Canonical demo data for windshield example
export const WINDSHIELD_DEMO: EstimateLineItem = {
  part: 'Windshield',
  damageType: 'shattered',
  laborHours: 4,
  laborRate: STANDARD_LABOR_RATE,
  laborCost: 4 * STANDARD_LABOR_RATE, // $376
  partCostLow: 300,
  partCostHigh: 800,
  totalLow: 300 + (4 * STANDARD_LABOR_RATE), // $676
  totalHigh: 800 + (4 * STANDARD_LABOR_RATE), // $1,176
  sources: [
    {
      source: 'OEM Parts Catalog 2025',
      url: 'https://parts.example.com/windshield-oem',
      retrievedAt: new Date().toISOString(),
    },
    {
      source: 'AutoGlass Direct',
      url: 'https://autoglass.example.com/pricing',
      retrievedAt: new Date().toISOString(),
    },
  ],
};

// Labor hour estimates by damage type
const LABOR_HOURS_BY_DAMAGE: Record<string, number> = {
  shattered: 4,
  cracked: 2,
  chipped: 1,
  dented: 3,
  scratched: 1.5,
  bent: 4,
  broken: 3,
  default: 2,
};

// Part cost ranges (realistic estimates)
const PART_COST_RANGES: Record<string, { low: number; high: number }> = {
  windshield: { low: 300, high: 800 },
  bumper: { low: 400, high: 1200 },
  'front bumper': { low: 400, high: 1200 },
  'rear bumper': { low: 350, high: 1100 },
  hood: { low: 500, high: 1500 },
  fender: { low: 200, high: 600 },
  'front fender': { low: 200, high: 600 },
  'rear fender': { low: 250, high: 700 },
  door: { low: 400, high: 1200 },
  'front door': { low: 400, high: 1200 },
  'rear door': { low: 350, high: 1000 },
  mirror: { low: 100, high: 400 },
  'side mirror': { low: 100, high: 400 },
  headlight: { low: 150, high: 600 },
  taillight: { low: 100, high: 400 },
  grille: { low: 150, high: 500 },
  trunk: { low: 400, high: 1000 },
  roof: { low: 800, high: 2500 },
  quarter_panel: { low: 500, high: 1500 },
  default: { low: 200, high: 600 },
};

function getPartCostRange(partName: string): { low: number; high: number } {
  const normalized = partName.toLowerCase().replace(/[_-]/g, ' ');
  return PART_COST_RANGES[normalized] || PART_COST_RANGES.default;
}

function getLaborHours(damageType: string): number {
  const normalized = damageType.toLowerCase();
  return LABOR_HOURS_BY_DAMAGE[normalized] || LABOR_HOURS_BY_DAMAGE.default;
}

function generateSources(partName: string): Citation[] {
  const now = new Date().toISOString();
  return [
    {
      source: 'OEM Parts Catalog 2025',
      url: `https://parts.example.com/${partName.toLowerCase().replace(/\s+/g, '-')}`,
      retrievedAt: now,
    },
    {
      source: 'Aftermarket Pricing Index',
      url: 'https://aftermarket.example.com/pricing',
      retrievedAt: now,
    },
  ];
}

export function buildLineItem(
  part: DamagedPart,
  laborRate: number = STANDARD_LABOR_RATE
): EstimateLineItem {
  const costRange = getPartCostRange(part.part);
  const laborHours = getLaborHours(part.damage_type);
  const laborCost = laborHours * laborRate;

  return {
    part: part.part,
    damageType: part.damage_type,
    laborHours,
    laborRate,
    laborCost,
    partCostLow: costRange.low,
    partCostHigh: costRange.high,
    totalLow: costRange.low + laborCost,
    totalHigh: costRange.high + laborCost,
    sources: generateSources(part.part),
  };
}

export function buildEstimate(
  parts: DamagedPart[],
  laborRate: number = STANDARD_LABOR_RATE
): Estimate {
  const lineItems = parts.map(p => buildLineItem(p, laborRate));

  const laborTotal = lineItems.reduce((sum, item) => sum + item.laborCost, 0);
  const partsLow = lineItems.reduce((sum, item) => sum + item.partCostLow, 0);
  const partsHigh = lineItems.reduce((sum, item) => sum + item.partCostHigh, 0);

  return {
    lineItems,
    subtotalLow: partsLow + laborTotal,
    subtotalHigh: partsHigh + laborTotal,
    laborTotal,
    partsLow,
    partsHigh,
    grandTotalLow: partsLow + laborTotal,
    grandTotalHigh: partsHigh + laborTotal,
    generatedAt: new Date().toISOString(),
  };
}

// Format currency consistently
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format currency range
export function formatCurrencyRange(low: number, high: number): string {
  return `${formatCurrency(low)} – ${formatCurrency(high)}`;
}
