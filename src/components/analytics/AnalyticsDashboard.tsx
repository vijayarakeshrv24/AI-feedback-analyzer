import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FeedbackTable from "./FeedbackTable";

interface AnalyticsData {
  totalFeedback: number;
  sentimentData: { name: string; value: number; color: string }[];
  urgencyData: { name: string; value: number; color: string }[];
  impactData: { name: string; value: number; color: string }[];
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    loadAnalytics();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_analysis'
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const loadAnalytics = async () => {
    try {
      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("*");

      const { data: analysisData } = await supabase
        .from("feedback_analysis")
        .select("sentiment, urgency, impact");

      const totalFeedback = feedbackData?.length || 0;

      if (!analysisData) {
        setAnalytics({
          totalFeedback,
          sentimentData: [],
          urgencyData: [],
          impactData: [],
        });
        return;
      }

      // Count sentiment
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      const urgencyCounts = { high: 0, medium: 0, low: 0 };
      const impactCounts = { critical: 0, feature_request: 0, nice_to_have: 0 };

      analysisData.forEach((item) => {
        sentimentCounts[item.sentiment as keyof typeof sentimentCounts]++;
        urgencyCounts[item.urgency as keyof typeof urgencyCounts]++;
        impactCounts[item.impact as keyof typeof impactCounts]++;
      });

      setAnalytics({
        totalFeedback,
        sentimentData: [
          { name: "Negative", value: sentimentCounts.negative, color: "hsl(var(--chart-negative))" },
          { name: "Neutral", value: sentimentCounts.neutral, color: "hsl(var(--chart-neutral))" },
          { name: "Positive", value: sentimentCounts.positive, color: "hsl(var(--chart-positive))" },
        ],
        urgencyData: [
          { name: "High", value: urgencyCounts.high, color: "hsl(var(--chart-high))" },
          { name: "Medium", value: urgencyCounts.medium, color: "hsl(var(--chart-medium))" },
          { name: "Low", value: urgencyCounts.low, color: "hsl(var(--chart-low))" },
        ],
        impactData: [
          { name: "Critical", value: impactCounts.critical, color: "hsl(var(--chart-critical))" },
          { name: "Feature Request", value: impactCounts.feature_request, color: "hsl(var(--chart-feature))" },
          { name: "Nice to Have", value: impactCounts.nice_to_have, color: "hsl(var(--chart-nice))" },
        ],
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{analytics.totalFeedback}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time submissions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {analytics.urgencyData.find(d => d.name === "High")?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {analytics.sentimentData.find(d => d.name === "Positive")?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Happy customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Overall customer sentiment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Urgency Levels</CardTitle>
            <CardDescription>Priority distribution of feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.urgencyData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))">
                  {analytics.urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Business Impact</CardTitle>
          <CardDescription>Categorized by priority and potential impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {analytics.impactData.map((item, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg border p-6 hover:shadow-lg transition-shadow"
                style={{ borderColor: item.color }}
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{item.name}</p>
                  <p className="text-4xl font-bold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table with Sort */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Feedback</CardTitle>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="sentiment">Sort by Sentiment</SelectItem>
              <SelectItem value="urgency">Sort by Urgency</SelectItem>
              <SelectItem value="impact">Sort by Impact</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <FeedbackTable sortBy={sortBy} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
