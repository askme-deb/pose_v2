import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import healthRouter from './routes/health';
import invoicesRouter from './routes/invoices';
import customersRouter from './routes/customers';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'sales-service';

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/', healthRouter);
app.use('/', invoicesRouter);
app.use('/', customersRouter);

app.listen(PORT, () => {
  console.log(`[sales-service] listening on port ${PORT}`);
});
