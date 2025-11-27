const fetch = require("node-fetch");

exports.handler = async (event) => {
  const API_KEY = process.env.COLLEGE_SCORECARD_KEY;
  const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

  const params = new URLSearchParams({
    "fields": "id,school.name,school.city,school.state,latest.cost.tuition.in_state,"
            + "latest.cost.tuition.out_of_state,latest.admissions.admission_rate,"
            + "latest.student.size,school.school_url",
    "per_page": "100", // fetch more to allow filtering
    "api_key": API_KEY
  });

  const query = event.queryStringParameters;

  if (query.state) params.append("school.state", query.state);
  if (query.name) params.append("school.name", query.name);

  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();

  let results = data.results;

  // Apply strict tuition filter: BOTH in-state and out-of-state must be <= max_tuition
  if (query.max_tuition) {
    const max = parseInt(query.max_tuition, 10);
    results = results.filter(college => {
      const inState = college["latest.cost.tuition.in_state"];
      const outState = college["latest.cost.tuition.out_of_state"];
      return (
        inState !== null && outState !== null &&
        inState <= max && outState <= max
      );
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results)
  };
};
