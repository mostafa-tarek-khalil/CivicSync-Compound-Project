const MaintenanceTicket = require("../models/maintenanceTicket");
const Offer = require("../models/offer");
const Review = require("../models/review");
const User = require("../models/user");
const Unit = require("../models/unit");
const Invoice = require("../models/invoice");
const { createNotification, notifyRole } = require("./notificationService");
const {
    TICKET_STATUS,
    OFFER_STATUS,
    assertTicketTransition,
    isTicketChatLocked,
} = require("../utils/statusConstants");


const getTechnicianFilter = async (technicianId) => {
    const technician = await User.findById(
        technicianId
    ).select("specializations");

    const specializations =
        technician?.specializations || [];

    const filter = {
        status: "OPEN",
        skippedBy: { $ne: technicianId },
    };

    if (specializations.length > 0) {
        filter.category = { $in: specializations };
    }

    return filter;
};

const getAvailableTickets = async (technicianId) => {
    const filter = await getTechnicianFilter(
        technicianId
    );


    const myOffers = await Offer.find({
        technicianId,
    }).select("ticketId");

    const offeredTicketIds = myOffers.map(
        (offer) => offer.ticketId
    );

    return await MaintenanceTicket.find({
        ...filter,
        _id: { $nin: offeredTicketIds },
    })
        .populate(
            "residentId",
            "name email phone"
        )
        .sort({ createdAt: -1 });
};


const getTicketLocation = async (residentId) => {
    if (!residentId) {
        return null;
    }

    const resident = await User.findById(residentId).select("unitId");

    if (!resident || !resident.unitId) {
        return null;
    }

    const unit = await Unit.findById(resident.unitId)
        .select("unitNumber floor type status buildingId")
        .populate("buildingId", "name buildingNumber");

    if (!unit) {
        return null;
    }

    return {
        unitId: unit._id,
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        type: unit.type,
        status: unit.status,
        buildingId:
            unit.buildingId && unit.buildingId._id
                ? unit.buildingId._id
                : unit.buildingId,
        buildingName: unit.buildingId?.name || null,
        buildingNumber: unit.buildingId?.buildingNumber ?? null,
    };
};


const withTicketLocation = async (ticket) => {
    if (!ticket) {
        return ticket;
    }

    const residentId =
        ticket.residentId && ticket.residentId._id
            ? ticket.residentId._id
            : ticket.residentId;

    const location = await getTicketLocation(residentId);

    const object = ticket.toObject ? ticket.toObject() : ticket;

    object.location = location;

    return object;
};


const getAvailableTicketDetails = async (
    ticketId,
    technicianId
) => {
    const filter = await getTechnicianFilter(
        technicianId
    );

    const ticket = await MaintenanceTicket.findOne({
        ...filter,
        _id: ticketId,
    }).populate(
        "residentId",
        "name email phone"
    );

    if (!ticket) {
        const error = new Error(
            "Ticket not found or not available to you"
        );
        error.statusCode = 404;
        throw error;
    }

    const existingOffer = await Offer.findOne({
        ticketId: ticket._id,
        technicianId,
    });

    const ticketWithLocation = await withTicketLocation(ticket);

    return { ticket: ticketWithLocation, existingOffer };
};

const startTicket = async (
    ticketId,
    technicianId
) => {
    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "ASSIGNED") {
        const error = new Error(
            "Only ASSIGNED tickets can be started"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !ticket.assignedTo ||
        ticket.assignedTo.toString() !==
            technicianId.toString()
    ) {
        const error = new Error(
            "This ticket is not assigned to you"
        );
        error.statusCode = 403;
        throw error;
    }


    assertTicketTransition(
        ticket.status,
        TICKET_STATUS.IN_PROGRESS
    );

    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                assignedTo: technicianId,
                status: "ASSIGNED",
            },
            {
                $set: {
                    status: "IN_PROGRESS",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedTicket) {
        const error = new Error(
            "Ticket status has already changed"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedTicket.residentId,
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request in progress",
        message: `Work has started on maintenance request "${updatedTicket.title}".`,
        relatedId: updatedTicket._id,
    });


    await notifyRole("ADMIN", {
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request in progress",
        message: `Work started on "${updatedTicket.title}".`,
        relatedId: updatedTicket._id,
    });

    return updatedTicket;
};

