

const {
    INVOICE_UNPAID_STATUSES,
} = require("../../utils/statusConstants");

const UNPAID_INVOICE_STATUSES = [...INVOICE_UNPAID_STATUSES];

const invoices = [
    { id: "paid-regular", status: "PAID", amount: 2500, ticket: null },
    { id: "paid-maint", status: "PAID", amount: 3500, ticket: "t1" },
    { id: "pending", status: "PENDING", amount: 1000, ticket: null },
    { id: "overdue", status: "OVERDUE", amount: 700, ticket: null },
    { id: "submitted", status: "PAYMENT_SUBMITTED", amount: 400, ticket: null },
    { id: "cancelled", status: "CANCELLED", amount: 9999, ticket: null },
];

const unpaidInvoices = invoices.filter((invoice) =>
    UNPAID_INVOICE_STATUSES.includes(invoice.status)
);

const invoicesDue = unpaidInvoices.reduce(
    (sum, invoice) => sum + (invoice.amount || 0),
    0
);

const paidBalance = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

let failures = 0;

const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(
        `${ok ? "PASS" : "FAIL"} | ${label.padEnd(48)} | got ${String(actual).padStart(6)} | expected ${String(expected).padStart(6)}`
    );
    if (!ok) failures += 1;
};

console.log("\n===== BILLING MATH (offline, real constants) =====\n");

check("Paid = 2500 (regular) + 3500 (maintenance)", paidBalance, 6000);

check("Paid excludes PENDING", paidBalance === 6000 && !unpaidInvoices.includes(invoices[0]), true);
check("Paid excludes OVERDUE", paidBalance !== 6700, true);
check("Paid excludes PAYMENT_SUBMITTED", paidBalance !== 6400, true);
check("Paid excludes CANCELLED (9999)", paidBalance !== 15999, true);

check("Due = 1000 + 700 + 400", invoicesDue, 2100);
check("Cancelled excluded from due", unpaidInvoices.some((i) => i.status === "CANCELLED"), false);

console.log(
    `\nPaid card shows  : ${paidBalance.toLocaleString("en-US")} EGP`
);
console.log(`Outstanding shows: ${invoicesDue.toLocaleString("en-US")} EGP`);

console.log(
    `\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`
);

process.exit(failures === 0 ? 0 : 1);