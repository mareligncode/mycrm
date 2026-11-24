import Activity from "../models/Activity.js";

// @desc    Get activities with filtering & pagination
// @route   GET /api/activities
// @access  Private
export const getActivities = async (req, res, next) => {
  try {
    const { entityType, entityId, performedBy, page = 1, limit = 25 } = req.query;

    const query = {};
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (performedBy) query.performedBy = performedBy;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .populate("performedBy", "firstName lastName email avatar role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};
