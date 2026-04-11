const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// In-memory OTP storage (In production, use Redis or a DB collection for better persistence)
let otpStore = {};

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. Request OTP
const requestOTP = async (req, res) => {
    const { email } = req.body;
    
    // Safety check: only allow the owner email
    if (email !== process.env.OWNER_EMAIL) {
        return res.status(403).json({ error: "Unauthorized email address." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore[email] = { otp, expiry };

    const mailOptions = {
        from: `"MG Deep Clean Admin" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Admin Login OTP',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <h2 style="color: #F07C1A;">MG Deep Clean Admin Access</h2>
                <p>You requested a login OTP. This code will expire in 5 minutes.</p>
                <div style="background: #fff; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border: 1px solid #ddd;">
                    ${otp}
                </div>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP sent to your registered email." });
    } catch (err) {
        console.error("Email error:", err);
        res.status(500).json({ error: "Failed to send OTP email." });
    }
};

// 2. Verify OTP & Issue JWT
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    const storedData = otpStore[email];

    if (!storedData) {
        return res.status(400).json({ error: "OTP not found or expired. Please request a new one." });
    }

    if (Date.now() > storedData.expiry) {
        delete otpStore[email];
        return res.status(400).json({ error: "OTP has expired." });
    }

    if (otp !== storedData.otp) {
        return res.status(400).json({ error: "Invalid OTP code." });
    }

    // Success - clean up OTP
    delete otpStore[email];

    // Create JWT
    const token = jwt.sign(
        { email, role: 'admin' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    );

    const isProd = process.env.NODE_ENV === 'production';

    // Set HttpOnly Cookie
    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: isProd, // Must be true in production for HTTPS
        sameSite: isProd ? 'none' : 'lax', // 'none' for cross-domain production, 'lax' for local
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
        message: "Login successful!",
        token: token // Sending token in body as a fallback for header-based auth
    });
};

// 3. Logout
const logout = (req, res) => {
    res.clearCookie('admin_token');
    res.json({ message: "Logged out successfully." });
};

// 4. Check Auth Status
const checkAuth = (req, res) => {
    res.json({ authenticated: true, user: req.user });
};

module.exports = {
    requestOTP,
    verifyOTP,
    logout,
    checkAuth
};
