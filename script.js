// --- Parsing free-text into filters ---
function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  // State: two-letter abbreviation, case-insensitive
  const stateMatch = normalized.match(/\b([A-Za-z]{2})\b/);
  if (stateMatch) filters.state = stateMatch[1].toUpperCase();

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
  if (filters.state) filters.state = filters.state.toUpperCase();
  filters.tuition_filter = currentTuitionFilter;

  const query = new URLSearchParams(filters);
  console.log("Query:", query.toString());

  updateActiveSummary(filters);

  const loadingDiv = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  loadingDiv.style.display = "block";
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/colleges?${query}`);
    const data = await res.json();
    console.log("Results:", data);
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

  // ... keep your existing card rendering code ...
}

// --- Submit handlers ---
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);
  fetchResults(filters);
});

// Clear free-text form
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("question").value = "";
  updateActiveSummary({});
  document.getElementById("results").innerHTML = "";
});

// Advanced filters submit with validation
document.getElement
