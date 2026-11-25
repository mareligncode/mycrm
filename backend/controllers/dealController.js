import Deal, { DEAL_STAGES, STAGE_DEFAULT_PROBABILITY } from "../models/Deal.js";
import Client from "../models/Client.js";
import { logActivity } from "../utils/activityLogger.js";
import { createNotification } from "../utils/notificationService.js";
import { sendTelegramMessage, shouldDispatchTelegramEvent } from "../utils/telegramService.js";
import { toCsv } from "../utils/csv.js";
import { escapeRegex, parsePagination } from "../middleware/validate.js";

export const computePipelineForecast = (deals) => {
  const stageBreakdown = {};
  DEAL_STAGES.forEach((stage) => {
    stageBreakdown[stage] = { count: 0, totalAmount: 0, weightedAmount: 0 };
  });

  let openPipelineValue = 0;
  let weightedForecast = 0;
  let wonRevenue = 0;
  let lostRevenue = 0;
  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const deal of deals) {
    const amount = Number(deal.amount) || 0;
    const prob = deal.probability ?? STAGE_DEFAULT_PROBABILITY[deal.stage] ?? 0;
    const weighted = Math.round((amount * prob) / 100);

    if (stageBreakdown[deal.stage]) {
      stageBreakdown[deal.stage].count += 1;
      stageBreakdown[deal.stage].totalAmount += amount;
      stageBreakdown[deal.stage].weightedAmount += weighted;
    }

    if (deal.stage === "closed_won") {
      wonRevenue += amount;
      wonCount += 1;
    } else if (deal.stage === "closed_lost") {
      lostRevenue += amount;
      lostCount += 1;
    } else {
      openPipelineValue += amount;
      weightedForecast += weighted;
      openCount += 1;
    }
  }

  const closedTotal = wonCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0;

  return {
    totalDeals: deals.length,
    openCount,
    wonCount,
    lostCount,
    openPipelineValue,
    weightedForecast,
    wonRevenue,
    lostRevenue,
    winRate,
    stageBreakdown,
  };
};

