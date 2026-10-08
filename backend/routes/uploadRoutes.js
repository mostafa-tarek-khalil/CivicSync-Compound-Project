const express = require("express");

const {
    uploadProfileImage,
    uploadTicketAttachment,
} = require("../controllers/uploadController");

const authMiddleware = require("../middleware/authMiddleware");
const { createUploader } = require("../middleware/uploadMiddleware");

const router = express.Router();

const profileUpload = createUploader("profiles");
const ticketUpload = createUploader("tickets");

router.post(
    "/profile-image",
    authMiddleware,
    profileUpload.single("image"),
    uploadProfileImage
);

router.post(
    "/ticket-attachment",
    authMiddleware,
    ticketUpload.single("image"),
    uploadTicketAttachment
);

module.exports = router;