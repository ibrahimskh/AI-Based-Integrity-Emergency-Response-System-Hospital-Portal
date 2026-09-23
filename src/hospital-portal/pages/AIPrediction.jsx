import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import { Field, Select } from '../../shared/components/Field';
import { useAuth } from '../../shared/context/AuthContext';
import { dbSubscribe, dbAdd } from '../../shared/data/db';
import { requestAIPrediction } from '../../shared/data/aiClient';
import { fmtDateTime } from '../../shared/utils/format';

const PREDICTION_TYPES = [
  { value: 'priority', label: 'Patient Priority' },
  { value: 'hospital_load', label: 'Hospital Load' },
  { value: 'bed_requirement', label: 'Bed Requirement' },
  { value: 'icu_requirement', label: 'ICU Requirement' },
  { value: 'eta', label: 'Estimated Arrival' },
  { value: 'severity', label: 'Emergency Severity' },
];

export default function AIPrediction() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [predType, setPredType] = useState('priority');
  const [state, setState] = useState({ status: 'idle', result: null, error: null, requestedAt: null });

  useEffect(() => {
    const unsub = dbSubscribe('patients', (list) => {
      const scoped = list.filter((p) => p.assignedHospitalId === user.hospitalId);
      setPatients(scoped);
      if (!patientId && scoped[0]) setPatientId(scoped[0].id);
    });
    return unsub;
  }, []);

  const runPrediction = async () => {
    const patient = patients.find((p) => p.id === patientId);
    setState({ status: 'loading', result: null, error: null, requestedAt: new Date().toISOString() });
    try {
      const result = await requestAIPrediction({ patient, predictionType: predType, hospitalId: user.hospitalId });
      setState({ status: 'success', result, error: null, requestedAt: new Date().toISOString() });
      await dbAdd('ai_predictions', { patientId, predictionType: predType, result, requestedAt: new Date().toISOString() });
    } catch (err) {
      setState({ status: 'error', result: null, error: err.message, requestedAt: new Date().toISOString() });
      await dbAdd('ai_predictions', { patientId, predictionType: predType, error: err.message, requestedAt: new Date().toISOString() });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={20} className="text-lifeline-red" />
          <h3 className="font-bold text-lg">Request AI Prediction</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Patient">
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              {patients.length === 0 && <option value="">No patients available</option>}
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </Select>
          </Field>
          <Field label="Prediction Type">
            <Select value={predType} onChange={(e) => setPredType(e.target.value)}>
              {PREDICTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
        </div>

        <Button icon={Sparkles} onClick={runPrediction} loading={state.status === 'loading'} disabled={!patientId}>
          Get AI Prediction
        </Button>
      </Card>

      {state.status !== 'idle' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Prediction Result</h3>
            {state.requestedAt && (
              <span className="text-xs text-lifeline-sub flex items-center gap-1"><Clock size={12} /> {fmtDateTime(state.requestedAt)}</span>
            )}
          </div>

          {state.status === 'loading' && (
            <div className="flex items-center gap-3 text-lifeline-sub py-6 justify-center">
              <RefreshCw size={18} className="animate-spin text-lifeline-red" /> Contacting AI service…
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <p className="font-semibold text-lifeline-ink">AI service is currently unavailable.</p>
              <p className="text-sm text-lifeline-sub max-w-sm">{state.error !== 'AI service is currently unavailable.' ? state.error : 'No AI endpoint is connected yet. Set VITE_AI_API_URL to enable live predictions from the Flask API.'}</p>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={runPrediction}>Retry</Button>
            </div>
          )}

          {state.status === 'success' && (
            <pre className="bg-slate-50 rounded-lg p-4 text-xs overflow-x-auto">{JSON.stringify(state.result, null, 2)}</pre>
          )}
        </Card>
      )}
    </div>
  );
}
