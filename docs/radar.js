document.addEventListener("DOMContentLoaded", () => {
  
  // print something to test
  console.log("Radar chart loaded");
  // ── Configuration for metric groups ────────────────────────────────────────
  const groups = {
    group1: ["hdi", "gnipc", "le", "eys", "mys"],
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

  const groupLabels = {
    group1: "HDI Metrics",
    group2: "Quality of Life Metrics",
    group3: "Happiness Metrics"
  };
  const colours = ["#2196f3", "#7371fc"];
  const width  = 600,
        height = 600,
        margin = { top: 100, right: 85, bottom: 85, left: 85 },
        radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.right);

  const svg = d3.select("#chart")
    .append("svg")
      .attr("width",  width)
      .attr("height", height);

  const defs = svg.append("defs");
  defs.append("filter").attr("id", "glow")
    .append("feGaussianBlur").attr("stdDeviation", 2.5).attr("result", "coloredBlur")
    .append("feMerge")
      .append("feMergeNode").attr("in", "coloredBlur")
    .append("feMergeNode").attr("in", "SourceGraphic");

  const g = svg.append("g")
    .attr("transform", `translate(${width/2},${height/2})`);

  const tooltip = d3.select("#tooltip");
  let dataGlobalRadar;

  d3.csv("merged_dataset.csv", d3.autoType).then(raw => {
    dataGlobalRadar = raw.filter(d => Number.isFinite(d.Year));
    initCountrySelects();
    initGroupSelect();
    initYearSelect();
    attachEventListeners();
    updateChart();
  });

  function initCountrySelects() {
    const countries = Array.from(new Set(dataGlobalRadar.map(d => d.country))).sort();
    const sel1 = d3.select("#countrySelect1");
    const sel2 = d3.select("#countrySelect2");

    countries.forEach(c => {
      sel1.append("option").attr("value", c).text(c);
      sel2.append("option").attr("value", c).text(c);
    });

    sel1.property("value", "Norway");
    sel2.property("value", "Afghanistan");
  }

  function initGroupSelect() {
    const sel = d3.select("#groupSelectRadar");
    sel.html("");
    Object.keys(groups).forEach(key => {
      sel.append("option")
         .attr("value", key)
         .text(groupLabels[key]);       // ← use your mapping here
    });
    sel.property("value", "group1");
  }

  function getValidYearsForGroup(groupKey) {
    const axes = groups[groupKey];
    return Array.from(
      d3.rollup(
        dataGlobalRadar,
        rows => axes.some(axis => rows.some(r => Number.isFinite(r[axis]))),
        d => d.Year
      )
      .entries()
      .filter(([year, ok]) => ok)
      .map(([year]) => +year)
    ).sort((a,b)=>a-b);
  }

  function initYearSelect() {
    const grp   = d3.select("#groupSelectRadar").property("value");
    const years = getValidYearsForGroup(grp);
    const yearSel = d3.select("#yearSelectRadar");

    yearSel.html("");
    yearSel.selectAll("option")
      .data(years)
      .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

    const defaultYear = years.includes(2022) ? 2022 : years[years.length - 1];
    yearSel.property("value", defaultYear);
  }

  function attachEventListeners() {
    ["countrySelect1","countrySelect2","groupSelectRadar","yearSelectRadar"]
      .forEach(id => {
        d3.select("#" + id)
          .on("change", function() {
            const val = d3.select(this).property("value");
            console.log(`${id} changed →`, val);
            if (id === "groupSelectRadar") initYearSelect();
            updateChart();
          });
      });
  }

  function updateChart() {
    const c1   = d3.select("#countrySelect1").property("value");
    const c2   = d3.select("#countrySelect2").property("value");
    const grp  = d3.select("#groupSelectRadar").property("value");
    const yr   = +d3.select("#yearSelectRadar").property("value");

    console.log({ country1: c1, country2: c2, group: grp, year: yr });
    console.log("axes:", groups[grp]);
    console.log("sample row keys:", Object.keys(dataGlobalRadar[0]));

    const allAxes   = groups[grp];
    const totalAxes = allAxes.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    let data = dataGlobalRadar.filter(d => d.Year === yr);
    const maxPerAxis = {};
    allAxes.forEach(axis => {
      maxPerAxis[axis] = d3.max(data, d => +d[axis]) || 0;
    });
    data.forEach(d => {
      allAxes.forEach(axis => {
        d[axis] = maxPerAxis[axis] > 0
          ? (+d[axis] / maxPerAxis[axis])
          : 0;
      });
    });

    const selectedData = data.filter(d => d.country === c1 || d.country === c2);

    g.selectAll("*").remove();

    // background circles
    const levels = 5;
    for (let lvl = 1; lvl <= levels; lvl++) {
      g.append("circle")
        .attr("class", "gridCircle")
        .attr("r", radius * lvl / levels)
        .style("fill", "white")
        .style("stroke", "white")
        .style("fill-opacity", 0.3)
        .style("filter", "url(#glow)");
    }

    // axes
    const axis = g.selectAll(".axis")
      .data(allAxes)
      .enter().append("g")
        .attr("class", "axis");

    axis.append("line")
      .attr("x1",0).attr("y1",0)
      .attr("x2", (d,i) => (radius*1.1) * Math.cos(angleSlice*i - Math.PI/2))
      .attr("y2", (d,i) => (radius*1.1) * Math.sin(angleSlice*i - Math.PI/2))
      .style("stroke","white").style("stroke-width","2px");

    axis.append("text")
      .attr("class", "legend")
      .attr("x", (d,i) => (radius*1.25) * Math.cos(angleSlice*i - Math.PI/2))
      .attr("y", (d,i) => (radius*1.25) * Math.sin(angleSlice*i - Math.PI/2))
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .attr("text-anchor", "middle")
      .text(d => d)
      .call(wrap, 60);

    const rScale = d3.scaleLinear().range([0, radius]).domain([0,1]);
    const radarLine = d3.lineRadial()
      .radius(d => rScale(d.value))
      .angle(d => d.angle)
      .curve(d3.curveCardinalClosed);

    selectedData.forEach((countryData, idx) => {
      const color = colours[idx];
      const pts = allAxes.map((axis, i) => ({
        angle: angleSlice * i,
        value: countryData[axis]
      }));

      g.append("path")
        .datum(pts)
        .attr("class", "radarArea")
        .attr("d", radarLine)
        .style("fill", color)
        .style("fill-opacity", 0.35)
        .on("mouseover", function() {
          d3.selectAll(".radarArea").style("fill-opacity", 0.4);
          d3.select(this).style("fill-opacity", 0.7);
        })
        .on("mouseout", function() {
          d3.selectAll(".radarArea").style("fill-opacity", 0.3);
        });

      g.selectAll(`.radarCircle-${idx}`)
        .data(pts)
        .enter().append("circle")
          .attr("class", `radarCircle-${idx}`)
          .attr("r", 4)
          .attr("cx", d => rScale(d.value) * Math.cos(d.angle - Math.PI/2))
          .attr("cy", d => rScale(d.value) * Math.sin(d.angle - Math.PI/2))
          .style("fill", color)
          .style("fill-opacity", 0.8)
          .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
              .html(`
                <strong>${countryData.country}</strong><br/>
                Metric: ${allAxes[pts.indexOf(d)]}<br/>
                Value: ${(d.value * maxPerAxis[allAxes[pts.indexOf(d)]]).toFixed(2)}
              `)
              .style("left", (event.pageX + 10) + "px")
              .style("top",  (event.pageY - 28) + "px");
          })
          .on("mouseout", () => tooltip.style("opacity", 0));
    });
  }

  // ── Helper: wrap long axis labels safely ─────────────────────────────────
  function wrap(text, width) {
    text.each(function() {
      const t     = d3.select(this),
            words = t.text().split(/\s+/).reverse();
      if (words.length === 0) return;

      const lineHeight = 1.4;
      const x = t.attr("x");
      const y = t.attr("y");
      const dy = parseFloat(t.attr("dy"));
      let word, line = [], lineNum = 0;
      let tspan = t.text(null)
                   .append("tspan")
                     .attr("x", x)
                     .attr("y", y)
                     .attr("dy", dy + "em");

      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node() && tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = t.append("tspan")
                   .attr("x", x)
                   .attr("y", y)
                   .attr("dy", ++lineNum * lineHeight + dy + "em")
                   .text(word);
        }
      }
    });
  }
});