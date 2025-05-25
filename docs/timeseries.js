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

    d3.select("#countriesSelectTimeSeries").on("change", function () {
      const sel = Array.from(this.selectedOptions).map(o => o.value);
    
      // if “Mean” and something else were picked, keep only “Mean”
      if (sel.includes("Mean") && sel.length > 1) {
        d3.select(this)
          .selectAll("option")
          // regular function so `this` is the <option>
          .property("selected", function () {      // ← fixed
            return this.value === "Mean";
          });
      }
    
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
    const countries = feature 
        ? [...new Set(data.filter(d => d[feature] !== "").map(d => d.country))].sort()
        : [...new Set(data.map(d => d.country))].sort();
  
    // 1) add a “Mean” entry at the top:
    countries.unshift("Mean");
  
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
    // 1 ⃣  Grab the current country selections and DROP "Mean"
    const chosen = Array.from(
        d3.select("#countriesSelectTimeSeries").node().selectedOptions
      )
      .map(o => o.value)
      .filter(c => c !== "Mean");          // ← this one line fixes the problem
  
    // 2 ⃣  Build the list of features that actually have data
    const feats = chosen.length
      ? Object.keys(data[0]).filter(k =>
          k !== "Year" &&
          !isNaN(data[0][k]) &&
          data.some(d => chosen.includes(d.country) && d[k] !== "")
        ).sort()
      : Object.keys(data[0]).filter(k =>
          k !== "Year" && !isNaN(data[0][k])
        ).sort();
  
    // 3 ⃣  Populate the <select>
    const sel     = d3.select("#featureSelectTimeSeries");
    const current = sel.property("value");
    sel.selectAll("option").remove();
  
    feats.forEach(f => {
      sel.append("option")
         .attr("value", f)
         .text(f)
         .property("selected", f === current);
    });
  
    // 4 ⃣  If the previously-selected feature vanished, fall back to the first
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
    /* ─── 1. Selections ──────────────────────────────── */
    const rawCountries = Array.from(
      d3.select("#countriesSelectTimeSeries").node().selectedOptions
    ).map(o => o.value);
  
    const meanSelected = rawCountries.includes("Mean");
    const feature      = d3.select("#featureSelectTimeSeries").node().value;
    const minYear      = +d3.select("#timeRangePickerMin").node().value;
    const maxYear      = +d3.select("#timeRangePickerMax").node().value;
  
    /* ─── 2. Row-level filter: year & metric present ─── */
    let rows = data.filter(d =>
      d.Year >= minYear &&
      d.Year <= maxYear &&
      d[feature] !== ""                       // reject missing metric
    );
  
    /* ─── 3. Decide which datasets we need ───────────── */
    let datasets = [];
  
    if (meanSelected) {
      /* 3-A  only ONE dataset: the mean across *all* countries */
      const roll = d3.rollup(
        rows,
        vs => d3.mean(vs, d => +d[feature]),
        d => d.Year
      );
      const meanValues = Array.from(roll, ([Year, val]) => ({ Year, [feature]: val }))
                              .sort((a, b) => a.Year - b.Year);
  
      datasets.push({ country: "Mean", values: meanValues });
    } else {
      /* 3-B  one dataset per selected real country */
      const selected = rawCountries;                        // only real countries here
      rows = rows.filter(d => selected.includes(d.country));
  
      datasets = selected.map(c => {
        const vals = rows.filter(d => d.country === c)
                         .sort((a, b) => a.Year - b.Year);
        return { country: c, values: vals };
      }).filter(ds => ds.values.length > 0);                // drop empty ones
    }
  
    /* ─── 4. Bail if nothing to draw ─────────────────── */
    svg.selectAll("*").remove();
    legendContainer.selectAll("*").remove();
    if (!datasets.length) return;
  
    /* ─── 5. Scales ──────────────────────────────────── */
    const x = d3.scaleLinear().domain([minYear, maxYear]).range([0, width]);
    const y = d3.scaleLinear()
                .domain(d3.extent(datasets.flatMap(ds => ds.values.map(v => +v[feature]))))
                .nice()
                .range([height, 0]);
  
    /* ─── 6. Axes (same styling as before) ───────────── */
    const xAxisG = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
    xAxisG.selectAll("path, line").attr("stroke-width", 2);
    xAxisG.selectAll("text").style("font-size", "14px").style("font-weight", "400");
  
    const yAxisG = svg.append("g").call(d3.axisLeft(y));
    yAxisG.selectAll("path, line").attr("stroke-width", 2);
    yAxisG.selectAll("text").style("font-size", "14px").style("font-weight", "400");
  
    /* ─── 7. Line generator ──────────────────────────── */
    const lineGen = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[feature]));
  
    /* ─── 8. Draw lines + legend with % evolution ───── */
    datasets.forEach(ds => {
      svg.append("path")
        .datum(ds.values)
        .attr("fill", "none")
        .attr("stroke", "#043700")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", ds.country === "Mean" ? "6 4" : null)
        .attr("d", lineGen);
  
      const first = ds.values[0][feature];
      const last  = ds.values[ds.values.length - 1][feature];
      const pct   = ((last - first) / first) * 100;
  
      legendContainer.append("div")
        .style("color", "#043700")
        .text(`${ds.country}: ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`);
    });
  }
  
  
});