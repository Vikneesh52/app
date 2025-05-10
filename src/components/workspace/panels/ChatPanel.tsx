import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../../../supabase/auth";
import ReactMarkdown from "react-markdown";
import { useAI } from "@/lib/ai-context";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Wand2 } from "lucide-react";
import AIConfigModal from "./AIConfigModal";

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  status?: "loading" | "complete" | "error";
  statusText?: string;
};

export default function ChatPanel() {
  const { user } = useAuth();
  const { isConfigured, provider, model, isGenerating, generateApp } = useAI();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI assistant. How can I help you build your web application today?",
      sender: "ai",
      timestamp: new Date(),
      status: "complete",
    },
  ]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "responsive",
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadingMessageRef = useRef<string | null>(null);
  const loadingStagesRef = useRef<string[]>([
    "Got it, working on it...",
    "Generating response...",
    "Finishing up...",
  ]);
  const loadingStageIndexRef = useRef(0);
  const loadingIntervalRef = useRef<number | null>(null);

  // Listen for chat updates from the prompt panel
  useEffect(() => {
    const handleChatUpdate = (event: CustomEvent) => {
      const { id, content, sender, timestamp } = event.detail;
      const newMessage: Message = {
        id: id || Date.now().toString(),
        content: content,
        sender: sender,
        timestamp: new Date(timestamp), // Parse the timestamp string
        status: "complete",
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    // Add the event listener to document instead of window
    document.addEventListener("chat-update", handleChatUpdate as EventListener);
    return () => {
      document.removeEventListener(
        "chat-update",
        handleChatUpdate as EventListener
      );
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  // Clean up loading interval on unmount
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, []);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const updateLoadingMessage = () => {
    if (loadingMessageRef.current) {
      loadingStageIndexRef.current =
        (loadingStageIndexRef.current + 1) % loadingStagesRef.current.length;
      const newStatusText =
        loadingStagesRef.current[loadingStageIndexRef.current];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageRef.current
            ? { ...msg, statusText: newStatusText }
            : msg
        )
      );
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !isConfigured) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
      status: "complete",
    };

    setMessages((prev) => [...prev, userMessage]);

    // Clear input field
    const userQuery = input;
    setInput("");

    // Show loading indicator with initial status
    const loadingId = (Date.now() + 1).toString();
    loadingMessageRef.current = loadingId;
    loadingStageIndexRef.current = 0;

    const initialStatusText = loadingStagesRef.current[0];

    const loadingMessage: Message = {
      id: loadingId,
      content: "", // Empty content initially
      sender: "ai",
      timestamp: new Date(),
      status: "loading",
      statusText: initialStatusText,
    };

    setMessages((prev) => [...prev, loadingMessage]);

    // Start the loading status update interval
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
    }

    loadingIntervalRef.current = window.setInterval(updateLoadingMessage, 2000);

    try {
      // Enhance prompt with selected features
      const enhancedPrompt = `
        Create a web application with the following requirements:\n
        ${userQuery}\n
        \n
        Include these features: ${selectedFeatures.join(", ")}\n
      `;

      // Send to AI and get response
      const response = await generateApp(enhancedPrompt);

      // Clear the loading interval
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }

      // Remove loading message and add actual response
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingId)
          .concat({
            id: (Date.now() + 2).toString(),
            content: response.text || "Sorry, I couldn't generate a response.",
            sender: "ai",
            timestamp: new Date(),
            status: "complete",
          })
      );

      // Send the generated code to the preview panel
      if (response.code) {
        const previewEvent = new CustomEvent("app-preview-update", {
          detail: { code: response.code },
        });
        document.dispatchEvent(previewEvent);
      }

      // Send the mermaid code to the flow panel
      if (response.mermaidCode) {
        try {
          // Access the default export from the imported module
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: true,
            theme: "neutral",
            securityLevel: "loose",
          });

          mermaid
            .render("flow-diagram", response.mermaidCode)
            .then(({ svg }) => {
              // Dispatch event with the SVG
              const flowEvent = new CustomEvent("flow-diagram-update", {
                detail: { flowDiagram: svg },
              });
              document.dispatchEvent(flowEvent);

              // Add this new event dispatch for the mermaid code
              const mermaidCodeEvent = new CustomEvent("mermaid-code-update", {
                detail: { mermaidCode: response.mermaidCode },
              });
              document.dispatchEvent(mermaidCodeEvent);
            });
        } catch (error) {
          console.error("Error rendering mermaid diagram:", error);
        }
      }
    } catch (error) {
      // Clear the loading interval
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }

      // Handle error
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingId)
          .concat({
            id: (Date.now() + 2).toString(),
            content:
              "Sorry, there was an error processing your request. Please try again.",
            sender: "ai",
            timestamp: new Date(),
            status: "error",
          })
      );
      console.error("Error generating response:", error);
    }

    loadingMessageRef.current = null;
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    const chatText = messages
      .map(
        (msg) =>
          `[${msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}] ${msg.sender === "user" ? "You" : "AI"}: ${msg.content}`
      )
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
      <div className="p-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium text-lg">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Chat with AI to build your app
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportChat}
          disabled={messages.length <= 1}
        >
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted dark:bg-gray-800"
                }`}
              >
                {message.sender === "ai" && (
                  <div className="flex items-center mb-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ai" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">AI Assistant</span>
                    {message.status === "loading" && (
                      <Loader2 className="h-3 w-3 ml-2 animate-spin" />
                    )}
                    {message.status === "complete" && (
                      <CheckCircle className="h-3 w-3 ml-2 text-green-500" />
                    )}
                    {message.status === "error" && (
                      <XCircle className="h-3 w-3 ml-2 text-red-500" />
                    )}
                  </div>
                )}
                {message.status === "loading" ? (
                  <div className="text-sm">
                    <p>{message.statusText}</p>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap leading-tight prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
                <span className="text-xs opacity-70 block text-right mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <Tabs defaultValue="prompt" className="mb-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex flex-col gap-2"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the web app you want to build..."
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  {isConfigured ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Using {provider} / {model}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Not configured
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <AIConfigModal />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isGenerating || !isConfigured}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" /> Generate App
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="settings" className="pt-2">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={
                      selectedFeatures.includes("auth") ? "default" : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("auth")}
                  >
                    Authentication
                  </Button>
                  <Button
                    variant={
                      selectedFeatures.includes("database")
                        ? "default"
                        : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("database")}
                  >
                    Database
                  </Button>
                  <Button
                    variant={
                      selectedFeatures.includes("api") ? "default" : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("api")}
                  >
                    API Integration
                  </Button>
                  <Button
                    variant={
                      selectedFeatures.includes("upload")
                        ? "default"
                        : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("upload")}
                  >
                    File Upload
                  </Button>
                  <Button
                    variant={
                      selectedFeatures.includes("darkmode")
                        ? "default"
                        : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("darkmode")}
                  >
                    Dark Mode
                  </Button>
                  <Button
                    variant={
                      selectedFeatures.includes("responsive")
                        ? "default"
                        : "outline"
                    }
                    className="justify-start"
                    onClick={() => toggleFeature("responsive")}
                  >
                    Responsive Design
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Example Prompts</h4>
                <div className="space-y-2">
                  <div
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() =>
                      setInput(
                        "Create a personal portfolio website with a hero section, about me, skills, projects, and contact form."
                      )
                    }
                  >
                    <p className="font-medium">Portfolio Website</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Personal portfolio with projects showcase
                    </p>
                  </div>
                  <div
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() =>
                      setInput(
                        "Build a task management app with the ability to create, edit, and delete tasks. Include task categories and priority levels."
                      )
                    }
                  >
                    <p className="font-medium">Task Manager</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Simple todo/task management application
                    </p>
                  </div>
                  <div
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() =>
                      setInput(
                        "Create a weather dashboard that shows current weather and 5-day forecast for a city. Include temperature, humidity, and wind speed."
                      )
                    }
                  >
                    <p className="font-medium">Weather Dashboard</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Weather forecast application
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
