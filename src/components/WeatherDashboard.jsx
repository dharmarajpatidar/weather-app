import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { FaHamburger } from "react-icons/fa";
import { FiSearch, FiMapPin, FiSettings } from "react-icons/fi";
import { WiRaindrops, WiStrongWind } from "react-icons/wi";
import MapPinEmoji from "./ui/MapPin";

const API_KEY = "12d63a7bc9f622b999e0fd8c9bb0e103";

const formatDay = (dt, tzOffset = 0) =>
    new Date((dt + (tzOffset || 0)) * 1000).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
const formatHour = (dt, tzOffset = 0) =>
    new Date((dt + (tzOffset || 0)) * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function WeatherDashboard() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [cur, setCur] = useState(null);
    const [fc, setFc] = useState(null);
    const [tzOffset, setTzOffset] = useState(0);

    useEffect(() => { fetchWeather("Hyderabad"); }, []);

    async function fetchWeather(city) {
        if (!city) { setErr("Please provide a city name"); return; }
        setErr(""); setLoading(true);
        try {
            const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
            if (!resp.ok) throw new Error("City not found");
            const data = await resp.json();
            setCur(data);

            const lat = data.coord.lat;
            const lon = data.coord.lon;

            try {
                const onecallResp = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${API_KEY}`);
                if (!onecallResp.ok) throw new Error("OneCall unavailable");
                const one = await onecallResp.json();
                setFc(one);
                setTzOffset(one.timezone_offset || data.timezone || 0);
            } catch {
                const fResp = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
                if (!fResp.ok) throw new Error("Forecast not available");
                const fJson = await fResp.json();
                setFc(aggregateForecastFrom3Hour(fJson));
                setTzOffset(fJson.city?.timezone || data.timezone || 0);
            }
        } catch (e) {
            setErr(e.message || "Failed to fetch"); setCur(null); setFc(null);
        } finally { setLoading(false); }
    }

    function aggregateForecastFrom3Hour(f3) {
        const hourly = f3.list.map(it => ({ dt: it.dt, temp: it.main.temp, pop: it.pop ?? 0, weather: it.weather }));
        const dailyMap = {};
        const tz = f3.city?.timezone || 0;
        hourly.forEach(h => {
            const dayKey = new Date((h.dt + tz) * 1000).toISOString().slice(0, 10);
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { temps: [], pops: [], weathers: [], dt: h.dt };
            dailyMap[dayKey].temps.push(h.temp);
            dailyMap[dayKey].pops.push(h.pop);
            dailyMap[dayKey].weathers.push(h.weather?.[0]?.main || "");
        });
        const daily = Object.values(dailyMap).map(d => ({
            dt: d.dt,
            temp: { min: Math.min(...d.temps), max: Math.max(...d.temps) },
            pop: d.pops.length ? d.pops.reduce((a, b) => a + b, 0) / d.pops.length : 0,
            weather: [{ main: mostCommon(d.weathers) || "Clear" }]
        }));
        return { hourly, daily, timezone_offset: tz, city: f3.city || null };
    }

    function mostCommon(arr) {
        if (!arr?.length) return null;
        const counts = {}; arr.forEach(x => counts[x] = (counts[x] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    const onSearch = () => { if (!q) return setErr("Enter city"); fetchWeather(q.trim()); setQ(""); };

    const iconFor = (w) => {
        if (!w) return "🌥"; const id = w.weather?.[0]?.id || w.id || 800;
        if (id >= 200 && id < 600) return "🌧"; if (id >= 600 && id < 700) return "❄️";
        if (id >= 700 && id < 800) return "🌫"; if (id === 800) return "☀️"; if (id > 800) return "⛅"; return "🌥";
    };
    const shouldShowRain = () => { const main = cur?.weather?.[0]?.main?.toLowerCase() || ""; const id = cur?.weather?.[0]?.id || 0; return cur && (main.includes("rain") || main.includes("drizzle") || main.includes("thunder") || (id >= 200 && id < 600)); };
    const isThunder = () => { const main = cur?.weather?.[0]?.main?.toLowerCase() || ""; return main.includes("thunder") || (cur?.weather?.[0]?.id >= 200 && cur?.weather?.[0]?.id < 300); };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 p-4 md:p-6 font-sans text-white relative overflow-hidden">
            {shouldShowRain() && (
                <div className={`rain-wrap pointer-events-none absolute inset-0 z-10 ${isThunder() ? "thunder" : ""}`}>
                    <div className="raindrops" />
                    {isThunder() && <div className="lightning absolute inset-0 pointer-events-none"></div>}
                </div>
            )}

            <div className="max-w-[1200px] mx-auto relative z-20 flex flex-col md:flex-row gap-4">
                <aside className="w-full md:w-20 flex md:flex-col flex-row md:gap-6 gap-2 justify-around md:justify-start items-center md:items-center bg-white/5 rounded-xl p-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><FaHamburger /></div>
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">■</div>
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><FiSettings /></div>
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"> <MapPinEmoji/> </div>
                    <div className="mt-auto w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">⤴</div>
                </aside>

                <main className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex items-center flex-1 gap-3 bg-white/8 backdrop-blur-sm p-3 rounded-xl">
                            <FiSearch className="text-white/80" size={18} />
                            <input className="bg-transparent outline-none placeholder:text-white/60 text-white flex-1" placeholder="Search for location" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearch()} />
                            <button onClick={onSearch} className="bg-white text-blue-700 px-4 py-2 rounded-md font-semibold">Search</button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center"> <Bell/> </div>
                            <div className="w-10 h-10 rounded-full bg-white/8 overflow-hidden"><img src="https://i.pravatar.cc/40" alt="avatar" className="w-full h-full object-cover" /></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <section className="bg-white/6 rounded-2xl p-4 backdrop-blur-md border border-white/6">
                            <div className="flex flex-col sm:flex-row justify-between">
                                <div>
                                    <div className="text-sm text-white/80">Current Weather</div>
                                    <div className="text-xs text-white/60">{cur ? new Date((cur.dt + (tzOffset || cur.timezone || 0)) * 1000).toLocaleTimeString() : ""}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl sm:text-5xl font-bold">{cur ? Math.round(cur.main.temp) : "--"}°C</div>
                                    <div className="text-sm text-white/80 mt-1 capitalize">{cur ? cur.weather[0].description : "—"}</div>
                                </div>
                            </div>

                            {cur && (
                                <div className="mb-6 text-center">
                                    <h2 className="text-2xl sm:text-3xl font-semibold text-white/90">
                                        {cur.name}, {cur.sys?.country}
                                    </h2>
                                    <div className="text-sm text-white/70 mt-1">
                                        {new Date(
                                            (cur.dt + (tzOffset || cur.timezone || 0)) * 1000
                                        ).toLocaleTimeString()}
                                    </div>
                                    <div className="mt-2 text-lg font-medium text-cyan-300">
                                        {Math.round(cur.main.temp)}°C – {cur.weather[0].description}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                <div className="w-20 h-20 rounded-xl bg-white/8 flex items-center justify-center text-3xl sm:text-4xl">{cur ? iconFor(cur) : "🌥"}</div>
                                <div className="flex-1 flex flex-col gap-2 text-sm text-white/80">
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2"><WiRaindrops size={18} /> {fc ? `${Math.round((fc.daily?.[0]?.pop || 0) * 100)}%` : "—"}</div>
                                        <div className="flex items-center gap-2"><WiStrongWind size={18} /> {cur ? `${Math.round(cur.wind.speed)} km/h` : "—"}</div>
                                        <div className="flex items-center gap-2">💧 {cur ? `${cur.main.humidity}%` : "—"}</div>
                                    </div>
                                    <div className="text-xs text-white/70">
                                        <div>Visibility: {cur ? `${(cur.visibility / 1000).toFixed(1)} km` : "—"}</div>
                                        <div>Pressure: {cur ? `${cur.main.pressure} hPa` : "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white/6 rounded-2xl p-2 backdrop-blur-md border border-white/6">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <h3 className="font-semibold text-sm">Map</h3>
                                <div className="text-xs text-white/70">Live</div>
                            </div>
                            <div className="w-full h-48 sm:h-60 rounded-lg overflow-hidden border border-white/8">
                                {cur ? (
                                    <iframe
                                        title="map"
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(cur.coord.lon - 0.5).toFixed(3)}%2C${(cur.coord.lat - 0.5).toFixed(3)}%2C${(cur.coord.lon + 0.5).toFixed(3)}%2C${(cur.coord.lat + 0.5).toFixed(3)}&layer=mapnik&marker=${cur.coord.lat}%2C${cur.coord.lon}`}
                                        style={{ filter: "grayscale(10%)", opacity: 0.95 }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/60"><FiMapPin size={24} /></div>
                                )}
                            </div>
                        </section>

                        <aside className="bg-white/6 rounded-2xl p-3 backdrop-blur-md border border-white/6">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="font-semibold text-sm">Popular Cities</h3>
                                <button className="text-xs bg-white/8 px-2 py-1 rounded">View more</button>
                            </div>
                            <ul className="space-y-2 text-sm text-white/90">
                                {["Delhi", "Mumbai", "Hyderabad", "Bangalore", "Kolkata"].map((city) => (
                                    <li key={city} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center">☁️</div>
                                            {city}
                                        </div>
                                        <div className="text-xs text-white/70">Weather</div>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    </div>

                    <section className="bg-white/6 rounded-2xl p-4 backdrop-blur-md border border-white/6 mt-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-sm">Summary</h3>
                            <div className="flex gap-2 text-xs flex-wrap">
                                <button className="px-3 py-1 bg-white/8 rounded">Summary</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="col-span-1 space-y-2">
                                {fc?.daily?.slice(0, 7).map((d, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/3 p-2 rounded-lg">
                                        <div>
                                            <div className="text-sm">{formatDay(d.dt, tzOffset)}</div>
                                            <div className="text-xs text-white/70">{d.weather[0].main}</div>
                                        </div>
                                        <div className="text-right text-xs">
                                            {Math.round(d.temp.max)}° / {Math.round(d.temp.min)}° <br />
                                            {Math.round(d.pop * 100)}% rain
                                        </div>
                                    </div>
                                )) || <div className="text-white/70">No forecast</div>}
                            </div>

                            <div className="col-span-2 w-full bg-white/5 rounded-xl p-4">
                                {fc?.hourly?.length ? (
                                    <div className="flex gap-4 overflow-x-auto scrollbar-hide scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                                        {fc.hourly.slice(0, 12).map((h, i) => {
                                            const hour = new Date((h.dt + tzOffset) * 1000).getHours();
                                            return (
                                                <div key={i} className="flex flex-col items-center justify-end gap-2 min-w-[40px]">
                                                    <div className="text-sm font-medium text-white">
                                                        {Math.round(h.temp)}°
                                                    </div>
                                                    <div className="w-3 sm:w-4 rounded-t-lg bg-gradient-to-t from-blue-400/40 to-cyan-300/70 transition-all duration-300 hover:from-blue-500/60 hover:to-cyan-400" style={{ height: `${h.temp * 5}px` }} />
                                                    <div className="text-[10px] text-white/70 whitespace-nowrap">
                                                        {hour}:00
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-white/60 text-sm">
                                        Hourly data not available
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            {loading && (<div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40"><div className="bg-black/30 p-4 rounded">Loading...</div></div>)}
            {err && (<div className="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-2 rounded shadow z-40">{err}</div>)}

            <style>{`
        .rain-wrap { z-index: 15; }
        .raindrops::before { animation: rain-fall 0.9s linear infinite; }
        .raindrops::after { animation: rain-slow 1.2s linear infinite; }
        .lightning { animation: flash 3s linear infinite; }
        .rain-wrap.thunder .lightning { animation-duration: 2.4s; }
      `}</style>
        </div>
    );
}