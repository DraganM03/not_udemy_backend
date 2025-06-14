import express from 'express';
import cors from 'cors';

import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

/**
 *  Server Init
 */
const PORT = process.env.PORT || 3000;
const app = express();

/* Server Middleware */
app.use(cors());

app.use(notFound);
app.use(errorHandler);

/* Server Start */
app.listen(PORT, () => {
  console.log(`Server is running on: http://127.0.0.1:${PORT}`);
});
