import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';

document.addEventListener('DOMContentLoaded', () => {
  const groups = {
    group1: ["hdi","gnipc","le","eys","mys"],
    group2: [
      "Rank","Quality of Life Index","Purchasing Power Index","Safety Index",
      "Health Care Index","Cost of Living Index","Property Price to Income Ratio",
      "Traffic Commute Time Index","Pollution Index","Climate Index"
    ],
    group3: [
      "happiness_score","gdp_per_capita","social_support",
      "healthy_life_expectancy","freedom_to_make_life_choices",
      "generosity","perceptions_of_corruption"
    ]
  };

  const width      = 800,
        height     = 600,
        margin     = { top: 40, right: 40, bottom: 50, left: 60 },
        plotW      = width - margin.left - margin.right,
        plotH      = height - margin.top - margin.bottom;

  // SVG container
  const svg = d3.select("#chartpca")
    .append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, plotW]);
  const y = d3.scaleLinear().range([plotH, 0]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const tooltip = d3.select("body").append("div")
    .attr("class","tooltip")
    .style("position","absolute")
    .style("pointer-events","none")
    .style("opacity",0);

  // populate selects
  const groupSel = d3.select("#groupSelectPCA").html("");
  Object.entries(groups).forEach(([k, lbls],i)=> {
    groupSel.append("option")
      .attr("value", k)
      .property("selected", i===0)
      .text(k.replace(/^group/,"Group "));
  });

  const yearSel = d3.select("#yearSelectPCA").html("");
  d3.range(2015,2023).forEach(yr => {
    yearSel.append("option")
      .attr("value", yr)
      .property("selected", yr===2022)
      .text(yr);
  });

  let dataAll = [];
  d3.csv("merged_dataset.csv", d3.autoType).then(raw => {
    dataAll = raw.filter(d =>
      Number.isFinite(d.Year) && d.Year>=2015 && d.Year<=2022
    );
    render();
  });

  groupSel.on("change", render);
  yearSel .on("change", render);

  function render() {
    svg.selectAll("*").remove();

    const grp = groupSel.property("value"),
          metrics = groups[grp],
          yr = +yearSel.property("value");

    const data = dataAll
      .filter(d => d.Year===yr)
      .filter(d => metrics.every(m => Number.isFinite(d[m])));
    if (!data.length) return;

    const matrix = data.map(d => metrics.map(m => d[m])),
          countries = data.map(d=>d.country);

    const pca = new PCA(matrix,{center:true,scale:true}),
          proj = pca.predict(matrix,{nComponents:2}).to2DArray();
    const k = 3,
          km = kmeans(proj,k),
          clusters = km.clusters;

    const finalData = proj.map((coords,i)=>({
      country:  countries[i],
      PC1: coords[0],
      PC2: coords[1],
      cluster: clusters[i]
    }));

    x.domain(d3.extent(finalData,d=>d.PC1)).nice();
    y.domain(d3.extent(finalData,d=>d.PC2)).nice();
    color.domain(d3.range(k));

    svg.append("g")
      .attr("transform",`translate(0,${plotH})`)
      .call(d3.axisBottom(x))
      .append("text")
        .attr("x",plotW).attr("y",-6)
        .attr("text-anchor","end").text("PC1");

    svg.append("g")
      .call(d3.axisLeft(y))
      .append("text")
        .attr("transform","rotate(-90)")
        .attr("y",6).attr("dy","-4em")
        .attr("text-anchor","end").text("PC2");

    svg.selectAll("circle")
      .data(finalData)
      .enter().append("circle")
        .attr("r",5)
        .attr("cx",d=>x(d.PC1))
        .attr("cy",d=>y(d.PC2))
        .attr("fill",d=>color(d.cluster))
      .on("mouseover",(e,d)=>{
        d3.select(e.currentTarget).attr("stroke","black").attr("stroke-width",2);
        tooltip.transition().duration(200).style("opacity",0.9)
          .html(`📍 <strong>${d.country}</strong><br>PC1: ${d.PC1.toFixed(2)}<br>PC2: ${d.PC2.toFixed(2)}`)
          .style("left", (e.pageX+10)+"px")
          .style("top",  (e.pageY-28)+"px");
      })
      .on("mouseout",()=>tooltip.transition().duration(500).style("opacity",0));

    svg.selectAll("text.label")
      .data(finalData)
      .enter().append("text")
        .attr("class","label")
        .attr("x",d=>x(d.PC1)+7)
        .attr("y",d=>y(d.PC2)+4)
        .text(d=>d.country)
        .style("font-size","10px");
  }
})();
