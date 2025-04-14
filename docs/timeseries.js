// timeseries.js
document.addEventListener("DOMContentLoaded", function () {
    const svgWidth = 800, svgHeight = 500, margin = { top: 20, right: 100, bottom: 50, left: 70 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#timeSeriesChart")
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const legendContainer = d3.select("#timeSeriesLegend");
  
    let data;
  
    d3.csv("merged_dataset.csv").then(rawData => {
      data = rawData;
      const countries = [...new Set(data.map(d => d.country))].sort();
      const numericKeys = Object.keys(data[0]).filter(k => !isNaN(parseFloat(data[0][k])) && k !== "Year");
  
      numericKeys.forEach(key => {
        d3.select("#featureSelectTimeSeries").append("option").text(key).attr("value", key);
      });
  
      countries.forEach(c => {
        d3.select("#countriesSelectTimeSeries").append("option").text(c).attr("value", c);
      });
  
      d3.selectAll("#featureSelectTimeSeries, #countriesSelectTimeSeries, #timeRangePickerMin, #timeRangePickerMax")
        .on("change", updateChart);
  
      updateChart();
    });
  
    function updateChart() {
        const selectedCountries = Array.from(d3.select("#countriesSelectTimeSeries").node().selectedOptions).map(o => o.value);
        const minYear = +d3.select("#timeRangePickerMin").node().value;
        const maxYear = +d3.select("#timeRangePickerMax").node().value;
      
        d3.select("#timeRangeMinLabel").text(minYear);
        d3.select("#timeRangeMaxLabel").text(maxYear);
      
        console.log("Selected countries:", selectedCountries);
        console.log("Selected year range:", minYear, "-", maxYear);
      
        const countryFilteredData = data.filter(d =>
          +d.Year >= minYear && +d.Year <= maxYear &&
          selectedCountries.includes(d.country)
        );
      
        console.log("Filtered data (by country + year):", countryFilteredData);
      
        const numericKeys = Object.keys(data[0]).filter(k => !isNaN(parseFloat(data[0][k])) && k !== "Year");
      
        const validFeatures = numericKeys.filter(key =>
          countryFilteredData.some(d => d[key] !== "" && !isNaN(d[key]))
        );
      
        console.log("Valid features for selected data:", validFeatures);
      
        const currentFeature = d3.select("#featureSelectTimeSeries").node().value;
      
        // Rebuild feature dropdown
        const featureSelect = d3.select("#featureSelectTimeSeries");
        featureSelect.selectAll("option").remove();
        validFeatures.forEach(key => {
          featureSelect.append("option").text(key).attr("value", key);
        });
      
        // Retain previously selected feature if still valid
        if (validFeatures.includes(currentFeature)) {
          featureSelect.node().value = currentFeature;
        }
      
        const feature = featureSelect.node().value;
        if (!feature) {
          console.warn("No valid feature selected or available.");
          return;
        }
      
        const filteredData = countryFilteredData.filter(d => d[feature] !== "" && !isNaN(d[feature]));
      
        console.log("Final data for plotting (with feature):", filteredData);
      
        const grouped = d3.groups(filteredData, d => d.country);
        console.log("Grouped data:", grouped);
      
        if (filteredData.length === 0) {
          console.warn("No data available to plot.");
          return;
        }
      
        const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, width]);
        const y = d3.scaleLinear()
          .domain(d3.extent(filteredData, d => +d[feature])).nice()
          .range([height, 0]);
      
        svg.selectAll("*").remove();
        legendContainer.selectAll("*").remove();
      
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
        svg.append("g").call(d3.axisLeft(y));
      
        const line = d3.line()
          .x(d => x(+d.Year))
          .y(d => y(+d[feature]));
      
        const color = d3.scaleOrdinal(d3.schemeCategory10);
      
        grouped.forEach(([country, values]) => {
          svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", color(country))
            .attr("stroke-width", 2)
            .attr("d", line);
      
          legendContainer.append("div")
            .style("color", color(country))
            .text(country);
        });
      
        console.log("Chart successfully updated.");
      }
  });
  