const marginBar = { top: 30, right: 120, bottom: 50, left: 180 },
  widthBar = 800 - marginBar.left - marginBar.right,
  heightBar = 500 - marginBar.top - marginBar.bottom;

const svgBar = d3.select("#top10chart")
  .append("svg")
  .attr("width", widthBar + marginBar.left + marginBar.right)
  .attr("height", heightBar + marginBar.top + marginBar.bottom)
  .append("g")
  .attr("transform", `translate(${marginBar.left}, ${marginBar.top})`);

const xScaleBar = d3.scaleLinear().range([0, widthBar]);
const yScaleBar = d3.scaleBand().range([0, heightBar]).padding(0.1);
const colorScaleBar = d3.scaleOrdinal(d3.schemeSet2);
const indexColumns = ["hdi", "gnipc", "le", "eys", "mys"];

const yearSelect = d3.select("#yearSelect");
const indexSelect = d3.select("#indexSelect");
const yearLabel = d3.select("#selectedYearLabel");
const indexLabel = d3.select("#selectedIndexLabel");

d3.csv("HDIdataset.csv").then(data => {
  data.forEach(d => {
    d.Year = +d.Year;
    indexColumns.forEach(col => d[col] = +d[col]);
  });

  const uniqueYears = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);

  yearSelect.selectAll("option")
    .data(uniqueYears)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  indexSelect.selectAll("option")
    .data(indexColumns)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  yearSelect.property("value", uniqueYears[0]);
  indexSelect.property("value", indexColumns[0]);

  yearSelect.on("change", () => {
    updateBarChart(+yearSelect.property("value"), indexSelect.property("value"));
  });
  indexSelect.on("change", () => {
    updateBarChart(+yearSelect.property("value"), indexSelect.property("value"));
  });

  function updateBarChart(selectedYear, selectedIndex) {
    yearLabel.text(selectedYear);
    indexLabel.text(selectedIndex);
    const filtered = data.filter(d => d.Year === selectedYear);
    filtered.sort((a, b) => d3.descending(a[selectedIndex], b[selectedIndex]));
    const top10 = filtered.slice(0, 10);
    xScaleBar.domain([0, d3.max(top10, d => d[selectedIndex]) || 0]);
    yScaleBar.domain(top10.map(d => d.country));
    const barGroups = svgBar.selectAll(".bar-group")
      .data(top10, d => d.country);
    barGroups.exit().remove();
    const barGroupsEnter = barGroups.enter()
      .append("g")
      .attr("class", "bar-group");

    barGroupsEnter.append("rect")
      .merge(barGroups.select("rect"))
      .transition().duration(600)
      .attr("y", d => yScaleBar(d.country))
      .attr("height", yScaleBar.bandwidth())
      .attr("x", 0)
      .attr("width", d => xScaleBar(d[selectedIndex]))
      .attr("fill", (d, i) => colorScaleBar(i));

    barGroupsEnter.append("text")
      .attr("class", "country-text")
      .merge(barGroups.select(".country-text"))
      .transition().duration(600)
      .attr("x", 5)
      .attr("y", d => yScaleBar(d.country) + yScaleBar.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => d.country)
      .style("fill", "#fff")
      .style("font-weight", "bold");

    barGroupsEnter.append("text")
      .attr("class", "value-text")
      .merge(barGroups.select(".value-text"))
      .transition().duration(600)
      .attr("x", d => xScaleBar(d[selectedIndex]) + 5)
      .attr("y", d => yScaleBar(d.country) + yScaleBar.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => d[selectedIndex])
      .style("fill", "#000");

    svgBar.selectAll(".x-axis").remove();
    svgBar.selectAll(".y-axis").remove();

    svgBar.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${heightBar})`)
      .call(d3.axisBottom(xScaleBar).ticks(5));

    svgBar.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScaleBar));
  }

  updateBarChart(+yearSelect.property("value"), indexSelect.property("value"));
});
