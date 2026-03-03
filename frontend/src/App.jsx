import { useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapUpdater from './MapUpdater';

// Helper function to color-code by price instead of crime
const getMarkerColor = (price) => {
    if (price <= 700) return '#22c55e'; // Green (Steal)
    if (price <= 800) return '#f97316'; // Orange (Moderate)
    return '#ef4444';                   // Red (Pushing the budget)
};

// Helper function to create the dynamic HTML map pin
const createCustomIcon = (price, isHovered) => {
    const color = getMarkerColor(price);
    const size = isHovered ? 36 : 20; 
    const border = isHovered ? '4px solid #fbbf24' : '3px solid white'; 
    const shadow = isHovered ? '0 4px 12px rgba(0,0,0,0.6)' : '0 2px 5px rgba(0,0,0,0.4)';

    return L.divIcon({
        className: 'custom-price-marker',
        html: `
            <div style="
                background-color: ${color}; 
                width: ${size}px; 
                height: ${size}px; 
                border-radius: 50%; 
                border: ${border};
                box-shadow: ${shadow};
                transition: all 0.2s ease-in-out;
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -size/2]
    });
};

export default function App() {
    // Application State
    const [city, setCity] = useState('Birmingham');
    const [maxPrice, setMaxPrice] = useState(850);
    const [apartments, setApartments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredAptIndex, setHoveredAptIndex] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch logic
    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`http://localhost:3000/api/rentals`, {
                params: { city, maxPrice }
            });
            setApartments(data);
            setCurrentPage(1); // Reset to page 1 on a fresh search
        } catch (err) {
            console.error(err);
            setError("Could not fetch apartments. Check if the backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    // CSV Export Logic (Crime removed, formatted for clean rental data)
    const exportToCSV = () => {
        if (apartments.length === 0) return;

        const headers = ["Address", "Price", "Beds", "Baths", "Latitude", "Longitude"];
        const rows = apartments.map(apt => {
            const safeAddress = `"${apt.formattedAddress}"`;
            return [safeAddress, apt.price, apt.bedrooms || 'N/A', apt.bathrooms || 'N/A', apt.latitude, apt.longitude].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `rentals_${city}_under_${maxPrice}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Pagination Math
    const indexOfLastApt = currentPage * itemsPerPage;
    const indexOfFirstApt = indexOfLastApt - itemsPerPage;
    const currentApartmentsList = apartments.slice(indexOfFirstApt, indexOfLastApt);
    const totalPages = Math.ceil(apartments.length / itemsPerPage);

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
            
            {/* LEFT SIDEBAR */}
            <div style={{ width: '35%', minWidth: '350px', padding: '20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd', backgroundColor: '#fff' }}>
                <h2 style={{ marginTop: 0 }}>Safe Rentals Finder</h2>
                
                {/* Search Controls */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="City" 
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <input 
                        type="number" 
                        value={maxPrice} 
                        onChange={(e) => setMaxPrice(e.target.value)} 
                        placeholder="Max Price"
                        style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <button 
                        onClick={handleSearch} 
                        disabled={isLoading}
                        style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {isLoading ? '...' : 'Search'}
                    </button>
                </div>

                {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                {/* Export Button */}
                {apartments.length > 0 && (
                    <button 
                        onClick={exportToCSV}
                        style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        📥 Export {apartments.length} Results to CSV
                    </button>
                )}

                {/* Paginated List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flexGrow: 1, overflowY: 'auto' }}>
                    {currentApartmentsList.map((apt, index) => {
                        const actualIndex = indexOfFirstApt + index; 
                        
                        return (
                            <li 
                                key={actualIndex}
                                onMouseEnter={() => setHoveredAptIndex(actualIndex)}
                                onMouseLeave={() => setHoveredAptIndex(null)}
                                style={{
                                    padding: '15px',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer',
                                    backgroundColor: hoveredAptIndex === actualIndex ? '#f8fafc' : 'transparent',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>${apt.price}/mo</strong>
                                    <span style={{ fontSize: '0.85em', color: '#666' }}>{apt.bedrooms} Bed | {apt.bathrooms} Bath</span>
                                </div>
                                <div style={{ color: '#444', marginTop: '5px' }}>{apt.formattedAddress}</div>
                            </li>
                        );
                    })}
                    {apartments.length === 0 && !isLoading && !error && (
                        <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>No apartments to show. Try a search!</p>
                    )}
                </ul>

                {/* Pagination Controls */}
                {apartments.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '5px 10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '0.9em', color: '#666' }}>Page {currentPage} of {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '5px 10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR: Map */}
            <div style={{ width: '65%', height: '100vh', position: 'relative' }}>
                <MapContainer 
                    center={[33.5186, -86.8104]} // Defaults to Birmingham initially
                    zoom={11} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapUpdater apartments={apartments} />

                    {apartments.map((apt, index) => {
                        const isHovered = hoveredAptIndex === index;

                        return (
                            <Marker 
                                key={index} 
                                position={[apt.latitude, apt.longitude]}
                                icon={createCustomIcon(apt.price, isHovered)} 
                                zIndexOffset={isHovered ? 1000 : 0} 
                            >
                                <Popup>
                                    <strong>${apt.price}/mo</strong><br />
                                    {apt.bedrooms} Bed | {apt.bathrooms} Bath<br/>
                                    {apt.formattedAddress}
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
            
        </div>
    );
}