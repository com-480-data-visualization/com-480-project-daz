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
      data = rawData.map(d => ({...d, Year: +d.Year}));
      
      // Initialize controls
      const years = d3.extent(data, d => d.Year);
      d3.select("#timeRangePickerMin").property("value", years[0]);
      d3.select("#timeRangePickerMax").property("value", years[1]);
      
      updateCountryOptions();
      updateFeatureOptions();
      updateChart();

      // Event listeners
      d3.select("#featureSelectTimeSeries").on("change", () => {
          updateCountryOptions();
          updateChart();
      });

      d3.select("#countriesSelectTimeSeries").on("change", () => {
          updateFeatureOptions();
          updateChart();
      });

      d3.selectAll("#timeRangePickerMin, #timeRangePickerMax").on("change", updateChart);
  });

  function updateCountryOptions() {
      const feature = d3.select("#featureSelectTimeSeries").node().value;
      const countries = feature ? 
          [...new Set(data.filter(d => d[feature] !== "").map(d => d.country))].sort() : 
          [...new Set(data.map(d => d.country))].sort();
      
      const select = d3.select("#countriesSelectTimeSeries");
      const current = Array.from(select.node().selectedOptions).map(o => o.value);
      
      select.selectAll("option").remove();
      countries.forEach(country => {
          select.append("option")
              .text(country)
              .attr("value", country)
              .property("selected", current.includes(country));
      });
  }

  function updateFeatureOptions() {
      const countries = Array.from(d3.select("#countriesSelectTimeSeries").node().selectedOptions).map(o => o.value);
      const features = countries.length > 0 ?
          Object.keys(data[0]).filter(k => 
              !isNaN(data[0][k]) && 
              data.some(d => countries.includes(d.country) && d[k] !== "")
          ).sort() :
          Object.keys(data[0]).filter(k => !isNaN(data[0][k])).sort();
      
      const select = d3.select("#featureSelectTimeSeries");
      const current = select.node().value;
      
      select.selectAll("option").remove();
      features.forEach(feature => {
          select.append("option")
              .text(feature)
              .attr("value", feature)
              .property("selected", feature === current);
      });

      if (!features.includes(current)) select.node().value = features[0] || "";
  }

  function updateChart() {
      const countries = Array.from(d3.select("#countriesSelectTimeSeries").node().selectedOptions).map(o => o.value);
      const feature = d3.select("#featureSelectTimeSeries").node().value;
      const minYear = +d3.select("#timeRangePickerMin").node().value;
      const maxYear = +d3.select("#timeRangePickerMax").node().value;

      const filtered = data.filter(d => 
          countries.includes(d.country) &&
          d.Year >= minYear && 
          d.Year <= maxYear && 
          d[feature] !== ""
      );

      svg.selectAll("*").remove();
      legendContainer.selectAll("*").remove();

      if (!filtered.length) return;

      const x = d3.scaleLinear()
          .domain([minYear, maxYear])
          .range([0, width]);

      const y = d3.scaleLinear()
          .domain(d3.extent(filtered, d => +d[feature]))
          .range([height, 0]);

      // Axes
      svg.append("g")
          .attr("transform", `translate(0,${height})`)
          .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

      svg.append("g")
          .call(d3.axisLeft(y));

      // Lines
      const line = d3.line()
          .x(d => x(d.Year))
          .y(d => y(d[feature]));

      const color = d3.scaleOrdinal(d3.schemeCategory10)
          .domain([...new Set(filtered.map(d => d.country))]);

      const grouped = d3.group(filtered, d => d.country);
      grouped.forEach((values, country) => {
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
  }
});