import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Send,
  Plus,
  MessageSquare,
  Bot,
  User,
  Menu,
  X,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const FeedbackChat = () => {
  const [currentConversation, setCurrentConversation] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at");

    setCurrentConversation(
      data?.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })) || []
    );
    setConversationId(convId);
  };

  const handleHistoryClick = (convId: string) => {
    loadMessages(convId);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      let activeConversationId = conversationId;

      // Create new conversation if none exists
      if (!activeConversationId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        const title =
          userMessage.length > 50
            ? userMessage.substring(0, 50) + "..."
            : userMessage;

        const { data: convData, error: convError } = await supabase
          .from("chat_conversations")
          .insert([{ title, user_id: user.id }])
          .select()
          .single();
        if (convError) throw convError;

        activeConversationId = convData.id;
        setConversationId(activeConversationId);
        setConversations((prev) => [convData, ...prev]);
      }

      // Add user message
      setCurrentConversation((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: userMessage },
      ]);

      // Call Edge Function
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("chat-with-feedback", {
        body: { message: userMessage, conversationId: activeConversationId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      // Add assistant response
      setCurrentConversation((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.data.response,
        },
      ]);

      await loadConversations();
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
    <div className="relative h-[600px]">
      {/* Mobile menu button */}
      {/* Mobile menu button */}
      {!isSidebarOpen && (
        <Button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden absolute top-4 left-4 z-50"
          variant="outline"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Sidebar */}
      <div
        className={`absolute inset-0 z-40 bg-background border-r transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-medium">Chat History</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">
          <Button
            onClick={() => {
              setConversationId(null);
              setCurrentConversation([]);
              setIsSidebarOpen(false);
            }}
            className="w-full mb-4"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={conversationId === conv.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left truncate"
                  onClick={() => {
                    handleHistoryClick(conv.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
        {/* Desktop Sidebar */}
        <Card className="hidden md:flex md:col-span-1 flex-col">
          <CardHeader>
            <CardTitle>Chat History</CardTitle>
            <Button
              onClick={() => {
                setConversationId(null);
                setCurrentConversation([]);
              }}
              className="w-full mt-2"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" /> New Chat
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {conversations.map((conv) => (
                  <Button
                    key={conv.id}
                    variant={conversationId === conv.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => handleHistoryClick(conv.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-3 flex flex-col h-full">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="pl-12 md:pl-0">
              Feedback AI Assistant
            </CardTitle>
            <CardDescription className="pl-12 md:pl-0">
              Ask questions about your customer feedback data
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {currentConversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    ) : (
                      <Bot className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-black"
                      }`}
                    >
                      <p className="text-sm  whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="flex gap-2 flex-shrink-0">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                placeholder="Ask about feedback trends, sentiment analysis..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
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
    </div>
  );
};

export default FeedbackChat;
