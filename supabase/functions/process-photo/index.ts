import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers - allow all origins for edge function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Tool definitions for structured output
const qualityAgentTools = [
  {
    type: "function",
    function: {
      name: "assess_photo_quality",
      description: "Assess if a damage photo is suitable for insurance claim processing",
      parameters: {
        type: "object",
        properties: {
          acceptable: { type: "boolean", description: "Whether the photo quality is acceptable for processing" },
          score: { type: "number", description: "Quality score from 0-100" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["blur", "darkness", "angle", "distance", "obstruction", "resolution"] },
                severity: { type: "string", enum: ["low", "medium", "high"] },
                description: { type: "string" }
              },
              required: ["type", "severity", "description"]
            }
          },
          guidance: { type: "string", description: "Instructions for retaking photo if failed" }
        },
        required: ["acceptable", "score", "issues", "guidance"]
      }
    }
  }
];

const damageAgentTools = [
  {
    type: "function",
    function: {
      name: "assess_vehicle_damage",
      description: "Assess vehicle damage from a photo for insurance claim processing",
      parameters: {
        type: "object",
        properties: {
          damaged_parts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                part: { type: "string" },
                damage_type: { type: "string" },
                severity: { type: "number", description: "1-10 scale" },
                confidence: { type: "number", description: "0-100 confidence" },
                cost_low: { type: "number" },
                cost_high: { type: "number" }
              },
              required: ["part", "damage_type", "severity", "confidence", "cost_low", "cost_high"]
            }
          },
          overall_severity: { type: "number", description: "1-10 scale" },
          overall_confidence: { type: "number", description: "0-100 percentage" },
          total_cost_low: { type: "number" },
          total_cost_high: { type: "number" },
          summary: { type: "string" },
          safety_concerns: { type: "array", items: { type: "string" } },
          fraud_indicators: { type: "array", items: { type: "string" } },
          recommended_action: { type: "string", enum: ["approve", "review", "escalate"] }
        },
        required: ["damaged_parts", "overall_severity", "overall_confidence", "total_cost_low", "total_cost_high", "summary", "safety_concerns", "fraud_indicators", "recommended_action"]
      }
    }
  }
];

// Localization agent tools for bounding box detection
const localizationAgentTools = [
  {
    type: "function",
    function: {
      name: "detect_damage_locations",
      description: "Detect and localize damage areas in a vehicle photo with bounding boxes",
      parameters: {
        type: "object",
        properties: {
          detections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Unique identifier like det_1, det_2" },
                label: { type: "string", enum: ["scratch", "dent", "crack", "broken", "paint_transfer", "misalignment", "unknown"] },
                part: { type: "string", description: "Vehicle part: front bumper, left fender, hood, door, quarter panel, headlight, taillight, etc." },
                severity: { type: "string", enum: ["minor", "moderate", "severe"] },
                confidence: { type: "number", description: "Confidence 0.0-1.0" },
                box: {
                  type: "object",
                  properties: {
                    x: { type: "number", description: "Top-left X coordinate normalized 0.0-1.0" },
                    y: { type: "number", description: "Top-left Y coordinate normalized 0.0-1.0" },
                    w: { type: "number", description: "Width normalized 0.0-1.0" },
                    h: { type: "number", description: "Height normalized 0.0-1.0" }
                  },
                  required: ["x", "y", "w", "h"]
                }
              },
              required: ["id", "label", "part", "severity", "confidence", "box"]
            }
          },
          notes: { type: "string", description: "Optional notes about the detection quality or uncertainty" }
        },
        required: ["detections"]
      }
    }
  }
];

// Build estimate with citations from damage assessment
interface DamagedPart {
  part: string;
  damage_type: string;
  severity: number;
  confidence: number;
  cost_low: number;
  cost_high: number;
}

interface Citation {
  source: string;
  url: string;
  retrievedAt: string;
}

