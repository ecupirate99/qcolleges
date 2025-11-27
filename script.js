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

// Render results
function renderResults(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!data || data.length === 0) {
    resultsDiv.innerHTML = "<p>No colleges found.</p>";
    return;
  }

  data.forEach(college => {
    const div = document.createElement("div");
    div.className = "college";
    div.innerHTML = `
      <h3>${college["school.name"]}</h3>
      <p>${college["school.city"]}, ${college["school.state"]}</p>
      <p>In-State Tuition: $${college["latest.cost.tuition.in_state"]}</p>
      <p>Out-of-State Tuition: $${college["latest.cost.tuition.out_of_state"]}</p>
      <p>Acceptance Rate: ${(college["latest.admissions.admission_rate"] * 100).toFixed(1)}%</p>
      <p>Student Size: ${college["latest.student.size"]}</p>
      <a href="${college["school.school_url"]}" target="_blank">Visit Website</a>
    `;
    resultsDiv.appendChild(div);
  });
}

// Handle free-text question form
document.getElementById("questionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value;
  const filters = parseQuestion(question);
  fetchResults(filters);
});

// Handle structured filter form
document.getElementById("filterForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const filters = {};
  const state = document.getElementById("state").value;
  const maxTuition = document.getElementById("max_tuition").value;
  const name = document.getElementById("name").value;

  if (state) filters.state = state;
  if (maxTuition) filters.max_tuition = maxTuition;
  if (name) filters.name = name;

  fetchResults(filters);
});
