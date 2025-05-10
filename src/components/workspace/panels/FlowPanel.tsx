import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";

export default function FlowPanel() {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidCode, setMermaidCode] = useState<string>(`graph TD
  A[Landing Page] --> B{User Logged In?}
  B -->|Yes| C[Dashboard]
  B -->|No| D[Login Page]
  D --> E[Sign Up]
  D --> C
  C --> F[Create Project]
  C --> G[View Projects]
  F --> H[App Builder]
  G --> H`);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("diagram");
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const lastRenderedCodeRef = useRef<string>(mermaidCode);

  // Listen for flow diagram updates
  useEffect(() => {
    const handleFlowDiagramUpdate = (event: CustomEvent) => {
      setIsLoading(true);
      const { flowDiagram } = event.detail;

      if (flowDiagram && mermaidRef.current) {
        // The event provides the rendered SVG directly
        mermaidRef.current.innerHTML = flowDiagram;
        setIsLoading(false);
      } else {
        // If no SVG provided, try to render the current mermaid code
        renderMermaid(lastRenderedCodeRef.current || mermaidCode);
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    const handleMermaidCodeUpdate = (event: CustomEvent) => {
      const { mermaidCode } = event.detail;
      if (mermaidCode) {
        setMermaidCode(mermaidCode);
        // Force immediate render of the new mermaid code
        setTimeout(() => {
          renderMermaid(mermaidCode);
        }, 50);
      }
    };

    // Add both event listeners
    document.addEventListener(
      "flow-diagram-update",
      handleFlowDiagramUpdate as EventListener,
    );

    document.addEventListener(
      "mermaid-code-update",
      handleMermaidCodeUpdate as EventListener,
    );

    // Clean up both event listeners
    return () => {
      document.removeEventListener(
        "flow-diagram-update",
        handleFlowDiagramUpdate as EventListener,
      );
      document.removeEventListener(
        "mermaid-code-update",
        handleMermaidCodeUpdate as EventListener,
      );
    };
  }, []);

  // Initial render and whenever mermaidCode changes
  useEffect(() => {
    if (mermaidCode) {
      renderMermaid(mermaidCode);
    }
  }, [mermaidCode]);

  // Re-render when switching back to diagram tab
  useEffect(() => {
    if (activeTab === "diagram") {
      renderMermaid(lastRenderedCodeRef.current || mermaidCode);
    }
  }, [activeTab]);

  const renderMermaid = async (code: string) => {
    try {
      // Ensure code is valid mermaid syntax
      if (
        !code.trim().startsWith("graph") &&
        !code.trim().startsWith("flowchart")
      ) {
        code = `flowchart TD\n${code}`;
      }

      // Dynamically import mermaid
      const mermaidModule = await import("mermaid");
      const mermaid = mermaidModule.default;

      // Force clear mermaid cache to prevent rendering issues
      if (typeof mermaid.clearCache === "function") {
        mermaid.clearCache();
      }

      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        logLevel: 1,
        fontFamily: "monospace",
      });

      if (mermaidRef.current) {
        // Clear previous content
        mermaidRef.current.innerHTML = "";

        // Create a unique ID for the diagram
        const id = `mermaid-${Date.now()}`;

        // Create container for the diagram
        const container = document.createElement("div");
        container.id = id;
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.justifyContent = "center";
        container.style.alignItems = "center";
        mermaidRef.current.appendChild(container);

        try {
          // Force a small delay to ensure DOM is ready
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Parse the diagram first to validate
          await mermaid.parse(code);

          // Render the diagram
          const { svg } = await mermaid.render(id, code);
          container.innerHTML = svg;

          // Store the successfully rendered code
          lastRenderedCodeRef.current = code;
        } catch (parseError) {
          console.error("Mermaid parse error:", parseError);
          // Try with a simplified diagram
          const fallbackCode = `flowchart TD\n  A[Start] --> B[Process]\n  B --> C[End]`;
          const { svg } = await mermaid.render(id, fallbackCode);
          container.innerHTML = svg;

          // Add error message
          const errorDiv = document.createElement("div");
          errorDiv.className = "text-red-500 text-sm mt-4 text-center";
          errorDiv.textContent = "Error rendering diagram. Using fallback.";
          container.appendChild(errorDiv);
        }
      }
    } catch (error) {
      console.error("Error rendering mermaid diagram:", error);
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="text-sm text-red-500 mb-2">Error rendering diagram</div>
              <div class="border rounded-lg p-4 bg-muted/30">
                <pre class="text-xs text-left">${code}</pre>
              </div>
            </div>
          </div>
        `;
      }
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    renderMermaid(mermaidCode);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleExport = () => {
    const svgElement = mermaidRef.current?.querySelector("svg");
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "flow-diagram.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback to text export if SVG is not available
      const blob = new Blob([mermaidCode], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "flow-diagram.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setStartPosition({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startPosition.x;
    const newY = e.clientY - startPosition.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
      <div className="p-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium text-lg">Flow Diagram</h3>
          <p className="text-sm text-muted-foreground">
            Visualize app structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="diagram"
        className="flex-1"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className="px-3 pt-2">
          <TabsList>
            <TabsTrigger value="diagram">Diagram</TabsTrigger>
            <TabsTrigger value="code">Mermaid Code</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="diagram" className="flex-1 p-3">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div
              ref={diagramContainerRef}
              className="h-full overflow-hidden relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <div
                className="absolute"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
              >
                <div ref={mermaidRef} className="w-full h-full" />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="p-3">
          <div className="border rounded bg-muted dark:bg-gray-800 p-3">
            <pre className="text-xs overflow-auto">{mermaidCode}</pre>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            This is the Mermaid code used to generate the flow diagram.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
