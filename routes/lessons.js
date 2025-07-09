import express from 'express';
import multer from 'multer';
import {
  addLesson,
  updateLesson,
  deleteLesson,
  getLessonsForCourse,
} from '../controllers/lessonController.js';
import { streamVideo } from '../controllers/videoStream.js';
import { verifyInstructor, verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// Multer setup for video uploads
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './static/videos/lessons');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        '-' +
        uniqueSuffix +
        '.' +
        file.originalname.split('.').pop()
    );
  },
});

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video')) {
    cb(null, true);
  } else {
    cb(createError(400, 'Not a video! Please upload only videos.'), false);
  }
};

const uploadVideo = multer({ storage: videoStorage, fileFilter: videoFilter });

router.get('/stream/:lessonId', verifyToken, streamVideo);

router.get('/course/:courseId', getLessonsForCourse);

router.post('/', verifyInstructor, uploadVideo.single('video'), addLesson);
router.patch(
  '/:id',
  verifyInstructor,
  uploadVideo.single('video'),
  updateLesson
);
router.delete('/:id', verifyInstructor, deleteLesson);

export default router;
