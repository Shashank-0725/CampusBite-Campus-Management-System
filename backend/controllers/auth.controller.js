// controllers/auth.controller.js
const User = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signToken } = require('../utils/jwt.util');

async function register(req, res) {
  try {
    const { name, usnOrStaffId, email, mobile, password, role } = req.body;

    if (!name || !usnOrStaffId || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existing = await User.findOne({
      $or: [{ email }, { usnOrStaffId }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'User with this email or ID already exists' });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      usnOrStaffId,
      email,
      mobile: mobile || '',
      passwordHash,
      role: 'student', // public login for students
    });

    const token = signToken({ id: user._id, role: user.role });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        usnOrStaffId: user.usnOrStaffId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function login(req, res) {
  try {
    const { emailOrId, password } = req.body;

    if (!emailOrId || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrId }, { usnOrStaffId: emailOrId }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Email Id not registered' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Password' });
    }

    const token = signToken({ id: user._id, role: user.role });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        usnOrStaffId: user.usnOrStaffId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { register, login, me };
