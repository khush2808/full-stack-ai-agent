// Library imports
import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "process.env.MAILTRAP_HOST",
      port: process.env.MAILTRAP_PORT,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: '"Inngest TMS',
      to,
      subject,
      text,
    });
    console.log("Message sent: %s", info.messageId);
    // return info;
  } catch (error) {
    console.log("Error ❌ sending email :  ", error);
  }
};
