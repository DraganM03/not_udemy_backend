import express from 'express';
import multer from 'multer';
import { loginUser, registerUser } from '../controllers/userController.js';

/* File Upload Setup */
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './static/images');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

/* Routes */
router.post('/login', loginUser);
router.post('/register', upload.single('profile_image'), registerUser);

export default router;
