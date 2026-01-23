import { searchDocs } from "./searchDocs";
import { attio } from "./attio";
import { googleCalendar } from "./googleCalendar";

/**
 * Tool interface that all tools must implement
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * Central tool registry
 * 
 * All available tools must be registered here.
 * The orchestrator uses this registry to validate and execute tool requests.
 */
export const toolRegistry = new Map<string, Tool>([
  ["searchDocs", searchDocs],
  ["attio", attio],
  ["googleCalendar", googleCalendar],
]);

/**
 * Generate tool descriptions for system prompt
 * 
 * Formats all registered tools into a readable list
 * that can be included in the LLM's system prompt.
 */
export function getToolDescriptions(): string {
  const tools = Array.from(toolRegistry.values());

  return tools
    .map((tool) => {
      const params = Object.entries(tool.parameters)
        .map(([name, config]) => {
          const required = config.required ? "required" : "optional";
          return `    - ${name} (${config.type}, ${required}): ${config.description}`;
        })
        .join("\n");

      return `- ${tool.name}: ${tool.description}\n  Parameters:\n${params}`;
    })
    .join("\n\n");
}