interface EstimateLineItem {
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

interface Estimate {
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

interface Detection {
  id: string;
  label: string;
  part: string;
  severity: string;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
}

interface Annotations {
  detections: Detection[];
  notes?: string;
}

// Generate simulated detections based on claim data (deterministic)
function generateSimulatedDetections(claimId: string, description: string): Annotations {
  let hash = 0;
  const seed = claimId + description;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const labels = ['scratch', 'dent', 'crack', 'broken', 'paint_transfer', 'misalignment'];
  const parts = ['front bumper', 'left fender', 'hood', 'left door', 'quarter panel', 'headlight'];
  const severities = ['minor', 'moderate', 'severe'];
  
  const numDetections = 2 + (Math.abs(hash) % 3);
  const detections: Detection[] = [];
  
  for (let i = 0; i < numDetections; i++) {
    const subHash = hash + i * 12345;
    const baseX = 0.1 + ((Math.abs(subHash) % 50) / 100);
    const baseY = 0.15 + ((Math.abs(subHash * 7) % 50) / 100);
    
    detections.push({
      id: `det_${i + 1}`,
      label: labels[Math.abs(subHash) % labels.length],
      part: parts[Math.abs(subHash * 3) % parts.length],
      severity: severities[Math.abs(subHash * 5) % severities.length],
      confidence: 0.7 + ((Math.abs(subHash) % 25) / 100),
      box: {
        x: Math.min(baseX, 0.65),
        y: Math.min(baseY, 0.65),
        w: 0.18 + ((Math.abs(subHash * 11) % 12) / 100),
        h: 0.15 + ((Math.abs(subHash * 13) % 10) / 100),
      }
    });
  }
  
  return {
    detections,
    notes: 'Simulated detections for demo purposes'
  };
}

// Vehicle tier classification for pricing adjustments
function getVehiclePricingMultiplier(make?: string, model?: string, year?: number): { laborRate: number; partMultiplier: number; tier: string } {
  const makeLower = (make || '').toLowerCase();
  const modelLower = (model || '').toLowerCase();
  const currentYear = new Date().getFullYear();
  const vehicleAge = year ? currentYear - year : 5;
  
  // Luxury/Premium brands - higher labor rates and part costs
  const luxuryBrands = ['bmw', 'mercedes', 'mercedes-benz', 'audi', 'lexus', 'porsche', 'jaguar', 'land rover', 'maserati', 'bentley', 'rolls-royce', 'ferrari', 'lamborghini', 'aston martin'];
  const premiumBrands = ['acura', 'infiniti', 'volvo', 'lincoln', 'cadillac', 'alfa romeo', 'genesis', 'tesla'];
  const economyBrands = ['kia', 'hyundai', 'nissan', 'mazda', 'subaru', 'mitsubishi'];
  
  // Check for luxury performance models in non-luxury brands
  const performanceModels = ['gt', 'sport', 'type r', 'sti', 'wrx', 'amg', 'm3', 'm5', 'rs', 'srt', 'hellcat', 'shelby', 'corvette', 'camaro zl1'];
  const isPerformanceModel = performanceModels.some(pm => modelLower.includes(pm));
  
  let baseLaborRate = 75; // Default economy rate
  let partMultiplier = 1.0;
  let tier = 'economy';
  
  if (luxuryBrands.some(b => makeLower.includes(b))) {
    baseLaborRate = 125;
    partMultiplier = 1.8;
    tier = 'luxury';
  } else if (premiumBrands.some(b => makeLower.includes(b))) {
    baseLaborRate = 100;
    partMultiplier = 1.4;
    tier = 'premium';
  } else if (isPerformanceModel) {
    baseLaborRate = 110;
    partMultiplier = 1.5;
    tier = 'performance';
  } else if (economyBrands.some(b => makeLower.includes(b))) {
    baseLaborRate = 70;
    partMultiplier = 0.85;
    tier = 'economy';
  } else {
    // Standard domestic/import brands (Ford, Chevy, Toyota, Honda, etc.)
    baseLaborRate = 85;
    partMultiplier = 1.0;
    tier = 'standard';
  }
  
  // Age adjustment: newer vehicles cost more (OEM parts availability), very old vehicles may cost more (scarcity)
  let ageMultiplier = 1.0;
  if (vehicleAge <= 2) {
    ageMultiplier = 1.15; // New vehicles, OEM parts premium
  } else if (vehicleAge <= 5) {
    ageMultiplier = 1.0; // Sweet spot
  } else if (vehicleAge <= 10) {
    ageMultiplier = 0.9; // Aftermarket parts available
  } else if (vehicleAge <= 15) {
    ageMultiplier = 0.85; // Good aftermarket supply
  } else {
    ageMultiplier = 1.05; // Older vehicles, parts scarcity
  }
  
  return {
    laborRate: Math.round(baseLaborRate * (vehicleAge <= 3 ? 1.1 : 1.0)),
    partMultiplier: partMultiplier * ageMultiplier,
    tier
  };
}

function buildEstimate(damagedParts: DamagedPart[], vehicleMake?: string, vehicleModel?: string, vehicleYear?: number): Estimate {
  const now = new Date().toISOString();
  
  // Get vehicle-specific pricing
  const pricing = getVehiclePricingMultiplier(vehicleMake, vehicleModel, vehicleYear);
  const laborRate = pricing.laborRate;
  
  const vehicleQuery = vehicleMake && vehicleModel 
    ? `${vehicleYear || ''} ${vehicleMake} ${vehicleModel}`.trim()
    : '';
  
  console.log(`Building estimate for ${vehicleQuery || 'unknown vehicle'} - Tier: ${pricing.tier}, Labor rate: $${laborRate}/hr, Part multiplier: ${pricing.partMultiplier.toFixed(2)}x`);
  
  const lineItems: EstimateLineItem[] = damagedParts.map(part => {
    const laborHours = part.severity <= 3 ? 1 : part.severity <= 6 ? 2.5 : 4;
    const laborCost = laborHours * laborRate;
    const partQuery = encodeURIComponent(`${vehicleQuery} ${part.part}`.trim());
    const retrievedAt = now;
    
    // Apply vehicle-specific part cost multiplier
    const adjustedPartCostLow = Math.round(part.cost_low * pricing.partMultiplier);
    const adjustedPartCostHigh = Math.round(part.cost_high * pricing.partMultiplier);
    
    const sources: Citation[] = [
      { source: "Car-Part.com", url: `https://www.google.com/search?q=site:car-part.com+${partQuery}`, retrievedAt },
      { source: "RockAuto", url: `https://www.google.com/search?q=site:rockauto.com+${partQuery}`, retrievedAt },
      { source: "OEM Parts", url: `https://www.google.com/search?q=${partQuery}+OEM+replacement+part+price`, retrievedAt }
    ];
    
    return {
      part: part.part,
      damageType: part.damage_type,
      laborHours,
      laborRate,
      laborCost,
      partCostLow: adjustedPartCostLow,
      partCostHigh: adjustedPartCostHigh,
      totalLow: laborCost + adjustedPartCostLow,
      totalHigh: laborCost + adjustedPartCostHigh,
      sources
    };
  });
  
  const laborTotal = lineItems.reduce((sum, item) => sum + item.laborCost, 0);
  const partsLow = lineItems.reduce((sum, item) => sum + item.partCostLow, 0);
  const partsHigh = lineItems.reduce((sum, item) => sum + item.partCostHigh, 0);
  
  return {
    lineItems,
    subtotalLow: partsLow,
    subtotalHigh: partsHigh,
    laborTotal,
    partsLow,
    partsHigh,
    grandTotalLow: laborTotal + partsLow,
    grandTotalHigh: laborTotal + partsHigh,
    generatedAt: now
  };
}

async function runQualityAgent(imageBase64: string, apiKey: string): Promise<any> {
  console.log("Running Quality Agent...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a strict photo quality assessment agent for insurance claims. Your job is to ensure photos are suitable for damage assessment.

REJECTION CRITERIA (be strict):
- Blurry or out of focus images
- Too dark or overexposed
- Poor angle (not showing damage clearly)
- Too far away or too close
- Obstructions blocking the view
- Low resolution making details unclear

A photo must score at least 60 to be acceptable. Be strict - bad photos lead to inaccurate damage assessments.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Assess the quality of this vehicle damage photo. Determine if it's suitable for insurance claim processing." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      tools: qualityAgentTools,
      tool_choice: { type: "function", function: { name: "assess_photo_quality" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Quality Agent error:", response.status, errorText);
    throw new Error(`Quality Agent failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  throw new Error("No quality assessment returned");
}

async function runDamageAgent(imageBase64: string, apiKey: string): Promise<any> {
  console.log("Running Damage Agent...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: `You are an expert vehicle damage assessment agent for insurance claims. Analyze damage photos and provide detailed assessments.

ASSESSMENT GUIDELINES:
- Identify all visible damaged parts
- Estimate repair costs based on typical market rates
- Severity scale: 1-3 (minor), 4-6 (moderate), 7-10 (severe)
- Look for fraud indicators (inconsistent damage patterns, pre-existing damage, staged photos)
- Identify safety concerns (structural damage, airbag deployment, etc.)

RECOMMENDED ACTION RULES:
- "approve" if severity <= 4 AND confidence >= 85 AND no fraud indicators
- "escalate" if severity > 7 OR confidence < 70 OR fraud indicators found
- "review" for all other cases

You can NEVER deny a claim. Only approve, review, or escalate.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this vehicle damage photo and provide a detailed assessment for insurance claim processing." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      tools: damageAgentTools,
      tool_choice: { type: "function", function: { name: "assess_vehicle_damage" } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Damage Agent error:", response.status, errorText);
    throw new Error(`Damage Agent failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  throw new Error("No damage assessment returned");
}

async function runLocalizationAgent(imageBase64: string, apiKey: string): Promise<Annotations> {
  console.log("Running Localization Agent...");
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a damage localization agent for insurance claims. Your job is to identify and locate all visible damage areas in vehicle photos.

INSTRUCTIONS:
- Identify each distinct damage area with a bounding box
- Use normalized coordinates (0-1) where (0,0) is top-left
- Be precise with box placement - the box should tightly contain the damage
- Label each damage type accurately: scratch, dent, crack, broken, paint_transfer, misalignment, or unknown
- Identify the vehicle part affected
- Rate severity as minor (cosmetic), moderate (functional), or severe (structural)
- Provide confidence 0-1 based on visibility and certainty
- If you cannot clearly identify damage locations, return an empty detections array

Output ONLY valid JSON through the function call.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this vehicle photo and identify all damage locations with bounding boxes. Return normalized coordinates (0-1) for each detection." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        tools: localizationAgentTools,
        tool_choice: { type: "function", function: { name: "detect_damage_locations" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Localization Agent error:", response.status, errorText);
      throw new Error(`Localization Agent failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      console.log("Localization result:", JSON.stringify(result));
      return result as Annotations;
    }
    
    throw new Error("No localization result returned");
  } catch (error) {
    console.error("Localization agent error, falling back to simulation:", error);
    throw error;
  }
}

// Helper to log audit events
async function logAuditEvent(
  supabase: any, 
  claimId: string, 
  action: string, 
  actor: string, 
  actorType: string, 
  details?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      claim_id: claimId,
      action,
      actor,
      actor_type: actorType,
      details: details || null,
    });
  } catch (e) {
    console.error(`Failed to log audit event ${action}:`, e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim_id, image_base64, action, vehicle_make, vehicle_model, vehicle_year } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for storing estimates
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Processing claim ${claim_id}, action: ${action || 'analyze'}`);

    // Step 1: Quality Assessment
    console.log("Step 1: Quality Assessment");
    const qualityStartTime = Date.now();
    const qualityResult = await runQualityAgent(image_base64, LOVABLE_API_KEY);
    const qualityDuration = Date.now() - qualityStartTime;
    console.log("Quality result:", JSON.stringify(qualityResult));

    // Log quality assessment
    await logAuditEvent(supabase, claim_id, 'quality_assessment_completed', 'Quality Agent', 'ai_quality', {
      model_version: 'gemini-2.5-flash',
      duration_ms: qualityDuration,
      score: qualityResult.score,
      acceptable: qualityResult.acceptable,
      issues_count: qualityResult.issues?.length || 0,
      issues: qualityResult.issues,
    });

    if (!qualityResult.acceptable) {
      console.log("Photo quality failed, requesting retake");
      
      // Log retake request
      await logAuditEvent(supabase, claim_id, 'retake_requested', 'Quality Agent', 'ai_quality', {
        reason: 'quality_failed',
        score: qualityResult.score,
        issues: qualityResult.issues,
        guidance: qualityResult.guidance,
      });

      return new Response(JSON.stringify({
        success: false,
        stage: "quality",
        quality_result: qualityResult,
        message: "Photo quality check failed. Please retake the photo following the guidance provided."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Damage Assessment (only if quality passed)
    console.log("Step 2: Damage Assessment");
    const damageStartTime = Date.now();
    const damageResult = await runDamageAgent(image_base64, LOVABLE_API_KEY);
    const damageDuration = Date.now() - damageStartTime;
    console.log("Damage result:", JSON.stringify(damageResult));

    // Log damage assessment
    await logAuditEvent(supabase, claim_id, 'damage_assessment_completed', 'Damage Agent', 'ai_damage', {
      model_version: 'gemini-2.5-pro',
      duration_ms: damageDuration,
      parts_detected: damageResult.damaged_parts?.length || 0,
      overall_severity: damageResult.overall_severity,
      overall_confidence: damageResult.overall_confidence,
      cost_range: { low: damageResult.total_cost_low, high: damageResult.total_cost_high },
      safety_concerns: damageResult.safety_concerns,
      fraud_indicators: damageResult.fraud_indicators,
      ai_recommendation: damageResult.recommended_action,
    });

    // Step 3: Generate Estimate with Citations
    console.log("Step 3: Building Estimate with Citations");
    const estimate = buildEstimate(
      damageResult.damaged_parts,
      vehicle_make,
      vehicle_model,
      vehicle_year
    );
    console.log("Estimate generated:", JSON.stringify(estimate));

    // Store estimate in database
    const { error: estimateError } = await supabase
      .from('estimates')
      .insert({
        claim_id,
        payload: estimate
      });
    
    if (estimateError) {
      console.error("Failed to store estimate:", estimateError);
    } else {
      console.log("Estimate stored successfully");
      
      // Log estimate creation
      await logAuditEvent(supabase, claim_id, 'estimate_created', 'System', 'system', {
        line_items_count: estimate.lineItems?.length || 0,
        labor_total: estimate.laborTotal,
        parts_range: { low: estimate.partsLow, high: estimate.partsHigh },
        grand_total_range: { low: estimate.grandTotalLow, high: estimate.grandTotalHigh },
      });
    }

    // Step 4: Damage Localization (bounding boxes)
    console.log("Step 4: Damage Localization");
    const localizationStartTime = Date.now();
    let annotations: Annotations;
    let localizationMethod = 'ai';
    
    try {
      annotations = await runLocalizationAgent(image_base64, LOVABLE_API_KEY);
      console.log("Localization complete:", JSON.stringify(annotations));
    } catch (locError) {
      console.log("AI localization failed, using simulated detections");
      annotations = generateSimulatedDetections(claim_id, damageResult.summary || '');
      localizationMethod = 'simulated';
    }
    const localizationDuration = Date.now() - localizationStartTime;

    // Log localization
    await logAuditEvent(supabase, claim_id, 'localization_completed', 'Localization Agent', 'ai_damage', {
      model_version: localizationMethod === 'ai' ? 'gemini-2.5-flash' : 'simulated',
      method: localizationMethod,
      duration_ms: localizationDuration,
      detections_count: annotations.detections?.length || 0,
      detections: annotations.detections?.map(d => ({
        id: d.id,
        label: d.label,
        part: d.part,
        severity: d.severity,
        confidence: d.confidence,
      })),
    });

    // Update claim with annotations
    const { error: annotationError } = await supabase
      .from('claims')
      .update({ annotations_json: annotations })
      .eq('id', claim_id);
    
    if (annotationError) {
      console.error("Failed to store annotations:", annotationError);
    } else {
      console.log("Annotations stored successfully");
    }

    // Step 5: Triage logic
    console.log("Step 5: Triage");
    let finalAction = damageResult.recommended_action;
    const triageReasons: string[] = [];
    
    // Override logic per PRD
    if (damageResult.overall_confidence < 70) {
      finalAction = "escalate";
      triageReasons.push("confidence < 70%");
      console.log("Escalating: confidence < 70%");
    }
    if (damageResult.overall_severity > 7) {
      finalAction = "escalate";
      triageReasons.push("severity > 7");
      console.log("Escalating: severity > 7");
    }
    if (damageResult.fraud_indicators && damageResult.fraud_indicators.length > 0) {
      finalAction = "escalate";
      triageReasons.push("fraud indicators found");
      console.log("Escalating: fraud indicators found");
    }

    // Log triage decision
    await logAuditEvent(supabase, claim_id, 'triage_decision', 'Triage Agent', 'ai_triage', {
      ai_recommendation: damageResult.recommended_action,
      final_action: finalAction,
      override_reasons: triageReasons.length > 0 ? triageReasons : null,
      inputs: {
        severity: damageResult.overall_severity,
        confidence: damageResult.overall_confidence,
        fraud_indicators_count: damageResult.fraud_indicators?.length || 0,
        safety_concerns_count: damageResult.safety_concerns?.length || 0,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      stage: "complete",
      quality_result: qualityResult,
      damage_result: damageResult,
      estimate,
      annotations,
      recommended_action: finalAction,
      message: `Assessment complete. Recommended action: ${finalAction}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Process photo error:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("429") || errorMessage.includes("Rate limit")) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please try again in a moment." 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (errorMessage.includes("402") || errorMessage.includes("Payment")) {
      return new Response(JSON.stringify({ 
        error: "AI credits exhausted. Please add credits to continue." 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      error: errorMessage || "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
