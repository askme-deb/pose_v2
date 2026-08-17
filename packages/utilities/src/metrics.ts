import type { Express, NextFunction, Request, Response } from 'express';
import client from 'prom-client';

// One shared registry per process — every service calls metricsMiddleware()
// exactly once at startup, so a per-call registry would just mean a second,
// empty one nothing ever reads from.
const registry = new client.Registry();
let defaultsCollected = false;

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
  registers: [registry],
});

/**
 * Wires request-duration tracking and a `GET /metrics` Prometheus scrape
 * endpoint onto an existing Express app. Call once at service startup,
 * alongside the existing `app.use(pinoHttp())` line.
 */
export function metricsMiddleware(app: Express, serviceName: string) {
  if (!defaultsCollected) {
    client.collectDefaultMetrics({ register: registry, prefix: 'pospe_' });
    defaultsCollected = true;
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      // req.route is only populated once Express has matched a route; fall
      // back to the raw path so 404s still show up under something.
      const route = req.route?.path ?? req.path;
      end({ method: req.method, route, status_code: res.statusCode, service: serviceName });
    });
    next();
  });

  app.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });
}
