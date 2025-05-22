const REGION_FEATURES = [
  "happiness_score",
  "gdp_per_capita",
  "healthy_life_expectancy",
  "social_support",
  "freedom_to_make_life_choices",
  "generosity",
  "perceptions_of_corruption",
  "gnipc",
  "coef_ineq",
  "Purchasing Power Index",
  "le",
  "Health Care Index",
  "Pollution Index",
  "ineq_edu",
  "ineq_inc",
  "ineq_le",
  "gii",
  "gdi"
];

const FEATURE_LABELS = {
  happiness_score:             "Happiness Score",
  gdp_per_capita:              "GDP per Capita",
  healthy_life_expectancy:     "Healthy Life Expectancy",
  social_support:              "Social Support",
  freedom_to_make_life_choices:"Freedom to Make Life Choices",
  generosity:                  "Generosity",
  perceptions_of_corruption:   "Perceptions of Corruption",
  gnipc:                       "GNI per Capita",
  coef_ineq:                   "Income Inequality (Gini)",
  "Purchasing Power Index":    "Purchasing Power Index",
  le:                          "Life Expectancy",
  "Health Care Index":         "Health Care Index",
  "Pollution Index":           "Pollution Index",
  ineq_edu:                    "Inequality: Education",
  ineq_inc:                    "Inequality: Income",
  ineq_le:                     "Inequality: Longevity",
  gii:                         "Gender Inequality Index",
  gdi:                         "Gender Development Index"
};

