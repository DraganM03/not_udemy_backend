import jwt from 'jsonwebtoken';
import bcrypt, { genSalt } from 'bcrypt';

const SECRET_KEY = process.env.SECRET_KEY;
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '24h';

// Dummy data for testing
const users = [
  {
    email: 'dragan@gmail.com',
    password: await bcrypt.hash('dragan123', await genSalt(SALT_ROUNDS)),
  },
  {
    email: 'jelena@gmail.com',
    password: await bcrypt.hash('jelena123', await genSalt(SALT_ROUNDS)),
  },
  {
    email: 'nikola@gmail.com',
    password: await bcrypt.hash('nikola123', await genSalt(SALT_ROUNDS)),
  },
];

/**
 *  Helper function to validate required fields
 */
const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !body || !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Create error with status
 */
const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      SECRET_KEY,
      { expiresIn: TOKEN_EXPIRY },
      (error, token) => {
        if (error) {
          reject(error);
        } else {
          resolve(token);
        }
      }
    );
  });
};

/**
 * Find user by email
 */
const findUserByEmail = (email) => {
  return users.find((user) => user.email === email);
};

/**
 *  Verify password
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Authenticates the user and returns the JWT if successful
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['email', 'password']);
    if (!validation.isValid) {
      return next(
        createError('Bad Request: Email and password are required', 400)
      );
    }

    // Find user by email
    const user = findUserByEmail(email);
    if (!user) {
      return next(
        createError(
          "Unauthorized: User with those credentials doesn't exist",
          401
        )
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return next(
        createError(
          "Unauthorized: User with those credentials doesn't exist",
          401
        )
      );
    }

    // Generate token
    const token = await generateToken({ user });

    res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
};

/**
 * Register a new user and returns a JWT
 */
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role_id } = req.body || {};
    const requiredFields = [
      'email',
      'password',
      'first_name',
      'last_name',
      'role_id',
    ];

    // Validate required fields
    const validation = validateRequiredFields(req.body, requiredFields);
    if (!validation.isValid) {
      return next(
        createError(
          `Bad Request: The following user fields (${requiredFields.join(
            ', '
          )}) are required.`,
          400
        )
      );
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return next(
        createError('Conflict: User with that email already exists', 409)
      );
    }

    // Hash password
    const salt = await genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user object
    const newUser = {
      email,
      password: hashedPassword,
      first_name,
      last_name,
      role_id: parseInt(role_id),
      profile_image: '/' + req.file?.path?.replace(/[\\]/g, '/') || null,
    };

    // Add user to array
    users.push(newUser);
    console.log('New user registered:', { email, first_name, last_name });

    // Generate token
    const token = await generateToken({ user: newUser });

    res.status(201).json({
      message: 'User registered successfully',
      token,
    });
  } catch (error) {
    return next(error);
  }
};
