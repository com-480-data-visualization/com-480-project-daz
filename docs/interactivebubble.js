// interactivebubble.js
// D3 interactive bubble chart with per-group metric defaults & hardcoded year ranges
// ───────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // ── Configuration ────────────────────────────────────────────────
  const groups = {
    group1: ["hdi", "le", "eys", "mys", "gnipc"],
    group2: [
      "Rank",
      "Quality of Life Index",
      "Purchasing Power Index",
      "Safety Index",
      "Health Care Index",
      "Cost of Living Index",
      "Property Price to Income Ratio",
      "Traffic Commute Time Index",
      "Pollution Index",
      "Climate Index"
    ],
    group3: [
      "happiness_score",
      "gdp_per_capita",
      "social_support",
      "healthy_life_expectancy",
      "freedom_to_make_life_choices",
      "generosity",
      "perceptions_of_corruption"
    ]
  };

  // Defaults that actually live in each group's array
  const DEFAULT_SELECTIONS = {
    group1: { x: "hdi",             y: "le",                    r: "eys" },
    group2: { x: "Rank",            y: "Quality of Life Index", r: "Purchasing Power Index" },
    group3: { x: "happiness_score", y: "gdp_per_capita",        r: "social_support" }
  };

  const GROUP_LABELS = {
    group1: "HDI Metrics",
    group2: "Quality of Life Metrics",
    group3: "Happiness Metrics"
  };

  // Hard-coded year ranges per group  - shortcut
  const YEAR_RANGE = {
    group1: { min: 1990, max: 2022 },
    group2: { min: 2015, max: 2024 },
    group3: { min: 2015, max: 2023 }
  };

  const margin = { top: 50, right: 200, bottom: 50, left: 50 },
        width  = 800 - margin.left  - margin.right,
        height = 600 - margin.top   - margin.bottom;

  // SVG container
  const svg = d3.select("#bubbleChart")
    .append("svg")
      .attr("width",  width  + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("#tooltipbubble");
  const titleEl = d3.select("#bubbleTitle");
  let dataGlobal;

  // your HTML’s group selector
  const groupSel = d3.select("#groupSelectBubble");

  // ── Load data & initialize ───────────────────────────────────────
  d3.csv("merged_dataset.csv", d3.autoType)
    .then(raw => {
      // fill missing region_hdi
      const regionMap = {};
      raw.forEach(d => {
        if (d.region_hdi?.trim()) regionMap[d.country] = d.region_hdi;
      });
      raw.forEach(d => {
        if (!d.region_hdi?.trim()) {
          d.region_hdi = regionMap[d.country] || "Unknown";
        }
      });

      dataGlobal = raw.filter(d => Number.isFinite(d.Year));

      buildGroupOptions();
      initMetricSelects();
      initYearSlider();
      attachAllListeners();
      updateTitle();
      updateChart();
    })
    .catch(err => console.error("CSV load failed:", err));

  // ── Build group dropdown ─────────────────────────────────────────
  function buildGroupOptions() {
    groupSel.selectAll("option").remove();
    Object.keys(groups).forEach(key => {
      groupSel.append("option")
        .attr("value", key)
        .text(GROUP_LABELS[key]);
    });
    groupSel.property("value", "group1");
  }

  // ── Get only those metrics actually in your CSV ──────────────────
  function getValidMetrics(groupKey) {
    if (!dataGlobal.length) return [];
    const allCols = Object.keys(dataGlobal[0]);
    return groups[groupKey].filter(m => allCols.includes(m));
  }

  // ── Populate X/Y/R selects & set defaults ───────────────────────
  function initMetricSelects() {
    const key     = groupSel.property("value"),
          metrics = getValidMetrics(key),
          defs    = DEFAULT_SELECTIONS[key];

    ["#xSelect","#ySelect","#rSelect"].forEach(id =>
      d3.select(id).selectAll("option").remove()
    );

    metrics.forEach(m => {
      ["#xSelect","#ySelect","#rSelect"].forEach(id => {
        d3.select(id)
          .append("option")
          .attr("value", m)
          .text(m.toUpperCase());
      });
    });

    // apply defaults (fallback if needed)
    d3.select("#xSelect").property("value",
      metrics.includes(defs.x) ? defs.x : metrics[0] || ""
    );
    d3.select("#ySelect").property("value",
      metrics.includes(defs.y) ? defs.y : metrics[1] || metrics[0] || ""
    );
    d3.select("#rSelect").property("value",
      metrics.includes(defs.r) ? defs.r : metrics[2] || metrics[0] || ""
    );
  }

  // ── Set slider min/max/value & label based on YEAR_RANGE ───────
  function initYearSlider() {
    const key     = groupSel.property("value"),
          range   = YEAR_RANGE[key];

    d3.select("#yearSlider")
      .attr("min", range.min)
      .attr("max", range.max)
      .property("value", Math.min(2022, range.max));  // default thumb

    d3.select("#yearLabel").text(d3.select("#yearSlider").property("value"));
  }

  // ── Hook up all interactivity ───────────────────────────────────
  function attachAllListeners() {
    // group change → rebuild controls + redraw
    groupSel.on("change", () => {
      initMetricSelects();
      initYearSlider();
      updateTitle();
      updateChart();
    });

    // axes / size selects
    ["#xSelect","#ySelect","#rSelect"].forEach(id =>
      d3.select(id).on("change", updateChart)
    );

    // year slider: update label on drag, redraw on release
    d3.select("#yearSlider")
      .on("input", function() {
        d3.select("#yearLabel").text(this.value);
      })
      .on("change", updateChart);
  }

  // ── Update the chart heading ────────────────────────────────────
  function updateTitle() {
      const key = groupSel.property("value");
      const xM = d3.select("#xSelect").property("value"),
      yM = d3.select("#ySelect").property("value"),
      rM = d3.select("#rSelect").property("value");
      titleEl.text(
     `Explore ${GROUP_LABELS[key]} — X: ${xM.toUpperCase()}, Y: ${yM.toUpperCase()}, Size: ${rM.toUpperCase()}`
    );
  }

  // ── Draw or update all bubbles ──────────────────────────────────
  function updateChart() {
    const key      = groupSel.property("value"),
          year     = +d3.select("#yearSlider").property("value"),
          xM       = d3.select("#xSelect").property("value"),
          yM       = d3.select("#ySelect").property("value"),
          rM       = d3.select("#rSelect").property("value"),
          filtered = dataGlobal.filter(d =>
            d.Year === year &&
            Number.isFinite(d[xM]) &&
            Number.isFinite(d[yM]) &&
            Number.isFinite(d[rM])
          );

    if (!filtered.length) {
      svg.selectAll("*").remove();
      svg.append("text")
        .attr("x", width/2).attr("y", height/2)
        .attr("text-anchor","middle")
        .style("font-size","14px")
        .text("No data for that year & metric combo");
      return;
    }
    const n = 10;
    const xScale  = d3.scaleLinear()
                       .domain(d3.extent(filtered, d => d[xM])).nice()
                       .range([0, width]),
          yScale  = d3.scaleLinear()
                       .domain(d3.extent(filtered, d => d[yM])).nice()
                       .range([height, 0]),
          rScale  = d3.scaleSqrt()
                       .domain(d3.extent(filtered, d => d[rM]))
                       .range([5, 40]),
          regions = Array.from(new Set(filtered.map(d => d.region_hdi))),
          color = d3.scaleOrdinal()
          .domain(regions)
          .range(
            d3.range(n).map(i =>
              d3.interpolateYlGn(i / (n - 1))  // t runs from 0 to 1
            )
          );


    svg.selectAll("*").remove();

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append("text")
        .attr("class","axis-label")
        .attr("x", width).attr("y",-10)
        .attr("text-anchor","end")
        .text(xM.toUpperCase());

    // Y axis
    svg.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
        .attr("class","axis-label")
        .attr("x",0).attr("y",10).attr("dy","-1em")
        .attr("text-anchor","start")
        .text(yM.toUpperCase());

    // Chart title
    svg.append("text")
      .attr("class","chart-title")
      .attr("x", width/2).attr("y",-20)
      .attr("text-anchor","middle")
      .style("font-size","16px").style("font-weight","bold")
      .text(`${GROUP_LABELS[key]} — ${year}`);

    // Bubbles
    svg.selectAll(".bubble")
      .data(filtered, d => d.iso3)
      .join("circle")
        .attr("class","bubble")
        .attr("cx", d => xScale(d[xM]))
        .attr("cy", d => yScale(d[yM]))
        .attr("r",  d => rScale(d[rM]))
        .style("fill", d => color(d.region_hdi))
        .style("opacity", 0.8)
        .on("mouseover", (e,d) => {
          tooltip.style("opacity",0.9)
            .html(`
              <strong>${d.country}${d.iso3 ? ` (${d.iso3})` : ""}</strong><br/>
              ${xM.toUpperCase()}: ${d[xM]}<br/>
              ${yM.toUpperCase()}: ${d[yM]}<br/>
              ${rM.toUpperCase()}: ${d[rM]}<br/>
              Region: ${d.region_hdi}
            `)
            .style("left", (e.pageX+10)+"px")
            .style("top",  (e.pageY-28)+"px");
        })
        .on("mouseout", () => tooltip.style("opacity",0));

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${width+20},0)`);
    regions.forEach((reg,i) => {
      const row = legend.append("g").attr("transform", `translate(0,${i*25})`);
      row.append("rect").attr("width",18).attr("height",18).attr("fill", color(reg));
      row.append("text").attr("x",24).attr("y",9).attr("dy","0.35em").text(reg);
    });
  }
});