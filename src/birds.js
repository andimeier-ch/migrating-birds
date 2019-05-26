let birdplayer;

//setup bird-select and initial birdData
const birdSelect = document.querySelector('#bird-select');
loadData(birdSelect.value);
setupBirdSelectListener(birdSelect); //reload data according to selected bird

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

let sightingsCurrentDate;

function initSlider(bird) {
    let timeSlider = drawSlider(bird);

    timeSlider.on('onchange', val => {
        let currentDate = d3.timeFormat('%Y-%m-%d')(val);
        sightingsCurrentDate = d3.timeFormat('%Y-%m')(val);

        drawBird(bird, currentDate);
        birdplayer.setSliderPosition(val);
        d3.select('#currentDate').html(d3.timeFormat('%b, %Y')(val)); //set date on view
        updateSightingsMap(sightingsCurrentDate); 
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
                d3.select('.leaflet-birds-pane svg')                     //create a new circle
                .datum(d)
                .append('circle')
                .attr('id', d['individual-local-identifier'])
                .attr('class', 'bird-position')
                .attr('cx', getPosition(d).x)
                .attr('cy', getPosition(d).y)
                .attr('r', 5)
                .style('fill', 'white');
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
            if(d['last-timestamp-flag'] === "true"){                    //remove bird once last timestamp was reached
                d3.select('#'+d['individual-local-identifier']).remove();
            }
        }
    })

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
           setTimeout(() => requestAnimationFrame(play), 200); //TODO: make speed adjustable
        //    requestAnimationFrame(play);
        }
    };

    return {
        setSliderPosition: pos => sliderPosition = pos
    };
}


// create base-map
const map = L.map('map').setView([5, -80], 2.5);

// create satellite-map-layer
const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);

// create birdsPane and SVG-layer
const birdsPane = setupBirdsPane(map);

//create geojson-layer
let geojson;
const geoJsonStyle = {
    stroke: true,
    color: 'black',
    weight: 0.5,
    fill: true,
    fillColor: 'transparent',
    fillOpacity: 0.8
}
setupGeoJson();

//all countries on geojson-layer
const countries = d3.select('.leaflet-overlay-pane').selectAll('path');

//colorScale for sightings and its legend
const sigthingsColorScale = d3.scaleSequential(d3.interpolateBrBG).domain([200,-150]);
const legend = setupSightingsLegend();

function setupGeoJson(){
    d3.json('data/maps/americas.geo.json')
    .then(function(data){
        geojson = L.geoJSON(data.features, {
            clickable: false,
            style: geoJsonStyle,
            onEachFeature: onEachFeature
    }).addTo(map);
    return data;
    })
    .then(function(data){
        d3.select('.leaflet-overlay-pane')
        .selectAll('path')
        .data(data.features)
})
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightCountry,
        mouseout: resetHighlight,
    });
}

//create color-legend for sightings. Taken from https://leafletjs.com/examples/choropleth/
function setupSightingsLegend(){
    let legend = L.control({position: 'bottomleft'});
    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend'),
          grades = [-100, -50, 0, 50, 100, 150, 200],
          labels = ["-100%","-50%","0","+50%","+100%","+150%", "+200%"];
          div.innerHTML += '<p>Sichtungen im Vergleich zum Vormonat</p><br>'
      for (var i = 0; i < grades.length; i++) {
          div.innerHTML +=
              '<i style="background:' + sigthingsColorScale(grades[i]) + '; border: 0.2px solid black"></i> ' +
              labels[i] + '<br>';
      }
      return div;
  };
  return legend.addTo(map); 
} 

//data-structure to save most recent sightingsData, used to compare with new data
let sightingsDataArray = new Array();

function updateSightingsMap(currentDate){
    d3.csv('data/sightings/sightings_alldata.csv')
        .then(function(sightingsData){
            sightingsData.forEach(r => {
                if(r['indicator'] == currentDate){
                    const transition = d3.transition()
                            .duration(100)
                            .ease(d3.easeLinear);
            
                    let country = d3.select('.leaflet-overlay-pane').selectAll("path")
                        .filter(function(d) {
                            return d.properties['iso_a2'] === r['country']
                            ;});
                    if(sightingsDataArray[r['country']] === undefined) {sightingsDataArray[r['country']] = 0; return ;} //if no previous value exists, initiate with 0
                    if(sightingsDataArray[r['country']] === r['sum']){return ;} //if no change can be detected, exit function

                    country.transition(transition)
                        .attr("fill", d => {
                            return sigthingsColorScale((r['sum'] - sightingsDataArray[r['country']]) / sightingsDataArray[r['country']] * 100); //calculate change in %
                        });

                    sightingsDataArray[r['country']] = r['sum']; //save new value
                }
            })
        })
}

function highlightCountry(e){
    let countryname = e.target.feature.properties['name'];
    let countryAbbr = e.target.feature.properties['iso_a2'];

    d3.select('#countryname').html(countryname);
    d3.select('#sightings-number').html(Math.trunc(sightingsDataArray[countryAbbr]));

    //TODO: country-borders
}

function resetHighlight(e) {
    d3.select('#countryname').html("");
    d3.select('#sightings-number').html("");
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

function setupBirdSelectListener(birdSelect){
    birdSelect.onchange = event => {
        loadData(birdSelect.value)
    };
}

function toggleSightingsMap(){
    const sightingsCheckbox = document.querySelector('#sightings');
    const sightingsMap = document.querySelector('.leaflet-overlay-pane');
    sightingsCheckbox.checked ? sightingsMap.style.display = 'block' : sightingsMap.style.display = 'none';
}

//set up mapPane for birds
function setupBirdsPane(map){
    map.createPane('birds') //create custom pane for birds
    map.getPane('birds').style.zIndex = 650; //put pane on top of sightings-map
    map.getPane('birds').style.pointerEvents = 'none';
    return L.svg({pane: 'birds'}).addTo(map);
}
