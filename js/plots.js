
function cleanProvenance(){
  d3.json('data/mvnv-study/provenance/provenance.json').then((data) => {
  
    //filter out entries with no provenance graphs;
    let cleanData = data.filter(d=>d.data.provGraphs);

    //create visType field in provenance data;
    cleanData.map(d=>{
      d.data.provGraphs.map(p=>{
        p.visType = p.nodePos ?  'nodeLink' : 'adjMatrix'
      })
    })

    function download(content, fileName, contentType) {
      var a = document.createElement("a");
      var file = new Blob([content], {type: contentType});
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
  }
  // download(JSON.stringify(cleanData), 'provenance_clean.json', 'text/plain');

  })
}

function inspectResults(){

  d3.csv('data/mvnv-study/results/results.csv').then((data) => {
    console.log(data)
  })


}

function processViolin(id,metric,facet,domain){

  //Read the data
  d3.csv('data/mvnv-study/results/results.csv').then((data) => {

    let violinData=[];
    
    let taskLabels = [... new Set(data.columns.filter(c=>c.includes('S-')).map(c=>c.split('.')[0]))]

     data.map(d=>{
      
      taskLabels.map(r=>{
        let metricKey = data.columns.filter(c=>c.includes(metric) && c.includes(r));
        let facetKey = data.columns.filter(c=>c.includes(facet) && c.includes(r));
        violinData.push(
          {[metric]:d[metricKey],
            [facet]:d[facetKey]
          })
      }) 
      })

      violinPlot(id,metric, facet, violinData,domain )
      
    })

}
function violinPlot(id,metric, facet, data, domain ) {


  // set the dimensions and margins of the graph
  var margin = { top: 80, right: 30, bottom: 30, left: 60 },
    width = 500 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#"+id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

    data.map(d => d[metric] = Number(d[metric]))
    let distinctFacetValues = [... new Set(data.map(d => d[facet]))];


    // Build and Show the Y scale
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(distinctFacetValues)
      .padding(0.05)     // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.


    svg.append("g").call(d3.axisLeft(y))

    // Build and Show the X scale. It is a band scale like for a boxplot: each group has an dedicated RANGE on the axis. This range has a length of x.bandwidth

    let xDomain = d3.extent(data, d => d[metric]);
    var x = d3.scaleLinear()
      .domain(domain || xDomain)
      .range([0, width])

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))

    // Features of the histogram
    var histogram = d3.histogram()
      .domain(x.domain())
      .thresholds(x.ticks(20))    // Important: how many bins approx are going to be made? It is the 'resolution' of the violin plot
      .value(d => d)



    // Compute the binning for each group of the dataset
    var sumstat = d3.nest()  // nest function allows to group the calculation per level of a factor
      .key(function (d) { return d[facet]; })
      .rollup(function (d) {   // For each key..
        input = d.map(function (g) { return g[metric]; })    // Keep the variable called sepal-length
        bins = histogram(input)   // And compute the binning on it.
        return (bins)
      })
      .entries(data)



    // What is the biggest number of value in a bin? We need it cause this value will have a width of 100% of the bandwidth.
    var maxNum = 0
    for (i in sumstat) {
      allBins = sumstat[i].value
      lengths = allBins.map(function (a) { return a.length; })
      longuest = d3.max(lengths)
      if (longuest > maxNum) { maxNum = longuest }
    }

    // The maximum width of a violin must be x.bandwidth = the width dedicated to a group
    var xNum = d3.scaleLinear()
      .range([0, y.bandwidth()])
      .domain([-maxNum, maxNum])

    // Color scale for dots
    // var myColor = d3.scaleSequential()
    //   .interpolator(d3.interpolateInferno)
    //   .domain([3,9])

    // Add the shape to this svg!
    svg
      .selectAll("myViolin")
      .data(sumstat)
      .enter()        // So now we are working group per group
      .append("g")
      .attr("transform", function (d) { return ("translate(0," + y(d.key) + ")") }) // Translation on the right to be at the group position
      .append("path")
      .datum(function (d) { return (d.value) })     // So now we are working bin per bin
      .style("stroke", "none")
      .style("fill", "grey")
      .attr("d", d3.area()
        .y0(xNum(0))
        .y1(function (d) { return (xNum(d.length)) })
        .x(function (d) { return (x(d.x0)) })
        .curve(d3.curveCatmullRom)    // This makes the line smoother to give the violin appearance. Try d3.curveStep to see the difference
      )

    // Add individual points with jitter
    var jitterWidth = 20
    let radius = 3;
    let padding = 1.5;

    svg
      .selectAll(".scatter")
      .data(data)
      .enter()
      .append("circle")
      .classed('scatter', true)
      .attr("cy", function (d) { return (y(d[facet]) + y.bandwidth() / 2 - Math.random() * jitterWidth) }) //
      .attr("cx", function (d) { return (x(d[metric])) })
      // .attr("r", 5)
      // .style("fill", function(d){ return(myColor(d.Sepal_Length))})
      .attr("stroke", "white")

    // Add title to graph
    if (d3.selectAll('.violinTitle').size()<1){
      svg.append("text")
      .attr('class','violinTitle')
      .attr("x", 0)
      .attr("y", -50)
      .attr("text-anchor", "left")
      .style("font-size", "22px")
      .text("Results for Accuracy and Time");
    }
    

    // Add subtitle to graph
    svg.append("text")
      .attr("x", 0)
      .attr("y", -20)
      .attr("text-anchor", "left")
      .style("font-size", "14px")
      .style("fill", "grey")
      .style("max-width", 400)
      .text("Violin Plots for " + metric + " Metrics");



}


