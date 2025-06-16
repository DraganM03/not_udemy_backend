import jwt from 'jsonwebtoken';
import bcrypt, { genSalt } from 'bcrypt';
import pool from '../database.js';

const SECRET_KEY = process.env.SECRET_KEY;
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '24h';

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
const findUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `
    SELECT 
      users.id, 
      users.email,
      users.password,
      users.bio, 
      users.first_name, 
      users.last_name, 
      users.profile_image, 
      roles.name AS role_name
    FROM users
    INNER JOIN roles
    ON users.role_id = roles.id
    WHERE users.email = ?
    `,
    [email]
  );
  return rows[0] || null;
};

/**
 *  Insers a new user into the database
 */
const createNewUser = async (newUser) => {
  const params = [
    newUser.email,
    newUser.password,
    newUser.first_name,
    newUser.last_name,
    newUser.role_id,
    newUser.profile_image,
    newUser.bio,
  ];

  const user = pool.query(
    `
    INSERT INTO users(email, password, first_name, last_name, role_id, profile_image, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [...params]
  );
  return user;
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
    const user = await findUserByEmail(email);
    console.log(user);
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
    const existingUser = await findUserByEmail(email);
    console.log(existingUser);
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
      profile_image: req.file?.path?.replace(/[\\]/g, '/') || null,
      bio: '',
    };

    newUser.profile_image = newUser.profile_image
      ? '/' + newUser.profile_image
      : newUser.profile_image;

    // Add user to array
    const user = await createNewUser(newUser);
    console.log('New user registered:', user);

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

/**
 * Update users first_name, last_name, bio, profile_image, role_id and/or password
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, bio, role_id, password } = req.body;

    // Verify JWT and extract user id
    let userId;
    try {
      const decoded = jwt.verify(req.token, SECRET_KEY);
      userId = decoded.user?.id || decoded.id;
    } catch (err) {
      return next(createError('Invalid or expired token', 401));
    }

    // Only allow the logged-in user to update their own profile
    if (parseInt(id) !== parseInt(userId)) {
      return next(
        createError('Forbidden: You can only update your own profile.', 403)
      );
    }

    const fields = [];
    const values = [];

    if (first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(last_name);
    }
    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio);
    }
    if (role_id !== undefined) {
      fields.push('role_id = ?');
      values.push(role_id);
    }
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    let profile_image = req.file?.path?.replace(/[\\]/g, '/') || null;
    profile_image = profile_image ? '/' + profile_image : profile_image;
    if (profile_image !== null) {
      fields.push('profile_image = ?');
      values.push(profile_image);
    }

    if (fields.length === 0) {
      return next(createError('No fields to update.', 400));
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return next(createError('User not found.', 404));
    }

    res.status(200).json({ message: 'User updated successfully.' });
  } catch (error) {
    next(createError(error.message || 'Internal server error', 500));
  }
};
