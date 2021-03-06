function init_map() {

    var map = L.map('map').setView([40, 260], 4);

    var mainlayer = L.tileLayer('http://{s}.tiles.mapbox.com/v3/realis.jo4acied/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18
    }).addTo(map);

}

function init_upload() {

    var inputElement = document.getElementById("input");
    inputElement.addEventListener("change", handleFiles, false);
    function handleFiles() {
        var fileList = this.files; /* now you can work with the file list */
        var first_file = fileList[0];
        // Create a new FileReader object
        var reader = new FileReader();
        // Read the file as Text String (not raw binary string)
        reader.readAsText(first_file);
        // Upon loading data successfully, convert it to JSON object
        reader.onload = function() {
            alert("The reading operation is successfully completed.");
            var geoJSON = csvJSON(reader.result);
            alert(JSON.stringify(geoJSON));
            init_function(geoJSON);

        };
    }

}

function cf() {

// (It's CSV, but GitHub Pages only gzip's JSON at the moment.)
    d3.csv("flights-3m.json", function(error, flights) {

        // Various formatters.
        var formatNumber = d3.format(",d"),
                formatChange = d3.format("+,d"),
                formatDate = d3.time.format("%B %d, %Y"),
                formatTime = d3.time.format("%I:%M %p");

        // A nest operator, for grouping the flight list.
        var nestByDate = d3.nest()
                .key(function(d) {
            return d3.time.day(d.date);
        });

        // A little coercion, since the CSV is untyped.
        flights.forEach(function(d, i) {
            d.index = i;
            d.date = parseDate(d.date);
            d.delay = +d.delay;
            d.distance = +d.distance;
        });

        // Create the crossfilter for the relevant dimensions and groups.
        var flight = crossfilter(flights),
                all = flight.groupAll(),
                date = flight.dimension(function(d) {
            return d.date;
        }),
                dates = date.group(d3.time.day),
                hour = flight.dimension(function(d) {
            return d.date.getHours() + d.date.getMinutes() / 60;
        }),
                hours = hour.group(Math.floor),
                delay = flight.dimension(function(d) {
            return Math.max(-60, Math.min(149, d.delay));
        }),
                delays = delay.group(function(d) {
            return Math.floor(d / 10) * 10;
        }),
                distance = flight.dimension(function(d) {
            return Math.min(1999, d.distance);
        }),
                distances = distance.group(function(d) {
            return Math.floor(d / 50) * 50;
        });

        var charts = [
            barChart()
                    .dimension(hour)
                    .group(hours)
                    .x(d3.scale.linear()
                    .domain([0, 24])
                    .rangeRound([0, 10 * 24])),
            barChart()
                    .dimension(delay)
                    .group(delays)
                    .x(d3.scale.linear()
                    .domain([-60, 150])
                    .rangeRound([0, 10 * 21])),
            barChart()
                    .dimension(distance)
                    .group(distances)
                    .x(d3.scale.linear()
                    .domain([0, 2000])
                    .rangeRound([0, 10 * 40])),
            barChart()
                    .dimension(date)
                    .group(dates)
                    .round(d3.time.day.round)
                    .x(d3.time.scale()
                    .domain([new Date(2001, 0, 1), new Date(2001, 3, 1)])
                    .rangeRound([0, 10 * 90]))
                    .filter([new Date(2001, 1, 1), new Date(2001, 2, 1)])

        ];

        // Given our array of charts, which we assume are in the same order as the
        // .chart elements in the DOM, bind the charts to the DOM and render them.
        // We also listen to the chart's brush events to update the display.
        var chart = d3.selectAll(".chart")
                .data(charts)
                .each(function(chart) {
            chart.on("brush", renderAll).on("brushend", renderAll);
        });

        // Render the initial lists.
        var list = d3.selectAll(".list")
                .data([flightList]);

        // Render the total.
        d3.selectAll("#total")
                .text(formatNumber(flight.size()));

        renderAll();

        // Renders the specified chart or list.
        function render(method) {
            d3.select(this).call(method);
        }

        // Whenever the brush moves, re-rendering everything.
        function renderAll() {
            chart.each(render);
            list.each(render);
            d3.select("#active").text(formatNumber(all.value()));
        }

        // Like d3.time.format, but faster.
        function parseDate(d) {
            return new Date(2001,
                    d.substring(0, 2) - 1,
                    d.substring(2, 4),
                    d.substring(4, 6),
                    d.substring(6, 8));
        }

        window.filter = function(filters) {
            filters.forEach(function(d, i) {
                charts[i].filter(d);
            });
            renderAll();
        };

        window.reset = function(i) {
            charts[i].filter(null);
            renderAll();
        };

        function flightList(div) {
            var flightsByDate = nestByDate.entries(date.top(40));

            div.each(function() {
                var date = d3.select(this).selectAll(".date")
                        .data(flightsByDate, function(d) {
                    return d.key;
                });

                date.enter().append("div")
                        .attr("class", "date")
                        .append("div")
                        .attr("class", "day")
                        .text(function(d) {
                    return formatDate(d.values[0].date);
                });

                date.exit().remove();

                var flight = date.order().selectAll(".flight")
                        .data(function(d) {
                    return d.values;
                }, function(d) {
                    return d.index;
                });

                var flightEnter = flight.enter().append("div")
                        .attr("class", "flight");

                flightEnter.append("div")
                        .attr("class", "time")
                        .text(function(d) {
                    return formatTime(d.date);
                });

                flightEnter.append("div")
                        .attr("class", "origin")
                        .text(function(d) {
                    return d.origin;
                });

                flightEnter.append("div")
                        .attr("class", "destination")
                        .text(function(d) {
                    return d.destination;
                });

                flightEnter.append("div")
                        .attr("class", "distance")
                        .text(function(d) {
                    return formatNumber(d.distance) + " mi.";
                });

                flightEnter.append("div")
                        .attr("class", "delay")
                        .classed("early", function(d) {
                    return d.delay < 0;
                })
                        .text(function(d) {
                    return formatChange(d.delay) + " min.";
                });

                flight.exit().remove();

                flight.order();
            });
        }

        function barChart() {
            if (!barChart.id)
                barChart.id = 0;

            var margin = {top: 10, right: 10, bottom: 20, left: 10},
            x,
                    y = d3.scale.linear().range([100, 0]),
                    id = barChart.id++,
                    axis = d3.svg.axis().orient("bottom"),
                    brush = d3.svg.brush(),
                    brushDirty,
                    dimension,
                    group,
                    round;

            function chart(div) {
                var width = x.range()[1],
                        height = y.range()[0];

                y.domain([0, group.top(1)[0].value]);

                div.each(function() {
                    var div = d3.select(this),
                            g = div.select("g");

                    // Create the skeletal chart.
                    if (g.empty()) {
                        div.select(".title").append("a")
                                .attr("href", "javascript:reset(" + id + ")")
                                .attr("class", "reset")
                                .text("reset")
                                .style("display", "none");

                        g = div.append("svg")
                                .attr("width", width + margin.left + margin.right)
                                .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        g.append("clipPath")
                                .attr("id", "clip-" + id)
                                .append("rect")
                                .attr("width", width)
                                .attr("height", height);

                        g.selectAll(".bar")
                                .data(["background", "foreground"])
                                .enter().append("path")
                                .attr("class", function(d) {
                            return d + " bar";
                        })
                                .datum(group.all());

                        g.selectAll(".foreground.bar")
                                .attr("clip-path", "url(#clip-" + id + ")");

                        g.append("g")
                                .attr("class", "axis")
                                .attr("transform", "translate(0," + height + ")")
                                .call(axis);

                        // Initialize the brush component with pretty resize handles.
                        var gBrush = g.append("g").attr("class", "brush").call(brush);
                        gBrush.selectAll("rect").attr("height", height);
                        gBrush.selectAll(".resize").append("path").attr("d", resizePath);
                    }

                    // Only redraw the brush if set externally.
                    if (brushDirty) {
                        brushDirty = false;
                        g.selectAll(".brush").call(brush);
                        div.select(".title a").style("display", brush.empty() ? "none" : null);
                        if (brush.empty()) {
                            g.selectAll("#clip-" + id + " rect")
                                    .attr("x", 0)
                                    .attr("width", width);
                        } else {
                            var extent = brush.extent();
                            g.selectAll("#clip-" + id + " rect")
                                    .attr("x", x(extent[0]))
                                    .attr("width", x(extent[1]) - x(extent[0]));
                        }
                    }

                    g.selectAll(".bar").attr("d", barPath);
                });

                function barPath(groups) {
                    var path = [],
                            i = -1,
                            n = groups.length,
                            d;
                    while (++i < n) {
                        d = groups[i];
                        path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
                    }
                    return path.join("");
                }

                function resizePath(d) {
                    var e = +(d == "e"),
                            x = e ? 1 : -1,
                            y = height / 3;
                    return "M" + (.5 * x) + "," + y
                            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
                            + "V" + (2 * y - 6)
                            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
                            + "Z"
                            + "M" + (2.5 * x) + "," + (y + 8)
                            + "V" + (2 * y - 8)
                            + "M" + (4.5 * x) + "," + (y + 8)
                            + "V" + (2 * y - 8);
                }
            }

            brush.on("brushstart.chart", function() {
                var div = d3.select(this.parentNode.parentNode.parentNode);
                div.select(".title a").style("display", null);
            });

            brush.on("brush.chart", function() {
                var g = d3.select(this.parentNode),
                        extent = brush.extent();
                if (round)
                    g.select(".brush")
                            .call(brush.extent(extent = extent.map(round)))
                            .selectAll(".resize")
                            .style("display", null);
                g.select("#clip-" + id + " rect")
                        .attr("x", x(extent[0]))
                        .attr("width", x(extent[1]) - x(extent[0]));
                dimension.filterRange(extent);
            });

            brush.on("brushend.chart", function() {
                if (brush.empty()) {
                    var div = d3.select(this.parentNode.parentNode.parentNode);
                    div.select(".title a").style("display", "none");
                    div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
                    dimension.filterAll();
                }
            });

            chart.margin = function(_) {
                if (!arguments.length)
                    return margin;
                margin = _;
                return chart;
            };

            chart.x = function(_) {
                if (!arguments.length)
                    return x;
                x = _;
                axis.scale(x);
                brush.x(x);
                return chart;
            };

            chart.y = function(_) {
                if (!arguments.length)
                    return y;
                y = _;
                return chart;
            };

            chart.dimension = function(_) {
                if (!arguments.length)
                    return dimension;
                dimension = _;
                return chart;
            };

            chart.filter = function(_) {
                if (_) {
                    brush.extent(_);
                    dimension.filterRange(_);
                } else {
                    brush.clear();
                    dimension.filterAll();
                }
                brushDirty = true;
                return chart;
            };

            chart.group = function(_) {
                if (!arguments.length)
                    return group;
                group = _;
                return chart;
            };

            chart.round = function(_) {
                if (!arguments.length)
                    return round;
                round = _;
                return chart;
            };

            return d3.rebind(chart, brush, "on");
        }
    });
}

