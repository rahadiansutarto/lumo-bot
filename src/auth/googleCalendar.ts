/**
 * Google Calendar OAuth Management
 * 
 * Handles per-user OAuth authentication and token management
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { UserCalendarAuth, GoogleOAuthTokens } from '../types/googleCalendar';

// In-memory store for demo - replace with database in production
const userTokenStore = new Map<string, UserCalendarAuth>();

/**
 * Configuration from environment variables
 */
export const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/google/callback';
  const allowedEmailDomain = process.env.COMPANY_EMAIL_DOMAIN; // e.g., "yourcompany.com"

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    allowedEmailDomain,
  };
};

/**
 * Create OAuth2 client
 */
export const createOAuth2Client = (): OAuth2Client => {
  const config = getGoogleOAuthConfig();
  
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
};

/**
 * Generate authorization URL for user to grant calendar access
 */
export const getAuthorizationUrl = (userId: string): string => {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId in state to identify user after OAuth callback
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return url;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (
  code: string,
  userId: string
): Promise<{ tokens: GoogleOAuthTokens; email: string }> => {
  const oauth2Client = createOAuth2Client();
  
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('No access token received from Google');
  }

  // Set credentials to fetch user info
  oauth2Client.setCredentials(tokens);
  
  // Get user's email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;

  if (!email) {
    throw new Error('Could not retrieve user email from Google');
  }

  // Verify email domain if configured
  const config = getGoogleOAuthConfig();
  if (config.allowedEmailDomain) {
    const emailDomain = email.split('@')[1];
    if (emailDomain !== config.allowedEmailDomain) {
      throw new Error(
        `Only ${config.allowedEmailDomain} email addresses are allowed. You used: ${email}`
      );
    }
  }

  const googleTokens: GoogleOAuthTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
    token_type: tokens.token_type ?? 'Bearer',
    scope: tokens.scope ?? '',
  };

  return { tokens: googleTokens, email };
};

/**
 * Store user's OAuth tokens
 */
export const storeUserTokens = (
  userId: string,
  email: string,
  tokens: GoogleOAuthTokens
): void => {
  const userAuth: UserCalendarAuth = {
    userId,
    email,
    tokens,
    authorizedAt: new Date().toISOString(),
  };

  userTokenStore.set(userId, userAuth);
  
  console.log(`✓ Stored calendar tokens for user ${userId} (${email})`);
};

/**
 * Get user's OAuth tokens
 */
export const getUserTokens = (userId: string): UserCalendarAuth | null => {
  return userTokenStore.get(userId) || null;
};

/**
 * Get authenticated OAuth2 client for a user
 */
export const getAuthenticatedClient = async (userId: string): Promise<OAuth2Client> => {
  const userAuth = getUserTokens(userId);
  
  if (!userAuth) {
    throw new Error(
      'You need to authorize calendar access first. Please authenticate with your Google account.'
    );
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(userAuth.tokens);

  // Check if token needs refresh
  if (userAuth.tokens.expiry_date && userAuth.tokens.expiry_date < Date.now()) {
    console.log(`Refreshing expired token for user ${userId}`);
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens
    const updatedTokens: GoogleOAuthTokens = {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token ?? userAuth.tokens.refresh_token,
      expiry_date: credentials.expiry_date ?? undefined,
      token_type: credentials.token_type ?? 'Bearer',
      scope: credentials.scope ?? userAuth.tokens.scope,
    };

    storeUserTokens(userId, userAuth.email, updatedTokens);
  }

  return oauth2Client;
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = (userId: string): boolean => {
  return userTokenStore.has(userId);
};

/**
 * Revoke user's calendar access
 */
export const revokeUserAccess = async (userId: string): Promise<void> => {
  const userAuth = getUserTokens(userId);
  
  if (!userAuth) {
    throw new Error('User not authenticated');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(userAuth.tokens);

  try {
    await oauth2Client.revokeCredentials();
  } catch (error) {
    console.error('Error revoking credentials:', error);
  }

  userTokenStore.delete(userId);
  console.log(`✓ Revoked calendar access for user ${userId}`);
};

/**
 * Get all authenticated users (for admin purposes)
 */
export const getAuthenticatedUsers = (): UserCalendarAuth[] => {
  return Array.from(userTokenStore.values());
};
