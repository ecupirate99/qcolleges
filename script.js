// Helper: parse free-text into filters
function parseQuestion(text) {
  const filters = {};

  // Match state abbreviations (simple regex for 2 letters)
  const stateMatch = text.match(/\b[A-Z]{2}\b/);
  if (stateMatch) filters.state = stateMatch[0];

  // Match tuition amounts like $20000 or 20000
  const tuitionMatch = text.match(/\$?(\d{4,6})/);
  if (tuitionMatch) filters.max_tuition = tuitionMatch[1];

  // Match college name keywords (basic heuristic: words after "college" or "university")
  const nameMatch = text.match(/(?:college|university)\s+([A-Za-z]+)/i);
  if (nameMatch) filters.name = nameMatch[1];

  return filters;
}

// Shared function to fetch and render results
async function fetchResults(filters) {
  const query = new URLSearchParams(filters);

  // Show spinner
  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");
  loadingDiv.style.display = "block";
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/colleges?${query}`);
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    resultsDiv.innerHTML = "<p>Error fetching results.</p>";
  } finally {
    // Hide spinner
    loadingDiv.style.display = "none";
  }
}

// Render results as cards with expandable tabs
function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!data || data.length === 0) {
    resultsDiv.innerHTML = "<p>No colleges found.</p>";
    return;
  }

  data.forEach(college => {
    const card = document.createElement("div");
    card.className = "college-card";
    card.innerHTML = `
      <h3>${college["school.name"]}</h3>
      <p>${college["school.city"]}, ${college["school.state"]}</p>
      <p>💰 In-State Tuition: $${college["latest.cost.tuition.in_state"]}</p>
      <p>💰 Out-of-State Tuition: $${college["latest.cost.tuition.out_of_state"]}</p>
      <p>🎓 Graduation Rate: ${
        college["latest.completion.rate_suppressed.overall"] 
          ? (college["latest.completion.rate_suppressed.overall"] * 100).toFixed(1) + "%" 
          : "N/A"
      }</p>
      <button class="expand-btn">More Details</button>
      <div class="details">
        <div class="tabs">
          <div class="tab active" data-tab="overview">Overview</div>
          <div class="tab" data-tab="costs">Costs & Aid</div>
          <div class="tab" data-tab="outcomes">Outcomes</div>
        </div>
        <div class="tab-content active" id="overview">
          <p>Acceptance Rate: ${
            college["latest.admissions.admission_rate"] 
              ? (college["latest.admissions.admission_rate"] * 100).toFixed(1) + "%" 
              : "N/A"
          }</p>
          <p>Student Size: ${college["latest.student.size"]}</p>
        </div>
        <div class="tab-content" id="costs">
          <p>Average Debt: ${
            college["latest.aid.median_debt.completers"] 
              ? "$" + college["latest.aid.median_debt.completers"] 
              : "N/A"
          }</p>
          <p>Pell Grant %: ${
            college["latest.aid.pell_grant_rate"] 
              ? (college["latest.aid.pell_grant_rate"] * 100).toFixed(1) + "%" 
              : "N/A"
          }</p>
        </div>
        <div class="tab-content" id="outcomes">
          <p>Median Earnings (10 yrs): ${
            college["latest.earnings.10_yrs_after_entry.median"] 
              ? "$"
