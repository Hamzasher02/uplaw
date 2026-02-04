import nodemailer from 'nodemailer'

function sendEmail({ to, subject, text }) {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_HOST,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    })
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    }
       
    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log(`[EMAIL SENT] MessageId: ${info.messageId} to ${to}`);
            return info;
        })
        .catch(err => {
            console.error('[EMAIL FAILED]', err);
            throw err;
        });
};

export default sendEmail
