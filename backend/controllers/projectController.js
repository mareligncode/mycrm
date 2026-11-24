import Project from "../models/Project.js";
import { logActivity } from "../utils/activityLogger.js";
import { broadcastNotification, createNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";

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

    if (client) query.client = client;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (projectManager) query.projectManager = projectManager;

    if (search) {
      query.$or = [
        { projectName: new RegExp(search, "i") },
        { projectCode: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate("client", "clientName companyName email phone")
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
      .populate("client", "clientName companyName email phone contacts address")
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
      ...req.body,
      createdBy: req.user._id,
    };

    const project = await Project.create(projectData);

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

    Object.assign(project, req.body);

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
    const { user, responsibility } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const alreadyMember = project.teamMembers.some((m) => m.user.toString() === user);
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User already in team members" });
    }

    project.teamMembers.push({ user, responsibility, assignedAt: new Date() });
    await project.save();

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
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();

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
