import React, { useState, useEffect } from 'react';
import { Preset, Stage, StageType } from '@jus-breathe/core';

interface PresetEditorProps {
  presets: Preset[];
  presetToEdit?: Preset | null;
  onSave: (updatedPresets: Preset[]) => void;
  onClose: () => void;
  onDelete?: (presetId: string) => void;
}

export const PresetEditor: React.FC<PresetEditorProps> = ({ 
  presets, 
  presetToEdit, 
  onSave, 
  onClose,
  onDelete 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<'forest' | 'ocean' | 'lavender' | 'amber'>('forest');
  const [repeats, setRepeats] = useState<number | null>(4);
  const [isInfinite, setIsInfinite] = useState(true);
  const [stages, setStages] = useState<Stage[]>([
    { name: 'Inhale', duration: 4, type: 'inhale' },
    { name: 'Hold', duration: 4, type: 'hold-full' },
    { name: 'Exhale', duration: 4, type: 'exhale' },
    { name: 'Hold', duration: 4, type: 'hold-empty' }
  ]);

  // Populate state if editing
  useEffect(() => {
    if (presetToEdit) {
      setName(presetToEdit.name);
      setDescription(presetToEdit.description);
      setTheme(presetToEdit.theme);
      
      const phase = presetToEdit.phases[0];
      if (phase) {
        setIsInfinite(phase.repeats === null);
        setRepeats(phase.repeats || 4);
        setStages(phase.stages);
      }
    }
  }, [presetToEdit]);

  const handleAddStage = () => {
    const newStage: Stage = {
      name: 'Hold',
      duration: 4,
      type: 'hold-full'
    };
    setStages([...stages, newStage]);
  };

  const handleDeleteStage = (index: number) => {
    if (stages.length <= 1) {
      alert("A breathing cycle must contain at least one stage.");
      return;
    }
    const updated = stages.filter((_, idx) => idx !== index);
    setStages(updated);
  };

  const handleUpdateStage = (index: number, updatedFields: Partial<Stage>) => {
    const updated = stages.map((s, idx) => {
      if (idx === index) {
        return { ...s, ...updatedFields } as Stage;
      }
      return s;
    });
    setStages(updated);
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...stages];
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    setStages(updated);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Please provide a name for this preset.");
      return;
    }

    const savedPreset: Preset = {
      id: presetToEdit ? presetToEdit.id : `custom_${Date.now()}`,
      name: trimmedName,
      description: description.trim() || 'Breathing exercise routine.',
      theme,
      type: presetToEdit ? presetToEdit.type : 'standard',
      phases: [
        {
          name: 'Cycle',
          repeats: isInfinite ? null : repeats,
          stages: stages.map(s => ({
            name: s.name.trim() || 'Stage',
            duration: s.duration,
            type: s.type
          }))
        }
      ]
    };

    let updatedPresets: Preset[];
    if (presetToEdit) {
      updatedPresets = presets.map(p => p.id === presetToEdit.id ? savedPreset : p);
    } else {
      updatedPresets = [...presets, savedPreset];
    }

    onSave(updatedPresets);
  };

  const getStageColorStyle = (type: StageType) => {
    switch (type) {
      case 'inhale': return 'var(--inhale-color)';
      case 'exhale': return 'var(--exhale-color)';
      default: return 'var(--hold-color)';
    }
  };

  return (
    <div className="drawer-overlay" style={{ zIndex: 200 }} onClick={onClose}>
      <div 
        className="drawer-panel" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '500px', 
          width: '95%', 
          borderRadius: '24px', 
          height: '92%', 
          margin: 'auto',
          position: 'relative',
          border: '1px solid var(--panel-border)'
        }}
      >
        <div className="drawer-header">
          <h2>{presetToEdit ? 'Edit Preset' : 'Create Custom Preset'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, paddingBottom: '80px', overflowY: 'auto' }}>
          {/* General info */}
          <div className="settings-group">
            <h3>Preset Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Preset Name (e.g. Cleansing Breath)" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="option-btn"
                style={{ width: '100%', textAlign: 'left', cursor: 'text', padding: '12px' }}
              />
              <input 
                type="text" 
                placeholder="Description" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="option-btn"
                style={{ width: '100%', textAlign: 'left', cursor: 'text', padding: '12px' }}
              />
            </div>
          </div>

          {/* Theme selection */}
          <div className="settings-group">
            <h3>Color Theme</h3>
            <div className="options-grid">
              {(['forest', 'ocean', 'lavender', 'amber'] as const).map(t => (
                <button
                  key={t}
                  className={`option-btn ${theme === t ? 'active' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat settings */}
          <div className="settings-group">
            <h3>Rounds/Cycles</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <button 
                className={`option-btn ${isInfinite ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setIsInfinite(true)}
              >
                Loop Indefinitely
              </button>
              <button 
                className={`option-btn ${!isInfinite ? 'active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setIsInfinite(false)}
              >
                Fixed Count
              </button>
            </div>
            
            {!isInfinite && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem' }}>Repetitions:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={repeats || 4} 
                  onChange={e => setRepeats(parseInt(e.target.value) || 1)}
                  className="option-btn"
                  style={{ width: '80px', padding: '8px', cursor: 'text' }}
                />
              </div>
            )}
          </div>

          {/* Stages Editor List */}
          <div className="settings-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Cycle Stages</h3>
              <button className="option-btn" onClick={handleAddStage} style={{ borderColor: 'var(--inhale-color)' }}>
                + Add Stage
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stages.map((stage, idx) => (
                <div 
                  key={`edit-stage-${idx}`} 
                  className="glass-panel" 
                  style={{ 
                    padding: '12px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '10px',
                    borderLeft: `5px solid ${getStageColorStyle(stage.type)}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Stage Name */}
                    <input 
                      type="text" 
                      placeholder="Stage Name" 
                      value={stage.name} 
                      onChange={e => handleUpdateStage(idx, { name: e.target.value })}
                      className="option-btn"
                      style={{ flex: 2, textAlign: 'left', cursor: 'text', padding: '6px' }}
                    />
                    
                    {/* Duration input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                      <input 
                        type="number" 
                        min="1" 
                        max="300"
                        value={stage.duration || ''} 
                        onChange={e => handleUpdateStage(idx, { duration: parseInt(e.target.value) || null })}
                        className="option-btn"
                        style={{ width: '60px', padding: '6px', cursor: 'text' }}
                        placeholder="Open"
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>s</span>
                    </div>

                    {/* Move Up/Down/Delete */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="icon-btn" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }} onClick={() => handleMoveStage(idx, 'up')} disabled={idx === 0}>
                        ▲
                      </button>
                      <button className="icon-btn" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }} onClick={() => handleMoveStage(idx, 'down')} disabled={idx === stages.length - 1}>
                        ▼
                      </button>
                      <button className="icon-btn" style={{ width: '32px', height: '32px', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => handleDeleteStage(idx)}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Stage Type Toggle */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['inhale', 'hold-full', 'exhale', 'hold-empty'] as const).map(type => (
                      <button
                        key={type}
                        className={`option-btn ${stage.type === type ? 'active' : ''}`}
                        style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                        onClick={() => handleUpdateStage(idx, { type })}
                      >
                        {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Actions bar at bottom */}
        <div 
          style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            padding: '16px 24px', 
            backgroundColor: 'var(--bg-color)', 
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            gap: '12px'
          }}
        >
          {presetToEdit && onDelete && (
            <button 
              className="option-btn" 
              style={{ flex: 1, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
              onClick={() => {
                if (confirm(`Are you sure you want to delete the preset "${presetToEdit.name}"?`)) {
                  onDelete(presetToEdit.id);
                }
              }}
            >
              Delete
            </button>
          )}
          <button className="option-btn" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button 
            className="option-btn active" 
            style={{ flex: 2, backgroundColor: 'var(--accent-color)', color: '#ffffff' }}
            onClick={handleSave}
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
};
