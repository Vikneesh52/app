import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import PreviewPanel from "./panels/PreviewPanel";
import CodePanel from "./panels/CodePanel";
import FlowPanel from "./panels/FlowPanel";
import ChatPanel from "./panels/ChatPanel";
import Sidebar from "./Sidebar";

export default function WorkspaceLayout() {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "responsive",
  ]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    );
  };

  return (
    <div className="h-screen w-full bg-muted/20 dark:bg-gray-950 overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sidebar */}
        <ResizablePanel defaultSize={5} minSize={5} maxSize={5}>
          <Sidebar
            selectedFeatures={selectedFeatures}
            toggleFeature={toggleFeature}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <ChatPanel />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
              <PreviewPanel />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={50}>
                  <CodePanel />
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50}>
                  <FlowPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
