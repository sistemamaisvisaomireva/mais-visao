import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outputPath = path.join(root, 'public', 'receita-template.pdf')
const logoPath = path.join(root, 'public', 'logo-optica-plus.jpg')

const pageWidth = 595.28
const pageHeight = 841.89
const dark = rgb(0.18, 0.18, 0.22)

function drawText(page, text, x, y, size, font, options = {}) {
  page.drawText(text, { x, y, size, font, color: options.color || dark })
}

function drawCentered(page, text, x, y, width, size, font, options = {}) {
  const textWidth = font.widthOfTextAtSize(text, size)
  drawText(page, text, x + (width - textWidth) / 2, y, size, font, options)
}

function drawLine(page, x1, y1, x2, y2, width = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: width, color: dark })
}

function drawPolyline(page, points, width = 0.75) {
  for (let index = 1; index < points.length; index += 1) {
    drawLine(page, points[index - 1].x, points[index - 1].y, points[index].x, points[index].y, width)
  }
}

function arcPoints(cx, cy, radius, start = 180, end = 0) {
  return Array.from({ length: 37 }, (_, index) => {
    const angle = (start + ((end - start) * index) / 36) * Math.PI / 180
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
}

function drawCurve(page, cx, baseY, radius, label, font, boldFont) {
  drawPolyline(page, arcPoints(cx, baseY, radius), 0.8)
  drawPolyline(page, arcPoints(cx, baseY, radius * 0.78), 0.55)
  drawPolyline(page, arcPoints(cx, baseY, radius * 0.57), 0.55)

  for (let degree = 0; degree <= 180; degree += 10) {
    const angle = (180 - degree) * Math.PI / 180
    const x = cx + Math.cos(angle) * radius
    const y = baseY + Math.sin(angle) * radius
    drawLine(page, cx, baseY, x, y, 0.55)

    const tx = cx + Math.cos(angle) * (radius + 15)
    const ty = baseY + Math.sin(angle) * (radius + 15)
    drawCentered(page, String(degree), tx - 10, ty - 3, 20, 6, font)
  }

  drawCentered(page, label, cx - 40, baseY - 25, 80, 15, boldFont)
}

function drawTable(page, title, topY, font, boldFont) {
  const x = 55
  const width = 485
  const headerH = 24
  const rowH = 42
  const columns = [90, 100, 100, 100, 95]
  const labels = [title, 'ESFÉRICO', 'CILÍNDRICO', 'EIXO', 'DNP']

  page.drawRectangle({ x, y: topY - headerH, width, height: headerH, color: dark })

  let currentX = x
  columns.forEach((columnWidth, index) => {
    drawLine(page, currentX, topY, currentX, topY - headerH - rowH * 2, 1)
    drawCentered(page, labels[index], currentX, topY - 17, columnWidth, 11, boldFont, { color: rgb(1, 1, 1) })
    currentX += columnWidth
  })
  drawLine(page, x + width, topY, x + width, topY - headerH - rowH * 2, 1)

  ;[topY, topY - headerH, topY - headerH - rowH, topY - headerH - rowH * 2].forEach((lineY) => {
    drawLine(page, x, lineY, x + width, lineY, 1)
  })

  let colX = x
  columns.slice(0, -1).forEach((columnWidth) => {
    colX += columnWidth
    drawLine(page, colX, topY, colX, topY - headerH - rowH * 2, 1)
  })

  drawCentered(page, 'Olho', x, topY - headerH - 17, columns[0], 12, font)
  drawCentered(page, 'Direito', x, topY - headerH - 31, columns[0], 12, font)
  drawCentered(page, 'Olho', x, topY - headerH - rowH - 17, columns[0], 12, font)
  drawCentered(page, 'Esquerdo', x, topY - headerH - rowH - 31, columns[0], 12, font)
}

function drawCheckbox(page, x, y, label, font, size = 10) {
  page.drawRectangle({ x, y, width: 10, height: 10, borderColor: dark, borderWidth: 1 })
  drawText(page, label, x + 13, y - 1, size, font)
}

async function createTemplate() {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([pageWidth, pageHeight])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logo = await pdf.embedJpg(await fs.readFile(logoPath))

  page.drawImage(logo, { x: 242, y: 730, width: 110, height: 110 })
  drawCentered(page, 'PRESCRIÇÃO DE ÓCULOS', 0, 714, pageWidth, 14, boldFont)

  drawText(page, 'Para Sr.(a)', 50, 672, 11, font)
  drawLine(page, 112, 670, 540, 670, 1)

  drawCurve(page, 180, 575, 54, 'O.D.', font, boldFont)
  drawCurve(page, 415, 575, 54, 'O.E.', font, boldFont)

  drawTable(page, 'LONGE', 512, font, boldFont)
  drawTable(page, 'PERTO', 388, font, boldFont)

  const diagY = 253
  drawCheckbox(page, 55, diagY, 'Miopia', font, 10)
  drawCheckbox(page, 180, diagY, 'Hipermetropia', font, 10)
  drawCheckbox(page, 335, diagY, 'Astigmatismo', font, 10)
  drawCheckbox(page, 485, diagY, 'Presbiopia', font, 10)

  drawText(page, '1 - É normal nos primeiros dias sentir tontura, cefaléia, náuseas, ver desníveis no chão ou em escadas', 55, 233, 8, font)
  drawText(page, '2 - Para Multifocal ou Bifocal a adaptação poderá levar de 07 a 15 dias, podendo ter os mesmos sintomas acima', 55, 222, 8, font)
  drawText(page, '3 - Um exame de vista é sempre oportuno antes do seu filho começar a estudar', 55, 211, 8, font)

  drawCheckbox(page, 125, 187, 'Multifocal', font, 14)
  drawCheckbox(page, 300, 187, 'Bifocal', font, 14)
  drawCheckbox(page, 425, 187, 'VS', font, 14)
  drawCheckbox(page, 125, 163, 'Fotossensível', font, 14)
  drawCheckbox(page, 300, 163, 'A.R.', font, 14)
  drawCheckbox(page, 425, 163, 'Incolor', font, 14)

  drawText(page, 'Obs.', 38, 136, 13, font)
  drawLine(page, 72, 136, 330, 136, 1)
  drawLine(page, 38, 122, 330, 122, 1)
  drawLine(page, 38, 94, 330, 94, 1)

  drawText(page, 'Data', 38, 45, 13, font)
  drawLine(page, 75, 44, 105, 44, 1)
  drawText(page, '/', 109, 45, 12, font)
  drawLine(page, 123, 44, 153, 44, 1)
  drawText(page, '/202', 157, 45, 12, font)
  drawLine(page, 187, 44, 209, 44, 1)
  drawLine(page, 250, 44, 540, 44, 1)
  drawCentered(page, 'Coral Gráfica - whatsapp 98443-5667 - mar/2024', 0, 31, pageWidth, 4, font)

  const bytes = await pdf.save()
  await fs.writeFile(outputPath, bytes)
  console.log(`Template gerado em ${outputPath}`)
}

createTemplate()
