/* eslint-disable react/prop-types */
import { BoeingShell as Shell, BoeingModule as Module, BoeingRow as Row, BoeingControl as Control, BoeingReadout as Readout } from '../../../components/overhead/BoeingControls';
import { BoeingSystemsProvider, BoeingApuSelector, BoeingElectrical, BoeingHydraulics, BoeingEngineStart, BoeingFuel, BoeingAntiIce, BoeingSigns, BoeingWindowHeat, BoeingAirConditioning, BoeingBleed, BoeingPressurization, BoeingExteriorLights } from '../../../components/overhead/BoeingSystems';

const column = { display: 'flex', flexDirection: 'column', gap: 5 };
const InopRadio = ({ title }) => <Module title={title} height={116}><Readout label="FREQUENCY · INOP" value="— — —" /><Row><Control label="TUNE" kind="rotary" /><Control label="USB / AM" kind="rotary" /></Row></Module>;

// Layout derived from the supplied combined 757/767 reference. Variant-specific
// equipment is visual / INOP until a 757 systems model exists.
export default function OverheadPanelB752({ flightState, onSystemAction, onClose }) {
  return <BoeingSystemsProvider flightState={flightState} onSystemAction={onSystemAction}>
    <Shell powered={(flightState?.systems?.electrical?.dcVolts ?? 0) > 15} aircraft="BOEING 757-200" columns={5} onClose={onClose}>
      <div style={column}>
        <Module title="IRS DISPLAY" height={264}>
          <Readout label="POSITION / STATUS · INOP" value="— — — —" />
          <Row><Control label="DSPL SEL" kind="rotary" /><Control label="SYS DSPL" kind="rotary" /></Row>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, margin: '8px 12px' }}>{['1 N', '2', '3 E', '4', '5', '6', '7 W', '8', '9 S', 'CLR', '0', 'ENT'].map(key => <button key={key} type="button" disabled aria-label={`IRS ${key} (INOP)`} style={{ background: '#2c2d26', color: '#c7c7ac', border: '1px solid #99937b', fontSize: 9, padding: 4 }}>{key}</button>)}</div>
          <Row>{['L IRS', 'C IRS', 'R IRS'].map(label => <Control key={label} label={label} kind="rotary" />)}</Row>
        </Module>
        <Module title="YAW DAMPER" height={106}><Row><Control label="L" /><Control label="R" /></Row></Module>
        <Module title="ELEC ENG CONTROL" height={110}><Row><Control label="L EEC" /><Control label="R EEC" /></Row></Module>
        <BoeingHydraulics />
      </div>
      <div style={column}>
        <Module title="EVACUATION" height={158}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 8 }}>{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ height: 10, background: '#242e2b', border: '1px solid #aaa084' }} />)}</div><Row><Control label="COMMAND" guarded kind="toggle" /><Control label="HORN SHUTOFF" /></Row></Module>
        <InopRadio title="HF RADIO L" />
        <BoeingElectrical />
        <Module title="APU" height={112}><Row><BoeingApuSelector /><Control label="FAULT" /></Row></Module>
        <Module title="VOICE RECORDER" height={103}><Row><Control label="TEST" /><Control label="ERASE" /></Row></Module>
        <Module title="PANEL / FLOOD" height={105}><Row><Control label="GLARESHIELD" kind="rotary" /><Control label="AISLE STAND" kind="rotary" /></Row></Module>
      </div>
      <div style={column}>
        <Module title="FLIGHT DECK SAFETY" height={153}><Row><Control label="EMER LIGHTS" kind="toggle" /><Control label="PASS OXY" guarded /></Row><Row><Control label="RAM AIR TURBINE" guarded /></Row></Module>
        <BoeingEngineStart />
        <BoeingFuel />
        <BoeingAntiIce />
        <Module title="WIPER" height={95}><Row><Control label="OFF / LOW / HIGH" kind="rotary" /></Row></Module>
        <BoeingExteriorLights />
      </div>
      <div style={column}>
        <BoeingWindowHeat />
        <InopRadio title="HF RADIO R" />
        <Module title="CABIN CALL" height={95}><Row><Control label="FWD" /><Control label="MID" /><Control label="AFT" /></Row></Module>
        <BoeingSigns />
        <BoeingPressurization />
        <Module title="EQUIP COOLING" height={95}><Row><Control label="SUPPLY" /><Control label="EXHAUST" /></Row></Module>
        <Module title="FLIGHT DECK LIGHTS" height={163}><Row><Control label="CKT BKR" kind="rotary" /><Control label="OVHD PANEL" kind="rotary" /></Row><Row><Control label="DOME" kind="rotary" /><Control label="IND LTS TEST" kind="rotary" /></Row></Module>
      </div>
      <div style={column}>
        <Module title="COMPARTMENT TEMP" height={100}><Row>{['FLT', 'FWD', 'AFT'].map(label => <Readout key={label} label={`${label} · INOP`} value="—" />)}</Row></Module>
        <BoeingAirConditioning />
        <BoeingBleed />
        <Module title="F/O AUDIO" height={105}><Row><Control label="AUDIO ENT" kind="rotary" /><Control label="VIDEO ON" /></Row></Module>
      </div>
    </Shell>
  </BoeingSystemsProvider>;
}
