'use strict';

//console.log((new Date() + '').slice(0, 24))
// 1- Class Workout
class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    //clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; // in km
        this.duration = duration; // in min

    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }

}

// Child class 1
class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this._setDescription();
        this.calcPace();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

// Child class 2
class Cycling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

////////////////////////////////////////////////////////////////////////

////// APPLICATION ARCHITECTURE //////

////////////////////////////////////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    // private fields
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Attach event handlers:
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

        // Load workouts from localStorage
        this._getLocalStorage();
    }
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
                function () {
                    alert('Could not ger your position');
                })
        }

    }
    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        this.#map = L.map('map').setView([latitude, longitude], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        this.#map.on('click', this._showForm.bind(this));
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle("form__row--hidden");
        inputCadence.closest('.form__row').classList.toggle("form__row--hidden");
    }
    _newWorkout(e) {
        // helper functions
        const validInput = (...inputs) => {
            return inputs.every(inp => Number.isFinite(inp));
        }
        const allPositive = (...inputs) => {
            return inputs.every(inp => inp > 0);
        }
        e.preventDefault();
        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        // If workout running, create running object
        if (type === "running") {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // if workout cycling, create cycling object
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration)) {
                return alert('Inputs have to be positive numbers!');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        // Add new object to workout array
        console.log(workout);
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Hide form and clear Input fields
        this._hideForm();

        // Store workouts in LocalStorage
        this._setLocatStorage();

    }
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.type === "running" ? "?????????????" : "?????????????"} ${workout.description}`)
            .openPopup();
    }
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "?????????????" : "?????????????"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">???</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if (workout.type === 'running') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">??????</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">????????</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
        }

        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details">
                <span class="workout__icon">??????</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">???</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
         `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
        // using the public interface
        //workout.click();
        //console.log(workout);
    }

    _setLocatStorage() {
        localStorage.setItem('workout', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workout'));
        //console.log(data);

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            setTimeout(() => this._renderWorkoutMarker(work), 100);
        })
    }

    reset() {
        localStorage.removeItem("workout");
        location.reload();
    }

}

const app = new App();

