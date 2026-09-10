/* eslint-disable react/prop-types */
import { BoeingShell as Shell, BoeingModule as Module, BoeingRow as Row, BoeingControl as Control } from '../../../components/overhead/BoeingControls';
import { BoeingSystemsProvider, BoeingBoundControl as Bound, BoeingElectrical, BoeingHydraulics, BoeingEngineStart, BoeingFuel, BoeingAntiIce, BoeingSigns, BoeingWindowHeat, BoeingAirConditioning, BoeingBleed, BoeingPressurization, BoeingExteriorLights } from '../../../components/overhead/BoeingSystems';

const column = { display: 'flex', flexDirection: 'column', gap: 5 };

// Four equipment columns follow src/data/777-OH-PNL.jpg. The three-system
// hydraulic and multi-isolation architecture is intentionally not mapped to
// the simulator's two-system 737 hydraulic / single-isolation abstraction.
export default function OverheadPanelB77W({ flightState, onSystemAction, onClose }) {
  return <BoeingSystemsProvider flightState={flightState} onSystemAction={onSystemAction}>
    <Shell powered={(flightState?.systems?.electrical?.dcVolts ?? 0) > 15} aircraft="BOEING 777-300ER" onClose={onClose}>
      <div style={column}>
        <Module title="" height={125} />
        <Module title="FLIGHT CONTROLS" height={160}>
          <Row><Control label="ADIRU" /></Row>
          <Row><Control label="THRUST ASYM COMP" /><Control label="PRIMARY FLIGHT COMPUTERS" kind="toggle" guarded /></Row>
        </Module>
        <BoeingElectrical tripleSeven />
        <Module title="L WIPER" height={150}><Row><Control label="OFF · INT · LOW · HIGH" kind="rotary" /></Row></Module>
      </div>
      <div style={column}>
        <Module title="SERVICE / OXYGEN" height={134}><Row><Bound label="EMER LIGHTS" path="lighting.emergencyLights" kind="toggle" /><Control label="SERV INTPH" kind="toggle" /><Control label="PASS OXYGEN" guarded /></Row></Module>
        <BoeingWindowHeat />
        <BoeingHydraulics tripleSeven />
        <BoeingSigns />
        <Module title="FLIGHT DECK LIGHTING" height={192}><Row><Control label="OVHD / CB" kind="rotary" /><Control label="DOME" kind="rotary" /></Row><Row><Control label="STORM" /><Control label="MASTER BRIGHT" kind="rotary" /></Row></Module>
        <Module title="LANDING" height={105}><Row><Bound label="L / NOSE / R" path="lighting.landing" kind="toggle" note="Left, nose and right lights operate together" /><Control label="GLARESHIELD" kind="rotary" /></Row></Module>
      </div>
      <div style={column}>
        <Module title="CARGO FIRE" height={115}><Row><Control label="FWD ARM" guarded /><Control label="AFT ARM" guarded /><Control label="DISCH" guarded /></Row></Module>
        <BoeingEngineStart tripleSeven />
        <Module title="FUEL JETTISON" height={110}><Row><Control label="L NOZZLE" /><Control label="FUEL TO REMAIN" kind="rotary" /><Control label="R NOZZLE" /><Control label="ARM" guarded /></Row></Module>
        <BoeingFuel tripleSeven />
        <BoeingAntiIce tripleSeven />
        <BoeingExteriorLights tripleSeven />
      </div>
      <div style={column}>
        <Module title="VOICE RECORDER" height={94}><Row><Control label="AUTO / ON" kind="toggle" /></Row></Module>
        <BoeingAirConditioning tripleSeven />
        <BoeingBleed tripleSeven />
        <BoeingPressurization tripleSeven />
        <Module title="R WIPER" height={160}><Row><Control label="OFF · INT · LOW · HIGH" kind="rotary" /></Row></Module>
      </div>
    </Shell>
  </BoeingSystemsProvider>;
}
