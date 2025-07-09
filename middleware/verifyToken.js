import jwt from 'jsonwebtoken';
import { createError } from '../utils/error.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'You are not authenticated!'));
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'your_super_secret_key',
    (err, user) => {
      if (err) return next(createError(403, 'Token is not valid!'));
      req.user = user; // Attaches user payload (e.g., id, role) to the request
      next();
    }
  );
};

export const verifyInstructor = (req, res, next) => {
  verifyToken(req, res, () => {
    // The role_id for 'instructor' is 2, and 'admin' is 3
    if (req.user.role_id === 2 || req.user.role_id === 3) {
      next();
    } else {
      return next(
        createError(403, 'You are not authorized! Instructors or Admins only.')
      );
    }
  });
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // The role_id for 'admin' is 3
    if (req.user.role_id === 3) {
      next();
    } else {
      return next(createError(403, 'You are not authorized! Admins only.'));
    }
  });
};