const resolveTicket = async (
    ticketId,
    technicianId
) => {
    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "IN_PROGRESS") {
        const error = new Error(
            "Only IN_PROGRESS tickets can be resolved"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        !ticket.assignedTo ||
        ticket.assignedTo.toString() !==
            technicianId.toString()
    ) {
        const error = new Error(
            "This ticket is not assigned to you"
        );
        error.statusCode = 403;
        throw error;
    }


    assertTicketTransition(
        ticket.status,
        TICKET_STATUS.RESOLVED
    );

    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                assignedTo: technicianId,
                status: "IN_PROGRESS",
            },
            {
                $set: {
                    status: "RESOLVED",

                    chatLocked: isTicketChatLocked(TICKET_STATUS.RESOLVED),
                },
            },
            {
                new: true,
            }
        );

    if (!updatedTicket) {
        const error = new Error(
            "Ticket status has already changed"
        );
        error.statusCode = 400;
        throw error;
    }

    await createNotification({
        userId: updatedTicket.residentId,
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request resolved",
        message: `Maintenance request "${updatedTicket.title}" has been marked as resolved.`,
        relatedId: updatedTicket._id,
    });


    await notifyRole("ADMIN", {
        type: "TICKET_STATUS_CHANGED",
        title: "Maintenance request resolved",
        message: `"${updatedTicket.title}" was resolved by the assigned technician.`,
        relatedId: updatedTicket._id,
    });

    return updatedTicket;
};

const skipTicket = async (
    ticketId,
    technicianId
) => {
    const updatedTicket =
        await MaintenanceTicket.findOneAndUpdate(
            {
                _id: ticketId,
                status: "OPEN",
                skippedBy: {
                    $ne: technicianId,
                },
            },
            {
                $addToSet: {
                    skippedBy: technicianId,
                },
            },
            {
                new: true,
            }
        );

    if (updatedTicket) {
        return updatedTicket;
    }

    const ticket =
        await MaintenanceTicket.findById(
            ticketId
        );

    if (!ticket) {
        const error = new Error("Ticket not found");
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status !== "OPEN") {
        const error = new Error(
            "Only OPEN tickets can be skipped"
        );
        error.statusCode = 400;
        throw error;
    }

    const error = new Error(
        "You already skipped this ticket"
    );
    error.statusCode = 400;
    throw error;
};

const getAssignedTickets = async (
    technicianId
) => {
    const tickets = await MaintenanceTicket.find({
        assignedTo: technicianId,
    })
        .populate("residentId", "name email phone")
        .sort({ createdAt: -1 });


    return Promise.all(tickets.map(withTicketLocation));
};

const getAssignedTicketDetails = async (
    ticketId,
    technicianId
) => {

    const ticket =
        await MaintenanceTicket.findOne({
            _id: ticketId,
            assignedTo: technicianId,
        })
            .populate("residentId", "name email phone")
            .populate("assignedTo", "name email phone role rating totalReviews");

    if (!ticket) {
        const error = new Error(
            "Ticket not found or not assigned to you"
        );
        error.statusCode = 404;
        throw error;
    }


    const payload = await withTicketLocation(ticket);

    const invoice = await Invoice.findOne({ ticketId: ticket._id })
        .select("amount status dueDate paidAt description createdAt residentId unitId")
        .lean();


    return {
        ticket: payload,
        invoice: invoice || null,
    };
};


const getTechnicianDashboard = async (technicianId) => {
    const [
        availableTickets,
        assignedTickets,
        offers,
        reviews,
        technician,
    ] = await Promise.all([
        getAvailableTickets(technicianId),
        MaintenanceTicket.find({ assignedTo: technicianId })
            .populate("residentId", "name email phone")
            .sort({ createdAt: -1 }),
        Offer.find({ technicianId })
            .populate(
                "ticketId",
                "title category priority status residentId"
            )
            .sort({ createdAt: -1 }),
        Review.find({ technicianId })
            .populate("residentId", "name email phone")
            .sort({ createdAt: -1 }),
        User.findById(technicianId).select(
            "name email phone rating totalReviews specializations"
        ),
    ]);

    const countByStatus = (items) =>
        items.reduce((accumulator, item) => {
            accumulator[item.status] =
                (accumulator[item.status] || 0) + 1;
            return accumulator;
        }, {});

    return {
        stats: {
            available: availableTickets.length,
            assigned: assignedTickets.length,
            inProgress: assignedTickets.filter(
                (ticket) => ticket.status === TICKET_STATUS.IN_PROGRESS
            ).length,
            resolved: assignedTickets.filter(
                (ticket) => ticket.status === TICKET_STATUS.RESOLVED
            ).length,
            pendingOffers: offers.filter(
                (offer) => offer.status === OFFER_STATUS.PENDING
            ).length,
            acceptedOffers: offers.filter(
                (offer) => offer.status === OFFER_STATUS.ACCEPTED
            ).length,
            averageRating: technician?.rating || 0,
            totalReviews: technician?.totalReviews || 0,
        },
        availableTickets,
        assignedTickets,
        offers: {
            total: offers.length,
            byStatus: countByStatus(offers),
            items: offers,
        },
        reviews: {
            total: reviews.length,
            items: reviews,
        },
    };
};

module.exports = {
    getAvailableTickets,
    getAvailableTicketDetails,
    getAssignedTickets,
    getAssignedTicketDetails,
    startTicket,
    resolveTicket,
    skipTicket,
    getTechnicianDashboard,
};
