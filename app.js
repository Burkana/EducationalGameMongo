const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');

const app = express();

// CORS
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  credentials: true
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/gameusers', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Session
app.use(session({
  secret: '1234',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/gameusers' }),
  cookie: {
    sameSite: 'lax',
    secure: false
  }
}));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  names: String,
  email: { type: String, unique: true },
  passwords: String,
  coins: { type: Number, default: 0 }
});

const completedLevelSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  level: Number
});

const User = mongoose.model('User', userSchema);
const CompletedLevel = mongoose.model('CompletedLevel', completedLevelSchema);

// ==========================
// ROUTES
// ==========================

// Register
app.post('/register', async (req, res) => {
  try {
    const { names, email, passwords } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.send('<script>alert("Email already registered"); window.location.href="http://127.0.0.1:5500/register.html";</script>');
    }

    const newUser = new User({ names, email, passwords });
    await newUser.save();
    res.send('<script>window.location.href="http://127.0.0.1:5500/login.html";</script>');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('Server error');
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, passwords } = req.body;
    const user = await User.findOne({ email, passwords });
    if (!user) {
      return res.send('<script>alert("Invalid email or password"); window.location.href="http://127.0.0.1:5500/login.html";</script>');
    }

    req.session.user = { id: user._id, names: user.names, email: user.email };
    res.send('<script>window.location.href="http://127.0.0.1:5500/main.html";</script>');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

// Get current user
app.get('/api/me', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ ...req.session.user, coins: user.coins });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out');
    res.clearCookie('connect.sid');
    res.send('Logged out');
  });
});

// Complete level
app.post('/api/complete-level', async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const level = parseInt(req.body.level, 10);
    if (!userId || !level) return res.status(400).json({ error: 'Missing data' });

    const existing = await CompletedLevel.findOne({ userId, level });
    if (existing) {
      const user = await User.findById(userId);
      return res.json({ coins: user.coins, coinsAdded: false });
    }

    await CompletedLevel.create({ userId, level });
    await User.findByIdAndUpdate(userId, { $inc: { coins: 50 } });
    const updatedUser = await User.findById(userId);
    res.json({ coins: updatedUser.coins, coinsAdded: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// Add coins (+ or -)
app.post('/api/add-coins', async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const amount = parseInt(req.body.amount, 10);
    if (!userId || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.coins = Math.max(user.coins + amount, 0);
    await user.save();
    res.json({ coins: user.coins });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// Set coins to exact value
app.post('/api/set-coins', async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const newAmt = parseInt(req.body.newCoins, 10);
    if (!userId || !Number.isFinite(newAmt) || newAmt < 0) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const user = await User.findByIdAndUpdate(userId, { coins: newAmt }, { new: true });
    res.json({ coins: user.coins });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

// Start server
app.listen(3000, () => console.log('Server running at http://127.0.0.1:3000'));
