import React from 'react';

const renderCell = (title, cell, color) => React.createElement('div', {
  key: title,
  style: {
    minWidth: '92px',
    padding: '4px 8px',
    borderRadius: '4px',
    background: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  }
}, [
  React.createElement('span', {
    key: 'title',
    style: { fontSize: '9px', color: '#94a3b8', letterSpacing: '0.08em' }
  }, title),
  React.createElement('span', {
    key: 'value',
    style: {
      fontSize: '12px',
      fontWeight: '700',
      color,
      opacity: cell?.armed ? 0.75 : 1
    }
  }, cell?.label || '---')
]);

const FMA = ({ fma }) => {
  if (!fma) return null;

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      gap: '8px',
      padding: '8px',
      marginBottom: '8px',
      background: 'rgba(2, 6, 23, 0.88)',
      border: '1px solid #1e293b',
      borderRadius: '8px'
    }
  }, [
    renderCell('THR', fma.thrust?.active, '#22c55e'),
    renderCell('LAT', fma.lateral?.active, '#38bdf8'),
    renderCell('VERT', fma.vertical?.active, '#f59e0b'),
    renderCell('LAT ARM', fma.lateral?.armed, '#cbd5e1'),
    renderCell('VERT ARM', fma.vertical?.armed, '#cbd5e1'),
    React.createElement('div', {
      key: 'status',
      style: {
        minWidth: '88px',
        padding: '4px 8px',
        borderRadius: '4px',
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }
    }, [
      React.createElement('span', {
        key: 'title',
        style: { fontSize: '9px', color: '#94a3b8', letterSpacing: '0.08em' }
      }, 'STATUS'),
      React.createElement('span', {
        key: 'value',
        style: { fontSize: '12px', fontWeight: '700', color: '#f8fafc' }
      }, `${fma.ap || 'FD'} / ${fma.autothrottle || 'OFF'}`)
    ]),
    fma.reason ? React.createElement('div', {
      key: 'reason',
      style: {
        flex: 1,
        minWidth: '160px',
        padding: '4px 8px',
        borderRadius: '4px',
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }
    }, [
      React.createElement('span', {
        key: 'title',
        style: { fontSize: '9px', color: '#94a3b8', letterSpacing: '0.08em' }
      }, 'REASON'),
      React.createElement('span', {
        key: 'value',
        style: { fontSize: '11px', fontWeight: '600', color: '#e2e8f0' }
      }, fma.reason)
    ]) : null
  ]);
};

export default FMA;
