import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function MapUpdater({ apartments }) {
    const map = useMap();

    useEffect(() => {
        // Only trigger the fly animation if we have actual coordinates to look at
        if (apartments && apartments.length > 0) {
            const coordinates = apartments.map(apt => [apt.latitude, apt.longitude]);
            const bounds = L.latLngBounds(coordinates);
            
            // Fly to the new city and pad the edges so pins don't touch the screen border
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
    }, [apartments, map]);

    return null; 
}