import pool from '../database.js';
import { createError } from '../utils/error.js';

// Get all categories
export const getCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      `SELECT * FROM categories ORDER BY name`
    );
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

// Add a new category (Admin/Instructor only)
export const addCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return next(createError(400, 'Category name is required.'));
    }
    const [result] = await pool.query(
      `INSERT INTO categories(name, description) VALUES (?, ?)`,
      [name, description]
    );
    res
      .status(201)
      .json({ message: 'Category created', categoryId: result.insertId });
  } catch (err) {
    // Handle unique constraint violation
    if (err.code === 'ER_DUP_ENTRY') {
      return next(
        createError(409, 'A category with this name already exists.')
      );
    }
    next(err);
  }
};

// Update a category (Admin/Instructor only)
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    if (!name) {
      return next(createError(400, 'Category name is required.'));
    }

    const [result] = await pool.query(
      `UPDATE categories SET name = ?, description = ? WHERE id = ?`,
      [name, description, id]
    );

    if (result.affectedRows === 0) {
      return next(createError(404, 'Category not found.'));
    }

    res.status(200).json({ message: 'Category updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// Delete a category (Admin/Instructor only)
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Note: You might want to prevent deleting categories that are in use by courses.
    // This requires an additional check.
    const [courses] = await pool.query(
      'SELECT id FROM courses WHERE category_id = ?',
      [id]
    );
    if (courses.length > 0) {
      return next(
        createError(
          400,
          'Cannot delete category as it is currently assigned to one or more courses.'
        )
      );
    }

    const [result] = await pool.query(`DELETE FROM categories WHERE id = ?`, [
      id,
    ]);

    if (result.affectedRows === 0) {
      return next(createError(404, 'Category not found.'));
    }

    res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
