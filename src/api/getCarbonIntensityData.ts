export default async function getDynamicCarbonIntensity(): Promise<
  number | null
> {
  try {
    const now = new Date();
    const endTime = now.toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fullUrl = `https://api.carbonintensity.org.uk/intensity/${twoDaysAgo}/${endTime}`;

    // const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    // const apiUrl = `https://api.carbonintensity.org.uk/intensity/${twoDaysAgo}/${endTime}`;
    // const fullUrl = proxyUrl + apiUrl;

    const response = await fetch(fullUrl);
    const data = await response.json();

    return data.data.intensity.actual;
  } catch (err) {
    console.error('Error on loading Carbon Intensity from API.');
    return null;
  }
}
