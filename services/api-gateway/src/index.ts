import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import proxyRouter from './routes/proxy';
import searchRouter from './routes/search';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(pinoHttp());
metricsMiddleware(app, 'api-gateway');
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
  }),
);

app.use('/', healthRouter);
app.use(searchRouter);
app.use(proxyRouter); // proxy routes handle their own body streaming; keep before express.json()
app.use(express.json());

app.listen(PORT, () => {
  console.log(`[api-gateway] listening on port ${PORT}`);
});
