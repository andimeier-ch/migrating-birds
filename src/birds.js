// document.querySelector('#map').textContent = 'Here comes the map';

let svgWidth = 700;
let svgHeight = 600;


let map = d3.select('#map')
    .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

map.append('rect')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .style('stroke-width', 1)
    .style('stroke', 'black')
    .style('fill', 'white');


let gMap = map.append('g');

let projection = d3.geoEquirectangular()
    .scale(300)
    .center([-50, 30]);
// let projection = d3.geoEquirectangular()
//     .scale(16000)
//     .center([-74.5, 40.5]);
let path = d3.geoPath().projection(projection);


let birdSelect = document.querySelector('#bird-select');
birdSelect.onchange = event => {
    loadData(birdSelect.value)
};

loadData(birdSelect.value);

function loadData(file) {
    Promise.all([
        d3.json('data/maps/world-50m.v1.json'),
        d3.csv(`data/birds/${file}.csv`)
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
        const player = BirdPlayer(playButton, bird, timeSlider);
        // playButton.onclick = event => player.togglePlay(bird, timeSlider);

    });
}

function drawMap(map) {
    gMap.append('path')
        .datum(topojson.feature(map, map.objects.countries))
        .attr('d', path);
}

function drawSlider(bird) {
    d3.selectAll('#sliderTime svg').remove();

    let timeData = bird.map(d => new Date(d.timestamp));

    let timeSlider = d3.sliderBottom()
        .min(d3.min(timeData))
        .max(d3.max(timeData))
        .step(1000 * 60 * 60 * 24)
        .width(650)
        .ticks(12)
        .tickFormat(d3.timeFormat('%Y'))
        .displayFormat(d3.timeFormat('%d.%m.%Y'));

    let gSlider = d3.selectAll('#sliderTime')
        .append('svg')
        .attr('width', 700)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30, 30)');

    gSlider.call(timeSlider);
    return timeSlider;
}

function drawBird(bird, currentDate) {
    gMap.selectAll('.bird-position').remove();

    gMap.append('circle')
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

    gMap.select('.bird-position')
        .datum(bird.find(b => b.timestamp === currentDate))
        .transition(transition)
        .attr('cx', d => getPosition(d)[0])
        .attr('cy', d => getPosition(d)[1]);
}

function getPosition(d) {
    let pos = [d['location-long'], d['location-lat']];
    return projection(pos);
}

// function togglePlay(bird, timeSlider, event) {
//     isPlaying = !isPlaying;
//
//     if (isPlaying) {
//         play(bird, timeSlider);
//         event.target.textContent = 'Pause';
//     } else {
//         event.target.textContent = 'Play';
//     }
// }

// function play(bird, timeSlider) {
//     let start = null;
//
//     function step(timestamp) {
//         if (!animationStart) {
//             animationStart = timestamp;
//         }
//
//         let progress = timestamp - animationStart;
//         let i = Math.round(progress / 10);
//         timeSlider.value(new Date(bird[i].timestamp));
//
//         if (i < bird.length - 1) {
//             requestAnimationFrame(step);
//         }
//     }
//
//     requestAnimationFrame(step);
// }


const BirdPlayer = (button, bird, timeSlider) => {
    let isPlaying = false;
    let animationStart = null;

    button.onclick = () => togglePlay();

    const togglePlay = () => {
        isPlaying = !isPlaying;

        if (isPlaying) {
            requestAnimationFrame(play);
            button.textContent = 'Pause';
        } else {
            button.textContent = 'Play';
        }
    };

    const play = (timestamp) => {
        if (!animationStart) {
            animationStart = timestamp;
        }

        let progress = timestamp - animationStart;
        let i = Math.round(progress / 10);
        timeSlider.value(new Date(bird[i].timestamp));

        if (i < bird.length - 1 && isPlaying) {
            requestAnimationFrame(play);
        }
    };


};
