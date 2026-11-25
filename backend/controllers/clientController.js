import Client from "../models/Client.js";
import Deal from "../models/Deal.js";
import Project from "../models/Project.js";
import FollowUp from "../models/FollowUp.js";
import Activity from "../models/Activity.js";
import { logActivity } from "../utils/activityLogger.js";
import { broadcastNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";
import { sendEmail, isEmailConfigured } from "../utils/emailService.js";
import { toCsv, parseCsv } from "../utils/csv.js";
import { escapeRegex, parsePagination } from "../middleware/validate.js";

const normalizeAssignedTo = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

const ALLOWED_CLIENT_STATUSES = new Set([
  "lead",
  "contacted",
  "prospect",
  "proposal_sent",
  "negotiation",
  "won",
  "active",
  "inactive",
  "lost",
]);

const ALLOWED_CLIENT_SOURCES = new Set([
  "website",
  "telegram",
  "linkedin",
  "facebook",
  "referral",
  "cold_call",
  "direct",
  "other",
]);

const ALLOWED_CLIENT_TYPES = new Set(["individual", "company", "organization"]);

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
      const safeSearch = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { clientName: safeSearch },
        { companyName: safeSearch },
        { email: safeSearch },
        { tags: safeSearch },
      ];
    }

    const { page, limit, skip } = parsePagination(req.query);
    const allowedSortFields = new Set([
      "createdAt",
      "updatedAt",
      "clientName",
      "companyName",
      "status",
      "estimatedValue",
      "lastContactedAt",
    ]);
    const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : "createdAt";
    const sort = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .populate("assignedTo", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName email")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: clients.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: clients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single client with projects, deals, followups & 360 timeline
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

    const [projects, followUps, deals] = await Promise.all([
      Project.find({ client: client._id })
        .populate("projectManager", "firstName lastName")
        .select("projectName projectCode status priority progress deadline budget"),
      FollowUp.find({ client: client._id })
        .populate("assignedTo", "firstName lastName")
        .sort({ scheduledAt: -1 })
        .limit(20),
      Deal.find({ client: client._id })
        .populate("owner", "firstName lastName email")
        .sort({ updatedAt: -1 }),
    ]);

    const relatedIds = [
      client._id,
      ...deals.map((d) => d._id),
      ...projects.map((p) => p._id),
      ...followUps.map((f) => f._id),
    ];

    const activities = await Activity.find({ entityId: { $in: relatedIds } })
      .populate("performedBy", "firstName lastName email avatar")
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      data: {
        ...client.toObject(),
        projects,
        followUps,
        deals,
        activities,
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
      assignedTo: normalizeAssignedTo(req.body.assignedTo),
      estimatedValue: req.body.estimatedValue !== undefined ? Number(req.body.estimatedValue) || 0 : 0,
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
        channels: ["in_app", "email"],
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
    const updates = { ...req.body };

    if (updates.assignedTo !== undefined) {
      updates.assignedTo = normalizeAssignedTo(updates.assignedTo);
    }
    if (updates.estimatedValue !== undefined) {
      updates.estimatedValue = Number(updates.estimatedValue) || 0;
    }

    Object.assign(client, updates);
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

// @desc    Log a call, note, meeting, or send an email to a client
// @route   POST /api/clients/:id/touchpoints
// @access  Private
export const logClientTouchpoint = async (req, res, next) => {
  try {
    const { type = "note", subject, content, sendOutboundEmail = false } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: "Touchpoint content is required" });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    let emailResult = null;
    if (type === "email" && sendOutboundEmail) {
      if (!client.email) {
        return res.status(400).json({ success: false, message: "Client does not have an email address" });
      }
      emailResult = await sendEmail({
        to: client.email,
        subject: subject || `Follow-up from ${req.user.firstName} ${req.user.lastName}`,
        text: content,
      });
    }

    client.lastContactedAt = new Date();
    await client.save();

    const actionLabels = {
      note: "client_note",
      call: "client_call",
      email: "client_email",
      meeting: "client_meeting",
    };

    const activity = await logActivity({
      action: actionLabels[type] || "client_touchpoint",
      description: subject ? `[${type.toUpperCase()}] ${subject}: ${content}` : `[${type.toUpperCase()}] ${content}`,
      performedBy: req.user._id,
      entityType: "client",
      entityId: client._id,
      metadata: {
        touchpointType: type,
        subject: subject || null,
        emailDispatched: emailResult?.success || false,
        emailReason: emailResult?.reason || emailResult?.error || null,
      },
    });

    res.status(201).json({
      success: true,
      data: activity,
      emailConfigured: isEmailConfigured(),
      emailResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export clients as CSV
// @route   GET /api/clients/export
// @access  Private
export const exportClientsCsv = async (req, res, next) => {
  try {
    const { status, isArchived = "false" } = req.query;
    const query = { isArchived: isArchived === "true" };
    if (status) query.status = status;

    const clients = await Client.find(query)
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 });

    const csv = toCsv(
      [
        { key: "clientName", label: "clientName" },
        { key: "companyName", label: "companyName" },
        { key: "clientType", label: "clientType" },
        { key: "status", label: "status" },
        { key: "source", label: "source" },
        { key: "email", label: "email" },
        { key: "phone", label: "phone" },
        { key: "website", label: "website" },
        { key: "industry", label: "industry" },
        { key: "estimatedValue", label: "estimatedValue" },
        { key: "tags", label: "tags", value: (c) => (Array.isArray(c.tags) ? c.tags.join("; ") : "") },
        {
          key: "assignedTo",
          label: "assignedTo",
          value: (c) =>
            Array.isArray(c.assignedTo)
              ? c.assignedTo.map((u) => `${u.firstName} ${u.lastName}`).join("; ")
              : "",
        },
        { key: "notes", label: "notes", value: (c) => c.notes || c.description || "" },
      ],
      clients
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="clients-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Import clients from CSV text
// @route   POST /api/clients/import
// @access  Private
export const importClientsCsv = async (req, res, next) => {
  try {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== "string") {
      return res.status(400).json({ success: false, message: "csvText is required" });
    }

    const records = parseCsv(csvText);
    if (records.length === 0) {
      return res.status(400).json({ success: false, message: "No valid CSV rows found" });
    }

    if (records.length > 500) {
      return res.status(400).json({ success: false, message: "Maximum 500 rows per import" });
    }

    const created = [];
    const errors = [];

    for (let idx = 0; idx < records.length; idx += 1) {
      const row = records[idx];
      const clientName = row.clientName || row.name || row["Client Name"] || row["Name"];
      if (!clientName) {
        errors.push({ row: idx + 2, message: "Missing clientName" });
        continue;
      }

      const rawStatus = (row.status || "lead").toLowerCase().trim();
      const rawSource = (row.source || "other").toLowerCase().trim();
      const rawType = (row.clientType || "company").toLowerCase().trim();
      const rawTags = row.tags ? String(row.tags).split(/[;,]/).map((t) => t.trim()).filter(Boolean) : [];

      try {
        const client = await Client.create({
          clientName: clientName.trim(),
          companyName: (row.companyName || row.company || row["Company"] || "").trim() || undefined,
          clientType: ALLOWED_CLIENT_TYPES.has(rawType) ? rawType : "company",
          status: ALLOWED_CLIENT_STATUSES.has(rawStatus) ? rawStatus : "lead",
          source: ALLOWED_CLIENT_SOURCES.has(rawSource) ? rawSource : "other",
          email: (row.email || row["Email"] || "").trim() || undefined,
          phone: (row.phone || row["Phone"] || "").trim() || undefined,
          website: (row.website || "").trim() || undefined,
          industry: (row.industry || "").trim() || undefined,
          estimatedValue: Number(row.estimatedValue) || 0,
          tags: rawTags,
          notes: row.notes || row.description || undefined,
          createdBy: req.user._id,
        });
        created.push(client);
      } catch (err) {
        errors.push({ row: idx + 2, message: err.message });
      }
    }

    if (created.length > 0) {
      await logActivity({
        action: "import_clients",
        description: `Imported ${created.length} clients via CSV`,
        performedBy: req.user._id,
        entityType: "client",
        entityId: created[0]._id,
        metadata: { importedCount: created.length, errorCount: errors.length },
      });
    }

    res.status(201).json({
      success: true,
      importedCount: created.length,
      errorCount: errors.length,
      errors,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};
