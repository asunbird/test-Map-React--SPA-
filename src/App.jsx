import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';
// Fix for default marker icon in leaflet with bundler
import L from 'leaflet';
import pawIcon from './assets/paw-point.png';

let DefaultIcon = L.icon({
    iconUrl: pawIcon,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const [hasSearched, setHasSearched] = useState(false);
  const [map, setMap] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [shelters, setShelters] = useState([]);
  const [isLoadingShelters, setIsLoadingShelters] = useState(false);



  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };

  // Phase 1: Nominatim Geocoding
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      });
      const data = await resp.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (map) {
          map.flyTo([parseFloat(lat), parseFloat(lon)], 13);
          // Auto-fetch shelters upon traveling to new city
          fetchShelters(parseFloat(lat), parseFloat(lon));
        }
        setHasSearched(true);
      } else {
        alert("Location not found!");
      }
    } catch (err) {
      console.error(err);
      alert("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  // Phase 2: Overpass QL Shelter Fetching
  const fetchShelters = async (lat, lon) => {
    if (lat === undefined || lon === undefined) {
      if (map) {
        const center = map.getCenter();
        lat = center.lat;
        lon = center.lng;
      } else {
        return;
      }
    }

    setIsLoadingShelters(true);
    
    // List of mirror servers in case one is down or overloaded (504/429)
    // Expanded list of reliable mirror servers around the world
    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://z.overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.osm.ch/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter'
    ];

    let lastError = null;

    for (const url of mirrors) {
      // Small 500ms delay between retries to give the next mirror a clean start
      if (lastError) await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const radius = 30000; // 30km
        const overpassQuery = `
          [out:json][timeout:25];
          nwr["amenity"="animal_shelter"](around:${radius},${lat},${lon});
          out center;
        `;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: `data=${encodeURIComponent(overpassQuery)}`
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        const elements = data.elements || [];
        
        if (elements.length === 0) {
           console.warn(`No shelters found near ${lat}, ${lon} within 30km`);
        }

        setShelters(elements);
        setIsLoadingShelters(false);
        return; 

      } catch (err) {
        console.warn(`Mirror ${url} failed, trying next...:`, err.message);
        lastError = err;
      }
    }

    setIsLoadingShelters(false);
    if (lastError) {
      alert("All Overpass servers are currently struggling due to high traffic. Please try again in about 1 minute.");
    }
  };



  return (
    <>
      <header>
        <h2>Find Animal Shelter</h2>
        <form id="map-view-form" onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search city (e.g. London)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? '...' : 'Go'}
          </button>
        </form>
      </header>
      
      <main>
        {!hasSearched ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">🐾</div>
              <h1>Find Animal Shelters Near You</h1>
              <p>Enter a city name above to discover shelters, contact details, and adoption centers within 30km.</p>
              <div className="pulse-button-hint">Use the search bar to get started</div>
            </div>
          </div>
        ) : (
          <div className="map-view-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Leaflet Map Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
              <MapContainer 
                center={[51.505, -0.09]} 
                zoom={13} 
                zoomControl={false} 
                style={{ width: '100%', height: '100%' }}
                ref={setMap}
              >
                <TileLayer
                  url={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${import.meta.env.VITE_STADIA_MAPS_KEY || ''}`}
                  attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
                />
                
                {/* Render overpass markers */}
                {shelters.map((shelter) => {
                  const tags = shelter.tags || {};
                  const name = tags.name || 'Unknown Shelter';
                  const website = tags['contact:website'] || tags.website;
                  const phone = tags['contact:phone'] || tags.phone;
                  const email = tags['contact:email'] || tags.email;
                  const openingHours = tags.opening_hours;
                  
                  // Extract address information if available
                  const street = tags['addr:street'];
                  const houseNum = tags['addr:housenumber'];
                  const city = tags['addr:city'];
                  const address = [houseNum, street, city].filter(Boolean).join(' ');

                  // Support both nodes (direct lat/lon) and ways/relations (center property)
                  const lat = shelter.lat || (shelter.center && shelter.center.lat);
                  const lon = shelter.lon || (shelter.center && shelter.center.lon);

                  if (!lat || !lon) return null;

                  return (
                    <Marker key={shelter.id} position={[lat, lon]} icon={DefaultIcon}>
                      <Popup>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>{name}</h3>
                        {address && (
                          <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9rem' }}>
                            {address}
                          </p>
                        )}
                        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        {website && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Website:</strong>{' '}
                            <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer">
                              {website}
                            </a>
                          </p>
                        )}
                        {phone && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Phone:</strong> <a href={`tel:${phone}`}>{phone}</a>
                          </p>
                        )}
                        {email && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a>
                          </p>
                        )}
                        {openingHours && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Hours:</strong> {openingHours}
                          </p>
                        )}
                        <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px', textAlign: 'center' }}>
                          <a 
                            href={`https://www.openstreetmap.org/${shelter.type}/${shelter.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#999', textDecoration: 'none' }}
                          >
                            ℹ️ View or Edit on OpenStreetMap
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
              
              {/* Status Message for empty results */}
              {!isLoadingShelters && shelters.length === 0 && (
                <div className="status-message">
                  No shelters found in this area (30km radius)
                </div>
              )}
            </div>

            {/* UI Overlay */}
            <section id="map" style={{ pointerEvents: 'none' }}>
                <div id="map-control" style={{ pointerEvents: 'auto' }}>
                    <button className="map-btn" onClick={handleZoomIn}>+</button>
                    <button className="map-btn" onClick={handleZoomOut}>-</button>
                    
                    {/* Search in this area button */}
                    <button 
                      className="map-btn search-area-btn"
                      onClick={() => fetchShelters()} 
                      disabled={isLoadingShelters}
                    >
                      {isLoadingShelters ? '...' : 'Search Area'}
                    </button>
                </div>
                
                <div id="map-close" style={{ pointerEvents: 'auto' }}>
                    <button className="map-btn" onClick={() => setHasSearched(false)}>x</button>
                </div>
            </section>
          </div>
        )}
      </main>
      <footer>
        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>© 2026 Paws Care Map — Saving lives one shelter at a time</p>
      </footer>
    </>
  );
}
