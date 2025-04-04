const width = 800,
  height = 800,
  margin = { top: 100, right: 85, bottom: 85, left: 85 };

const radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.right);

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const defs = svg.append("defs");
const filter = defs.append("filter").attr("id", "glow");
filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
const feMerge = filter.append("feMerge");
feMerge.append("feMergeNode").attr("in", "coloredBlur");
feMerge.append("feMergeNode").attr("in", "SourceGraphic");

const g = svg.append("g")
  .attr("transform", `translate(${width / 2}, ${height / 2})`);

const tooltip = d3.select("#tooltip");

let allAxes = ["hdi", "gnipc", "le", "eys", "mys"];
const totalAxes = allAxes.length;
const angleSlice = (Math.PI * 2) / totalAxes;
const rScale = d3.scaleLinear().range([0, radius]);
const color = d3.scaleOrdinal(d3.schemeCategory10);

d3.csv("HDIdataset.csv").then(data => {
  data = data.filter(d => +d.Year === 2022);
  data.forEach(d => {
    allAxes.forEach(axis => {
      d[axis] = +d[axis];
    });
  });
  let maxPerAxis = {};
  allAxes.forEach(axis => {
    maxPerAxis[axis] = d3.max(data, d => d[axis]);
  });
  data.forEach(d => {
    allAxes.forEach(axis => {
      d[axis] = maxPerAxis[axis] ? d[axis] / maxPerAxis[axis] : 0;
    });
  });
  rScale.domain([0, 1]);

  const countries = data.map(d => d.country);
  countries.forEach(country => {
    d3.select("#countrySelect1").append("option").attr("value", country).text(country);
    d3.select("#countrySelect2").append("option").attr("value", country).text(country);
  });

  d3.selectAll("#countrySelect1, #countrySelect2").on("change", updateChart);
  d3.select("#countrySelect1").property("value", "Norway");
  d3.select("#countrySelect2").property("value", "Afghanistan");  
  updateChart();
  function updateChart() {
    const c1 = d3.select("#countrySelect1").property("value");
    const c2 = d3.select("#countrySelect2").property("value");
    let selectedData = data.filter(d => d.country === c1 || d.country === c2);
    if (!c1 && !c2) {
      g.selectAll("*").remove();
      return;
    }
    g.selectAll("*").remove();

    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      let r = (radius / levels) * level;
      g.append("circle")
        .attr("class", "gridCircle")
        .attr("r", r)
        .style("fill", "#CDCDCD")
        .style("stroke", "#CDCDCD")
        .style("fill-opacity", 0.1)
        .style("filter", "url(#glow)");
    }

    const axis = g.selectAll(".axis")
      .data(allAxes)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", (d, i) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (d, i) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
      .style("stroke", "white")
      .style("stroke-width", "2px");

    axis.append("text")
      .attr("class", "legend")
      .attr("x", (d, i) => rScale(1.25) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (d, i) => rScale(1.25) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .attr("text-anchor", "middle")
      .text(d => d)
      .call(wrap, 60);

    const radarLine = d3.lineRadial()
      .radius(d => rScale(d.value))
      .angle(d => d.angle)
      .curve(d3.curveCardinalClosed);

    selectedData.forEach((countryData, idx) => {
      const points = allAxes.map((axis, i) => ({
        angle: angleSlice * i,
        value: countryData[axis]
      }));

      g.append("path")
        .datum(points)
        .attr("class", "radarArea")
        .attr("d", radarLine)
        .style("fill", color(idx))
        .style("fill-opacity", 0.35)
        .on("mouseover", function() {
          d3.selectAll(".radarArea").transition().duration(200).style("fill-opacity", 0.1);
          d3.select(this).transition().duration(200).style("fill-opacity", 0.7);
        })
        .on("mouseout", function() {
          d3.selectAll(".radarArea").transition().duration(200).style("fill-opacity", 0.35);
        });

      g.selectAll(`.radarCircle-${idx}`)
        .data(points)
        .enter()
        .append("circle")
        .attr("class", `radarCircle-${idx}`)
        .attr("r", 4)
        .attr("cx", d => rScale(d.value) * Math.cos(d.angle - Math.PI / 2))
        .attr("cy", d => rScale(d.value) * Math.sin(d.angle - Math.PI / 2))
        .style("fill", color(idx))
        .style("fill-opacity", 0.8)
        .on("mouseover", (event, d) => {
          tooltip.style("opacity", 1)
            .html(`<strong>${countryData.country}</strong><br/>Axis: ${allAxes[points.indexOf(d)]}<br/>Value: ${d.value.toFixed(2)}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    });
  }

  updateChart();
});

function wrap(text, width) {
  text.each(function() {
    const text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      lineHeight = 1.4,
      x = text.attr("x"),
      y = text.attr("y"),
      dy = parseFloat(text.attr("dy"));
    let word,
      line = [],
      lineNumber = 0,
      tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}
