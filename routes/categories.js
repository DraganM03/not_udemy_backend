import express from 'express';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { verifyInstructor } from '../middleware/verifyToken.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', verifyInstructor, addCategory);
router.patch('/:id', verifyInstructor, updateCategory);
router.delete('/:id', verifyInstructor, deleteCategory);

export default router;
