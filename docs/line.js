(function() {
  // ── Configuration: metric keys → friendly labels ────────────────────────────
  const metricsMap = {
    hdi:                        'Human Development Index',
    gnipc:                      'GNI per Capita',
    le:                         'Life Expectancy',
    eys:                        'Expected Years of Schooling',
    mys:                        'Mean Years of Schooling',
    happiness_score:            'Happiness Score',
    gdp_per_capita:             'GDP per Capita',
    social_support:             'Social Support',
    healthy_life_expectancy:    'Healthy Life Expectancy',
    freedom_to_make_life_choices: 'Freedom to Make Life Choices',
    generosity:                 'Generosity',
    perceptions_of_corruption:  'Perceptions of Corruption',
    'Quality of Life Index':           'Quality of Life Index',
    'Purchasing Power Index':          'Purchasing Power Index',
    'Safety Index':                    'Safety Index',
    'Health Care Index':               'Health Care Index',
    'Cost of Living Index':            'Cost of Living Index',
    'Property Price to Income Ratio':  'Property Price to Income Ratio',
    'Traffic Commute Time Index':      'Traffic Commute Time Index',
    'Pollution Index':                 'Pollution Index',
    'Climate Index':                   'Climate Index'
  };

  // ── Build the dropdown entirely in JS ─────────────────────────────────────
  const columnSelectEl = d3.select('#columnSelect').html('');
  Object.entries(metricsMap).forEach(([key, label], i) => {
    columnSelectEl.append('option')
      .attr('value', key)
      .property('selected', i === 0)
      .text(label);
  });
  let currentMetric = columnSelectEl.property('value');

  // ── Layout & SVG setup ─────────────────────────────────────────────────────
  const margin   = { top: 40, right: 150, bottom: 40, left: 60 },
        width    = 800 - margin.left - margin.right,
        height   = 600 - margin.top  - margin.bottom,
        flagSize = 20;

  const svg = d3.select('#chart-line')
    .append('svg')
      .attr('width',  width  + margin.left + margin.right)
      .attr('height', height + margin.top  + margin.bottom)
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select('#tooltip2');
  let animationTimer, dataByCountry, lineGen, x, y, colorScale;

  // ── Initialize scales & line generator (domains set later) ───────────────
  x = d3.scaleLinear().range([0, width]);
  y = d3.scaleLinear().range([height, 0]);
  colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  lineGen = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d[currentMetric]))
    .curve(d3.curveLinear);

  // ── Load data & flag JSON ─────────────────────────────────────────────────
  Promise.all([
    d3.csv('merged_dataset.csv', d3.autoType),
    d3.json('images/flag-icons-main/country.json')
  ]).then(([raw, flagsJSON]) => {
    // 1) filter to years 2015–2022
    const data = raw
      .map(d => { d.Year = +d.Year; return d; })
      .filter(d => d.Year >= 2015 && d.Year <= 2022);

    // 2) build flag lookup
    const flagMap = {};
    flagsJSON.forEach(d => flagMap[d.name] = d.flag_1x1);

    // 3) group by country & compute average (ignoring NaNs)
    let groups = d3.groups(data, d => d.country)
      .map(([country, vals]) => {
        // filter out entries where the metric is NaN
        const clean = vals.filter(v => Number.isFinite(v[currentMetric]));
        return {
          country,
          values: clean.sort((a,b)=>a.Year-b.Year),
          avg: d3.mean(clean, d => d[currentMetric])
        };
      })
      // drop any with no valid data
      .filter(d => Number.isFinite(d.avg));

    // 4) select top 10 by descending avg
    groups.sort((a,b) => b.avg - a.avg);
    dataByCountry = groups.slice(0, 10);

    // 5) log any missing flags
    const missingFlags = dataByCountry
      .map(d => d.country)
      .filter(c => !flagMap[c]);
    if (missingFlags.length) {
      console.warn("No flag found for:", missingFlags);
    }

    // 6) set up scales
    x.domain([2015, 2022]);
    updateYDomain();
    colorScale.domain(dataByCountry.map(d => d.country));
    function handleOver(event, d) {
      svg.selectAll('.country-line')
         .style('opacity', 0.3)
         .style('stroke-width', 4);
    
      d3.select(this)
         .style('opacity', 1)
         .style('stroke-width', 8);
    
      d3.select(this.parentNode)
         .select('text.country-label')
         .style('opacity', 1);
    }
    
    function handleMove(event, d) {
      const [mx] = d3.pointer(event, svg.node());
      const year = x.invert(mx);
      const pts  = interpolateUpTo(d.values, year);
      const last = pts[pts.length - 1];
    
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.country}</strong><br/>
          Year: ${Math.round(last.Year)}<br/>
          ${metricsMap[currentMetric]}: ${formatValue(last[currentMetric])}
        `)
        .style('left',  (event.pageX + 10) + 'px')
        .style('top',   (event.pageY - 28) + 'px');
    }
    
    function handleOut() {
      svg.selectAll('.country-line')
         .style('opacity', 0.2)
         .style('stroke-width', 4);
      svg.selectAll('text.country-label')
         .style('opacity', 0);
      tooltip.style('opacity', 0);
    }
    function attachLineInteractivity() {
      svg.selectAll('.country-line')
         .on('mouseover', handleOver)
         .on('mousemove', handleMove)
         .on('mouseout',  handleOut);
    }
    // 7) draw axes
    // X axis:
    const xAxisG = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));

    // make the axis line thicker:
    xAxisG.selectAll('path.domain')
      .attr('stroke-width', 2);    // or whatever px you like

    // make the tick-lines thicker/longer:
    xAxisG.selectAll('line.tick')
      .attr('stroke-width', 2)
      .attr('y2', 6);             // default inner tick length is 6px

    // increase tick-label font-size and weight:
    xAxisG.selectAll('text')
      .style('font-size', '14px')
      .style('font-weight', '400');


    // Y axis:
    const yAxisG = svg.append('g')
    .attr('class','y-axis')
    .call(d3.axisLeft(y));

    // same pattern:
    yAxisG.selectAll('path.domain')
      .attr('stroke-width', 2);

    yAxisG.selectAll('line.tick')
      .attr('stroke-width', 2)
      .attr('x2', -6);            // for left-facing ticks

    yAxisG.selectAll('text')
      .style('font-size', '14px')
    .style('font-weight', '400');



    // 8) bind country groups
    const countryG = svg.selectAll('.country-group')
      .data(dataByCountry).enter()
      .append('g')
        .attr('class','country-group');
    attachLineInteractivity();
    // 9) empty paths
    countryG.append('path')
      .attr('class','country-line')
      .attr('stroke', d => colorScale(d.country))
      .attr('fill','none')
      .attr('stroke-width',4)
      .attr('opacity',0.2)
      .attr('d', d => lineGen([]));

    // 10) end‐labels
    countryG.append('text')
      .attr('class','country-label')
      .attr('opacity',0)
      .each(function(d) {
        const last = d.values[d.values.length-1];
        const txt  = d3.select(this)
          .attr('x', x(last.Year)+20)
          .attr('y', y(last[currentMetric]));
        txt.append('tspan')
          .text(d.country)
          .attr('x', x(last.Year)+20)
          .attr('dy','0em');
        txt.append('tspan')
          .text(formatValue(last[currentMetric]))
          .attr('x', x(last.Year)+20)
          .attr('dy','1em');
      });

    // 11) flags at start
    countryG.append('image')
      .attr('class','flag')
      .attr('width', flagSize)
      .attr('height', flagSize)
      .attr('x', d => x(d.values[0].Year) - flagSize/2)
      .attr('y', d => y(d.values[0][currentMetric]) - flagSize/2)
      .attr('href', d => {
        const p = flagMap[d.country];
        return p
          ? `images/flag-icons-main/${p}`
          : 'images/flag-icons-main/default.svg';
      });

    /// ─── Hover‐tooltip on the lines ─────────────────────────────────────────────
    svg.selectAll('.country-line')
    .on('mouseover', function(event, d) {
      // dim all lines, highlight this one
      svg.selectAll('.country-line')
        .style('opacity', 0.3)
        .style('stroke-width', 4);
      d3.select(this)
        .style('opacity', 1)
        .style('stroke-width', 8);

      // make sure the end‐label is visible
      d3.select(this.parentNode).select('text.country-label')
        .style('opacity', 1);
    })
    .on('mousemove', function(event, d) {
      // map mouse X → year, then interpolate value
      const [mx] = d3.pointer(event, svg.node());
      const year = x.invert(mx);
      // get the interpolated data up to that year
      const pts = interpolateUpTo(d.values, year);
      const last = pts[pts.length - 1];
      const v   = last[currentMetric];

      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.country}</strong><br/>
          Year: ${Math.round(last.Year)}<br/>
          ${metricsMap[currentMetric]}: ${formatValue(v)}
        `)
        .style('left',  (event.pageX + 10) + 'px')
        .style('top',   (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      // reset all lines & hide tooltip
      svg.selectAll('.country-line')
        .style('opacity', 0.2)
        .style('stroke-width', 4);
      svg.selectAll('text.country-label')
        .style('opacity', 0);
      tooltip.style('opacity', 0);
    });
        // 13) animation loop
    function startAnimation() {
      if (animationTimer) animationTimer.stop();
      animationTimer = d3.timer(elapsed => {
        const t        = Math.min(elapsed / (200 * 7), 1);
        const currYear = 2015 + t*7;
        dataByCountry.forEach(c => c.curr = interpolateUpTo(c.values, currYear));
        svg.selectAll('.country-line')
          .data(dataByCountry)
          .attr('d', d => lineGen(d.curr));
        svg.selectAll('image.flag')
          .each(function(d) {
            const last = d.curr[d.curr.length-1];
            d3.select(this)
              .attr('x', x(last.Year)-flagSize/2)
              .attr('y', y(last[currentMetric]) - flagSize/2);
          });
        if (t === 1) animationTimer.stop();
      });
    }
    function stopAnimation() {
      if (animationTimer) animationTimer.stop();
    }

    // 14) play/pause on visibility
    new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? startAnimation() : stopAnimation());
    },{threshold:0.5})
    .observe(document.querySelector('#chart-line'));

    // 15) Reset button
    d3.select('#reset-animation').on('click', () => {
      stopAnimation();
      svg.selectAll('.country-line').attr('d', d => lineGen([]));
      svg.selectAll('image.flag')
        .attr('x', d => x(d.values[0].Year)-flagSize/2)
        .attr('y', d => y(d.values[0][currentMetric]) - flagSize/2);
      startAnimation();
    });

    // 16) on-change → recompute everything for new metric
    columnSelectEl.on('change', function() {
      stopAnimation();
      currentMetric = this.value;
      // rebuild lineGen, recalc averages & top 10
      lineGen = d3.line()
        .x(d => x(d.Year))
        .y(d => y(d[currentMetric]))
        .curve(d3.curveLinear);

      // re-group & top10
      groups = d3.groups(data, d => d.country)
        .map(([country, vals]) => {
          const clean = vals.filter(v => Number.isFinite(v[currentMetric]));
          return {
            country,
            values: clean.sort((a,b)=>a.Year-b.Year),
            avg: d3.mean(clean, d => d[currentMetric])
          };
        })
        .filter(d => Number.isFinite(d.avg))
        .sort((a,b) => b.avg - a.avg)
        .slice(0,10);
      dataByCountry = groups;
      // log missing flags
      const miss = dataByCountry.map(d=>d.country).filter(c=>!flagMap[c]);
      if (miss.length) console.warn("No flag for:", miss);

      updateYDomain();
      svg.select('.y-axis').transition().duration(500)
        .call(d3.axisLeft(y));

      // rebind data
      const cg = svg.selectAll('.country-group')
        .data(dataByCountry, d => d.country);

      cg.exit().remove();
      const cgEnter = cg.enter().append('g').attr('class','country-group');
      // append path / text / image on enter…
      cgEnter.append('path')
        .attr('class','country-line')
        .attr('stroke', d => colorScale(d.country))
        .attr('fill','none')
        .attr('stroke-width',4)
        .attr('opacity',0.2);
      cgEnter.append('text').attr('class','country-label').attr('opacity',0);
      cgEnter.append('image')
        .attr('class','flag')
        .attr('width',flagSize).attr('height',flagSize);

      // merge + reset
      const allCG = cgEnter.merge(cg);
      allCG.select('path.country-line').attr('d', d => lineGen([]));
      allCG.select('text.country-label').each(function(d){
        const last = d.values[d.values.length-1];
        const txt  = d3.select(this)
          .attr('x', x(last.Year)+20)
          .attr('y', y(last[currentMetric]));
        txt.selectAll('*').remove();
        txt.append('tspan').text(d.country).attr('x', x(last.Year)+20).attr('dy','0em');
        txt.append('tspan').text(formatValue(last[currentMetric])).attr('x',x(last.Year)+20).attr('dy','1em');
      });
      allCG.select('image.flag')
        .attr('href', d => flagMap[d.country]
          ? `images/flag-icons-main/${flagMap[d.country]}`
          : 'images/flag-icons-main/default.svg')
        .attr('x', d => x(d.values[0].Year)-flagSize/2)
        .attr('y', d => y(d.values[0][currentMetric]) - flagSize/2);
      attachLineInteractivity();
      startAnimation();
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    function interpolateUpTo(vals, cy) {
      const out  = vals.filter(v=>v.Year<=cy);
      const next = vals.find(v=>v.Year>cy);
      if (next) {
        if (out.length) {
          const prev = out[out.length-1],
                t    = (cy-prev.Year)/(next.Year-prev.Year);
          out.push({ Year: cy, [currentMetric]: prev[currentMetric] + t*(next[currentMetric]-prev[currentMetric]) });
        } else {
          out.push({ Year: cy, [currentMetric]: next[currentMetric] });
        }
      }
      return out;
    }
    function updateYDomain() {
      const allVals = dataByCountry.flatMap(c => c.values.map(v => v[currentMetric]));
      const yMin    = d3.min(allVals),
            yMax    = d3.max(allVals);
      y.domain([ Math.max(0, yMin*0.9), yMax ]);
    }
    function formatValue(v) {
      const n = +v;
      return isNaN(n) ? 'N/A' : n.toFixed(2);
    }
  })
  .catch(console.error);
})();
