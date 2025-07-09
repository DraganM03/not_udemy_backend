import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

// Import Routes
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import courseRouter from './routes/courses.js';
import enrollmentRouter from './routes/enrollments.js';
import lessonRouter from './routes/lessons.js';
import { verifyToken } from './middleware/verifyToken.js';

/**
 *  Server Init
 */
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

const __filename = fileURLToPath(import.meta.url); // current file url
const __dirname = path.dirname(__filename);

const app = express();

/* Server Middleware */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* Server Activity Check */
app.get('/', (req, res) => {
  res.send('Udemy Clone API is running...');
});

/* Static Routes */
app.use('/static', express.static('static'));

/* Routers */
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/courses', courseRouter);
app.use('/api/enrollments', enrollmentRouter);
app.use('/api/lessons', lessonRouter);

app.get('/test', verifyToken, (req, res, next) => {
  console.log('test');
  jwt.verify(req.token, SECRET_KEY, (err, authData) => {
    if (err) {
      const error = new Error('Unauthorized');
      error.status = 403;
      next(error);
    } else {
      res.status(200).json({
        message: 'authorized',
        user: authData.user,
      });
    }
  });
});

/* Error Handlers */
app.use(notFound);
app.use(errorHandler);

/* Server Start */
app.listen(PORT, () => {
  console.log(`Server is running on: http://127.0.0.1:${PORT}`);
});
