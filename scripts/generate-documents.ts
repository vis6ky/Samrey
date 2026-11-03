/**
 * @license Apache-2.0
 * Generates SAMREY_RESEARCH_PAPER.pdf and SAMREY_RESEARCH_PAPER.docx from paper source
 */

import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const paperMdPath = path.resolve('docs/research/SAMREY_RESEARCH_PAPER.md');
const paperText = fs.readFileSync(paperMdPath, 'utf-8');

const pdfOutPath = path.resolve('docs/research/SAMREY_RESEARCH_PAPER.pdf');
const docxOutPath = path.resolve('docs/research/SAMREY_RESEARCH_PAPER.docx');

// ---------------------------------------------------------------------------
// 1. Generate PDF via PDFKit
// ---------------------------------------------------------------------------
async function generatePdf() {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 54,
      size: 'A4',
      info: {
        Title: 'Samrey: A Fine-Grained Reactive Framework Architecture with Zero-Virtual-DOM Execution, Native Defense-in-Depth, and Integrated Developer Guidance',
        Author: 'Lead Framework Architect & Principal Investigator',
        Subject: 'Systems and Software Engineering Research Article',
        Keywords: 'Web Frameworks, Reactivity, Zero-VDOM, Security, AI Assistance'
      }
    });

    const stream = fs.createWriteStream(pdfOutPath);
    doc.pipe(stream);

    // Title Block
    doc.font('Helvetica-Bold').fontSize(18).text(
      'Samrey: A Fine-Grained Reactive Framework Architecture with Zero-Virtual-DOM Execution, Native Defense-in-Depth, and Integrated Developer Guidance',
      { align: 'center' }
    );
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(11).text(
      'Lead Framework Architect & Principal Investigator\nDepartment of Computer Science & Software Engineering',
      { align: 'center' }
    );
    doc.moveDown(1);

    // Parse Markdown Sections
    const lines = paperText.split('\n');
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock) doc.moveDown(0.5);
        continue;
      }

      if (inCodeBlock) {
        doc.font('Courier').fontSize(8.5).text(line, { indent: 15 });
        continue;
      }

      if (line.startsWith('# ')) {
        // Skip title as already rendered
        continue;
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.8);
        doc.font('Helvetica-Bold').fontSize(13).text(line.replace('## ', '').trim());
        doc.moveDown(0.3);
      } else if (line.startsWith('### ')) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(11).text(line.replace('### ', '').trim());
        doc.moveDown(0.2);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc.font('Helvetica').fontSize(9.5).text(`•  ${line.substring(2).trim()}`, { indent: 10 });
        doc.moveDown(0.15);
      } else if (/^\d+\.\s/.test(line)) {
        doc.font('Helvetica').fontSize(9.5).text(line.trim(), { indent: 10 });
        doc.moveDown(0.15);
      } else if (line.trim().length > 0) {
        doc.font('Helvetica').fontSize(9.5).text(line.trim(), { align: 'justify', lineGap: 1.5 });
        doc.moveDown(0.3);
      }
    }

    doc.end();

    stream.on('finish', () => {
      console.log(`Generated PDF at ${pdfOutPath}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// 2. Generate DOCX via docx library
// ---------------------------------------------------------------------------
async function generateDocx() {
  const lines = paperText.split('\n');
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: 'Samrey: A Fine-Grained Reactive Framework Architecture with Zero-Virtual-DOM Execution, Native Defense-in-Depth, and Integrated Developer Guidance',
          bold: true,
          size: 32
        })
      ]
    })
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Lead Framework Architect & Principal Investigator | Software Engineering Systems Group',
          italics: true,
          size: 20
        })
      ]
    })
  );

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Courier New',
              size: 17
            })
          ]
        })
      );
      continue;
    }

    if (line.startsWith('# ')) {
      continue;
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: line.replace('## ', '').trim(),
              bold: true,
              size: 26
            })
          ]
        })
      );
    } else if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: line.replace('### ', '').trim(),
              bold: true,
              size: 22
            })
          ]
        })
      );
    } else if (line.trim().length > 0) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              size: 20
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxOutPath, buffer);
  console.log(`Generated DOCX at ${docxOutPath}`);
}

async function run() {
  await generatePdf();
  await generateDocx();
  console.log('Document generation complete!');
}

run().catch((err) => {
  console.error('Error generating documents:', err);
  process.exit(1);
});
