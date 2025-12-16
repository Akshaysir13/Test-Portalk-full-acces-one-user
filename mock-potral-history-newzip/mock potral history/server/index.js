import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.post('/api/login', async (req, res) => {
  const { email, password, deviceToken, userAgent } = req.body;
  
  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND password = $2',
      [email.trim(), password]
    );
    
    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }
    
    const user = userResult.rows[0];
    
    if (user.role === 'student' && !user.approved) {
      return res.json({ success: false, message: 'Your account is pending admin approval.' });
    }
    
    const activeSession = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND is_active = TRUE',
      [user.id]
    );
    
    if (activeSession.rows.length > 0 && activeSession.rows[0].device_token !== deviceToken) {
      await pool.query(
        `INSERT INTO session_violations (user_id, violation_type, old_device_token, new_device_token, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'multiple_device_login', activeSession.rows[0].device_token, deviceToken, userAgent]
      );
      
      await pool.query(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
        [user.id]
      );
    }
    
    await pool.query(
      `INSERT INTO user_sessions (user_id, device_token, user_agent, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT DO NOTHING`,
      [user.id, deviceToken, userAgent]
    );
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role, approved: user.approved },
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/verify-session', async (req, res) => {
  const { userId, deviceToken } = req.body;
  
  try {
    const session = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND device_token = $2 AND is_active = TRUE',
      [userId, deviceToken]
    );
    
    if (session.rows.length === 0) {
      return res.json({ valid: false, message: 'Session expired. Someone logged in from another device.' });
    }
    
    await pool.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE user_id = $1 AND device_token = $2',
      [userId, deviceToken]
    );
    
    res.json({ valid: true });
  } catch (error) {
    console.error('Verify session error:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

app.post('/api/logout', async (req, res) => {
  const { userId, deviceToken } = req.body;
  
  try {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1 AND device_token = $2',
      [userId, deviceToken]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false });
  }
});

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, message: 'This email already exists' });
    }
    
    await pool.query(
      'INSERT INTO users (email, password, role, approved) VALUES ($1, $2, $3, $4)',
      [email.trim(), password, 'student', false]
    );
    
    res.json({ success: true, message: 'Account created. Pending admin approval.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, role, approved, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json([]);
  }
});

app.post('/api/users/add', async (req, res) => {
  const { email, password, autoApprove } = req.body;
  
  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ success: false, message: 'This email already exists' });
    }
    
    await pool.query(
      'INSERT INTO users (email, password, role, approved) VALUES ($1, $2, $3, $4)',
      [email.trim(), password, 'student', autoApprove || false]
    );
    
    res.json({ success: true, message: `Student ${email} added successfully!` });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/users/approve', async (req, res) => {
  const { email } = req.body;
  
  try {
    await pool.query('UPDATE users SET approved = TRUE WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ success: false });
  }
});

app.post('/api/users/reject', async (req, res) => {
  const { email } = req.body;
  
  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ success: false });
  }
});

app.delete('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/api/violations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sv.*, u.email 
      FROM session_violations sv 
      JOIN users u ON sv.user_id = u.id 
      ORDER BY sv.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json([]);
  }
});

app.post('/api/attempts', async (req, res) => {
  const { userId, studentEmail, testName, testId, score, totalQuestions, correctAnswers, wrongAnswers, unattempted, timeTaken, violations } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO test_attempts (user_id, student_email, test_name, test_id, score, total_questions, correct_answers, wrong_answers, unattempted, time_taken, violations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, studentEmail, testName, testId, score, totalQuestions, correctAnswers, wrongAnswers, unattempted, timeTaken, JSON.stringify(violations || [])]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Save attempt error:', error);
    res.status(500).json({ success: false });
  }
});

app.get('/api/attempts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_attempts ORDER BY submitted_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json([]);
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
