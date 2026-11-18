from pathlib import Path
import json, statistics

evidence = Path(__file__).resolve().parents[1] / 'evidence'
data = json.loads((evidence / 'measurements.json').read_text())
summary = {}
for operation in sorted({row['operation'] for row in data['samples']}):
    rows = [row for row in data['samples'] if row['operation'] == operation]
    summary[operation] = {'n': len(rows)}
    for key in ['provingMs', 'proveMs', 'totalMs']:
        values = [row[key] for row in rows]
        summary[operation][key] = {'median': round(statistics.median(values)), 'worst': round(max(values))}
(evidence / 'measurement-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
