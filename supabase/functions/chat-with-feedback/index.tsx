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
    const { message, conversationId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Fetch all feedback data
    const { data: feedbackData } = await supabase
      .from("feedback")
      .select(`
        *,
        feedback_analysis (
          sentiment,
          urgency,
          impact
        )
      `);

    // Get conversation history
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");

    // Prepare context
    const feedbackContext = feedbackData?.map(f => 
      `Feedback: "${f.content}" | Source: ${f.source} | Sentiment: ${f.feedback_analysis?.[0]?.sentiment || 'N/A'} | Urgency: ${f.feedback_analysis?.[0]?.urgency || 'N/A'} | Impact: ${f.feedback_analysis?.[0]?.impact || 'N/A'}`
    ).join("\n");

    const systemPrompt = `You are an AI assistant helping analyze customer feedback. You have access to all feedback data below:

${feedbackContext}

Provide helpful insights, summaries, and analysis based on this feedback data. Be concise and actionable.`;

    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...(messages?.map(m => ({ role: m.role, content: m.content })) || []),
      { role: "user", content: message }
    ];

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: conversationMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // Save assistant message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: assistantMessage,
    });

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in chat-with-feedback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});