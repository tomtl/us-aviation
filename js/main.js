require([
    "esri/Basemap",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/views/layers/support/FeatureFilter",
    "esri/core/watchUtils",
    "esri/renderers/smartMapping/statistics/uniqueValues"
], function(
    Basemap,
    Map, 
    MapView,
    FeatureLayer,
    FeatureFilter,
    watchUtils,
    uniqueValues
) {
    // market points
    const marketsLayer = new FeatureLayer({
        url: "https://services2.arcgis.com/GBMwyWOj5RVtr5Jk/arcgis/rest/services/markets_20200705/FeatureServer/0",
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
                    field: "pass_2019",
                    stops: [
                        {value: 1000000, size: 4, label: "< 1 million"},
                        {value: 25000000, size: 17, label: "10 million"},
                        {value: 50000000, size: 30, label: "> 50 million"},
                    ]
                },
                {                
                    type: "opacity",
                    field: "pass_2019",
                    stops: [
                        {value: 0, opacity: 0.30},
                        {value: 1000000, opacity: 0.60},
                        {value: 5000000, opacity: 0.90}
                    ]
                }
            ]
        }
    });

    // routes layer
    const routesLayer = new FeatureLayer({
        title: "routesLayer",
        url: "https://services2.arcgis.com/GBMwyWOj5RVtr5Jk/arcgis/rest/services/routes_20200705/FeatureServer/0",
        // definitionExpression: "unique_carrier_name = 'Southwest Airlines Co.'",
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
                    field: "pass_2019",
                    stops: [
                        {value: 100000, opacity: 0.05},
                        {value: 300000, opacity: 0.30},
                        {value: 500000, opacity: 0.90}
                    ]
                }
            ]
        }
    });

    const arcadeScript = document.getElementById("routes-arcade").text;

    const routesPopupTemplate = {
        title: "{origin} - {dest}",
        content: [
            {
                type: "fields",
                fieldInfos: [
                    {
                        fieldName: "origin_airport_name",
                        label: "Origin airport"
                    },
                    {
                        fieldName: "origin_market_name",
                        label: "Origin market"
                    },
                    {
                        fieldName: "dest_airport_name",
                        label: "Destination airport"
                    },
                    {
                        fieldName: "dest_market_name",
                        label: "Destination market"
                    },
                    {
                        fieldName: "distance_miles",
                        label: "Distance (miles)",
                        format: {
                            digitSeparator: true,
                        }
                    }
                ]
            }
        ]
        // expressionInfos: [{
        //     name: "airlines-count",
        //     title: "Airlines count",
        //     expression: arcadeScript
        // }]
    };
    routesLayer.popupTemplate = routesPopupTemplate;

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

    // watchUtils.whenFalseOnce(view, "updating", function(){
    //     routesLayer.popupTemplate = routesPopupTemplate;
    // });

    

    // airlines filter
    // list of airlines
    watchUtils.whenFalseOnce(view, "updating", generateAirlinesFilter);

    function generateAirlinesFilter(){
        uniqueValues({
            layer: routesLayer,
            field: "unique_carrier_name"
        }).then(function(response){
            var infos = response.uniqueValueInfos;

            var airlineNames = [];
            infos.forEach(function(info){
                airlineNames.push(info.value);
            });

            airlineNames.sort()

            // Setup airlines dropdown menu options
            let airlinesSelect = buildFilterDropdown(airlineNames, "airlines");

            // load filter dropdown with values
            const airlinesFilterMenu = document.getElementById("airlinesFilter");
            airlinesFilterMenu.appendChild(airlinesSelect);

            // get user selection from filter dropdown
            airlinesFilterMenu.addEventListener("click", filterByAirline);
        });
    };

    function filterByAirline(event) {
        const selectedAirline = event.target.getAttribute("value");
        if (selectedAirline) {
            filterRoutesByAirline(selectedAirline);
        }
    };

    // filter to one airline in the view
    function filterRoutesByAirline(airline) {
        // Filter the routes layer view by airline
        let whereStatement = `unique_carrier_name = '${airline}'`;

        // ALL AIRLINES option
        if (airline == 'ALL AIRLINES') {
            whereStatement = null;
        }

        filterLayer(routesLayer, whereStatement);
    };

    // Markets filter
    // list of markets
    watchUtils.whenFalseOnce(view, "updating", generateMarketsFilter);

    function generateMarketsFilter(){
        uniqueValues({
            layer: routesLayer,
            field: "origin_market_name"
        }).then(function(response){
            var infos = response.uniqueValueInfos;

            var marketNames = [];
            infos.forEach(function(info){
                marketNames.push(info.value);
            });

            marketNames.sort()

            // setup dropdown menu options
            let marketsSelect = buildFilterDropdown(marketNames, "markets");

            // load filter dropdown with values
            const marketsFilterMenu = document.getElementById("marketsFilter");
            marketsFilterMenu.appendChild(marketsSelect);

            // get user selection from filter dropdown
            marketsFilterMenu.addEventListener("click", filterByMarket);
        });
    };

    function filterByMarket(event) {
        const selectedMarket = event.target.getAttribute("value");
        if (selectedMarket) {
            filterRoutesByMarket(selectedMarket);
        }
    };

    // filter to one market in the view
    function filterRoutesByMarket(market) {
        // Filter the routes layer view by market
        let whereStatement = `origin_market_name = '${market}'`;

        // ALL MARKETS option
        if (market == 'ALL MARKETS') {
            whereStatement = null;
        }

        filterLayer(routesLayer, whereStatement);
    };

    function buildFilterDropdown(values, id) {
        // build element of airlines or markets for dropdown menu
        let itemsSelect = document.createElement("select");
        itemsSelect.id = id;

        // include ALL AIRLINES option
        allOption = "ALL " + id.toUpperCase();
        values.unshift(allOption);

        for (const val of values) {
            let item = document.createElement("option");
            item.value = val;
            item.text = val;
            item.textContent = val;
            itemsSelect.appendChild(item);
        };

        return itemsSelect;
    }

    function filterLayer(layer, whereStatement) {
        // Filter any layer view using where statement
        view.whenLayerView(layer).then(function(layerView) {
            layerView.filter = new FeatureFilter({
                where: whereStatement
            });
        });
    };
})


