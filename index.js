import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

import users from './routes/users.js';
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
app.use(logger);

/* Static Routes */
app.use(
  '/static/images',
  express.static(path.join(__dirname, 'static/images/'))
);

app.use(
  '/static/thumbnails',
  express.static(path.join(__dirname, 'static/thumbnails/'))
);

app.use(
  '/static/videos',
  express.static(path.join(__dirname, 'static/videos/'))
);

/* Routers */
app.use('/user', users);

app.get('/test', verifyToken, (req, res) => {
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