// function taskMenu(id) {

//   // set the dimensions and margins of the graph
//   let parentElement = d3.select('#' + id).node().getBoundingClientRect();
//   var margin = { top: 10, right: 30, bottom: 30, left: 20 },
//     width = parentElement.width - margin.left - margin.right,
//     height = parentElement.height - margin.top - margin.bottom;

//   // append the svg object to the body of the page
//   var svg = d3.select("#" + id)
//     .append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform",
//       "translate(" + margin.left + "," + margin.top + ")");


//   // Read the data and compute summary statistics for each specie
//   d3.csv('data/intent-study/results.csv').then((data) => {
//     // d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/iris.csv").then(data=> {

//     let taskKey = 'taskId';

//     let taskValues = [... new Set(data.map(d => d[taskKey]))].sort((a, b) => Number(a) > Number(b) ? -1 : 1);


//     // Build and Show the Y scale
//     var y = d3.scaleBand()
//       .range([height, 0])
//       .domain(taskValues)
//       .padding(0.05)     // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.


//     // svg.append("g").call(d3.axisLeft(y))
//     let padding = 2;

//     let barHeight = 12;
//     let barWidth = width / 2;
//     let allTasksWidth = width / 3;
//     let barOffset = allTasksWidth + padding;


//     //AllTasks Selector

//     svg
//       .append('rect')
//       .attr('class', 'allTasks')
//       .style("stroke", "none")
//       .style("fill", "grey")
//       .attr('x', 0)
//       .attr('y', 0)
//       .attr('width', allTasksWidth)
//       .attr('height', height)

//     svg
//       .selectAll(".taskBox")
//       .data(data)
//       .join('rect')
//       .attr('class', 'taskBox')
//       .style("stroke", "none")
//       .style("fill", "grey")
//       .attr('x', barOffset)
//       .attr('y', d => y(d[taskKey]))
//       .attr('width', barWidth)
//       .attr('height', barHeight)

//     svg
//       .selectAll(".taskLabel")
//       .data(data)
//       .join('text')
//       .attr('class', 'taskLabel')
//       .attr('x', barOffset)
//       .attr('y', d => y(d[taskKey]))
//       .attr('dy', barHeight)
//       .text(d => d.taskId)

