import ChartingGrid from '../components/dental/ChartingGrid';
import { useRole } from '../context/RoleContext';
import { resolveDentitionType, DentitionType } from '../utils/dentition';

/**
 * ChartingView — Dedicated full-page view for the Charting Center.
 * Renders an expanded ChartingGrid with full audit log.
 */
export default function ChartingView() {
  const { userRole, activePatient } = useRole();
  const readOnly = userRole === 'patient';

  const dentitionType = resolveDentitionType(activePatient?.age);
  const subtitleMap = {
    [DentitionType.PRIMARY]:   'Primary dentition (20 baby teeth, A–T). Click any tooth to view details.',
    [DentitionType.MIXED]:     'Mixed dentition (28 teeth). Click any tooth to view details.',
    [DentitionType.PERMANENT]: 'Full permanent dentition (32 teeth). Click any tooth to view details.',
  };
  const subtitle = readOnly
    ? 'View your complete dental health chart below.'
    : subtitleMap[dentitionType];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Charting Center</h1>
        <p className="text-sm text-slate-400 mt-1">
          {subtitle}
        </p>
      </div>

      <ChartingGrid key={`chart-${activePatient?.id || 'default'}`} readOnly={readOnly} />
    </div>
  );
}
