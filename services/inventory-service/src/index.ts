import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import brandsRouter from './routes/brands';
import stockAdjustmentsRouter from './routes/stockAdjustments';
import warehousesRouter from './routes/warehouses';
import warehouseTransfersRouter from './routes/warehouseTransfers';
import batchesRouter from './routes/batches';
import serialsRouter from './routes/serials';
import bundlesRouter from './routes/bundles';
import reportsRouter from './routes/reports';
import racksRouter from './routes/racks';
import warehouseDamageRouter from './routes/warehouseDamage';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'inventory-service';

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'inventory-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'inventory-service', 'Products, categories, brands, stock, warehouses, batches, serials, bundles & reports');
app.use(requireAuth);
app.use('/', productsRouter);
app.use('/', categoriesRouter);
app.use('/', brandsRouter);
app.use('/', stockAdjustmentsRouter);
app.use('/', warehousesRouter);
app.use('/', warehouseTransfersRouter);
app.use('/', batchesRouter);
app.use('/', serialsRouter);
app.use('/', bundlesRouter);
app.use('/', reportsRouter);
app.use('/', racksRouter);
app.use('/', warehouseDamageRouter);

app.listen(PORT, () => {
  console.log(`[inventory-service] listening on port ${PORT}`);
});
