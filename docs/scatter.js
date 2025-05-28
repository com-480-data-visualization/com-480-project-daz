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
  const color = "#0d47a1"
  let data;

  const FEATURE_LABELS = {
    "Climate Index": "Climate Index",
    "happiness_score": "Happiness Score",
    "hdi": "Human Development Index (HDI)",
    "le": "Life Expectancy",
    "eys": "Expected Years of Schooling",
    "mys": "Mean Years of Schooling",
    "gnipc": "Gross National Income per Capita (GNIpc)",
    "Cost of Living Index": "Cost of Living Index",
    "Health Care Index": "Health Care Index",
    "Pollution Index": "Pollution Index",
    "Property Price to Income Ratio": "Property Price to Income Ratio",
    "Purchasing Power Index": "Purchasing Power Index",
    "Quality of Life Index": "Quality of Life Index",
    "Rank": "Rank",
    "Safety Index": "Safety Index",
    "Traffic Commute Time Index": "Traffic Commute Time Index",
    "co2_prod": "CO2 Production",
    "coef_ineq": "Coefficient of Inequality",
    "diff_hdi_phdi": "Difference HDI-PHDI",
    "eys_f": "Expected Years of Schooling (Female)",
    "eys_m": "Expected Years of Schooling (Male)",
    "freedom_to_make_life_choices": "Freedom to Make Life Choices",
    "gdi": "Gender Development Index (GDI)",
    "gdi_group": "GDI Group",
    "gdp_per_capita": "GDP per Capita",
    "generosity": "Generosity",
    "gii": "Gender Inequality Index (GII)",
    "gii_rank": "GII Rank",
    "gni_pc_f": "GNI per Capita (Female)",
    "gni_pc_m": "GNI per Capita (Male)",
    "hdi_f": "HDI (Female)",
    "hdi_m": "HDI (Male)",
    "hdi_rank": "HDI Rank",
    "healthy_life_expectancy": "Healthy Life Expectancy",
    "ihdi": "Inequality-adjusted HDI (IHDI)",
    "ineq_edu": "Inequality in Education",
    "ineq_inc": "Inequality in Income",
    "ineq_le": "Inequality in Life Expectancy",
    "le_f": "Life Expectancy (Female)",
    "le_m": "Life Expectancy (Male)",
    "lfpr_f": "Labor Force Participation Rate (Female)",
    "lfpr_m": "Labor Force Participation Rate (Male)",
    "loss": "Loss",
    "mf": "Male-to-Female Ratio",
    "mmr": "Maternal Mortality Ratio",
    "mys_f": "Mean Years of Schooling (Female)",
    "mys_m": "Mean Years of Schooling (Male)",
    "perceptions_of_corruption": "Perceptions of Corruption",
    "phdi": "Planetary HDI (PHDI)",
    "pop_total": "Total Population",
    "pr_f": "Participation Rate (Female)",
    "pr_m": "Participation Rate (Male)",
    "rankdiff_hdi_phdi": "Rank Difference HDI-PHDI",
    "se_f": "Secondary Education (Female)",
    "se_m": "Secondary Education (Male)",
    "social_support": "Social Support",
    "abr": "Average Birth Rate",
  }

  d3.csv("merged_dataset.csv").then(rawData => {
      data = rawData;

      // Extract unique years and populate the year dropdown
      const years = [...new Set(data.map(d => d.Year))].sort();
      const yearSelect = d3.select("#yearSelectScatter");
      yearSelect.selectAll("option").remove();
      years.forEach(year => {
          yearSelect.append("option").text(year).attr("value", year);
      });

        // Set initial defaults
        const initialYear = "2022";
        const defaultX = "Happiness Score";
        const defaultY = "GDP per capita";

        // Use 2022 if available, otherwise fall back to first year
        const fallbackYear = years.includes(initialYear) ? initialYear : years[0];
        yearSelect.property("value", fallbackYear);

        // Populate X and Y dropdowns for that year
        updateAxisOptions(fallbackYear, defaultX, defaultY);
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

function updateAxisOptions(selectedYear, defaultX = null, defaultY = null) {
    const yearData = data.filter(d => d.Year === selectedYear);
    const validKeys = getNumericKeysForYear(yearData);

    // Update X axis dropdown with first valid key
    const xSelect = d3.select("#xSelectScatter");
    xSelect.selectAll("option").remove();
    validKeys.forEach(key => {
        const label = FEATURE_LABELS[key] || key;
        if (label) {
            xSelect.append("option").text(label).attr("value", key);
        }
    });
    const xValue = validKeys.includes(defaultX) ? defaultX : (validKeys.length > 0 ? validKeys[1] : "");
    xSelect.property("value", xValue);

    // Update Y axis dropdown with second valid key (fallback to first if only one exists)
    const ySelect = d3.select("#ySelectScatter");
    ySelect.selectAll("option").remove();
    validKeys.forEach(key => {
        const label = FEATURE_LABELS[key] || key;
        if (label) {
            ySelect.append("option").text(label).attr("value", key);
        }
    });
    const yValue = validKeys.includes(defaultY) ? defaultY : (validKeys.length >= 2 ? validKeys[2] : xValue);
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

      // X axis:
        const xAxisG = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

        xAxisG.selectAll("path.domain")
        .attr("stroke-width", 2);

        xAxisG.selectAll("line.tick")
        .attr("stroke-width", 2);

        xAxisG.selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "400");   

        // Y axis:
        const yAxisG = svg.append("g")
        .call(d3.axisLeft(y));

        yAxisG.selectAll("path.domain")
        .attr("stroke-width", 2);

        yAxisG.selectAll("line.tick")
        .attr("stroke-width", 2);

        yAxisG.selectAll("text")
        .style("font-size", "14px")
        .style("font-weight", "400");

      svg.selectAll("circle")
          .data(yearData)
          .enter()
          .append("circle")
          .attr("cx", d => x(+d[xKey]))
          .attr("cy", d => y(+d[yKey]))
          .attr("r", 5)
          .attr("fill", "#0d47a1")
          .on("mouseover", (event, d) => {
              tooltip.style("opacity", 1)
                  .html(`<strong>${d.country}</strong><br>${xKey}: ${d[xKey]}<br>${yKey}: ${d[yKey]}`)
                  .style("left", (event.pageX + 5) + "px")
                  .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0));
  }
});