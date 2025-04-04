(function() {

    document.getElementById("index-select").addEventListener("change", function() {
        // Get the text of the selected option (e.g., "HDI" or "X")
        const selectedText = this.options[this.selectedIndex].text;
        // Update the metric label in the title accordingly.
        document.getElementById("selectedMetricLabel").textContent = selectedText;
      });
    // Mapping from CSV country names to GeoJSON country names
    const mappingCSVtoGeo = {
      "Bolivia (Plurinational State of)": "Bolivia",
      "Brunei Darussalam": "Brunei",
      "Côte d'Ivoire": "Ivory Coast",
      "Congo (Democratic Republic of the)": "Democratic Republic of the Congo",
      "Congo": "Republic of the Congo",
      "Czechia": "Czech Republic",
      "Iran (Islamic Republic of)": "Iran",
      "Korea (Republic of)": "South Korea",
      "Lao People's Democratic Republic": "Laos",
      "Moldova (Republic of)": "Moldova",
      "North Macedonia": "Macedonia",
      "Russian Federation": "Russia",
      "Türkiye": "Turkey",
      "Tanzania (United Republic of)": "United Republic of Tanzania",
      "Venezuela (Bolivarian Republic of)": "Venezuela",
      "Viet Nam": "Vietnam",
      "United States": "USA"
    };
  
    // metricsData will store the CSV data by country, then by year, then by metric.
    const metricsData = {};
  
    // Default selected interval and metric (will be updated dynamically)
    let selectedStartYear, selectedEndYear;
    let selectedMetric = "hdi"; // default index
  
    // Color scale for HDI (adjust domain if necessary)
    const colorScale = d3.scaleSequential().domain([0.9, 0.95]).interpolator(d3.interpolateGreens);
  
    const svg = d3.select("#my_dataviz"),
          width = +svg.attr("width"),
          height = +svg.attr("height");
  
    const mapGroup = svg.append("g");
  
    const projection = d3.geoMercator()
      .scale(100)
      .center([0, 20])
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);
  
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform);
      });
    svg.call(zoom);
  
    d3.select("#zoom-in").on("click", function() {
      svg.transition().call(zoom.scaleBy, 1.5);
    });
    d3.select("#zoom-out").on("click", function() {
      svg.transition().call(zoom.scaleBy, 0.75);
    });
  
    // Use the map-specific tooltip (HTML must include id="map-tooltip")
    const tooltip = d3.select("#map-tooltip");
  
    function showTooltip(event, d) {
      tooltip.style("display", "block")
             .style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px")
             .html(`<strong>${d.properties.name}</strong><br/>`);
      
      const countryKey = d.properties.name;
      const data = metricsData[countryKey];
      if (data) {
        let sum = 0, count = 0;
        for (let yr = selectedStartYear; yr <= selectedEndYear; yr++) {
          if (data[yr] && data[yr][selectedMetric] != null) {
            sum += data[yr][selectedMetric];
            count++;
          }
        }
        if (count) {
          const avg = sum / count;
          tooltip.append("div").text("Avg HDI: " + avg.toFixed(3));
        } else {
          tooltip.append("div").text("No data");
        }
      } else {
        tooltip.append("div").text("No data");
      }
    }
  
    function hideTooltip() {
      tooltip.style("display", "none").html("");
    }
  
    function getColor(value) {
      return value ? colorScale(value) : "#ccc";
    }
  
    function updateLegend() {
      const legend = d3.select("#legend");
      legend.html("");
      const w = 150, h = 10;
      const gradientId = "legend-gradient";
  
      const defs = legend.append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("defs");
  
      const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");
  
      gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .enter()
        .append("stop")
        .attr("offset", d => d)
        .attr("stop-color", d => colorScale(0.9 + d * (0.95 - 0.9)));
  
      const legendSvg = legend.append("svg")
        .attr("width", w)
        .attr("height", h);
  
      legendSvg.append("rect")
        .attr("width", w)
        .attr("height", h)
        .style("fill", `url(#${gradientId})`);
  
      legend.append("div").html(`<span>0.9</span><span style="float:right;">0.95</span>`);
    }
  
    function updateMapColors() {
      // Update selected years and index from dropdowns
      selectedStartYear = +document.getElementById("start-year").value;
      selectedEndYear = +document.getElementById("end-year").value;
      selectedMetric = document.getElementById("index-select").value;
      
      mapGroup.selectAll("path")
        .transition()
        .duration(300)
        .attr("fill", function(d) {
          const countryKey = d.properties.name;
          const data = metricsData[countryKey];
          if (data) {
            let sum = 0, count = 0;
            for (let yr = selectedStartYear; yr <= selectedEndYear; yr++) {
              if (data[yr] && data[yr][selectedMetric] != null) {
                sum += data[yr][selectedMetric];
                count++;
              }
            }
            const avg = count ? sum / count : null;
            return getColor(avg);
          }
          return "#ccc";
        });
    }
  
    // Listen for changes in the dropdowns
    document.getElementById("start-year").addEventListener("change", updateMapColors);
    document.getElementById("end-year").addEventListener("change", updateMapColors);
    document.getElementById("index-select").addEventListener("change", updateMapColors);
  
    // Load both the HDI CSV dataset and the GeoJSON.
    Promise.all([
      d3.csv("HDIdataset.csv"),
      d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    ]).then(function([csvData, geoData]) {
      // Process CSV: Convert numeric fields and apply mapping.
      csvData.forEach(d => {
        d.Year = +d.Year;
        d.hdi = +d.hdi;
        // Use mapping: if a mapping exists, convert the CSV country name
        d.country = mappingCSVtoGeo[d.country] || d.country;
      });
  
      // Build metricsData from the CSV.
      // For each row, store the metric under its year.
      csvData.forEach(d => {
        if (!metricsData[d.country]) {
          metricsData[d.country] = {};
        }
        if (!metricsData[d.country][d.Year]) {
          metricsData[d.country][d.Year] = {};
        }
        // For now, we only have the "hdi" metric.
        metricsData[d.country][d.Year]["hdi"] = d.hdi;
      });
  
      // Determine available years dynamically.
      const years = csvData.map(d => d.Year);
      const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);
      
      // Set default sample interval.
      // For example, use 2012-2015 if available, else min-max.
      if (uniqueYears.includes(2012) && uniqueYears.includes(2015)) {
        selectedStartYear = 2012;
        selectedEndYear = 2015;
      } else {
        selectedStartYear = uniqueYears[0];
        selectedEndYear = uniqueYears[uniqueYears.length - 1];
      }
  
      // Populate the dropdowns for start and end year.
      const startYearSelect = document.getElementById("start-year");
      const endYearSelect = document.getElementById("end-year");
      startYearSelect.innerHTML = "";
      endYearSelect.innerHTML = "";
      uniqueYears.forEach(yr => {
        let option1 = document.createElement("option");
        option1.value = yr;
        option1.textContent = yr;
        startYearSelect.appendChild(option1);
  
        let option2 = document.createElement("option");
        option2.value = yr;
        option2.textContent = yr;
        endYearSelect.appendChild(option2);
      });
      startYearSelect.value = selectedStartYear;
      endYearSelect.value = selectedEndYear;
  
      // Draw the map using GeoJSON.
      mapGroup.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
          const countryKey = d.properties.name;
          const data = metricsData[countryKey];
          if (data) {
            let sum = 0, count = 0;
            for (let yr = selectedStartYear; yr <= selectedEndYear; yr++) {
              if (data[yr] && data[yr]["hdi"] != null) {
                sum += data[yr]["hdi"];
                count++;
              }
            }
            const avg = count ? sum / count : null;
            return getColor(avg);
          }
          return "#ccc";
        })
        .attr("class", "Country")
        .style("stroke", "white")
        .style("opacity", 0.8)
        .on("mouseover", function(event, d) {
          d3.selectAll(".Country").style("opacity", 0.5);
          d3.select(this).style("opacity", 1).style("stroke", "black");
          showTooltip(event, d);
        })
        .on("mousemove", function(event, d) {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseleave", function(event, d) {
          d3.selectAll(".Country").style("opacity", 0.8).style("stroke", "white");
          hideTooltip();
        });
  
      updateLegend();
    });
  })();