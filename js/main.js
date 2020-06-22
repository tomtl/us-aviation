require([
    "esri/WebMap",
    "esri/views/MapView"
], function(WebMap, MapView) {
    
    const webmap = new WebMap({
        portalItem: { id: "af45375c68d3493dbf74ab744024fca6" }
    });

    const view = new MapView({
        container: "viewDiv",
        map: webmap,
        center: [-96.0, 34.0],
        zoom: 4
    });
})


