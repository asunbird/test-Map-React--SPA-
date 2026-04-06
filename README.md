# Animal Shelter Map SPA

### 🌍 Data & Smart Logic
The app uses a **multi-layered API strategy** to provide global coverage without a backend:
1. **Nominatim (OSM)**: Instantly geocodes your city searches into coordinates.
2. **Overpass QL**: A custom query language that finds real animal shelters
(`amenity=animal_shelter`) directly from OpenStreetMap data.
3. **RescueGroups API**: Fetches live adoptable pet data.
4. **Netlify Serverless Functions**: Acts as a secure proxy to store your API keys safely
while the app remains a front-end SPA.
