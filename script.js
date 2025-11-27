function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  const stateMatch = normalized.match(/\b[A-Z]{2}\b/);
  if (stateMatch) filters.state = stateMatch[0];

  const tuitionMatch = normalized.match(/\$?\s*([\d,]+(?:\.\d+)?|\d+\s*k)/i);
  if (tuitionMatch) {
    let val = tuitionMatch[1].toLowerCase().replace(/[, ]/g, "");
    if (val.endsWith("k")) {
      filters.max_tuition = parseFloat(val.replace("k", "")) * 1000;
    } else {
      filters.max_tuition = parseFloat(val);
    }
  }

  const gradMatch = normalized.match(/(above|over|>=?)\s*(\d{1,3})\s*%/i);
  if (gradMatch) {
    filters.grad_rate_min = (parseInt(gradMatch[2], 10) / 100).toFixed(2);
  }

  const nameMatch = normalized.match(/(?:college|university)\s
