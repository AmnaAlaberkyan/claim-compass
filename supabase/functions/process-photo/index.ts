import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

A photo must score at least 70 to be acceptable. Be strict - bad photos lead to inaccurate damage assessments.`
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim_id, image_base64, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing claim ${claim_id}, action: ${action || 'analyze'}`);

    // Step 1: Quality Assessment
    console.log("Step 1: Quality Assessment");
    const qualityResult = await runQualityAgent(image_base64, LOVABLE_API_KEY);
    console.log("Quality result:", JSON.stringify(qualityResult));

    if (!qualityResult.acceptable) {
      console.log("Photo quality failed, requesting retake");
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
    const damageResult = await runDamageAgent(image_base64, LOVABLE_API_KEY);
    console.log("Damage result:", JSON.stringify(damageResult));

    // Step 3: Triage logic
    console.log("Step 3: Triage");
    let finalAction = damageResult.recommended_action;
    
    // Override logic per PRD
    if (damageResult.overall_confidence < 70) {
      finalAction = "escalate";
      console.log("Escalating: confidence < 70%");
    }
    if (damageResult.overall_severity > 7) {
      finalAction = "escalate";
      console.log("Escalating: severity > 7");
    }
    if (damageResult.fraud_indicators && damageResult.fraud_indicators.length > 0) {
      finalAction = "escalate";
      console.log("Escalating: fraud indicators found");
    }

    return new Response(JSON.stringify({
      success: true,
      stage: "complete",
      quality_result: qualityResult,
      damage_result: damageResult,
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