document.addEventListener("DOMContentLoaded", function () {
  let dataGlobal;

  const defaultFeature = "happiness_score";
  const defaultStart   = 2015;  // clamp start‐year to ≥ 2015
  const defaultEnd     = 2020;

  // ── Load & initialize ─────────────────────────────────────────────────────
  d3.csv("merged_dataset.csv", d3.autoType).then(data => {
    dataGlobal = data.filter(d => Number.isFinite(d.Year));
    initFeatureSelect();
    populateYearsAndDefaults();
    attachEventListeners();
    updateChart(); // Initial render
  });

  // ── Build the feature dropdown ────────────────────────────────────────────
  function initFeatureSelect() {
    const sel = document.getElementById("featureSelect");
    sel.innerHTML = "";
    REGION_FEATURES.forEach(feat => {
      const opt = document.createElement("option");
      opt.value = feat;
      opt.text  = FEATURE_LABELS[feat]
                || feat.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
      sel.appendChild(opt);
    });
    sel.value = defaultFeature;
  }

  // ── Valid years for a feature ─────────────────────────────────────────────
  function getValidYearsForFeature(feature) {
    return d3.groups(dataGlobal, d => d.Year)
      .filter(([, recs]) => recs.some(r => Number.isFinite(r[feature])))
      .map(([yr]) => +yr)
      .sort((a, b) => a - b);
  }

  // ── Populate the start/end year selectors & set defaults ─────────────────
  function populateYearsAndDefaults() {
    const feat  = document.getElementById("featureSelect").value;
    // only years ≥ 2015
    const years = getValidYearsForFeature(feat)
                    .filter(y => y >= defaultStart);

    const startSel = d3.select("#startYearSelect");
    startSel.html("");
    startSel.selectAll("option")
      .data(years)
      .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

    // default to 2015 if available, else the earliest ≥2015
    const sy = years.includes(defaultStart) ? defaultStart : years[0];
    startSel.property("value", sy);

    updateEndYearOptions(feat, sy);
  }

  // ── Include the start‐year itself for end‐year list ───────────────────────
  function updateEndYearOptions(feature, startYear) {
    // allow same year
    const years = getValidYearsForFeature(feature)
                    .filter(y => y >= startYear);
    const endSel = d3.select("#endYearSelect");
    endSel.html("");
    endSel.selectAll("option")
      .data(years)
      .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

    const ey = years.includes(defaultEnd) ? defaultEnd : years[years.length - 1];
    endSel.property("value", ey);
  }

  // ── Hook up UI events ─────────────────────────────────────────────────────
  function attachEventListeners() {
    document.getElementById("featureSelect")
      .addEventListener("change", () => {
        populateYearsAndDefaults();
        updateChart();
      });

    document.getElementById("startYearSelect")
      .addEventListener("change", () => {
        const feat = document.getElementById("featureSelect").value;
        const sy   = +document.getElementById("startYearSelect").value;
        updateEndYearOptions(feat, sy);
      });

    document.getElementById("update-chart")
      .addEventListener("click",  updateChart);

    document.getElementById("reset-animation2")
      .addEventListener("click",  updateChart);
  }

  // ── Render the region‐by‐time line chart ───────────────────────────────────
  function updateChart() {
    const feature   = document.getElementById("featureSelect").value;
    const startYear = +document.getElementById("startYearSelect").value;
    const endYear   = +document.getElementById("endYearSelect").value;

    const filtered = dataGlobal.filter(d =>
      d.Year >= startYear &&
      d.Year <= endYear &&
      Number.isFinite(d[feature])
    );

    // region → year → avg(feature)
    const byRegion = d3.rollup(
      filtered,
      v => d3.mean(v, d => d[feature]),
      d => d.region_happy,
      d => d.Year
    );

    const regionsData = [];
    for (const [region, mapYear] of byRegion) {
      const vals = Array.from(mapYear, ([yr, avg]) => ({ Year:+yr, value:avg }))
                        .sort((a,b)=>a.Year-b.Year);
      regionsData.push({ region, values: vals });
    }

    // clear past chart
    d3.select("#lineChartRegion").select("svg").remove();

    const margin = { top:50, right:250, bottom:50, left:60 },
          width  = 800 - margin.left - margin.right,
          height = 500 - margin.top  - margin.bottom;

    const svg = d3.select("#lineChartRegion")
      .append("svg")
        .attr("width",  width  + margin.left + margin.right)
        .attr("height", height + margin.top  + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleLinear()
      .domain([startYear, endYear])
      .range([0, width]);
    // X axis
    const xAxisG = svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickValues(d3.range(startYear, endYear+1))
      .tickFormat(d3.format("d")));

    // make axis‐line & ticks thicker
    xAxisG.selectAll("path.domain")
    .attr("stroke-width", 2);
    xAxisG.selectAll("line.tick")
    .attr("stroke-width", 2);

    // set label font‐size & weight
    xAxisG.selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "400");

    // Y axis
    let yMin = d3.min(regionsData, r => d3.min(r.values, d => d.value));
    let yMax = d3.max(regionsData, r => d3.max(r.values, d => d.value));
    if (yMin == null) yMin = 0; if (yMax == null) yMax = 1;

    const y = d3.scaleLinear()
      .domain([yMin - 0.1*Math.abs(yMin), yMax + 0.1*Math.abs(yMax)])
      .range([height, 0]);
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

    // labels
    svg.append("text")
      .attr("x",width/2).attr("y",height+margin.bottom-10)
      .attr("text-anchor","middle").classed("axis-label",true)
      .text("Year")
      .style("font-size", "18px")
      .style("font-weight", "400");
    svg.append("text")
      .attr("transform","rotate(-90)")
      .attr("x",-height/2).attr("y",-margin.left+15)
      .attr("text-anchor","middle").classed("axis-label",true)
      .text(FEATURE_LABELS[feature]||feature)
      .style("font-size", "18px")
      .style("font-weight", "400");

    // line & color
    const line  = d3.line().x(d=>x(d.Year)).y(d=>y(d.value));
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    regionsData.forEach(regionData => {
      const cls = regionData.region.replace(/\s+/g,"");
      const path = svg.append("path")
        .datum(regionData.values)
        .attr("fill","none")
        .attr("stroke",color(regionData.region))
        .attr("stroke-width",2)
        .attr("class","line line-"+cls)
        .attr("d", line);

      // animate
      const L = path.node().getTotalLength();
      path.attr("stroke-dasharray",`${L} ${L}`)
          .attr("stroke-dashoffset",L)
        .transition().duration(2000).ease(d3.easeLinear)
          .attr("stroke-dashoffset",0);

      // hover highlight
      path.on("mouseover",()=>{
          path.transition().duration(200).attr("stroke-width",4);
          svg.select(".region-label-"+cls)
             .transition().duration(200)
             .style("font-weight","bold").style("fill","red");
        })
        .on("mouseout",()=>{
          path.transition().duration(200).attr("stroke-width",2);
          svg.select(".region-label-"+cls)
             .transition().duration(200)
             .style("font-weight","normal")
             .style("fill",color(regionData.region));
        });

      // dots
      svg.selectAll(".dot-"+cls)
        .data(regionData.values)
        .enter().append("circle")
          .attr("class","dot-"+cls)
          .attr("cx",d=>x(d.Year))
          .attr("cy",d=>y(d.value))
          .attr("r",0)
          .attr("fill",color(regionData.region))
        .transition().delay((d,i)=>i*100).duration(500)
          .attr("r",3);

      // region label at end
      if (regionData.values.length) {
        const lp = regionData.values.slice(-1)[0];
        svg.append("text")
          .attr("x",x(lp.Year)+5)
          .attr("y",y(lp.value))
          .attr("class","region-label region-label-"+cls)
          .style("fill",color(regionData.region))
          .style("font-size","12px")
          .style("opacity",0)
          .text(regionData.region)
          .transition().delay(2200).duration(500)
          .style("opacity",1);
      }
    });
  }
});