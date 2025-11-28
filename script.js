// --- Utilities ---
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
  "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY","DC","PR"
]);

function normalizeStateCandidate(s) {
  if (!s) return null;
  const cand = s.trim().toUpperCase();
  return US_STATES.has(cand) ? cand : null;
}

// --- Parsing free-text into filters ---
function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  // Prefer explicit "in XX" or "state XX"
  let state = null;
  const explicitMatch = normalized.match(/\b(?:in|state)\s+([A-Za-z]{2})\b/i);
  if (explicitMatch) {
    state = normalizeStateCandidate(explicitMatch[1]);
  }

  // If not found, scan all two-letter tokens
  if (!state) {
    const tokens = normalized.match(/\b([A-Za-z]{2})\b/g) || [];
    for (const tok of tokens) {
      const cand = normalizeStateCandidate(tok);
      if (cand) { state = cand; break; }
    }
  }
  if (state) filters.state = state;

  // Tuition: "$20,000", "20k", "under 20000"
  const tuitionMatch = normalized.match(/\b(?:under\s*)?\$?\s*([\d,]+(?:\.\d+)?|\d+\s*k)\b/i);
  if (tuitionMatch) {
    let val = tuitionMatch[1].toLowerCase().replace(/[, ]/g, "");
    if (val.endsWith("k")) {
      filters.max_tuition = Math.round(parseFloat(val.replace("k", "")) * 1000);
    } else {
      const num = parseFloat(val);
      if (!Number.isNaN(num)) filters.max_tuition = Math.round(num);
    }
  }

  // Graduation rate: "above 70%"
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

// --- Fetch and render flow ---
async function fetchResults(filters) {
  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  if (filters.state) filters.state = filters.state.toUpperCase();

  const query = new URLSearchParams(filters);
  console.log("Query:", query.toString());

  loadingDiv.style.display = "block";
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/colleges?${query}`);
    const data = await res.json();
    console.log("Results:", data);
    renderResults(data);
  } catch (err) {
    console.error(err);
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
      <p><strong>In-State Tuition:</strong> $${college["latest.cost.tuition.in_state"] ?? "N/A"}</p>
      <p><strong>Out-of-State Tuition:</strong> $${college["latest.cost.tuition.out_of_state"] ?? "N/A"}</p>
      <p><strong>Graduation Rate:</strong> ${
        college["latest.completion.rate_suppressed.overall"] != null
          ? (college["latest.completion.rate_suppressed.overall"] * 100).toFixed(1) + "%"
          : "N/A"
      }</p>
      <button class="expand-btn" type="button">More Details ▼</button>
      <div class="details">
        <p><strong>Acceptance Rate:</strong> ${
          college["latest.admissions.admission_rate"] != null
            ? (college["latest.admissions.admission_rate"] * 100).toFixed(1) + "%"
            : "N/A"
        }</p>
        <p><strong>Student Size:</strong> ${college["latest.student.size"] ?? "N/A"}</p>
        <p><strong>Median Debt (Completers):</strong> ${
          college["latest.aid.median_debt.completers"] != null
            ? "$" + Number(college["latest.aid.median_debt.completers"]).toLocaleString()
            : "N/A"
        }</p>
        <p><strong>Pell Grant %:</strong> ${
          college["latest.aid.pell_grant_rate"] != null
            ? (college["latest.aid.pell_grant_rate"] * 100).toFixed(1) + "%"
            : "N/A"
        }</p>
        <p><strong>Median Earnings (10 yrs):</strong> ${
          college["latest.earnings.10_yrs_after_entry.median"] != null
            ? "$" + Number(college["latest.earnings.10_yrs_after_entry.median"]).toLocaleString()
            : "N/A"
        }</p>
        <p><strong>Website:</strong> ${
          college["school.school_url"]
            ? `<a href="${college["school.school_url"]}" target="_blank" rel="noopener">Visit website</a>`
            : "N/A"
        }</p>
      </div>
    `;

    const expandBtn = card.querySelector(".expand-btn");
    const detailsDiv = card.querySelector(".details");
    expandBtn.addEventListener("click", () => {
      const hidden = detailsDiv.style.display === "" || detailsDiv.style.display === "none";
      detailsDiv.style.display = hidden ? "block" : "none";
      expandBtn.textContent = hidden ? "Hide Details ▲" : "More Details ▼";
    });

    resultsDiv.appendChild(card);
  });
}

// --- Free-text form submit ---
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);

  const qSelected = document.querySelector('input[name="q_tuition_filter"]:checked');
  if (qSelected) filters.tuition_filter = qSelected.value;

  fetchResults(filters);
});

// Clear free-text form
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("question").value = "";
  document.getElementById("results").innerHTML = "";
});

// --- Advanced filters submit ---
document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const filters = {};
  const state = document.getElementById("state").value.trim();
  const maxTuition = document.getElementById("max_tuition").value.trim();
  const name = document.getElementById("name").value.trim();
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = "";

  if (state) {
    const normalizedState = normalizeStateCandidate(state);
    if (!normalizedState) {
      errorMsg.textContent = "Please enter a valid US state abbreviation (e.g., NC).";
      return;
    }
    filters.state = normalizedState;

    if (!maxTuition) {
      errorMsg.textContent = "Max Tuition is required when State is specified.";
      return;
    }
  }

  if (maxTuition) filters.max_tuition = maxTuition;
  if (name) filters.name = name;

  const fSelected = document.querySelector('input[name="f_tuition_filter"]:checked');
  if (fSelected) filters.tuition_filter = fSelected.value;

  fetchResults(filters);
});

// Clear advanced filters
document.getElementById("clearFiltersBtn").addEventListener("click
