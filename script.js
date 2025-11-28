// --- Parsing free-text into filters ---
function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  // State: two-letter uppercase token (NC, CA)
  const stateMatch = normalized.match(/\b[A-Z]{2}\b/);
  if (stateMatch) filters.state = stateMatch[0];

  // Tuition: "$20,000", "20k", "under 20000"
  const tuitionMatch = normalized.match(/\b(?:under\s*)?\$?\s*([\d,]+(?:\.\d+)?|\d+\s*k)\b/i);
  if (tuitionMatch) {
    let val = tuitionMatch[1].toLowerCase().replace(/[, ]/g, "");
    if (val.endsWith("k")) {
      filters.max_tuition = Math.round(parseFloat(val.replace("k", "")) * 1000);
    } else {
      filters.max_tuition = Math.round(parseFloat(val));
    }
  }

  // Graduation rate (e.g., "above 70%")
  const gradMatch = normalized.match(/(above|over|>=?)\s*(\d{1,3})\s*%/i);
  if (gradMatch) {
    const pct = parseInt(gradMatch[2], 10);
    if (!Number.isNaN(pct)) filters.grad_rate_min = (pct / 100).toFixed(2);
  }

  // Name after keywords
  const nameMatch = normalized.match(/(?:college|university)\s+([A-Za-z][A-Za-z&\-\s]+)/i);
  if (nameMatch) filters.name = nameMatch[1].trim();

  return filters;
}

// --- Tuition segmented control state ---
const segButtons = document.querySelectorAll(".segmented-control button");
let currentTuitionFilter = "in_state"; // default

segButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    segButtons.forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    currentTuitionFilter = btn.dataset.filter;
    updateActiveSummary(); // reflect change above results
  });
});

// --- Active summary label ---
function updateActiveSummary(filters = {}) {
  const summaryEl = document.getElementById("activeSummary");
  const parts = [];

  // Tuition filter label
  const tfLabel =
    currentTuitionFilter === "in_state" ? "In-state" :
    currentTuitionFilter === "out_state" ? "Out-of-state" : "Both";

  parts.push(`${tfLabel} tuition`);

  if (filters.max_tuition) parts.push(`≤ $${Number(filters.max_tuition).toLocaleString()}`);
  if (filters.state) parts.push(`State: ${filters.state}`);
  if (filters.grad_rate_min) parts.push(`Grad ≥ ${(parseFloat(filters.grad_rate_min) * 100).toFixed(0)}%`);
  if (filters.name) parts.push(`Name: ${filters.name}`);

  summaryEl.textContent = parts.length ? `Showing results for: ${parts.join(" • ")}` : `Select filters and search`;
}

