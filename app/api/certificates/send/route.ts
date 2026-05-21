import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

type SendCertificateBody = {
  studentName: string;
  studentEmail: string;
  eventTitle: string;
  certificateNo: string;
  issuedDate: string;
  issuerName?: string;
};

const buildCertificatePdf = (payload: SendCertificateBody) => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const width = doc.page.width;
    const height = doc.page.height;

    doc.rect(18, 18, width - 36, height - 36).lineWidth(4).stroke("#7c2d12");
    doc.rect(30, 30, width - 60, height - 60).lineWidth(1.5).stroke("#d97706");

    doc.fillColor("#7c2d12").fontSize(24).font("Times-Bold").text("ITC Secure Document Verification System", 0, 58, {
      align: "center",
    });

    doc.fillColor("#b45309").fontSize(42).font("Times-Bold").text("Certificate of Achievement", 0, 110, {
      align: "center",
    });

    doc.moveTo(170, 170).lineTo(width - 170, 170).lineWidth(1).stroke("#d97706");

    doc.fillColor("#7c2d12").fontSize(16).font("Times-Roman").text("This certifies that", 0, 195, {
      align: "center",
    });

    doc.moveDown(0.5);
    doc.fillColor("#111827").fontSize(30).font("Times-BoldItalic").text(payload.studentName, {
      align: "center",
    });

    doc.moveDown(0.7);
    doc.fillColor("#7c2d12").fontSize(16).font("Times-Roman").text("has successfully completed and demonstrated achievement in", {
      align: "center",
    });

    doc.moveDown(0.4);
    doc.fillColor("#b45309").fontSize(24).font("Times-Bold").text(payload.eventTitle, {
      align: "center",
    });

    const metaY = 345;
    doc.roundedRect(110, metaY, width - 220, 90, 10).fillAndStroke("#fff7ed", "#d97706");

    const leftX = 145;
    const rightX = width / 2 + 40;

    doc.fillColor("#92400e").fontSize(10).font("Helvetica-Bold").text("Certificate No.", leftX, metaY + 18);
    doc.fillColor("#111827").fontSize(12).font("Helvetica").text(payload.certificateNo, leftX, metaY + 34);

    doc.fillColor("#92400e").fontSize(10).font("Helvetica-Bold").text("Date Issued", leftX, metaY + 54);
    doc.fillColor("#111827").fontSize(12).font("Helvetica").text(payload.issuedDate, leftX, metaY + 70);

    doc.fillColor("#92400e").fontSize(10).font("Helvetica-Bold").text("Issued By", rightX, metaY + 18);
    doc.fillColor("#111827").fontSize(12).font("Helvetica").text(payload.issuerName || "ITC", rightX, metaY + 34);

    doc.fillColor("#92400e").fontSize(10).font("Helvetica-Bold").text("Verification", rightX, metaY + 54);
    doc.fillColor("#111827").fontSize(12).font("Helvetica").text("Official digital copy attached", rightX, metaY + 70);

    doc.fillColor("#6b7280").fontSize(10).font("Helvetica-Oblique").text("This certificate is issued by the event administrator.", 0, height - 78, {
      align: "center",
    });

    doc.end();
  });
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SendCertificateBody>;
    const studentName = body.studentName?.trim();
    const studentEmail = body.studentEmail?.trim();
    const eventTitle = body.eventTitle?.trim();
    const certificateNo = body.certificateNo?.trim();
    const issuedDate = body.issuedDate?.trim();

    if (!studentName || !studentEmail || !eventTitle || !certificateNo || !issuedDate) {
      return NextResponse.json(
        { error: "Missing certificate email payload." },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json(
        { error: "Gmail credentials are not configured." },
        { status: 500 }
      );
    }

    const pdfBuffer = await buildCertificatePdf({
      studentName,
      studentEmail,
      eventTitle,
      certificateNo,
      issuedDate,
      issuerName: body.issuerName || "ITC",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `ITC Secure <${gmailUser}>`,
      to: studentEmail,
      subject: `Your Certificate for ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">Your certificate is ready</h2>
          <p>Dear ${studentName},</p>
          <p>Your certificate for <strong>${eventTitle}</strong> has been issued and is attached to this email as a PDF.</p>
          <p><strong>Certificate No:</strong> ${certificateNo}<br/>
          <strong>Date Issued:</strong> ${issuedDate}</p>
          <p>If you need help, please contact the administrator.</p>
          <p>Regards,<br/>ITC Secure Document Verification System</p>
        </div>
      `,
      attachments: [
        {
          filename: `certificate-${certificateNo}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Certificate email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send certificate email." },
      { status: 500 }
    );
  }
}
