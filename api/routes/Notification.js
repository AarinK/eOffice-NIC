// routes/noticeRoutes.js
const express = require("express");
const router = express.Router();
const noticeController = require("../controllers/Notification");

// Create new notice
router.post("/", noticeController.createNotice);

// Get all notices
router.get("/getNotifications", noticeController.getNotices);
router.get("/:id", noticeController.getNoticeById);  // <-- new

// Update a notice by ID
router.put("/:id", noticeController.updateNotice);

// Delete notice(s) - single or multiple
// Single: DELETE /api/v1/notices/1
// Multiple: DELETE /api/v1/notices with { "ids": [1,2,3] } in body
router.delete("/:id?", noticeController.deleteNotice);

module.exports = router;