// @desc    Get all deals with filters and pagination
// @route   GET /api/deals
// @access  Private
export const getDeals = async (req, res, next) => {
  try {
    const {
      stage,
      client,
      owner,
      priority,
      search,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    if (stage) query.stage = stage;
    if (client) query.client = client;
    if (owner) query.owner = owner;
    if (priority) query.priority = priority;

    if (search) {
      const safeSearch = new RegExp(escapeRegex(search), "i");
      query.$or = [{ title: safeSearch }, { tags: safeSearch }, { notes: safeSearch }];
    }

    const { page, limit, skip } = parsePagination(req.query, 50, 200);
    const allowedSort = new Set(["createdAt", "updatedAt", "amount", "expectedCloseDate", "position"]);
    const safeSortBy = allowedSort.has(sortBy) ? sortBy : "updatedAt";
    const sort = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };

    const total = await Deal.countDocuments(query);
    const deals = await Deal.find(query)
      .populate("client", "clientName companyName email phone status")
      .populate("project", "projectName projectCode")
      .populate("owner", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: deals.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: deals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get deal pipeline analytics & revenue forecast
// @route   GET /api/deals/analytics
// @access  Private
export const getDealAnalytics = async (req, res, next) => {
  try {
    const deals = await Deal.find().select("stage amount probability expectedCloseDate");
    const forecast = computePipelineForecast(deals);

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single deal
// @route   GET /api/deals/:id
// @access  Private
export const getDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("client", "clientName companyName email phone status")
      .populate("project", "projectName projectCode status")
      .populate("owner", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    res.status(200).json({ success: true, data: deal });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a deal
// @route   POST /api/deals
// @access  Private
export const createDeal = async (req, res, next) => {
  try {
    const stage = DEAL_STAGES.includes(req.body.stage) ? req.body.stage : "qualified";
    const probability =
      req.body.probability !== undefined && req.body.probability !== ""
        ? Number(req.body.probability)
        : STAGE_DEFAULT_PROBABILITY[stage];

    const deal = await Deal.create({
      ...req.body,
      stage,
      probability,
      amount: Number(req.body.amount) || 0,
      owner: req.body.owner || req.user._id,
      createdBy: req.user._id,
      closedAt: stage === "closed_won" || stage === "closed_lost" ? new Date() : undefined,
    });

    await deal.populate("client", "clientName companyName");
    await deal.populate("owner", "firstName lastName email");

    await logActivity({
      action: "create_deal",
      description: `Deal "${deal.title}" ($${deal.amount.toLocaleString()}) created in stage ${deal.stage}`,
      performedBy: req.user._id,
      entityType: "deal",
      entityId: deal._id,
    });

    if (deal.owner && deal.owner._id.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: deal.owner._id,
        title: "New Deal Assigned",
        message: `You were assigned deal "${deal.title}" (${deal.currency} ${deal.amount.toLocaleString()}).`,
        type: "new_deal",
        channels: ["in_app", "email"],
        entityType: "deal",
        entityId: deal._id,
      });
    }

    if (await shouldDispatchTelegramEvent("newClient")) {
      await sendTelegramMessage(
        `💼 *New Deal Created*\n\n*Deal:* ${deal.title}\n*Client:* ${deal.client?.clientName || "N/A"}\n*Value:* ${deal.currency} ${deal.amount.toLocaleString()}\n*Stage:* ${deal.stage}`
      );
    }

    res.status(201).json({ success: true, data: deal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a deal
// @route   PUT /api/deals/:id
// @access  Private
export const updateDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    const previousStage = deal.stage;
    const updates = { ...req.body };

    if (updates.amount !== undefined) updates.amount = Number(updates.amount) || 0;
    if (updates.stage && updates.stage !== previousStage && updates.probability === undefined) {
      updates.probability = STAGE_DEFAULT_PROBABILITY[updates.stage] ?? deal.probability;
    }

    if (updates.stage === "closed_won" || updates.stage === "closed_lost") {
      if (!deal.closedAt) updates.closedAt = new Date();
    } else if (updates.stage) {
      updates.closedAt = null;
    }

    Object.assign(deal, updates);
    await deal.save();
    await deal.populate("client", "clientName companyName status");
    await deal.populate("owner", "firstName lastName email");

    await logActivity({
      action: "update_deal",
      description: `Deal "${deal.title}" updated${previousStage !== deal.stage ? ` (${previousStage} → ${deal.stage})` : ""}`,
      performedBy: req.user._id,
      entityType: "deal",
      entityId: deal._id,
    });

    res.status(200).json({ success: true, data: deal });
  } catch (error) {
    next(error);
  }
};

// @desc    Move deal stage (Kanban drag-and-drop)
// @route   PATCH /api/deals/:id/stage
// @access  Private
export const moveDealStage = async (req, res, next) => {
  try {
    const { stage, lossReason, position } = req.body;
    if (!DEAL_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: "Invalid deal stage" });
    }

    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    const previousStage = deal.stage;
    deal.stage = stage;
    deal.probability = STAGE_DEFAULT_PROBABILITY[stage];
    if (position !== undefined) deal.position = Number(position) || 0;
    if (lossReason !== undefined) deal.lossReason = lossReason;

    if (stage === "closed_won" || stage === "closed_lost") {
      deal.closedAt = new Date();
    } else {
      deal.closedAt = null;
    }

    await deal.save();

    // Sync client lifecycle status on won/lost transitions
    if (deal.client) {
      if (stage === "closed_won") {
        await Client.findByIdAndUpdate(deal.client, { status: "won" });
      } else if (stage === "proposal_sent") {
        await Client.findByIdAndUpdate(deal.client, { status: "proposal_sent" });
      } else if (stage === "negotiation") {
        await Client.findByIdAndUpdate(deal.client, { status: "negotiation" });
      }
    }

    await deal.populate("client", "clientName companyName status");
    await deal.populate("owner", "firstName lastName email");

    await logActivity({
      action: "move_deal_stage",
      description: `Deal "${deal.title}" moved from ${previousStage} to ${stage}`,
      performedBy: req.user._id,
      entityType: "deal",
      entityId: deal._id,
      changes: { before: { stage: previousStage }, after: { stage } },
    });

    if (stage === "closed_won" && (await shouldDispatchTelegramEvent("projectCompleted"))) {
      await sendTelegramMessage(
        `🏆 *Deal Closed Won!*\n\n*Deal:* ${deal.title}\n*Client:* ${deal.client?.clientName || "N/A"}\n*Amount:* ${deal.currency} ${deal.amount.toLocaleString()}`
      );
    }

    res.status(200).json({ success: true, data: deal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete deal
// @route   DELETE /api/deals/:id
// @access  Private (super_admin, admin, manager)
export const deleteDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    await Deal.findByIdAndDelete(req.params.id);

    await logActivity({
      action: "delete_deal",
      description: `Deal "${deal.title}" deleted by ${req.user.firstName} ${req.user.lastName}`,
      performedBy: req.user._id,
      entityType: "deal",
      entityId: deal._id,
    });

    res.status(200).json({ success: true, message: "Deal deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Export deals as CSV
// @route   GET /api/deals/export
// @access  Private
export const exportDealsCsv = async (req, res, next) => {
  try {
    const deals = await Deal.find()
      .populate("client", "clientName companyName")
      .populate("owner", "firstName lastName email")
      .sort({ updatedAt: -1 });

    const csv = toCsv(
      [
        { key: "title", label: "title" },
        { key: "client", label: "client", value: (d) => d.client?.clientName || "" },
        { key: "company", label: "company", value: (d) => d.client?.companyName || "" },
        { key: "stage", label: "stage" },
        { key: "amount", label: "amount" },
        { key: "currency", label: "currency" },
        { key: "probability", label: "probability" },
        { key: "weightedAmount", label: "weightedAmount", value: (d) => d.weightedAmount },
        { key: "priority", label: "priority" },
        { key: "expectedCloseDate", label: "expectedCloseDate", value: (d) => (d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString().slice(0, 10) : "") },
        { key: "owner", label: "owner", value: (d) => (d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : "") },
        { key: "notes", label: "notes" },
      ],
      deals
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="deals-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