//   })

// }

function eventSummary(id) {

  // set the dimensions and margins of the graph
  let parentElement = d3.select('#' + id).node().getBoundingClientRect();
  var margin = { top: 10, right: 30, bottom: 30, left: 100 },
    width = parentElement.width - margin.left - margin.right,
    height = parentElement.height - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // d3.json('data/intent-study/JSON/study_provenance.json').then((data) => {
  d3.json('data/mvnv-study/provenance/provenance_0.json').then((data) => {
    //create dictionary of Events

    let allEvents = {};
    data.map(d => {

      d.data.provGraphs ? d.data.provGraphs.map(dd => {
        let event = allEvents[dd.event];
        if (event) {
          allEvents[dd.event] = allEvents[dd.event] + 1;
        } else {
          if (dd.event) {
            allEvents[dd.event] = 1;
          }
        }
      }) : ''

    })

    let events = Object.keys(allEvents).sort((a, b) => allEvents[a] > allEvents[b] ? 1 : -1);


    // Build and Show the Y scale
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(events)
      .padding(0.05)     // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.

    var x = d3.scaleLinear()
      .domain(d3.extent(Object.values(allEvents)))
      .range([0, width])

    svg.append("g").call(d3.axisLeft(y))


    svg
      .selectAll(".eventBox")
      .data(events)
      .join('rect')
      .attr('class', 'eventBox')
      .style("stroke", "none")
      .style("fill", "grey")
      .attr('x', 0)
      .attr('y', d => y(d))
      .attr('width', d => x(allEvents[d]))
      .attr('height', 10)

    svg
      .selectAll(".eventCountLabel")
      .data(events)
      .join('text')
      .attr('class', 'eventCountLabel')
      .attr('x', 0)
      .attr('y', d => y(d))
      .text(d => allEvents[d])
      .style('alignment-baseline', 'top')


  })
}

