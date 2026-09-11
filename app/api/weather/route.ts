export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const latitude = Number(url.searchParams.get('latitude') ?? 42.73586);
    const longitude = Number(url.searchParams.get('longitude') ?? -83.41883);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return Response.json({ error: 'Invalid location.' }, { status: 400 });
    }
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day', hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset', temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: 'auto', forecast_days: '5' }).toString();
    let weatherResponse = await fetch(weatherUrl, { headers: { accept: 'application/json' } });
    if (!weatherResponse.ok) weatherResponse = await fetch(weatherUrl, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!weatherResponse.ok) throw new Error('Weather provider error');
    const weather = await weatherResponse.json();
    return Response.json({ ...weather, alerts: [] }, { headers: { 'cache-control': 'public, max-age=300, s-maxage=600' } });
  } catch {
    return Response.json({ error: 'Weather is temporarily unavailable.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
