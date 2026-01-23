/**
 * TypeScript interfaces for Attio API responses
 * 
 * Provides type safety for API interactions and helps catch
 * breaking changes when Attio updates their API.
 */

/**
 * Base Attio record ID structure
 */
export interface AttioRecordId {
  workspace_id: string;
  object_id: string;
  record_id: string;
}

/**
 * Actor who created or modified a record
 */
export interface AttioActor {
  type: "system" | "workspace-member" | "api";
  id: string | null;
}

/**
 * Base attribute value structure
 */
export interface AttioAttributeBase {
  active_from: string;
  active_until: string | null;
  created_by_actor: AttioActor;
  attribute_type: string;
}

/**
 * Text attribute value
 */
export interface AttioTextAttribute extends AttioAttributeBase {
  attribute_type: "text";
  value: string;
}

/**
 * Personal name attribute value
 */
export interface AttioPersonalNameAttribute extends AttioAttributeBase {
  attribute_type: "personal-name";
  first_name: string;
  last_name: string;
  full_name: string;
}

/**
 * Email address attribute value
 */
export interface AttioEmailAttribute extends AttioAttributeBase {
  attribute_type: "email-address";
  original_email_address: string;
  email_address: string;
  email_domain: string;
  email_root_domain: string;
  email_local_specifier: string;
}

/**
 * Number attribute value
 */
export interface AttioNumberAttribute extends AttioAttributeBase {
  attribute_type: "number";
  value: number;
}

/**
 * Select/option attribute value
 */
export interface AttioSelectAttribute extends AttioAttributeBase {
  attribute_type: "select";
  option: {
    id: {
      workspace_id: string;
      object_id: string;
      attribute_id: string;
      option_id: string;
    };
    title: string;
    is_archived: boolean;
  };
}

/**
 * Status attribute value
 */
export interface AttioStatusAttribute extends AttioAttributeBase {
  attribute_type: "status";
  status: {
    id: {
      workspace_id: string;
      object_id: string;
      attribute_id: string;
      status_id: string;
    };
    title: string;
    is_archived: boolean;
    target_time_in_status: number | null;
    celebration_enabled: boolean;
  };
}

/**
 * Record reference attribute value
 */
export interface AttioRecordReferenceAttribute extends AttioAttributeBase {
  attribute_type: "record-reference";
  target_object: string;
  target_record_id: string;
}

/**
 * Actor reference attribute value
 */
export interface AttioActorReferenceAttribute extends AttioAttributeBase {
  attribute_type: "actor-reference";
  referenced_actor_type: string;
  referenced_actor_id: string | null;
}

/**
 * Location attribute value
 */
export interface AttioLocationAttribute extends AttioAttributeBase {
  attribute_type: "location";
  line_1: string | null;
  line_2: string | null;
  line_3: string | null;
  line_4: string | null;
  locality: string | null;
  region: string | null;
  postcode: string | null;
  country_code: string | null;
  latitude: string | null;
  longitude: string | null;
}

/**
 * Union type of all possible attribute values
 */
export type AttioAttributeValue =
  | AttioTextAttribute
  | AttioPersonalNameAttribute
  | AttioEmailAttribute
  | AttioNumberAttribute
  | AttioSelectAttribute
  | AttioStatusAttribute
  | AttioRecordReferenceAttribute
  | AttioActorReferenceAttribute
  | AttioLocationAttribute;

/**
 * Generic Attio record structure
 */
export interface AttioRecord<T = Record<string, AttioAttributeValue[]>> {
  id: AttioRecordId;
  created_at: string;
  web_url: string;
  values: T;
}

/**
 * Person record values
 */
export interface AttioPersonValues {
  record_id: AttioTextAttribute[];
  name: AttioPersonalNameAttribute[];
  email_addresses: AttioEmailAttribute[];
  description?: AttioTextAttribute[];
  company?: AttioRecordReferenceAttribute[];
  job_title?: AttioTextAttribute[];
  avatar_url?: AttioTextAttribute[];
  phone_numbers: any[]; // Can be empty or have phone number structure
  primary_location?: AttioLocationAttribute[];
  linkedin?: AttioTextAttribute[];
  [key: string]: any; // Allow other custom attributes
}

/**
 * Company record values
 */
export interface AttioCompanyValues {
  record_id: AttioTextAttribute[];
  name: AttioTextAttribute[];
  domains?: any[]; // Domain structure varies
  description?: AttioTextAttribute[];
  primary_location?: AttioLocationAttribute[];
  logo_url?: AttioTextAttribute[];
  [key: string]: any; // Allow other custom attributes
}

/**
 * Deal record values
 */
export interface AttioDealValues {
  record_id: AttioTextAttribute[];
  name: AttioTextAttribute[];
  stage?: AttioSelectAttribute[];
  value?: AttioNumberAttribute[];
  confidence?: AttioSelectAttribute[];
  business_function?: AttioSelectAttribute[];
  playbook?: AttioSelectAttribute[];
  geography?: AttioSelectAttribute[];
  business_unit?: AttioSelectAttribute[];
  entity?: AttioSelectAttribute[];
  delivered?: AttioSelectAttribute[];
  source_of_lead_4?: AttioSelectAttribute[];
  owner?: AttioActorReferenceAttribute[];
  associated_company?: AttioRecordReferenceAttribute[];
  [key: string]: any; // Allow other custom attributes
}

/**
 * Typed records
 */
export type AttioPerson = AttioRecord<AttioPersonValues>;
export type AttioCompany = AttioRecord<AttioCompanyValues>;
export type AttioDeal = AttioRecord<AttioDealValues>;

/**
 * API query response structure
 */
export interface AttioQueryResponse<T> {
  data: T[];
}

/**
 * Formatted/simplified record structures (what we return from tools)
 */
export interface FormattedPerson {
  id: string;
  name: string;
  email: string;
  job_title: string;
  description: string;
  web_url: string;
}

export interface FormattedCompany {
  id: string;
  name: string;
  domains: string;
  description: string;
  location: string;
  web_url: string;
}

export interface FormattedDeal {
  id: string;
  name: string;
  stage: string;
  value: string;
  confidence: string;
  business_function: string;
  playbook: string;
  geography: string;
  business_unit: string;
  entity: string;
  delivered: string;
  source_of_lead: string;
  owner: string;
  associated_company: string;
  created_at: string;
  close_date: string;
  web_url: string;
}

/**
 * Tool response structure
 */
export interface AttioToolResponse {
  action: string;
  query: string;
  results: FormattedPerson[] | FormattedCompany[] | FormattedDeal[];
  count: number;
  total_fetched: number;
}
