import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRouter from './router/auth.router.js';
import clientRouter from './router/client.router.js';
import lawyerRouter from './router/lawyer.router.js';
import caseRouter from './router/case.router.js';
import proposalRouter from './router/proposal.router.js';
import customErrorHandler from './middleware/customerrorhandler.middleware.js';
import routeNotFoundMiddleware from './middleware/routenotfound.middleware.js';
import staffRoutes from "./router/staff.routes.js"; 
const app = express();
const baseUrl = process.env.BASE_PATH || '/api/v1';

// Middleware
app.use(morgan('tiny'));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
    exposedHeaders: ['Authorization', 'x-refresh-token']  // Allow mobile clients to read these headers
}));
app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Welcome Route
app.get(baseUrl, (req, res) => {
    res.json([{ success: true, message: 'Welcome to UPLAW API', data: null }]);
});

// Health Check
app.get(`${baseUrl}/health`, (req, res) => {
    res.json([{ success: true, message: 'API is healthy', data: { status: 'ok', timestamp: new Date() } }]);
});

// Route Mounting
app.use(`${baseUrl}/auth`, authRouter);
app.use(`${baseUrl}/client`, clientRouter);
app.use(`${baseUrl}/lawyer`, lawyerRouter);
app.use(`${baseUrl}/cases`, caseRouter);
app.use(`${baseUrl}/proposals`, proposalRouter);
app.use(`${baseUrl}/staff`, staffRoutes);
// Error Handling
app.use(routeNotFoundMiddleware);
app.use(customErrorHandler);

export default app;
