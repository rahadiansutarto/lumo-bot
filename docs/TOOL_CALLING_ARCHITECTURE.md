# Tool Calling Architecture

## Overview

This is a **server-controlled tool calling system** where:
- The LLM (Claude) can REQUEST tools but never executes them
- All tool execution happens on the server
- The system is model-agnostic (works with Claude, can adapt to OpenAI, etc.)

## Architecture Flow

```
User Message → Orchestrator → Claude (with system prompt)
                    ↓
        Claude requests tool (XML+JSON format)
                    ↓
        Server validates & executes tool
                    ↓
        Tool result → back to Claude
                    ↓
        Claude formulates answer → User
```

## File Structure

```
src/
├── orchestrator.ts          # Main control loop
├── llm/
│   └── claude.ts           # Claude API wrapper
├── tools/
│   ├── index.ts            # Tool registry
│   └── searchDocs.ts       # Example tool
├── prompts.ts              # System prompts
└── types.ts                # Shared types
```

## Key Components

### 1. Orchestrator (`src/orchestrator.ts`)
- Main entry point: `orchestrate(userMessage)`
- Manages conversation loop
- Detects tool requests via XML tags
- Validates tools exist
- Executes tools safely
- Prevents infinite loops (max 10 iterations)

### 2. Claude Client (`src/llm/claude.ts`)
- Thin wrapper around Anthropic Foundry SDK
- Single function: `callClaude({ system, messages })`
- Handles API credentials
- Returns text response

### 3. Tool Registry (`src/tools/index.ts`)
- Central Map of tool name → implementation
- Each tool implements the `Tool` interface
- Provides `getToolDescriptions()` for system prompt

### 4. System Prompt (`src/prompts.ts`)
- Instructs Claude on tool request format
- Lists available tools dynamically
- Enforces strict XML+JSON format
- Prevents hallucinated tool execution

## Tool Request Format

Claude must output:

```xml
<tool_call>
{
  "tool": "toolName",
  "parameters": {
    "param": "value"
  }
}
</tool_call>
```

No other text is allowed when requesting a tool.

## Adding a New Tool

1. Create tool file in `src/tools/`:

```typescript
import { Tool } from "./index";

export const myTool: Tool = {
  name: "myTool",
  description: "What this tool does",
  parameters: {
    paramName: {
      type: "string",
      description: "What this parameter is for",
      required: true,
    },
  },
  async execute(params: Record<string, any>) {
    // Validate parameters
    if (!params.paramName) {
      throw new Error("paramName is required");
    }
    
    // Execute logic
    const result = await doSomething(params.paramName);
    
    return result;
  },
};
```

2. Register in `src/tools/index.ts`:

```typescript
import { myTool } from "./myTool";

export const toolRegistry = new Map<string, Tool>([
  ["searchDocs", searchDocs],
  ["myTool", myTool],  // Add here
]);
```

That's it! The tool is now available to Claude.

## Integration with Slack Bot

In your `slack-bot.ts`, replace:

```typescript
// OLD
const reply = await getClaude(rawText);

// NEW
import { orchestrate } from "./src/orchestrator";
const { response } = await orchestrate(rawText);
```

## Safety Features

1. **Tool Validation**: Only registered tools can execute
2. **Parameter Validation**: Each tool validates its inputs
3. **Error Handling**: Tool errors are caught and reported to Claude
4. **Iteration Limit**: Max 10 loops prevents infinite tool calling
5. **Defensive Parsing**: Malformed JSON doesn't crash the system

## Model Agnostic Design

To switch from Claude to OpenAI:

1. Create `src/llm/openai.ts` with same interface
2. Update orchestrator to use new client
3. Adjust system prompt format if needed
4. Tool registry stays the same ✅

## Testing Tool Calling

Test with messages like:
- "Search our docs for API authentication"
- "Find information about deployment"
- "What's 2+2?" (should respond directly without tools)

Claude will automatically decide when to use tools vs. respond directly.
