import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import brandsRouter from './routes/brands';
import stockAdjustmentsRouter from './routes/stockAdjustments';
import warehousesRouter from './routes/warehouses';
import warehouseTransfersRouter from './routes/warehouseTransfers';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'inventory-service';

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'inventory-service');

app.use('/', healthRouter);
app.use('/', productsRouter);
app.use('/', categoriesRouter);
app.use('/', brandsRouter);
app.use('/', stockAdjustmentsRouter);
app.use('/', warehousesRouter);
app.use('/', warehouseTransfersRouter);

app.listen(PORT, () => {
  console.log(`[inventory-service] listening on port ${PORT}`);
});
