import express from 'express';
import { query } from '../db';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, role FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  const { name, email, role } = req.body;
  try {
    const result = await query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, role || 'member']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
