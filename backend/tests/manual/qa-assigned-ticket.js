

require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MaintenanceTicket = require("../../models/maintenanceTicket");
const User = require("../../models/user");

const TECH_EMAIL = "qa.technician@civicsync.test";
const RESIDENT_EMAIL = "qa.resident@civicsync.test";

const TITLE_PREFIX = "QA ASSIGNED";

const SPECS = [
    { suffix: "assigned", status: "ASSIGNED", priority: "HIGH" },
    { suffix: "in-progress", status: "IN_PROGRESS", priority: "URGENT" },
];

(async () => {
    const action = process.argv[2] || "create";

    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    try {
        if (action === "delete") {
            const result = await MaintenanceTicket.deleteMany({
                title: new RegExp(`^${TITLE_PREFIX}`),
            });
            console.log(`deleted ${result.deletedCount} QA ticket(s)`);
            return;
        }

        const technician = await User.findOne({ email: TECH_EMAIL }).select("_id name");
        const resident = await User.findOne({ email: RESIDENT_EMAIL }).select("_id name");

        if (!technician) {
            console.error(`no technician ${TECH_EMAIL} — run qa-technician.js create first`);
            process.exitCode = 1;
            return;
        }

        if (!resident) {
            console.error(`no resident ${RESIDENT_EMAIL} — run qa-account.js create first`);
            process.exitCode = 1;
            return;
        }

        await MaintenanceTicket.deleteMany({ title: new RegExp(`^${TITLE_PREFIX}`) });

        for (const spec of SPECS) {
            const ticket = await MaintenanceTicket.create({
                residentId: resident._id,
                title: `${TITLE_PREFIX} ${spec.suffix}`,
                category: "PLUMBING",
                description:
                    "Created by the QA helper so the assigned-job details screen can be driven in a browser.",
                priority: spec.priority,
                status: spec.status,
                assignedTo: technician._id,
            });

            console.log(`${ticket._id}  ${ticket.title}  status=${ticket.status}`);
        }

        console.log(`\nassigned to ${technician.name} (${technician._id})`);
    } finally {
        await mongoose.disconnect();
    }
})();