import express from 'express';
import {
  enrollInCourse,
  getUserEnrolledCourses,
  updateLessonProgress,
  getEnrollmentStatus, // <-- IMPORT THE NEW FUNCTION
} from '../controllers/enrollmentController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.use(verifyToken); // All routes here require a logged-in user

router.post('/', enrollInCourse);
router.get('/my-courses', getUserEnrolledCourses);
router.get('/status/:courseId', getEnrollmentStatus); // <-- ADD NEW ROUTE
router.post('/progress', updateLessonProgress);

export default router;
