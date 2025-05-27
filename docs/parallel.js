(function() {
    // Dimensions/margins for the chart.
    const margin = { top: 50, right: 150, bottom: 50, left: 50 },
          width = 900 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;
    
    // Create the SVG.
    const svg = d3.select("#lineChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Metrics we want to plot.
    const metrics = ["hdi", "le", "eys", "mys", "gnipc"];
  
    // Fixed colors for each metric.
    const metricColors = {
      hdi: "#003d5b",   // blue
      le:  "#8f2d56",   // green
      eys: "#d1495b",   // orange
      mys: "#0d47a1",   // purple
      gnipc: "#001233"  // red
    };
  
    // Dash styles (to distinguish up to 3 countries).
    const dashStyles = ["", "4,4", "1,6"]; // solid, dashed, dotted
  
    // Prepare scales (we'll set their domains after data loads).
    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
  
    // Append x-axis and y-axis groups.
    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    svg.append("g").attr("class", "y-axis");
  
    // Load the CSV file.
    d3.csv("HDIdataset.csv").then(data => {
  
      // Parse numeric fields.
      data.forEach(d => {
        d.Year = +d.Year;
        d.hdi = +d.hdi;
        d.le = +d.le;
        d.eys = +d.eys;
        d.mys = +d.mys;
        d.gnipc = +d.gnipc;
      });
  
      // Remove any rows missing required fields.
      data = data.filter(d => d.Year && metrics.every(m => !isNaN(d[m])));
  
      // Determine dynamic year range.
      const minYear = d3.min(data, d => d.Year);
      const maxYear = d3.max(data, d => d.Year);
      xScale.domain([minYear, maxYear]);
  
      // Compute global extents for each metric.
      const extents = {};
      metrics.forEach(m => {
        extents[m] = d3.extent(data, d => d[m]);
      });
  
      // Compute normalized metric values (0–1) for each data row.
      data.forEach(d => {
        metrics.forEach(m => {
          d[m + "_norm"] = (d[m] - extents[m][0]) / (extents[m][1] - extents[m][0]);
        });
      });
  
      // Gather unique country names (sorted alphabetically).
      const countries = Array.from(new Set(data.map(d => d.country))).sort();
      console.log("Countries:", countries);
  
      // Populate the dropdowns.
      populateDropdown("#countrySelectLines1", countries);
      populateDropdown("#countrySelectLines2", countries);
      populateDropdown("#countrySelectLines3", countries);
  
      // Set default selections using the first two countries (if available).
      if (countries.includes("Switzerland")) {
        d3.select("#countrySelectLines1").property("value", "Switzerland");
      }
      if (countries.includes("Afghanistan")) {
        d3.select("#countrySelectLines2").property("value", "Afghanistan");
      }
      
      // Listen for dropdown changes.
      d3.selectAll("#countrySelectLines1, #countrySelectLines2, #countrySelectLines3")
        .on("change", updateChart);
  
      // Group data by country.
      const dataByCountry = d3.group(data, d => d.country);
  
      // Initial draw.
      updateChart();
  
      function updateChart() {
        // Retrieve selected countries.
        const selected = [
          d3.select("#countrySelectLines1").property("value"),
          d3.select("#countrySelectLines2").property("value"),
          d3.select("#countrySelectLines3").property("value")
        ].filter(country => country !== "");
  
        console.log("Selected countries:", selected);
  
        // Clear previous lines.
        svg.selectAll(".countryLineGroup").remove();
  
        // Set y-scale for normalized values from 0 to 1.
        yScale.domain([0, 1]);
  
        // For each selected country, draw a line per metric.
        selected.forEach((country, i) => {
          const cData = dataByCountry.get(country);
          if (!cData) {
            console.warn("No data found for country:", country);
            return;
          }
          cData.sort((a, b) => a.Year - b.Year);
          const cGroup = svg.append("g").attr("class", "countryLineGroup");
  
          metrics.forEach(m => {
            const lineGen = d3.line()
              .x(d => xScale(d.Year))
              .y(d => yScale(d[m + "_norm"]))
              .curve(d3.curveMonotoneX);
            cGroup.append("path")
              .datum(cData)
              .attr("class", "line")
              .attr("d", lineGen)
              .style("stroke", metricColors[m])
              .attr("stroke-width", 4)
              .style("stroke-dasharray", dashStyles[i])
              .style("fill", "none");
          });
        });
  
        // Update axes.
        const xAxisG = svg.select(".x-axis")
          .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
        // make axis‐line & ticks thicker
        xAxisG.selectAll("path.domain")
        .attr("stroke-width", 2);
        xAxisG.selectAll("line.tick")
        .attr("stroke-width", 2);

        // set label font‐size & weight
        xAxisG.selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "400");
        
          
        const yAxisG = svg.select(".y-axis")
          .call(d3.axisLeft(yScale));
        // thicker line & ticks
        yAxisG.selectAll("path.domain")
        .attr("stroke-width", 2);
        yAxisG.selectAll("line.tick")
        .attr("stroke-width", 2);

        // labels at weight 400
        yAxisG.selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "400");
  
        // Optional legend.
        svg.selectAll(".legend").remove();
        const legend = svg.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${width + 20}, 0)`);
        metrics.forEach((m, i) => {
          const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
          row.append("rect")
            .attr("fill", metricColors[m])
            .attr("width", 15)
            .attr("height", 15);
          row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(m.toUpperCase());
        });

        // --- Country Legend (new) ---
      // Place it below the metric legend.
      const countryLegend = svg.append("g")
            .attr("class", "country-legend")
            .attr("transform", `translate(${width + 20}, ${metrics.length * 20 + 30})`);
        selected.forEach((country, i) => {
        const legendRow = countryLegend.append("g")
                    .attr("transform", `translate(0, ${i * 20})`);
        // Draw a sample line with the dash style.
        legendRow.append("line")
        .attr("x1", 0)
        .attr("x2", 25)
        .attr("y1", 7)
        .attr("y2", 7)
        .attr("stroke", "#000")
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", dashStyles[i]);
        legendRow.append("text")
        .attr("x", 30)
        .attr("y", 10)
        .text(`Country ${i+1}`);
        });
        

      }
  
      function populateDropdown(selector, countryArray) {
        // Remove any previous options that were added by our code
        // (except for the first default option already in the HTML).
        d3.select(selector).selectAll("option.countryOption").remove();
  
        d3.select(selector)
          .selectAll("option.countryOption")
          .data(countryArray)
          .enter()
          .append("option")
          .attr("class", "countryOption")
          .attr("value", d => d)
          .text(d => d);
      }
    })
    .catch(error => {
      console.error("Error loading CSV:", error);
    });
  })();
  