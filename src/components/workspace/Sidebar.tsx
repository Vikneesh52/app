import React from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import AIConfigModal from "./panels/AIConfigModal";
import { Code, MessageSquare, Wand2 } from "lucide-react";

interface SidebarProps {
  selectedFeatures: string[];
  toggleFeature: (feature: string) => void;
}

export default function Sidebar({
  selectedFeatures,
  toggleFeature,
}: SidebarProps) {
  return (
    <div className="h-full w-16 border-r flex flex-col items-center py-4 bg-[#1a1a1a] text-white">
      <div className="flex flex-col items-center space-y-6 w-full">
        {/* Logo */}
        <div className="flex justify-center items-center w-10 h-10 rounded-md bg-indigo-600 text-white font-bold text-lg">
          AI
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Main Navigation Icons */}
        <div className="flex flex-col items-center space-y-4 pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            title="Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            title="Code Editor"
          >
            <Code className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            title="AI Generator"
          >
            <Wand2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* AI Config at the bottom */}
      <div className="mt-auto mb-4">
        <AIConfigModal />
      </div>
    </div>
  );
}
