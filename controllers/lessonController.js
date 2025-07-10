import pool from '../database.js';
import { createError } from '../utils/error.js';

// Add a lesson to a course
export const addLesson = async (req, res, next) => {
  try {
    const {
      course_id,
      title,
      description,
      video_duration_seconds,
      order_index,
      is_free,
    } = req.body;
    const instructor_id = req.user.id;

    // --- NEW: Handle video file upload ---
    // The path to the uploaded video file will be stored.
    // If a file is uploaded, use its path. If not, video_path remains null.
    const video_path = req.file ? `videos/lessons/${req.file.filename}` : null;

    // Verify instructor owns the course
    const [courseCheck] = await pool.query(
      'SELECT instructor_id FROM courses WHERE id = ?',
      [course_id]
    );
    if (
      courseCheck.length === 0 ||
      (courseCheck[0].instructor_id !== instructor_id && req.user.role_id !== 3)
    ) {
      return next(
        createError(403, 'You can only add lessons to your own courses.')
      );
    }

    const sql = `
            INSERT INTO lessons (course_id, title, description,  video_path, video_duration_seconds, order_index, is_free)
            VALUES (?, ?, ?, ?,  ?, ?, ?)
        `;
    const [result] = await pool.query(sql, [
      course_id,
      title,
      description,
      video_path,
      video_duration_seconds,
      order_index,
      is_free,
    ]);

    res.status(201).json({
      message: 'Lesson added successfully',
      lessonId: result.insertId,
    });
  } catch (err) {
    next(err);
  }
};

// Update a lesson
export const updateLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      videp_path,
      video_duration_seconds,
      order_index,
      is_free,
    } = req.body;
    const instructor_id = req.user.id;

    // --- NEW: Handle video file update ---
    // If a new video is uploaded, it will replace the old path.
    const video_path = req.file
      ? `videos/lessons/${req.file.filename}`
      : req.body.video_path;

    // Verify instructor owns the course this lesson belongs to
    const [lessonCheck] = await pool.query(
      `
            SELECT c.instructor_id FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ?
        `,
      [id]
    );

    if (
      lessonCheck.length === 0 ||
      (lessonCheck[0].instructor_id !== instructor_id && req.user.role_id !== 3)
    ) {
      return next(
        createError(403, 'You are not authorized to update this lesson.')
      );
    }

    // Note: You might want to add logic here to delete the old video file from the server
    // when a new one is uploaded to save space.

    const sql = `
            UPDATE lessons SET title = ?, description = ?,  video_path = ?, video_duration_seconds = ?, order_index = ?, is_free = ?
            WHERE id = ?
        `;
    await pool.query(sql, [
      title,
      description,
      video_path,
      video_duration_seconds,
      order_index,
      is_free,
      id,
    ]);

    res.status(200).json({ message: 'Lesson updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// Update the order of lessons
export const updateLessonOrder = async (req, res, next) => {
  const { lessons } = req.body; // Expects an array of { id, order_index }

  if (!lessons || !Array.isArray(lessons)) {
    return next(
      createError(400, "Invalid payload. 'lessons' array is required.")
    );
  }

  const connection = await pool.getConnection(); // Get a connection from the pool for the transaction

  try {
    await connection.beginTransaction(); // Start the transaction

    // Create an array of promises for all the update queries
    const updatePromises = lessons.map((lesson) => {
      return connection.query(
        'UPDATE lessons SET order_index = ? WHERE id = ?',
        [lesson.order_index, lesson.id]
      );
    });

    // Execute all update queries in parallel
    await Promise.all(updatePromises);

    await connection.commit(); // If all updates succeed, commit the transaction
    res.status(200).json({ message: 'Lesson order updated successfully.' });
  } catch (err) {
    await connection.rollback(); // If any update fails, roll back the entire transaction
    next(err);
  } finally {
    connection.release(); // Release the connection back to the pool
  }
};

// Delete a lesson
export const deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const instructor_id = req.user.id;

    // Verify instructor owns the course this lesson belongs to
    const [lessonCheck] = await pool.query(
      `
            SELECT c.instructor_id, l.video_path FROM lessons l
            JOIN courses c ON l.course_id = c.id
            WHERE l.id = ?
        `,
      [id]
    );

    if (
      lessonCheck.length === 0 ||
      (lessonCheck[0].instructor_id !== instructor_id && req.user.role_id !== 3)
    ) {
      return next(
        createError(403, 'You are not authorized to delete this lesson.')
      );
    }

    // Note: You should add logic here to delete the video file from the filesystem
    // using the `lessonCheck[0].video_path` to prevent orphaned files.
    // Example: import fs from 'fs'; fs.unlinkSync(path.join(__dirname, '..', 'static', lessonCheck[0].video_path));

    await pool.query('DELETE FROM lessons WHERE id = ?', [id]);
    res.status(200).json({ message: 'Lesson deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// Get all lessons for a specific course
export const getLessonsForCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const [lessons] = await pool.query(
      'SELECT id, title, description, video_path, video_duration_seconds, order_index, is_free FROM lessons WHERE course_id = ? ORDER BY order_index ASC',
      [courseId]
    );
    res.status(200).json(lessons);
  } catch (err) {
    next(err);
  }
};
