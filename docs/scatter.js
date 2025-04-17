document.addEventListener("DOMContentLoaded", function () {
  const svgWidth = 800, svgHeight = 500, margin = { top: 20, right: 150, bottom: 50, left: 70 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const svg = d3.select("#scatterplot")
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("#tooltipscatter");
  const color = d3.scaleOrdinal(d3.schemeCategory10);
  let data;

  d3.csv("merged_dataset.csv").then(rawData => {
      data = rawData;

      // Extract unique years and populate the year dropdown
      const years = [...new Set(data.map(d => d.Year))].sort();
      const yearSelect = d3.select("#yearSelectScatter");
      yearSelect.selectAll("option").remove();
      years.forEach(year => {
          yearSelect.append("option").text(year).attr("value", year);
      });

      // Set initial year to the first available year
      const initialYear = years[0];
      yearSelect.property("value", initialYear);

      // Populate X and Y dropdowns based on initial year
      updateAxisOptions(initialYear);

      // Event listeners
      yearSelect.on("change", function () {
          const newYear = this.value;
          updateAxisOptions(newYear);
          updateChart();
      });

      d3.selectAll("#xSelectScatter, #ySelectScatter").on("change", updateChart);

      // Initial chart render
      updateChart();
  });

  function getNumericKeysForYear(yearData) {
      if (yearData.length === 0) return [];
      const keys = Object.keys(yearData[0]).filter(k => k !== "Year");
      const validKeys = [];
      keys.forEach(key => {
          const hasValidData = yearData.some(d => {
              const value = d[key];
              return value !== "" && !isNaN(value) && isFinite(value);
          });
          if (hasValidData) validKeys.push(key);
      });
      return validKeys;
  }

  function updateAxisOptions(selectedYear) {
    const yearData = data.filter(d => d.Year === selectedYear);
    const validKeys = getNumericKeysForYear(yearData);

    // Update X axis dropdown with first valid key
    const xSelect = d3.select("#xSelectScatter");
    xSelect.selectAll("option").remove();
    validKeys.forEach(key => xSelect.append("option").text(key).attr("value", key));
    const xValue = validKeys.length > 0 ? validKeys[1] : "";
    xSelect.property("value", xValue);

    // Update Y axis dropdown with second valid key (fallback to first if only one exists)
    const ySelect = d3.select("#ySelectScatter");
    ySelect.selectAll("option").remove();
    validKeys.forEach(key => ySelect.append("option").text(key).attr("value", key));
    const yValue = validKeys.length >= 2 ? validKeys[2] : xValue;
    ySelect.property("value", yValue);
}

  function updateChart() {
      const xKey = d3.select("#xSelectScatter").node().value;
      const yKey = d3.select("#ySelectScatter").node().value;
      const year = d3.select("#yearSelectScatter").node().value;

      const yearData = data.filter(d => d.Year === year && d[xKey] && d[yKey]);

      if (yearData.length === 0) return;

      const x = d3.scaleLinear()
          .domain(d3.extent(yearData, d => +d[xKey])).nice()
          .range([0, width]);

      const y = d3.scaleLinear()
          .domain(d3.extent(yearData, d => +d[yKey])).nice()
          .range([height, 0]);

      svg.selectAll("*").remove();

      svg.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x));

      svg.append("g")
          .call(d3.axisLeft(y));

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