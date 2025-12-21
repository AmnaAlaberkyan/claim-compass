// Bounding box with normalized coordinates (0-1)
export interface BoundingBox {
  x: number; // top-left x (0-1)
  y: number; // top-left y (0-1)
  w: number; // width (0-1)
  h: number; // height (0-1)
}

export type DamageLabel = 
  | 'scratch' 
  | 'dent' 
  | 'crack' 
  | 'broken' 
  | 'paint_transfer' 
  | 'misalignment' 
  | 'unknown';

export type DamagePart = 
  | 'front bumper'
  | 'rear bumper'
  | 'left fender'
  | 'right fender'
  | 'hood'
  | 'trunk'
  | 'left door'
  | 'right door'
  | 'quarter panel'
  | 'headlight'
  | 'taillight'
  | 'windshield'
  | 'side mirror'
  | 'roof'
  | 'unknown';

export type SeverityLevel = 'minor' | 'moderate' | 'severe';

export interface Detection {
  id: string;
  label: DamageLabel;
  part: DamagePart | string;
  severity: SeverityLevel;
  confidence: number; // 0-1
  box: BoundingBox;
}

export interface Annotations {
  detections: Detection[];
  notes?: string;
}

// Helper to generate deterministic detections for simulation
export function generateSimulatedDetections(seed: string, description: string): Annotations {
  // Simple hash function for determinism
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const labels: DamageLabel[] = ['scratch', 'dent', 'crack', 'broken', 'paint_transfer', 'misalignment'];
  const parts: DamagePart[] = ['front bumper', 'left fender', 'hood', 'left door', 'quarter panel', 'headlight'];
  const severities: SeverityLevel[] = ['minor', 'moderate', 'severe'];
  
  // Generate 2-4 detections based on hash
  const numDetections = 2 + (Math.abs(hash) % 3);
  const detections: Detection[] = [];
  
  for (let i = 0; i < numDetections; i++) {
    const subHash = hash + i * 12345;
    
    // Spread boxes across the image
    const baseX = 0.1 + ((Math.abs(subHash) % 60) / 100);
    const baseY = 0.1 + ((Math.abs(subHash * 7) % 60) / 100);
    
    detections.push({
      id: `det_${i + 1}`,
      label: labels[Math.abs(subHash) % labels.length],
      part: parts[Math.abs(subHash * 3) % parts.length],
      severity: severities[Math.abs(subHash * 5) % severities.length],
      confidence: 0.7 + ((Math.abs(subHash) % 30) / 100),
      box: {
        x: Math.min(baseX, 0.7),
        y: Math.min(baseY, 0.7),
        w: 0.15 + ((Math.abs(subHash * 11) % 15) / 100),
        h: 0.12 + ((Math.abs(subHash * 13) % 12) / 100),
      }
    });
  }
  
  return {
    detections,
    notes: `Simulated detections based on claim data`
  };
}
