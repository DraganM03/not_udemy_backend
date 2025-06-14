import colors from 'colors';

const logger = (req, res, next) => {
  const methodColors = {
    GET: 'green',
    POST: 'yellow',
    PUT: 'blue',
    DELETE: 'red',
  };

  const color = methodColors[req.method] || 'white';
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode < 400 ? 'green' : 'red';
    console.log(
      `${req.method[color]} ${req.url} - Status: ${
        String(res.statusCode)[statusColor]
      } - ${duration}ms`
    );
  });

  next();
};

export default logger;