function heatMap(id,facet) {

  // set the dimensions and margins of the graph
  var margin = { top: 80, right: 210, bottom: 30, left: 20 },
    width = 350 - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  //Read the data
  d3.json('data/mvnv-study/provenance/provenance_clean.json').then((data) => {

    //create dictionary of Events

    let allEvents = {};
    let allFacets =[];
    data.map(d => {

     d.data.provGraphs.map(dd => {
        
      let event = allEvents[dd.event];

        if (event) {
          if (allEvents[dd.event][dd[facet]] ){
            allEvents[dd.event][dd[facet]] = allEvents[dd.event][dd[facet]] + 1;
          } else {
            allEvents[dd.event][dd[facet]] =  1;
            allFacets.push(dd[facet]);
          }
        } else {
          if (dd.event) {
            allEvents[dd.event] = {[dd[facet]]:1};
            allFacets.push(dd[facet]);

          }
        }
      }) 

    })

    let events = Object.keys(allEvents).sort((a, b) => allEvents[a] > allEvents[b] ? 1 : -1);

    let eventData = events.map(e=>{
        return Object.keys(allEvents[e]).map(f=>{
          return {variable:e,group:f,value:allEvents[e][f]}})
        }).flat()


    // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'
    var myGroups = [... new Set(allFacets)]
    var myVars = events;


    let chartWidth = myGroups.length*60;

    // Build X scales and axis:
    var x = d3.scaleBand()
      .range([0, chartWidth])
      .domain(myGroups)
      .padding(0.25);

    svg.append("g")
      .style("font-size", 15)
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickSize(0))
      .select(".domain").remove()

    // Build Y scales and axis:
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars)
      .padding(0.2);

      svg.append("g")
      .style("font-size", 15)
      .call(d3.axisRight(y).tickSize(0))
      .attr("transform", "translate("+chartWidth + ",0)")

      .select(".domain").remove()
      .style('fill','white')

    // Build color scale
    var myColor =d3.scaleSequential(function(t) {    
      return d3.interpolateViridis((t/1.5)) })
    
      // .interpolator(d3.interpolateInferno)
      .domain(d3.extent(eventData.map(d=>d.value)).reverse())

    // // create a tooltip
    // var tooltip = d3.select("#" + id)
    //   .append("div")
    //   .style("opacity", 0)
    //   .attr("class", "tooltip")
    //   .style("background-color", "white")
    //   .style("border", "solid")
    //   .style("border-width", "2px")
    //   .style("border-radius", "5px")
    //   .style("padding", "5px")

    // // Three function that change the tooltip when user hover / move / leave a cell
    // var mouseover = function (d) {
    //   tooltip
    //     .style("opacity", 1)
    //   d3.select(this)
    //     .style("stroke", "black")
    //     .style("opacity", 1)
    // }
    // var mousemove = function (d) {
    //   tooltip
    //     .html("The exact value of<br>this cell is: " + d.value)
    //     .style("left", (d3.mouse(this)[0] + 70) + "px")
    //     .style("top", (d3.mouse(this)[1]) + "px")
    // }
    // var mouseleave = function (d) {
    //   tooltip
    //     .style("opacity", 0)
    //   d3.select(this)
    //     .style("stroke", "none")
    //     .style("opacity", 0.8)
    // }

    // add the squares
    svg.selectAll()
      .data(eventData, function (d) { return d.group + ':' + d.variable; })
      .enter()
      .append("rect")
      .attr("x", d=>x(d.group) )
      .attr("y", d=>y(d.variable))
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) { return myColor(d.value) })
      .style("stroke-width", 4)
      .style("stroke", "none")
      .style("opacity", 0.8)


      // add the labels
    svg.selectAll()
    .data(eventData)
    .enter()
    .append("text")
    .attr("x", d=>x(d.group) + x.bandwidth()/2 )
    .attr("y", d=>y(d.variable) + y.bandwidth()/2)
    .style("opacity", 0.8)
    .style('fill','white')
    .text(d=>d.value)
    .style('alignment-baseline','middle')
    .style('text-anchor','middle')


      // .on("mouseover", mouseover)
      // .on("mousemove", mousemove)
      // .on("mouseleave", mouseleave)
  })

 

  // Add title to graph
  svg.append("text")
    .attr("x", 0)
    .attr("y", -50)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .text("Event Heatmap");

  // Add subtitle to graph
  svg.append("text")
    .attr("x", 0)
    .attr("y", -20)
    .attr("text-anchor", "left")
    .style("font-size", "14px")
    .style("fill", "grey")
    .style("max-width", 400)
    .text("Event counts as a function of study condition");


}


