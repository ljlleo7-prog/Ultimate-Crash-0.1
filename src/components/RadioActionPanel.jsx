
import React, { useState, useEffect } from 'react';
import { RADIO_TEMPLATES } from '../data/radioTemplates';

const RadioActionPanel = ({ onTransmit, currentStation = 'Unicom', callsign = 'Cessna 172', flightPlan, isChannelBusy, frequencyType = 'UNICOM' }) => {
  const [activeTab, setActiveTab] = useState('REQUEST');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [paramValues, setParamValues] = useState({});

  // Derive valid waypoints from flight plan
  const validWaypoints = flightPlan?.waypoints?.map(wp => wp.name || wp.id).filter(Boolean) || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedTemplate(null);
    setParamValues({});
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Initialize params
    const initialParams = {};
    if (template.params) {
      template.params.forEach(p => initialParams[p] = '');
    }
    setParamValues(initialParams);
  };

  const handleParamChange = (param, value) => {
    setParamValues(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    // Construct message
    let text = selectedTemplate.template;
    
    // Replace context
    text = text.replace('{station}', currentStation);
    text = text.replace('{callsign}', callsign);

    // Replace params
    Object.keys(paramValues).forEach(key => {
      text = text.replace(`{${key}}`, paramValues[key]);
    });

    onTransmit({
      type: selectedTemplate.type,
      templateId: selectedTemplate.id,
      text: text,
      params: paramValues,
      sender: 'Pilot',
      timestamp: Date.now()
    });

    // Reset selection (optional, or keep for rapid fire)
    setSelectedTemplate(null);
    setParamValues({});
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '8px',
      border: '1px solid #334155',
      overflow: 'hidden',
      color: '#e2e8f0'
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {Object.keys(RADIO_TEMPLATES).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              flex: 1,
              padding: '4px 2px',
              background: activeTab === tab ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #38bdf8' : 'none',
              color: activeTab === tab ? '#38bdf8' : '#94a3b8',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 'none', height: '80px', padding: '4px', overflowY: 'auto' }}>
        {!selectedTemplate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {RADIO_TEMPLATES[activeTab].filter(template => {
              if (!template.allowedTypes) return true;
              if (template.allowedTypes.includes('ALL')) return true;
              
              const type = frequencyType.toUpperCase();
              const titleCase = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
              return template.allowedTypes.includes(titleCase);
            }).map(template => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                style={{
                  textAlign: 'left',
                  padding: '4px 6px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  lineHeight: '1.2'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{template.label}</div>
                <div style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {template.template}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>{selectedTemplate.label}</span>
              <button 
                type="button" 
                onClick={() => setSelectedTemplate(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '9px' }}
              >
                Cancel
              </button>
            </div>

            {/* Params Inputs */}
            {selectedTemplate.params && selectedTemplate.params.map(param => (
              <div key={param} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <label style={{ fontSize: '9px', textTransform: 'uppercase', color: '#94a3b8' }}>{param}</label>
                {param === 'waypoint' && validWaypoints.length > 0 ? (
                  <select
                    value={paramValues[param] || ''}
                    onChange={(e) => handleParamChange(param, e.target.value)}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px',
                      color: 'white',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select...</option>
                    {validWaypoints.map(wp => (
                      <option key={wp} value={wp}>{wp}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={paramValues[param]}
                    onChange={(e) => handleParamChange(param, e.target.value)}
                    placeholder={`Enter ${param}...`}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px',
                      color: 'white',
                      fontSize: '11px'
                    }}
                    autoFocus={param === selectedTemplate.params[0]}
                  />
                )}
              </div>
            ))}

            {/* Preview */}
            <div style={{ 
              fontSize: '10px', 
              color: '#94a3b8', 
              background: '#0f172a', 
              padding: '4px', 
              borderRadius: '4px',
              border: '1px dashed #334155',
              marginTop: '2px',
              lineHeight: '1.2'
            }}>
              "
              {selectedTemplate.template
                .replace('{station}', currentStation)
                .replace('{callsign}', callsign)
                .replace(/{(\w+)}/g, (match, key) => paramValues[key] || match)
              }"
            </div>

            <button
              type="submit"
              disabled={isChannelBusy}
              style={{
                marginTop: '2px',
                padding: '6px',
                background: isChannelBusy ? '#475569' : '#38bdf8',
                color: isChannelBusy ? '#94a3b8' : '#0f172a',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px',
                cursor: isChannelBusy ? 'not-allowed' : 'pointer'
              }}
            >
              {isChannelBusy ? 'FREQ BUSY' : 'TRANSMIT'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RadioActionPanel;
