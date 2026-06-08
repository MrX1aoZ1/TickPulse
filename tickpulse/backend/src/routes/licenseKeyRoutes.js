const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getLicenseKey, updateLicenseKey } = require('../controllers/licenseKeyController');

router.get('/', protect, getLicenseKey); // Get license key by ID
router.put('/', protect, updateLicenseKey); // Update license key by ID

module.exports = router;