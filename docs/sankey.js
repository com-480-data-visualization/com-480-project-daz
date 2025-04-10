document.addEventListener("DOMContentLoaded", function () {
    d3.csv("merged_dataset.csv").then(data => {
      data.forEach(d => {
        d.gdp_per_capita = +d.gdp_per_capita;
        d.eys = +d.eys;
        d.phdi = +d.phdi;
        d.happiness_score = +d.happiness_score;
        d["Quality of Life Index"] = +d["Quality of Life Index"];
      });
  
      // --- Compute Base Averages ---
      const avgGDP = d3.mean(data, d => d.gdp_per_capita);
      const avgEducation = d3.mean(data, d => d.eys);
      const avgHealthcare = d3.mean(data, d => d.phdi);
  
      // --- Compute Intermediate Flows ---
      const totalEmployment = avgGDP * 0.3 + avgEducation * 0.5 + avgHealthcare * 0.2;
      const totalInequality = avgGDP * 0.4 + avgEducation * 0.2 + avgHealthcare * 0.3;
      const totalSocSupport = avgGDP * 0.3 + avgEducation * 0.3 + avgHealthcare * 0.5;
  
      const flowEmployment_to_Happiness = totalEmployment * 0.6;
      const flowEmployment_to_Quality = totalEmployment * 0.4;
      const flowInequality_to_Happiness = totalInequality * 0.4;
      const flowInequality_to_Quality = totalInequality * 0.6;
      const flowSocSupport_to_Happiness = totalSocSupport * 0.7;
      const flowSocSupport_to_Quality = totalSocSupport * 0.3;
  
      const nodes = [
        { name: "GDP per Capita" },
        { name: "Education (EYS)" },
        { name: "Healthcare Investment" },
        { name: "Employment" },
        { name: "Inequality" },
        { name: "Social Support" },
        { name: "Happiness Score" },
        { name: "Quality of Life Index" }
      ];
  
      const links = [
        { source: 0, target: 3, value: avgGDP * 0.3 },
        { source: 0, target: 4, value: avgGDP * 0.4 },
        { source: 0, target: 5, value: avgGDP * 0.3 },
  
        { source: 1, target: 3, value: avgEducation * 0.5 },
        { source: 1, target: 4, value: avgEducation * 0.2 },
        { source: 1, target: 5, value: avgEducation * 0.3 },
  
        { source: 2, target: 3, value: avgHealthcare * 0.2 },
        { source: 2, target: 4, value: avgHealthcare * 0.3 },
        { source: 2, target: 5, value: avgHealthcare * 0.5 },
  
        { source: 3, target: 6, value: flowEmployment_to_Happiness },
        { source: 3, target: 7, value: flowEmployment_to_Quality },
  
        { source: 4, target: 6, value: flowInequality_to_Happiness },
        { source: 4, target: 7, value: flowInequality_to_Quality },
  
        { source: 5, target: 6, value: flowSocSupport_to_Happiness },
        { source: 5, target: 7, value: flowSocSupport_to_Quality }
      ];
  
      const width = 800;
      const height = 500;
  
      const sankeyGenerator = d3.sankey()
        .nodeWidth(20)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 6]]);
  
      // --- Build Graph Structure ---
      const graph = {
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
      };
  
      sankeyGenerator(graph);
  
      // --- Create SVG Container ---
      const svg = d3.select("#sankeyChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
  
      const color = d3.scaleOrdinal(d3.schemeSet3);
  
      const tooltip = d3.select("#sankey-tooltip");
  
      ////////////////////////////////////////////////////
      // Draw Links 
      ////////////////////////////////////////////////////
      svg.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("id", (d, i) => "linkPath_" + i)
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke", d => color(d.source.index))
        .attr("fill", "none")
        .attr("stroke-opacity", 0.4)
        .on("mouseover", function (event, d, i) {
          d3.select(this)
            .transition().duration(200)
            .attr("stroke-opacity", 0.8)
            .attr("stroke", "orange");
          tooltip.transition().duration(200)
            .style("opacity", 0.9);
          tooltip.html(
            `<strong>${graph.nodes[d.source.index].name} → ${graph.nodes[d.target.index].name}</strong><br/>Flow: ${d.value.toFixed(2)}`
          )
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function (event, d, i) {
          d3.select(this)
            .transition().duration(200)
            .attr("stroke-opacity", 0.4)
            .attr("stroke", color(d.source.index));
          tooltip.transition().duration(200)
            .style("opacity", 0);
        });
  
  
      ////////////////////////////////////////////////////
      // Draw Nodes
      ////////////////////////////////////////////////////
      const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g")
        .on("mouseover", function (event, d) {
          d3.select(this).select("rect")
            .transition().duration(200)
            .attr("fill", "darkorange");
  
          d3.select(this).select(".node-value")
            .transition().duration(200)
            .style("font-weight", "bold")
            .style("fill", "red");
        })
        .on("mouseout", function (event, d) {
          d3.select(this).select("rect")
            .transition().duration(200)
            .attr("fill", color(graph.nodes.indexOf(d)));
  
          tooltip.transition().duration(200)
            .style("opacity", 0);
  
          d3.select(this).select(".node-value")
            .transition().duration(200)
            .style("font-weight", "normal")
            .style("fill", "gray");
        });
  
      node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#000");
  
      node.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name)
        .style("font-size", "12px");
  
      node.append("text")
        .attr("class", "node-value")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2 + 15)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => (d.value || d.value === 0) ? d.value.toFixed(2) : "0.00")
        .style("font-size", "10px")
        .style("fill", "gray");
  
    }).catch(error => {
      console.error("Error loading CSV data:", error);
    });
  });
  