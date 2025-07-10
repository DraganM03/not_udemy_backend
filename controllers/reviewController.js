import pool from '../database.js';
import { createError } from '../utils/error.js';

// Add or update a review for a course
export const addOrUpdateReview = async (req, res, next) => {
  try {
    const { course_id, rating, comment } = req.body;
    const user_id = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return next(createError(400, 'Rating must be between 1 and 5.'));
    }

    const [enrollmentCheck] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [user_id, course_id]
    );
    if (enrollmentCheck.length === 0) {
      return next(
        createError(403, 'You must be enrolled in a course to leave a review.')
      );
    }

    const sql = `
            INSERT INTO reviews (user_id, course_id, rating, comment)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            comment = VALUES(comment)
        `;
    await pool.query(sql, [user_id, course_id, rating, comment]);

    res.status(200).json({ message: 'Review submitted successfully.' });
  } catch (err) {
    next(err);
  }
};

// Get all reviews for a specific course
export const getCourseReviews = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const sql = `
            SELECT 
                r.id, r.rating, r.comment, r.created_at,
                u.id as user_id,
                CONCAT(u.first_name, ' ', u.last_name) AS user_name,
                u.profile_image
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.course_id = ?
            ORDER BY r.created_at DESC
        `;
    const [reviews] = await pool.query(sql, [courseId]);
    res.status(200).json(reviews);
  } catch (err) {
    next(err);
  }
};

// Delete a review
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params; // review id
    const user_id = req.user.id;

    const [reviewCheck] = await pool.query(
      'SELECT user_id FROM reviews WHERE id = ?',
      [id]
    );
    if (reviewCheck.length === 0) {
      return next(createError(404, 'Review not found.'));
    }
    if (reviewCheck[0].user_id !== user_id && req.user.role_id !== 3) {
      return next(createError(403, 'You can only delete your own review.'));
    }

    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
