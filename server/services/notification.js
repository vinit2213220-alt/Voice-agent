const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config({ path: '../.env' });

const sendEmail = async (to, subject, text) => {
    console.log(`[Notification] Attempting to send email to ${to}`);

    // Check for credentials
    console.log(`[Debug] EMAIL_USER present: ${!!process.env.EMAIL_USER}`);
    console.log(`[Debug] EMAIL_PASS present: ${!!process.env.EMAIL_PASS}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('[Notification] Missing EMAIL_USER or EMAIL_PASS. Logging only.');
        console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or use host/port from env
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });
        console.log('[Notification] Email sent successfully.');
    } catch (error) {
        console.error('[Notification] Email Error:', error.message);
    }
};

const sendSMS = async (to, text) => {
    console.log(`[Notification] Attempting to send SMS to ${to}`);

    // Check for credentials
    console.log(`[Debug] TWILIO_SID present: ${!!process.env.TWILIO_ACCOUNT_SID}`);
    console.log(`[Debug] TWILIO_TOKEN present: ${!!process.env.TWILIO_AUTH_TOKEN}`);
    console.log(`[Debug] TWILIO_PHONE present: ${!!process.env.TWILIO_PHONE_NUMBER}`);

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('[Notification] Missing Twilio credentials. Logging only.');
        console.log(`[MOCK SMS] To: ${to}, Body: ${text}`);
        return;
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: text,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        console.log('[Notification] SMS sent successfully.');
    } catch (error) {
        console.error('[Notification] SMS Error:', error.message);
    }
};

module.exports = { sendEmail, sendSMS };