function calendar() {

    var width = 960,
            height = 136,
            cellSize = 17; // cell size

    var day = d3.time.format("%w"),
            week = d3.time.format("%U"),
            percent = d3.format(".1%"),
            format = d3.time.format("%Y-%m-%d");

    var color = d3.scale.quantize()
            .domain([-.05, .05])
            .range(d3.range(11).map(function(d) {
        return "q" + d + "-11";
    }));

    var svg = d3.select("#calendar").selectAll("svg")
            .data(d3.range(1990, 2011))
            .enter().append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "RdYlGn")
            .append("g")
            .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

    svg.append("text")
            .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
            .style("text-anchor", "middle")
            .text(function(d) {
        return d;
    });

    var rect = svg.selectAll(".day")
            .data(function(d) {
        return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
            .enter().append("rect")
            .attr("class", "day")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x", function(d) {
        return week(d) * cellSize;
    })
            .attr("y", function(d) {
        return day(d) * cellSize;
    })
            .datum(format);

    rect.append("title")
            .text(function(d) {
        return d;
    });

    svg.selectAll(".month")
            .data(function(d) {
        return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
    })
            .enter().append("path")
            .attr("class", "month")
            .attr("d", monthPath);

    d3.csv("dji.csv", function(error, csv) {
        var data = d3.nest()
                .key(function(d) {
            return d.Date;
        })
                .rollup(function(d) {
            return (d[0].Close - d[0].Open) / d[0].Open;
        })
                .map(csv);

        rect.filter(function(d) {
            return d in data;
        })
                .attr("class", function(d) {
            return "day " + color(data[d]);
        })
                .select("title")
                .text(function(d) {
            return d + ": " + percent(data[d]);
        });
    });

    function monthPath(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                d0 = +day(t0), w0 = +week(t0),
                d1 = +day(t1), w1 = +week(t1);
        return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
                + "H" + w0 * cellSize + "V" + 7 * cellSize
                + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
                + "H" + (w1 + 1) * cellSize + "V" + 0
                + "H" + (w0 + 1) * cellSize + "Z";
    }

    d3.select(self.frameElement).style("height", "2910px");

}

// This method converts a csv (as Text String) into a well-formed JSON object
function csvJSON(csv) {
    
    var lines = csv.split("\n");
    var result = [];

    // var headers = lines[0].split(",");
    // The headers are modified to conform to naming convention for JSON
    var headers = ["ID", "LABEL", "LAT","LON"];

    for (var i = 1; i < lines.length; i++) {

        var properties = {};

        var currentline = lines[i].split(",");
        for (var j = 0; j < headers.length; j++) {
            properties[headers[j]] = currentline[j];
        }

        var lat_str = properties["LAT"];
        var lon_str = properties["LON"];
        var lat = parseFloat(lat_str.replace("/r", ""));
        var lon = parseFloat(lon_str.replace("/r", ""));

        var record = {
            "type": "Feature",
            "properties": properties,
            "geometry": {
                "type": "Point",
                "coordinates": [lat, lon]
            }
        };

        result.push(record);
        alert(JSON.stringify(record));

    }


    // alert(JSON.stringify(result));
    return result; //JavaScript object

}