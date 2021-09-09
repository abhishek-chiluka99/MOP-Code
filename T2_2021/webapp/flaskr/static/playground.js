mapboxgl.accessToken = 'pk.eyJ1IjoianNhbnNvbXNoZXJ3aWxsIiwiYSI6ImNrc2Y4Z255MjE4NXAydXBpbGs5bHlha3IifQ.dgv4c4Gl2v_K0TN_RpYfKg';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/light-v10', // style URL
    center: [144.95460780722914, -37.81422463241198], // starting position [lng, lat]
    zoom: 13 // starting zoom
});

map.on('load', () => {
    showParkingSensorsOnMap()
});

map.on('click', function(e) {
    fetch($SCRIPT_ROOT + `/playground/query_location?lng=${e.lngLat.lng}&lat=${e.lngLat.lat}`)
        .then(request => request.json())
        .then(data => console.dir(data))
})

var unknownMakerName = 'unknown_marker'
var presentMarkerName = 'occupied_marker'
var unoccupiedMarkerName = 'unoccupied_marker'

function showParkingSensorsOnMap() {
    // add the markers for different statuses to our available images
    let imagesPromise = loadMarkers()
    let latestSensors = fetch($SCRIPT_ROOT + "/playground/parking-sensors/latest.json")
        .then(result => result.json())

    Promise.all([imagesPromise, latestSensors])
        .then(([_, data]) => {
            // convert sensor information into geojson
            return data
                .reduce((features, parkingSensor) => {
                    let { lat, lon, status } = parkingSensor
                    let lng = lon
                    let feature = {

                            'type': 'Feature',
                            'geometry': {
                                'type': 'Point',
                                'coordinates': [
                                    lng, lat
                                ]
                            },
                            'properties': {
                                'title': status
                            }
                        }
                        // add next parking sensor to the geojson features
                        // with respect to status
                    features[status].push(feature)
                    return features
                }, { 'Present': [], 'Unoccupied': [], 'Unknown': [] })
        })
        .then(features => {
            // add each status type to the map
            // as new marker mapbox layer
            let { Present, Unoccupied, Unknown } = features

            addLayer(Unknown, unknownMakerName)
            addLayer(Present, presentMarkerName)
            addLayer(Unoccupied, unoccupiedMarkerName)
        })
}

function loadMapImage(image) {
    return new Promise((resolve, reject) => map.loadImage($SCRIPT_ROOT + image,
        (error, image) => {
            if (error)
                reject(error)
            else
                resolve(image)
        }))
}

function loadMarkers() {
    return Promise.all([
        loadMapImage('/static/occupied_parking_sensor_25px.png'), // url of custom png markers to represent status
        loadMapImage('/static/unoccupied_parking_sensor_25px.png'),
        loadMapImage('/static/unknown_parking_sensor_25px.png')
    ]).then(([occupied, unoccupied, unknown]) => {
        map.addImage(presentMarkerName, occupied)
        map.addImage(unoccupiedMarkerName, unoccupied)
        map.addImage(unknownMakerName, unknown)
    })
}

function addLayer(features, markerName) {
    map.addSource(markerName, {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': features
        }
    });
    map.addLayer({
        'id': markerName,
        'type': 'symbol',
        'source': markerName,
        'layout': {
            'icon-image': markerName,
            // get the title name from the source's "title" property
            'text-field': ['get', 'title'],
            'text-font': [
                'Open Sans Semibold',
                'Arial Unicode MS Bold'
            ],
            'text-offset': [0, 1.25],
            'text-anchor': 'top'
        }
    });
}