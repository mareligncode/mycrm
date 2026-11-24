import Client from "../models/Client.js";
import Project from "../models/Project.js";
import FollowUp from "../models/FollowUp.js";
import { logActivity } from "../utils/activityLogger.js";
import { broadcastNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";

// @desc    Get all clients with filters, search and pagination
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res, next) => {
  try {
    const {
      search,
      status,
      clientType,
      source,
      assignedTo,
      isArchived = "false",
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {
      isArchived: isArchived === "true",
    };

    if (status) query.status = status;
    if (clientType) query.clientType = clientType;
    if (source) query.source = source;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { clientName: new RegExp(search, "i") },
        { companyName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: clients.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single client with projects and followups
// @route   GET /api/clients/:id
// @access  Private
export const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("assignedTo", "firstName lastName email phone avatar role")
      .populate("createdBy", "firstName lastName email");

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const projects = await Project.find({ client: client._id })
      .populate("projectManager", "firstName lastName")
      .select("projectName projectCode status priority progress deadline");

    const followUps = await FollowUp.find({ client: client._id })
      .populate("assignedTo", "firstName lastName")
      .sort({ scheduledAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...client.toObject(),
        projects,
        followUps,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a client
// @route   POST /api/clients
// @access  Private
export const createClient = async (req, res, next) => {
  try {
    const clientData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const client = await Client.create(clientData);

    await logActivity({
      action: "create_client",
      description: `Client "${client.clientName}" created by ${req.user.firstName} ${req.user.lastName}`,
      performedBy: req.user._id,
      entityType: "client",
      entityId: client._id,
    });

    if (client.assignedTo && client.assignedTo.length > 0) {
      await broadcastNotification({
        recipients: client.assignedTo,
        title: "New Client Assigned",
        message: `You have been assigned to client "${client.clientName}".`,
        type: "new_client",
        channels: ["in_app"],
        entityType: "client",
        entityId: client._id,
      });
    }

    if (await shouldDispatchTelegramEvent("newClient")) {
      await sendTelegramMessage(
        `🏢 *New Client Added*\n\n*Name:* ${client.clientName}\n*Company:* ${client.companyName || "N/A"}\n*Status:* ${client.status}\n*Created By:* ${req.user.firstName} ${req.user.lastName}`
      );
    }

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const beforeState = client.toObject();

    Object.assign(client, req.body);
    await client.save();

    await logActivity({
      action: "update_client",
      description: `Client "${client.clientName}" updated`,
      performedBy: req.user._id,
      entityType: "client",
      entityId: client._id,
      changes: {
        before: beforeState,
        after: client.toObject(),
      },
    });

    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private (admin, super_admin, manager)
export const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    await Client.findByIdAndDelete(req.params.id);

    await logActivity({
      action: "delete_client",
      description: `Client "${client.clientName}" was deleted by ${req.user.firstName} ${req.user.lastName}`,
      performedBy: req.user._id,
      entityType: "client",
      entityId: client._id,
    });

    res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle archive client
// @route   PATCH /api/clients/:id/archive
// @access  Private
export const toggleArchiveClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    client.isArchived = !client.isArchived;
    await client.save();

    await logActivity({
      action: client.isArchived ? "archive_client" : "restore_client",
      description: `Client "${client.clientName}" was ${client.isArchived ? "archived" : "restored"}`,
      performedBy: req.user._id,
      entityType: "client",
      entityId: client._id,
    });

    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// @desc    Add contact person to client
// @route   POST /api/clients/:id/contacts
// @access  Private
export const addContact = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    client.contacts.push(req.body);
    await client.save();

    res.status(201).json({ success: true, data: client.contacts });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove contact person from client
// @route   DELETE /api/clients/:id/contacts/:contactId
// @access  Private
export const removeContact = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    client.contacts = client.contacts.filter(
      (c) => c._id.toString() !== req.params.contactId
    );
    await client.save();

    res.status(200).json({ success: true, data: client.contacts });
  } catch (error) {
    next(error);
  }
};
