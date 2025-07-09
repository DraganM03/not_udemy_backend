import express from 'express';
import {
  enrollInCourse,
  getUserEnrolledCourses,
  updateLessonProgress,
} from '../controllers/enrollmentController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', enrollInCourse);
router.get('/my-courses', getUserEnrolledCourses);
router.post('/progress', updateLessonProgress);

export default router;
