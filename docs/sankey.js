// sankey.js
//calc details
/*
/**
1.	Filter to “feature-complete” rows: those where GDP, EYS and PHDI are present.
	2.	STANDARDIZE the three base inputs (GDP, EYS, PHDI) to zero-mean, unit-variance:
(x − μ) / σ, so that regressions aren’t skewed by differing scales.
	3.	Fit three multivariate linear regressions (MLR):
(standardized GDP, EYS, PHDI) → each intermediate node
• Employment Rate (proxy from lfpr_f / lfpr_m)
• Inequality     (proxy from coef_ineq)
• Social Support (directly from CSV)
	4.	Predict all intermediate values for every feature-complete row.
	5.	Fit two more MLRs:
(predicted Emp, Ineq, Soc) → final outputs
• Happiness Score
• Quality of Life Index
	6.	EXTRACT & FLATTEN each model’s β-coefficients (drop intercept),
CLAMP negatives to zero, then NORMALIZE so they sum to 1:
⇒ these become the “share” of each source→target Sankey flow.
	7.	Compute the average magnitudes of the original GDP, EYS and PHDI,
and multiply by the shares to get actual link values.
 */


import MLR from 'https://cdn.skypack.dev/ml-regression-multivariate-linear';

console.log("📦 D3 v", d3.version, "| Sankey:", typeof d3.sankey, "| MLR:", typeof MLR);