// --- Fetch and render ---
async function fetchResults(filters) {
  // Normalize state to uppercase
  if (filters.state) filters.state = filters.state.toUpperCase();

  // Apply current tuition filter
  filters.tuition_filter = currentTuitionFilter;

  const query = new URLSearchParams(filters);
  console.log("Query:", query.toString()); // Debug

  updateActiveSummary(filters);

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
    const card = document.createElement("article");
    card.className = "college-card";
    card.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">${college["school.name"]}</h2>
        <p class="card-subtitle">${college["school.city"]}, ${college["school.state"]}</p>
      </div>

      <div class="metric-row">
        <div class="metric"><strong>In-state:</strong> $${college["latest.cost.tuition.in_state"] ?? "N/A"}</div>
        <div class="metric"><strong>Out-of-state:</strong> $${college["latest.cost.tuition.out_of_state"] ?? "N/A"}</div>
      </div>

      <div class="metric-row">
        <div class="metric"><strong>Graduation:</strong> ${
          college["latest.completion.rate_suppressed.overall"] != null
            ? (college["latest.completion.rate_suppressed.overall"] * 100).toFixed(1) + "%"
            : "N/A"
        }</div>
        <div class="metric"><strong>Acceptance:</strong> ${
          college["latest.admissions.admission_rate"] != null
            ? (college["latest.admissions.admission_rate"] * 100).toFixed(1) + "%"
            : "N/A"
        }</div>
      </div>

      <button class="expand-btn" type="button" aria-expanded="false">More details ▼</button>

      <div class="details" aria-hidden="true">
        <!-- Costs & Aid -->
        <div class="section">
          <div class="section-title" role="button" tabindex="0" aria-controls="costs" aria-expanded="false">
            <span>Costs & Aid</span>
            <span class="chevron">▼</span>
          </div>
          <div id="costs" class="section-content" role="region" aria-label="Costs and aid">
            <p><strong>Median debt (completers):</strong> ${
              college["latest.aid.median_debt.completers"] != null
                ? "$" + Number(college["latest.aid.median_debt.completers"]).toLocaleString()
                : "N/A"
            }</p>
            <p><strong>Pell Grant %:</strong> ${
              college["latest.aid.pell_grant_rate"] != null
                ? (college["latest.aid.pell_grant_rate"] * 100).toFixed(1) + "%"
                : "N/A"
            }</p>
          </div>
        </div>

        <!-- Academics -->
        <div class="section">
          <div class="section-title" role="button" tabindex="0" aria-controls="academics" aria-expanded="false">
            <span>Academics</span>
            <span class="chevron">▼</span>
          </div>
          <div id="academics" class="section-content" role="region" aria-label="Academics">
            <p><strong>Student size:</strong> ${college["latest.student.size"] ?? "N/A"}</p>
            <p><strong>Website:</strong> ${
              college["school.school_url"]
                ? `<a href="${college["school.school_url"]}" target="_blank" rel="noopener">Visit website</a>`
                : "N/A"
            }</p>
          </div>
        </div>

        <!-- Outcomes -->
        <div class="section">
          <div class="section-title" role="button" tabindex="0" aria-controls="outcomes" aria-expanded="false">
            <span>Outcomes</span>
            <span class="chevron">▼</span>
          </div>
          <div id="outcomes" class="section-content" role="region" aria-label="Outcomes">
            <p><strong>Median earnings (10 yrs):</strong> ${
              college["latest.earnings.10_yrs_after_entry.median"] != null
                ? "$" + Number(college["latest.earnings.10_yrs_after_entry.median"]).toLocaleString()
                : "N/A"
            }</p>
          </div>
        </div>
      </div>
    `;

    // Expand/collapse details
    const expandBtn = card.querySelector(".expand-btn");
    const detailsDiv = card.querySelector(".details");
    expandBtn.addEventListener("click", () => {
      const willShow = detailsDiv.style.display === "" || detailsDiv.style.display === "none";
      detailsDiv.style.display = willShow ? "block" : "none";
      detailsDiv.setAttribute("aria-hidden", willShow ? "false" : "true");
      expandBtn.textContent = willShow ? "Hide details ▲" : "More details ▼";
      expandBtn.setAttribute("aria-expanded", willShow ? "true" : "false");
    });

    // Wire accordion sections
    const sectionTitles = card.querySelectorAll(".section-title");
    sectionTitles.forEach(title => {
      const chevron = title.querySelector(".chevron");
      const contentId = title.getAttribute("aria-controls");
      const content = card.querySelector(`#${contentId}`);

      function toggleSection() {
        const isOpen = content.style.display === "block";
        content.style.display = isOpen ? "none" : "block";
        title.setAttribute("aria-expanded", isOpen ? "false" : "true");
        chevron.textContent = isOpen ? "▼" : "▲";
      }

      title.addEventListener("click", toggleSection);
      title.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSection();
        }
      });
    });

    resultsDiv.appendChild(card);
  });
}

// --- Submit handlers ---
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);
  fetchResults(filters);
});

document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const filters = {};
  const state = document.getElementById("state").value.trim();
  const maxTuition = document.getElementById("max_tuition").value.trim();
  const name = document.getElementById("name").value.trim();

  if (state) filters.state = state;
  if (maxTuition) filters.max_tuition = maxTuition;
  if (name) filters.name = name;

  fetchResults(filters);
});
