import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';

export default function App() {
  const [map, setMap] = useState(null);

  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };

  return (
    <>
      <header></header>
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
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
            />
          </MapContainer>
        </div>

        {/* UI Overlay */}
        <section id="map" style={{ pointerEvents: 'none', position: 'relative', zIndex: 2, background: 'transparent' }}>
            <div id="map-control" style={{ pointerEvents: 'auto' }}>
                <input id="plus" type="button" value="+" onClick={handleZoomIn} />
                <input id="minus" type="button" value="-" onClick={handleZoomOut} />
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