document.addEventListener("DOMContentLoaded", () => {
  d3.csv("merged_dataset.csv").then(raw => {
    // 1) Parse & proxies
    raw.forEach(d => {
      d.gdp_per_capita          = +d.gdp_per_capita;
      d.eys                     = +d.eys;
      d.phdi                    = +d.phdi;
      d.happiness_score         = +d.happiness_score;
      d["Quality of Life Index"]= +d["Quality of Life Index"];
      d.lfpr_f                  = +d.lfpr_f;
      d.lfpr_m                  = +d.lfpr_m;
      d.coef_ineq               = +d.coef_ineq;
      d.social_support          = +d.social_support;
      d.employment_rate         = (d.lfpr_f + d.lfpr_m) / 2;
      d.inequality              = d.coef_ineq;
    });

    // 2) Feature-complete rows
    const base = raw.filter(d =>
      !isNaN(d.gdp_per_capita) &&
      !isNaN(d.eys) &&
      !isNaN(d.phdi)
    );
    console.log("feature-complete:", base.length);

    // 3) Compute means & stddevs for scaling
    function mean(arr){ return d3.mean(arr); }
    function std(arr){
      const m = mean(arr);
      return Math.sqrt(d3.mean(arr.map(v=> (v-m)**2)));
    }
    const g_arr = base.map(d=>d.gdp_per_capita),
          e_arr = base.map(d=>d.eys),
          p_arr = base.map(d=>d.phdi);
    const mG = mean(g_arr),   sG = std(g_arr);
    const mE = mean(e_arr),   sE = std(e_arr);
    const mP = mean(p_arr),   sP = std(p_arr);
    console.log("scaling → GDP:", mG.toFixed(1), "±", sG.toFixed(1),
                "| EYS:", mE.toFixed(1), "±", sE.toFixed(1),
                "| PHDI:", mP.toFixed(1), "±", sP.toFixed(1));

    // 4) Helpers
    const standardizeRow = d => [
      (d.gdp_per_capita - mG)/sG,
      (d.eys            - mE)/sE,
      (d.phdi           - mP)/sP
    ];
    const flatten = bs => bs.map(a=>a[0]);
    function normalizePositive(coefs){
      const pos = coefs.map(v=>Math.max(0,v));
      const sum = pos.reduce((a,b)=>a+b,0);
      return sum>0 ? pos.map(v=>v/sum) : pos.map(_=>1/pos.length);
    }

    // 5) Fit GDP/EYS/PHDI → Employment Rate, Inequality, Social Support
    const empRows  = base.filter(d=>!isNaN(d.employment_rate));
    const ineqRows = base.filter(d=>!isNaN(d.inequality));
    const socRows  = base.filter(d=>!isNaN(d.social_support));

    const regEmp = new MLR(
      empRows.map(standardizeRow),
      empRows.map(d=>[d.employment_rate])
    );
    const regIneq = new MLR(
      ineqRows.map(standardizeRow),
      ineqRows.map(d=>[d.inequality])
    );
    const regSoc = new MLR(
      socRows.map(standardizeRow),
      socRows.map(d=>[d.social_support])
    );

    console.log("β Emp:",   regEmp.weights.map(a=>a[0]));
    console.log("β Ineq:",  regIneq.weights.map(a=>a[0]));
    console.log("β Soc:",   regSoc.weights.map(a=>a[0]));

    // 6) Predict intermediates for all base rows
    const preds = base.map(d => {
      const x = standardizeRow(d);
      return {
        emp:  regEmp.predict(x)[0],
        ineq: regIneq.predict(x)[0],
        soc:  regSoc.predict(x)[0]
      };
    });
    console.log("pred sample:", preds.slice(0,3));

    // 7) Fit intermediates → Happiness & QOL
    const hapIdx = base.map((d,i)=>!isNaN(d.happiness_score)?i:-1).filter(i=>i>=0);
    const qolIdx = base.map((d,i)=>!isNaN(d["Quality of Life Index"])?i:-1).filter(i=>i>=0);

    const regHap = new MLR(
      hapIdx.map(i=>[preds[i].emp, preds[i].ineq, preds[i].soc]),
      hapIdx.map(i=>[ base[i].happiness_score ])
    );
    const regQual = new MLR(
      qolIdx.map(i=>[preds[i].emp, preds[i].ineq, preds[i].soc]),
      qolIdx.map(i=>[ base[i]["Quality of Life Index"] ])
    );

    console.log("β Hap:",  regHap.weights.map(a=>a[0]));
    console.log("β Qol:",  regQual.weights.map(a=>a[0]));

    // 8) Normalize positive shares (drop intercept)
    const wEmp  = normalizePositive(flatten(regEmp.weights).slice(1));
    const wIneq = normalizePositive(flatten(regIneq.weights).slice(1));
    const wSoc  = normalizePositive(flatten(regSoc.weights).slice(1));
    const wHap  = normalizePositive(flatten(regHap.weights).slice(1));
    const wQual = normalizePositive(flatten(regQual.weights).slice(1));
    console.log("shares:", { wEmp, wIneq, wSoc, wHap, wQual });

    // 9) Compute average magnitudes for scaling Sankey links
    const avgG = mean(g_arr), avgE = mean(e_arr), avgP = mean(p_arr);
    const totalEmp  = avgG*wEmp[0]  + avgE*wEmp[1]  + avgP*wEmp[2];
    const totalIneq = avgG*wIneq[0] + avgE*wIneq[1] + avgP*wIneq[2];
    const totalSoc  = avgG*wSoc[0]  + avgE*wSoc[1]  + avgP*wSoc[2];
    const flowEmpH  = totalEmp  * wHap[0];
    const flowEmpQ  = totalEmp  * wQual[0];
    const flowIneqH = totalIneq * wHap[1];
    const flowIneqQ = totalIneq * wQual[1];
    const flowSocH  = totalSoc  * wHap[2];
    const flowSocQ  = totalSoc  * wQual[2];

    // 10) Build & render Sankey
    const nodes = [
      {name:"GDP per Capita"}, {name:"Education (EYS)"}, {name:"Healthcare Investment"},
      {name:"Employment Rate"}, {name:"Inequality"}, {name:"Social Support"},
      {name:"Happiness Score"}, {name:"Quality of Life Index"}
    ];
    const links = [
      {s:0,t:3,v:avgG*wEmp[0]}, {s:1,t:3,v:avgE*wEmp[1]}, {s:2,t:3,v:avgP*wEmp[2]},
      {s:0,t:4,v:avgG*wIneq[0]},{s:1,t:4,v:avgE*wIneq[1]},{s:2,t:4,v:avgP*wIneq[2]},
      {s:0,t:5,v:avgG*wSoc[0]},{s:1,t:5,v:avgE*wSoc[1]},{s:2,t:5,v:avgP*wSoc[2]},
      {s:3,t:6,v:flowEmpH},{s:3,t:7,v:flowEmpQ},
      {s:4,t:6,v:flowIneqH},{s:4,t:7,v:flowIneqQ},
      {s:5,t:6,v:flowSocH},{s:5,t:7,v:flowSocQ}
    ].map(d=>({source:d.s,target:d.t,value:d.v}));

    const width=800, height=500;
    const sankeyGen = d3.sankey().nodeWidth(20).nodePadding(10)
                      .extent([[1,1],[width-1,height-6]]);

    const graph = { nodes: nodes.map(n=>({...n})), links };
    sankeyGen(graph);

    const svg = d3.select("#sankeyChart").append("svg")
                  .attr("width",width).attr("height",height);
    const numNodes = graph.nodes.length;

    // 2) sample `numNodes` t’s from t=0.3→1.0 on the Blues ramp 
    //    (so you avoid extremely pale almost-white)
    const blues = d3.quantize(t => d3.interpolateBlues(0.3 + 0.7*t), numNodes);
    
    // 3) build an ordinal scale mapping node‐index → a blue tint
    const color = d3.scaleOrdinal()
        .domain(d3.range(numNodes))
        .range(blues);
                  
    const tooltip = d3.select("#sankey-tooltip");

    svg.append("g").selectAll("path")
      .data(graph.links).enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d=>color(d.source.index))
        .attr("stroke-width", d=>Math.max(1,d.width))
        .attr("fill","none")
        .attr("stroke-opacity",0.4)
        .on("mouseover",(e,d)=>{
          d3.select(e.currentTarget).transition().duration(200)
            .attr("stroke-opacity",0.8).attr("stroke","#2196f3");
          tooltip.style("opacity",1)
            .html(`<strong>${d.source.name} → ${d.target.name}</strong><br/>${d.value.toFixed(2)}`)
            .style("left", (e.pageX+10)+"px").style("top", (e.pageY-15)+"px");
        })
        .on("mouseout",(e,d)=>{
          d3.select(e.currentTarget).transition().duration(200)
            .attr("stroke-opacity",0.4).attr("stroke", color(d.source.index));
          tooltip.style("opacity",0);
        });

    const node = svg.append("g").selectAll("g")
      .data(graph.nodes).enter().append("g");

    node.append("rect")
      .attr("x", d=>d.x0).attr("y", d=>d.y0)
      .attr("width", d=>d.x1-d.x0).attr("height", d=>d.y1-d.y0)
      .attr("fill",(d,i)=>color(i)).attr("stroke","#000");

    node.append("text")
      .attr("x", d=>d.x0<width/2?d.x1+6:d.x0-6)
      .attr("y", d=>(d.y0+d.y1)/2)
      .attr("dy","0.35em")
      .attr("text-anchor", d=>d.x0<width/2?"start":"end")
      .text(d=>d.name).style("font-size","12px");
  })
  .catch(err=>console.error("CSV error:", err));
});