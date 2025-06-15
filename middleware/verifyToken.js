export const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (bearerHeader) {
    const token = bearerHeader.split(' ')[1];
    req.token = token;
    next();
  } else {
    const error = new Error('Unauthorized');
    error.status = 403;
    next(error);
  }
};
