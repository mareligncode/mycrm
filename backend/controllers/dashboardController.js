import Client from "../models/Client.js";
import Project from "../models/Project.js";
import FollowUp from "../models/FollowUp.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";

// @desc    Get dashboard metrics & summaries
// @route   GET /api/dashboard
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalClients,
      clientsByStatus,
      totalProjects,
      projectsByStatus,
      pendingFollowUps,
      todayFollowUps,
      recentActivities,
      totalUsers,
    ] = await Promise.all([
      Client.countDocuments({ isArchived: false }),
      Client.aggregate([
        { $match: { isArchived: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Project.countDocuments(),
      Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      FollowUp.countDocuments({ status: { $in: ["pending", "in_progress"] } }),
      FollowUp.countDocuments({
        status: { $in: ["pending", "in_progress"] },
        scheduledAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      Activity.find()
        .populate("performedBy", "firstName lastName email avatar")
        .sort({ createdAt: -1 })
        .limit(10),
      User.countDocuments({ status: "active" }),
    ]);

    // Format aggregate results into maps
    const clientsStatusMap = {};
    clientsByStatus.forEach((item) => {
      clientsStatusMap[item._id] = item.count;
    });

    const projectsStatusMap = {};
    projectsByStatus.forEach((item) => {
      projectsStatusMap[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalClients,
          totalProjects,
          totalUsers,
          pendingFollowUps,
          todayFollowUps,
        },
        clientsByStatus: clientsStatusMap,
        projectsByStatus: projectsStatusMap,
        recentActivities,
      },
    });
  } catch (error) {
    next(error);
  }
};
