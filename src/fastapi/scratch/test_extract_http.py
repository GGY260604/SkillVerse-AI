import urllib.request
import uuid
import json

boundary = uuid.uuid4().hex
content = (
    b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n"
    b"4 0 obj\n<< /Length 85 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n"
    b"(Senior Software Engineer with 5 years in Python, FastAPI, React, Docker, and PostgreSQL.) Tj\n"
    b"ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n"
    b"0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
    b"00000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n349\n%%EOF"
)

header = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_cv.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode('utf-8')
footer = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = header + content + footer

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/v1/extract',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

with urllib.request.urlopen(req, timeout=60) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print('STATUS:', resp.status)
    print('EXTRACTION METHOD:', data.get('extractionMethod'))
    print('MESSAGE:', data.get('message'))
    print('SKILLS COUNT:', len(data.get('extractedProfile', {}).get('skills', [])))
    for s in data.get('extractedProfile', {}).get('skills', []):
        print(' -', s.get('name'), s.get('proficiency'))
