'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnSumbitWorkout = document.querySelector('.fa-square-check');
const btnDeleteAll = document.querySelector('.delete-all');
const btnClose = document.querySelector('.fa-xmark');
const btnSort = document.querySelector('.sort');
const btnSortContainer = document.querySelector('.sortContainer');
const btnArrowUp = document.querySelector('.fa-arrow-up');
const btnArrowDown = document.querySelector('.fa-arrow-down');
const sortDivider = document.querySelector('.sort__devider');
const validationWrongInput = document.querySelector('.validation__msg');
const instructionMsg = document.querySelector('.instruction-msg');

class Workout {
  date = new Date();
  id = Date.now() + '';

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 15;
  #markerArray = [];
  #workoutElArray = [];
  #isEditMode = false;
  #currentWorkout;
  #currentWorkoutEl;
  #isSorted = false;
  constructor() {
    this._getPosition();
    //get data from localstorage
    this._getLocalStorage();

    form.addEventListener('submit', this._submitWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    btnSumbitWorkout.addEventListener('click', this._submitWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._handleWorkout.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
    btnSort.addEventListener('click', this._toggleSortBtns.bind(this));
    btnSortContainer.addEventListener('click', this._sortWorkouts.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    if (!this.#isEditMode) this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkOutMarker(work);
    });
  }
  _submitWorkout(e) {
    if (this.#isEditMode) {
      this._editWorkout(e, this.#currentWorkoutEl, this.#currentWorkout);
    } else {
      this._newWorkout(e);
    }
  }
  _showForm(mapE, workout) {
    form.classList.remove('hidden');
    inputDistance.focus();

    if (mapE) {
      this.#mapEvent = mapE;
    }

    if (workout) {
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      if (workout.type === 'running') {
        inputType.value = 'running';
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
        inputCadence.value = workout.cadence;
      } else {
        inputType.value = 'cycling';
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputElevation.value = workout.elevation;
      }
    }
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _toggleSortBtns() {
    btnSortContainer.classList.toggle('zero__height');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;

    const distance = +inputDistance.value;

    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._showErrorMessage('wrongInput');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this._showErrorMessage('wrongInput');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);

    this._renderWorkOutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }

  _showErrorMessage(type) {
    if (type === 'wrongInput') {
      validationWrongInput.classList.remove('display-none');
      setTimeout(() => {
        validationWrongInput.classList.add('display-none');
      }, 3000);
    }
  }
  _renderWorkOutMarker(workout) {
    let layer = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
    this.#markerArray.push(layer);
  }
  _renderWorkout(workout, curWorkoutEl) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__header">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout_edit-tab">
        <i class="fa-solid fa-pen-to-square"></i>
        <i class="fa-solid fa-trash-can"></i>
        </div>
        </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          
        `;
    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          </li>
          
            `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
            `;
    }
    if (this.#isEditMode) {
      curWorkoutEl.outerHTML = html;
    } else {
      sortDivider.insertAdjacentHTML('afterend', html);
      instructionMsg.classList.add('display-none');
    }
  }
  _handleWorkout(e) {
    if (!this.#map) return;
    let _;

    if (e.target.classList.contains('fa-xmark')) {
      this._hideForm();
    }

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#currentWorkout = workout;
    const workoutElId = workoutEl.dataset.id;
    const indexOfWorkoutEl = this.#workouts.findIndex(
      el => el.id === workoutElId
    );

    if (e.target.classList.contains('fa-trash-can')) {
      this._deleteWorkout(workoutEl, indexOfWorkoutEl);
      return;
    }
    if (e.target.classList.contains('fa-pen-to-square')) {
      this.#currentWorkoutEl = workoutEl;

      this.#isEditMode = true;

      this._showForm(_, workout);

      return;
    }

    this._setIntoView(workout);
  }
  _sortWorkouts(e) {
    if (!this.#map) return;
    const sortBtnEl = e.target.closest('.sort_button-container');
    if (!sortBtnEl) return;
    const sortType = sortBtnEl.dataset.type;
    let sortOrder = sortBtnEl.dataset.order;

    let sortedArray = [];

    // prettier-ignore
    document.querySelectorAll('.fa-arrow-up').forEach(el => el.classList.remove('display-none'));
    // prettier-ignore
    document.querySelectorAll('.fa-arrow-down').forEach(el => el.classList.remove('display-none'));

    if (sortOrder === 'desc') {
      sortBtnEl.dataset.order = 'acs';

      sortBtnEl.querySelector('.fa-arrow-up').classList.add('display-none');
      // prettier-ignore
      sortBtnEl.querySelector('.fa-arrow-down').classList.remove('display-none');

      // prettier-ignore
      document.querySelectorAll('.workout').forEach(workout => workout.remove());

      sortedArray = this.#workouts
        .slice()
        .sort((a, b) => b[sortType] - a[sortType]);
    } else if (sortOrder === 'acs') {
      sortBtnEl.dataset.order = 'desc';

      sortBtnEl.querySelector('.fa-arrow-down').classList.add('display-none');
      // prettier-ignore
      sortBtnEl.querySelector('.fa-arrow-up').classList.remove('display-none');

      // prettier-ignore
      document.querySelectorAll('.workout').forEach(workout => workout.remove());

      sortedArray = this.#workouts
        .slice()
        .sort((a, b) => a[sortType] - b[sortType]);
    } else {
      document
        .querySelectorAll('.workout')
        .forEach(workout => workout.remove());
      sortedArray = this.#workouts;
    }
    const lastWorkout = sortedArray.at(-1);
    this._setIntoView(lastWorkout);
    sortedArray.forEach(sortedWorkout => {
      this._renderWorkout(sortedWorkout);
    });
  }
  _editWorkout(e, workoutEl, workout) {
    if (!this.#map) return;
    if (!workout) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    const editType = inputType.value;
    const editDistance = +inputDistance.value;
    const editDuration = +inputDuration.value;

    workout.type = editType;

    workout.duration = editDuration;
    workout.distance = editDistance;

    if (!workout.description.includes(editType.toUpperCase())) {
      if (workout.description.includes('Running')) {
        workout.description = workout.description.replace('Running', 'Cycling');
      } else {
        workout.description = workout.description.replace('Cycling', 'Running');
      }
    }

    if (editType === 'running') {
      const editCadence = +inputCadence.value;
      if (
        !validInputs(editDistance, editDuration, editCadence) ||
        !allPositive(editDistance, editDuration, editCadence)
      )
        return this._showErrorMessage('wrongInput');
      // change workout data
      // prettier-ignore
      [workout.distance, workout.duration,workout.cadence] = [editDistance, editDuration, editCadence]
      workout.cadence = editCadence;
      workout.pace = editDuration / editDistance;
    }

    if (editType === 'cycling') {
      const editElevation = +inputElevation.value;
      if (
        !validInputs(editDistance, editDuration, editElevation) ||
        !allPositive(editDistance, editDuration, editElevation)
      )
        return this._showErrorMessage('wrongInput');
      // prettier-ignore
      [workout.distance, workout.duration, workout.elevation] = [editDistance, editDuration, editElevation];
      workout.elevationGain = editElevation;
      workout.speed = editDistance / (editDuration / 60);
    }
    this._renderWorkOutMarker(workout);
    this._renderWorkout(workout, workoutEl);
    this._hideForm();
    this.#isEditMode = false;

    this._setLocalStorage();
  }
  _deleteWorkout(workoutEl, indexOfWorkoutEl) {
    if (!this.#map) return;
    if (!workoutEl) return;
    workoutEl.remove();
    this.#workouts.splice(indexOfWorkoutEl, 1);
    this.#markerArray[indexOfWorkoutEl].remove(this.#map);
    this.#markerArray.splice(indexOfWorkoutEl, 1);
    const lastWorkout = this.#workouts.at(-1);
    this._setIntoView(lastWorkout);
    this._setLocalStorage();
    if (this.#workouts.length <= 0) {
      instructionMsg.classList.remove('display-none');
    }
  }
  _deleteAllWorkouts() {
    if (!this.#map) return;
    if (!this.#workoutElArray) return;
    this.#workoutElArray = document.querySelectorAll('.workout');
    let i = this.#markerArray.length - 1;
    while (i >= 0) {
      this.#markerArray[i].remove(this.#map);
      this.#workoutElArray[i].remove();
      i--;
    }
    localStorage.removeItem('workouts');
    instructionMsg.classList.remove('display-none');

    // location.reload();
  }
  _setIntoView(workout) {
    if (!this.#map) return;
    if (!workout) return;
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    return this.#map;
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      work =
        work.type === 'running'
          ? Object.setPrototypeOf(work, Running.prototype)
          : Object.setPrototypeOf(work, Cycling.prototype);
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
