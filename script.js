function parseQuestion(text) {
  const filters = {};
  const normalized = text.trim();

  // State abbreviation, case-insensitive
  const stateMatch = normalized.match(/\b([A-Za-z]{2})\b/);
  if (stateMatch) filters.state = stateMatch[1].toUpperCase();

  // Tuition
  const tuitionMatch = normalized.match(/\b(?:under\s*)?\$?\s*([\d,]+(?:\.\d+)?|\d+\s*k)\b/i);
  if (tuitionMatch) {
    let val = tuitionMatch[1].toLowerCase().replace(/[, ]/g, "");
    if (val.endsWith("k")) {
      filters.max_tuition = Math.round(parseFloat(val.replace("k", "")) * 1000);
    } else {
      filters.max_tuition = Math.round(parseFloat(val));
    }
  }

  // Graduation rate
  const gradMatch = normalized.match(/(above|over|>=?)\s*(\d{1,3})\s*%/i);
  if (gradMatch) {
    const pct = parseInt(gradMatch[2], 10);
    if (!Number.isNaN(pct)) filters.grad_rate_min = (pct / 100).toFixed(2);
  }

  // Name
  const nameMatch = normalized.match(/(?:college|university)\s+([A-Za-z][A-Za-z&\-\s]+)/i);
  if (nameMatch) filters.name = nameMatch[1].trim();

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

  // ... keep your existing card rendering code ...
}

// Free-text form submit
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

// Advanced filters submit with validation
document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const filters = {};
  const state = document.getElementById("state").value.trim();
  const maxTuition = document.getElementById("max_tuition").value.trim();
  const name = document.getElementById("name").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  if (state) {
    filters.state = state.toUpperCase();
    if (!maxTuition) {
      errorMsg.textContent = "Max tuition is required when state is specified.";
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
document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  document.getElementById("state").value = "";
  document.getElementById("max_tuition").value = "";
  document.getElementById("name").value = "";
  document.getElementById("errorMsg").textContent = "";
  document.getElementById("results").innerHTML = "";
});
