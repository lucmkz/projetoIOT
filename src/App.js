import React, { useState, useCallback, useRef } from 'react';

import styles from './styles/styles';

import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxOption,
} from '@reach/combobox';

import { formatRelative } from 'date-fns';

import './index.css';

import {
  useLoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';

function App() {
  const libraries = ['places'];
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: '<API KEY HERE>',
    libraries,
  });
  const mapContainerStyle = {
    width: '100vw',
    height: '100vh',
  };
  const center = {
    lat: -23.58681174926952,
    lng: -46.659555147387216,
  };
  const options = {
    styles,
    disableDefaultUI: true,
    zoomControl: true,
  };

  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState('ditto');
  const [linkSpritePokemon, setLinkSpritePokemon] = useState(
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png'
  );

  const onMapClick = useCallback(
    (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setMarkers((prevState) => [
        ...prevState,
        {
          lat,
          lng,
          time: new Date(),
          sprite: linkSpritePokemon,
          name: selectedPokemon,
        },
      ]);

      panTo({ lat, lng });
    },
    [linkSpritePokemon, selectedPokemon]
  );

  const searchPokemon = useCallback(async () => {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${selectedPokemon.toLocaleLowerCase()}`
    );
    const json = await response.json();
    setLinkSpritePokemon(json.sprites.front_default);
  }, [selectedPokemon]);

  const mapRef = useRef();
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(17);
  }, []);

  if (loadError) return 'Erro on loading map';
  if (!isLoaded) return 'Loading Maps';

  return (
    <div>
      <h1>
        Pokemon GO / Google API
        <span role='img' arial-label='dragon'>
          🐲
        </span>
      </h1>

      <Search panTo={panTo} />

      <div className='searchPoke'>
        <SearchPoke setSelectedPokemon={setSelectedPokemon} />
        <div className='input'>
          <button onClick={searchPokemon}> Search </button>
          <span>Selected Pokemon</span>
          <img src={linkSpritePokemon} alt='pokemon sprite' />
        </div>
      </div>

      <Locate panTo={panTo} />

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={17}
        center={center}
        options={options}
        onClick={onMapClick}
        onLoad={onMapLoad}
      >
        {markers.map((marker, index) => (
          <Marker
            kay={index}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={{
              url: marker.sprite,
              scaledSize: new window.google.maps.Size(100, 100),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(50, 50),
            }}
            onClick={() => {
              setSelected(marker);
            }}
          />
        ))}

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div>
              <h2>{selected.name}</h2>
              <p>Spotted {formatRelative(selected.time, new Date())}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

function Search({ panTo }) {
  const {
    ready,
    suggestions: { status, data },
    value,
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: {
        lat: () => -23.58681174926952,
        lng: () => -46.659555147387216,
      },
      radius: 200 * 1000,
    },
  });

  return (
    <div className='search'>
      <Combobox
        onSelect={async (address) => {
          setValue(address, false);
          clearSuggestions();
          try {
            const result = await getGeocode({ address });
            const { lat, lng } = await getLatLng(result[0]);
            panTo({ lat, lng });
          } catch (e) {
            console.error(e);
          }
        }}
      >
        <ComboboxInput
          disabled={!ready}
          placeholder='Select Adress'
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
        />

        <ComboboxPopover>
          {status === 'OK' &&
            data.map(({ _, description }, index) => (
              <ComboboxOption key={index} value={description} />
            ))}
        </ComboboxPopover>
      </Combobox>
    </div>
  );
}

function Locate({ panTo }) {
  const goToLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      panTo({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, []);

  return (
    <button className='locate' onClick={goToLocation}>
      <h2>🌍</h2>
    </button>
  );
}

function SearchPoke({ setSelectedPokemon }) {
  return (
    <div className='inputSearch'>
      <Combobox>
        <ComboboxInput
          placeholder='Pokemon'
          onChange={(e) => setSelectedPokemon(e.target.value)}
        />
      </Combobox>
    </div>
  );
}

export default App;
