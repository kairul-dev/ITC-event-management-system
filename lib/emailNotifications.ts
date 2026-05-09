import nodemailer from "nodemailer";

// Initialize transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEventNotification(
  studentEmail: string,
  studentName: string,
  eventTitle: string,
  eventDescription: string,
  eventDate: string,
  notificationType: "new_event" | "closing_soon" | "spots_filling"
) {
  const getEmailTemplate = () => {
    const baseStyle = `
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      color: #333;
    `;

    const headerStyle = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    `;

    const contentStyle = `
      padding: 20px;
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
    `;

    const buttonStyle = `
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin-top: 15px;
    `;

    if (notificationType === "new_event") {
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1>🎉 New Event Posted!</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi ${studentName},</p>
            <p>A new event has been posted that might interest you:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h2 style="color: #667eea; margin-top: 0;">${eventTitle}</h2>
              <p><strong>📅 Date:</strong> ${eventDate}</p>
              <p><strong>📝 Description:</strong> ${eventDescription}</p>
            </div>
            <p>Don't miss out! Register now to secure your spot.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/events" style="${buttonStyle}">View Events</a>
          </div>
        </div>
      `;
    }

    if (notificationType === "closing_soon") {
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1>⏰ Event Registration Closing Soon!</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi ${studentName},</p>
            <p>Reminder: Registration for the following event is closing soon:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h2 style="color: #667eea; margin-top: 0;">${eventTitle}</h2>
              <p><strong>📅 Event Date:</strong> ${eventDate}</p>
            </div>
            <p>Make sure to register before spots run out!</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/events" style="${buttonStyle}">Register Now</a>
          </div>
        </div>
      `;
    }

    if (notificationType === "spots_filling") {
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1>🔥 Limited Spots Available!</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hi ${studentName},</p>
            <p>Spots are filling up quickly for this event:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h2 style="color: #667eea; margin-top: 0;">${eventTitle}</h2>
              <p><strong>📅 Event Date:</strong> ${eventDate}</p>
            </div>
            <p>Secure your registration before it's too late!</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/events" style="${buttonStyle}">Register Now</a>
          </div>
        </div>
      `;
    }

    return "";
  };

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(
      "Email notification skipped - Gmail credentials not configured"
    );
    return { success: false, message: "Email service not configured" };
  }

  try {
    const typeNames = {
      new_event: "New Event: ",
      closing_soon: "Reminder: ",
      spots_filling: "Alert: ",
    };

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: studentEmail,
      subject: `${typeNames[notificationType]}${eventTitle}`,
      html: getEmailTemplate(),
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, message: "Failed to send email" };
  }
}

export async function sendEventReminderToAllStudents(
  eventTitle: string,
  eventDescription: string,
  eventDate: string,
  notificationType: "new_event" | "closing_soon" | "spots_filling",
  students: Array<{ email: string; name: string }>
) {
  const results = await Promise.allSettled(
    students.map((student) =>
      sendEventNotification(
        student.email,
        student.name,
        eventTitle,
        eventDescription,
        eventDate,
        notificationType
      )
    )
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failureCount = results.length - successCount;

  return {
    total: results.length,
    sent: successCount,
    failed: failureCount,
  };
}
