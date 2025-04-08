(function() {
  const margin = { top: 40, right: 150, bottom: 40, left: 60 },
        width = 1200 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

  const svg = d3.select("#chart-line")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const tooltip2 = d3.select("#tooltip2");
  
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Load both the CSV and JSON data
  Promise.all([
    d3.csv("HDIdataset.csv"),
    d3.json("images/flag-icons-main/country.json")
  ]).then(([csvData, countryJSON]) => {
    // Build a mapping of country names to flag_1x1 paths.
    // We assume the CSV "country" property matches the JSON "name" property.
    const flagMapping = {};
    countryJSON.forEach(item => {
      flagMapping[item.name] = item.flag_1x1; // e.g. "flags/1x1/af.svg"
    });

    // Process CSV data
    csvData.forEach(d => {
      d.Year = +d.Year;
      d.hdi = +d.hdi;
    });
    // Filter to years >= 2000
    csvData = csvData.filter(d => d.Year >= 2000);

    const years = Array.from(new Set(csvData.map(d => d.Year))).sort((a, b) => a - b);
    const minYear = d3.min(years);
    const maxYear = d3.max(years);

    // Group data by country and compute average HDI per country
    let dataByCountry = d3.groups(csvData, d => d.country)
      .map(([country, values]) => {
        values.sort((a, b) => a.Year - b.Year);
        return { country, values, avg: d3.mean(values, d => d.hdi) };
      });
    // Sort by average and choose a subset of countries (e.g., poorest and richest)
    dataByCountry.sort((a, b) => a.avg - b.avg);
    const numPoor = Math.floor(15 / 2),
          numRich = 15 - numPoor;
    dataByCountry = dataByCountry.slice(0, numPoor)
      .concat(dataByCountry.slice(-numRich));

    // Set domains for scales
    x.domain([minYear, maxYear]);
    const selectedMin = d3.min(dataByCountry, d => d3.min(d.values, v => v.hdi));
    const selectedMax = d3.max(dataByCountry, d => d3.max(d.values, v => v.hdi));
    y.domain([Math.max(0, selectedMin * 0.9), selectedMax]);
    color.domain(dataByCountry.map(d => d.country));

    // Add axes
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")));

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));

    // Define line generator
    const line = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d.hdi))
      .curve(d3.curveLinear);

    // Append a group for each country
    const countryGroups = g.selectAll(".country-group")
      .data(dataByCountry)
      .enter()
      .append("g")
      .attr("class", "country-group");

    // Append the line paths for each country
    const paths = countryGroups.append("path")
      .attr("class", "country-line")
      .attr("stroke", d => color(d.country))
      .attr("fill", "none")
      .attr("stroke-width", 4)
      .attr("opacity", 0.2)
      .attr("d", d => line([]));

    // Append labels at the last data point
    countryGroups.append("text")
      .attr("class", "country-label")
      .attr("x", d => x(d.values[d.values.length - 1].Year) + 20)
      .attr("y", d => y(d.values[d.values.length - 1].hdi))
      .attr("fill", d => color(d.country))
      .style("opacity", 0)
      .each(function(d) {
        // Get the last data point for positioning
        const lastData = d.values[d.values.length - 1];
        const textElem = d3.select(this);
        
        // Append the country name tspan
        textElem.append("tspan")
          .attr("x", x(lastData.Year) + 20)
          .attr("dy", "0em")
          .text(d.country);
        
        // Append the HDI value on a new line
        textElem.append("tspan")
          .attr("x", x(lastData.Year) + 20)
          .attr("dy", "1em")
          .text(lastData.hdi.toFixed(2));
      });

    // Append the flag images. Use a default flag if no mapping is found.
    const flagSize = 20;
    countryGroups.append("image")
      .attr("class", "flag")
      .attr("xlink:href", d => {
        // Look up flag for this country. Prepend base folder path.
        const flagPath = flagMapping[d.country];
        return flagPath ? `images/flag-icons-main/${flagPath}` : "images/flag-icons-main/default.svg";
      })
      .attr("width", flagSize)
      .attr("height", flagSize)
      // Set initial flag position using the first data point
      .attr("x", d => x(d.values[0].Year) - flagSize / 2)
      .attr("y", d => y(d.values[0].hdi) - flagSize / 2);

    const totalDuration = 200 * (years.length - 1);
    let animationTimer;

    function startAnimation() {
      animationTimer = d3.timer(elapsed => {
        const t = Math.min(elapsed / totalDuration, 1);
        const currentYear = minYear + t * (maxYear - minYear);
        // For each country, compute the interpolated data up to the current year
        dataByCountry.forEach(country => {
          country.currentData = getInterpolatedData(country.values, currentYear);
        });
        // Update line paths
        paths.data(dataByCountry)
          .attr("d", d => line(d.currentData));
        // Update flag positions
        countryGroups.each(function(d) {
          const latestPoint = d.currentData[d.currentData.length - 1];
          d3.select(this).select("image.flag")
            .attr("x", x(latestPoint.Year) - flagSize / 2)
            .attr("y", y(latestPoint.hdi) - flagSize / 2);
        });
        if (t === 1) {
          animationTimer.stop();
        }
      });
    }

    function stopAnimation() {
      if (animationTimer) animationTimer.stop();
    }

    d3.select("#reset-animation").on("click", () => {
      stopAnimation();
      g.selectAll(".country-line").attr("d", line([]));
      g.selectAll(".country-label").style("opacity", 0);
      startAnimation();
    });

    function getInterpolatedData(values, currentYear) {
      let result = values.filter(v => v.Year <= currentYear);
      const next = values.find(v => v.Year > currentYear);
      if (next) {
        if (result.length) {
          const prev = result[result.length - 1];
          const t = (currentYear - prev.Year) / (next.Year - prev.Year);
          result.push({ Year: currentYear, hdi: prev.hdi + t * (next.hdi - prev.hdi) });
        } else {
          result.push({ Year: currentYear, hdi: next.hdi });
        }
      }
      return result;
    }

    function resolveLabelCollisions() {
      let labelPositions = [];
      g.selectAll(".country-label").each(function() {
        const textEl = d3.select(this);
        const xVal = +textEl.attr("x");
        const yVal = +textEl.attr("y");
        labelPositions.push({ selection: textEl, x: xVal, y: yVal });
      });
      labelPositions.sort((a, b) => a.y - b.y);
      const labelSpacing = 12;
      for (let i = 1; i < labelPositions.length; i++) {
        const prev = labelPositions[i - 1];
        const curr = labelPositions[i];
        if ((curr.y - prev.y) < labelSpacing) {
          curr.y = prev.y + labelSpacing;
        }
      }
      labelPositions.forEach(pos => {
        pos.selection.attr("y", pos.y);
      });
    }

    // Tooltip on hover over a line
    paths.on("mouseover", function(event, d) {
      // Bring the group to front
      d3.select(this.parentNode).raise();
      
      // Dim all lines and flags
      d3.selectAll(".country-line").style("opacity", 0.4).style("stroke-width", 4);
      d3.selectAll("image.flag").style("opacity", 0.4);
      
      // Highlight the hovered line and its flag
      d3.select(this)
        .style("opacity", 1)
        .style("stroke-width", 8);
      d3.select(this.parentNode).select("image.flag")
        .style("opacity", 1);
      
      // Optionally, show the label
      d3.select(this.parentNode).select("text.country-label").style("opacity", 1);
    })
    .on("mousemove", function(event, d) {
      const [mx] = d3.pointer(event, g.node());
      const currentYear = x.invert(mx);
      let values = d.values;
      let interpolated;
      for (let i = 0; i < values.length; i++) {
        if (values[i].Year > currentYear) {
          if (i === 0) {
            interpolated = values[i].hdi;
          } else {
            const prev = values[i - 1], next = values[i];
            const t = (currentYear - prev.Year) / (next.Year - prev.Year);
            interpolated = prev.hdi + t * (next.hdi - prev.hdi);
          }
          break;
        }
      }
      if (interpolated === undefined) interpolated = values[values.length - 1].hdi;
      tooltip2.style("opacity", 1)
        .html(`<strong>${d.country}</strong><br/>Year: ${Math.round(currentYear)}<br/>HDI: ${interpolated.toFixed(2)}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      // Reset all lines and flags back to their default styles
      d3.selectAll(".country-line").style("opacity", 0.4).style("stroke-width", 4);
      d3.selectAll("image.flag").style("opacity", 1);
      
      // Hide all labels
      d3.selectAll("text.country-label").style("opacity", 0);
      tooltip2.style("opacity", 0);
    });

    // Start and stop animation based on viewport
    const lineSection = document.querySelector("#chart-line");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startAnimation();
        } else {
          stopAnimation();
        }
      });
    }, { threshold: 0.5 });
    observer.observe(lineSection);
  }).catch(error => console.error("Error loading data:", error));
})();
