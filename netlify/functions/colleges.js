const fetch = require("node-fetch");

exports.handler = async (event) => {
  const API_KEY = process.env.COLLEGE_SCORECARD_KEY;
  const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

  // Request richer fields for the UI
  const params = new URLSearchParams({
    "fields": [
      "id",
      "school.name",
      "school.city",
      "school.state",
      "school.school_url",
      "latest.cost.tuition.in_state",
      "latest.cost.tuition.out_of_state",
      "latest.admissions.admission_rate",
      "latest.student.size",
      "latest.completion.rate_suppressed.overall",
      "latest.aid.median_debt.completers",
      "latest.aid.pell_grant_rate",
      "latest.earnings.10_yrs_after_entry.median"
    ].join(","),
    "per_page": "100",
    "api_key": API_KEY
  });

  const query = event.queryStringParameters || {};

  // Basic API-side filtering
  if (query.state) params.append("school.state", query.state);
  if (query.name) params.append("school.name", query.name);

  // Fetch
  const response = await fetch(`${BASE_URL}?${params}`);
  const json = await response.json();
  let results = Array.isArray(json.results) ? json.results : [];

  // Strict tuition post-filter: BOTH in-state AND out-of-state <= max_tuition
  if (query.max_tuition) {
    const max = parseInt(String(query.max_tuition).replace(/[, ]/g, ""), 10);
    if (!Number.isNaN(max)) {
      results = results.filter(college => {
        const inState = college["latest.cost.tuition.in_state"];
        const outState = college["latest.cost.tuition.out_of_state"];
        return (
          inState != null && outState != null &&
          inState <= max && outState <= max
        );
      });
    }
  }

  // Optional graduation rate filter (e.g., grad_rate_min=0.7 for 70%)
  if (query.grad_rate_min) {
    const min = parseFloat(query.grad_rate_min);
    if (!Number.isNaN(min)) {
      results = results.filter(college => {
        const rate = college["latest.completion.rate_suppressed.overall"];
        return rate != null && rate >= min;
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};
