(function() {
    const indicators = ["hdi", "wealth", "lifeExp", "eys"];
    const indicatorLabels = { 
      hdi: "HDI", 
      wealth: "Income per Capita", 
      lifeExp: "Life Expectancy",
      eys: "Expected Years of Schooling"
    };
    const indicatorColors = { 
      hdi: "#1f77b4", 
      wealth: "#3a5a40", 
      lifeExp: "#a7c957",
      eys: "#fcbf49"
    };
    const histMargin = { top: 20, right: 0, bottom: 50, left: 0 },
          histWidth = 250 - histMargin.left - histMargin.right,
          histHeight = 140 - histMargin.top - histMargin.bottom;
    const gridMargin = { top: 20, right: 10, bottom: 20, left: 10 },
          gridWidth = 150 - gridMargin.left - gridMargin.right,
          gridHeight = 100 - gridMargin.top - gridMargin.bottom;

    d3.csv("HDIdataset.csv", d => {
      return {
        country: d.country,
        year: +d.Year,
        hdi: +d.hdi,
        wealth: +d.gnipc,
        lifeExp: +d.le,
        eys: +d.eys
      };
    }).then(data => {
      const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
      const yearSlider = document.getElementById("yearSlider");
      const yearDisplay = document.getElementById("yearBig");

      yearSlider.min = 0;
      yearSlider.max = years.length - 1;
      yearSlider.step = 1;
      yearSlider.value = 0;
      yearDisplay.innerText = years[0];

      yearSlider.addEventListener("input", function() {
        const index = +this.value;
        const selectedYear = years[index];
        yearDisplay.innerText = selectedYear;
        updateVisualizations(selectedYear);
      });

      updateVisualizations(years[0]);

      function updateVisualizations(selectedYear) {
        const dataForYear = data.filter(d => d.year === selectedYear);
        updateHistograms(dataForYear);
        updateCountryGrid(dataForYear);
      }

      function updateHistograms(dataForYear) {
        const container = d3.select("#distributions");
        container.selectAll("*").remove();
        const tooltip = d3.select("#tooltip");

        indicators.forEach(ind => {
          const svg = container.append("svg")
            .attr("width", histWidth + histMargin.left + histMargin.right)
            .attr("height", histHeight + histMargin.top + histMargin.bottom)
            .append("g")
            .attr("transform", `translate(${histMargin.left},${histMargin.top})`);

          const values = dataForYear.map(d => d[ind]).filter(v => !isNaN(v));
          const x = d3.scaleLinear()
            .domain([d3.min(values), d3.max(values)])
            .range([0, histWidth]);

          const histogram = d3.histogram()
            .domain(x.domain())
            .thresholds(x.ticks(40));
          const bins = histogram(values);

          const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([histHeight, 0]);

          svg.selectAll("rect")
            .data(bins)
            .enter().append("rect")
              .attr("x", d => x(d.x0))
              .attr("y", d => y(d.length))
              .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
              .attr("height", d => histHeight - y(d.length))
              .attr("fill", indicatorColors[ind])
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#ff006e");
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(
                    `<strong>${indicatorLabels[ind]}</strong><br/>` +
                    `Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br/>` +
                    `Count: ${d.length}`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function(event, d) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", indicatorColors[ind]);
                tooltip.transition().duration(500).style("opacity", 0);
            });

          svg.append("g")
            .attr("transform", `translate(0,${histHeight})`)
            .call(d3.axisBottom(x)
            .tickSize(0)
            .tickFormat(""));

          svg.append("rect")
            .attr("x", 0)
            .attr("y", histHeight + 5)
            .attr("width", histWidth)
            .attr("height", 10)
            .attr("fill", indicatorColors[ind]);

          svg.append("text")
            .attr("x", histWidth / 2)
            .attr("y", histHeight + 30)
            .attr("text-anchor", "middle")
            .style("font-size", "17px")
            .style("font-weight", "600")
            .text(indicatorLabels[ind]);
        });
      }

      function updateCountryGrid(dataForYear) {
        const globalMax = {};
        indicators.forEach(ind => {
          globalMax[ind] = d3.max(dataForYear, d => d[ind]);
        });

        const gridContainer = d3.select("#countries-grid");
        gridContainer.selectAll("*").remove();
        const dataSorted = dataForYear.sort((a, b) => d3.ascending(a.country, b.country));

        const countryDivs = gridContainer.selectAll("div.country")
            .data(dataSorted)
            .enter()
            .append("div")
            .attr("class", "country");

        countryDivs.each(function(d) {
          const div = d3.select(this);
          div.append("div")
            .attr("class", "country-name")
            .style("text-align", "center")
            .style("font-weight", "bold")
            .text(d.country);

          const svg = div.append("svg")
            .attr("width", gridWidth + gridMargin.left + gridMargin.right)
            .attr("height", gridHeight + gridMargin.top + gridMargin.bottom)
            .append("g")
            .attr("transform", `translate(${gridMargin.left},${gridMargin.top})`);

          const x = d3.scaleBand()
            .domain(indicators)
            .range([0, gridWidth])
            .padding(0.1);

          const y = d3.scaleLinear()
            .domain([0, 1])
            .range([gridHeight, 0]);

          svg.selectAll("rect")
            .data(indicators)
            .enter().append("rect")
            .attr("x", ind => x(ind))
            .attr("width", x.bandwidth())
            .attr("y", ind => y(d[ind] / globalMax[ind]))
            .attr("height", ind => gridHeight - y(d[ind] / globalMax[ind]))
            .attr("fill", ind => indicatorColors[ind]);

          svg.selectAll("text")
            .data(indicators)
            .enter().append("text")
            .attr("x", ind => x(ind) + x.bandwidth()/2)
            .attr("y", ind => y(d[ind] / globalMax[ind]) - 2)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(ind => {
              const pct = (d[ind] / globalMax[ind]) * 100;
              return pct.toFixed(0) + "%";
            });
        });
      }
    }).catch(error => {
      console.error("Error loading or processing data", error);
    });
})();
