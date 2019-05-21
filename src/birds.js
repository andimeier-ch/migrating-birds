// load bird data
let birdSelect = document.querySelector('#bird-select');
loadData(birdSelect.value);

birdSelect.onchange = event => {
    loadData(birdSelect.value)
};


// create map
const map = L.map('map')
    .setView([25, 30], 2.5)

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

L.svg().addTo(map);

let birdplayer;

function loadData(file) {
    d3.selectAll('.bird-position').remove();
    d3.csv(`data/birds/${file}.csv`)
    .then(bird => {
        let timeSlider = initSlider(bird);
        let currentDate = d3.timeFormat('%Y-%m-%d')(timeSlider.value());
        drawBird(bird, currentDate);

        const playButton = document.querySelector('#play');
        birdplayer = BirdPlayer(playButton, bird, timeSlider);

        map.on('moveend', update);
    });
}

function initSlider(bird) {
    let timeSlider = drawSlider(bird);
    let currentDate = d3.timeFormat('%Y-%m-%d')(timeSlider.value());

    timeSlider.on('onchange', val => {
        let currentDate = d3.timeFormat('%Y-%m-%d')(val);
        drawBird(bird, currentDate);
        birdplayer.setSliderPosition(val);
        d3.select('#currentDate').html(currentDate); //set date on view
    });
    return timeSlider;
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
    bird.forEach(d => {
        if(d.timestamp === currentDate){
            if(d3.select('#'+d['individual-local-identifier']).empty()){ //if bird is not shown on map yet
                d3.select('#map svg')                                    //create a new circle
                .datum(d)
                .append('circle')
                .attr('id', d['individual-local-identifier'])
                .attr('class', 'bird-position')
                .attr('cx', getPosition(d).x)
                .attr('cy', getPosition(d).y)
                .attr('r', 3)
                .style('fill', 'red');
            }
            else {                                                      //otherwise just move the existing circle
                const transition = d3.transition()
                .duration(100)
                .ease(d3.easeLinear);

                d3.select('#'+d['individual-local-identifier'])
                .transition(transition)
                .attr('cx', getPosition(d).x)
                .attr('cy', getPosition(d).y);
            }
        }
    })

}


function update() {
    d3.selectAll('.bird-position')
        .attr('cx', d => getPosition(d).x)
        .attr('cy', d => getPosition(d).y);
}

function getPosition(d) {
    let pos = [d['location-lat'], d['location-long']];
    return map.latLngToLayerPoint(pos);
}

function BirdPlayer(button, bird, timeSlider) {
    let isPlaying = false;
    let sliderPosition = timeSlider.value();

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
        timeSlider.value(sliderPosition);
        sliderPosition.setDate(sliderPosition.getDate() + 1);

        if (isPlaying && sliderPosition <= timeSlider.max()) {
            // setTimeout(() => requestAnimationFrame(play), 50);
            requestAnimationFrame(play);
        }
    };

    return {
        setSliderPosition: pos => sliderPosition = pos
    };
}
