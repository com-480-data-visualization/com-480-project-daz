(function() {
  // Define dimensions for each small chart panel.
  const chartWidth = 250,
        chartHeight = 150,
        margin = { top: 20, right: 20, bottom: 30, left: 40 };

  // The metrics to display.
  const metrics = ["hdi", "le", "eys", "mys", "gnipc"];
  
  // Human-friendly names for the metrics.
  const metricNames = {
    hdi: "HDI",
    le: "Life Expectancy",
    eys: "Expected Years of Schooling",
    mys: "Mean Years of Schooling",
    gnipc: "GNI per Capita"
  };

  // The three countries for which we want to show columns.
  const countries = ["Libya", "Syrian Arab Republic", "Yemen"];

  // Select the main container.
  const container = d3.select("#chartContainer");

  // Load your CSV data. Adjust the filename/path as needed.
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
  
    // Filter out rows missing a year or any key metric.
    data = data.filter(d => d.Year && metrics.every(m => !isNaN(d[m])));
    
    // Pre-compute the global HDI average for each year (all countries).
    const globalHDIAvg = Array.from(
      d3.rollup(data, v => d3.mean(v, d => d.hdi), d => d.Year)
    )
      .map(([year, avg]) => ({ Year: +year, hdi: avg }))
      .sort((a, b) => a.Year - b.Year);
    
    // For each country in our list, create a column.
    countries.forEach(country => {
      // Filter data for the country.
      const countryData = data.filter(d => d.country === country);
      
      // Create a column container for the country.
      const col = container.append("div")
        .attr("class", "country-column");
      
      // Add a header with the country name.
      col.append("h2").text(country);
      
      // For each metric, create a small chart.
      metrics.forEach(metric => {
        // Create a div for this small chart.
        const chartDiv = col.append("div")
          .attr("class", "small-chart")
          .style("width", chartWidth + "px")
          .style("height", chartHeight + "px");
        
        // Append an SVG into the chart div.
        const svg = chartDiv.append("svg")
          .attr("width", chartWidth)
          .attr("height", chartHeight);
        
        // Create a unique clipPath for content clipping.
        const clipId = "clip-" + country.replace(/\s+/g, "-") + "-" + metric;
        svg.append("defs")
          .append("clipPath")
          .attr("id", clipId)
          .append("rect")
          .attr("x", margin.left)
          .attr("y", margin.top)
          .attr("width", chartWidth - margin.left - margin.right)
          .attr("height", chartHeight - margin.top - margin.bottom);
        
        // Create a group with the clipPath applied.
        const g = svg.append("g")
          .attr("clip-path", "url(#" + clipId + ")");
        
        // Define the x-scale based on Year.
        // For HDI charts this remains computed from the country's data (or can be global if preferred)
        const xDomain = d3.extent(countryData, d => d.Year);
        const xScale = d3.scaleLinear()
          .domain(xDomain)
          .range([margin.left, chartWidth - margin.right]);
        
        // Define the y-scale:
        // For HDI, we want the scale to include both the country's own data and the global average (red line).
        // For other metrics, use the country's own data.
        let yDomain;
        if(metric === "hdi") {
          // Compute the country-specific HDI extent.
          const countryExtent = d3.extent(countryData, d => d.hdi);
          // Also compute global extent for the years visible in this chart.
          const globalExtent = d3.extent(globalHDIAvg.filter(d => d.Year >= xDomain[0] && d.Year <= xDomain[1]), d => d.hdi);
          // Set the domain to the minimum of both and maximum of both.
          yDomain = [Math.min(countryExtent[0], globalExtent[0]), Math.max(countryExtent[1], globalExtent[1])];
        } else {
          yDomain = d3.extent(countryData, d => d[metric]);
        }
        const yScale = d3.scaleLinear()
          .domain(yDomain).nice()
          .range([chartHeight - margin.bottom, margin.top]);
        
        // ---- Add the grey zones (if applicable) ----
        const domainYears = xScale.domain();
        if(country === "Libya") {
          // Grey zone 1: 2014 to 2020.
          let zoneStart1 = 2014, zoneEnd1 = 2020;
          if(zoneEnd1 > domainYears[0] && zoneStart1 < domainYears[1]) {
            let xs1 = Math.max(zoneStart1, domainYears[0]);
            let xe1 = Math.min(zoneEnd1, domainYears[1]);
            g.append("rect")
              .attr("x", xScale(xs1))
              .attr("y", margin.top)
              .attr("width", xScale(xe1) - xScale(xs1))
              .attr("height", chartHeight - margin.top - margin.bottom)
              .attr("fill", "#ccc")
              .attr("opacity", 0.3);
          }
          // Grey zone 2: 15 Feb 2011 – 23 Oct 2011 (approx. 2011.13 to 2011.81).
          let zoneStart2 = 2011.13, zoneEnd2 = 2011.81;
          if(zoneEnd2 > domainYears[0] && zoneStart2 < domainYears[1]) {
            let xs2 = Math.max(zoneStart2, domainYears[0]);
            let xe2 = Math.min(zoneEnd2, domainYears[1]);
            g.append("rect")
              .attr("x", xScale(xs2))
              .attr("y", margin.top)
              .attr("width", xScale(xe2) - xScale(xs2))
              .attr("height", chartHeight - margin.top - margin.bottom)
              .attr("fill", "#aaa")
              .attr("opacity", 0.3);
          }
        } else if(country === "Syrian Arab Republic") {
          // For Syria: grey zone from 2011 to max.
          let zoneStart = 2011,
              zoneEnd = domainYears[1];
          if(zoneEnd > domainYears[0] && zoneStart < domainYears[1]) {
            let xs = Math.max(zoneStart, domainYears[0]);
            let xe = Math.min(zoneEnd, domainYears[1]);
            g.append("rect")
              .attr("x", xScale(xs))
              .attr("y", margin.top)
              .attr("width", xScale(xe) - xScale(xs))
              .attr("height", chartHeight - margin.top - margin.bottom)
              .attr("fill", "#ccc")
              .attr("opacity", 0.3);
          }
        } else if(country === "Yemen") {
          // For Yemen: grey zone from 2015 to max.
          let zoneStart = 2015,
              zoneEnd = domainYears[1];
          if(zoneEnd > domainYears[0] && zoneStart < domainYears[1]) {
            let xs = Math.max(zoneStart, domainYears[0]);
            let xe = Math.min(zoneEnd, domainYears[1]);
            g.append("rect")
              .attr("x", xScale(xs))
              .attr("y", margin.top)
              .attr("width", xScale(xe) - xScale(xs))
              .attr("height", chartHeight - margin.top - margin.bottom)
              .attr("fill", "#ccc")
              .attr("opacity", 0.3);
          }
        }
        // ---- End grey zone addition ----
        
        // Draw the country's metric line inside the clipping group.
        g.append("path")
          .datum(countryData.sort((a, b) => a.Year - b.Year))
          .attr("class", "line")
          .attr("d", d3.line()
            .x(d => xScale(d.Year))
            .y(d => yScale(d[metric]))
            .curve(d3.curveMonotoneX))
          .attr("stroke", "#1f77b4")
          .attr("stroke-width", 2)
          .attr("fill", "none");
        
        // If this is the HDI chart, add a red line for the global HDI average.
        if(metric === "hdi") {
          // Filter the global HDI average data for years within the current x-domain.
          const xDomainCurrent = xScale.domain();
          const globalDataFiltered = globalHDIAvg.filter(d => d.Year >= xDomainCurrent[0] && d.Year <= xDomainCurrent[1]);
          g.append("path")
            .datum(globalDataFiltered)
            .attr("class", "line global-hdi-avg")
            .attr("d", d3.line()
              .x(d => xScale(d.Year))
              .y(d => yScale(d.hdi))
              .curve(d3.curveMonotoneX))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("fill", "none");
        }
        
        // Now add the axes on top of the clipping group.
        svg.append("g")
          .attr("class", "axis x-axis")
          .attr("transform", `translate(0, ${chartHeight - margin.bottom})`)
          .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.format("d")));
        svg.append("g")
          .attr("class", "axis y-axis")
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisLeft(yScale).ticks(4));
        
        // Add a title with the metric name at the top of the SVG.
        svg.append("text")
          .attr("class", "chart-title")
          .attr("x", chartWidth / 2)
          .attr("y", margin.top - 5)
          .attr("text-anchor", "middle")
          .text(metricNames[metric] || metric);
      });
    });
    
  }).catch(error => {
    console.error("Error loading CSV:", error);
  });
})();
