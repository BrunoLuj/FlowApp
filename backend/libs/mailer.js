import nodemailer from "nodemailer";

let transporter;

export const isEmailConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);

const getTransporter = () => {
    if (!isEmailConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
            auth: process.env.SMTP_USER
                ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                : undefined,
        });
    }
    return transporter;
};

export const sendEmail = async (message) => {
    const transport = getTransporter();
    if (!transport) {
        const error = new Error("SMTP is not configured");
        error.code = "SMTP_NOT_CONFIGURED";
        throw error;
    }
    return transport.sendMail({
        from: process.env.SMTP_FROM,
        to: message.recipient_email,
        subject: message.subject,
        html: message.html_body,
        text: message.text_body || undefined,
        attachments: message.attachments || [],
    });
};
