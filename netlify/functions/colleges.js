const fetch = require("node-fetch");

exports.handler = async (event) => {
  const API_KEY = process.env.COLLEGE_SCORECARD_KEY;
  const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

  const params = new URLSearchParams({
    "fields": "id,school.name,school.city,school.state,latest.cost.tuition.in_state,"
            + "latest.cost.tuition.out_of_state,latest.admissions.admission_rate,"
            + "latest.student.size,school.school_url",
    "per_page": "20",
    "api_key": API_KEY
  });

  const query = event.queryStringParameters;

  if (query.state) params.append("school.state", query.state);

  // Apply tuition filter to both in-state and out-of-state
  if (query.max_tuition) {
    params.append("latest.cost.tuition.in_state__lt", query.max_tuition);
    params.append("latest.cost.tuition.out_of_state__lt", query.max_tuition);
  }

  if (query.name) params.append("school.name", query.name);

  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data.results)
  };
};
