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

  const nameMatch = normalized.match(/(?:college|university)\s+([A-Za-z]+)/i);
  if (nameMatch) filters.name = nameMatch[1];

  return filters;
}

async function fetchResults(filters) {
  const query = new URLSearchParams(filters);
  console.log("Query:", query.toString()); // Debug

  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  loadingDiv.style.display = "block";
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/colleges?${query}`);
    const data = await res.json();
    console.log("Results:", data); // Debug
    renderResults(data);
  } catch (err) {
    resultsDiv.innerHTML = "<p>Error fetching results.</p>";
    console.error(err);
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
      <button class="expand-btn" type="button">More Details ▼
