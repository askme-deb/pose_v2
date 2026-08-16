import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import healthRouter from './routes/health';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import brandsRouter from './routes/brands';
import stockAdjustmentsRouter from './routes/stockAdjustments';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'inventory-service';

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/', healthRouter);
app.use('/', productsRouter);
app.use('/', categoriesRouter);
app.use('/', brandsRouter);
app.use('/', stockAdjustmentsRouter);

app.listen(PORT, () => {
  console.log(`[inventory-service] listening on port ${PORT}`);
});
