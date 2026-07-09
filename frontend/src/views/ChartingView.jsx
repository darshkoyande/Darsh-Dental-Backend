import ChartingGrid from '../components/dental/ChartingGrid';
import { useRole } from '../context/RoleContext';

/**
 * ChartingView — Dedicated full-page view for the Charting Center.
 * Renders an expanded ChartingGrid with full audit log.
 */
export default function ChartingView() {
  const { userRole, activePatient } = useRole();
  const readOnly = userRole === 'patient';

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Charting Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          {readOnly
            ? 'View your complete dental health chart below.'
            : 'Interactive 32-tooth adult chart. Click any tooth to update its clinical status.'}
        </p>
      </div>

      <ChartingGrid key={`chart-${activePatient?.id || 'default'}`} readOnly={readOnly} />
    </div>
  );
}
