const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID ;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Middleware to parse JSON
router.use(express.json());

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Function to generate random OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
};




// Route to send OTP
router.post('/send-otp', async (req, res) => {
    try {
        // Ensure session exists
        if (!req.session) {
            return res.status(400).json({ error: 'Session not initialized' });
        }

        const { mobileNumber } = req.body;

        if (!mobileNumber) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }

        // Generate OTP
        const otp = generateOTP();

        // Save OTP in session
        req.session.otp = otp;

       // (Optional) Send OTP via Twilio SMS
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: twilioPhoneNumber,
            to: mobileNumber
        });

    
        res.json({ success: true, otp });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  try {
    if (!req.session) {
      return res.status(400).json({ success: false, error: 'Session not initialized' });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, error: 'OTP is required' });
    }

    const savedOtp = req.session.otp;
    const expiresAt = req.session.otpExpiresAt;
    const attempts = req.session.otpAttempts || 0;

    if (!savedOtp || !expiresAt) {
      return res.status(400).json({ success: false, error: 'OTP not generated. Please request OTP again.' });
    }

    // Expired?
    if (Date.now() > expiresAt) {
      req.session.otp = null;
      req.session.otpExpiresAt = null;
      req.session.otpAttempts = 0;
      return res.status(400).json({ success: false, error: 'OTP expired. Please request again.' });
    }

    // Too many attempts
    if (attempts >= 5) {
      req.session.otp = null;
      req.session.otpExpiresAt = null;
      req.session.otpAttempts = 0;
      return res.status(429).json({ success: false, error: 'Too many attempts. Request OTP again.' });
    }

    // Compare
    if (String(otp) !== String(savedOtp)) {
      req.session.otpAttempts = attempts + 1;
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    // Success
    req.session.isVerified = true;

    // Clear OTP after success
    req.session.otp = null;
    req.session.otpExpiresAt = null;
    req.session.otpAttempts = 0;

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (e) {
    console.error('verify-otp error:', e);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

module.exports = router;
