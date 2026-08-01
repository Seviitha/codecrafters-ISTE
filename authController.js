const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  try {
    const { firstName, lastName, email, password, role, department } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role === 'officer' ? 'officer' : 'citizen',
      department: role === 'officer' ? department || null : null,
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.', error: err.message });
  }
}

async function me(req, res) {
  return res.json({ user: req.user.toSafeObject() });
}

module.exports = { register, login, me };
