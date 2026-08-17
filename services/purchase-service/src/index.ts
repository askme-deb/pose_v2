import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import suppliersRouter from './routes/suppliers';
import purchaseOrdersRouter from './routes/purchaseOrders';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'purchase-service';

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'purchase-service');

app.use('/', healthRouter);
app.use('/', suppliersRouter);
app.use('/', purchaseOrdersRouter);

app.listen(PORT, () => {
  console.log(`[purchase-service] listening on port ${PORT}`);
});
