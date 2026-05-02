const PDFDocument = require('pdfkit');

const colors = {
  primary: '#4F46E5',
  secondary: '#1E293B',
  accent: '#10B981',
  warning: '#F59E0B',
  text: '#1E293B',
  textLight: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  tableHeader: '#F1F5F9'
};

const roundedRect = (doc, x, y, w, h, r) => {
  doc.moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
  return doc;
};

const drawHeader = (doc, title, subtitle) => {
  doc.rect(0, 0, doc.page.width, 90).fill(colors.primary);
  doc.fillColor(colors.white)
     .fontSize(26)
     .font('Helvetica-Bold')
     .text(title, 50, 30, { align: 'center' });
  doc.fontSize(12)
     .font('Helvetica')
     .text(subtitle, 50, 65, { align: 'center' });
  return 110;
};

const drawUserInfo = (doc, user, y) => {
  doc.fillColor(colors.secondary).fontSize(14).font('Helvetica-Bold').text('User Profile', 50, y);
  y += 25;
  doc.fontSize(10).font('Helvetica').fillColor(colors.textLight);
  doc.text(`Name: ${user.username}`, 50, y);
  doc.text(`Email: ${user.email}`, 50, y + 18);
  doc.text(`Member since: ${user.createdAt}`, 50, y + 36);
  return y + 65;
};

const drawStatCards = (doc, stats, y) => {
  const cardWidth = (doc.page.width - 120) / 3;
  const cards = [
    { title: 'Total Points', value: stats.totalPoints },
    { title: 'Active Days', value: stats.activeDays },
    { title: 'Total Activities', value: stats.totalActivities }
  ];
  cards.forEach((card, i) => {
    const x = 50 + i * (cardWidth + 10);
    roundedRect(doc, x, y, cardWidth, 85, 12).fill(colors.white).stroke(colors.border);
    doc.fillColor(colors.textLight).fontSize(8).font('Helvetica-Bold')
       .text(card.title, x + 45, y + 18);
    doc.fillColor(colors.primary).fontSize(26).font('Helvetica-Bold')
       .text(String(card.value), x + 15, y + 45);
  });
  return y + 105;
};

const drawTable = (doc, headers, rows, y) => {
  const colWidths = [180, 80, 100];
  const startX = 50;
  let currentY = y;
  const totalWidth = colWidths.reduce((a,b) => a+b, 0);
  doc.rect(startX, currentY, totalWidth, 25).fill(colors.tableHeader);
  doc.fillColor(colors.text).font('Helvetica-Bold').fontSize(10);
  let xPos = startX + 10;
  headers.forEach((h, i) => {
    doc.text(h, xPos, currentY + 8, { width: colWidths[i] - 10 });
    xPos += colWidths[i];
  });
  currentY += 25;
  doc.font('Helvetica').fontSize(9);
  rows.forEach((row, idx) => {
    if (idx % 2 === 0) doc.rect(startX, currentY, totalWidth, 22).fill('#F8FAFC');
    xPos = startX + 10;
    row.forEach((cell, i) => {
      doc.fillColor(colors.text).text(String(cell), xPos, currentY + 6, { width: colWidths[i] - 10 });
      xPos += colWidths[i];
    });
    currentY += 22;
  });
  return currentY + 10;
};

const drawProgressBar = (doc, x, y, width, percent, color, label) => {
  const fillWidth = width * Math.min(100, Math.max(0, percent)) / 100;
  roundedRect(doc, x, y, width, 10, 5).fill(colors.border);
  roundedRect(doc, x, y, fillWidth, 10, 5).fill(color);
  if (label) doc.fillColor(colors.textLight).fontSize(9).text(label, x + width + 10, y - 2);
  return y + 20;
};

const drawBarChart = (doc, data, x, y, width, height, title) => {
  if (!data || data.length === 0) return y;
  doc.fillColor(colors.text).fontSize(11).font('Helvetica-Bold').text(title, x, y);
  y += 20;
  const chartX = x;
  const chartY = y;
  const barWidth = (width / data.length) - 6;
  const maxPoints = Math.max(...data.map(d => d.points), 1);
  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i].points / maxPoints) * height;
    const barX = chartX + i * (barWidth + 6);
    const barY = chartY + height - barHeight;
    roundedRect(doc, barX, barY, barWidth, barHeight, 4).fill(colors.primary);
    const dateLabel = data[i]._id.slice(5); // "MM-DD"
    doc.fillColor(colors.textLight).fontSize(7).text(dateLabel, barX, chartY + height + 4, { width: barWidth, align: 'center' });
  }
  doc.fillColor(colors.textLight).fontSize(8);
  doc.text(maxPoints.toString(), chartX - 15, chartY);
  doc.text('0', chartX - 15, chartY + height - 5);
  return y + height + 30;
};

