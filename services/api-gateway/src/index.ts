import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { metricsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import healthRouter from './routes/health';
import proxyRouter from './routes/proxy';
import searchRouter from './routes/search';
import docsRouter from './routes/docs';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Behind nginx / the k8s ingress: take the client IP from X-Forwarded-For
// (one hop) so rate limits apply per client, not to the ingress as a whole.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
const PORT = process.env.PORT || 4000;

app.use(helmet());
// Exports read their filename from Content-Disposition cross-origin.
app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
app.use(pinoHttp());
metricsMiddleware(app, 'api-gateway');
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
  }),
);

app.use('/', healthRouter);
app.use('/', docsRouter);
app.use(searchRouter);
app.use(proxyRouter); // proxy routes handle their own body streaming; keep before express.json()
app.use(express.json());

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[api-gateway] listening on port ${PORT}`);
});
