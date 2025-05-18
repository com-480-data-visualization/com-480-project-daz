import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';

(function() {
  // 1) Metric groups + human-friendly labels
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

  // 2) Size + margins
  const width  = 800,
        height = 600,
        margin = { top: 40, right: 40, bottom: 50, left: 60 },
        plotW  = width  - margin.left - margin.right,
        plotH  = height - margin.top  - margin.bottom;

  // 3) Build SVG + group
  const svg = d3.select("#chartpca")
    .append("svg")
      .attr("width",  width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // 4) Scales & color
  const x     = d3.scaleLinear().range([0, plotW]);
  const y     = d3.scaleLinear().range([plotH, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // 5) Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position","absolute")
    .style("pointer-events","none")
    .style("opacity",0);

  // 6) Populate group & year selects
  const groupSel = d3.select("#groupSelectPCA").html("");
  Object.keys(groups).forEach(key => {
    groupSel.append("option")
      .attr("value", key)
      .text(groupLabels[key]);
  });

  const yearSel = d3.select("#yearSelectPCA").html("");
  d3.range(2015, 2023).forEach(yr => {
    yearSel.append("option")
      .attr("value", yr)
      .property("selected", yr === 2022)
      .text(yr);
  });

  // 7) Load CSV
  let dataAll = [];
  d3.csv("merged_dataset.csv", d3.autoType).then(raw => {
    dataAll = raw.filter(d =>
      Number.isFinite(d.Year) && d.Year >= 2015 && d.Year <= 2022
    );
    render();
  });

  // 8) Re-render on change
  groupSel.on("change", render);
  yearSel .on("change", render);

  // 9) Main draw
  function render() {
    svg.selectAll("*").remove();

    const grp     = groupSel.property("value"),
          metrics = groups[grp],
          yr       = +yearSel.property("value");

    // filter out rows missing any metric
    const data = dataAll
      .filter(d => d.Year === yr)
      .filter(d => metrics.every(m => Number.isFinite(d[m])));
    if (!data.length) return;

    // build matrix and country list
    const matrix    = data.map(d => metrics.map(m => d[m])),
          countries = data.map(d => d.country);

    // PCA
    const pca  = new PCA(matrix, { center: true, scale: true }),
          proj = pca.predict(matrix, { nComponents: 2 }).to2DArray();

    // k-means
    const k        = 3,
          km       = kmeans(proj, k),
          clusters = km.clusters;

    // assemble final data with original metric values
    const finalData = proj.map((coords, i) => {
      const row = { country: countries[i], PC1: coords[0], PC2: coords[1], cluster: clusters[i] };
      // attach the raw values for tooltip
      metrics.forEach(m => {
        row[m] = data[i][m];
      });
      return row;
    });

    // update scales
    x.domain(d3.extent(finalData, d => d.PC1)).nice();
    y.domain(d3.extent(finalData, d => d.PC2)).nice();
    color.domain(d3.range(k));

    // axes
    svg.append("g")
      .attr("transform", `translate(0,${plotH})`)
      .call(d3.axisBottom(x))
      .append("text")
        .attr("x", plotW).attr("y", -6)
        .attr("text-anchor","end")
        .text("PC1");

    svg.append("g")
      .call(d3.axisLeft(y))
      .append("text")
        .attr("transform","rotate(-90)")
        .attr("y",6).attr("dy","-4em")
        .attr("text-anchor","end")
        .text("PC2");

    // points + tooltip
    svg.selectAll("circle")
      .data(finalData)
      .enter().append("circle")
        .attr("r",5)
        .attr("cx", d => x(d.PC1))
        .attr("cy", d => y(d.PC2))
        .attr("fill", d => color(d.cluster))
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .attr("stroke","black")
          .attr("stroke-width",2);

        // build a nice HTML snippet
        let html = `<strong>${d.country}</strong><br/>PC1: ${d.PC1.toFixed(2)}<br/>PC2: ${d.PC2.toFixed(2)}<br/>Cluster: ${d.cluster}<hr/>`;
        metrics.forEach(m => {
          html += `${m}: ${d[m]}<br/>`;
        });

              tooltip
       .html(html)
       .style("left", (event.pageX + 10) + "px")
      .style("top",  (event.pageY - 28) + "px")
     // <<< FADE IN >>>
    tooltip.transition()
       .duration(200)
      .style("opacity", 0.9);
  })
      .on("mouseout", () => {
        d3.selectAll("circle").attr("stroke",null);
        tooltip.transition()
        .duration(200)
        .style("opacity", 0);
      });

    // labels
    svg.selectAll("text.label")
      .data(finalData)
      .enter().append("text")
        .attr("class","label")
        .attr("x", d => x(d.PC1) + 7)
        .attr("y", d => y(d.PC2) + 4)
        .text(d => d.country)
        .style("font-size","10px");
  }
})();