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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Generating weekly digest...");

    // Get high priority and critical feedback from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: criticalFeedback, error: fetchError } = await supabase
      .from("feedback_analysis")
      .select(`
        sentiment,
        urgency,
        impact,
        feedback:feedback_id (
          content,
          user_email,
          created_at
        )
      `)
      .gte("analyzed_at", sevenDaysAgo.toISOString())
      .or("urgency.eq.high,impact.eq.critical")
      .order("analyzed_at", { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    // Get cluster summary
    const { data: clusters, error: clusterError } = await supabase
      .from("feedback_clusters")
      .select("name, feedback_count")
      .order("feedback_count", { ascending: false })
      .limit(5);

    if (clusterError) throw clusterError;

    // Prepare context for AI summarization
    const feedbackContext = criticalFeedback?.map((item, idx) => {
      const feedbackData = Array.isArray(item.feedback) ? item.feedback[0] : item.feedback;
      return `${idx + 1}. [${item.urgency}/${item.impact}] ${feedbackData?.content || "No content"}`;
    }).join("\n") || "No critical feedback this week";

    const clusterContext = clusters?.map((c, idx) => 
      `${idx + 1}. ${c.name} (${c.feedback_count} items)`
    ).join("\n") || "No clusters available";

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    // Generate digest using Groq
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
            content: `You are a product insights analyst. Create a concise weekly digest of customer feedback for a product team. Focus on actionable insights, patterns, and priorities.`
          },
          {
            role: "user",
            content: `Create a weekly feedback digest based on:

CRITICAL & HIGH PRIORITY FEEDBACK:
${feedbackContext}

TOP FEEDBACK CLUSTERS:
${clusterContext}

Format the digest as:
1. Executive Summary (2-3 sentences)
2. Key Insights (3-5 bullet points)
3. Top Priorities (ranked list)
4. Recommended Actions (specific next steps)`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const digest = groqData.choices[0]?.message?.content;

    if (!digest) {
      throw new Error("No content in Groq response");
    }

    // Save digest to database
    const { error: insertError } = await supabase
      .from("digest_history")
      .insert({
        content: digest,
        summary: {
          total_feedback: criticalFeedback?.length || 0,
          top_clusters: clusters?.length || 0,
        },
        channels: ["email"],
      });

    if (insertError) {
      console.error("Error saving digest:", insertError);
    }

    console.log("Digest generated successfully");

    return new Response(
      JSON.stringify({ success: true, digest }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
