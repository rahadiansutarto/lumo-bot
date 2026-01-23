/**
 * OAuth Callback Server
 * 
 * Handles Google Calendar OAuth callback flow.
 * Users will be redirected here after granting calendar access.
 */

import { createServer } from 'http';
import { URL } from 'url';
import {
  exchangeCodeForTokens,
  storeUserTokens,
} from './auth/googleCalendar';

const PORT = process.env.OAUTH_SERVER_PORT || 3000;

/**
 * Simple HTML response page
 */
function htmlResponse(title: string, message: string, isSuccess: boolean): string {
  const color = isSuccess ? '#10b981' : '#ef4444';
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: ${color};
            margin-bottom: 1rem;
          }
          p {
            color: #4b5563;
            line-height: 1.6;
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${isSuccess ? '✅' : '❌'}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p style="margin-top: 2rem; color: #9ca3af;">You can close this window now.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Start OAuth callback server
 */
export function startOAuthServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    
    // Handle OAuth callback
    if (url.pathname === '/oauth/google/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // userId
      const error = url.searchParams.get('error');

      // Handle user denial
      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          htmlResponse(
            'Authorization Cancelled',
            'You denied calendar access. The bot will not be able to access your Google Calendar.',
            false
          )
        );
        return;
      }

      // Validate parameters
      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(
          htmlResponse(
            'Invalid Request',
            'Missing authorization code or user state. Please try again.',
            false
          )
        );
        return;
      }

      try {
        const userId = state;
        
        // Exchange code for tokens
        console.log(`Processing OAuth callback for user ${userId}...`);
        const { tokens, email } = await exchangeCodeForTokens(code, userId);
        
        // Store tokens
        storeUserTokens(userId, email, tokens);
        
        console.log(`✓ Successfully authorized calendar access for ${email}`);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          htmlResponse(
            'Calendar Connected! 🎉',
            `Successfully connected your Google Calendar (${email}). You can now ask the bot about your meetings and create events.`,
            true
          )
        );
      } catch (error) {
        console.error('OAuth callback error:', error);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error occurred';
        
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(
          htmlResponse(
            'Authorization Failed',
            `Failed to connect calendar: ${errorMessage}`,
            false
          )
        );
      }
      return;
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'oauth-server' }));
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    console.log(`OAuth callback server running on http://localhost:${PORT}`);
    console.log(`Callback URL: http://localhost:${PORT}/oauth/google/callback`);
  });

  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startOAuthServer();
}
