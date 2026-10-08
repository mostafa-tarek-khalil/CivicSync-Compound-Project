const mongoose = require("mongoose");

const Invoice = require("../models/invoice");
const { createNotification, notifyRole } = require("./notificationService");
const { INVOICE_STATUS } = require("../utils/statusConstants");

const validateObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const error = new Error("Invalid invoice ID");
        error.statusCode = 400;
        throw error;
    }
};

const PAYABLE_STATUSES = [
    INVOICE_STATUS.PENDING,
    INVOICE_STATUS.OVERDUE,
];

const submitInvoicePayment = async (
    residentId,
    invoiceId,
    reference = null
) => {
    validateObjectId(invoiceId);

    const invoice = await Invoice.findOne({
        _id: invoiceId,
        residentId,
    });

    if (!invoice) {
        const error = new Error("Invoice not found");
        error.statusCode = 404;
        throw error;
    }

    if (invoice.status === INVOICE_STATUS.PAYMENT_SUBMITTED) {
        const error = new Error(
            "This payment has already been submitted and is awaiting confirmation."
        );
        error.statusCode = 400;
        throw error;
    }

    if (invoice.status === INVOICE_STATUS.PAID) {
        const error = new Error("This invoice is already paid.");
        error.statusCode = 400;
        throw error;
    }

    if (invoice.status === INVOICE_STATUS.CANCELLED) {
        const error = new Error("This invoice was cancelled.");
        error.statusCode = 400;
        throw error;
    }

    if (!PAYABLE_STATUSES.includes(invoice.status)) {
        const error = new Error(
            `An invoice in status ${invoice.status} cannot be paid`
        );
        error.statusCode = 400;
        throw error;
    }

    const updated = await Invoice.findOneAndUpdate(
        {
            _id: invoiceId,
            residentId,
            status: { $in: PAYABLE_STATUSES },
        },
        {
            $set: {
                status: INVOICE_STATUS.PAYMENT_SUBMITTED,
                paymentSubmittedAt: new Date(),
                paymentReference: reference
                    ? String(reference).trim().slice(0, 200)
                    : null,
            },
        },
        { new: true }
    );

    if (!updated) {
        const error = new Error(
            "This invoice was already updated. Please refresh and try again."
        );
        error.statusCode = 409;
        throw error;
    }

    await createNotification({
        userId: updated.residentId,
        type: "INVOICE_PAYMENT_SUBMITTED",
        title: "Payment submitted",
        message:
            "Your payment was submitted and is awaiting admin confirmation.",
        relatedId: updated._id,
    });

    await notifyRole("ADMIN", {
        type: "INVOICE_PAYMENT_SUBMITTED",
        title: "Payment awaiting approval",
        message: `A resident submitted a payment of ${updated.amount} for confirmation.`,
        relatedId: updated._id,
    });

    return updated;
};

module.exports = {
    submitInvoicePayment,
    PAYABLE_STATUSES,
};