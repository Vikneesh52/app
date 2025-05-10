export interface GeminiResponse {
  text: string;
  code?: string;
  mermaidCode?: string;
  error?: string;
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
    this.model = config.model || "gemini-1.5-pro";
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

  // Extract only mermaid code block and ensure it's valid
  private extractMermaidCode(fullText: string): string | undefined {
    const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/;
    const mermaidMatch = fullText.match(mermaidRegex);

    if (mermaidMatch) {
      // Sanitize mermaid code
      const sanitizedCode = mermaidMatch[1]
        .trim()
        .split("\n")
        .map((line) => this.sanitizeMermaidLabel(line))
        .join("\n");

      // Ensure the code starts with a valid diagram type
      if (
        !sanitizedCode.match(
          /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)\s/,
        )
      ) {
        return `flowchart TD\n${sanitizedCode}`;
      }

      return sanitizedCode;
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
      // First generate the web app code and description
      const webAppPrompt = `Create a complete web application based on the following requirements.
Please provide:
1. A brief explanation of the web application (this will be returned as text)
2. The complete code in properly formatted code blocks

User requirements: ${prompt}

Structure your response like this:
- First, write a paragraph or two explaining the web application, its features, and how it works
- Then provide the complete code for a single-page application with:
  a. HTML structure
  b. CSS styles (Tailwind preferred)
  c. JavaScript functionality

IMPORTANT: Return the complete code in a single HTML file with embedded CSS and JS.`;

      const webAppResponse = await this.generateContent(webAppPrompt);

      // Then generate a mermaid diagram separately to ensure we get a good one
      const mermaidPrompt = `Generate a Mermaid diagram that visualizes the key components and flow of a web application based on the following requirements.

Use flowchart TD notation with proper syntax. The diagram should show the user flow and component relationships.

User requirements: ${prompt}

Only return the Mermaid diagram code without any explanation. The diagram should be detailed and correctly formatted.

Ensure your response starts with "flowchart TD" and uses proper Mermaid syntax for nodes and connections.
Example format:
flowchart TD
  A[Component] --> B[Component]
  A -- action --> C[Component]
  B --> D[Component]
  C --> D`;

      const mermaidResponse = await this.generateContent(mermaidPrompt);

      // Create a fallback mermaid diagram if none was returned
      let finalMermaidCode = mermaidResponse.mermaidCode;
      if (!finalMermaidCode) {
        // Create a basic diagram as fallback
        finalMermaidCode = `flowchart TD
    User[User] --> App[Web Application]
    App --> UI[User Interface]
    UI --> Logic[Business Logic]
    Logic --> Data[Data Management]`;
      } else if (
        !finalMermaidCode.trim().startsWith("flowchart") &&
        !finalMermaidCode.trim().startsWith("graph")
      ) {
        // Ensure the diagram starts with a valid declaration
        finalMermaidCode = `flowchart TD
${finalMermaidCode}`;
      }

      // Return combined response with guaranteed fields
      return {
        text: webAppResponse.text || "",
        code: webAppResponse.code || "",
        mermaidCode: finalMermaidCode,
        error: webAppResponse.error || mermaidResponse.error,
      };
    } catch (error) {
      console.error("Error generating web app:", error);
      return {
        text: "Failed to generate the web application.",
        code: "",
        mermaidCode: "flowchart TD\n    Error[Error Occurred]",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
