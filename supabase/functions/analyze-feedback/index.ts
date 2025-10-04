import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbackId, content } = await req.json();

    if (!feedbackId || !content) {
      throw new Error("Missing feedbackId or content");
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    console.log(`Analyzing feedback ${feedbackId}...`);

    // Call Groq API for classification
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a feedback analysis AI. Analyze customer feedback and classify it into three categories:
1. Sentiment: positive, neutral, or negative
2. Urgency: high, medium, or low
3. Impact: critical, feature_request, or nice_to_have

Respond with ONLY a JSON object in this exact format:
{"sentiment": "positive|neutral|negative", "urgency": "high|medium|low", "impact": "critical|feature_request|nice_to_have"}`
          },
          {
            role: "user",
            content: `Analyze this feedback: "${content}"`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    console.log("Groq response:", JSON.stringify(groqData));

    const analysisText = groqData.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No content in Groq response");
    }

    // Parse the JSON from Groq
    const analysis = JSON.parse(analysisText);

    // Get embedding for clustering
    const embeddingResponse = await fetch("https://api.groq.com/openai/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nomic-embed-text-v1.5",
        input: content,
      }),
    });

    let embedding = null;
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      embedding = JSON.stringify(embeddingData.data[0]?.embedding || []);
    }

    // Store analysis in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase
      .from("feedback_analysis")
      .insert({
        feedback_id: feedbackId,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        impact: analysis.impact,
        embedding_vector: embedding,
      });

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw insertError;
    }

    console.log(`Successfully analyzed feedback ${feedbackId}`);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in analyze-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
