import Project from "../models/Project.js";
import { escapeRegex, parsePagination } from "../middleware/validate.js";
import { logActivity } from "../utils/activityLogger.js";
import { broadcastNotification, createNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";

export const normalizeProjectPayload = (body = {}) => {
  const normalized = { ...body };

  if (Array.isArray(normalized.clients)) {
    const uniqueClients = [
      ...new Set(
        normalized.clients
          .map((c) => (typeof c === "object" && c?._id ? String(c._id) : String(c || "")))
          .filter(Boolean)
      ),
    ];
    normalized.clients = uniqueClients;
    if (uniqueClients.length > 0) {
      if (!normalized.client || !uniqueClients.includes(String(normalized.client))) {
        normalized.client = uniqueClients[0];
      }
    } else {
      delete normalized.client;
    }
  } else if (normalized.client) {
    const primaryId =
      typeof normalized.client === "object" && normalized.client?._id
        ? String(normalized.client._id)
        : String(normalized.client);
    normalized.client = primaryId;
    normalized.clients = [primaryId];
  }

  if (normalized.budget !== undefined && (typeof normalized.budget !== "object" || normalized.budget === null)) {
    normalized.budget = { amount: Number(normalized.budget) || 0 };
  }

  if (Array.isArray(normalized.teamMembers)) {
    normalized.teamMembers = normalized.teamMembers
      .map((member) => {
        if (!member) return null;
        if (typeof member === "string") return { user: member };
        if (member.user) return member;
        return null;
      })
      .filter(Boolean);
  }

  return normalized;
};

// @desc    Get all projects with filters and pagination
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
  try {
    const {
      client,
      status,
      category,
      priority,
      projectManager,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    const andConditions = [];

    if (client) {
      andConditions.push({ $or: [{ client }, { clients: client }] });
    }
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (projectManager) query.projectManager = projectManager;

    if (search) {
      const safeSearch = new RegExp(escapeRegex(search), "i");
      andConditions.push({
        $or: [
          { projectName: safeSearch },
          { projectCode: safeSearch },
          { description: safeSearch },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const { page: pageNum, limit: limitNum, skip } = parsePagination({ page, limit });

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate("client", "clientName companyName email phone status")
      .populate("clients", "clientName companyName email phone status")
      .populate("projectManager", "firstName lastName email avatar")
      .populate("teamMembers.user", "firstName lastName email avatar role")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project details
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client", "clientName companyName email phone contacts address status")
      .populate("clients", "clientName companyName email phone status")
      .populate("projectManager", "firstName lastName email avatar phone")
      .populate("teamMembers.user", "firstName lastName email avatar role department")
      .populate("attachments.uploadedBy", "firstName lastName")
      .populate("createdBy", "firstName lastName");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res, next) => {
  try {
    const projectData = {
      ...normalizeProjectPayload(req.body),
      createdBy: req.user._id,
    };

    const project = await Project.create(projectData);
    await project.populate("client", "clientName companyName email phone status");
    await project.populate("clients", "clientName companyName email phone status");
    await project.populate("teamMembers.user", "firstName lastName email avatar role");

    await logActivity({
      action: "create_project",
      description: `Project "${project.projectName}" (${project.projectCode}) created`,
      performedBy: req.user._id,
      entityType: "project",
      entityId: project._id,
    });

    if (project.projectManager) {
      await createNotification({
        recipient: project.projectManager,
        title: "Assigned as Project Manager",
        message: `You were assigned as Project Manager for "${project.projectName}".`,
        type: "new_project",
        channels: ["in_app"],
        entityType: "project",
        entityId: project._id,
      });
    }

    if (project.teamMembers && project.teamMembers.length > 0) {
      const memberIds = project.teamMembers.map((m) => m.user);
      await broadcastNotification({
        recipients: memberIds,
        title: "Assigned to Project",
        message: `You have been added as a team member to project "${project.projectName}".`,
        type: "task_assigned",
        channels: ["in_app"],
        entityType: "project",
        entityId: project._id,
      });
    }

    if (await shouldDispatchTelegramEvent("newProject")) {
      await sendTelegramMessage(
        `🚀 *New Project Created*\n\n*Project:* ${project.projectName} (${project.projectCode})\n*Category:* ${project.category}\n*Priority:* ${project.priority}\n*Deadline:* ${project.deadline ? new Date(project.deadline).toLocaleDateString() : "TBD"}`
      );
    }

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const previousStatus = project.status;
    const beforeState = project.toObject();

    Object.assign(project, normalizeProjectPayload(req.body));

    if (req.body.status === "completed" && previousStatus !== "completed") {
      project.completedAt = new Date();
      project.progress = 100;

      if (await shouldDispatchTelegramEvent("projectCompleted")) {
        await sendTelegramMessage(
          `🎉 *Project Completed!*\n\n*Project:* ${project.projectName} (${project.projectCode})\n*Completed On:* ${new Date().toLocaleDateString()}`
        );
      }
    }

    await project.save();
    await project.populate("client", "clientName companyName email phone status");
    await project.populate("clients", "clientName companyName email phone status");
    await project.populate("teamMembers.user", "firstName lastName email avatar role");

    await logActivity({
      action: "update_project",
      description: `Project "${project.projectName}" was updated`,
      performedBy: req.user._id,
      entityType: "project",
      entityId: project._id,
      changes: {
        before: beforeState,
        after: project.toObject(),
      },
    });

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (admin, super_admin, manager)
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await Project.findByIdAndDelete(req.params.id);

    await logActivity({
      action: "delete_project",
      description: `Project "${project.projectName}" was deleted`,
      performedBy: req.user._id,
      entityType: "project",
      entityId: project._id,
    });

    res.status(200).json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member to project
// @route   POST /api/projects/:id/members
// @access  Private
export const addTeamMember = async (req, res, next) => {
  try {
    const user = req.body.user || req.body.userId;
    const { responsibility } = req.body;
    if (!user) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const alreadyMember = project.teamMembers.some(
      (m) => m.user && m.user.toString() === String(user)
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User already in team members" });
    }

    project.teamMembers.push({ user, responsibility, assignedAt: new Date() });
    await project.save();
    await project.populate("teamMembers.user", "firstName lastName email avatar role");

    await createNotification({
      recipient: user,
      title: "Added to Project Team",
      message: `You were added to project "${project.projectName}" (${responsibility || "Team Member"}).`,
      type: "task_assigned",
      channels: ["in_app"],
      entityType: "project",
      entityId: project._id,
    });

    res.status(200).json({ success: true, data: project.teamMembers });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
export const removeTeamMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.teamMembers = project.teamMembers.filter(
      (m) => m.user && m.user.toString() !== req.params.userId
    );
    await project.save();
    await project.populate("teamMembers.user", "firstName lastName email avatar role");

    res.status(200).json({ success: true, data: project.teamMembers });
  } catch (error) {
    next(error);
  }
};

// @desc    Add attachment to project
// @route   POST /api/projects/:id/attachments
// @access  Private
export const addAttachment = async (req, res, next) => {
  try {
    const { name, url } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.attachments.push({
      name,
      url,
      uploadedBy: req.user._id,
    });
    await project.save();

    res.status(201).json({ success: true, data: project.attachments });
  } catch (error) {
    next(error);
  }
};
