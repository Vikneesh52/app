import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, X, Minimize, Maximize } from "lucide-react";
import "xterm/css/xterm.css";

interface TerminalPanelProps {
  className?: string;
}

export default function TerminalPanel({ className }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);

  // Initialize terminal and websocket connection on component mount
  useEffect(() => {
    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
      },
      fontSize: 14,
      fontFamily: "monospace",
    });

    terminalInstanceRef.current = term;

    // Create fit addon to resize terminal
    const fit = new FitAddon();
    term.loadAddon(fit);

    // Mount terminal to DOM
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fit.fit();

      // Store terminal and fit addon in state
      setTerminal(term);
      setFitAddon(fit);

      // Connect to WebSocket server for terminal backend
      const ws = new WebSocket("ws://localhost:3001");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        term.writeln("\r\n\x1b[1;32mConnected to terminal server\x1b[0m");
        term.writeln(
          "Terminal is ready. You can run npm, git, and bash commands."
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "output") {
            term.write(data.content);
          }
        } catch (error) {
          console.error("Error processing message:", error);
          term.writeln("\r\n\x1b[1;31mError processing server message\x1b[0m");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        term.writeln(
          "\r\n\x1b[1;31mError connecting to terminal server\x1b[0m"
        );
        term.writeln("Please check if the terminal server is running.");
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        term.writeln("\r\n\x1b[1;31mDisconnected from terminal server\x1b[0m");
        term.writeln("Terminal connection closed. Trying to reconnect...");

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (terminalRef.current) {
            if (ws.readyState !== WebSocket.CONNECTING) {
              ws.close();
              setSocket(null);
              socketRef.current = null;
            }
          }
        }, 3000);
      };

      setSocket(ws);

      // Set up terminal key handling
      term.onKey(({ key, domEvent }) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Check for Ctrl-C
          if (domEvent.ctrlKey && domEvent.key === "c") {
            ws.send(JSON.stringify({ type: "SIGINT" }));
          } else {
            // Send any other key directly to the server
            ws.send(JSON.stringify({ type: "key", key }));
          }
        }
      });

      // Also handle paste events
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          // If this is a large chunk of data (likely a paste), send it as a paste event
          if (data.length > 1) {
            ws.send(JSON.stringify({ type: "paste", data }));
          }
        }
      });
    }

    // Clean up
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
    };
  }, []);

  // Focus the terminal when clicked
  const focusTerminal = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.focus();
    }
  };

  return (
    <div
      className={`flex flex-col ${
        className || ""
      } bg-[#1a1a1a] border border-gray-700 shadow-lg transition-all duration-300 overflow-y-auto`}
    >
      {/* Terminal content */}
      <div className="flex-1 overflow-y-auto relative" onClick={focusTerminal}>
        <div ref={terminalRef} className="w-full h-full" />
        <div id="terminal-scroll-anchor" className="bg-[#1a1a1a] pb-4" />
      </div>
    </div>
  );
}
