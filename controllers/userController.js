import jwt from 'jsonwebtoken';
import bcrypt, { genSalt } from 'bcrypt';

const SECRET_KEY = process.env.SECRET_KEY;
// dummy data for testing
const salt = await genSalt(12);
const users = [
  {
    email: 'dragan@gmail.com',
    password: await bcrypt.hash('dragan123', salt),
  },
  {
    email: 'jelena@gmail.com',
    password: await bcrypt.hash('jelena123', salt),
  },
  {
    email: 'nikola@gmail.com',
    password: await bcrypt.hash('nikola123', salt),
  },
];

/**
 * Authenticates the user and returns the JWT if successful
 */
export const loginUser = async (req, res, next) => {
  try {
    if (!req.body || !req.body.email || !req.body.password) {
      const error = new Error('Bad Request: Email and password are required');
      error.status = 400;
      return next(error);
    }
    const user = users.find(
      (user) =>
        user.email === req.body.email &&
        bcrypt.compareSync(req.body.password, user.password) //user.password === req.body.password
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
      const error = new Error(
        "Unauthorized: User with those credentials doesn't exist"
      );
      error.status = 401;
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * Register a new user and returns a jwt
 */
export const registerUser = async (req, res, next) => {
  try {
    if (
      !req.body ||
      !req.body.email ||
      !req.body.password ||
      !req.body.first_name ||
      !req.body.last_name ||
      !req.body.role_id
    ) {
      const error = new Error(
        'Bad Request: The following user fields (email, password, first_name, last_name, role_id) are required.'
      );
      error.status = 400;
      return next(error);
    }

    const user = {
      email: req.body.email,
      password: await bcrypt.hash(req.body.password, salt),
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      role_id: parseInt(req.body.role_id),
      profile_image: req.file.path,
    };

    const user_exists = users.some((user) => user.email === req.body.email);

    if (!user_exists) {
      users.push(user);
      console.log(users);
      const token = jwt.sign(
        { user },
        SECRET_KEY,
        { expiresIn: '24h' },
        (error, token) => {
          res.status(200).json({
            message: 'User registered successfuly',
            token: token,
          });
        }
      );
    } else {
      const error = new Error('Conflict: User with that email already exist');
      error.status = 409;
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
};
