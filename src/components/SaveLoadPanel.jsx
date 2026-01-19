import React, { useState } from 'react';
import { encryptFlightData, decryptFlightData } from '../utils/flightDataCrypto';
import './SaveLoadPanel.css';

const SaveLoadPanel = ({ flightData, physicsState, flightPlan, weatherData, aircraftModel, onClose, onLoadFlight }) => {
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const generateSaveData = () => {
    return {
      version: '1.0',
      timestamp: Date.now(),
      flightData: flightData,
      physicsState: physicsState,
      runwayGeometry: flightData?.runwayGeometry,
      flightPlan: flightPlan,
      weatherData: weatherData,
      aircraftModel: aircraftModel,
    };
  };

  const handleSave = () => {
    try {
      const data = generateSaveData();
      const encrypted = encryptFlightData(data);
      if (!encrypted) throw new Error('Encryption failed');

      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight_save_${new Date().toISOString().replace(/[:.]/g, '-')}.acs`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMsg('Flight saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError('Failed to save flight: ' + err.message);
    }
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = decryptFlightData(content);
        if (!data) throw new Error('Invalid save file or decryption failed');
        
        if (data.version !== '1.0') {
            console.warn('Version mismatch, attempting to load anyway...');
        }

        onLoadFlight(data);
        setSuccessMsg('Flight loaded successfully!');
        setTimeout(() => {
            setSuccessMsg(null);
            onClose();
        }, 1500);
      } catch (err) {
        setError('Failed to load flight: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="save-load-panel">
      <div className="panel-header">
        <h3>Save & Load Flight</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="flight-manifest">
            <h4>Current Flight Manifest</h4>
            <div className="manifest-details">
                <p><strong>Aircraft:</strong> {aircraftModel?.name || 'Unknown'}</p>
                <p><strong>Position:</strong> {flightData?.position?.latitude?.toFixed(4)}, {flightData?.position?.longitude?.toFixed(4)}</p>
                <p><strong>Altitude:</strong> {flightData?.altitude?.toFixed(0)} ft</p>
                <p><strong>Heading:</strong> {flightData?.heading?.toFixed(0)}°</p>
                <p><strong>Phase:</strong> {flightPlan ? 'Active Flight Plan' : 'Free Flight'}</p>
            </div>
        </div>

        <div className="actions-row">
            <div className="action-card">
                <h5>Save Flight</h5>
                <p>Encrypt and download current flight state.</p>
                <button className="action-btn save-btn" onClick={handleSave}>
                    💾 Download Save File
                </button>
            </div>

            <div className="action-card">
                <h5>Load Flight</h5>
                <p>Restore flight from a previous save file.</p>
                <label className="action-btn load-btn">
                    📂 Upload Save File
                    <input type="file" accept=".acs" onChange={handleLoad} style={{ display: 'none' }} />
                </label>
            </div>
        </div>

        {error && <div className="status-msg error">{error}</div>}
        {successMsg && <div className="status-msg success">{successMsg}</div>}
      </div>
    </div>
  );
};

export default SaveLoadPanel;
