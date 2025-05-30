export default async function getDynamicCarbonIntensity(): Promise<
  number | null
> {
  const timestamp = Math.floor(new Date().getTime() / 1000);
  try {
    const response = await fetch(
      `https://api.carbonintensity.org.uk/intensity/${timestamp}`
    );
    const data = await response.json();
    return data.data.intensity.actual;
  } catch (err) {
    console.error('Error on loading Carbon Intensity from API.');
    return null;
  }
}
