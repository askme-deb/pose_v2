import type { Express, Request, Response } from 'express';
import listEndpoints from 'express-list-endpoints';
import swaggerUi from 'swagger-ui-express';

const SKIPPED_PATH_SEGMENTS = new Set(['docs', 'openapi.json', 'metrics', 'health']);

function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([^/]+)/g, '{$1}');
}

function pathParamNames(expressPath: string): string[] {
  return (expressPath.match(/:([^/]+)/g) ?? []).map((p) => p.slice(1));
}

// Builds a real OpenAPI 3.0 document straight from the app's actual mounted
// routers via express-list-endpoints, rather than a hand-maintained spec that
// drifts from the code — every route below genuinely exists and is genuinely
// reachable, because it was read off the live router stack.
function buildSpec(app: Express, serviceName: string, description: string) {
  const endpoints = listEndpoints(app);
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of endpoints) {
    const firstSegment = ep.path.split('/').filter(Boolean)[0];
    if (firstSegment && SKIPPED_PATH_SEGMENTS.has(firstSegment)) continue;

    const openApiPath = toOpenApiPath(ep.path);
    paths[openApiPath] = paths[openApiPath] ?? {};

    for (const method of ep.methods) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      const params = pathParamNames(ep.path);
      paths[openApiPath][method.toLowerCase()] = {
        tags: [serviceName],
        summary: `${method} ${ep.path}`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', required: false, schema: { type: 'string' } },
          ...params.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } })),
        ],
        ...(['POST', 'PUT', 'PATCH'].includes(method)
          ? { requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } }
          : {}),
        responses: {
          '200': { description: 'Successful response' },
          '400': { description: 'Validation error' },
          '401': { description: 'Missing or invalid auth token' },
          '404': { description: 'Not found' },
        },
        security: [{ bearerAuth: [] }],
      };
    }
  }

  return {
    openapi: '3.0.3',
    info: { title: `${serviceName} API`, version: '1.0.0', description },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    paths,
  };
}

/**
 * Serves a live-generated OpenAPI 3.0 spec at GET /openapi.json and an
 * interactive Swagger UI at GET /docs. Call once at service startup, after
 * every business router has already been mounted, so the route reflection
 * below sees the complete route table.
 */
export function apiDocsMiddleware(app: Express, serviceName: string, description: string) {
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(buildSpec(app, serviceName, description));
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: '/openapi.json' },
      customSiteTitle: `${serviceName} API Docs`,
    }),
  );
}
