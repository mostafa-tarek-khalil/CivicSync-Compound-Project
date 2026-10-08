

require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const User = require("../../models/user");

const EMAIL = "qa.technician@civicsync.test";
const PASSWORD = "Password123";

(async () => {
    const action = process.argv[2] || "create";

    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    try {
        if (action === "delete") {
            const result = await User.deleteMany({ email: EMAIL });
            console.log(`deleted ${result.deletedCount} QA account(s)`);
            return;
        }

        await User.deleteMany({ email: EMAIL });

        const user = await User.create({
            name: "QA Technician",
            email: EMAIL,
            phone: "01000000088",
            password: PASSWORD,
            role: "TECHNICIAN",
            specializations: ["PLUMBING", "ELECTRICITY"],
            status: "ACTIVE",
        });

        console.log(`created ${user.email} (role ${user.role}, status ${user.status})`);
        console.log(`password: ${PASSWORD}`);
    } finally {
        await mongoose.disconnect();
    }
})();