import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import healthRouter from './routes/health';
import rolesRouter from './routes/roles';
import usersRouter from './routes/users';
import auditLogsRouter from './routes/auditLogs';
import authRouter from './routes/auth';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'authentication';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.use('/', healthRouter);
app.use('/', rolesRouter);
app.use('/', usersRouter);
app.use('/', auditLogsRouter);
app.use('/', authRouter);

app.listen(PORT, () => {
  console.log(`[authentication] listening on port ${PORT}`);
});
