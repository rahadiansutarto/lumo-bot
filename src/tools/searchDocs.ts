import { Tool } from "./index";

/**
 * Search documentation tool
 * 
 * This is an example tool that demonstrates the tool interface.
 * In production, this would integrate with a real documentation search system
 * (e.g., Algolia, Elasticsearch, vector database, etc.)
 */
export const searchDocs: Tool = {
  name: "searchDocs",
  description: "Search internal documentation for relevant information",

  parameters: {
    query: {
      type: "string",
      description: "The search query to find relevant documentation",
      required: true,
    },
  },

  /**
   * Execute documentation search
   * 
   * @param params - Must contain 'query' string
   * @returns Search results with relevant documentation snippets
   */
  async execute(params: Record<string, any>): Promise<any> {
    // Validate required parameters
    if (!params.query || typeof params.query !== "string") {
      throw new Error("Parameter 'query' is required and must be a string");
    }

    const query = params.query.trim();

    if (query.length === 0) {
      throw new Error("Search query cannot be empty");
    }

    // In production, replace this with actual search implementation
    // Examples:
    // - Call to Algolia/Elasticsearch
    // - Vector similarity search
    // - Full-text search in database
    // - API call to documentation service

    // Mock search results for demonstration
    const mockResults = await performMockSearch(query);

    return {
      query,
      results: mockResults,
      resultCount: mockResults.length,
    };
  },
};

/**
 * Mock search implementation
 * Replace this with your actual search logic
 */
async function performMockSearch(query: string): Promise<any[]> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Mock documentation database
  const mockDocs = [
    {
      id: "doc-001",
      title: "Getting Started Guide",
      content:
        "This guide will help you get started with our platform. Follow these steps...",
      relevance: 0.95,
    },
    {
      id: "doc-002",
      title: "API Authentication",
      content:
        "To authenticate API requests, include your API key in the Authorization header...",
      relevance: 0.87,
    },
    {
      id: "doc-003",
      title: "Best Practices",
      content:
        "Follow these best practices for optimal performance and security...",
      relevance: 0.72,
    },
  ];

  // Simple keyword matching (replace with real search)
  const lowerQuery = query.toLowerCase();
  const filtered = mockDocs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery)
  );

  // Return top 3 results
  return filtered
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      snippet: doc.content.substring(0, 200) + "...",
      relevance: doc.relevance,
    }));
}
