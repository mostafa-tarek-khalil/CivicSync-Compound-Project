const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        residentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MaintenanceTicket",

            required: false,
            default: null,
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Unit",
            required: false,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: null,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "PAYMENT_SUBMITTED",
                "PAID",
                "OVERDUE",
                "CANCELLED",
            ],
            default: "PENDING",
        },

        
        paymentSubmittedAt: {
            type: Date,
            default: null,
        },

        
        paymentReference: {
            type: String,
            trim: true,
            maxlength: 200,
            default: null,
        },

        dueDate: {
            type: Date,
            required: true,
        },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

invoiceSchema.index({
    residentId: 1,
    status: 1,
    dueDate: 1,
});


invoiceSchema.index(
    { ticketId: 1 },
    { unique: true, sparse: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;