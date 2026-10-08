
const test = require("node:test");
const assert = require("node:assert/strict");

const Invoice = require("../models/invoice");
const residentRoutes = require("../routes/residentRoutes");

const {
    INVOICE_STATUS,
    INVOICE_SETTLED_STATUSES,
    INVOICE_UNPAID_STATUSES,
} = require("../utils/statusConstants");

const {
    getQrAvailableFrom,
    assertQrWindowOpen,
    QR_LEAD_TIME_MS,
} = require("../services/visitService");

const { PAYABLE_STATUSES } = require("../services/invoiceService");

const collectRoutes = (router) => {
    const routes = [];

    const walk = (stack) => {
        for (const layer of stack || []) {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods || {})
                    .filter((method) => layer.route.methods[method])
                    .map((method) => method.toUpperCase());

                for (const method of methods) {
                    routes.push(`${method} ${layer.route.path}`);
                }
                continue;
            }

            if (layer.handle && layer.handle.stack) {
                walk(layer.handle.stack);
            }
        }
    };

    walk(router.stack);

    return routes;
};

test("Invoice.status accepts PAYMENT_SUBMITTED", () => {
    const invoice = new Invoice({
        residentId: "000000000000000000000001",
        amount: 250,
        dueDate: new Date(),
        status: "PAYMENT_SUBMITTED",
    });

    assert.equal(invoice.validateSync(), undefined);
    assert.equal(invoice.status, "PAYMENT_SUBMITTED");
});

test("a payment claim records when it was submitted", () => {
    const invoice = new Invoice({
        residentId: "000000000000000000000001",
        amount: 250,
        dueDate: new Date(),
        status: "PAYMENT_SUBMITTED",
        paymentSubmittedAt: new Date(),
        paymentReference: "TRX-9931",
    });

    assert.equal(invoice.validateSync(), undefined);
    assert.ok(invoice.paymentSubmittedAt instanceof Date);
    assert.equal(invoice.paymentReference, "TRX-9931");
});

test("a resident may only pay from PENDING or OVERDUE", () => {
    assert.deepEqual(PAYABLE_STATUSES, [
        INVOICE_STATUS.PENDING,
        INVOICE_STATUS.OVERDUE,
    ]);

    assert.ok(!PAYABLE_STATUSES.includes(INVOICE_STATUS.PAYMENT_SUBMITTED));
    assert.ok(!PAYABLE_STATUSES.includes(INVOICE_STATUS.PAID));
    assert.ok(!PAYABLE_STATUSES.includes(INVOICE_STATUS.CANCELLED));
});

test("unpaid and settled invoice status buckets are disjoint", () => {
    for (const status of INVOICE_UNPAID_STATUSES) {
        assert.ok(
            !INVOICE_SETTLED_STATUSES.includes(status),
            `${status} cannot be both unpaid and settled`
        );
    }

    assert.ok(
        INVOICE_UNPAID_STATUSES.includes(INVOICE_STATUS.PAYMENT_SUBMITTED)
    );

    assert.ok(INVOICE_SETTLED_STATUSES.includes(INVOICE_STATUS.PAID));
    assert.ok(INVOICE_SETTLED_STATUSES.includes(INVOICE_STATUS.CANCELLED));
});

test("residents can submit a payment on their own invoice", () => {
    const routes = collectRoutes(residentRoutes);

    assert.ok(
        routes.includes("PATCH /invoices/:invoiceId/pay"),
        "missing PATCH /invoices/:invoiceId/pay"
    );
});

const visitAt = (isoDate, startTime) => ({
    visitDate: new Date(isoDate),
    visitStartTime: startTime,
});

test("the QR window opens exactly 1 hour before the visit", () => {

    const visit = visitAt("2026-03-10T00:00:00.000Z", "18:00");
    const availableFrom = getQrAvailableFrom(visit);

    assert.ok(availableFrom, "a scheduled visit must produce a window");

    const scheduled = new Date(visit.visitDate);
    scheduled.setHours(18, 0, 0, 0);

    assert.equal(
        scheduled.getTime() - availableFrom.getTime(),
        QR_LEAD_TIME_MS,
        "window must open exactly one lead-time before the start"
    );
});

test("QR generation is refused before the window and allowed inside it", () => {
    const now = new Date();

    const future = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const futureTime = `${String(future.getHours()).padStart(2, "0")}:00`;

    assert.throws(
        () => assertQrWindowOpen(visitAt(future.toISOString(), futureTime)),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.equal(error.code, "QR_NOT_YET_AVAILABLE");
            assert.match(
                error.message,
                /1 hour prior to your visit scheduled time/i
            );
            return true;
        }
    );

    const soon = new Date(now.getTime() + 30 * 60 * 1000);
    const soonTime = `${String(soon.getHours()).padStart(2, "0")}:${String(
        soon.getMinutes()
    ).padStart(2, "0")}`;

    assert.doesNotThrow(() =>
        assertQrWindowOpen(visitAt(soon.toISOString(), soonTime))
    );
});

test("an unscheduled visit is not blocked by the window rule", () => {

    assert.equal(getQrAvailableFrom({}), null);
    assert.equal(getQrAvailableFrom({ visitDate: null, visitStartTime: "18:00" }), null);
    assert.doesNotThrow(() => assertQrWindowOpen({}));
});