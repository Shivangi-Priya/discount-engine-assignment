/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serves POST /api/parse-rule during `npm run dev` using the same offline parser as production.
 * No environment variables or external API credentials are required.
 */
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api/parse-rule', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return send(405, { status: 'error', code: 'method', message: 'Use POST.' });
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          let body: unknown = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { /* handled below */ }
          const mod = await server.ssrLoadModule('/api/parse-rule.ts');
          const out = await mod.processParseRequest(body);
          send(out.status, out.body);
        } catch (e) {
          send(500, { status: 'error', code: 'server', message: `Local API crashed: ${(e as Error).message}` });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDev()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
