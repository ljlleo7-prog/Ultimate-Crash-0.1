import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FlightPosePanel from '../src/components/FlightPosePanel.jsx';
import BoeingRadar from '../src/components/radar/BoeingRadar.jsx';
import AirbusRadar from '../src/components/radar/AirbusRadar.jsx';
import CentralPanel from '../src/components/CentralPanel.jsx';
import { LanguageProvider } from '../src/contexts/LanguageContext.jsx';
import '../src/components/FlightPanel.css';
import './main-panel-layouts.css';

const MODELS = {
  b737: { label: '737', aircraftModel: 'B737-800', family: 'boeing', layout: '737', image: '../src/data/737-MAIN-PNL.jpg', engines: 2, note: '737 captain and center section: the outboard clock bay leads into the production PFD and Boeing map, followed by compact standby instruments and the two-screen center stack.' },
  b747: { label: '747', aircraftModel: 'B747-400', family: 'boeing', layout: '747', image: '../src/data/747-MAIN-PNL.jpg', engines: 4, note: '747 captain and center section: the production flight displays retain generous width, with a narrow three-gauge standby column before the production four-engine EICAS.' },
  b757: { label: '757', aircraftModel: 'B757-200', family: 'boeing', layout: '757', image: '../src/data/757-MAIN-PNL.jpg', engines: 2, note: '757 captain and center section: tall production displays lead into the deliberately compact auxiliary bay and vertically divided center system stack.' },
  a320: { label: 'A320', aircraftModel: 'A320-200', family: 'airbus', layout: 'a320', image: '../src/data/320-MAIN-PNL.png', engines: 2, note: 'A320 captain and center section: the Airbus side-control bay, production PFD and Airbus map lead into the ISIS and ECAM stack beneath the FCU.' },
};

const makeFlightState = (engineCount) => ({
  indicatedAirspeed: 268,
  trueAirspeed: 452,
  groundSpeed: 438,
  altitude: 35000,
  verticalSpeed: 300,
  heading: 275,
  pitch: 2.5,
  roll: 1.2,
  altimeter: 29.92,
  localQNH: 29.92,
  terrainElevation: 320,
  latitude: 35.4,
  longitude: -116.2,
  engineN1: Array.from({ length: engineCount }, (_, index) => 84.2 - index * 0.3),
  engineN2: Array.from({ length: engineCount }, (_, index) => 94.8 - index * 0.2),
  engineEGT: Array.from({ length: engineCount }, (_, index) => 642 - index * 3),
  engineFuelFlow: Array.from({ length: engineCount }, (_, index) => 1.18 - index * 0.02),
  engineThrottles: Array.from({ length: engineCount }, () => 0.72),
  fuel: engineCount === 4 ? 82400 : 18600,
  activeWarnings: [],
  systems: { bleed: true, apu: { running: false } },
  derived: { altitude_ft: 35000, altitude_agl_ft: 34680 },
  autopilotDebug: {},
  autopilotMode: 'LNAV',
  fadecMode: 'CRZ',
});

const flightPlan = {
  waypoints: [
    { name: 'DAG', latitude: 34.8537, longitude: -116.787 },
    { name: 'HEC', latitude: 34.797, longitude: -116.463 },
    { name: 'LAS', latitude: 36.0797, longitude: -115.1537 },
  ],
};

function Glareshield({ family }) {
  return (
    <div className="preview-glareshield">
      <div className="preview-efis"><b>L EFIS</b><i /><i /><span>BARO · RANGE</span></div>
      <div className="preview-mcp">
        <div className="preview-mcp-modes"><b>{family === 'airbus' ? 'A/THR' : 'A/T ARM'}</b><b>LNAV</b><b>VNAV</b><b>APP</b><em>● ACTIVE</em></div>
        <div className="preview-mcp-values"><span>SPD<strong>268</strong></span><span>HDG<strong>275</strong></span><span>V/S<strong>+300</strong></span><span>ALT<strong>35000</strong></span><span>BARO<strong>29.92</strong></span></div>
      </div>
      <div className="preview-efis"><b>R EFIS</b><i /><i /><span>BARO · RANGE</span></div>
    </div>
  );
}

