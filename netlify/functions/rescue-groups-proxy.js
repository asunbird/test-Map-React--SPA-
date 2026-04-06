exports.handler = async function (event, context) {
  // We only want to handle POST requests for fetching pets based on location
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.RESCUE_GROUPS_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing RescueGroups API Key in environment variables" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { lat, lon, radius = 50 } = data; // Default 50 miles

    // RescueGroups v5 Animals Public Search
    // Filter by location (lat/lon and distance)
    const payload = {
      data: {
        filterRadius: {
          miles: radius,
          lat: lat,
          lon: lon
        }
      }
    };

    const response = await fetch('https://api.rescuegroups.org/v5/public/animals/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Authorization': API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`RescueGroups API returned ${response.status}`);
    }

    const json = await response.json();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    };
  } catch (error) {
    console.error("Proxy error: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to fetch from RescueGroups" })
    };
  }
};
