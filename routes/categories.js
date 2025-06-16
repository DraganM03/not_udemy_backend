import express from 'express';
import {
  addCategories,
  getCategories,
} from '../controllers/categoriesController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', verifyToken, addCategories);

export default router;
