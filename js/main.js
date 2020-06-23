require([
    "esri/Basemap",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer"
], function(
    Basemap,
    Map, 
    MapView,
    FeatureLayer
) {
    // market points
    const marketsLayer = new FeatureLayer({
        url: "https://services2.arcgis.com/GBMwyWOj5RVtr5Jk/arcgis/rest/services/markets_20200616/FeatureServer/0",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-marker",
                color: [0, 0, 0, 0],
                outline: {
                    width: 1,
                    color: "#d6d6d6"
                },
                size: "8"
            },
            visualVariables: [
                {
                    type: "size",
                    field: "pass_2019_7",
                    stops: [
                        {value: 100000, size: 4, label: "< 100,000"},
                        {value: 2500000, size: 17, label: "1 million"},
                        {value: 5000000, size: 30, label: "> 5 million"},
                    ]
                },
                {                
                    type: "opacity",
                    field: "pass_2019_7",
                    stops: [
                        {value: 0, opacity: 0.30},
                        {value: 100000, opacity: 0.60},
                        {value: 500000, opacity: 0.90}
                    ]
                }
            ]
        }
    });

    const routesLayer = new FeatureLayer({
        url: "https://services2.arcgis.com/GBMwyWOj5RVtr5Jk/arcgis/rest/services/routes_20200616/FeatureServer/0",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-line",
                color: "#00c5ff",
                width: 1
            },
            visualVariables: [
                {
                    type: "opacity",
                    field: "pass_2019_7",
                    stops: [
                        {value: 10000, opacity: 0.03},
                        {value: 30000, opacity: 0.25},
                        {value: 50000, opacity: 0.80}
                    ]
                }
            ]
        }
    });
    
    const basemap = new Basemap({
        portalItem: { id: "1a03412c06cc4d4f8d8f666c8992ad95" } // Custom basemap
    });

    const map = new Map({
        basemap: basemap,
        layers: [routesLayer, marketsLayer]
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-96.0, 34.0],
        zoom: 4
    });
})


