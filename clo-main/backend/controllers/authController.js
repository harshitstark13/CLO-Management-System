const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if user with that email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2) Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3) Generate JWT with coordinatorFor included
    const token = jwt.sign(
      { id: user._id, coordinatorFor: user.coordinatorFor }, // Include coordinatorFor in token
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log user details for debugging
    console.log('Logged in user:', {
      id: user._id,
      email: user.email,
      role: user.role,
      coordinatorFor: user.coordinatorFor,
    });

    // 4) Return user info + token with additional fields
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        coordinatorFor: user.coordinatorFor,
        assignedSubjects: user.assignedSubjects,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message });
  }
};