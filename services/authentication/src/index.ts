import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import rolesRouter from './routes/roles';
import usersRouter from './routes/users';
import auditLogsRouter from './routes/auditLogs';
import authRouter from './routes/auth';
import registerRouter from './routes/register';
import twoFactorRouter from './routes/twoFactor';
import passwordRouter from './routes/password';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'authentication';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'authentication');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'authentication', 'Login, refresh/logout, 2FA, password reset, email verification, RBAC roles, users & audit logs');
// Public: nobody has a token yet when calling these (issuing one is the
// point), and twoFactorRouter guards each of its own routes with requireAuth
// individually since /2fa/status et al. need a fresh per-user check anyway.
app.use('/', authRouter);
app.use('/', registerRouter);
app.use('/', twoFactorRouter);
app.use('/', passwordRouter);
app.use(requireAuth);
app.use('/', rolesRouter);
app.use('/', usersRouter);
app.use('/', auditLogsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[authentication] listening on port ${PORT}`);
});
