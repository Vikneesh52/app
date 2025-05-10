import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Download, Settings } from "lucide-react";
import { useAuth } from "../../../../supabase/auth";
import ReactMarkdown from "react-markdown";
import { useAI } from "@/lib/ai-context";
import AIConfigModal from "./AIConfigModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Define custom components for react-markdown to apply styles and reduce spacing
const components = {
  p: (props) => <p style={{ marginBottom: "0.25rem" }} {...props} />,
};

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
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
    },
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Listen for chat updates from the prompt panel
  useEffect(() => {
    const handleChatUpdate = (event: CustomEvent) => {
      const { id, content, sender, timestamp } = event.detail;
      const newMessage: Message = {
        id: id || Date.now().toString(),
        content: content,
        sender: sender,
        timestamp: new Date(timestamp), // Parse the timestamp string
      };
      setMessages((prev) => [...prev, newMessage]);
    };

    // Add the event listener to document instead of window
    document.addEventListener("chat-update", handleChatUpdate as EventListener);
    return () => {
      document.removeEventListener(
        "chat-update",
        handleChatUpdate as EventListener,
      );
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !isConfigured) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Clear input field
    const userQuery = input;
    setInput("");

    try {
      // Send to AI and get response
      const response = await generateApp(userQuery);

      // Add AI response
      setMessages((prev) =>
        prev.concat({
          id: Date.now().toString(),
          content: response.text || "Sorry, I couldn't generate a response.",
          sender: "ai",
          timestamp: new Date(),
        }),
      );

      // Dispatch events to update other panels if response contains code or mermaid
      if (response.code) {
        const previewEvent = new CustomEvent("app-preview-update", {
          detail: { code: response.code },
        });
        document.dispatchEvent(previewEvent);
      }

      if (response.mermaidCode) {
        const mermaidCodeEvent = new CustomEvent("mermaid-code-update", {
          detail: { mermaidCode: response.mermaidCode },
        });
        document.dispatchEvent(mermaidCodeEvent);

        // Also dispatch a flow-diagram-update event to ensure the diagram is rendered
        setTimeout(() => {
          const flowDiagramEvent = new CustomEvent("flow-diagram-update", {
            detail: { flowDiagram: null },
          });
          document.dispatchEvent(flowDiagramEvent);
        }, 100);
      }
    } catch (error) {
      // Handle error
      setMessages((prev) =>
        prev.concat({
          id: Date.now().toString(),
          content:
            "Sorry, there was an error processing your request. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        }),
      );
      console.error("Error generating response:", error);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    const chatText = messages
      .map(
        (msg) =>
          `[${msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}] ${msg.sender === "user" ? "You" : "AI"}: ${msg.content}`,
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
    <div className="flex flex-col h-full bg-background rounded-lg border shadow-sm">
      <div className="p-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium text-lg">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">
            Chat with AI to refine your app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportChat}
            disabled={messages.length <= 1}
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <ThemeToggle />
        </div>
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
                    : "bg-muted"
                }`}
              >
                {message.sender === "ai" && (
                  <div className="flex items-center mb-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=ai" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">AI Assistant</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-tight">
                  <ReactMarkdown components={components}>
                    {message.content}
                  </ReactMarkdown>
                </div>
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI assistant..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">AI Configuration</h4>
            <AIConfigModal />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mb-4">
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
          </div>

          <h4 className="font-medium mb-2">Example Prompts</h4>
          <div className="space-y-2">
            <div
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() =>
                setInput(
                  "Create a personal portfolio website with a hero section, about me, skills, projects, and contact form.",
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
                  "Build a task management app with the ability to create, edit, and delete tasks. Include task categories and priority levels.",
                )
              }
            >
              <p className="font-medium">Task Manager</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Simple todo/task management application
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
