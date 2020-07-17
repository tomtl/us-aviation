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
    let filterValues = {
        airline: "ALL AIRLINES",
        market: "ALL MARKETS",
        year: "2019"
    };

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
                    field: "pass_" + filterValues.year,
                    stops: [
                        {value: 1000000, size: 4, label: "< 1 million"},
                        {value: 25000000, size: 17, label: "10 million"},
                        {value: 50000000, size: 30, label: "> 50 million"},
                    ]
                },
                {                
                    type: "opacity",
                    field: "pass_" + filterValues.year,
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
                    field: "pass_" + filterValues.year,
                    stops: [
                        {value: 0, opacity: 0.00},
                        {value: 1, opacity: 0.05},
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

    // airlines filter
    // list of airlines
    watchUtils.whenFalseOnce(view, "updating", generateFilter("unique_carrier_name", "airlines"));
    watchUtils.whenFalseOnce(view, "updating", generateFilter("origin_market_name", "markets"));

    // Create the chart
    let ctx = document.getElementById("chart");
    let airlinePassengersChart = new Chart(ctx, { type: 'doughnut', data: {} });
    createAirlinesChart(airlinePassengersChart);


    function generateFilter(field, attribute){
        uniqueValues({
            layer: routesLayer,
            field: field
        }).then(function(response){
            var infos = response.uniqueValueInfos;

            var names = [];
            infos.forEach(function(info){
                names.push(info.value);
            });

            names.sort()

            // Setup dropdown menu options
            let itemsSelect = buildFilterDropdown(names, attribute);

            // load filter dropdown with values
            const elementId = attribute + "Filter";
            const filterMenu = document.getElementById(elementId);
            filterMenu.appendChild(itemsSelect);

            // get user selection from filter dropdown
            if (attribute == "airlines") {
                filterMenu.addEventListener("click", filterByAirline)
            } else if (attribute == "markets") {
                filterMenu.addEventListener("click", filterByMarket)
            }
        });
    };

    function filterByAirline(event) {
        const selectedAirline = event.target.getAttribute("value");
        
        if (selectedAirline) {
            // filterRoutesByAirline(selectedAirline);
            filterValues.airline = selectedAirline;
            filterRoutesByAirlineMarket();
            updateAirlinePassengersChart(airlinePassengersChart, filterValues);
        }
    };

    // Markets filter
    function filterByMarket(event) {
        const selectedMarket = event.target.getAttribute("value");

        if (selectedMarket) {
            // filterRoutesByMarket(selectedMarket);
            filterValues.market = selectedMarket;
            filterRoutesByAirlineMarket();
        }
    };

    function filterRoutesByAirlineMarket() {
        // Filter by airline and market
        let airlineName = filterValues.airline;
        let marketName = filterValues.market;
        let whereStatement = "";

        if (airlineName == 'ALL AIRLINES' && marketName == 'ALL MARKETS') {
            whereStatement = null;
        } else if (airlineName == 'ALL AIRLINES') {
            whereStatement = `origin_market_name = '${marketName}'`;
        } else if (marketName == 'ALL MARKETS') {
            whereStatement = `unique_carrier_name = '${airlineName}'`;
        } else {
            whereStatement = `unique_carrier_name = '${airlineName}' AND origin_market_name = '${marketName}'`;
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

    // Year
    const yearMenu = document.getElementById("yearSelector");
    yearMenu.addEventListener("click", changeYear);

    function changeYear(event){
        const selectedYear = event.target.getAttribute("value");
        if (selectedYear) {
            filterValues.year = selectedYear;

            // update the routes layer renderer to point to new field
            let routesRenderer = routesLayer.renderer.clone();
            routesRenderer.visualVariables[0].field = "pass_" + filterValues.year;
            routesLayer.renderer = routesRenderer;

            // update the markets layer renderer to point to new field
            let marketsRenderer = marketsLayer.renderer.clone();
            marketsRenderer.visualVariables[0].field = "pass_" + filterValues.year;
            marketsRenderer.visualVariables[1].field = "pass_" + filterValues.year;
            marketsLayer.renderer = marketsRenderer;
        }
        
    };

    // AIRLINE PASSENGERS PIE CHART
    function createAirlinesChart(myChart){
        const query = routesLayer.createQuery();
        query.outStatistics = [{
            onStatisticField: "pass_" + filterValues.year,
            outStatisticFieldName: "passengers",
            statisticType: "sum"
        }];
    
        if (filterValues.airline != "ALL AIRLINES") {
            query.where = unique_carrier_name = filterValues.airline;
        }
    
        query.groupByFieldsForStatistics = [ "unique_carrier_name" ];
    
        routesLayer.queryFeatures(query).then(function(response){
            let topAirlines = getTopAirlinePassengers(response.features);
            let [labels, data ] = setupAirlineChartData(topAirlines);
    
            let ctx = document.getElementById("chart");
            
            myChart.plugins = [ChartDataLabels];
            myChart.data = {
                labels: labels,
                datasets: [{
                    label: "Passengers",
                    data: data,
                    datalabels: {
                        anchor: 'end',
                        offset: 0,
                        padding: 0,
                        labels: {
                            name: {
                                align: 'end',
                                formatter: function(value, ctx) {
                                    return (
                                        formatAirlineName(ctx.chart.data.labels[ctx.dataIndex]) + " "
                                        + formatNumberLabel(value)
                                    );
                                }
                            }
                        }
                    }
                }]
            };
            myChart.options = {
                legend: {
                    display: false,
                },
                layout: {
                    padding: {
                        top: 30,
                        bottom: 30
                    }
                }
            };
            myChart.update();
        });
    };

    function updateAirlinePassengersChart(myChart, filterValues){
        const query = routesLayer.createQuery();
        query.outStatistics = [{
            onStatisticField: "pass_" + filterValues.year,
            outStatisticFieldName: "passengers",
            statisticType: "sum"
        }];
    
        if (filterValues.airline != "ALL AIRLINES") {
            query.where = `unique_carrier_name = '${filterValues.airline}'`;
        }
    
        query.groupByFieldsForStatistics = [ "unique_carrier_name" ];
    
        routesLayer.queryFeatures(query).then(function(response){
            let topAirlines = getTopAirlinePassengers(response.features);
            let [labels, data ] = setupAirlineChartData(topAirlines);

            myChart.data = {
                labels: labels,
                datasets: [{
                    label: "Passengers",
                    data: data,
                    datalabels: {
                        anchor: 'end',
                        offset: 0,
                        padding: 0,
                        labels: {
                            name: {
                                align: 'end',
                                formatter: function(value, ctx) {
                                    return (
                                        formatAirlineName(ctx.chart.data.labels[ctx.dataIndex]) + " "
                                        + formatNumberLabel(value)
                                    );
                                }
                            }
                        }
                    }
                }]
            };

            myChart.update();
        });
    };

    function formatNumberLabel(val) {
        // Round a value for displaying in a label
        let label = '';

        if (val > 100000) {
            label = Math.sign(val)*((Math.abs(val)/1000000).toFixed(3)) + 'M';
        } else {
            label = val;
        }

        return label;
    };
    

    function getTopAirlinePassengers(results) {
        // Get the top airlines and their passenger counts
        const topAirlineCount = 6; // The count of Top Airlines to include

        // parse the data
        let passengerCounts = [];
        results.forEach(parseResults);
        function parseResults(result){
            let airlinePassengerCount = {};
            airlinePassengerCount.airline = result.attributes["unique_carrier_name"];
            airlinePassengerCount.passengers = result.attributes.passengers;
            passengerCounts.push(airlinePassengerCount);
        };

        passengerCounts.sort(function(a, b) {
            return b.passengers - a.passengers;
        });

        // get the total passengers
        let totalPassengers = 0;
        for (var i=0; i<passengerCounts.length; i++) {
            totalPassengers += passengerCounts[i].passengers;
        }
        
        // get the top airlines plus a number for Others
        let topAirlines = [];
        if (passengerCounts.length > topAirlineCount) {
            topAirlines = passengerCounts.slice(0, topAirlineCount);
            let topAirlinesPassengers = 0;
            for (var i=0; i<topAirlines.length; i++) {
                topAirlinesPassengers += topAirlines[i].passengers;
            }
            topAirlines.push({airline: 'Others', passengers: totalPassengers - topAirlinesPassengers});
        } else {
            topAirlines = passengerCounts;
        }
        
        return topAirlines;
    };

    function formatAirlineName(airline) {
        const majorAirlines = {
            "Southwest Airlines Co.": "Southwest",
            "Delta Air Lines Inc.": "Delta",
            "American Airlines Inc.": "American",
            "United Air Lines Inc.": "United",
            "JetBlue Airways": "JetBlue",
            "SkyWest Airlines Inc.": "SkyWest",
            "Alaska Airlines Inc.": "Alaska",
            "Spirit Air Lines": "Spirit",
            "Frontier Airlines Inc.": "Frontier",
            "Republic Airline": "Republic"
        };

        if (airline in majorAirlines) {
            return majorAirlines[airline];
        } else if (airline.length > 15) {
            return airline.split(' ')[0];
        } else {
            return airline;
        }
    };

    function setupAirlineChartData(topAirlines) {
        // setup the data for the chart
        let labels = [];
        let data = [];

        for (var i=0; i<topAirlines.length; i++) {
            labels.push(topAirlines[i].airline);
            data.push(topAirlines[i].passengers);
        }

        return [labels, data];
    };
})


