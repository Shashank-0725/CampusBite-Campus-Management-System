const User = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password.util');

// GET /api/users/me
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/me
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, mobile },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/users/me/password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ok = await comparePassword(oldPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
