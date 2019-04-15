// document.querySelector('#map').textContent = 'Here comes the map';

let svgWidth = 700;
let svgHeight = 700;


let svg = d3.select('body')
    .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

svg.append('rect')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .style('stroke-width', 1)
    .style('stroke', 'black')
    .style('fill', 'white');


let g = svg.append('g');

let projection = d3.geoEquirectangular()
    .scale(300)
    .center([-50, 30]);
// let projection = d3.geoEquirectangular()
//     .scale(16000)
//     .center([-74.5, 40.5]);
let path = d3.geoPath().projection(projection);

const colorScale = d3.scaleOrdinal(d3.schemeCategory10); //colorScale for the different birds

Promise.all([
    d3.json('data/maps/world-50m.v1.json'),
    d3.csv('data/birds/allbirds.csv')
])
    .then((data, error) => {
        if (error) console.log(error);

        let map = data[0];
        let birds = data[1];

        // console.log(map);

        // console.log(birds[0]);
        // let position = [irma[0]['location-lat'], irma[0]['location-long']];
        // console.log(projection(position));

        g.append('path')
            .datum(topojson.feature(map, map.objects.countries))
            .attr('d', path);

        g.selectAll('circle')
            .data(birds)
            .enter()
            .append('circle')
            .attr('cx', d => getPosition(d)[0])
            .attr('cy', d => getPosition(d)[1])
            .attr('r', 3)
            .style("fill", d => colorScale(d["individual-local-identifier"]));

    });

function getPosition(d) {
    let pos = [d['location-long'], d['location-lat']];
    return projection(pos);
}
