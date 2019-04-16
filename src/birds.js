// document.querySelector('#map').textContent = 'Here comes the map';

let svgWidth = 700;
let svgHeight = 600;


let svg = d3.select('#map')
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


Promise.all([
    d3.json('data/maps/world-50m.v1.json'),
    d3.csv('data/birds/leo.csv')
])
.then((data, error) => {
    if (error) console.log(error);

    let map = data[0];
    let bird = data[1];

    drawMap(map);
    let timeSlider = drawSlider(bird);
    let currentDate = d3.timeFormat('%Y-%m-%d')(timeSlider.value());
    drawBird(bird, currentDate);

    timeSlider.on('onchange', val => {
        let currentDate = d3.timeFormat('%Y-%m-%d')(val);
        moveBird(bird, currentDate);
    });

    const playButton = document.querySelector('#play');
    playButton.onclick = () => play(bird, timeSlider);
});


function drawMap(map) {
    g.append('path')
        .datum(topojson.feature(map, map.objects.countries))
        .attr('d', path);
}

function drawSlider(bird) {
    let timeData = bird.map(d => new Date(d.timestamp));
    const year = '2005';

    let timeSlider = d3.sliderBottom()
        // .min(timeData.find(d => d.getFullYear().toString() === year))
        // .max(new Date(year + '-12-31'))
        .min(d3.min(timeData))
        .max(d3.max(timeData))
        .step(1000 * 60 * 60 * 24)
        .width(650)
        .ticks(12)
        .tickFormat(d3.timeFormat('%Y'))
        .displayFormat(d3.timeFormat('%d.%m.%Y'));

    let gSlider = d3.select('#sliderTime')
        .append('svg')
        .attr('width', 700)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30, 30)');

    gSlider.call(timeSlider);
    return timeSlider;
}

function drawBird(bird, currentDate) {
    g.selectAll('.bird-position').remove();
    g.append('circle')
        .datum(bird.find(b => b.timestamp === currentDate))
        .attr('class', 'bird-position')
        .attr('cx', d => getPosition(d)[0])
        .attr('cy', d => getPosition(d)[1])
        .attr('r', 3)
        .style('fill', 'red');
}

function moveBird(bird, currentDate) {
    const transition = d3.transition()
        .duration(100)
        .ease(d3.easeLinear);

    g.select('.bird-position')
        .datum(bird.find(b => b.timestamp === currentDate))
        .transition(transition)
        .attr('cx', d => getPosition(d)[0])
        .attr('cy', d => getPosition(d)[1]);
}

function getPosition(d) {
    let pos = [d['location-long'], d['location-lat']];
    return projection(pos);
}

function play(bird, timeSlider) {
    let start = null;

    function step(timestamp) {
        if (! start) {
            start = timestamp;
        }

        let progress = timestamp - start;
        let i = Math.round(progress / 10);
        timeSlider.value(new Date(bird[i].timestamp));

        if (i < bird.length - 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

