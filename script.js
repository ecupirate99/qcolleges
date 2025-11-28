// Track tuition filter state
let currentTuitionFilter = "in_state"; // default

// Handle segmented control clicks
function setupSegmentedControls() {
  const segGroups = document.querySelectorAll(".segmented-control");
  segGroups.forEach(group => {
    const buttons = group.querySelectorAll("button");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentTuitionFilter = btn.dataset.filter;
      });
    });
  });
}

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

  // State
  let state = null;
  const explicitMatch = normalized.match(/\b(?:in|state)\s+([A-Za-z]{2})\b/i);
  if (explicitMatch) state = normalizeStateCandidate(explicitMatch[1]);
  if (!state) {
    const tokens = normalized.match(/\b([A-Za-z]{2})\b/g) || [];
    for (const tok of tokens) {
      const cand = normalizeStateCandidate(tok);
      if (cand) { state = cand; break; }
    }
  }
  if (state) filters.state = state;

  // Tuition
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

  return filters;
}

// --- Fetch and render flow ---
async function fetchResults(filters) {
  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  if (filters.state) filters.state = filters.state.toUpperCase();
  filters.tuition_filter = currentTuitionFilter;

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
    `;
    resultsDiv.appendChild(card);
  });
}

// --- Free-text form submit ---
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);
  fetchResults(filters);
});

// Clear free-text form
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("question").value = "";
  document.getElementBy