function taskMenu(id,metric,facet) {

  // set the dimensions and margins of the graph
  var margin = { top: 80, right: 20, bottom: 30, left: 20 },
    width = 350 - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#" + id)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  //Read the data
  d3.csv('data/mvnv-study/results/results.csv').then((data) => {

    //create dictionary of Events
    let allFacets =[];
    let facetValues = data.columns.filter(c=>c.includes(facet));
    
    data.map(d=>{
      facetValues.map(f=>{
        allFacets.push(d[f]);
      })
    })

   allFacets = [... new Set(allFacets)]

    let taskLabels = [... new Set(data.columns.filter(c=>c.includes('S-')).map(c=>c.split('.')[0]))]
    
    let allTasks = {};
    taskLabels.push('All Tasks')
    taskLabels.map(label=>{
      allTasks[label]={};
       allFacets.map(f=>{
        allTasks[label][f]=[];
       })
    });


    data.map(d=>{
      //only  look at keys that contain the metric and keep track of the visType;
      let metricCols = data.columns.filter(c=>c.includes(metric));
      metricCols.map(m=>{
        let value = Number(d[m]);
        let taskNum = m.split('.')[0];
        let visTypeCol= data.columns.filter(c=>c.includes(taskNum) && c.includes(facet))[0];
        
        allTasks[taskNum][d[visTypeCol]].push(value);
        allTasks['All Tasks'][d[visTypeCol]].push(value);

      })
      
    })

    let tasks = Object.keys(allTasks) //.sort((a, b) => allEvents[a] > allEvents[b] ? 1 : -1);

    let taskData = tasks.map(e=>{
        return Object.keys(allTasks[e]).map(f=>{
          let average = allTasks[e][f].reduce((a,b) => a + b, 0) / allTasks[e][f].length
          return {variable:e,group:f,value:Math.round(average*100)/100}})
        }).flat()


    // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'
    var myGroups = allFacets
    var myVars = tasks;


    let chartWidth = myGroups.length*30;

    // Build X scales and axis:
    var x = d3.scaleBand()
      .range([0, chartWidth])
      .domain(myGroups)
      // .tickFormat(function (d) {
      //   return d == 'nodeLink' ? 'NL' :'AM';
      // })
      .padding(0.1)
     

    let plotGroup = svg.append("g").attr('id','taskList')
    .attr("transform",
      "translate(0,10)");

    plotGroup.append("g")
      .style("font-size", 15)
      // .attr("transform", "translate(0," + height + ")")
      .call(d3.axisTop(x).tickSize(0))
      .select(".domain").remove()

    // Build Y scales and axis:
    var y = d3.scaleBand()
      .range([height, 0])
      .domain(myVars)
      .padding(0.1);

    let barScale = d3.scaleLinear()
    .domain(d3.extent(taskData.map(d=>d.value)))
    .range([0,y.bandwidth()])

    plotGroup.append("g")
      .style("font-size", 15)
      .call(d3.axisRight(y).tickSize(0))
      .attr("transform", "translate("+chartWidth + ",0)")

      .select(".domain").remove()
      .style('fill','white')

    // Build color scale
    var myColor =d3.scaleSequential(function(t) {    
      return d3.interpolateBuPu((t)) })
    
      // .interpolator(d3.interpolateInferno)
      .domain(d3.extent(taskData.map(d=>d.value)))

    // add the squares
    plotGroup.selectAll()
      .data(taskData, function (d) { return d.group + ':' + d.variable; })
      .enter()
      .append("rect")
      .attr("x", d=>x(d.group) )
      .attr("y", d=>y(d.variable))
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", function (d) { return myColor(d.value) })
      .style("stroke-width", 4)
      .style("stroke", "none")
      .style("opacity", 0.8)


      // add the labels
      plotGroup.selectAll('.accLabel')
    .data(taskData)
    .enter()
    .append("text")
    .attr('class','accLabel')
    .attr("x", d=>x(d.group) + x.bandwidth()/2 )
    .attr("y", d=>y(d.variable) + y.bandwidth()/2)
    .style("opacity", 0.8)
    // .style('fill','white')
    .text(d=>d.value)
    .style('alignment-baseline','middle')
    .style('text-anchor','middle')

    d3.select('#taskList').selectAll('.tick')
    .on("mouseover",function(d){ d3.select(this).select('text').style('font-weight','bold')})
    .on("mouseleave",function(d){ d3.select(this).select('text').style('font-weight','normal')})
      .style('cursor','hand')

      // .on("mouseover", mouseover)
      // .on("mousemove", mousemove)
      // .on("mouseleave", mouseleave)
  })

 

  // Add title to graph
  svg.append("text")
    .attr("x", 0)
    .attr("y", -50)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .text("Accuracy Summary");

  // Add subtitle to graph
  svg.append("text")
    .attr("x", 0)
    .attr("y", -20)
    .attr("text-anchor", "left")
    .style("font-size", "14px")
    .style("fill", "grey")
    .style("max-width", 400)
    .text("Mean Task Accuracy");


}