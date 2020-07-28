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

    // const arcadeScript = document.getElementById("routes-arcade").text;

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
    // Airline Passengers pie chart
    const ctx = document.getElementById("airlinePassengersChart");
    let airlinePassengersChart = new Chart(ctx, { type: 'doughnut', data: {} });
    updateAirlinePassengersChart(airlinePassengersChart);

    // Airline passenger miles pie chart
    const airlinePassengerMilesCtx = document.getElementById("airlinePassengerMilesChart");
    let airlinePassengerMilesChart = new Chart(airlinePassengerMilesCtx, { type: "doughnut", data: {} });
    updateAirlinePassengerMilesChart(airlinePassengerMilesChart);

    // Origin Market passenger counts
    let originMarketPassengersChart = createBarChart("originMarketPassengersChart")
    updateOriginMarketPassengersChart(originMarketPassengersChart);

    // Destination Market Passenger counts
    let destMarketPassengersChart = createBarChart("destMarketPassengersChart");
    updateDestMarketPassengersChart(destMarketPassengersChart);

    // Origin Airport passenger chart
    let originAirportPassengersChart = createBarChart("originAirportPassengersChart");
    updateOriginAirportPassengersChart(originAirportPassengersChart);

    // Dest Airport passenger chart
    let destAirportPassengersChart = createBarChart("destAirportPassengersChart");
    updateDestAirportPassengersChart(destAirportPassengersChart);

    // Route passengers chart
    let routePassengersChart = createBarChart("routePassengersChart");
    updateRoutePassengersChart(routePassengersChart);

    // Market Route passengers chart
    let marketRoutePassengersChart = createBarChart("marketRoutePassengersChart");
    updateMarketRoutePassengersChart(marketRoutePassengersChart);

    // Hide all the bar charts except the first one
    hideInactiveBarCharts();
    function hideInactiveBarCharts(){
        const tabContent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabContent.length; i++) {
            if (i != 0) {
                tabContent[i].style.display = "none";
            } 
        };
    };

    function createBarChart(id){
        const destMarketPassengersCtx = document.getElementById(id);
        destMarketPassengersCtx.height = 200;
        let chart = new Chart(destMarketPassengersCtx, { type: "bar", data: {}, options: {maintainAspectRatio: false} });
    
        return chart;
    };

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
                filterMenu.addEventListener("change", filterByAirline)
            } else if (attribute == "markets") {
                filterMenu.addEventListener("change", filterByMarket)
            }
        });
    };

    function filterByAirline(event) {
        const selectedAirline = event.target.value;
        
        if (selectedAirline) {
            // filterRoutesByAirline(selectedAirline);
            filterValues.airline = selectedAirline;
            filterRoutesByAirlineMarket();
            updateAllCharts();
        }
    };

    function updateAllCharts(){
        updateAirlinePassengersChart(airlinePassengersChart);
        updateAirlinePassengerMilesChart(airlinePassengerMilesChart);
        updateOriginMarketPassengersChart(originMarketPassengersChart);
        updateDestMarketPassengersChart(destMarketPassengersChart);
        updateOriginAirportPassengersChart(originAirportPassengersChart);
        updateDestAirportPassengersChart(destAirportPassengersChart);
        updateRoutePassengersChart(routePassengersChart);
        updateMarketRoutePassengersChart(marketRoutePassengersChart);
    };

    // Markets filter
    function filterByMarket(event) {
        const selectedMarket = event.target.value;

        if (selectedMarket) {
            // filterRoutesByMarket(selectedMarket);
            filterValues.market = selectedMarket;
            filterRoutesByAirlineMarket();
            updateAllCharts();
        }
    };

    function filterRoutesByAirlineMarket() {
        let whereStatement = createWhereStatement(filterValues);
        filterLayer(routesLayer, whereStatement);
    };

    function createWhereStatement(filters) {
        let airlineName = filters.airline;
        let marketName = filters.market;
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

        return whereStatement;
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
    yearMenu.addEventListener("change", changeYear);

    function changeYear(event){
        const selectedYear = event.target.value;
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

            // update charts
            updateAllCharts();
        }
        
    };

    // AIRLINE PASSENGERS PIE CHARTS
    function updateAirlinePassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createAirlinePassengersQuery(routesLayer);
    
        routesLayer.queryFeatures(query).then(function(response){
            let topAirlines = getTopAirlinePassengers(response.features);
            let [labels, data ] = setupAirlineChartData(topAirlines);

            loadPieChart(chart, labels, data);
        });
    };

    function createAirlinePassengersQuery(layer){
        // Create the query for the airline passenger counts pie chart
        const query = layer.createQuery();
        query.outStatistics = [{
            onStatisticField: "pass_" + filterValues.year,
            outStatisticFieldName: "passengers",
            statisticType: "sum"
        }];
    
        let whereStatement = createWhereStatement(filterValues);
        query.where = whereStatement;
    
        query.groupByFieldsForStatistics = [ "unique_carrier_name" ];
        return query;
    };

    function loadPieChart(chart, labels, data){
        // load and format data for pie chart
        chart.plugins = [ChartDataLabels];
        chart.data = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: function(item){
                    const airline = item.chart.data.labels[item.dataIndex];
                    return setChartColor(airline, item.dataIndex);
                },
                borderWidth: "1",
                datalabels: {
                    anchor: 'end',
                    padding: 0,
                    labels: {
                        name: {
                            anchor: "end",
                            align: 'end',
                            formatter: function(value, ctx) {
                                return (
                                    formatAirlineName(ctx.chart.data.labels[ctx.dataIndex]) + " "
                                    + formatNumberLabel(value)
                                );
                            },
                            color: '#eee'
                        }
                    }
                }
            }]
        };
        chart.options = {
            legend: {
                display: false,
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30
                }
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const label = data.labels[tooltipItem.index];
                        const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        return label + ": " + formatNumberLabel(value);
                    }
                }
            }
        };
        chart.update();
    };

    function updateAirlinePassengerMilesChart(chart, filterValues){
        // update the airline passenger miles chart when filters change
        const query = createAirlinePassengerMilesQuery(routesLayer);
    
        routesLayer.queryFeatures(query).then(function(response){
            let topAirlines = getTopAirlinePassengerMiles(response.features);
            let [labels, data ] = setupAirlinePassengerMilesData(topAirlines);

            loadPieChart(chart, labels, data);
        });
    };

    function createAirlinePassengerMilesQuery(layer){
        // Create the query for the airline passenger miles chart
        const query = layer.createQuery();
        query.outStatistics = [
            {
                onStatisticField: "pass_" + filterValues.year,
                outStatisticFieldName: "passengers",
                statisticType: "sum"
            },
            {
                onStatisticField: "distance_miles",
                outStatisticFieldName: "distance",
                statisticType: "avg"
            }
        ];
    
        let whereStatement = createWhereStatement(filterValues);
        query.where = whereStatement;
    
        query.groupByFieldsForStatistics = [ "unique_carrier_name" ];

        return query;
    };

    function formatNumberLabel(val) {
        // Round a value for displaying in a label
        let label = '';

        if (val > 1000000000) {
            label = Math.sign(val)*((Math.abs(val)/1000000000).toFixed(2)) + 'B';
        } else if (val > 1000000) {
            label = Math.sign(val)*((Math.abs(val)/1000000).toFixed(2)) + 'M';
        } else {
            label = val.toLocaleString();
        }

        return label;
    };
    
    function getTopAirlinePassengers(results) {
        // Get the top airlines and their passenger counts
        const topAirlineCount = 6; // The count of Top Airlines to include
        const minimumPercent = 5; // the minimum percent a value needs to be to be included on chart

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
            topAirlines.forEach(function(entry, index, obj) {
                if (entry.passengers < totalPassengers * (minimumPercent / 100.0)) {
                    topAirlines = topAirlines.slice(0, index);
                } else {
                    topAirlinesPassengers += entry.passengers;
                }
            })
            topAirlines.push({airline: 'Others', passengers: totalPassengers - topAirlinesPassengers});
        } else {
            topAirlines = passengerCounts;
        }
        
        return topAirlines;
    };

    function getTopAirlinePassengerMiles(results) {
        // Get the top airlines and their passenger counts
        const topAirlineCount = 6; // The count of Top Airlines to include
        const minimumPercent = 4; // the minimum percent a value needs to be to be included on chart

        // parse the data
        let passengerMiles = [];
        results.forEach(parseResults);
        function parseResults(result){
            let airlinePassengerCount = {};
            airlinePassengerCount.airline = result.attributes["unique_carrier_name"];
            airlinePassengerCount.passengerMiles = result.attributes.passengers * result.attributes.distance;
            passengerMiles.push(airlinePassengerCount);
        };

        passengerMiles.sort(function(a, b) {
            return b.passengerMiles - a.passengerMiles;
        });

        // get the total passengers
        let totalPassengerMiles = 0;
        for (var i=0; i<passengerMiles.length; i++) {
            totalPassengerMiles += passengerMiles[i].passengerMiles;
        }
        
        // get the top airlines plus a number for Others
        let topAirlines = [];
        if (passengerMiles.length > topAirlineCount) {
            topAirlines = passengerMiles.slice(0, topAirlineCount);
            let topAirlinesPassengerMiles = 0;
            topAirlines.forEach(function(entry, index, obj) {
                if (entry.passengerMiles < totalPassengerMiles * (minimumPercent / 100.0)) {
                    topAirlines = topAirlines.slice(0, index);
                } else {
                    topAirlinesPassengerMiles += entry.passengerMiles;
                }
            })
            topAirlines.push({airline: 'Others', passengerMiles: totalPassengerMiles - topAirlinesPassengerMiles});
        } else {
            topAirlines = passengerMiles;
        }
        
        return topAirlines;
    };

    function formatAirlineName(airline) {
        // format airline names for displaying in a label
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
        } else if (airline.length > 15 && airline.split(' ')[0].length > 4) {
            return airline.split(' ')[0];
        } else if (airline.length > 15 && airline.split(' ')[0].length <= 4) {
            return airline.split(' ')[0] + ' ' + airline.split(' ')[1];
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

    function setupAirlinePassengerMilesData(topAirlines) {
        // setup the data for the chart
        let labels = [];
        let data = [];

        for (var i=0; i<topAirlines.length; i++) {
            labels.push(topAirlines[i].airline);
            data.push(topAirlines[i].passengerMiles);
        }

        return [labels, data];
    };

    function setChartColor(airline, index){
        const majorAirlines = {
            "Southwest Airlines Co.": "#FFBF1F",
            "Delta Air Lines Inc.": "#E51937",
            "American Airlines Inc.": "#0075CD",
            "United Air Lines Inc.": "#2EC0FF",
            "JetBlue Airways": "#0033A0",
            "SkyWest Airlines Inc.": "#52FF7D",
            "Alaska Airlines Inc.": "#AE52FF",
            "Spirit Air Lines": "#FFF152",
            "Frontier Airlines Inc.": "#45D960",
            "Republic Airline": "#D97ECD",
            "Others": "#d9d9d9"
        };

        const others = {
            "0": "#99FFF0",
            "1": "#fbb4ae",
            "2": "#b3cde3",
            "3": "#ccebc5",
            "4": "#decbe4",
            "5": "#fed9a6",
            "6": "#ffffcc",
            "7": "#e5d8bd",
            "8": "#fddaec",
            "9": "#d9d9d9",
            "10": "#bc80bd"
        };

        if (airline in majorAirlines) {
            return majorAirlines[airline];
        } else {
            return others[index];
        }
    };

    function loadBarChart(chart, labels, data){
        // load and format data for pie chart
        chart.plugins = [ChartDataLabels];
        chart.data = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: "#00c5ff",
                borderWidth: "1",
                borderColor: "00AAFF",
                datalabels: {
                    labels: {
                        name: {
                            anchor: "end",
                            align: "top",
                            offset: 2,
                            color: "#eee",
                            formatter: function(value, ctx) {
                                return (
                                    formatNumberLabel(value)
                                );
                            },
                        }
                    }
                }
            }]
        };
        chart.options = {
            legend: {
                display: false,
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30
                }
            },
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    display: false,
                    ticks: {
                        min: 0
                    }
                }],
                xAxes: [{
                    ticks: {
                        // fontColor: "#ff0000"
                        callback: function(value, index, values){
                            return formatMarketName(value);
                        }
                    }
                }]
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const label = data.labels[tooltipItem.index];
                        const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        return label + ": " + formatNumberLabel(value);
                    }
                }
            }
        };
        chart.update();
    };

    function updateOriginMarketPassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "origin_market_name");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "origin_market_name", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function updateDestMarketPassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "dest_market_name");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "dest_market_name", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function updateOriginAirportPassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "origin");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "origin", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function updateDestAirportPassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "dest");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "dest", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function updateRoutePassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "origin || ' - ' || dest");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "EXPR_1", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function updateMarketRoutePassengersChart(chart){
        // update the airline passenger chart when filters change
        const query = createPassengerCountsQuery(routesLayer, "origin_market_name || ' - ' || dest_market_name");
    
        routesLayer.queryFeatures(query).then(function(response){
            let topMarkets = getTopNameValue(response.features, "EXPR_1", "passengers");
            let [labels, data ] = setupNameValuesData(topMarkets);

            loadBarChart(chart, labels, data);
        });
    };

    function createPassengerCountsQuery(layer, column){
        // Create the query for the airline passenger counts pie chart
        const query = layer.createQuery();
        query.outStatistics = [{
            onStatisticField: "pass_" + filterValues.year,
            outStatisticFieldName: "passengers",
            statisticType: "sum"
        }];
    
        let whereStatement = createWhereStatement(filterValues);
        query.where = whereStatement;
    
        query.groupByFieldsForStatistics = [column];
        query.orderByFields = ["passengers DESC"];
        return query;
    };

        function createPassengerCountsQuery(layer, column){
        // Create the query for the airline passenger counts pie chart
        const query = layer.createQuery();
        query.outStatistics = [{
            onStatisticField: "pass_" + filterValues.year,
            outStatisticFieldName: "passengers",
            statisticType: "sum"
        }];
    
        let whereStatement = createWhereStatement(filterValues);
        query.where = whereStatement;
    
        query.groupByFieldsForStatistics = [column];
        return query;
    };

    function getTopNameValue(results, nameColumn, valueColumn) {
        // Get the top markets and their passenger counts
        const topCount = 20; // The count of Top Airlines to include
        const minimumPercent = 0; // the minimum percent a value needs to be to be included on chart

        // parse the data
        let values = [];
        results.forEach(parseResults);
        function parseResults(result){
            let value = {};
            value.name = result.attributes[nameColumn];
            value.value = result.attributes[valueColumn];
            values.push(value);
        };

        values.sort(function(a, b) {
            return b.value  - a.value ;
        });

        // get the total passengers
        let totalValue = 0;
        for (var i=0; i<values.length; i++) {
            totalValue += values[i].value ;
        }
        
        // get the top airlines plus a number for Others
        let topValues = [];
        if (values.length > topCount) {
            topValues = values.slice(0, topCount);
            let topValuesSum = 0;
            topValues.forEach(function(entry, index, obj) {
                if (entry.values < totalValue * (minimumPercent / 100.0)) {
                    topValues = topValues.slice(0, index);
                } else {
                    topValuesSum += entry.value ;
                }
            })
            // topValues.push({name: 'Others', value: totalValue - topValuesSum});
        } else {
            topValues = values;
        }
        
        return topValues;
    };

    function setupNameValuesData(topValues) {
        // setup the data for the chart
        let labels = [];
        let data = [];

        for (var i=0; i<topValues.length; i++) {
            labels.push(topValues[i].name);
            data.push(topValues[i].value);
        }

        return [labels, data];
    };

    function formatMarketName(marketName){
        let formattedName = "";
        if (marketName.includes("(Metropolitan Area)")) {
            formattedName = marketName.replace(" (Metropolitan Area)", "").replace(" (Metropolitan Area)", "");
        } else {
            formattedName = marketName;
        }

        return formattedName;
    };
});

function openChart(evt, tabName) {
    // Change the bar chart being displayed when button is clicked
    // Declare all variables
    var i, tabContent, tabLinks;
  
    // Get all elements with class="tabcontent" and hide them
    tabContent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
    }
  
    // Get all elements with class="tablinks" and remove the class "active"
    tabLinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(" active", "");
    }
  
    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
};
