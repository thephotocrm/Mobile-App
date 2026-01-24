import PDFDocument from "pdfkit";

export async function generateContractPDF(
  htmlContent: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 72,
          bottom: 72,
          left: 57,
          right: 57,
        },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const signatures = extractBase64Images(htmlContent);
      const plainText = convertHtmlToPlainText(htmlContent);
      const lines = plainText.split("\n");

      let isFirstLine = true;
      let signatureIndex = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          doc.moveDown(0.5);
          continue;
        }

        if (doc.y > 680) {
          doc.addPage();
        }

        if (isFirstLine || isHeading(trimmedLine)) {
          doc.fontSize(16).font("Helvetica-Bold").fillColor("#000000");
          doc.text(trimmedLine, { align: "center" });
          doc.moveDown(0.5);
          isFirstLine = false;
        } else if (trimmedLine === "[SIGNATURE_IMAGE]") {
          if (signatureIndex < signatures.length) {
            try {
              const sigBuffer = Buffer.from(
                signatures[signatureIndex],
                "base64",
              );
              const imgX = doc.page.margins.left;
              const imgWidth = Math.min(
                200,
                doc.page.width - doc.page.margins.left - doc.page.margins.right,
              );
              doc.image(sigBuffer, imgX, doc.y, { width: imgWidth });
              doc.moveDown(2);
            } catch (imgError) {
              doc.fontSize(10).font("Helvetica-Oblique").fillColor("#666666");
              doc.text("[Signature on file]");
              doc.moveDown(0.5);
            }
            signatureIndex++;
          }
        } else if (isSignatureLine(trimmedLine)) {
          doc.moveDown(1);
          doc.fontSize(11).font("Helvetica").fillColor("#000000");
          doc.text(trimmedLine);
        } else if (isSectionHeader(trimmedLine)) {
          doc.moveDown(0.5);
          doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000");
          doc.text(trimmedLine);
          doc.moveDown(0.3);
        } else {
          doc.fontSize(11).font("Helvetica").fillColor("#000000");
          doc.text(trimmedLine, { align: "left" });
        }
      }

      doc.moveDown(2);
      doc.fontSize(9).font("Helvetica").fillColor("#666666");
      doc.text(
        `Generated on ${new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        { align: "center" },
      );
      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .text(
          "This PDF is a simplified rendering. The authoritative legal record is the HTML snapshot stored at the time of signing.",
          { align: "center" },
        );

      doc.end();
    } catch (error) {
      console.error("PDF Generation Error:", error);
      reject(new Error("Failed to generate PDF"));
    }
  });
}

function extractBase64Images(html: string): string[] {
  const images: string[] = [];
  const imgRegex =
    /<img[^>]+src=["']data:image\/[^;]+;base64,([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }

  return images;
}

function convertHtmlToPlainText(html: string): string {
  let text = html;

  text = text.replace(
    /<img[^>]+src=["']data:image\/[^;]+;base64,[^"']+["'][^>]*>/gi,
    "\n[SIGNATURE_IMAGE]\n",
  );

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<li>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/td>/gi, " | ");
  text = text.replace(/<\/th>/gi, " | ");

  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&mdash;/g, "—");
  text = text.replace(/&ndash;/g, "–");
  text = text.replace(/&copy;/g, "©");
  text = text.replace(/&reg;/g, "®");
  text = text.replace(/&trade;/g, "™");

  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function isHeading(line: string): boolean {
  const headingPatterns = [
    /^(CONTRACT|AGREEMENT|TERMS|PHOTOGRAPHY|WEDDING|SERVICE)/i,
    /^[A-Z][A-Z\s]+$/,
  ];
  return (
    headingPatterns.some((pattern) => pattern.test(line)) && line.length < 50
  );
}

function isSectionHeader(line: string): boolean {
  const sectionPatterns = [
    /^\d+\.\s+[A-Z]/,
    /^[A-Z][A-Z\s]+:$/,
    /^(Section|Article)\s+\d+/i,
  ];
  return sectionPatterns.some((pattern) => pattern.test(line));
}

function isSignatureLine(line: string): boolean {
  const signaturePatterns = [
    /signature/i,
    /^signed/i,
    /^date:/i,
    /^name:/i,
    /^client:/i,
    /^photographer:/i,
    /_+$/,
  ];
  return signaturePatterns.some((pattern) => pattern.test(line));
}

export function bufferToDataURL(buffer: Buffer): string {
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}
