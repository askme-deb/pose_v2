import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import suppliersRouter from './routes/suppliers';
import purchaseOrdersRouter from './routes/purchaseOrders';
import goodsReceivedNotesRouter from './routes/goodsReceivedNotes';
import purchaseReturnsRouter from './routes/purchaseReturns';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'purchase-service';

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'purchase-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'purchase-service', 'Suppliers, purchase orders, GRN, returns & supplier ledger');
app.use(requireAuth);
app.use('/', suppliersRouter);
app.use('/', purchaseOrdersRouter);
app.use('/', goodsReceivedNotesRouter);
app.use('/', purchaseReturnsRouter);

app.listen(PORT, () => {
  console.log(`[purchase-service] listening on port ${PORT}`);
});
