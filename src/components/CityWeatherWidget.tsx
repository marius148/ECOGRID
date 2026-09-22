import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Cloud, 
  CloudSun, 
  CloudRain, 
  CloudDrizzle, 
  CloudLightning, 
  CloudFog, 
  Snowflake, 
  Wind, 
  MapPin, 
  RefreshCw, 
  ArrowRight,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import ecoGridBgImg from '../assets/images/eco_grid_district_1784886799261.jpg';

export interface WeatherCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region?: string;
  country?: string;
}

export const POPULAR_CITIES: WeatherCity[] = [
  { id: 'montpellier', name: 'Montpellier', lat: 43.6108, lon: 3.8767, region: 'Occitanie' },
  { id: 'paris', name: 'Paris', lat: 48.8566, lon: 2.3522, region: 'Île-de-France' },
  { id: 'bordeaux', name: 'Bordeaux', lat: 44.8378, lon: -0.5792, region: 'Nouvelle-Aquitaine' },
  { id: 'lyon', name: 'Lyon', lat: 45.7640, lon: 4.8357, region: 'Auvergne-Rhône-Alpes' },
  { id: 'marseille', name: 'Marseille', lat: 43.2965, lon: 5.3698, region: "PACA" },
  { id: 'toulouse', name: 'Toulouse', lat: 43.6047, lon: 1.4442, region: 'Occitanie' },
  { id: 'nantes', name: 'Nantes', lat: 47.2184, lon: -1.5536, region: 'Pays de la Loire' },
  { id: 'nice', name: 'Nice', lat: 43.7102, lon: 7.2620, region: "PACA" },
  { id: 'lille', name: 'Lille', lat: 50.6292, lon: 3.0573, region: 'Hauts-de-France' },
  { id: 'strasbourg', name: 'Strasbourg', lat: 48.5734, lon: 7.7521, region: 'Grand Est' },
];

export interface SimpleDayWeather {
  dayLabel: string;
  shortLabel: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  windSpeed: number;
  precipProb: number;
  conditionLabel: string;
  isDay: boolean;
}

// Convert WMO weather code to standard condition name & Lucide icon
// Rule requested by user: "enleve ses ,nuages et la lune quand il fait nuit"
// When it's night (!isDay), no clouds and no moon icons! Return clean star/sparkle or clear sky icon!
export function getWeatherDetails(code: number, isDay: boolean = true) {
  if (!isDay) {
    if (code >= 61 && code <= 82) {
      return { label: 'Pluie nocturne', icon: CloudRain };
    }
    return { label: 'Nuit claire (Ciel dégagé)', icon: Sparkles };
  }

  switch (code) {
    case 0:
      return { label: 'Ensoleillé', icon: Sun };
    case 1:
      return { label: 'Ensoleillé', icon: CloudSun };
    case 2:
      return { label: 'Éclaircies', icon: CloudSun };
    case 3:
      return { label: 'Couvert', icon: Cloud };
    case 45:
    case 48:
      return { label: 'Brouillard', icon: CloudFog };
    case 51:
    case 53:
    case 55:
      return { label: 'Bruine', icon: CloudDrizzle };
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return { label: code >= 65 || code === 82 ? 'Fortes pluies' : 'Pluie', icon: CloudRain };
    case 71:
    case 73:
    case 75:
      return { label: 'Neige', icon: Snowflake };
    case 95:
    case 96:
    case 99:
      return { label: 'Orages', icon: CloudLightning };
    default:
      return { label: 'Variable', icon: CloudSun };
  }
}

interface CityWeatherWidgetProps {
  currentCity?: WeatherCity;
  onCityChange?: (city: WeatherCity) => void;
  className?: string;
}

