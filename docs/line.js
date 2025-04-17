(function() {
  // Configuration and margins
  const margin = { top: 40, right: 150, bottom: 40, left: 60 },
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom,
        flagSize = 20;
  
  // Helper function: attempt to format value as a fixed-point number.
  // If conversion fails, simply return the original value (or a fallback string).
  function formatValue(val) {
    const num = +val; // coerce to number
    return isNaN(num) ? "N/A" : num.toFixed(2);
  }
  
  // Initial selected column from the dropdown
  let selectedColumn = document.getElementById('columnSelect').value;
  let animationTimer;

  // Create the SVG container and a group for chart elements
  const svg = d3.select('#chart-line')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Tooltip element
  const tooltip = d3.select('#tooltip2');

  // Scales
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Line generator uses selectedColumn for the y accessor.
  let line = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d[selectedColumn]))
    .curve(d3.curveLinear);

  // Load CSV and JSON data simultaneously
  Promise.all([
    d3.csv('HDIdataset.csv'),
    d3.json('images/flag-icons-main/country.json')
  ]).then(([csvData, countryJSON]) => {
    // Parse CSV data and cast numbers
    csvData.forEach(d => {
      d.Year = +d.Year;
      d.hdi = +d.hdi;
      d.le = d.le ? +d.le : NaN;
    });
    // Filter to years from 2000 onwards
    csvData = csvData.filter(d => d.Year >= 2000);
    const years = Array.from(new Set(csvData.map(d => d.Year))).sort((a, b) => a - b);
    const minYear = d3.min(years);
    const maxYear = d3.max(years);
    x.domain([minYear, maxYear]);

    // Build flag mapping from the JSON data
    const flagMapping = {};
    countryJSON.forEach(item => {
      flagMapping[item.name] = item.flag_1x1;
    });

    // Group CSV data by country and sort each group by Year.
    let dataByCountry = d3.groups(csvData, d => d.country)
      .map(([country, values]) => {
        values.sort((a, b) => a.Year - b.Year);
        return { country, values, avg: d3.mean(values, d => d[selectedColumn]) };
      });
    // Choose a subset of countries (e.g., poorest and richest)
    dataByCountry.sort((a, b) => a.avg - b.avg);
    const numPoor = Math.floor(15 / 2),
          numRich = 15 - numPoor;
    dataByCountry = dataByCountry.slice(0, numPoor)
      .concat(dataByCountry.slice(-numRich));

    // Set y-domain based on the selected column.
    const yMin = d3.min(dataByCountry, d => d3.min(d.values, v => v[selectedColumn])),
          yMax = d3.max(dataByCountry, d => d3.max(d.values, v => v[selectedColumn]));
    y.domain([Math.max(0, yMin * 0.9), yMax]);
    color.domain(dataByCountry.map(d => d.country));

    // Append axes.
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")));
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y));

    // Create groups for each country.
    const countryGroups = g.selectAll('.country-group')
      .data(dataByCountry)
      .enter()
      .append('g')
      .attr('class', 'country-group');

    // Append an empty path for each country's line.
    const paths = countryGroups.append('path')
      .attr('class', 'country-line')
      .attr('stroke', d => color(d.country))
      .attr('fill', 'none')
      .attr('stroke-width', 4)
      .attr('opacity', 0.2)
      .attr('d', d => line([]));

    // Append labels to the end of each country's line.
    const labels = countryGroups.append('text')
      .attr('class', 'country-label')
      .attr('x', d => x(d.values[d.values.length - 1].Year) + 20)
      .attr('y', d => y(+d.values[d.values.length - 1][selectedColumn]))
      .attr('fill', d => color(d.country))
      .style('opacity', 0);
    labels.each(function(d) {
      const lastData = d.values[d.values.length - 1];
      const label = d3.select(this);
      label.append('tspan')
        .attr('x', x(lastData.Year) + 20)
        .attr('dy', '0em')
        .text(d.country);
      label.append('tspan')
        .attr('x', x(lastData.Year) + 20)
        .attr('dy', '1em')
        .text(formatValue(lastData[selectedColumn]));
    });

    // Append flag images for each country, positioned at the first data point.
    const flags = countryGroups.append('image')
      .attr('class', 'flag')
      .attr('xlink:href', d => {
        const flagPath = flagMapping[d.country];
        return flagPath ? `images/flag-icons-main/${flagPath}` : "images/flag-icons-main/default.svg";
      })
      .attr('width', flagSize)
      .attr('height', flagSize)
      .attr('x', d => x(d.values[0].Year) - flagSize / 2)
      .attr('y', d => y(+d.values[0][selectedColumn]) - flagSize / 2);

    // Returns an array of interpolated data points up to the current year.
    function getInterpolatedData(values, currentYear) {
      const result = values.filter(v => v.Year <= currentYear);
      const next = values.find(v => v.Year > currentYear);
      if (next) {
        if (result.length) {
          const prev = result[result.length - 1];
          const t = (currentYear - prev.Year) / (next.Year - prev.Year);
          result.push({ 
            Year: currentYear, 
            [selectedColumn]: prev[selectedColumn] + t * (next[selectedColumn] - prev[selectedColumn])
          });
        } else {
          result.push({ Year: currentYear, [selectedColumn]: next[selectedColumn] });
        }
      }
      return result;
    }

    // Starts the animation timer to update lines and flags.
    function startAnimation() {
      stopAnimation();
      animationTimer = d3.timer(elapsed => {
        const t = Math.min(elapsed / (200 * (years.length - 1)), 1);
        const currentYear = minYear + t * (maxYear - minYear);
        dataByCountry.forEach(country => {
          country.currentData = getInterpolatedData(country.values, currentYear);
        });
        // Update line paths.
        paths.data(dataByCountry)
          .attr('d', d => line(d.currentData));
        // Update flag positions based on the last interpolated point.
        countryGroups.each(function(d) {
          const lastPoint = d.currentData[d.currentData.length - 1];
          d3.select(this).select('image.flag')
            .attr('x', x(lastPoint.Year) - flagSize / 2)
            .attr('y', y(+lastPoint[selectedColumn]) - flagSize / 2);
        });
        if (t === 1) {
          animationTimer.stop();
        }
      });
    }
    
    // Stops any ongoing animation timer.
    function stopAnimation() {
      if (animationTimer) animationTimer.stop();
    }

    // Tooltip interactivity for the lines.
    paths.on('mouseover', function(event, d) {
      d3.select(this.parentNode).raise();
      d3.selectAll('.country-line').style('opacity', 0.3).style('stroke-width', 4);
      d3.selectAll('image.flag').style('opacity', 0.3);
      d3.select(this)
        .style('opacity', 1)
        .style('stroke-width', 8);
      d3.select(this.parentNode).select('text.country-label')
        .style('opacity', 1);
    })
    .on('mousemove', function(event, d) {
      const [mx] = d3.pointer(event, g.node());
      const curYear = x.invert(mx);
      let interpVal;
      for (let i = 0; i < d.values.length; i++) {
        if (d.values[i].Year > curYear) {
          if (i === 0) {
            interpVal = d.values[i][selectedColumn];
          } else {
            const prev = d.values[i - 1],
                  next = d.values[i],
                  dt = (curYear - prev.Year) / (next.Year - prev.Year);
            interpVal = prev[selectedColumn] + dt * (next[selectedColumn] - prev[selectedColumn]);
          }
          break;
        }
      }
      if (interpVal === undefined) {
        interpVal = d.values[d.values.length - 1][selectedColumn];
      }
      tooltip.style('opacity', 1)
        .html(`<strong>${d.country}</strong><br/>Year: ${Math.round(curYear)}<br/>Value: ${formatValue(interpVal)}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      d3.selectAll('.country-line').style('opacity', 0.2).style('stroke-width', 4);
      d3.selectAll('image.flag').style('opacity', 1);
      d3.selectAll('text.country-label').style('opacity', 0);
      tooltip.style('opacity', 0);
    });

    // Use an Intersection Observer to start/stop the animation based on chart visibility.
    const lineSection = document.querySelector('#chart-line');
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

    // Listen for changes in the select element to update the chart.
    document.getElementById('columnSelect').addEventListener('change', function() {
      stopAnimation();
      selectedColumn = this.value;
      
      // Update y-scale domain based on the new column.
      const newYMin = d3.min(dataByCountry, d => d3.min(d.values, v => v[selectedColumn])),
            newYMax = d3.max(dataByCountry, d => d3.max(d.values, v => v[selectedColumn]));
      y.domain([Math.max(0, newYMin * 0.9), newYMax]);
      g.select('.y-axis')
        .transition()
        .duration(500)
        .call(d3.axisLeft(y));
      
      // Update the line generator for the new metric.
      line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[selectedColumn]))
        .curve(d3.curveLinear);
      
      // Reset paths (so the animation restarts from the beginning).
      countryGroups.selectAll('.country-line').attr('d', line([]));
      // Update label positions and text.
      countryGroups.selectAll('text.country-label')
        .attr('y', d => y(+d.values[d.values.length - 1][selectedColumn]))
        .select('tspan:nth-child(2)')
        .text(d => formatValue(d.values[d.values.length - 1][selectedColumn]));
      // Reset flag positions to the starting position.
      countryGroups.selectAll('image.flag')
        .attr('x', d => x(d.values[0].Year) - flagSize / 2)
        .attr('y', d => y(+d.values[0][selectedColumn]) - flagSize / 2);
      
      // Restart the animation.
      startAnimation();
    });
  })
  .catch(err => console.error(err));
})();
