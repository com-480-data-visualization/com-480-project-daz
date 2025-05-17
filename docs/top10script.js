// List of all possible features and their human‐readable labels
const TOP10_FEATURES = [
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
const TOP10_FEATURE_LABELS = {
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

const marginBar = { top: 30, right: 120, bottom: 50, left: 180 },
      widthBar  = 800 - marginBar.left - marginBar.right,
      heightBar = 500 - marginBar.top  - marginBar.bottom;

const svgBar = d3.select("#top10chart")
  .append("svg")
    .attr("width",  widthBar  + marginBar.left + marginBar.right)
    .attr("height", heightBar + marginBar.top  + marginBar.bottom)
  .append("g")
    .attr("transform", `translate(${marginBar.left}, ${marginBar.top})`);

const xScaleBar     = d3.scaleLinear().range([0, widthBar]);
const yScaleBar     = d3.scaleBand().range([0, heightBar]).padding(0.1);
const colorScaleBar = d3.scaleOrdinal(d3.schemeSet2);

const featureSelect = d3.select("#indexSelect");        
const yearSelect    = d3.select("#yearSelect");
const featureLabel  = d3.select("#selectedIndexLabel");
const yearLabel     = d3.select("#selectedYearLabel");

let dataGlobaltop10;  
d3.csv("merged_dataset.csv", d3.autoType).then(data => {
  //console.log("Available features:", TOP10_FEATURES);       /

  dataGlobaltop10 = data.filter(d => Number.isFinite(d.Year));

  initFeatureSelect();      // populate feature dropdown
  populateYearOptions();    // build year dropdown based on default feature
  attachEventListeners();   // hook up UI events
  updateBarChart();         // initial render
});

function initFeatureSelect() {
  featureSelect.html("");
  TOP10_FEATURES.forEach(feat => {
    featureSelect.append("option")
      .attr("value", feat)
      .text(TOP10_FEATURE_LABELS[feat] || feat);
  });
  featureSelect.property("value", TOP10_FEATURES[0]);
}

function getValidYearsForFeature(feature) {
  // group by Year, then only keep years where at least one record has a finite value
  return Array.from(
    d3.rollup(
      dataGlobaltop10,
      v => v.some(r => Number.isFinite(r[feature])),
      d => d.Year
    )
    .entries()
    .filter(([yr, has]) => has)
    .map(([yr]) => +yr)
  ).sort((a,b)=>a-b);
}

function populateYearOptions() {
  const feat  = featureSelect.property("value");
  const years = getValidYearsForFeature(feat);

  yearSelect.html("");
  yearSelect.selectAll("option")
    .data(years)
    .enter().append("option")
      .attr("value", d => d)
      .text(d => d);

  // default to earliest available year
  yearSelect.property("value", years[0]);
}

function attachEventListeners() {
  featureSelect.on("change", () => {
    populateYearOptions();  // rebuild years for new feature
    updateBarChart();       // then update chart
  });
  yearSelect.on("change", updateBarChart);
}

function updateBarChart() {
  const feature      = featureSelect.property("value");
  const selectedYear = +yearSelect.property("value");

  // update labels
  featureLabel.text(TOP10_FEATURE_LABELS[feature] || feature);
  yearLabel.text(selectedYear);

  // filter, sort descending, take top 10
  const filtered = dataGlobaltop10.filter(d =>
    d.Year === selectedYear &&
    Number.isFinite(d[feature])
  );

  filtered.sort((a,b) => d3.descending(a[feature], b[feature]));
  const top10 = filtered.slice(0,10);

  // update scales
  xScaleBar.domain([0, d3.max(top10, d => d[feature]) || 0]);
  yScaleBar.domain(top10.map(d => d.country));

  // DATA JOIN for bars
  const barGroups = svgBar.selectAll(".bar-group")
    .data(top10, d => d.country);

  barGroups.exit().remove();

  const barEnter = barGroups.enter()
    .append("g")
      .attr("class", "bar-group");

  // RECT
  barEnter.append("rect")
    .merge(barGroups.select("rect"))
    .transition().duration(600)
      .attr("y", d => yScaleBar(d.country))
      .attr("height", yScaleBar.bandwidth())
      .attr("x", 0)
      .attr("width", d => xScaleBar(d[feature]))
      .attr("fill", (d,i) => colorScaleBar(i));

  // COUNTRY LABEL
  barEnter.append("text")
    .attr("class","country-text")
    .merge(barGroups.select(".country-text"))
    .transition().duration(600)
      .attr("x", 5)
      .attr("y", d => yScaleBar(d.country) + yScaleBar.bandwidth()/2)
      .attr("dy","0.35em")
      .text(d => d.country)
      .style("fill","#fff").style("font-weight","bold");

  // VALUE LABEL
  barEnter.append("text")
    .attr("class","value-text")
    .merge(barGroups.select(".value-text"))
    .transition().duration(600)
      .attr("x", d => xScaleBar(d[feature]) + 5)
      .attr("y", d => yScaleBar(d.country) + yScaleBar.bandwidth()/2)
      .attr("dy","0.35em")
      .text(d => d[feature])
      .style("fill","#000");

  // AXES (remove old, then draw new)
  svgBar.selectAll(".x-axis, .y-axis").remove();

  svgBar.append("g")
      .attr("class","x-axis")
      .attr("transform",`translate(0, ${heightBar})`)
      .call(d3.axisBottom(xScaleBar).ticks(5));

  svgBar.append("g")
      .attr("class","y-axis")
      .call(d3.axisLeft(yScaleBar));
}