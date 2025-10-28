import http from 'node:http';
import { exec } from 'node:child_process';
import { google } from 'googleapis';
import { URL } from 'node:url';

interface CliOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key && value) {
      options[key.replace(/^--/, '')] = value;
    }
  }
  const clientId = options['client-id'] || process.env.YT_CLIENT_ID;
  const clientSecret = options['client-secret'] || process.env.YT_CLIENT_SECRET;
  const redirectUri = options['redirect-uri'] || 'http://localhost:5319/oauth2callback';
  const scopes = (options.scopes || '').split(',').filter(Boolean);
  const defaultScopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ];
  if (!clientId || !clientSecret) {
    throw new Error('Provide --client-id and --client-secret (or set YT_CLIENT_ID / YT_CLIENT_SECRET env vars).');
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: scopes.length ? scopes : defaultScopes,
  };
}

async function main() {
  const opts = parseArgs();
  const oauth2 = new google.auth.OAuth2({
    clientId: opts.clientId,
    clientSecret: opts.clientSecret,
    redirectUri: opts.redirectUri,
  });

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: opts.scopes,
  });

  console.log('Open the following URL to authorize the application:');
  console.log(authUrl);

  const server = http.createServer(async (req, res) => {
    if (!req.url) return;
    const url = new URL(req.url, opts.redirectUri);
    if (url.pathname !== new URL(opts.redirectUri).pathname) {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('Missing code parameter');
      return;
    }
    try {
      const { tokens } = await oauth2.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error('Refresh token not returned. Ensure you requested offline access and revoked any existing tokens.');
      }
      console.log('\nRefresh token obtained!');
      console.log(tokens.refresh_token);
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('You may close this tab. Refresh token logged to console.');
    } catch (err: any) {
      console.error('Failed to exchange code for tokens', err);
      res.writeHead(500);
      res.end('Failed to exchange code for tokens. Check console for details.');
    } finally {
      setTimeout(() => server.close(), 500);
    }
  });

  server.listen(new URL(opts.redirectUri).port || 5319, () => {
    console.log(`Listening on ${opts.redirectUri}`);
    exec(`xdg-open "${authUrl}"`, () => {
      // ignore errors for headless environments
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
