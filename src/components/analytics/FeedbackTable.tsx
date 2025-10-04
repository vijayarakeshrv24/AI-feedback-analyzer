import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedbackWithAnalysis {
  id: string;
  content: string;
  source: string;
  user_email: string | null;
  created_at: string;
  feedback_analysis: {
    sentiment: string;
    urgency: string;
    impact: string;
  }[];
}

const FeedbackTable = () => {
  const [feedback, setFeedback] = useState<FeedbackWithAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeedback();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback'
        },
        () => {
          loadFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select(`
          id,
          content,
          source,
          user_email,
          created_at,
          feedback_analysis (
            sentiment,
            urgency,
            impact
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "default";
      case "neutral": return "secondary";
      case "negative": return "destructive";
      default: return "outline";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Recent Feedback</CardTitle>
        <CardDescription>Latest customer feedback with AI analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Feedback</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No feedback available. Upload some feedback to get started!
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item) => {
                  const analysis = item.feedback_analysis[0];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-md truncate">{item.content}</div>
                        {item.user_email && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.user_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {analysis ? (
                          <Badge variant={getSentimentColor(analysis.sentiment)}>
                            {analysis.sentiment}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {analysis ? (
                          <Badge variant={getUrgencyColor(analysis.urgency)}>
                            {analysis.urgency}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {analysis ? (
                          <span className="text-sm capitalize">
                            {analysis.impact.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.source}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackTable;
