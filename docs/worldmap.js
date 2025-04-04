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

  // metricsData will store the CSV data by country, then by year.
  const metricsData = {};

  // Default selected interval and metric (will be updated dynamically)
  let selectedStartYear, selectedEndYear;
  let selectedMetric = "hdi"; // default metric

  // Declare colorScale and global min/max variables.
  let colorScale;
  let globalMin, globalMax;

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

  const tooltip = d3.select("#map-tooltip");

  function renderMiniChart(dataPoints, container) {
    // Clear any existing mini chart
    container.select("svg").remove();
    const miniWidth = 200, miniHeight = 100;
    const miniSvg = container.append("svg")
        .attr("width", miniWidth)
        .attr("height", miniHeight);

    // Compute the minimum and maximum year from the data
    const minYear = d3.min(dataPoints, d => d.year);
    const maxYear = d3.max(dataPoints, d => d.year);

    const xScale = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([30, miniWidth - 10]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(dataPoints, d => d.value))
        .range([miniHeight - 20, 10]);

    // Explicitly set tick values for each year in the data
    const xAxis = d3.axisBottom(xScale)
        .tickValues(d3.range(minYear, maxYear + 1))
        .tickFormat(d3.format("d"));

    const yAxis = d3.axisLeft(yScale).ticks(3);

    // Append x-axis with rotated tick labels
    const xAxisGroup = miniSvg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${miniHeight - 20})`)
        .call(xAxis)
        .attr("font-size", "8px");
        

    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(45)")
        .attr("text-anchor", "start")
        .attr("dx", "6")
        .attr("dy", "6");

    // Append y-axis
    miniSvg.append("g")
        .attr("transform", `translate(30, 0)`)
        .call(yAxis)
        .attr("font-size", "8px");

    // Draw the line
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value));

    miniSvg.append("path")
        .datum(dataPoints)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);
  }

  function showTooltip(event, d) {
    tooltip.style("display", "block")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px")
        .html(`<strong>${d.properties.name}</strong><br/>`);

    // Use d.properties.name as the key to access metricsData
    let countryData = metricsData[d.properties.name];
    if (countryData) {
      let dataPoints = [];
      let sum = 0, count = 0;
      for (let yr = selectedStartYear; yr <= selectedEndYear; yr++){
        if (countryData[yr] && countryData[yr][selectedMetric] != null) {
          let value = countryData[yr][selectedMetric];
          dataPoints.push({ year: yr, value: value });
          sum += value;
          count++;
        }
      }
      if (count) {
        const avg = sum / count;
        tooltip.append("div").text("Avg " + selectedMetric.toUpperCase() + ": " + avg.toFixed(3));
      } else {
        tooltip.append("div").text("No data");
      }

      // If only one year is selected, show a message instead of rendering the line chart.
      if (selectedStartYear === selectedEndYear) {
          tooltip.append("div").text("Only one year selected: insufficient data for line chart");
      } else if (dataPoints.length > 1) {
          renderMiniChart(dataPoints, tooltip);
      } else {
          tooltip.append("div").text("No data for selected interval");
      }
    } else {
      tooltip.append("div").text("No data available");
    }

    // Dynamically adjust tooltip size:
    if (tooltip.select("svg").empty()) {
      tooltip.style("min-width", "auto").style("min-height", "auto");
    } else {
      tooltip.style("min-width", "220px").style("min-height", "120px");
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
      .attr("stop-color", d => colorScale(globalMin + d * (globalMax - globalMin)));

    const legendSvg = legend.append("svg")
      .attr("width", w)
      .attr("height", h);

    legendSvg.append("rect")
      .attr("width", w)
      .attr("height", h)
      .style("fill", `url(#${gradientId})`);

    legend.append("div").html(`<span>${globalMin.toFixed(3)}</span><span style="float:right;">${globalMax.toFixed(3)}</span>`);
  }

  function updateMapColors() {
    // Update selected years and metric from dropdowns
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
    csvData.forEach(d => {
      if (!metricsData[d.country]) {
        metricsData[d.country] = {};
      }
      if (!metricsData[d.country][d.Year]) {
        metricsData[d.country][d.Year] = {};
      }
      metricsData[d.country][d.Year]["hdi"] = d.hdi;
    });

    const years = csvData.map(d => d.Year);
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);
    
    // Set default sample interval.
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

    // Compute global min and max for the metric - for now hdi
    const allHDI = csvData.map(d => d.hdi);
    globalMin = d3.min(allHDI);
    globalMax = d3.max(allHDI);
    colorScale = d3.scaleSequential()
      .domain([globalMin, globalMax])
      .interpolator(d3.interpolateGreens);

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