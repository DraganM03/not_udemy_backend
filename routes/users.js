import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/verifyToken.js';
import {
  loginUser,
  registerUser,
  updateUser,
} from '../controllers/userController.js';

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './static/images/profiles');
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

router.post('/login', loginUser);
router.post('/register', upload.single('profile_image'), registerUser);
router.patch(
  '/update/:id',
  verifyToken,
  upload.single('profile_image'),
  updateUser
);

export default router;
