const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rav23inder@gmail.com",
    pass: "yjikpnvvbjuaxqbv"
  }
});

async function sendDeletionMail(article, reason, machineId, userid) {
  try {

    const now = new Date();

    const datePart = now.toLocaleDateString("en-GB").replace(/\//g, "-");

    const timePart = now.toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const deletedOn = `${datePart} ${timePart}`;

    const mailOptions = {
      from: "Impact Alerts <rav23inder@gmail.com>",
      to: ["rkaur@impactmeasurement.co.in"],
      subject: "[ops] Admin Alert:- Article Deleted",
      html: `
      <pre style="font-family: Arial; font-size:14px;">
        Following Article has been deleted:-

        Article Title : ${article.headline || ""}
        Publication   : ${article.publication || ""} - ${article.city || ""}
        Pub Date      : ${article.pubdate || ""}
        Reason        : ${reason}

        Deleted By    : ${userid}
        Deleted On    : ${deletedOn}
        System ID     : ${machineId}

        </pre>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

  } catch (error) {
    console.error("Email error:", error);
  }
}

module.exports = sendDeletionMail;