import jwt from 'jsonwebtoken';
import pool from '../database.js';

/**
 * Create error with status
 */
const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Get all categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await pool.query(`SELECT * FROM categories`);
    res.status(200).json(categories[0]);
  } catch (e) {
    next(createError(e, 500));
  }
};

/**
 * Add categorie
 */
export const addCategories = async (req, res, next) => {
  try {
    const category = {
      name: req.body.name,
      description: req.body.description,
    };
    if (!category.name || !category.description) {
      next(createError('Bad Request, name and description are required!', 500));
    }
    const insert = await pool.query(
      `INSERT INTO categories(name, description)
        VALUES (?,?)`,
      [category.name, category.description]
    );
    res.status(201).json({ message: category });
  } catch (e) {
    next(createError(e, 500));
  }
};