const addFooter = (doc, pageNum, totalPages) => {
  doc.fontSize(8).fillColor(colors.textLight);
};

exports.generateReport = (doc, data) => {
  const { user, totalPoints, breakdown, counts, emotional, sleep, device, apps, start, end, weeklyPoints } = data;

  // Page 1
  let y = drawHeader(doc, 'MindEase Progress Report', `${start} — ${end}`);
  y = drawUserInfo(doc, user, y);
  const stats = { totalPoints, activeDays: counts.activeDays, totalActivities: counts.totalActivities };
  y = drawStatCards(doc, stats, y);
  doc.fillColor(colors.secondary).fontSize(14).font('Helvetica-Bold').text('Activity Breakdown', 50, y);
  y += 25;
  const headers = ['Activity', 'Count', 'Points Earned'];
  const rows = [
    ['Affirmations', counts.affirmation, breakdown.affirmation],
    ['Gratitude Entries', counts.gratitude, breakdown.gratitude],
    ['Emotional Check-ins', counts.emotionalCheckIn, breakdown.emotionalCheckIn],
    ['Therapy Exercises', counts.therapy, 0],
    ['Letters to Self', counts.lettersToSelf, breakdown.lettersToSelf || 0],
    ['Hourly Emotions', counts.hourlyEmotion, breakdown.hourlyEmotion],
    ['React/Response', counts.reactResponse, breakdown.reactResponse],
    ['Daily Tasks', counts.dailyTask, breakdown.dailyTask],
    ['Ikigai Items', counts.ikigaiItem, breakdown.ikigaiItem]
  ];
  y = drawTable(doc, headers, rows, y);
  y += 15;

  // Chart – put on same page if enough space, otherwise new page
  if (weeklyPoints && weeklyPoints.length) {
    const remainingSpace = doc.page.height - y - 80;
    if (remainingSpace < 180) {
      addFooter(doc, 1, 2);
      doc.addPage();
      y = 50;
    }
    y = drawBarChart(doc, weeklyPoints, 50, y, 500, 150, ' Daily Points Trend');
  }

  // Wellness & Digital on page 2
  addFooter(doc, 1, 2);
  doc.addPage();
  y = 50;
  doc.fillColor(colors.secondary).fontSize(14).font('Helvetica-Bold').text('Wellness Metrics', 50, y);
  y += 30;
  doc.fontSize(10).font('Helvetica-Bold').text('Sleep Quality', 50, y);
  y = drawProgressBar(doc, 50, y + 15, 450, (sleep.quality / 5) * 100, colors.accent, `${sleep.quality} / 5`);
  doc.fontSize(10).font('Helvetica-Bold').text('Sleep Duration (hours)', 50, y);
  y = drawProgressBar(doc, 50, y + 15, 450, (sleep.duration / 12) * 100, colors.primary, `${sleep.duration} hrs`);
  doc.fontSize(10).font('Helvetica-Bold').text('Emotional Intensity (1–10)', 50, y);
  const emoPercent = (1 - (emotional.intensity / 10)) * 100;
  y = drawProgressBar(doc, 50, y + 15, 450, emoPercent, colors.warning, `${emotional.intensity} / 10`);
  y += 15;
  doc.fontSize(9).text(` Most frequent emotion: ${emotional.topEmotion}`, 50, y);
  y += 45;
  doc.fillColor(colors.secondary).fontSize(14).font('Helvetica-Bold').text('Digital Wellbeing', 50, y);
  y += 30;
  const hrs = Math.floor(device.totalMinutes / 60);
  const mins = device.totalMinutes % 60;
  doc.fontSize(10).text(`Total screen time: ${hrs}h ${mins}m`, 50, y);
  y += 25;
  if (apps.length) {
    doc.fontSize(10).font('Helvetica-Bold').text('Top Apps Used', 50, y);
    y += 20;
    const maxMinutes = Math.max(...apps.map(a => a.totalMinutes), 1);
    apps.forEach(app => {
      const percent = (app.totalMinutes / maxMinutes) * 100;
      doc.fontSize(9).fillColor(colors.textLight).text(`${app._id}: ${app.totalMinutes} min`, 50, y);
      drawProgressBar(doc, 180, y + 2, 320, percent, colors.primary);
      y += 20;
    });
  } else {
    doc.fontSize(9).text('No app usage data for this period.', 50, y);
  }
  addFooter(doc, 2, 2);
};