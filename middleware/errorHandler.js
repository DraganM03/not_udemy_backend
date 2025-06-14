const errorHandler = (err, req, res, next) => {
  res.status(404).json({
    error: {
      message: err.message,
      status: err.status || 500,
    },
  });
};

export default errorHandler;
