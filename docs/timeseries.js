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

  // defaults:
  const DEFAULT_FEATURE   = "happiness_score";
  const DEFAULT_COUNTRIES = ["Austria"];
  const DEFAULT_START     = 2017;
  const DEFAULT_END       = 2022;

  d3.csv("merged_dataset.csv").then(rawData => {
    data = rawData.map(d => ({ ...d, Year: +d.Year }));

    // 1) build both dropdowns
    updateCountryOptions();
    updateFeatureOptions();

    // 2) set default feature
    d3.select("#featureSelectTimeSeries")
      .property("value", DEFAULT_FEATURE);

    // 3) rebuild countries (now restricted by feature), then set default country
    updateCountryOptions();
    d3.select("#countriesSelectTimeSeries")
      .selectAll("option")
      .property("selected", function() {
        return DEFAULT_COUNTRIES.includes(this.value);
      });

    // 4) rebuild features (now restricted by country)
    updateFeatureOptions();

    // 5) initialize slider for that feature+country
    updateYearSlider();

    //    then override to your default start/end
    d3.select("#timeRangePickerMin").property("value", DEFAULT_START);
    d3.select("#timeRangePickerMax").property("value", DEFAULT_END);
    d3.select("#timeRangeMinLabel").text(DEFAULT_START);
    d3.select("#timeRangeMaxLabel").text(DEFAULT_END);

    // 6) draw
    updateChart();

    // 7) wire up listeners
    d3.select("#featureSelectTimeSeries").on("change", () => {
      updateCountryOptions();
      updateFeatureOptions();
      updateYearSlider();
      updateChart();
    });

    d3.select("#countriesSelectTimeSeries").on("change", () => {
      updateFeatureOptions();
      updateYearSlider();
      updateChart();
    });

    d3.select("#timeRangePickerMin").on("input", () => {
      const min = +d3.select("#timeRangePickerMin").property("value");
      d3.select("#timeRangePickerMax").attr("min", min);
      let max = +d3.select("#timeRangePickerMax").property("value");
      if (max < min) {
        max = min;
        d3.select("#timeRangePickerMax").property("value", max);
        d3.select("#timeRangeMaxLabel").text(max);
      }
      d3.select("#timeRangeMinLabel").text(min);
      updateChart();
    });

    d3.select("#timeRangePickerMax").on("input", () => {
      const max = +d3.select("#timeRangePickerMax").property("value");
      d3.select("#timeRangeMaxLabel").text(max);
      updateChart();
    });
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
    const chosen = Array.from(
      d3.select("#countriesSelectTimeSeries").node().selectedOptions
    ).map(o => o.value);

    const feats = chosen.length
      ? Object.keys(data[0]).filter(k =>
          k !== "Year" &&
          !isNaN(data[0][k]) &&
          data.some(d => chosen.includes(d.country) && d[k] !== "")
        ).sort()
      : Object.keys(data[0]).filter(k =>
          k !== "Year" && !isNaN(data[0][k])
        ).sort();

    const sel = d3.select("#featureSelectTimeSeries");
    const current = sel.property("value");
    sel.selectAll("option").remove();

    feats.forEach(f => {
      sel.append("option")
        .attr("value", f)
        .text(f)
        .property("selected", f === current);
    });

    if (!feats.includes(current)) sel.property("value", feats[0] || "");
  }

  function updateYearSlider() {
    const feat = d3.select("#featureSelectTimeSeries").property("value");
    const chosen = Array.from(
      d3.select("#countriesSelectTimeSeries").node().selectedOptions
    ).map(o => o.value);

    const globalValid = data.filter(d => d[feat] !== "");
    let subset = chosen.length
      ? globalValid.filter(d => chosen.includes(d.country))
      : globalValid;
    if (subset.length === 0) subset = globalValid;

    const years = Array.from(new Set(subset.map(d => d.Year))).sort((a,b) => a - b);
    if (!years.length) return;

    d3.select("#timeRangePickerMin")
      .attr("min",  years[0])
      .attr("max",  years[years.length - 1])
      .property("value", years[0]);

    d3.select("#timeRangePickerMax")
      .attr("min",  years[0])
      .attr("max",  years[years.length - 1])
      .property("value", years[years.length - 1]);

    d3.select("#timeRangeMinLabel").text(years[0]);
    d3.select("#timeRangeMaxLabel").text(years[years.length - 1]);
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
    const xAxisG =svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
    // make axis‐line & ticks thicker
    xAxisG.selectAll("path.domain")
    .attr("stroke-width", 2);
    xAxisG.selectAll("line.tick")
    .attr("stroke-width", 2);

    // set label font‐size & weight
    xAxisG.selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "400");

    const yAxisG = svg.append("g")
        .call(d3.axisLeft(y));
    // thicker line & ticks
    yAxisG.selectAll("path.domain")
    .attr("stroke-width", 2);
    yAxisG.selectAll("line.tick")
    .attr("stroke-width", 2);

    // labels at weight 400
    yAxisG.selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "400");    

    // Lines
    const line = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[feature]));

    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain([...new Set(filtered.map(d => d.country))]);
    const lineColor = "#043700";
    const grouped = d3.group(filtered, d => d.country);
    grouped.forEach((values, country) => {
        svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 3)
            .attr("d", line);

        legendContainer.append("div")
            .style("color", lineColor)
            .text(country);
    });
}
});