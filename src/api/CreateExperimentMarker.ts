export default async function createExperimentMarker() {
  fetch('/api/contents/test/START_EXPERIMENT', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'file', format: 'text', content: '' })
  });
  //   const basePath = '/api/contents/experiment_logs';
  //   const markerPath = `${basePath}/START_EXPERIMENT`;

  //   // First, check if experiment_logs directory exists
  //   const dirResponse = await fetch(basePath);
  //   if (dirResponse.status === 404) {
  //     // Create the directory
  //     await fetch(basePath, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ type: 'directory' })
  //     });
  //   } else if (!dirResponse.ok) {
  //     console.error(`Error checking experiment_logs: ${dirResponse.statusText}`);
  //     return;
  //   }

  //   // Now, create the marker file
  //   const fileResponse = await fetch(markerPath, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ type: 'file', format: 'text', content: '' })
  //   });

  //   if (fileResponse.ok) {
  //     console.log('Marker file created successfully.');
  //   } else {
  //     console.error(`Error creating marker file: ${fileResponse.statusText}`);
  //   }
}
