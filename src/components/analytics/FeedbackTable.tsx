import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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

interface FeedbackTableProps {
  sortBy?: string;
}

const FeedbackTable = ({ sortBy = "urgency" }: FeedbackTableProps) => {
  const [feedback, setFeedback] = useState<FeedbackWithAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFeedback();

    // Real-time updates
    const channel = supabase
      .channel("feedback-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => {
          loadFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

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

      const urgencyOrder = { high: 3, medium: 2, low: 1 }; // higher = more important
      const sentimentOrder = { negative: 0, neutral: 1, positive: 2 };
      const impactOrder = {
        critical: 0,
        feature_request: 1,
        nice_to_have: 2,
      };

      const sortedData = [...(data || [])].sort((a, b) => {
        const aAnalysis = a.feedback_analysis?.[0];
        const bAnalysis = b.feedback_analysis?.[0];

        switch (sortBy) {
          case "sentiment":
            return (
              (sentimentOrder[aAnalysis?.sentiment as keyof typeof sentimentOrder] || 999) -
              (sentimentOrder[bAnalysis?.sentiment as keyof typeof sentimentOrder] || 999)
            );
          case "urgency":
            // Descending: High (3) → Medium (2) → Low (1)
            return (
              (urgencyOrder[bAnalysis?.urgency as keyof typeof urgencyOrder] || 0) -
              (urgencyOrder[aAnalysis?.urgency as keyof typeof urgencyOrder] || 0)
            );
          case "impact":
            return (
              (impactOrder[aAnalysis?.impact as keyof typeof impactOrder] || 999) -
              (impactOrder[bAnalysis?.impact as keyof typeof impactOrder] || 999)
            );
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      });

      setFeedback(sortedData);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "default";
      case "neutral":
        return "secondary";
      case "negative":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-400 text-black";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const formatUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "High";
      case "medium":
        return "Medium";
      case "low":
        return "Low";
      default:
        return "Unknown";
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
        <CardDescription>
          Sorted by urgency — High → Medium → Low
        </CardDescription>
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
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No feedback available.
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
                          <span className="text-muted-foreground text-sm">
                            Pending
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {analysis ? (
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-semibold ${getUrgencyStyle(
                              analysis.urgency
                            )}`}
                          >
                            {formatUrgencyLabel(analysis.urgency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Pending
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {analysis ? (
                          <span className="text-sm capitalize">
                            {analysis.impact.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Pending
                          </span>
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