export const CityWeatherWidget: React.FC<CityWeatherWidgetProps> = ({
  currentCity = POPULAR_CITIES[0],
  onCityChange,
  className = '',
}) => {
  const [selectedCity, setSelectedCity] = useState<WeatherCity>(currentCity);
  const [daysForecast, setDaysForecast] = useState<SimpleDayWeather[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    if (currentCity && currentCity.name !== selectedCity.name) {
      setSelectedCity(currentCity);
    }
  }, [currentCity]);

  // Fetch real live weather from Open-Meteo
  const fetchWeather = useCallback(async (city: WeatherCity) => {
    setIsLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur météo');
      const data = await res.json();

      if (data && data.daily && data.daily.time && data.current) {
        const list: SimpleDayWeather[] = data.daily.time.slice(0, 4).map((dateStr: string, idx: number) => {
          let dayLabel = "Aujourd'hui";
          let shortLabel = "Auj.";
          if (idx === 1) {
            dayLabel = "Demain";
            shortLabel = "Dem.";
          } else if (idx > 1) {
            const d = new Date(dateStr);
            const name = d.toLocaleDateString('fr-FR', { weekday: 'long' });
            dayLabel = name.charAt(0).toUpperCase() + name.slice(1);
            shortLabel = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
          }

          const isDayTime = idx === 0 ? data.current.is_day === 1 : true;
          const wCode = idx === 0 ? data.current.weather_code : data.daily.weather_code[idx];
          const cond = getWeatherDetails(wCode, isDayTime);

          return {
            dayLabel,
            shortLabel,
            temp: idx === 0 ? Math.round(data.current.temperature_2m) : Math.round(data.daily.temperature_2m_max[idx]),
            tempMin: Math.round(data.daily.temperature_2m_min[idx]),
            tempMax: Math.round(data.daily.temperature_2m_max[idx]),
            weatherCode: wCode,
            windSpeed: idx === 0 ? Math.round(data.current.wind_speed_10m) : Math.round(data.daily.wind_speed_10m_max[idx]),
            precipProb: Math.round(data.daily.precipitation_probability_max?.[idx] ?? 0),
            conditionLabel: cond.label,
            isDay: isDayTime,
          };
        });

        setDaysForecast(list);
        setLastUpdated(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      console.warn("Météo Open-Meteo indisponible temporairement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity, fetchWeather]);

  const handleCitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = POPULAR_CITIES.find(c => c.id === e.target.value);
    if (found) {
      setSelectedCity(found);
      setActiveDayIndex(0);
      if (onCityChange) onCityChange(found);
    }
  };

  const currentDay = daysForecast[activeDayIndex] || daysForecast[0];
  const weatherInfo = currentDay ? getWeatherDetails(currentDay.weatherCode, currentDay.isDay ?? true) : { label: 'Ensoleillé', icon: Sun };
  const WeatherIcon = weatherInfo.icon;

  const nextDay = () => {
    if (daysForecast.length === 0) return;
    setActiveDayIndex((prev) => (prev + 1) % daysForecast.length);
  };

  const nextDayName = daysForecast[(activeDayIndex + 1) % (daysForecast.length || 1)]?.shortLabel || 'Dem.';

  return (
    <div id="city-weather-widget" className={`p-4 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-xl group border border-slate-800 ${className}`}>
      {/* Background eco photo layer - exact match with original card */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
        style={{ backgroundImage: `url(${ecoGridBgImg})` }}
      />

      <div className="relative z-10 space-y-2.5">
        {/* Top line: Icon in emerald box + City Selector + Day Pills */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/80 backdrop-blur-md flex items-center justify-center text-white shadow-sm">
              <WeatherIcon className="w-4 h-4 animate-spin-slow" />
            </div>
            
            {/* Minimalist City Select - Native & clean with no blue */}
            <div className="relative">
              <select
                id="weather-city-select"
                value={selectedCity.id}
                onChange={handleCitySelect}
                aria-label="Sélectionner la ville météo"
                className="bg-slate-800/80 hover:bg-slate-700/80 text-white text-[11px] font-bold rounded-lg pl-2 pr-6 py-1 outline-none border border-slate-700/60 cursor-pointer appearance-none transition-colors"
              >
                {POPULAR_CITIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Simple Days Switcher: Auj. / Dem. / J+2 */}
          {daysForecast.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
              {daysForecast.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`weather-day-pill-${idx}`}
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                    activeDayIndex === idx 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={d.dayLabel}
                >
                  {d.shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Headline matching original "Clean Energy. Brighter Tomorrow" layout */}
        <div>
          <h4 className="font-extrabold text-sm text-white leading-snug">
            {currentDay?.dayLabel || "Aujourd'hui"} à {selectedCity.name}<br />
            <span className="text-emerald-400 font-extrabold text-base">
              {currentDay ? `${currentDay.temp}°C` : '...'}
            </span>
            <span className="text-slate-200 text-xs font-semibold ml-1.5">
              • {currentDay?.conditionLabel || 'Ensoleillé'}
            </span>
          </h4>
          
          <p className="text-[10px] text-slate-300 leading-relaxed font-medium mt-1">
            Vent : <span className="text-emerald-400 font-bold">{currentDay?.windSpeed ?? 12} km/h</span> • {currentDay && currentDay.precipProb > 0 ? `Pluie : ${currentDay.precipProb}%` : 'Ciel calme'}
            {currentDay && (
              <span className="text-slate-400 ml-1">
                (min {currentDay.tempMin}° / max {currentDay.tempMax}°)
              </span>
            )}
          </p>
        </div>

        {/* Action Button - exact same design as original card with emerald hover */}
        <button 
          type="button"
          id="weather-change-day-btn"
          onClick={nextDay}
          className="w-full mt-2 py-2 bg-white text-slate-900 rounded-xl text-[11px] font-extrabold hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
        >
          <span>Voir jour suivant ({nextDayName})</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
        </button>

        {/* Real data footer matching user screenshot */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Données réelles Open-Meteo
          </span>
          {lastUpdated && <span>Màj {lastUpdated}</span>}
        </div>
      </div>
    </div>
  );
};
