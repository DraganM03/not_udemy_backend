import express from 'express';
import multer from 'multer';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController.js';
import { verifyInstructor } from '../middleware/verifyToken.js';

const router = express.Router();

// Multer setup for course thumbnails
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './static/images/thumbnails'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]
    );
  },
});
const upload = multer({ storage: storage });

router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.post('/', verifyInstructor, upload.single('thumbnail'), createCourse);
router.patch(
  '/:id',
  verifyInstructor,
  upload.single('thumbnail'),
  updateCourse
);
router.delete('/:id', verifyInstructor, deleteCourse);

export default router;
