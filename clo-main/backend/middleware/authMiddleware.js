const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Populate req.user with full user data, not just excluding password
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Ensure coordinatorFor is available from token if present
    if (decoded.coordinatorFor) {
      req.user.coordinatorFor = decoded.coordinatorFor;
    }
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Token verification failed' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};

exports.instructorOnly = (req, res, next) => {
  if (req.user?.role !== 'instructor') {
    return res.status(403).json({ message: 'Forbidden: Instructors only' });
  }
  next();
};

exports.courseCoordinatorOnly = (req, res, next) => {
  console.log('Checking CC authorization:', {
    userId: req.user?._id,
    coordinatorFor: req.user?.coordinatorFor,
  });
  if (!req.user || !req.user.coordinatorFor) {
    return res
      .status(403)
      .json({ message: 'Forbidden: Course Coordinators only' });
  }
  next();
};