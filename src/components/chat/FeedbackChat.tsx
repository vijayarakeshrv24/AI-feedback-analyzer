import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Plus, MessageSquare, User, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const FeedbackChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-create new conversation on first load
  useEffect(() => {
    if (!conversationId) {
      createNewConversation();
    }
  }, [conversationId]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id) // Only load user-specific chats
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");

    setMessages(
      data?.map(m => ({ role: m.role as "user" | "assistant", content: m.content })) || []
    );
  };

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert([{ title: "New Conversation", user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setConversationId(data.id);
    setMessages([]); // Start with an empty chat

    loadConversations();
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Update conversation title if still "New Conversation"
      const conv = conversations.find(c => c.id === conversationId);
      if (conv && conv.title === "New Conversation") {
        await supabase
          .from("chat_conversations")
          .update({ title: userMessage.slice(0, 30) })
          .eq("id", conversationId);
        loadConversations();
      }

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke("chat-with-feedback", {
        body: { message: userMessage, conversationId },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
      {/* Sidebar */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Conversations</CardTitle>
          <Button onClick={createNewConversation} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={conversationId === conv.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setConversationId(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {conv.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Feedback AI Assistant</CardTitle>
          <CardDescription>
            Ask questions about your customer feedback data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-start gap-2`}
                >
                  {msg.role === "assistant" && <Bot className="h-5 w-5 text-muted-foreground mt-1" />}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && <User className="h-5 w-5 text-primary mt-1" />}
                </div>
              ))}

              {/* Loader bubble */}
              {isLoading && (
                <div className="flex justify-start items-center gap-2">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about feedback trends, sentiment analysis..."
              disabled={!conversationId || isLoading}
            />
            <Button onClick={handleSend} disabled={!conversationId || isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackChat;
