import express from 'express';
import {
  addOrUpdateReview,
  getCourseReviews,
  deleteReview,
} from '../controllers/reviewController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/course/:courseId', getCourseReviews);

router.post('/', verifyToken, addOrUpdateReview);
router.delete('/:id', verifyToken, deleteReview);

export default router;
