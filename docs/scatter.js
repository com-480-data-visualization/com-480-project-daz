// scatterplot.js
document.addEventListener("DOMContentLoaded", function () {
    const svgWidth = 800, svgHeight = 500, margin = { top: 20, right: 20, bottom: 50, left: 70 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#scatterplot")
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const tooltip = d3.select("#tooltipscatter");
  
    let data;
  
    d3.csv("merged_dataset.csv").then(rawData => {
      data = rawData;
    //   console.log("Loaded dataset:", data);
  
      const years = [...new Set(data.map(d => d.Year))].sort();
      years.forEach(year => {
        d3.select("#yearSelectScatter").append("option").text(year).attr("value", year);
      });
  
      const numericKeys = Object.keys(data[0]).filter(k => !isNaN(parseFloat(data[0][k])) && k !== "Year");
    //   console.log("Numeric keys for axis selection:", numericKeys);
  
      numericKeys.forEach(key => {
        d3.select("#xSelectScatter").append("option").text(key).attr("value", key);
        d3.select("#ySelectScatter").append("option").text(key).attr("value", key);
      });
  
      d3.selectAll("#xSelectScatter, #ySelectScatter, #yearSelectScatter").on("change", updateChart);
  
      updateChart();
    });
  
    function updateChart() {
      const xKey = d3.select("#xSelectScatter").node().value;
      const yKey = d3.select("#ySelectScatter").node().value;
      const year = d3.select("#yearSelectScatter").node().value;
  
    //   console.log("Selected X:", xKey, "| Selected Y:", yKey, "| Selected Year:", year);
  
      const yearData = data.filter(d => d.Year === year && d[xKey] && d[yKey]);
  
      if (yearData.length === 0) {
        // console.warn("No data available for selected year and axes.");
        return;
      }
  
    //   console.log("Filtered data for scatter plot:", yearData);
  
      const x = d3.scaleLinear()
        .domain(d3.extent(yearData, d => +d[xKey])).nice()
        .range([0, width]);
  
      const y = d3.scaleLinear()
        .domain(d3.extent(yearData, d => +d[yKey])).nice()
        .range([height, 0]);
  
      svg.selectAll("*").remove();
  
      svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
      svg.append("g").call(d3.axisLeft(y));
  
      svg.selectAll("circle")
        .data(yearData)
        .enter()
        .append("circle")
        .attr("cx", d => x(+d[xKey]))
        .attr("cy", d => y(+d[yKey]))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
          tooltip.style("opacity", 1)
            .html(`<strong>${d.country}</strong><br>${xKey}: ${d[xKey]}<br>${yKey}: ${d[yKey]}`)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    }
  });
  