import { PCA } from 'ml-pca';
import {kmeans} from 'ml-kmeans';

(function() {
    // Set up dimensions and margins.
    const width = 800,
          height = 600,
          margin = { top: 40, right: 40, bottom: 50, left: 60 };
  
    // Create an SVG container.
    const svg = d3.select("#chartpca")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Append a group for the main plot area.
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
  
    // Create a tooltip.
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip");
  
    // The metrics to use for PCA.
    const metrics = ["hdi", "le", "eys", "mys", "gnipc"];
  
    // Load the CSV file.
    d3.csv("HDIdataset.csv").then(data => {
      // Parse numeric fields.
      data.forEach(d => {
        d.Year = +d.Year;
        d.hdi = +d.hdi;
        d.le = +d.le;
        d.eys = +d.eys;
        d.mys = +d.mys;
        d.gnipc = +d.gnipc;
      });
      
      // Filter to year 2022.
      const data2022 = data.filter(d => d.Year === 2022);
      if(data2022.length === 0) {
        console.error("No data for Year 2022");
        return;
      }
  
      // Build a data matrix (rows for countries) using the five metrics.
      // Also record the country names.
      const matrix = data2022.map(d => metrics.map(m => d[m]));
      const countries = data2022.map(d => d.country);
  
      // Run PCA on the matrix.
      // We use ml-pca, scaling and centering the data.
      const pca = new PCA(matrix, { scale: true, center: true });

      // Project the data onto the first two principal components.
      const projected = pca.predict(matrix, { nComponents: 2 }).to2DArray();
      
      // Run k-means clustering (e.g., k=3).
      const k = 3; 
      const clustersResult = kmeans(projected, k);
      const clusterAssignments = clustersResult.clusters;  
  
      // Create final data with PCA scores and cluster assignments.
      const finalData = data2022.map((d, i) => ({
        country: d.country,
        PC1: projected[i][0],
        PC2: projected[i][1],
        cluster: clusterAssignments[i]
      }));
  
      // Create scales for the PCA scatter plot.
      const xExtent = d3.extent(finalData, d => d.PC1),
            yExtent = d3.extent(finalData, d => d.PC2);
      const xScale = d3.scaleLinear()
        .domain([xExtent[0], xExtent[1]])
        .nice()
        .range([0, plotWidth]);
      const yScale = d3.scaleLinear()
        .domain([yExtent[0], yExtent[1]])
        .nice()
        .range([plotHeight, 0]);
  
      // Create a color scale for the clusters.
      const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(d3.range(k));
  
      // Append axes.
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale);
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${plotHeight})`)
        .call(xAxis)
        .append("text")
        .attr("x", plotWidth)
        .attr("y", -6)
        .attr("fill", "#000")
        .attr("text-anchor", "end")
        .text("PC1");
      g.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "-4em")
        .attr("fill", "#000")
        .attr("text-anchor", "end")
        .text("PC2");
  
      // Plot the points.
      g.selectAll(".point")
        .data(finalData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("r", 5)
        .attr("cx", d => xScale(d.PC1))
        .attr("cy", d => yScale(d.PC2))
        .attr("fill", d => color(d.cluster))
        .on("mouseover", function(event, d) {
          d3.select(this)
            .attr("stroke", "black")
            .attr("stroke-width", 2);
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html("<strong>" + d.country + "</strong><br/>"
                       + "PC1: " + d.PC1.toFixed(2) + "<br/>"
                       + "PC2: " + d.PC2.toFixed(2) + "<br/>"
                       + "Cluster: " + d.cluster)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("stroke", null);
          tooltip.transition().duration(500).style("opacity", 0);
        });
  
      // Optionally, add labels next to the points.
      g.selectAll(".label")
        .data(finalData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.PC1) + 7)
        .attr("y", d => yScale(d.PC2) + 4)
        .text(d => d.country)
        .style("font-size", "10px");
      
    }).catch(error => {
      console.error("Error loading CSV:", error);
    });
  })();
  