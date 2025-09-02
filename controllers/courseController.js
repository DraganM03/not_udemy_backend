import pool from '../database.js';
import { createError } from '../utils/error.js';

// Get all courses with filtering
export const getAllCourses = async (req, res, next) => {
  try {
    let sql = `
      SELECT 
        c.id, c.title, c.short_description, c.price, c.thumbnail, c.status,
        cat.name AS category_name,
        lvl.name AS level_name,
        CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.course_id = c.id) as average_rating
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN course_levels lvl ON c.level_id = lvl.id
      JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'published'
    `;
    const params = []; // Filtering logic

    if (req.query.category) {
      sql += ' AND cat.name = ?';
      params.push(req.query.category);
    }
    if (req.query.level) {
      sql += ' AND lvl.name = ?';
      params.push(req.query.level);
    }
    if (req.query.search) {
      sql += ' AND c.title LIKE ?';
      params.push(`%${req.query.search}%`);
    }

    sql += ' ORDER BY c.created_at DESC';

    const [courses] = await pool.query(sql, params);
    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
};

// Get all courses for the currently authenticated instructor
export const getInstructorCourses = async (req, res, next) => {
  try {
    const instructor_id = req.user.id;

    const sql = `
      SELECT
        c.id, c.title, c.status,
        cat.name AS category_name,
        c.thumbnail
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.instructor_id = ?
      ORDER BY c.created_at DESC
    `;

    const [courses] = await pool.query(sql, [instructor_id]);
    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
};

// Get a single course by ID with its lessons
export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const courseSql = `
      SELECT 
        c.*,
        cat.name AS category_name,
        lvl.name AS level_name,
        CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
        u.bio AS instructor_bio,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.course_id = c.id) as average_rating,
        (SELECT COUNT(e.id) FROM enrollments e WHERE e.course_id = c.id) as enrollment_count
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      JOIN course_levels lvl ON c.level_id = lvl.id
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `;
    const [courseResult] = await pool.query(courseSql, [id]);

    if (courseResult.length === 0) {
      return next(createError(404, 'Course not found.'));
    }
    const course = courseResult[0]; // Get lessons for the course

    const lessonsSql = `SELECT id, title, description, video_path, video_duration_seconds, order_index, is_free FROM lessons WHERE course_id = ? ORDER BY order_index`;
    const [lessons] = await pool.query(lessonsSql, [id]);

    res.status(200).json({ ...course, lessons });
  } catch (err) {
    next(err);
  }
};

// Create a new course
export const createCourse = async (req, res, next) => {
  try {
    const {
      title,
      description,
      short_description,
      category_id,
      level_id,
      price,
      duration_minutes,
    } = req.body;
    const instructor_id = req.user.id;

    const thumbnail = req.file
      ? `images/thumbnails/${req.file.filename}`
      : null;

    if (!title || !category_id || !level_id) {
      return next(createError(400, 'Title, category, and level are required.'));
    }

    const sql = `
      INSERT INTO courses (title, description, short_description, instructor_id, category_id, level_id, price, duration_minutes, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      title,
      description,
      short_description,
      instructor_id,
      category_id,
      level_id,
      price,
      duration_minutes,
      thumbnail,
    ]);

    res.status(201).json({
      message: 'Course created successfully',
      courseId: result.insertId,
    });
  } catch (err) {
    next(err);
  }
};

// Update a course
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const instructor_id = req.user.id;

    const [courseCheck] = await pool.query(
      'SELECT instructor_id FROM courses WHERE id = ?',
      [id]
    );

    if (courseCheck.length === 0) {
      return next(createError(404, 'Course not found.'));
    }

    const isInstructor = courseCheck[0].instructor_id === instructor_id;
    const isAdmin = req.user.role_id === 3;

    if (!isInstructor && !isAdmin) {
      return next(
        createError(403, 'You are not authorized to update this course.')
      );
    }

    const fieldsToUpdate = {};
    const allowedFields = [
      'title',
      'description',
      'short_description',
      'category_id',
      'level_id',
      'price',
      'duration_minutes',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    if (req.file) {
      fieldsToUpdate.thumbnail = `images/thumbnails/${req.file.filename}`;
    }

    const updateFields = Object.keys(fieldsToUpdate);
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update provided.' });
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), id];

    const sql = `UPDATE courses SET ${setClause} WHERE id = ?`;

    await pool.query(sql, values);

    res.status(200).json({ message: 'Course updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// Delete a course
export const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const instructor_id = req.user.id;

    const [courseCheck] = await pool.query(
      'SELECT instructor_id FROM courses WHERE id = ?',
      [id]
    );
    if (courseCheck.length === 0) {
      return next(createError(404, 'Course not found.'));
    }
    if (
      courseCheck[0].instructor_id !== instructor_id &&
      req.user.role_id !== 3
    ) {
      return next(
        createError(403, 'You are not authorized to delete this course.')
      );
    }

    await pool.query('DELETE FROM reviews WHERE course_id = ?', [id]);
    await pool.query('DELETE FROM enrollments WHERE course_id = ?', [id]);
    await pool.query('DELETE FROM courses WHERE id = ?', [id]);

    res.status(200).json({
      message: 'Course and all associated data deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
