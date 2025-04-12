const AVAILABLE_FEATURES = [
    "happiness_score",
    "gdp_per_capita",
    "healthy_life_expectancy",
    "social_support"
  ];

  document.addEventListener("DOMContentLoaded", function () {
    let dataGlobal;

    const defaultFeature = "happiness_score";
    const defaultStart = 2015;
    const defaultEnd = 2020;

    d3.csv("merged_dataset.csv", d3.autoType).then(data => {
      dataGlobal = data;
      initFeatureSelect();
      populateYearsAndDefaults();
      attachEventListeners();
      updateChart(); // Initial render
    });

    function initFeatureSelect() {
      const featureSelect = document.getElementById("featureSelect");
      featureSelect.innerHTML = "";
      AVAILABLE_FEATURES.forEach(feat => {
        const opt = document.createElement("option");
        opt.value = feat;
        opt.text = feat;
        featureSelect.appendChild(opt);
      });
      featureSelect.value = defaultFeature;
    }

    function getValidYearsForFeature(feature) {
      const grouped = d3.groups(dataGlobal, d => d.Year);
      return grouped
        .filter(([year, records]) =>
          // Check if at least one record in this year has a valid (finite) number for the feature
          records.some(r => Number.isFinite(r[feature]))
        )
        .map(([year]) => +year)
        .sort((a, b) => a - b);
    }

    function populateYearsAndDefaults() {
      const feature = document.getElementById("featureSelect").value;
      const validYears = getValidYearsForFeature(feature);

      const startYearSelect = d3.select("#startYearSelect");
      startYearSelect.html("");
      startYearSelect.selectAll("option")
        .data(validYears)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

      const defaultStartYear = validYears.includes(defaultStart) ? defaultStart : validYears[0];
      startYearSelect.property("value", defaultStartYear);

      updateEndYearOptions(feature, defaultStartYear);
    }

    function updateEndYearOptions(feature, startYear) {
      const validYears = getValidYearsForFeature(feature).filter(y => y > startYear);
      const endYearSelect = d3.select("#endYearSelect");
      endYearSelect.html("");
      endYearSelect.selectAll("option")
        .data(validYears)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

      const defaultEndYear = validYears.includes(defaultEnd) ? defaultEnd : validYears[validYears.length - 1];
      endYearSelect.property("value", defaultEndYear);
    }

    function attachEventListeners() {
      document.getElementById("featureSelect").addEventListener("change", () => {
        populateYearsAndDefaults();
        updateChart();
      });

      document.getElementById("startYearSelect").addEventListener("change", () => {
        const feature = document.getElementById("featureSelect").value;
        const startYear = +document.getElementById("startYearSelect").value;
        updateEndYearOptions(feature, startYear);
      });

      document.getElementById("update-chart").addEventListener("click", () => {
        updateChart();
      });

      document.getElementById("reset-animation2").addEventListener("click", () => {
        document.getElementById("featureSelect").value = defaultFeature;
        populateYearsAndDefaults();
        updateChart();
      });
    }

    function updateChart() {
      const selectedFeature = document.getElementById("featureSelect").value;
      const startYear = +document.getElementById("startYearSelect").value;
      const endYear = +document.getElementById("endYearSelect").value;

      const filteredData = dataGlobal.filter(d =>
        d.Year >= startYear &&
        d.Year <= endYear &&
        Number.isFinite(d[selectedFeature])
      );

      // Group data by region and then by year, computing mean of the feature
      const groupedData = d3.rollup(
        filteredData,
        v => d3.mean(v, d => d[selectedFeature]),
        d => d.region_happy,
        d => d.Year
      );

      const regionsData = [];
      groupedData.forEach((byYear, region) => {
        const values = [];
        byYear.forEach((avg, year) => {
          values.push({ Year: +year, value: avg });
        });
        values.sort((a, b) => a.Year - b.Year);
        regionsData.push({ region: region, values: values });
      });

      // Remove any previous SVG.
      d3.select("#lineChartRegion").select("svg").remove();

      const margin = { top: 50, right: 250, bottom: 50, left: 60 },
            width = 800 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

      const svg = d3.select("#lineChartRegion")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // X scale: use whole-year tick values.
      const x = d3.scaleLinear()
        .domain([startYear, endYear])
        .range([0, width]);

      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
          d3.axisBottom(x)
            .tickValues(d3.range(startYear, endYear + 1))
            .tickFormat(d3.format("d"))
        );

      // Y scale
      let yMin = d3.min(regionsData, r => d3.min(r.values, d => d.value));
      let yMax = d3.max(regionsData, r => d3.max(r.values, d => d.value));
      if (yMin === undefined) yMin = 0;
      if (yMax === undefined) yMax = 1;
      const y = d3.scaleLinear()
        .domain([yMin - Math.abs(yMin * 0.1), yMax + Math.abs(yMax * 0.1)])
        .range([height, 0]);

      svg.append("g")
        .call(d3.axisLeft(y));

      // Axis labels
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text("Year");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .text(selectedFeature);

      // Define the line generator.
      const line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d.value));

      // Color scale.
      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // For each region, draw the line, animate circles, and add region labels.
      regionsData.forEach(regionData => {
        // Create a sanitized class name for this region (remove whitespace).
        const regionClass = regionData.region.replace(/\s+/g, "");

        // Append the line path.
        const path = svg.append("path")
          .datum(regionData.values)
          .attr("fill", "none")
          .attr("stroke", color(regionData.region))
          .attr("stroke-width", 2)
          .attr("class", "line line-" + regionClass)
          .attr("d", line);

        // Animate the line drawing.
        const totalLength = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        // Add mouse events on the line to highlight it and the corresponding label.
        path.on("mouseover", function () {
            // Increase stroke width.
            d3.select(this).transition().duration(200).attr("stroke-width", 4);
            // Highlight the region label.
            svg.select(".region-label-" + regionClass)
              .transition().duration(200)
              .style("font-weight", "bold")
              .style("fill", "red");
          })
          .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("stroke-width", 2);
            svg.select(".region-label-" + regionClass)
              .transition().duration(200)
              .style("font-weight", "normal")
              .style("fill", color(regionData.region));
          });

        // Append dots with pop-in animation.
        svg.selectAll(".dot-" + regionClass)
          .data(regionData.values)
          .enter()
          .append("circle")
          .attr("class", "dot-" + regionClass)
          .attr("cx", d => x(d.Year))
          .attr("cy", d => y(d.value))
          .attr("r", 0)
          .attr("fill", color(regionData.region))
          .on("mouseover", function (event, d) {
            d3.select("#lineChartRegionTooltip")
              .transition().duration(200)
              .style("opacity", 0.9);
            d3.select("#lineChartRegionTooltip")
              .html(`<strong>Region:</strong> ${regionData.region}<br>
                     <strong>Year:</strong> ${d.Year}<br>
                     <strong>${selectedFeature}:</strong> ${d.value.toFixed(2)}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function () {
            d3.select("#lineChartRegionTooltip")
              .transition().duration(500)
              .style("opacity", 0);
          })
          .transition()
            .delay((d, i) => i * 100)
            .duration(500)
            .attr("r", 3);

        // Append a region label near the last point.
        if (regionData.values.length > 0) {
          const lastPoint = regionData.values[regionData.values.length - 1];
          const label = svg.append("text")
            .attr("x", x(lastPoint.Year) + 5)
            .attr("y", y(lastPoint.value))
            .attr("class", "region-label region-label-" + regionClass)
            .style("fill", color(regionData.region))
            .style("font-size", "12px")
            .style("opacity", 0)
            .text(regionData.region);

          // Optionally adjust label position if it overflows (or simply fade it in).
          label.transition()
            .delay(2200)
            .duration(500)
            .style("opacity", 1);

          // Add mouse events on the label too; when hovered, highlight the line.
          label.on("mouseover", function () {
              d3.select(this).transition().duration(200)
                .style("font-weight", "bold")
                .style("fill", "red");
              path.transition().duration(200).attr("stroke-width", 4);
            })
            .on("mouseout", function () {
              d3.select(this).transition().duration(200)
                .style("font-weight", "normal")
                .style("fill", color(regionData.region));
              path.transition().duration(200).attr("stroke-width", 2);
            });
        }
      });
    }
  });