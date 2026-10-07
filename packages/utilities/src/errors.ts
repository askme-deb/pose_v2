import type { NextFunction, Request, Response } from 'express';
import { captureException } from './observability';

type LayerHandler = (req: Request, res: Response, next: NextFunction) => unknown;
interface LayerProto {
  handle: LayerHandler;
  handle_request: (req: Request, res: Response, next: NextFunction) => void;
  __pospeAsyncPatched?: boolean;
}

/**
 * Express 4 doesn't forward a rejected promise from an async handler to the
 * error middleware — the rejection goes unhandled and Node exits, taking
 * every in-flight request down with it. This patches express's route Layer
 * once per process so any handler's returned promise is chained into
 * `next(err)`, the same thing express-async-errors does.
 */
export function installAsyncErrorHandling() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Layer = require('express/lib/router/layer') as { prototype: LayerProto };
  if (Layer.prototype.__pospeAsyncPatched) return;
  Layer.prototype.__pospeAsyncPatched = true;

  Layer.prototype.handle_request = function handleRequest(this: LayerProto, req, res, next) {
    const fn = this.handle;
    // 4-arity functions are error handlers — express skips them here too.
    if (fn.length > 3) return next();
    try {
      const result = fn(req, res, next) as Promise<unknown> | undefined;
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

const PRISMA_STATUS: Record<string, [number, string]> = {
  P2002: [409, 'A record with these unique values already exists'],
  P2003: [400, 'A referenced record does not exist'],
  P2025: [404, 'Record not found'],
};

/** Final error middleware: mount after every router in each service. */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);

  const e = err as { status?: number; statusCode?: number; code?: string; message?: string; type?: string };
  let status = e.status ?? e.statusCode ?? 500;
  let message = status < 500 ? (e.message ?? 'Request failed') : 'Internal server error';

  if (e.code && PRISMA_STATUS[e.code]) [status, message] = PRISMA_STATUS[e.code];
  // body-parser's malformed JSON
  if (e.type === 'entity.parse.failed') [status, message] = [400, 'Malformed JSON body'];

  if (status >= 500) {
    (req as Request & { log?: { error: (o: unknown, m: string) => void } }).log?.error({ err }, 'Unhandled request error');
    captureException(err, { method: req.method, path: req.path });
  }
  res.status(status).json({ error: message });
}
