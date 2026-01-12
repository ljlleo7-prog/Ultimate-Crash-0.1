import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlSurfacePanel from './ControlSurfacePanel';

// Mock test data
const mockFlightState = {
  flaps: 0,
  gear: false,
  airBrakes: 0,
  hydraulicPressure: 2500
};

describe('ControlSurfacePanel', () => {
  it('should render the component with correct title', () => {
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    expect(screen.getByText('Control Surfaces')).toBeInTheDocument();
  });

  it('should render all control levers', () => {
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    expect(screen.getByText('FLAPS')).toBeInTheDocument();
    expect(screen.getByText('GEAR')).toBeInTheDocument();
    expect(screen.getByText('BRAKES')).toBeInTheDocument();
  });

  it('should render correct initial positions', () => {
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    // Check initial flap position
    expect(screen.getByText('UP')).toBeInTheDocument();
    
    // Check initial gear position
    expect(screen.getByText('UP')).toBeInTheDocument();
    
    // Check initial brakes position
    expect(screen.getByText('RTCT')).toBeInTheDocument();
  });

  it('should call controlFlaps when flap lever is clicked', () => {
    const mockControlFlaps = jest.fn();
    
    render(
      <ControlSurfacePanel 
        controlFlaps={mockControlFlaps} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    // Get the flap lever housing
    const flapLever = screen.getByText('FLAPS').closest('div').nextSibling;
    
    // Click the lever to move it to the next position
    fireEvent.click(flapLever);
    
    // Verify that controlFlaps was called
    expect(mockControlFlaps).toHaveBeenCalled();
  });

  it('should call controlGear when gear lever is clicked', () => {
    const mockControlGear = jest.fn();
    
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={mockControlGear} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    // Get the gear lever housing
    const gearLever = screen.getByText('GEAR').closest('div').nextSibling;
    
    // Click the lever to toggle gear position
    fireEvent.click(gearLever);
    
    // Verify that controlGear was called with true (gear down)
    expect(mockControlGear).toHaveBeenCalledWith(true);
  });

  it('should call controlAirBrakes when brake lever is clicked', () => {
    const mockControlAirBrakes = jest.fn();
    
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={mockControlAirBrakes} 
        flightState={mockFlightState}
      />
    );
    
    // Get the brake lever housing
    const brakeLever = screen.getByText('BRAKES').closest('div').nextSibling;
    
    // Click the lever to toggle brake position
    fireEvent.click(brakeLever);
    
    // Verify that controlAirBrakes was called with 1 (brakes extended)
    expect(mockControlAirBrakes).toHaveBeenCalledWith(1);
  });

  it('should display correct hydraulic pressure and system status', () => {
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={mockFlightState}
      />
    );
    
    expect(screen.getByText('Hydraulic Pressure:')).toBeInTheDocument();
    expect(screen.getByText('2500 PSI')).toBeInTheDocument();
    expect(screen.getByText('System Status:')).toBeInTheDocument();
    expect(screen.getByText('NORMAL')).toBeInTheDocument();
  });

  it('should display FAILURE status when hydraulic pressure is low', () => {
    const lowPressureFlightState = {
      ...mockFlightState,
      hydraulicPressure: 800
    };
    
    render(
      <ControlSurfacePanel 
        controlFlaps={() => {}} 
        controlGear={() => {}} 
        controlAirBrakes={() => {}} 
        flightState={lowPressureFlightState}
      />
    );
    
    expect(screen.getByText('FAILURE')).toBeInTheDocument();
  });
});
