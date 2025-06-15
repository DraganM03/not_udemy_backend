import express from 'express';
import multer from 'multer';
import { loginUser, registerUser } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ dest: 'static/images' });

router.post('/login', loginUser);
router.post('/register', upload.single('profile_image'), registerUser);

export default router;
