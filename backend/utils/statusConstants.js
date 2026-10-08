

const USER_ROLE = Object.freeze({
    RESIDENT: "RESIDENT",
    TECHNICIAN: "TECHNICIAN",
    SECURITY: "SECURITY",
    ADMIN: "ADMIN",
});

const USER_STATUS = Object.freeze({
    PENDING: "PENDING",
    ACTIVE: "ACTIVE",
    REJECTED: "REJECTED",
});

const TICKET_STATUS = Object.freeze({
    OPEN: "OPEN",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
});

const TICKET_PRIORITY = Object.freeze({
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    URGENT: "URGENT",
});

const TICKET_CATEGORY = Object.freeze({
    PLUMBING: "PLUMBING",
    ELECTRICITY: "ELECTRICITY",
    ELEVATOR: "ELEVATOR",
    AC: "AC",
    GENERAL: "GENERAL",
});

const OFFER_STATUS = Object.freeze({
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    WITHDRAWN: "WITHDRAWN",
});

const VISIT_STATUS = Object.freeze({
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    QR_GENERATED: "QR_GENERATED",
    QR_SCANNED: "QR_SCANNED",
    CHECKED_IN: "CHECKED_IN",
    CHECKED_OUT: "CHECKED_OUT",
    EXPIRED: "EXPIRED",
});

const INVOICE_STATUS = Object.freeze({
    PENDING: "PENDING",
    PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    CANCELLED: "CANCELLED",
});


const INVOICE_SETTLED_STATUSES = Object.freeze([
    INVOICE_STATUS.PAID,
    INVOICE_STATUS.CANCELLED,
]);


const INVOICE_UNPAID_STATUSES = Object.freeze([
    INVOICE_STATUS.PENDING,
    INVOICE_STATUS.OVERDUE,
    INVOICE_STATUS.PAYMENT_SUBMITTED,
]);


const TICKET_TRANSITIONS = Object.freeze({
    [TICKET_STATUS.OPEN]: [TICKET_STATUS.ASSIGNED],
    [TICKET_STATUS.ASSIGNED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.OPEN],
    [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.RESOLVED],
    [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED],
    [TICKET_STATUS.CLOSED]: [],
});


const VISIT_CHAT_ALLOWED_STATUSES = Object.freeze([
    VISIT_STATUS.APPROVED,
    VISIT_STATUS.QR_GENERATED,
    VISIT_STATUS.QR_SCANNED,
    VISIT_STATUS.CHECKED_IN,
]);


const VISIT_QR_ALLOWED_STATUSES = Object.freeze([
    VISIT_STATUS.APPROVED,
    VISIT_STATUS.QR_GENERATED,
]);


const TICKET_CHAT_LOCKED_STATUSES = Object.freeze([
    TICKET_STATUS.RESOLVED,
    TICKET_STATUS.CLOSED,
]);


const isTicketChatLocked = (status) =>
    TICKET_CHAT_LOCKED_STATUSES.includes(status);

const canTransitionTicket = (from, to) =>
    Boolean(TICKET_TRANSITIONS[from]) &&
    TICKET_TRANSITIONS[from].includes(to);


const assertTicketTransition = (from, to) => {
    if (!canTransitionTicket(from, to)) {
        const error = new Error(
            `Invalid ticket status transition: ${from} -> ${to}`
        );
        error.statusCode = 400;
        throw error;
    }
};

const isVisitChatAllowed = (status) =>
    VISIT_CHAT_ALLOWED_STATUSES.includes(status);

module.exports = {
    USER_ROLE,
    USER_STATUS,
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY,
    OFFER_STATUS,
    VISIT_STATUS,
    INVOICE_STATUS,
    INVOICE_SETTLED_STATUSES,
    INVOICE_UNPAID_STATUSES,
    TICKET_TRANSITIONS,
    VISIT_CHAT_ALLOWED_STATUSES,
    VISIT_QR_ALLOWED_STATUSES,
    TICKET_CHAT_LOCKED_STATUSES,
    canTransitionTicket,
    assertTicketTransition,
    isVisitChatAllowed,
    isTicketChatLocked,
};
