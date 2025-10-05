import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FeedbackUpload = () => {
  const [manualFeedback, setManualFeedback] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleManualSubmit = async () => {
    if (!manualFeedback.trim()) {
      toast({
        title: "Empty feedback",
        description: "Please enter some feedback to submit.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        return;
      }

      // Insert feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .insert({
          content: manualFeedback,
          source: "manual",
          user_email: userEmail || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      toast({
        title: "Feedback submitted",
        description: "Now analyzing with  AI...",
      });

      // Analyze with Groq
      setIsAnalyzing(true);
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-feedback",
        {
          body: { feedbackId: feedbackData.id, content: manualFeedback },
        }
      );

      if (analysisError) throw analysisError;

      toast({
        title: "Analysis complete",
        description: "Feedback has been analyzed and categorized.",
      });

      setManualFeedback("");
      setUserEmail("");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse CSV properly handling commas in content
      const feedbackEntries = lines.slice(1).map(line => {
        // Match CSV format: "content",email OR content,email
        const match = line.match(/^"([^"]*)"|^([^,]*),(.*)$/);
        let content, email;
        
        if (line.startsWith('"')) {
          // Quoted content
          const parts = line.split('",');
          content = parts[0].substring(1).trim();
          email = parts[1]?.trim();
        } else {
          // Simple comma split (use last comma for email)
          const lastCommaIndex = line.lastIndexOf(',');
          content = line.substring(0, lastCommaIndex).trim();
          email = line.substring(lastCommaIndex + 1).trim();
        }
        
        return {
          content: content.trim(),
          source: 'csv',
          user_email: email || null,
          user_id: user.id,
        };
      }).filter(entry => entry.content);

      if (feedbackEntries.length === 0) {
        throw new Error("No valid feedback found in CSV");
      }

      // Insert all feedback
      const { data: insertedFeedback, error: insertError } = await supabase
        .from("feedback")
        .insert(feedbackEntries)
        .select();

      if (insertError) throw insertError;

      toast({
        title: "CSV uploaded",
        description: `${insertedFeedback.length} feedback entries uploaded. Analyzing...`,
      });

      // Analyze each feedback
      setIsAnalyzing(true);
      for (const feedback of insertedFeedback) {
        await supabase.functions.invoke("analyze-feedback", {
          body: { feedbackId: feedback.id, content: feedback.content },
        });
      }

      toast({
        title: "Analysis complete",
        description: "All feedback has been analyzed.",
      });

      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process CSV",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Manual Entry */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Add Feedback Manually</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">User Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Enter customer feedback here..."
              value={manualFeedback}
              onChange={(e) => setManualFeedback(e.target.value)}
              rows={5}
              className="mt-2"
            />
          </div>

          <Button
            onClick={handleManualSubmit}
            disabled={isSubmitting || isAnalyzing}
            className="w-full"
          >
            {isSubmitting || isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAnalyzing ? "Analyzing..." : "Submitting..."}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="space-y-4 pt-8 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Upload CSV File</h2>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with columns: content, email (optional)
        </p>

        <div className="flex items-center justify-center w-full">
          <Label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
            </div>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVUpload}
              disabled={isSubmitting || isAnalyzing}
            />
          </Label>
        </div>

        {(isSubmitting || isAnalyzing) && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isAnalyzing ? "Analyzing feedback with  AI..." : "Processing CSV..."}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackUpload;
