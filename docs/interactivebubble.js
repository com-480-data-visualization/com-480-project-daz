(function() {
    const margin = { top: 50, right: 150, bottom: 50, left: 50 },
          width = 800 - margin.left - margin.right,
          height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#bubbleChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const tooltip = d3.select("#tooltipbubble");

    const metrics = ["hdi", "le", "eys", "mys", "gnipc"];

    metrics.forEach(metric => {
      d3.select("#xSelect")
        .append("option")
        .attr("value", metric)
        .text(metric.toUpperCase());

      d3.select("#ySelect")
        .append("option")
        .attr("value", metric)
        .text(metric.toUpperCase());

      d3.select("#rSelect")
        .append("option")
        .attr("value", metric)
        .text(metric.toUpperCase());
    });

    d3.select("#xSelect").property("value", "hdi");
    d3.select("#ySelect").property("value", "le");
    d3.select("#rSelect").property("value", "gnipc");

    d3.csv("HDIdataset.csv").then(data => {

      data.forEach(d => {
        d.Year = +d.Year;
        d.hdi = +d.hdi;
        d.le = +d.le;
        d.eys = +d.eys;
        d.mys = +d.mys;
        d.gnipc = +d.gnipc;
        d.hdi_rank = +d.hdi_rank;
      });

      const uniqueYears = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);
      const minYear = uniqueYears[0];
      const maxYear = uniqueYears[uniqueYears.length - 1];

      d3.select("#yearSlider")
        .attr("min", minYear)
        .attr("max", maxYear)
        .property("value", maxYear);
      d3.select("#yearLabel").text(maxYear);

      d3.select("#yearSlider").on("input", function() {
        d3.select("#yearLabel").text(this.value);
        updateChart();
      });
      d3.select("#xSelect").on("change", updateChart);
      d3.select("#ySelect").on("change", updateChart);
      d3.select("#rSelect").on("change", updateChart);

      function updateChart() {
        const selectedYear = +d3.select("#yearSlider").property("value"),
              selectedX = d3.select("#xSelect").property("value"),
              selectedY = d3.select("#ySelect").property("value"),
              selectedR = d3.select("#rSelect").property("value");

        const filteredData = data.filter(d => d.Year === selectedYear);

        if (filteredData.length === 0) {
          console.error("No data found for the selected year: " + selectedYear);
          svg.selectAll("*").remove();
          return;
        }

        const xExtent = d3.extent(filteredData, d => d[selectedX]),
              yExtent = d3.extent(filteredData, d => d[selectedY]),
              rExtent = d3.extent(filteredData, d => d[selectedR]);

        const xScale = d3.scaleLinear()
          .domain([xExtent[0], xExtent[1]])
          .nice()
          .range([0, width]);

        const yScale = d3.scaleLinear()
          .domain([yExtent[0], yExtent[1]])
          .nice()
          .range([height, 0]);

        const rScale = d3.scaleSqrt()
          .domain([rExtent[0], rExtent[1]])
          .range([5, 40]);

        const regions = Array.from(new Set(filteredData.map(d => d.region)));
        const color = d3.scaleOrdinal()
          .domain(regions)
          .range(d3.schemeCategory10);

        svg.selectAll(".axis").remove();
        svg.selectAll(".bubble").remove();
        svg.selectAll(".chart-title").remove();
        svg.selectAll(".legend").remove();

        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
          .append("text")
          .attr("class", "axis-label")
          .attr("x", width)
          .attr("y", -10)
          .attr("fill", "#000")
          .attr("text-anchor", "end")
          .text(selectedX.toUpperCase());

        const yAxis = d3.axisLeft(yScale);
        svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr("class", "axis-label")
          .attr("x", 0)
          .attr("y", 10)
          .attr("dy", "-1em")
          .attr("fill", "#000")
          .attr("text-anchor", "start")
          .text(selectedY.toUpperCase());

        svg.append("text")
          .attr("class", "chart-title")
          .attr("x", width / 2)
          .attr("y", -20)
          .attr("text-anchor", "middle")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text("HDI Metrics Bubble Chart - " + selectedYear);

        const bubbles = svg.selectAll(".bubble")
          .data(filteredData, d => d.iso3);

        bubbles.enter()
          .append("circle")
          .attr("class", "bubble")
          .attr("cx", d => xScale(d[selectedX]))
          .attr("cy", d => yScale(d[selectedY]))
          .attr("r", d => rScale(d[selectedR]))
          .style("fill", d => color(d.region))
          .style("opacity", 0.8)
          .on("mouseover", function(event, d) {
            tooltip.style("opacity", 0.9)
              .html("<strong>" + d.country + " (" + d.iso3 + ")</strong><br/>" +
                    selectedX.toUpperCase() + ": " + d[selectedX] + "<br/>" +
                    selectedY.toUpperCase() + ": " + d[selectedY] + "<br/>" +
                    selectedR.toUpperCase() + ": " + d[selectedR] + "<br/>" +
                    "Region: " + d.region);
          })
          .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            tooltip.style("opacity", 0);
          });

        bubbles.transition()
          .duration(800)
          .attr("cx", d => xScale(d[selectedX]))
          .attr("cy", d => yScale(d[selectedY]))
          .attr("r", d => rScale(d[selectedR]));

        bubbles.exit().remove();

        const legend = svg.append("g")
          .attr("class", "legend")
          .attr("transform", "translate(" + (width + 20) + ",0)");

        regions.forEach((region, i) => {
          const legendRow = legend.append("g")
            .attr("transform", "translate(0," + (i * 25) + ")");
          legendRow.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", color(region));
          legendRow.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .attr("font-size", "12px")
            .text(region);
        });
      }

      updateChart();
    });
  })();
