// Simulated API response
const fetchSimulatedData = async () => {
  return [
    {
      id: 'egi-dc-1-4500-1',
      sci: 12.33,
      time: 4500,
      availability: '++',
      dataCentres: [
        {
          name: 'EGI Data Centre 1',
          location: 'Amsterdam, Netherlands',
          coordinates: { lat: 52.3676, lng: 4.9041 },
          details: {
            cpu: { usage: '20.00', time: 1200, frequency: '3.00' },
            memory: { energy: '500.00', used: 512000 },
            network: { io: '25.00', connections: 5 }
          },
          workload_percent: 60
        },
        {
          name: 'EGI Data Centre 2',
          location: 'Frankfurt, Germany',
          coordinates: { lat: 50.1109, lng: 8.6821 },
          details: {
            cpu: { usage: '14.12', time: 1500, frequency: '3.21' },
            memory: { energy: '376.45', used: 824512 },
            network: { io: '20.00', connections: 4 }
          },
          workload_percent: 40
        }
      ],
      details: {
        cpu: {
          usage: '34.12',
          time: 4523,
          frequency: '3.21'
        },
        memory: {
          energy: '876.45',
          used: 924532
        },
        network: {
          io: '45.23',
          connections: 12
        }
      }
    },
    {
      id: 'egi-dc-2-5200-2',
      sci: 14.12,
      time: 5200,
      availability: '+',
      dataCentres: [
        {
          name: 'EGI Data Centre 3',
          location: 'Paris, France',
          coordinates: { lat: 48.8566, lng: 2.3522 },
          details: {
            cpu: { usage: '22.00', time: 2000, frequency: '2.90' },
            memory: { energy: '400.00', used: 614400 },
            network: { io: '30.00', connections: 8 }
          },
          workload_percent: 100
        }
      ],
      details: {
        cpu: {
          usage: '29.87',
          time: 4821,
          frequency: '2.87'
        },
        memory: {
          energy: '654.32',
          used: 803214
        },
        network: {
          io: '67.89',
          connections: 25
        }
      }
    },
    {
      id: 'egi-dc-3-4300-3',
      sci: 10.89,
      time: 4300,
      availability: '+++',
      dataCentres: [
        {
          name: 'EGI Data Centre 4',
          location: 'Rome, Italy',
          coordinates: { lat: 41.9028, lng: 12.4964 },
          details: {
            cpu: { usage: '23.50', time: 3000, frequency: '3.10' },
            memory: { energy: '600.00', used: 1024000 },
            network: { io: '35.00', connections: 7 }
          },
          workload_percent: 50
        },
        {
          name: 'EGI Data Centre 5',
          location: 'Madrid, Spain',
          coordinates: { lat: 40.4168, lng: -3.7038 },
          details: {
            cpu: { usage: '21.82', time: 2500, frequency: '3.05' },
            memory: { energy: '580.00', used: 974500 },
            network: { io: '43.00', connections: 6 }
          },
          workload_percent: 50
        }
      ],
      details: {
        cpu: {
          usage: '45.32',
          time: 4120,
          frequency: '3.10'
        },
        memory: {
          energy: '987.65',
          used: 1023845
        },
        network: {
          io: '78.45',
          connections: 19
        }
      }
    }
  ];
};

// Example usage of the simulated fetch
const fetchData = async () => {
  const data = await fetchSimulatedData();
  console.log('Fetched data:', data);
};

fetchData();
