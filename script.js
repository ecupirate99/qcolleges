// Parse free-text into filters (state, tuition, name, graduation rate)
function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  // State: two-letter uppercase token (e.g., NC, CA)
  const stateMatch = normalized.match(/\b[A-Z]{2}\b/);
  if (stateMatch) filters.state = stateMatch[0];

  // Tuition: numbers with optional $, commas, or "k" shorthand (e.g., 20k -> 20000)
  const tuitionMatch = normalized.match(/\$?\s*([\d,]+(?:\.\d+)?|\d+\s*k)/i);
  if (tuitionMatch) {
    let val = tuitionMatch[1].toLowerCase().replace(/[, ]/g, "");
    if (val.endsWith("k")) {
      const num = parseFloat(val.replace("k", ""));
      filters.max_tuition = Math.round(num * 1000);
    } else {
      filters.max_tuition = Math.round(parseFloat(val));
    }
  }

  // Graduation rate: phrases like "above 70%" or "over 70 percent"
  const gradMatch = normalized.match(/(above|over|>=?)\s*(\d{1,3})\s*%/i);
  if (gradMatch) {
    const pct = parseInt(gradMatch[2], 10);
    if (!Number.isNaN(pct)) filters.grad_rate_min = (pct / 100).toFixed(2);
  }

  // Simple name hint after "college" or "university"
  const nameMatch = normalized.match(/(?:college|university)\s+([A-Za-z]+)/i);
  if (nameMatch) filters.name = nameMatch[1];

  return filters;
}

// Fetch and render
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
  } catch (err) {
    resultsDiv.innerHTML = "<p>Error fetching results.</p>";
  } finally {
    loadingDiv.style.display = "none";
  }
}

// Render results as cards with expandable tabs (scoped per card)
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
      <div class="details">
        <div class="tabs">
          <div class="tab active" data-tab="overview">Overview</div>
          <div class="tab" data-tab="costs">Costs & Aid</div>
          <div class="tab" data-tab="outcomes">Outcomes</div>
        </div>
        <div class="tab-content active" data-content="overview">
          <p>Acceptance Rate: ${
            college["latest.admissions.admission_rate"] != null
              ? (college["latest.admissions.admission_rate"] * 100).toFixed(1) + "%"
              : "N/A"
          }</p>
          <p>Student Size: ${college["latest.student.size"] ?? "N/A"}</p>
          <p><a href="${college["school.school_url"]}" target="_blank">Visit Website</a></p>
        </div>
        <div class="tab-content" data-content="costs">
          <p>Average Debt (completers): ${
            college["latest.aid.median_debt.completers"] != null
              ? "$" + college["latest.aid.median_debt.completers"]
              : "N/A"
          }</p>
          <p>Pell Grant %: ${
            college["latest.aid.pell_grant_rate"] != null
              ? (college["latest.aid.pell_grant_rate"] * 100).toFixed(1) + "%"
              : "N/A"
          }</p>
          <p>Net price: (add later)</p>
        </div>
        <div class="tab-content" data-content="outcomes">
          <p>Median Earnings (10 yrs): ${
            college["latest.earnings.10_yrs_after_entry.median"] != null
              ? "$" + college["latest.earnings.10_yrs_after_entry.median"]
              : "N/A"
          }</p>
          <p>Loan repayment: (add later)</p>
        </div>
      </div>
    `;

    // Expand/collapse details (scoped to this card)
    const expandBtn = card.querySelector(".expand-btn");
    const details = card.querySelector(".details");
    expandBtn.addEventListener("click", () => {
      const isHidden = details.style.display === "" || details.style.display === "none";
      details.style.display = isHidden ? "block" : "none";
    });

    // Tabs wiring (scoped to this card)
    const tabs = card.querySelectorAll(".tab");
    const contents = card.querySelectorAll(".tab-content");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        // Toggle active tab
        tabs.forEach(t => t.classList.toggle("active", t === tab));
        // Show matching content
        contents.forEach(c => {
          const isMatch = c.getAttribute("data-content") === target;
          c.classList.toggle("active", isMatch);
        });
      });
    });

    resultsDiv.appendChild(card);
  });
}

// Free-text form
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);
  fetchResults(filters);
});

// Structured filters form
document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const filters = {};
  const state = document.getElementById("state").value.trim();
  const maxTuition = document.getElementById("max_tuition").value.trim();
  const name = document.getElementById("name").value.trim();

  if (state) filters.state = state.toUpperCase();
  if (maxTuition) filters.max_tuition = maxTuition;
  if (name) filters.name = name;

  fetchResults(filters);
});
