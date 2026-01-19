import { Tool } from "./index";
import { fetchWithRetry } from "../utils/retry";
import { logger } from "../logger";
import {
  AttioQueryResponse,
  AttioPerson,
  AttioCompany,
  AttioDeal,
  FormattedPerson,
  FormattedCompany,
  FormattedDeal,
  AttioToolResponse,
  AttioAttributeValue,
} from "../types/attio";

/**
 * Attio CRM integration tool
 * 
 * Allows the chatbot to search and retrieve information from Attio CRM.
 * Supports searching people, companies, and deals.
 */
export const attio: Tool = {
  name: "attio",
  description: "Search and retrieve information from Attio CRM (people, companies, deals)",

  parameters: {
    action: {
      type: "string",
      description: "Action to perform: 'list_people', 'list_companies', 'list_deals', 'search_people', 'search_companies', 'search_deals'",
      required: true,
    },
    query: {
      type: "string",
      description: "Search query to filter results (optional for list actions)",
      required: false,
    },
  },

  /**
   * Execute Attio API request
   * 
   * @param params - Must contain 'action', optionally 'query'
   * @returns Data from Attio CRM
   */
  async execute(params: Record<string, any>): Promise<any> {
    // Validate required parameters
    if (!params.action || typeof params.action !== "string") {
      throw new Error("Parameter 'action' is required and must be a string");
    }

    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error("ATTIO_API_KEY environment variable is not set");
    }

    const action = params.action.trim().toLowerCase();
    const query = params.query ? params.query.trim().toLowerCase() : "";

    // Route to appropriate Attio API endpoint
    switch (action) {
      case "list_people":
      case "search_people":
        return await listPeople(apiKey, query);
      
      case "list_companies":
      case "search_companies":
        return await listCompanies(apiKey, query);
      
      case "list_deals":
      case "search_deals":
        return await listDeals(apiKey, query);
      
      default:
        throw new Error(
          `Unknown action: ${action}. Valid actions: list_people, list_companies, list_deals, search_people, search_companies, search_deals`
        );
    }
  },
};

/**
 * Helper to extract value from Attio attribute array
 */
function extractValue(attrArray: any[]): string {
  if (!attrArray || attrArray.length === 0) return "";
  const first = attrArray[0];
  
  // Handle personal-name type
  if (first.full_name) return first.full_name;
  
  // Handle email-address type
  if (first.email_address) return first.email_address;
  
  // Handle text type
  if (first.value !== undefined) return String(first.value);
  
  return "";
}

/**
 * List/Search for people in Attio
 */
async function listPeople(apiKey: string, query: string): Promise<AttioToolResponse> {
  const response = await fetchWithRetry("https://api.attio.com/v2/objects/people/records/query", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit: 50, // Get more records to filter client-side
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio API error (${response.status}): ${error}`);
  }

  const data = await response.json() as AttioQueryResponse<AttioPerson>;
  const allRecords = data.data || [];
  
  // Format records into readable format
  let formattedRecords: FormattedPerson[] = allRecords.map((record) => {
    const name = extractValue(record.values?.name || []);
    const email = extractValue(record.values?.email_addresses || []);
    const jobTitle = extractValue(record.values?.job_title || []);
    const description = extractValue(record.values?.description || []);
    
    return {
      id: record.id?.record_id,
      name,
      email,
      job_title: jobTitle,
      description,
      web_url: record.web_url,
    };
  });
  
  // Filter if query provided
  if (query) {
    formattedRecords = formattedRecords.filter((person) => {
      const searchableText = `${person.name} ${person.email} ${person.job_title} ${person.description}`.toLowerCase();
      return searchableText.includes(query);
    });
  }
  
  return {
    action: "list_people",
    query: query || "all",
    results: formattedRecords.slice(0, 10), // Return top 10
    count: formattedRecords.length,
    total_fetched: allRecords.length,
  };
}

/**
 * List/Search for companies in Attio
 */
async function listCompanies(apiKey: string, query: string): Promise<AttioToolResponse> {
  const response = await fetchWithRetry("https://api.attio.com/v2/objects/companies/records/query", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit: 50, // Get more records to filter client-side
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio API error (${response.status}): ${error}`);
  }

  const data = await response.json() as any;
  const allRecords = data.data || [];
  
  // Format records into readable format
  let formattedRecords = allRecords.map((record: any) => {
    const name = extractValue(record.values?.name);
    const description = extractValue(record.values?.description);
    
    // Extract domains (might be array)
    let domains = "";
    if (record.values?.domains && record.values.domains.length > 0) {
      domains = record.values.domains[0].domain || "";
    }
    
    // Extract location
    let location = "";
    if (record.values?.primary_location && record.values.primary_location.length > 0) {
      const loc = record.values.primary_location[0];
      location = loc.locality || loc.region || loc.country_code || "";
    }
    
    return {
      id: record.id?.record_id,
      name,
      domains,
      description,
      location,
      web_url: record.web_url,
    };
  });
  
  // Filter if query provided
  if (query) {
    formattedRecords = formattedRecords.filter((company: any) => {
      const searchableText = `${company.name} ${company.domains} ${company.description} ${company.location}`.toLowerCase();
      return searchableText.includes(query);
    });
  }
  
  return {
    action: "list_companies",
    query: query || "all",
    results: formattedRecords.slice(0, 10), // Return top 10
    count: formattedRecords.length,
    total_fetched: allRecords.length,
  };
}

