import jwt from 'jsonwebtoken';
const SECRET_KEY = process.env.SECRET_KEY;
// dummy data for testing
const users = [
  {
    email: 'dragan@gmail.com',
    password: 'dragan123',
  },
  {
    email: 'jelena@gmail.com',
    password: 'jelena123',
  },
  {
    email: 'nikola@gmail.com',
    password: 'nikola123',
  },
];

/**
 * Authenticates the user and returns the JWT if successful
 */
export const loginUser = (req, res, next) => {
  try {
    if (!req.body || !req.body.email || !req.body.password) {
      const error = new Error('Email and password are required');
      error.status = 400;
      return next(error);
    }
    const user = users.find(
      (user) =>
        user.email === req.body.email && user.password === req.body.password
    );
    if (user) {
      const token = jwt.sign(
        { user },
        SECRET_KEY,
        { expiresIn: '24h' },
        (error, token) => {
          res.status(200).json({
            token: token,
          });
        }
      );
    } else {
      const error = new Error("User with those credentials doesn't exist");
      error.status = 401;
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
};