function SideBay({ family, layout, side }) {
  let instruments;
  if (family === 'airbus') {
    instruments = <><i className="side-speaker" /><span className="side-knobs"><i /><i /><i /></span></>;
  } else if (layout === '757') {
    instruments = <><span className="side-switches"><i /><i /><i /><i /></span><span className="side-knobs"><i /><i /></span></>;
  } else if (layout === '747') {
    instruments = <><i className="side-clock" /><i className="side-gauge" /><i className="side-gauge" /><span className="side-knobs"><i /><i /></span></>;
  } else {
    instruments = <><i className="side-clock" /><span className="side-knobs"><i /><i /><i /></span></>;
  }

  return (
    <div className={`preview-side-bay side-${side.toLowerCase()} ${family} side-layout-${layout}`} aria-label={`${side} side instruments`}>
      <b>{side}</b>
      {instruments}
    </div>
  );
}

function StandbyBay({ family, layout }) {
  return (
    <div className={`preview-standby ${family}`} aria-label="Standby instruments">
      <b>{layout === '757' ? 'AUX' : 'STBY'}</b>
      {family === 'airbus'
        ? <><i className="standby-digital" /><span>ISIS</span><i className="standby-clock" /></>
        : layout === '757'
            ? <><i className="standby-mini-pfd" /><span className="standby-data">116.80<br />088<br />2000</span><i className="standby-selector" /></>
            : <><i /><i /><i /></>}
    </div>
  );
}

function LowerSystemDisplay({ family }) {
  return (
    <div className={`preview-lower-system ${family}`}>
      <b>{family === 'airbus' ? 'ECAM · SD' : 'SYSTEM DISPLAY'}</b>
      <div className="system-outline"><i /><i /><i /><span>{family === 'airbus' ? 'DOOR  HYD  ELEC' : 'HYD  FUEL  ELEC'}</span></div>
    </div>
  );
}

function Preview() {
  const [modelKey, setModelKey] = useState('b737');
  const model = MODELS[modelKey];
  const flightState = useMemo(() => makeFlightState(model.engines), [model.engines]);
  const Radar = model.family === 'airbus' ? AirbusRadar : BoeingRadar;
  const fontFamily = model.family === 'airbus' ? 'Courier New, monospace' : 'monospace';

  return (
    <main className="preview-page">
      <header className="preview-header">
        <div><h1>AIRCRAFT MAIN-PANEL ARRANGEMENT STUDIES</h1><p>Production instrument components inside preview-only aircraft containers.</p></div>
        <nav aria-label="Aircraft selector">{Object.entries(MODELS).map(([key, item]) => <button className={key === modelKey ? 'active' : ''} data-model={key} key={key} onClick={() => setModelKey(key)}>{item.label}</button>)}</nav>
      </header>
      <div className="preview-comparison">
        <section className="preview-card preview-reference"><p className="preview-caption">SUPPLIED REFERENCE</p><img src={model.image} alt={`${model.label} main panel reference`} /></section>
        <section className="preview-card preview-result">
          <p className="preview-caption">PREVIEW USING LIVE IN-FLIGHT COMPONENTS</p>
          <div className={`preview-cockpit family-${model.family} layout-${model.layout}`}>
            <div className="preview-windscreen" aria-hidden="true" />
            <Glareshield family={model.family} />
            <div className="preview-deck">
              <div className="preview-instruments">
                <SideBay family={model.family} layout={model.layout} side="L" />
                <div className="instrument-slot slot-pfd-left"><FlightPosePanel flightState={flightState} efisFontFamily={fontFamily} /></div>
                <div className="instrument-slot slot-map-left"><Radar flightState={flightState} flightPlan={flightPlan} npcs={[]} weatherData={{}} efisFontFamily={fontFamily} /></div>
                <StandbyBay family={model.family} layout={model.layout} />
                <div className="instrument-slot slot-central">
                  <CentralPanel flightState={flightState} aircraftModel={model.aircraftModel} efisFontFamily={fontFamily} onToggleSystems={() => {}} onToggleBreakers={() => {}} />
                  {model.layout !== '747' && <LowerSystemDisplay family={model.family} />}
                </div>
              </div>
            </div>
            <div className="preview-pedestal"><span>FLIGHT CONTROLS</span><span>THRUST</span><span>FLAPS · GEAR · AIRBRAKE</span></div>
          </div>
          <p className="preview-note">{model.note}</p>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<LanguageProvider><Preview /></LanguageProvider>);
