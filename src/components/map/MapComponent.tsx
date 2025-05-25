import * as React from 'react';
import Map from 'react-map-gl/maplibre';
// import Map, { Source, Layer, LayerProps, Marker } from 'react-map-gl/maplibre';

// const CIRCLE_COORDS = [4.954392615910099, 52.35487375833284];

// const circleSource = {
//   type: 'geojson',
//   data: {
//     type: 'FeatureCollection',
//     features: [
//       {
//         type: 'Feature',
//         geometry: {
//           type: 'Point',
//           coordinates: CIRCLE_COORDS
//         },
//         properties: {}
//       }
//     ]
//   }
// };

// const circleLayer: LayerProps = {
//   id: 'circle-layer',
//   type: 'circle',
//   source: 'circle-source',
//   paint: {
//     'circle-radius': 30,
//     'circle-color': '#fc0303'
//     // 'circle-stroke-width': 2,
//     // 'circle-stroke-color': '#fc0303'
//   }
// };

export default function MapComponent() {
  // const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <Map
      initialViewState={{
        longitude: 4.954392615910099,
        latitude: 52.35487375833284,
        zoom: 13
      }}
      style={{ width: '100%', height: 400 }}
      mapStyle="https://api.maptiler.com/maps/openstreetmap/style.json?key=EbBHdB4yorH5ew69HEPJ"
      maplibreLogo={false}
      // onLoad={() => setIsLoaded(true)}
    >
      {/* {isLoaded && (
        <Source id="circle-source" type="geojson" data={circleSource.data}>
          <Layer {...circleLayer} />
        </Source>
      )}
      <Marker longitude={CIRCLE_COORDS[0]} latitude={CIRCLE_COORDS[1]}>
        📍
      </Marker> */}
    </Map>
  );
}
