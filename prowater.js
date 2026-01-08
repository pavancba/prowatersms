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
            from: '+1234567890',
            to: mobileNumber
        });

    
        res.json({ success: true, otp });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});

module.exports = router;
