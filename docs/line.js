(function() {
    const margin = { top: 40, right: 100, bottom: 40, left: 60 },
          width = 1200 - margin.left - margin.right,
          height = 800 - margin.top - margin.bottom;
  
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
  
    d3.csv("HDIdataset.csv").then(data => {
      data.forEach(d => {
        d.Year = +d.Year;
        d.hdi = +d.hdi;
      });
      data = data.filter(d => d.Year >= 2000);
      const years = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);
      const minYear = d3.min(years);
      const maxYear = d3.max(years);
      
      let dataByCountry = d3.groups(data, d => d.country)
        .map(([country, values]) => {
          values.sort((a, b) => a.Year - b.Year);
          return { country, values, avg: d3.mean(values, d => d.hdi) };
        });
      dataByCountry.sort((a, b) => a.avg - b.avg);
      const numPoor = Math.floor(15 / 2),
            numRich = 15 - numPoor;
      dataByCountry = dataByCountry.slice(0, numPoor)
        .concat(dataByCountry.slice(-numRich));
      
      x.domain([minYear, maxYear]);
      const selectedMin = d3.min(dataByCountry, d => d3.min(d.values, v => v.hdi));
      const selectedMax = d3.max(dataByCountry, d => d3.max(d.values, v => v.hdi));
      y.domain([Math.max(0, selectedMin * 0.9), selectedMax]);
      color.domain(dataByCountry.map(d => d.country));
      
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d")));
      
      g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));
      
      const line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d.hdi))
        .curve(d3.curveLinear);
      
      const countryGroups = g.selectAll(".country-group")
        .data(dataByCountry)
        .enter()
        .append("g")
        .attr("class", "country-group");
      
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
        .datum(d => d.values[d.values.length - 1])
        .attr("x", d => x(d.Year) + 5)
        .attr("y", d => y(d.hdi))
        .attr("fill", d => color(d.country))
        .text(d => d.country)
        .style("opacity", 0);
      
      const totalDuration = 200 * (years.length - 1);
      let animationTimer;
      function startAnimation() {
        animationTimer = d3.timer(elapsed => {
          const t = Math.min(elapsed / totalDuration, 1);
          const currentYear = minYear + t * (maxYear - minYear);
          dataByCountry.forEach(country => {
            country.currentData = getInterpolatedData(country.values, currentYear);
          });
          paths.data(dataByCountry)
            .attr("d", d => line(d.currentData));
          if (t === 1) {
            animationTimer.stop();
            g.selectAll(".country-label")
              .transition().duration(1000)
              .style("opacity", 1)
              .on("end", resolveLabelCollisions);
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
        g.selectAll(".country-label").each(function(d) {
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
        d3.selectAll(".country-line").style("opacity", 0.4);
        d3.select(this).style("opacity", 1).style("stroke-width", 8);
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
        d3.selectAll(".country-line").style("opacity", 0.4).style("stroke-width", 4);
        tooltip2.style("opacity", 0);
      });
      
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
  