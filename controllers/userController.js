import pool from '../database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createError } from '../utils/error.js';

// User Registration
export const registerUser = async (req, res, next) => {
  try {
    const roles = ['student', 'instructor'];
    const { email, password, first_name, last_name, bio, role_id } = req.body;
    const profile_image = req.file ? req.file.path : null;

    // Fields check
    if (!email || !password || !first_name || !last_name || !role_id) {
      return next(createError(400, 'Please provide all required fields.'));
    }

    // Public users can register as students (1) or instructors (2).
    // The admin role (3) must be granted manually. Default to student.
    const validRoleId =
      role_id && [1, 2].includes(parseInt(role_id)) ? parseInt(role_id, 10) : 1;

    // Check if user already exists
    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingUser.length > 0) {
      return next(createError(409, 'User with this email already exists.'));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database with the specified or default role_id
    const [result] = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role_id, profile_image, bio)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        first_name,
        last_name,
        validRoleId,
        profile_image.replace(/\\/g, '/'),
        bio,
      ]
    );

    // Create and sign JWT
    const token = jwt.sign(
      {
        id: result.insertId,
        role_id: validRoleId,
        role_name: roles[validRoleId - 1],
      },
      process.env.SECRET_KEY,
      {
        expiresIn: '1d',
      }
    );

    // Response
    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// User Login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createError(400, 'Please provide email and password.'));
    }

    // Find user by email, also join with roles table
    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name 
           FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.email = ?`,
      [email]
    );
    if (users.length === 0) {
      return next(createError(404, 'User not found.'));
    }
    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(createError(401, 'Invalid credentials.'));
    }

    // Create and sign JWT
    const payload = {
      id: user.id,
      role_id: user.role_id,
      role_name: user.role_name,
    };
    const token = jwt.sign(payload, process.env.SECRET_KEY, {
      expiresIn: '1d',
    });

    // Separate password from the rest of the user data to not send it back
    const { password: userPassword, ...userInfo } = user;

    res.status(200).json({ token, user: userInfo });
  } catch (err) {
    next(err);
  }
};

// Update User Profile
export const updateUser = async (req, res, next) => {
  // Ensure user can only update their own profile unless they are an admin
  if (req.user.id !== parseInt(req.params.id) && req.user.role_id !== 3) {
    return next(createError(403, 'You can only update your own account!'));
  }

  try {
    const { first_name, last_name, bio } = req.body;
    const profile_image = req.file ? req.file.path : req.body.profile_image;

    const fieldsToUpdate = { first_name, last_name, bio, profile_image };
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(200).json({ message: 'No fields to update.' });
    }

    values.push(req.params.id); // for the WHERE clause

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    await pool.query(sql, values);

    res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
};
