const mysql = require('mysql2/promise');
const connectDB = require('../config/db'); // Assuming you have a connectDB function to establish a connection
const licenses = require('../licenseKey');

// @desc    Obtain license key from database
// @route   GET /api/license_key 
// @access  Private
const getLicenseKey = async (req, res) => {
  try {
    const connection = await connectDB();
    const [users] = await connection.query(
      'SELECT license_key FROM Users WHERE id = ?',
      [req.user.id]
    );
    await connection.end();

    const licenseKey = users[0]?.license_key;
    const licenseType = licenses[licenseKey] ? licenses[licenseKey].type : 'invalid';
    console.log(licenseKey);

    res.status(200).json({ licenseKey: licenseKey, licenseType: licenseType });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update license key
// @route   Put /api/license_key 
// @access  Private
const updateLicenseKey = async (req, res) => {
  const { newKey } = req.body;

  const newKeyType = licenses[newKey] ? licenses[newKey].type : 'invalid';

  console.log(newKeyType);

  // Check whether it is the license key for "Premium" user
  if (newKeyType === 'invalid') {
    return res.status(400).json({ message: 'Invalid license Key' });
  }

  if (newKeyType === 'normal') {
    return res.status(400).json({ message: 'This license key is for "Normal" user' });
  }

  try {
    const connection = await connectDB();
    await connection.query(
      'UPDATE Users SET license_key = ? WHERE id = ?',
      [newKey, req.user.id]
    );
    await connection.end();
    res.status(200).json({ message: 'License Key updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
    getLicenseKey,
    updateLicenseKey
};