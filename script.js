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
    // Default to in_state filter for free-text
    filters.tuition_filter = "in_state";
  }

  const gradMatch = normalized.match(/(above|over|>=?)\s*(\d{1,3})\s*%/i);
  if (gradMatch) {
    filters.grad_rate_min = (parseInt(gradMatch[2], 10) / 100).toFixed(2);
  }

  const nameMatch = normalized.match(/(?:college|university)\s+([A-Za-z]+)/i);
  if (nameMatch) filters.name = nameMatch[1];

  return filters;
}

async function fetchResults(filters) {
  const query = new URLSearchParams(filters);
  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  loadingDiv.style.display = "block";
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/colleges?${query}`);
    const data = await res.json();
    renderResults(data);
  } catch {
    resultsDiv.innerHTML = "<p>Error fetching results.</p>";
  } finally {
    loadingDiv.style.display = "none";
  }
}

function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    resultsDiv.innerHTML = "<p>No colleges found.</p>";
    return;
  }

  data.forEach(college => {
    const card = document.createElement("div");
    card.className = "college-card";
    card.innerHTML = `
      <h3>${college["school.name"]}</h3>
      <p>${college["school.city"]}, ${college["school.state"]}</p>
      <p>💰 In-State Tuition: $${college["latest.cost.tuition.in_state"] ?? "N/A"}</p>
      <p>💰 Out-of-State Tuition: $${college["latest.cost.tuition.out_of_state"] ?? "N/A"}</p>
      <p>🎓 Graduation Rate: ${
        college["latest.completion.rate_suppressed.overall"] != null
          ? (college["latest.completion.rate_suppressed.overall"] * 100).toFixed(1) + "%"
          : "N/A"
      }</p>
      <button class="expand-btn" type="button">More Details</button>
      <div class="details" style="display:none;">
        <p>Acceptance Rate: ${
          college["latest.admissions.admission_rate"] != null
            ? (college["latest.admissions.admission_rate"] * 100).toFixed(1) + "%"
            : "N/A"
        }</p>
        <p>Student Size: ${college["latest.student.size"] ?? "N/A"}</p>
        <p>Average Debt: ${
          college["latest.aid.median_debt.completers"] != null
            ? "$" + college["latest.aid.median_debt.completers"]
            : "N/A"
        }</p>
        <p>Pell Grant %: ${
          college["latest.aid.pell_grant_rate"] != null
            ? (college["latest.aid.pell_grant_rate"] * 100).toFixed(1) + "%"
            : "N/A"
        }</p>
        <p>Median Earnings (10 yrs): ${
          college["latest.earnings.10_yrs_after_entry.median"] != null
            ? "$" + college["latest.earnings.10_yrs_after_entry.median"]
            : "N/A"
        }</p>
        <p><a href="${college["school.school_url"]}" target="_blank
