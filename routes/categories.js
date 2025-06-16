import express from 'express';
import {
  addCategory,
  getCategories,
} from '../controllers/categoriesController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', verifyToken, addCategory);

export default router;
