import os, json

result = {}
for root, dirs, files in os.walk('backend/src/main/java/com/meditrack'):
    pkg = root.replace('backend/src/main/java/com/meditrack', '').replace('\\', '/')
    java_files = [f for f in files if f.endswith('.java')]
    result[pkg or '(root)'] = java_files

with open('docs/audit-evidence/phase0-inventory.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2)

for pkg, files in sorted(result.items()):
    print(f"{pkg}: {len(files)} files -> {files}")
