

const fs = require("fs");
const path = require("path");

const SERVICE = path.join(__dirname, "..", "..", "services", "residentDashboardService.js");
const source = fs.readFileSync(SERVICE, "utf8");

const extract = (startMarker, endMarker) => {
    const from = source.indexOf(startMarker);
    if (from === -1) throw new Error(`marker not found: ${startMarker}`);
    const to = source.indexOf(endMarker, from);
    if (to === -1) throw new Error(`end marker not found: ${endMarker}`);
    return source.slice(from, to);
};

const block = extract(
    "const paidInvoices = invoices.filter",
    "const latestInvoice ="
);

const computeSplit = new Function("invoices", `${block}
    return { paidBalance, paidMaintenance, paidInvoicesTotal };`);

const closedBlock = extract(
    "const closedUninvoicedTickets = uninvoicedMaintenance.filter",
    "// ---------------- Billing ----------------"
);

const computeClosed = new Function(
    "uninvoicedMaintenance",
    "priceByTicket",
    `${closedBlock}
    return { closedMaintenanceValue, closedMaintenanceCount: closedUninvoicedTickets.length };`
);

const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(
        `${ok ? "PASS" : "FAIL"} | ${label.padEnd(52)} | got ${String(actual).padStart(7)} | expected ${String(expected).padStart(7)}`
    );
    return ok;
};

const TICKET = { _id: "t1", title: "AC repair", category: "HVAC" };

const invoices = [
    { amount: 2500, status: "PAID", ticketId: null },
    { amount: 3500, status: "PAID", ticketId: TICKET },
    { amount: 1200, status: "PAID", ticketId: null },
    { amount: 800, status: "PAID", ticketId: TICKET },
    { amount: 1000, status: "PENDING", ticketId: null },
    { amount: 700, status: "OVERDUE", ticketId: null },
    { amount: 400, status: "PAYMENT_SUBMITTED", ticketId: TICKET },
    { amount: 5000, status: "CANCELLED", ticketId: TICKET },
];

let failures = 0;
const result = computeSplit(invoices);

console.log("\n===== PAID SPLIT (offline) =====");
console.log(`paidBalance       : ${result.paidBalance}`);
console.log(`paidInvoicesTotal : ${result.paidInvoicesTotal}`);
console.log(`paidMaintenance   : ${result.paidMaintenance}\n`);

if (!check("paidBalance = all PAID invoices", result.paidBalance, 2500 + 3500 + 1200 + 800)) failures++;
if (!check("paidInvoicesTotal = PAID bills only", result.paidInvoicesTotal, 2500 + 1200)) failures++;
if (!check("paidMaintenance = PAID maintenance only", result.paidMaintenance, 3500 + 800)) failures++;
if (!check("split adds back to the total", result.paidMaintenance + result.paidInvoicesTotal, result.paidBalance)) failures++;
if (!check("unpaid invoices excluded from split", result.paidInvoicesTotal !== 2500 + 1200 + 1000 + 700, true)) failures++;
if (!check("cancelled invoices excluded", result.paidInvoicesTotal + result.paidMaintenance !== 5000, true)) failures++;

const empty = computeSplit([]);
if (!check("empty history -> all zeros", empty.paidBalance + empty.paidInvoicesTotal + empty.paidMaintenance, 0)) failures++;

const onlyMaint = computeSplit([{ amount: 900, status: "PAID", ticketId: TICKET }]);
if (!check("maintenance-only -> invoices half is 0", onlyMaint.paidInvoicesTotal, 0)) failures++;
if (!check("maintenance-only -> maintenance half", onlyMaint.paidMaintenance, 900)) failures++;

const onlyBills = computeSplit([{ amount: 300, status: "PAID", ticketId: null }]);
if (!check("bills-only -> maintenance half is 0", onlyBills.paidMaintenance, 0)) failures++;
if (!check("bills-only -> invoices half", onlyBills.paidInvoicesTotal, 300)) failures++;

console.log("\n===== CLOSED JOBS AWAITING INVOICE =====");

const priceByTicket = new Map([
    ["closed-1", 3500],
    ["closed-2", 1200],
    ["open-1", 800],
    ["progress-1", 400]
]);

const uninvoicedMaintenance = [
    { _id: "closed-1", status: "CLOSED" },
    { _id: "closed-2", status: "CLOSED" },
    { _id: "open-1", status: "OPEN" },
    { _id: "progress-1", status: "IN_PROGRESS" }
];

const closed = computeClosed(uninvoicedMaintenance, priceByTicket);
console.log(`closedMaintenanceValue : ${closed.closedMaintenanceValue}`);
console.log(`closedMaintenanceCount : ${closed.closedMaintenanceCount}\n`);

if (!check("closed value = closed jobs only", closed.closedMaintenanceValue, 3500 + 1200)) failures++;
if (!check("closed count = closed jobs only", closed.closedMaintenanceCount, 2)) failures++;
if (!check("open job excluded from closed value", closed.closedMaintenanceValue !== 3500 + 1200 + 800, true)) failures++;
if (!check("in-progress job excluded", closed.closedMaintenanceValue !== 400, true)) failures++;

const noPrice = computeClosed([{ _id: "unpriced-1", status: "CLOSED" }], priceByTicket);
if (!check("closed job without a price adds 0", noPrice.closedMaintenanceValue, 0)) failures++;
if (!check("closed job without a price still counted", noPrice.closedMaintenanceCount, 1)) failures++;

const noneClosed = computeClosed([{ _id: "open-1", status: "OPEN" }], priceByTicket);
if (!check("no closed jobs -> 0", noneClosed.closedMaintenanceValue, 0)) failures++;
if (!check("no closed jobs -> count 0", noneClosed.closedMaintenanceCount, 0)) failures++;

console.log(
    `\nPASS/FAIL summary: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`
);
process.exit(failures === 0 ? 0 : 1);