const fetch = require("node-fetch");

exports.handler = async (event) => {
  const API_KEY = process.env.COLLEGE_SCORECARD_KEY;
  const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

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

  if (query.state) params.append("school.state", query.state);
  if (query.name) params.append("school.name", query.name);

  const response = await fetch(`${BASE_URL}?${params}`);
  const json = await response.json();
  let results = Array.isArray(json.results) ? json.results : [];

  // Tuition filter logic
  if (query.max_tuition) {
    const max = parseInt(query.max_tuition, 10);
    const mode = query.tuition_filter || "both";

    results = results.filter(college => {
      const inState = college["latest.cost.tuition.in_state"];
      const outState = college["latest.cost.tuition.out_of_state"];

      if (mode === "in_state") {
        return inState != null && inState <= max;
      } else if (mode === "out_state") {
        return outState != null && outState <= max;
      } else { // both
        return (
          inState != null && outState != null &&
          inState <= max && outState <= max
        );
      }
    });
  }

  // Graduation rate filter
  if (query.grad_rate_min) {
    const min = parseFloat(query.grad_rate_min);
    results = results.filter(college => {
      const rate = college["latest.completion.rate_suppressed.overall"];
      return rate != null && rate >= min;
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};
