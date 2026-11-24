import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";

// @desc    Get all users with filtering and pagination
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res, next) => {
  try {
    const { role, status, department, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (department) query.department = new RegExp(department, "i");

    if (search) {
      query.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("invitedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("invitedBy", "firstName lastName email");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details (Admin only)
// @route   PUT /api/users/:id
// @access  Private (admin, super_admin)
export const updateUser = async (req, res, next) => {
  try {
    const { role, status, department, permissions, firstName, lastName, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Protect super_admin modification unless self or super_admin
    if (user.role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Only a super_admin can modify another super_admin" });
    }

    const before = {
      role: user.role,
      status: user.status,
      department: user.department,
      permissions: user.permissions,
    };

    if (role) user.role = role;
    if (status) user.status = status;
    if (department !== undefined) user.department = department;
    if (permissions) user.permissions = permissions;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    await logActivity({
      action: "update_user",
      description: `User ${user.email} was updated by ${req.user.email}`,
      performedBy: req.user._id,
      entityType: "user",
      entityId: user._id,
      changes: {
        before,
        after: {
          role: user.role,
          status: user.status,
          department: user.department,
          permissions: user.permissions,
        },
      },
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate user
// @route   DELETE /api/users/:id
// @access  Private (super_admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      action: "delete_user",
      description: `User ${user.email} was deleted by ${req.user.email}`,
      performedBy: req.user._id,
      entityType: "user",
      entityId: user._id,
    });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
