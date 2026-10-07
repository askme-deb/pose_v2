import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import { LOCAL_UPLOAD_DIR } from './lib/storage';
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
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'inventory-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'inventory-service', 'Products, categories, brands, stock, warehouses, batches, serials, bundles & reports');
// Local-disk uploads (dev only, when S3 isn't configured) are public like a
// CDN would be: <img> tags can't send a bearer token. Keys are random UUIDs.
app.use(
  '/uploads',
  express.static(LOCAL_UPLOAD_DIR, {
    maxAge: '1y',
    immutable: true,
    fallthrough: false,
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }),
);
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[inventory-service] listening on port ${PORT}`);
});