/**
 * Helper to extract select/status option value
 */
function extractSelectOption(attrArray: any[]): string {
  if (!attrArray || attrArray.length === 0) return "";
  const first = attrArray[0];
  
  // Handle select type
  if (first.option?.title) return first.option.title;
  
  // Handle status type
  if (first.status?.title) return first.status.title;
  
  return "";
}

/**
 * Helper to extract actor/owner reference
 */
function extractActor(attrArray: any[]): string {
  if (!attrArray || attrArray.length === 0) return "";
  const first = attrArray[0];
  
  if (first.referenced_actor_id) return first.referenced_actor_id;
  
  return "";
}

/**
 * Helper to extract company reference name
 */
function extractCompanyRef(attrArray: any[]): string {
  if (!attrArray || attrArray.length === 0) return "";
  const first = attrArray[0];
  
  if (first.target_record_id) return first.target_record_id;
  
  return "";
}

/**
 * List/Search for deals in Attio
 */
async function listDeals(apiKey: string, query: string): Promise<AttioToolResponse> {
  const response = await fetchWithRetry("https://api.attio.com/v2/objects/deals/records/query", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit: 50, // Get more records to filter client-side
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Attio API error (${response.status}): ${error}`);
  }

  const data = await response.json() as any;
  const allRecords = data.data || [];
  
  // Format records into readable format
  let formattedRecords = allRecords.map((record: any) => {
    const name = extractValue(record.values?.name);
    const stage = extractSelectOption(record.values?.stage);
    const value = extractValue(record.values?.value);
    const confidence = extractSelectOption(record.values?.confidence);
    const business_function = extractSelectOption(record.values?.business_function);
    const playbook = extractSelectOption(record.values?.playbook);
    const geography = extractSelectOption(record.values?.geography);
    const business_unit = extractSelectOption(record.values?.business_unit);
    const entity = extractSelectOption(record.values?.entity);
    const delivered = extractSelectOption(record.values?.delivered);
    const source_of_lead = extractSelectOption(record.values?.source_of_lead_4);
    const owner = extractActor(record.values?.owner);
    const associated_company = extractCompanyRef(record.values?.associated_company);
    
    return {
      id: record.id?.record_id,
      name,
      stage,
      value,
      confidence,
      business_function,
      playbook,
      geography,
      business_unit,
      entity,
      delivered,
      source_of_lead,
      owner,
      associated_company,
      web_url: record.web_url,
    };
  });
  
  // Filter if query provided
  if (query) {
    formattedRecords = formattedRecords.filter((deal: any) => {
      const searchableText = `${deal.name} ${deal.stage} ${deal.business_function} ${deal.geography} ${deal.business_unit}`.toLowerCase();
      return searchableText.includes(query);
    });
  }
  
  return {
    action: "list_deals",
    query: query || "all",
    results: formattedRecords.slice(0, 10), // Return top 10
    count: formattedRecords.length,
    total_fetched: allRecords.length,
  };
}



