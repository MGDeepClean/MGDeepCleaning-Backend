const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    // 1. Try to get token from cookie
    let token = req.cookies.admin_token;

    // 2. Fallback: Try to get token from Authorization Header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
    }
};

module.exports = {
    verifyAdmin
};
