import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import geminiApiHandler from './api/gemini';

function localApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          return res.end();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            const fakeReq = { method: 'POST', body: parsedBody };
            const fakeRes = {
              setHeader(k: string, v: string) { res.setHeader(k, v); },
              status(code: number) {
                res.statusCode = code;
                return {
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end() { res.end(); }
                };
              }
            };
            await geminiApiHandler(fakeReq, fakeRes);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      localApiPlugin(env)
    ],
    // NOTICE: process.env.API_KEY and process.env.GEMINI_API_KEY are deliberately omitted.
    // Zero secret leakage into client bundle!
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
