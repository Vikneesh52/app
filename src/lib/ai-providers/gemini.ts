import { ProjectConfig } from "../project-generator";
export interface GeminiResponse {
  text: string;
  code?: string;
  mermaidCode?: string;
  error?: string;
  config?: ProjectConfig;
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-2.5-flash-preview-04-17";
  }

  // Helper function to sanitize Mermaid labels and edge names
  private sanitizeMermaidLabel(label: string): string {
    return label
      .replace(/[()":']/g, "") // Remove problematic characters
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  // Extract only text content, removing all code blocks
  private extractTextOnly(fullText: string): string {
    if (!fullText) return "";

    // Remove all code blocks (mermaid, html, js, jsx, tsx, ts, css, etc.)
    const cleanedText = fullText
      .replace(/```(?:mermaid|html|js|jsx|tsx|ts|css|[^\s]*)?[\s\S]*?```/g, "")
      .trim();

    // If after removing code blocks we have nothing left, return something meaningful from the original text
    if (!cleanedText && fullText) {
      // Try to extract the first paragraph or sentence if there are no code blocks
      const firstParagraph = fullText.split("\n\n")[0]?.trim();
      if (firstParagraph && !firstParagraph.includes("```")) {
        return firstParagraph;
      }
    }

    return cleanedText;
  }

  // Extract all code blocks except mermaid
  private extractCodeBlocks(fullText: string): string {
    const codeRegex = /```(?!mermaid)([^\s]*)?[\s\S]*?```/g;
    let match: RegExpExecArray | null;
    let extractedCode = "";
    const tempText = fullText.replace(/```mermaid[\s\S]*?```/g, ""); // Remove mermaid blocks first

    // Match all remaining code blocks
    while ((match = codeRegex.exec(tempText)) !== null) {
      const codeContent = match[0]
        .replace(/```[^\s]*?\s*\n/, "")
        .replace(/\s*```$/, "");
      extractedCode += codeContent + "\n\n";
    }

    return extractedCode.trim();
  }

  // Extract only mermaid code block
  private extractMermaidCode(fullText: string): string | undefined {
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/;
    const mermaidMatch = fullText.match(mermaidRegex);

    if (mermaidMatch) {
      // Sanitize mermaid code
      return mermaidMatch[1]
        .trim()
        .split("\n")
        .map((line) => this.sanitizeMermaidLabel(line))
        .join("\n");
    }

    return undefined;
  }

  async generateContent(prompt: string): Promise<GeminiResponse> {
    try {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          text: "",
          error: data.error?.message || "Failed to generate content",
        };
      }

      const fullText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      return {
        text: this.extractTextOnly(fullText),
        code: this.extractCodeBlocks(fullText) || undefined,
        mermaidCode: this.extractMermaidCode(fullText),
      };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return {
        text: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async generateWebApp(prompt: string): Promise<GeminiResponse> {
    try {
      // First, extract project configuration from the prompt
      const configPrompt = `Based on the following user requirements, determine the best configuration for a web application project. Return ONLY a JSON object with the following structure:
      {
        "type": "frontend" or "backend" or "fullstack",
        "language": "javascript" or "typescript",
        "frontend": {
          "framework": "react" or "nextjs",
          "styling": "tailwind" or "css",
          "features": [array of features like "auth", "api", "darkmode", etc.]
        },
        "backend": {
          "framework": "express" or "nest" or other backend framework,
          "database": "mongodb" or "postgres" or "supabase" or "none"
        },
        "name": "project-name",
        "description": "Brief project description"
      }
      User requirements: ${prompt}
      Only return the JSON object, no explanation or other text.`;

      // Generate configuration based on prompt
      const configResponse = await this.generateContent(configPrompt);

      // Parse the configuration JSON
      let config;
      try {
        // Extract JSON from the response text
        const configText = configResponse.text || "{}";
        // Find JSON object in the text (in case there's extra text)
        const jsonMatch = configText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : "{}";
        config = JSON.parse(jsonString);
      } catch (error) {
        console.error("Error parsing configuration:", error);
        config = {
          type: "frontend",
          language: "typescript",
          frontend: {
            framework: "react",
            styling: "tailwind",
            features: [],
          },
          name: "default-project",
          description: "Web application generated from user prompt",
        };
      }

      // Generate the web app code and description using the extracted configuration
      const webAppPrompt = `Create a complete web application based on the following requirements and configuration:
      
      User requirements: ${prompt}
      
      Project configuration:
      - Project type: ${config.type}
      - Language: ${config.language}
      - Frontend framework: ${config.frontend?.framework || "react"}
      - Styling: ${config.frontend?.styling || "tailwind"}
      - Features to implement: ${JSON.stringify(
        config.frontend?.features || []
      )}
      ${
        config.type !== "frontend"
          ? `- Backend framework: ${config.backend?.framework || "express"}
      - Database: ${config.backend?.database || "none"}`
          : ""
      }
      - Project name: ${config.name}
      
      Structure your response like this:
      - First, write a paragraph or two explaining the web application, its features, and how it works
      - Then provide the complete code with proper imports and component structure
      - Use ${config.frontend?.styling || "Tailwind CSS"} for styling
      - Include proper routing (${
        config.frontend?.framework === "nextjs"
          ? "App Router for Next.js"
          : "React Router for React"
      })
      - Organize code into separate components
      IMPORTANT: Return the code in properly formatted code blocks for each file.`;

      const webAppResponse = await this.generateContent(webAppPrompt);

      // Then generate a mermaid diagram based on the generated code and configuration
      const mermaidPrompt = `Generate a Mermaid diagram that visualizes the key components and flow of the following web application.
      
      Project configuration:
      - Project type: ${config.type}
      - Frontend framework: ${config.frontend?.framework || "react"}
      ${
        config.type !== "frontend"
          ? `- Backend framework: ${config.backend?.framework || "express"}
      - Database: ${config.backend?.database || "none"}`
          : ""
      }
      
      Application code:
      \`\`\`
      ${webAppResponse.code || "No code generated."}
      \`\`\`
      
      Use graph TD notation with proper syntax. Use sequential letters (A, B, C, etc.) as node IDs, followed by descriptive labels in square brackets.
      The diagram should follow this pattern:
      A[ComponentName] --> B[ComponentName];
      B -- action --> C[ComponentName];
      
      Include both component connections with arrows and labeled actions between components.
      Show the data flow between frontend and backend components if applicable.
      Only return the Mermaid diagram code without any explanation. The diagram should be detailed and correctly formatted.`;

      const mermaidResponse = await this.generateContent(mermaidPrompt);

      // Create a fallback mermaid diagram if none was returned
      let finalMermaidCode = mermaidResponse.mermaidCode;
      if (!finalMermaidCode) {
        // Create a basic diagram as fallback based on the configuration
        if (config.type === "fullstack") {
          finalMermaidCode = `graph TD
            A[User] --> B[Frontend - ${config.frontend?.framework || "React"}]
            B --> C[API Routes]
            C --> D[Backend - ${config.backend?.framework || "Express"}]
            D --> E[Database - ${config.backend?.database || "None"}]
            E --> D
            D --> C
            C --> B`;
        } else if (config.type === "frontend") {
          finalMermaidCode = `graph TD
            A[User] --> B[Frontend App]
            B --> C[Components]
            C --> D[State Management]
            D --> C
            C --> E[API Services]
            E --> F[External APIs]
            F --> E
            E --> C`;
        } else {
          finalMermaidCode = `graph TD
            A[Client Request] --> B[API Routes]
            B --> C[Controllers]
            C --> D[Services]
            D --> E[Database - ${config.backend?.database || "None"}]
            E --> D
            D --> C
            C --> B
            B --> F[Client Response]`;
        }
      }

      // Return combined response with guaranteed fields
      return {
        text: webAppResponse.text || "",
        code: webAppResponse.code || "",
        mermaidCode: finalMermaidCode,
        config: config,
        error: webAppResponse.error || mermaidResponse.error,
      };
    } catch (error) {
      console.error("Error generating web app:", error);
      return {
        text: "Failed to generate the web application.",
        code: "",
        mermaidCode: "graph TD\n  A[Error] --> B[Error Occurred]",
        config: {
          type: "frontend",
          language: "typescript",
          name: "error-project",
        },
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
