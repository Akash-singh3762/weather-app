const my_key = '85500a86b6522522254e838b30515f42'
const day_array = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const icn = (pic) => ` http://openweathermap.org/img/wn/${pic}@2x.png`
let selectedCityText
let selectedCity

const getCitiesUsingGeolocation = async (searchText) => {
  const response = await fetch(
    `http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${my_key}`
  )

  return response.json()
}
// current Forecast
let fix_temp = (temp) => `${temp.toFixed(1)}\u00B0`
let fetchCurrentApi = async ({ lat, lon, name: city }) => {
  const url =
    lat && lon
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${my_key}&units=metric`
      : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${my_key}&units=metric`
  const response = await fetch(url)
  const result = await response.json()
  return result
}
let LoadCurrentForecast = ({
  name,
  main: { temp, temp_min, temp_max },
  weather: [{ description }],
}) => {
  document.querySelector('#city-name').textContent = name
  document.querySelector('#temp').textContent = `${fix_temp(temp)}`
  document.querySelector('#discription').textContent = description
  document.querySelector('#min-max').textContent = `L : ${fix_temp(
    temp_min
  )} | H : ${fix_temp(temp_max)}`
}

//hourly forecast
let fetchHourlyApi = async ({ name: city }) => {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${my_key}&units=metric`
  )
  const result = await response.json()
  return result.list.map((forecast) => {
    const {
      main: { temp, temp_max, temp_min },
      weather: [{ description, icon }],
      dt,
      dt_txt,
    } = forecast

    return { temp, temp_max, temp_min, description, icon, dt_txt }
  })
}

let LoadHourlyForecast = (
  { main: { temp: curr_temp }, weather: [{ icon: curr_icon }] },
  hourly
) => {
  let data = hourly.slice(2, 14)
  const timeFormatter = Intl.DateTimeFormat('en', {
    hour12: true,
    hour: 'numeric',
  })
  let inner = `<article>
          <h3>Now</h3>
          <img src="${icn(curr_icon)}" id="icon">
          <p id="htemp">${curr_temp}\u00B0</p>
         </article>`
  for (let { dt_txt, icon, temp } of data) {
    inner += `<article>
          <h3>${timeFormatter.format(new Date(dt_txt))}</h3>
          <img src="${icn(icon)}" id="icon">
          <p id="htemp">${temp}\u00B0</p>
         </article>`
  }
  document.querySelector('.Hourly-container').innerHTML = inner
}
// Loading feels like
let LoadFeelsLike = ({ main: { feels_like } }) => {
  document.querySelector('#feels-temp').textContent = fix_temp(feels_like)
}
// Loading LoadHumidity

let LoadHumidity = ({ main: { humidity } }) => {
  document.querySelector('#h_value').textContent = `${humidity}%`
}

// loading 5 day data
let getRequiredData = (hourly) => {
  let mp = new Map()
  for (let forecast of hourly) {
    let date = forecast.dt_txt.split(' ')[0]
    let day = day_array[new Date(date).getDay()]

    if (mp.has(day)) {
      let oldforecast = mp.get(day)
      oldforecast.push(forecast)
      mp.set(day, oldforecast)
    } else {
      mp.set(day, [forecast])
    }
  }
  for (let [key, value] of mp) {
    let temp_min = Math.min(...Array.from(value, (val) => val.temp_min))
    let temp_max = Math.max(...Array.from(value, (val) => val.temp_max))
    let img = value.find((val) => val.icon).icon
    mp.set(key, { temp_min, temp_max, icon: img })
  }
  return mp
}
let LoadFiveDayData = (hourly) => {
  let data = getRequiredData(hourly)

  let inner = ``
  Array.from(data).map(([day, { temp_min, temp_max, icon }], index) => {
    if (index < 5) {
      inner += `<article class="one-day-forecast">
        <h3 class="day">${index === 0 ? 'today' : day}</h3>
        <img src="${icn(icon)}" alt="">
        <p class="temp_min">${fix_temp(temp_min)}</p>
        <p  class = "temp_max">${fix_temp(temp_max)}</p>
       </article>`
    }
  })
  document.querySelector('#five-day-forecast-container').innerHTML = inner
}
const debounce = (fun) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fun.apply(this, args)
    }, 500)
  }
}
const eventForSearch = async (event) => {
  let { value } = event.target

  if (!value) {
    selectedCity = null
    selectedCityText = ''
  }
  if (value && selectedCityText !== value) {
    const listOfCities = await getCitiesUsingGeolocation(value)
    // console.log('cities print kro', listOfCities)
    let options = ``

    for (let { lat, lon, name, state, country } of listOfCities) {
      options += `<option data-city-details='${JSON.stringify({ lat, lon, name })}' value="${name}, ${state}, ${country}"></option>`
    }
    document.querySelector('#cities').innerHTML = options
  }
}
const handleCitySelection = (event) => {
  selectedCityText = event.target.value
  // console.log(selectedCityText)
  let options = document.querySelectorAll('#cities>option')
  if (options?.length) {
    let selectedOption = Array.from(options).find(
      (opt) => opt.value === selectedCityText
    )

    // console.log(selectedOption.getAttribute("data-city-details"))
    selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
    loadData()
  }

}
const debounceSearch = debounce(eventForSearch)

const loadData = async () => {
  const current = await fetchCurrentApi(selectedCity)
  LoadCurrentForecast(current)
  const hourly = await fetchHourlyApi(current)
  LoadHourlyForecast(current, hourly)
  LoadFeelsLike(current)
  LoadHumidity(current)
  LoadFiveDayData(hourly)
}


const loadForecastUsingGeoLocation = () => {
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const { latitude: lat, longitude: lon } = coords;
    selectedCity = { lat, lon };
    loadData();
  }, error => console.log(error))
}
document.addEventListener('DOMContentLoaded', async () => {
  loadForecastUsingGeoLocation();
  const searchBar = document.querySelector('#search')
  searchBar.addEventListener('input', debounceSearch)
  searchBar.addEventListener('change', handleCitySelection)
})
