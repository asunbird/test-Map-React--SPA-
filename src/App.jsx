import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';
// Fix for default marker icon in leaflet with bundler
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
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
    if (!lat || !lon) {
      if (map) {
        const center = map.getCenter();
        lat = center.lat;
        lon = center.lng;
      } else {
        return;
      }
    }

    setIsLoadingShelters(true);
    try {
      // 5000m radius around the specified lat/lon
      const radius = 5000;
      const overpassQuery = `
        [out:json];
        node["amenity"="animal_shelter"](around:${radius},${lat},${lon});
        out body;
      `;
      // We use the public overpass-api interpreter.
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      setShelters(data.elements || []);
    } catch(err) {
      console.error(err);
      alert("Failed to fetch shelters layer");
    } finally {
      setIsLoadingShelters(false);
    }
  };



  return (
    <>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>Find Animal Shelter</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flex: 1, marginLeft: '30px', maxWidth: '600px' }}>
          <input 
            type="text" 
            placeholder="Search city (e.g. London)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" disabled={isSearching} style={{ padding: '8px 24px', fontSize: '16px', background: 'var(--highlight-lavender)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSearching ? '...' : 'Go'}
          </button>
        </form>
      </header>
      
      <main style={{ position: 'relative' }}>
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

              return (
                <Marker key={shelter.id} position={[shelter.lat, shelter.lon]}>
                  <Popup>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>{name}</h3>
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
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* UI Overlay */}
        <section id="map" style={{ pointerEvents: 'none', position: 'relative', zIndex: 2, background: 'transparent' }}>
            <div id="map-control" style={{ pointerEvents: 'auto' }}>
                <input id="plus" type="button" value="+" onClick={handleZoomIn} />
                <input id="minus" type="button" value="-" onClick={handleZoomOut} />
                
                {/* Search in this area button */}
                <button 
                  onClick={() => fetchShelters()} 
                  disabled={isLoadingShelters}
                  style={{ width: '80px', height: '40px', fontSize: '12px', marginTop: '10px', marginLeft: '-20px', cursor: 'pointer' }}>
                  {isLoadingShelters ? '...' : 'Search Area'}
                </button>
            </div>
            
            <div id="map-close" style={{ pointerEvents: 'auto' }}>
                <input id="close" type="button" value="x" />
            </div>
        </section>
      </main>
      <footer></footer>
    </>
  );
}
