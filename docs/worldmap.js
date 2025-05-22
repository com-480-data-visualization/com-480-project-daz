// worldmap.js  – fixed version
document.addEventListener("DOMContentLoaded", function () {
  // ── Configuration ──────────────────────────────────────────────────────────
  const AVAILABLE_METRICS = [
    { key: "hdi",                   label: "HDI",                   col: "hdi" },
    { key: "happiness_score",       label: "Happiness Score",       col: "happiness_score" },
    { key: "quality_of_life_index", label: "Quality of Life Index", col: "Quality of Life Index" }
  ];

  // a map from metricKey → D3 color interpolator
  const METRIC_INTERPOLATORS = {
    hdi:                   d3.interpolateYlOrBr,
    happiness_score:       d3.interpolateYlOrBr,
    quality_of_life_index: d3.interpolateYlOrBr
  };

  // only the cases where CSV ≠ GeoJSON
  const mappingCSVtoGeo = {
    "Bolivia (Plurinational State of)":      "Bolivia",
    "Brunei Darussalam":                      "Brunei",
    "Congo":                                  "Republic of the Congo",
    "Congo (Democratic Republic of the)":     "Democratic Republic of the Congo",
    "Iran (Islamic Republic of)":             "Iran",
    "Korea (Republic of)":                    "South Korea",
    "Lao People's Democratic Republic":       "Laos",
    "Micronesia (Federated States of)":       "Federated States of Micronesia",
    "Moldova (Republic of)":                  "Moldova",
    "Palestine, State of":                    "Palestine",
    "Russian Federation":                     "Russia",
    "Syrian Arab Republic":                   "Syria",
    "Tanzania (United Republic of)":          "Tanzania",
    "Türkiye":                                "Turkey",
    "United States":                          "United States of America",
    "Venezuela (Bolivarian Republic of)":     "Venezuela",
    "Hong Kong":                              "Hong Kong S.A.R. of China",
    "Hong Kong, China (SAR)":                 "Hong Kong S.A.R. of China",

  };

  // ── State ──────────────────────────────────────────────────────────────────
  let dataGlobal,
      metricsData     = {},
      selectedMetric,
      selectedStartYear,
      selectedEndYear,
      colorScale,
      globalMin,
      globalMax,
      geoData;

  // ── D3 & SVG setup ─────────────────────────────────────────────────────────
  const svg      = d3.select("#my_dataviz"),
        width    = +svg.attr("width"),
        height   = +svg.attr("height"),
        mapGroup = svg.append("g"),
        projection = d3.geoMercator()
                       .scale(100)
                       .center([0, 20])
                       .translate([width / 2, height / 2]),
        path      = d3.geoPath().projection(projection),
        tooltip   = d3.select("#map-tooltip");

  // ── Load data & initial render ─────────────────────────────────────────────
  Promise.all([
    d3.csv("merged_dataset.csv", d3.autoType),
    d3.json("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
  ]).then(([csv, geo]) => {
    dataGlobal = csv;
    geoData    = geo;
    buildMetricsData();
    initMetricSelect();
    populateYearsAndDefaults();
    drawMap();
    bindYearListeners();
  });

  // ── Build nested lookup: metricsData[country][year][metricKey] ─────────────
  function buildMetricsData () {
    dataGlobal.forEach(d => {
      const country = mappingCSVtoGeo[d.country] || d.country;
      metricsData[country]             = metricsData[country] || {};
      metricsData[country][d.Year]     = metricsData[country][d.Year] || {};

      AVAILABLE_METRICS.forEach(m => {
        metricsData[country][d.Year][m.key] = d[m.col];
      });
    });
  }

  // ── Get all years with valid data for a metric ─────────────────────────────
  function getValidYearsForMetric(metricKey) {
    const col = AVAILABLE_METRICS.find(m => m.key === metricKey).col;
  
    return d3.groups(dataGlobal, d => d.Year)
      // only keep groups whose metric has at least one valid number
      .filter(([, rows]) => rows.some(r => Number.isFinite(r[col])))
      // extract the year key
      .map(([yr]) => +yr)
      // filter out NaN
      .filter(yr => Number.isFinite(yr))
      // sort ascending
      .sort((a, b) => a - b);
  }

  // ── Populate metric selector, default to HDI ───────────────────────────────
  function initMetricSelect () {
    const sel = document.getElementById("index-select");

    // avoid duplicate <option>s if HTML already has them
    sel.innerHTML = "";

    AVAILABLE_METRICS.forEach(m => {
      const opt  = document.createElement("option");
      opt.value  = m.key;
      opt.text   = m.label;
      sel.appendChild(opt);
    });

    selectedMetric = "hdi";
    sel.value      = selectedMetric;

    sel.addEventListener("change", function () {
      selectedMetric = this.value;
      populateYearsAndDefaults();
      drawMap();
    });
  }

  // ── Populate start/end year selectors and set defaults ────────────────────
  function populateYearsAndDefaults () {
    const years   = getValidYearsForMetric(selectedMetric);
    const startEl = document.getElementById("start-year");
    const endEl   = document.getElementById("end-year");

    startEl.innerHTML = "";
    endEl.innerHTML   = "";

    years.forEach(y => {
      const o1 = document.createElement("option");
      o1.value = o1.text = y;
      startEl.appendChild(o1);

      const o2 = document.createElement("option");
      o2.value = o2.text = y;
      endEl.appendChild(o2);
    });

    selectedStartYear = years.includes(2015) ? 2015 : years[0];
    selectedEndYear   = years.includes(2020) ? 2020 : years[years.length - 1];

    startEl.value = selectedStartYear;
    updateEndYearOptions(selectedStartYear);
    endEl.value   = selectedEndYear;
  }

  // include the start year *and* cope with single-year datasets
  function updateEndYearOptions (startYear) {
    const all  = getValidYearsForMetric(selectedMetric);
    const yrs  = all.filter(y => y >= startYear); //  ← allow same year

    const endEl = document.getElementById("end-year");
    endEl.innerHTML = "";

    yrs.forEach(y => {
      const o   = document.createElement("option");
      o.value   = o.text = y;
      endEl.appendChild(o);
    });

    // guarantee we always have a numeric end year
    selectedEndYear = yrs.includes(selectedEndYear)
        ? selectedEndYear
        : (yrs.length ? yrs[yrs.length - 1] : startYear);

    endEl.value = selectedEndYear;
  }

  // ── Draw or redraw the map ────────────────────────────────────────────────
  function drawMap () {
    computeColorScale();

    const paths = mapGroup.selectAll("path").data(geoData.features);

    paths.enter().append("path")
        .attr("class", "Country")
        .style("stroke", "#6c757d")
        .style("opacity", 0.8)
      .merge(paths)
        .attr("d", path)
        .transition().duration(300)
          .attr("fill", d => countryFill(d))
      .selection()
        .on("mouseover",  showTooltip)
        .on("mousemove",  moveTooltip)
        .on("mouseleave", hideTooltip);

    paths.exit().remove();
    updateLegend();
  }

  function computeColorScale () {
    const metricObj = AVAILABLE_METRICS.find(m => m.key === selectedMetric);
    const col        = metricObj.col;
    const vals       = dataGlobal.map(d => d[col]).filter(Number.isFinite);
  
    globalMin = d3.min(vals);
    globalMax = d3.max(vals);
  
    // pick the interpolator for the current metric (fallback to Greens)
    const interp = METRIC_INTERPOLATORS[selectedMetric] || d3.interpolateGreens;
  
    colorScale = d3.scaleSequential()
                   .domain([globalMin, globalMax])
                   .interpolator(interp);
  }

  function countryFill (d) {
    const data = metricsData[d.properties.name];
    if (!data) return "#ccc";

    let sum = 0, cnt = 0;
    for (let y = selectedStartYear; y <= selectedEndYear; y++) {
      const v = data[y] && data[y][selectedMetric];
      if (Number.isFinite(v)) {
        sum += v;
        cnt++;
      }
    }
    return cnt ? colorScale(sum / cnt) : "#ccc";
  }

  function updateLegend () {
    const legend = d3.select("#legend").html("");
    const w = 200, h = 10, gid = "lg";

    const svgL = legend.append("svg").attr("width", w).attr("height", h);

    const defs = svgL.append("defs");
    const grad = defs.append("linearGradient").attr("id", gid)
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    grad.selectAll("stop")
      .data(d3.range(0, 1.01, 0.1))
      .enter().append("stop")
        .attr("offset", d => d)
        .attr("stop-color", d => colorScale(globalMin + d * (globalMax - globalMin)));

    svgL.append("rect")
        .attr("width", w).attr("height", h)
        .style("fill", `url(#${gid})`);

    legend.append("div")
      .html(`<span>${globalMin.toFixed(2)}</span><span style="float:right">${globalMax.toFixed(2)}</span>`);
  }

  // ── Year selectors ─────────────────────────────────────────────────────────
  function bindYearListeners () {
    document.getElementById("start-year")
      .addEventListener("change", function () {
        selectedStartYear = +this.value;
        updateEndYearOptions(selectedStartYear);
        drawMap();
      });

    document.getElementById("end-year")
      .addEventListener("change", function () {
        selectedEndYear = +this.value;
        drawMap();
      });
  }

  // ── Tooltip helpers (unchanged) ────────────────────────────────────────────
  function renderMiniChart (dataPts, container) {
    container.select("svg").remove();
    const mw = 200, mh = 100;

    const miniSvg = container.append("svg").attr("width", mw).attr("height", mh);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(dataPts, d => d.year))
      .range([30, mw - 10]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(dataPts, d => d.value))
      .range([mh - 20, 10]);

    const xAxis = d3.axisBottom(xScale)
      .tickValues(d3.range(dataPts[0].year, dataPts[dataPts.length - 1].year + 1))
      .tickFormat(d3.format("d"));

    const yAxis = d3.axisLeft(yScale).ticks(3);

    miniSvg.append("g")
      .attr("transform", `translate(0,${mh - 20})`)
      .attr("font-size", "8px")
      .call(xAxis)
      .selectAll("text")
        .attr("transform", "rotate(45)")
        .attr("text-anchor", "start")
        .attr("dx", "6").attr("dy", "6");

    miniSvg.append("g")
      .attr("transform", "translate(30,0)")
      .attr("font-size", "8px")
      .call(yAxis);

    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value));

    miniSvg.append("path")
      .datum(dataPts)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  }

  function showTooltip (event, d) {
    tooltip.style("display", "block")
           .style("left", (event.pageX + 10) + "px")
           .style("top",  (event.pageY - 20) + "px")
           .html(`<strong>${d.properties.name}</strong><br/>`);

    const countryData = metricsData[d.properties.name];
    if (countryData) {
      const pts  = [];
      let total  = 0, count = 0;

      for (let y = selectedStartYear; y <= selectedEndYear; y++) {
        const v = countryData[y] && countryData[y][selectedMetric];
        if (Number.isFinite(v)) {
          pts.push({ year: y, value: v });
          total += v;
          count++;
        }
      }

      if (count) {
        tooltip.append("div")
               .text(`Avg ${selectedMetric.replace(/_/g, " ")}: ${(total / count).toFixed(3)}`);
      }

      if (selectedStartYear === selectedEndYear) {
        tooltip.append("div").text("Only one year selected – no mini-chart.");
      } else if (pts.length > 1) {
        renderMiniChart(pts, tooltip);
      } else {
        tooltip.append("div").text("No data for selected interval");
      }
    } else {
      tooltip.append("div").text("No data available");
    }
  }

  function moveTooltip (event) {
    tooltip.style("left", (event.pageX + 10) + "px")
           .style("top",  (event.pageY - 20) + "px");
  }

  function hideTooltip () {
    tooltip.style("display", "none").html("");
  }
    /* ── 1.  Create a zoom behaviour ────────────────────────────────────────── */
  const zoom = d3.zoom()
  .scaleExtent([1, 8])          // how far the user may zoom in/out
  .on("zoom", (event) => {
    // event.transform gives us the translate / scale matrix
    mapGroup.attr("transform", event.transform);
  });

  /* ── 2.  Register it on the <svg> element ───────────────────────────────── */
  svg.call(zoom);                 // now wheel-scroll + drag will work

  /* ── 3.  Wire the two buttons to the same zoom behaviour ────────────────── */
  const ZOOM_STEP = 1.3;          // factor for every click

  d3.select("#zoom-in")
  .on("click", () => svg.transition().call(zoom.scaleBy,  ZOOM_STEP));

  d3.select("#zoom-out")
  .on("click", () => svg.transition().call(zoom.scaleBy, 1/ZOOM_STEP));

});