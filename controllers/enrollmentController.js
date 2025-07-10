import pool from '../database.js';
import { createError } from '../utils/error.js';

// Enroll a user in a course
export const enrollInCourse = async (req, res, next) => {
  try {
    const { course_id } = req.body;
    const user_id = req.user.id;

    const [course] = await pool.query(
      "SELECT id, price FROM courses WHERE id = ? AND status = 'published'",
      [course_id]
    );
    if (course.length === 0) {
      return next(
        createError(404, 'Course not found or is not available for enrollment.')
      );
    }

    const sql = `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`;
    await pool.query(sql, [user_id, course_id]);

    res.status(201).json({ message: 'Successfully enrolled in the course.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return next(createError(409, 'You are already enrolled in this course.'));
    }
    next(err);
  }
};

// Get all courses a user is enrolled in
export const getUserEnrolledCourses = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const sql = `
            SELECT 
                c.id, c.title, c.thumbnail, c.short_description,
                CONCAT(u.first_name, ' ', u.last_name) AS instructor_name,
                e.progress_percentage
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON c.instructor_id = u.id
            WHERE e.user_id = ?
        `;
    const [courses] = await pool.query(sql, [user_id]);
    res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
};

// Check if a user is enrolled in a specific course
export const getEnrollmentStatus = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    const sql = `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`;
    const [enrollment] = await pool.query(sql, [user_id, courseId]);

    if (enrollment.length > 0) {
      res.status(200).json({ isEnrolled: true });
    } else {
      res.status(200).json({ isEnrolled: false });
    }
  } catch (err) {
    next(err);
  }
};

// Update lesson progress for a user
export const updateLessonProgress = async (req, res, next) => {
  try {
    const { lesson_id, completed, watch_time_seconds } = req.body;
    const user_id = req.user.id;

    const [enrollmentCheck] = await pool.query(
      `
            SELECT e.id FROM enrollments e
            JOIN lessons l ON e.course_id = l.course_id
            WHERE e.user_id = ? AND l.id = ?
        `,
      [user_id, lesson_id]
    );

    if (enrollmentCheck.length === 0) {
      return next(
        createError(
          403,
          'You must be enrolled in the course to track progress.'
        )
      );
    }

    const sql = `
            INSERT INTO lesson_progress (user_id, lesson_id, completed, watch_time_seconds, completed_at)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            completed = VALUES(completed),
            watch_time_seconds = VALUES(watch_time_seconds),
            completed_at = IF(VALUES(completed) = TRUE AND completed_at IS NULL, NOW(), completed_at)
        `;
    await pool.query(sql, [
      user_id,
      lesson_id,
      completed,
      watch_time_seconds,
      completed ? new Date() : null,
    ]);

    await recalculateCourseProgress(user_id, lesson_id);

    res.status(200).json({ message: 'Progress updated.' });
  } catch (err) {
    next(err);
  }
};

async function recalculateCourseProgress(userId, lessonId) {
  const [lesson] = await pool.query(
    'SELECT course_id FROM lessons WHERE id = ?',
    [lessonId]
  );
  if (lesson.length === 0) return;
  const courseId = lesson[0].course_id;

  const [totalLessonsResult] = await pool.query(
    'SELECT COUNT(id) as total FROM lessons WHERE course_id = ?',
    [courseId]
  );
  const totalLessons = totalLessonsResult[0].total;
  if (totalLessons === 0) return;

  const [completedLessonsResult] = await pool.query(
    `
        SELECT COUNT(lp.id) as completed
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = ? AND l.course_id = ? AND lp.completed = TRUE
    `,
    [userId, courseId]
  );
  const completedLessons = completedLessonsResult[0].completed;

  const progressPercentage = (completedLessons / totalLessons) * 100;

  await pool.query(
    'UPDATE enrollments SET progress_percentage = ? WHERE user_id = ? AND course_id = ?',
    [progressPercentage.toFixed(2), userId, courseId]
  );
}
