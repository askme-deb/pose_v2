import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import healthRouter from './routes/health';
import dashboardRouter from './routes/dashboard';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'reporting-service';

const app = express();
const PORT = process.env.PORT || 4009;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/', healthRouter);
app.use('/', dashboardRouter);

app.listen(PORT, () => {
  console.log(`[reporting-service] listening on port ${PORT}`);
});
