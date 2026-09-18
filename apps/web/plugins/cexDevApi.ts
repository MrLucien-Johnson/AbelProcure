import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const coreEntry = path.resolve(pluginDir, '../../../packages/core/src/index.ts');

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function pathOf(req: IncomingMessage): string {
  const url = req.url ?? '/';
  return url.split('?')[0] ?? '/';
}

/**
 * Same-origin CeX scan during `npm run dev`.
 * Loads @abelprocure/core through Vite SSR so the config file itself stays plain JS-loadable.
 */
export function cexDevApi(): Plugin {
  return {
    name: 'cex-dev-api',
    configureServer(server: ViteDevServer) {
      let last: unknown = null;
      let store: { apply?: unknown } | null = null;

      server.middlewares.use(async (req, res, next) => {
        const pathname = pathOf(req);
        if (pathname !== '/api/cex/scan' && pathname !== '/api/cex/status') {
          next();
          return;
        }
        try {
          const core = (await server.ssrLoadModule(coreEntry)) as {
            runCexScan: (opts: Record<string, unknown>) => Promise<unknown>;
            cexConfigFromEnv: (env: NodeJS.ProcessEnv) => unknown;
            InMemorySnapshotStore: new () => { apply?: unknown };
          };
          store ??= new core.InMemorySnapshotStore();

          if (pathname === '/api/cex/status' && req.method === 'GET') {
            const snapshot = last as { status?: string; products?: unknown[]; error?: string; lastSuccessAt?: string } | null;
            send(res, 200, {
              enabled: true,
              last: snapshot
                ? {
                    status: snapshot.status,
                    products: snapshot.products?.length ?? 0,
                    error: snapshot.error ?? null,
                    lastSuccessAt: snapshot.lastSuccessAt ?? null,
                  }
                : null,
              note: 'Dev server CeX API. Live /boxes may be Cloudflare 403; import JSON or run from an unblocked IP.',
            });
            return;
          }
          if (pathname === '/api/cex/scan' && req.method === 'GET') {
            send(res, 200, last ?? { status: 'UNAVAILABLE', products: [], opportunities: [], diffs: [], alerts: [], error: 'No scan yet' });
            return;
          }
          if (pathname === '/api/cex/scan' && req.method === 'POST') {
            const body = (await readJson(req)) as {
              mode?: 'live' | 'demo' | 'import';
              categories?: 'gpu' | 'all';
              payload?: unknown;
            };
            const mode = body.mode ?? 'live';
            last = await core.runCexScan({
              mode,
              categories: body.categories === 'all' ? 'all' : 'gpu',
              payload: body.payload,
              store,
              config: core.cexConfigFromEnv(process.env),
              allowDemoMarket: mode === 'demo',
            });
            send(res, 200, last);
            return;
          }
          next();
        } catch (err) {
          send(res, 500, { status: 'UNAVAILABLE', error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
