import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  FileCode,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  Save,
  FolderPlus,
  FilePlus,
  Trash2,
  Play,
  ExternalLink,
  Terminal as TerminalIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import TerminalPanel from "./TerminalPanel";
import { useAI } from "@/lib/ai-context";
// Use dynamic import without next/dynamic
const dynamicImport = (importFn) => {
  return React.lazy(() => importFn());
};
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import "devicon/devicon.min.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dynamically import Monaco Editor
const MonacoEditor = dynamicImport(() => import("@monaco-editor/react"));

// File system types
type FileType = {
  name: string;
  content: string;
  type: "file";
  language: string;
};

type FolderType = {
  name: string;
  type: "folder";
  children: (FileType | FolderType)[];
};

type FileSystemItem = FileType | FolderType;

export default function CodePanel() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([]);
  const [editorTheme, setEditorTheme] = useState("vs-light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(new Set<string>());
  const [currentFileContent, setCurrentFileContent] = useState<string>("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSettingUpProject, setIsSettingUpProject] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(10); // Characters per interval
  const [typingPaused, setTypingPaused] = useState(false);
  const typingIntervalRef = useRef(null);
  const codeBufferRef = useRef("");
  const typingPositionRef = useRef(0);

  const { toast } = useToast();
  const editorRef = useRef(null);
  const selectedFileRef = useRef(selectedFile);
  const terminalRef = useRef(null);
  const { isGenerating } = useAI();

  // Update the ref whenever selectedFile changes
  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  // Listen for code updates from the prompt panel
  useEffect(() => {
    const handleAppPreviewUpdate = (event) => {
      const generatedCode = event.detail.code;

      // If typing effect is enabled, start the typing effect
      if (isTyping) {
        startTypingEffect(generatedCode);
      } else {
        // Otherwise, just parse the code normally
        parseCodeIntoFiles(generatedCode);
      }
    };

    document.addEventListener("app-preview-update", handleAppPreviewUpdate);
    return () => {
      document.removeEventListener(
        "app-preview-update",
        handleAppPreviewUpdate
      );
    };
  }, [isTyping]);

  // Effect to handle typing state based on AI generation state
  useEffect(() => {
    if (isGenerating && !isTyping) {
      setIsTyping(true);
    }
  }, [isGenerating, isTyping]);

  // Get devicon class based on file extension
  const getDeviconClass = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    switch (ext) {
      case "html":
        return "devicon-html5-plain colored";
      case "css":
        return "devicon-css3-plain colored";
      case "js":
        return "devicon-javascript-plain colored";
      case "jsx":
        return "devicon-react-plain colored";
      case "ts":
        return "devicon-typescript-plain colored";
      case "tsx":
        return "devicon-react-plain colored";
      case "json":
        return "devicon-nodejs-plain colored";
      case "md":
        return "devicon-markdown-original colored";
      default:
        return "devicon-code-plain";
    }
  };

  // Get language based on file extension
  const getLanguage = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "js") return "javascript";
    if (ext === "jsx") return "javascript";
    if (ext === "ts") return "typescript";
    if (ext === "tsx") return "typescript";
    if (ext === "json") return "json";
    if (ext === "md") return "markdown";
    return "plaintext";
  };

  // Update editor theme based on document theme
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setEditorTheme(isDarkMode ? "vs-dark" : "vs-light");

    // Create a mutation observer to watch for class changes on the html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDarkMode =
            document.documentElement.classList.contains("dark");
          setEditorTheme(isDarkMode ? "vs-dark" : "vs-light");
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Parse generated code into a proper file structure
  const parseCodeIntoFiles = (code) => {
    try {
      // Try to parse the code as JSON first (in case it's a structured project)
      let projectFiles;
      try {
        projectFiles = JSON.parse(code);
        if (typeof projectFiles !== "object")
          throw new Error("Invalid project structure");
      } catch (e) {
        // If not JSON, try to extract files from HTML-like structure
        projectFiles = extractFilesFromCode(code);
      }

      // Convert flat file structure to nested directory structure
      const newFileSystem = createDirectoryStructure(projectFiles);
      setFileSystem(newFileSystem);

      // Open the main entry file
      const mainFile = findMainFile(newFileSystem);
      if (mainFile) {
        setSelectedFile(mainFile);
        setOpenFiles([mainFile]);
        const fileContent = getFileContent(mainFile);
        if (fileContent) {
          setCurrentFileContent(fileContent);
        }
      }

      // Clear unsaved state when new code is generated
      setUnsavedChanges(new Set());

      // Setup the project automatically
      setupProject();
    } catch (error) {
      console.error("Error parsing code into files:", error);
      toast({
        title: "Error parsing code",
        description: "Could not parse the generated code into files.",
        variant: "destructive",
      });
    }
  };

  // Extract files from HTML-like code with script and style tags
  const extractFilesFromCode = (code) => {
    const files = {};

    // Check if the code looks like a React component
    if (
      code.includes("import React") ||
      (code.includes("function") &&
        code.includes("return") &&
        code.includes("<"))
    ) {
      files["src/App.tsx"] = code;
      files["src/index.tsx"] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
      files["src/index.css"] = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`;
      files["package.json"] = JSON.stringify(
        {
          name: "react-app",
          version: "0.1.0",
          private: true,
          dependencies: {
            react: "^18.2.0",
            "react-dom": "^18.2.0",
            typescript: "^5.0.2",
            vite: "^4.4.5",
          },
          scripts: {
            dev: "vite",
            build: "tsc && vite build",
            preview: "vite preview",
          },
        },
        null,
        2
      );
      files["index.html"] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
`;
      files["vite.config.ts"] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
      files["tsconfig.json"] = JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
          },
          include: ["src"],
          references: [{ path: "./tsconfig.node.json" }],
        },
        null,
        2
      );
      files["tsconfig.node.json"] = JSON.stringify(
        {
          compilerOptions: {
            composite: true,
            skipLibCheck: true,
            module: "ESNext",
            moduleResolution: "bundler",
            allowSyntheticDefaultImports: true,
          },
          include: ["vite.config.ts"],
        },
        null,
        2
      );
      return files;
    }

    // Try to extract HTML, CSS and JavaScript if they're in separate blocks
    if (code.includes("<!DOCTYPE html>") || code.includes("<html")) {
      files["index.html"] = code;

      const cssMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const jsMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

      if (cssMatch && cssMatch[1]) {
        files["src/styles.css"] = cssMatch[1].trim();
      }

      if (jsMatch && jsMatch[1]) {
        files["src/index.js"] = jsMatch[1].trim();
      }
    } else {
      // If it's not HTML or React, just create a single file
      const extension = code.includes("function") ? ".js" : ".txt";
      files[`src/main${extension}`] = code;
    }

    return files;
  };

  // Create a nested directory structure from flat file paths
  const createDirectoryStructure = (files) => {
    const structure = [];

    Object.entries(files).forEach(([path, content]) => {
      const parts = path.split("/");
      let current = structure;

      // Process all directories in the path
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        let folder = current.find(
          (item) => item.name === part && item.type === "folder"
        );

        if (!folder) {
          folder = {
            name: part,
            type: "folder",
            children: [],
          };
          current.push(folder);
        }

        current = folder.children;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      current.push({
        name: fileName,
        type: "file",
        content:
          typeof content === "string"
            ? content
            : JSON.stringify(content, null, 2),
        language: getLanguage(fileName),
      });
    });

    return structure;
  };

  // Find the main entry file in the project structure
  const findMainFile = (structure) => {
    // Priority order for main files
    const mainFileCandidates = [
      "src/index.tsx",
      "src/index.ts",
      "src/index.jsx",
      "src/index.js",
      "src/App.tsx",
      "src/App.jsx",
      "index.html",
    ];

    // Check if any of the candidates exist in our structure
    for (const candidate of mainFileCandidates) {
      if (getFileContent(candidate)) {
        return candidate;
      }
    }

    // If none found, return the first file we can find
    const firstFile = findFirstFile(structure);
    return firstFile || null;
  };

  // Find the first file in the structure
  const findFirstFile = (structure, prefix = "") => {
    for (const item of structure) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.type === "file") {
        return path;
      } else if (item.type === "folder" && item.children) {
        const found = findFirstFile(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Function to handle the typing effect with proper file structure
  const startTypingEffect = (fullCode) => {
    // Reset typing position and store the full code in the buffer
    typingPositionRef.current = 0;
    codeBufferRef.current = fullCode;

    // Clear any existing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    // Try to parse the code to determine structure
    let projectFiles;
    try {
      projectFiles = JSON.parse(fullCode);
      if (typeof projectFiles !== "object")
        throw new Error("Not a valid project structure");
    } catch (e) {
      // If not JSON, assume it's HTML-like code or React code
      projectFiles = extractFilesFromCode(fullCode);
    }

    // Create initial empty structure
    const initialStructure = createDirectoryStructure(projectFiles);
    setFileSystem(initialStructure);

    // Set the main file as selected
    const mainFile = findMainFile(initialStructure);
    if (mainFile) {
      setSelectedFile(mainFile);
      setOpenFiles([mainFile]);
      setCurrentFileContent(""); // Start with empty content that will be filled
    }

    // Start the typing interval
    typingIntervalRef.current = setInterval(() => {
      if (typingPaused) return;

      const currentPosition = typingPositionRef.current;
      const charsToAdd = Math.min(
        typingSpeed,
        codeBufferRef.current.length - currentPosition
      );

      if (charsToAdd <= 0) {
        // We've reached the end of the code
        clearInterval(typingIntervalRef.current);
        setIsTyping(false);

        // Now that typing is complete, parse the full code properly
        parseCodeIntoFiles(codeBufferRef.current);
        return;
      }

      // Add the next batch of characters
      const newText = codeBufferRef.current.substring(
        0,
        currentPosition + charsToAdd
      );
      typingPositionRef.current += charsToAdd;

      try {
        // Try to parse as JSON first
        let updatedFiles;
        try {
          updatedFiles = JSON.parse(newText);
          if (typeof updatedFiles !== "object")
            throw new Error("Not valid JSON");

          // Update with partial JSON structure
          setFileSystem(createDirectoryStructure(updatedFiles));
        } catch (e) {
          // If not valid JSON, treat as HTML or React code
          const partialFiles = extractFilesFromCode(newText);
          setFileSystem(createDirectoryStructure(partialFiles));

          // Update current file content if it's the selected file
          if (selectedFile && partialFiles[selectedFile]) {
            setCurrentFileContent(partialFiles[selectedFile]);
          }
        }
      } catch (error) {
        console.error("Error during typing effect:", error);
      }

      // If we've reached the end, clean up
      if (currentPosition + charsToAdd >= codeBufferRef.current.length) {
        clearInterval(typingIntervalRef.current);
        setIsTyping(false);
        parseCodeIntoFiles(codeBufferRef.current);
      }
    }, 50); // Update every 50ms
  };

  // Toggle typing pause state
  const toggleTypingPause = () => {
    setTypingPaused(!typingPaused);
  };

  // Skip to the end of typing
  const skipTyping = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      parseCodeIntoFiles(codeBufferRef.current);
      setIsTyping(false);
      setTypingPaused(false);
    }
  };

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+S command to save file
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentFile = selectedFileRef.current;
      if (!currentFile) return;

      const editorValue = editor.getValue();
      saveFile(currentFile, editorValue);

      // Show a toast notification for saving
      toast({
        title: "File saved",
        description: `${currentFile} saved`,
      });

      return true; // Signal that the command handled the event
    });
  };

  // Handle code changes in the editor
  const handleEditorChange = (value) => {
    if (!selectedFile) return;

    setCurrentFileContent(value);
    // Mark file as unsaved
    setUnsavedChanges((prev) => new Set(prev).add(selectedFile));
  };

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  // Get file content by path
  const getFileContent = (path) => {
    if (!path) return null;

    const parts = path.split("/");
    let current = fileSystem;

    // Navigate through directories
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const folder = current.find(
        (item) => item.name === part && item.type === "folder"
      );
      if (!folder || folder.type !== "folder") return null; // Add check for folder type
      current = folder.children;
    }

    // Get the file
    const fileName = parts[parts.length - 1];
    const file = current.find(
      (item) => item.name === fileName && item.type === "file"
    );
    if (file && file.type === "file") {
      // Add check for file type before accessing content
      return file.content;
    }
    return null;
  };

  // Save file content
  const saveFile = (filePath, content) => {
    if (!filePath) return;

    const pathParts = filePath.split("/");

    // Create a deep copy of the file system
    const newFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Helper function to update file content in the file system
    const updateFileContent = (items, path) => {
      if (path.length === 0) return false;

      const currentName = path[0];
      const itemIndex = items.findIndex((item) => item.name === currentName);

      if (itemIndex === -1) return false;

      const item = items[itemIndex];

      if (path.length === 1) {
        if (item.type === "file") {
          items[itemIndex] = { ...item, content };
          return true;
        }
        return false;
      }

      if (item.type === "folder") {
        return updateFileContent(item.children, path.slice(1));
      }

      return false;
    };

    if (updateFileContent(newFileSystem, pathParts)) {
      setFileSystem(newFileSystem);
      setUnsavedChanges((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  };

  // Open a file in editor
  const openFile = (path) => {
    if (!path) return;

    const content = getFileContent(path);
    if (content !== null) {
      setSelectedFile(path);
      setCurrentFileContent(content);

      if (!openFiles.includes(path)) {
        setOpenFiles((prev) => [...prev, path]);
      }
    }
  };

  // Close a file tab
  const closeFileTab = (filename, e) => {
    e.stopPropagation();

    // Remove the file from open files
    const newOpenFiles = openFiles.filter((file) => file !== filename);

    // ALSO remove the file from unsaved changes
    setUnsavedChanges((prev) => {
      const next = new Set(prev);
      next.delete(filename);
      return next;
    });

    setOpenFiles(newOpenFiles);

    // If we're closing the currently selected file, select another one
    if (selectedFile === filename && newOpenFiles.length > 0) {
      setSelectedFile(newOpenFiles[0]);
      const content = getFileContent(newOpenFiles[0]);
      if (content !== null) {
        setCurrentFileContent(content);
      }
    } else if (newOpenFiles.length === 0) {
      setSelectedFile(null);
      setCurrentFileContent("");
    }
  };

  // Create a new file
  const createNewFile = () => {
    if (!newItemName) return;

    // Create full path
    const fullPath = [...currentPath, newItemName].join("/");

    // Check if file already exists
    if (getFileContent(fullPath) !== null) {
      toast({
        title: "Error",
        description: `File ${newItemName} already exists`,
        variant: "destructive",
      });
      return;
    }

    // Create a deep copy of the file system
    const newFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Helper function to add a file to the file system
    const addFile = (items, path) => {
      if (path.length === 0) return false;

      if (path.length === 1) {
        // Add new file
        const language = getLanguage(path[0]);

        items.push({
          name: path[0],
          content: "",
          type: "file",
          language,
        });

        return true;
      }

      const currentName = path[0];
      const folder = items.find(
        (item) => item.name === currentName && item.type === "folder"
      );

      if (!folder) {
        // Create folder if it doesn't exist
        const newFolder = {
          name: currentName,
          type: "folder",
          children: [],
        };
        items.push(newFolder);
        return addFile(newFolder.children, path.slice(1));
      }

      return addFile(folder.children, path.slice(1));
    };

    const pathParts = fullPath.split("/");

    if (addFile(newFileSystem, pathParts)) {
      setFileSystem(newFileSystem);
      setNewItemName("");
      setIsCreatingFile(false);

      // Open the newly created file
      setSelectedFile(fullPath);
      setCurrentFileContent("");
      setOpenFiles((prev) => [...prev, fullPath]);
    }
  };

  // Create a new folder
  const createNewFolder = () => {
    if (!newItemName) return;

    // Create full path
    const fullPath = [...currentPath, newItemName].join("/");

    // Create a deep copy of the file system
    const newFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Helper function to add a folder to the file system
    const addFolder = (items, path) => {
      if (path.length === 0) return false;

      if (path.length === 1) {
        // Check if folder already exists
        if (items.some((item) => item.name === path[0])) {
          return false;
        }

        // Add new folder
        items.push({
          name: path[0],
          type: "folder",
          children: [],
        });

        return true;
      }

      const currentName = path[0];
      const folder = items.find(
        (item) => item.name === currentName && item.type === "folder"
      );

      if (!folder) {
        // Create folder if it doesn't exist
        const newFolder = {
          name: currentName,
          type: "folder",
          children: [],
        };
        items.push(newFolder);
        return addFolder(newFolder.children, path.slice(1));
      }

      return addFolder(folder.children, path.slice(1));
    };

    const pathParts = fullPath.split("/");

    if (addFolder(newFileSystem, pathParts)) {
      setFileSystem(newFileSystem);
      setNewItemName("");
      setIsCreatingFolder(false);
    } else {
      toast({
        title: "Error",
        description: `Folder ${newItemName} already exists`,
        variant: "destructive",
      });
    }
  };

  // Delete a file or folder
  const deleteItem = (path) => {
    if (!path) return;

    const pathParts = typeof path === "string" ? path.split("/") : path;

    // Create a deep copy of the file system
    const newFileSystem = JSON.parse(JSON.stringify(fileSystem));

    // Helper function to delete an item from the file system
    const removeItem = (items, path) => {
      if (path.length === 0) return false;

      if (path.length === 1) {
        const itemIndex = items.findIndex((item) => item.name === path[0]);
        if (itemIndex === -1) return false;

        items.splice(itemIndex, 1);
        return true;
      }

      const currentName = path[0];
      const folder = items.find(
        (item) => item.name === currentName && item.type === "folder"
      );

      if (!folder) return false;

      return removeItem(folder.children, path.slice(1));
    };

    if (removeItem(newFileSystem, pathParts)) {
      setFileSystem(newFileSystem);

      // Close the file if it's open
      const fullPath = typeof path === "string" ? path : path.join("/");
      if (openFiles.includes(fullPath)) {
        closeFileTab(fullPath, { stopPropagation: () => {} });
      }

      // Close any child files if deleting a folder
      const pathPrefix = fullPath + "/";
      const filesToClose = openFiles.filter((file) =>
        file.startsWith(pathPrefix)
      );
      filesToClose.forEach((file) => {
        closeFileTab(file, { stopPropagation: () => {} });
      });
    }
  };

  // Navigate to a folder
  const navigateToFolder = (path) => {
    setCurrentPath(path);
  };

  // Get current folder items
  const getCurrentFolderItems = () => {
    if (currentPath.length === 0) {
      return fileSystem;
    }

    let currentItems: FileSystemItem[] = fileSystem;

    for (const part of currentPath) {
      const foundItem = currentItems.find((item) => item.name === part);

      // Check if the found item exists and is a folder before accessing children
      if (!foundItem || foundItem.type !== "folder") {
        return []; // Path segment not found or is not a folder
      }

      currentItems = foundItem.children;
    }

    return currentItems;
  };

  // Setup the project for running
  const setupProject = async () => {
    if (fileSystem.length === 0) return;

    setIsSettingUpProject(true);
    setPreviewUrl(null);

    try {
      // Create a custom event to send commands to the terminal
      const setupEvent = new CustomEvent("terminal-command", {
        detail: { command: "mkdir -p project/src && cd project" },
      });
      document.dispatchEvent(setupEvent);

      // Write all files to the project directory
      await writeFilesToDisk();

      // Check if package.json exists and install dependencies
      if (getFileContent("package.json")) {
        const installEvent = new CustomEvent("terminal-command", {
          detail: { command: "cd project && npm install" },
        });
        document.dispatchEvent(installEvent);
      }

      // Check if we need to install additional dependencies for React
      if (getFileContent("src/App.tsx") || getFileContent("src/App.jsx")) {
        const installReactEvent = new CustomEvent("terminal-command", {
          detail: {
            command:
              "cd project && npm install @vitejs/plugin-react --save-dev",
          },
        });
        document.dispatchEvent(installReactEvent);
      }

      // Start the development server
      const startEvent = new CustomEvent("terminal-command", {
        detail: { command: "cd project && npm run dev" },
      });
      document.dispatchEvent(startEvent);

      // Listen for server URL
      listenForServerUrl();

      toast({
        title: "Project setup started",
        description:
          "Installing dependencies and starting the development server...",
      });
    } catch (error) {
      console.error("Error setting up project:", error);
      toast({
        title: "Setup failed",
        description:
          "Failed to set up the project. Check the terminal for details.",
        variant: "destructive",
      });
    } finally {
      setIsSettingUpProject(false);
    }
  };

  // Write all files to disk through terminal commands
  const writeFilesToDisk = async () => {
    // Recursively process the project structure
    const processDirectory = (structure, currentPath = "project") => {
      structure.forEach((item) => {
        const path = `${currentPath}/${item.name}`;

        if (item.type === "folder") {
          // Create directory
          const mkdirEvent = new CustomEvent("terminal-command", {
            detail: { command: `mkdir -p ${path}` },
          });
          document.dispatchEvent(mkdirEvent);

          // Process children
          processDirectory(item.children, path);
        } else if (item.type === "file") {
          // Write file content
          // Escape content for echo command
          const escapedContent = item.content
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");

          const writeEvent = new CustomEvent("terminal-command", {
            detail: { command: `echo "${escapedContent}" > ${path}` },
          });
          document.dispatchEvent(writeEvent);
        }
      });
    };

    processDirectory(fileSystem);
  };

  // Listen for server URL in terminal output
  const listenForServerUrl = () => {
    const handleTerminalOutput = (event) => {
      const output = event.detail.output;

      // Look for local development server URL
      const urlMatch = output.match(/(https?:\/\/localhost:[0-9]+)/i);
      if (urlMatch && urlMatch[1]) {
        setPreviewUrl(urlMatch[1]);

        // Remove listener once URL is found
        document.removeEventListener("terminal-output", handleTerminalOutput);

        toast({
          title: "Development server running",
          description: `Server started at ${urlMatch[1]}`,
        });
      }
    };

    document.addEventListener("terminal-output", handleTerminalOutput);
  };

  // Render file tree recursively
  const renderFileTree = (items, path = []) => {
    return items.map((item) => {
      const itemPath = [...path, item.name];
      const fullPath = itemPath.join("/");

      if (item.type === "folder") {
        return (
          <div key={fullPath} className="ml-2">
            <div
              className="flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
              onClick={() => navigateToFolder(itemPath)}
            >
              <span className="devicon-folder-plain colored mr-2"></span>
              <span className="text-sm">{item.name}</span>
              <button
                className="ml-auto text-gray-500 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(itemPath);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {currentPath.join("/") === itemPath.join("/") && (
              <div className="ml-4 border-l pl-2 border-gray-200 dark:border-gray-700">
                {renderFileTree(item.children, itemPath)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={fullPath}
            className={`ml-4 py-1 px-2 flex items-center text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer ${
              selectedFile === fullPath ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            onClick={() => openFile(fullPath)}
          >
            <i className={`${getDeviconClass(item.name)} text-sm mr-2`}></i>
            {item.name}
            <button
              className="ml-auto text-gray-500 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(itemPath);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      }
    });
  };

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    const crumbs = [
      <span
        key="root"
        className="text-sm cursor-pointer hover:text-blue-500"
        onClick={() => navigateToFolder([])}
      >
        root
      </span>,
    ];

    let path = [];

    for (const part of currentPath) {
      path.push(part);

      crumbs.push(
        <span key={`separator-${part}`} className="text-gray-500 mx-1">
          /
        </span>
      );

      crumbs.push(
        <span
          key={`path-${part}`}
          className="text-sm cursor-pointer hover:text-blue-500"
          onClick={() => navigateToFolder([...path])}
        >
          {part}
        </span>
      );
    }

    return <div className="flex items-center mb-2 px-2">{crumbs}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] rounded-lg border shadow-sm overflow-hidden">
      <div className="p-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium text-lg">Code Editor</h3>
          <p className="text-sm text-muted-foreground">
            Edit code and use terminal
          </p>
        </div>
        <div className="flex gap-2">
          {/* Typing effect controls */}
          {isTyping && (
            <div className="flex items-center mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTypingPause}
                className="mr-1 dark:bg-[#1a1a1a]"
              >
                {typingPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={skipTyping}
                className="dark:bg-[#1a1a1a]"
              >
                Skip
              </Button>
            </div>
          )}

          {selectedFile && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedFile) {
                    navigator.clipboard.writeText(currentFileContent);
                    toast({
                      title: "Code copied",
                      description: `${selectedFile} copied to clipboard`,
                    });
                  }
                }}
                className="dark:bg-[#1a1a1a]"
              >
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            </>
          )}

          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, "_blank")}
              className="dark:bg-[#1a1a1a]"
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Open Preview
            </Button>
          )}
        </div>
      </div>

      {/* Editor Section */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={60} minSize={20}>
          <div className="flex relative overflow-hidden transition-all duration-200 h-full">
            {/* Collapsible sidebar with integrated toggle button */}
            <div className="relative flex h-full">
              {/* Sidebar content */}
              <div
                className={`transition-all duration-300 border-r bg-white dark:bg-[#1a1a1a] ${
                  sidebarCollapsed
                    ? "w-0 opacity-0 overflow-hidden"
                    : "w-64 opacity-100"
                }`}
              >
                <div className="p-2 overflow-auto h-full">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium px-2">Files</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsCreatingFile(true)}
                      >
                        <FilePlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsCreatingFolder(true)}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Breadcrumb navigation */}
                  {renderBreadcrumbs()}

                  {/* File creation dialog */}
                  {isCreatingFile && (
                    <div className="mb-2 p-2 border rounded">
                      <Label htmlFor="new-file">New File</Label>
                      <div className="flex mt-1">
                        <Input
                          id="new-file"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="filename.ext"
                          className="text-sm h-8"
                        />
                        <Button
                          size="sm"
                          className="ml-1 h-8"
                          onClick={createNewFile}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Folder creation dialog */}
                  {isCreatingFolder && (
                    <div className="mb-2 p-2 border rounded">
                      <Label htmlFor="new-folder">New Folder</Label>
                      <div className="flex mt-1">
                        <Input
                          id="new-folder"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="folder name"
                          className="text-sm h-8"
                        />
                        <Button
                          size="sm"
                          className="ml-1 h-8"
                          onClick={createNewFolder}
                        >
                          Create
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* File tree */}
                  <div className="space-y-1">
                    {renderFileTree(getCurrentFolderItems())}
                  </div>
                </div>
              </div>

              {/* Toggle sidebar button - attached to the sidebar */}
              <button
                className={`h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:hover:bg-gray-700 border-t border-b border-r border-gray-200 dark:border-gray-700 transition-all duration-300 text-gray-600 dark:text-gray-300 ${
                  sidebarCollapsed ? "rounded-r-md" : ""
                }`}
                onClick={toggleSidebar}
                style={{
                  width: "16px",
                  position: sidebarCollapsed ? "relative" : "absolute",
                  left: sidebarCollapsed ? "0" : "256px",
                  top: sidebarCollapsed ? "auto" : "0",
                }}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-x-auto">
              <div className="flex items-center justify-between bg-gray-100 dark:bg-[#1a1a1a] px-2 border-b">
                <div className="flex items-center overflow-x-auto">
                  {openFiles.map((file) => (
                    <div
                      key={file}
                      className={`flex items-center h-8 px-3 text-xs ${
                        selectedFile === file
                          ? "bg-white dark:bg-[#1a1a1a] border-t border-r border-l border-gray-200 dark:border-gray-700 border-b-0 rounded-t"
                          : "text-gray-600 dark:text-gray-400"
                      } cursor-pointer`}
                      onClick={() => {
                        setSelectedFile(file);
                        const content = getFileContent(file);
                        if (content !== null) {
                          setCurrentFileContent(content);
                        }
                      }}
                    >
                      <span
                        className={`flex items-center gap-2 ${
                          selectedFile === file
                            ? "text-blue-600 dark:text-blue-400"
                            : ""
                        }`}
                      >
                        <i
                          className={`${getDeviconClass(
                            file.split("/").pop() || ""
                          )} text-sm`}
                        ></i>
                        {file.split("/").pop()}
                        {/* Unsaved indicator */}
                        {unsavedChanges.has(file) && (
                          <Save className="ml-1 h-3 w-3 text-foreground" />
                        )}
                      </span>
                      <button
                        className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={(e) => closeFileTab(file, e)}
                      >
                        <span className="text-xs">×</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monaco editor */}
              <div className="flex-1">
                <React.Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      Loading editor...
                    </div>
                  }
                >
                  {selectedFile ? (
                    <MonacoEditor
                      height="100%"
                      language={getLanguage(
                        selectedFile.split("/").pop() || ""
                      )}
                      value={currentFileContent}
                      theme={editorTheme}
                      onChange={handleEditorChange}
                      onMount={handleEditorDidMount}
                      options={{
                        minimap: { enabled: true },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: "on",
                        automaticLayout: true,
                        readOnly: isTyping,
                        lineNumbers: "on",
                        folding: true,
                        renderLineHighlight: "all",
                        scrollbar: {
                          useShadows: false,
                          verticalHasArrows: false,
                          horizontalHasArrows: false,
                          vertical: "auto",
                          horizontal: "auto",
                        },
                        lineNumbersMinChars: 3,
                        padding: {
                          top: 12,
                          bottom: 12,
                        },
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <FileCode className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-xl font-medium mb-2">No file open</h3>
                      <p className="text-gray-500 max-w-md">
                        Use the AI Assistant to generate a project, or create
                        files manually from the sidebar.
                      </p>
                    </div>
                  )}
                </React.Suspense>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {/* Resize handle */}
        <ResizableHandle withHandle />

        {/* Terminal Section */}
        <ResizablePanel defaultSize={8} minSize={8}>
          <div className="flex flex-col h-full">
            {/* Preview section */}
            {previewUrl && (
              <div className="border-b p-2 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">
                    Live Preview:
                  </span>
                  <span className="text-sm text-blue-500">{previewUrl}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
                </Button>
              </div>
            )}

            {/* Terminal */}
            <div className="flex-1 relative">
              <TerminalPanel className="h-full w-full" ref={terminalRef} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
