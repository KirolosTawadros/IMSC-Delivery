const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/api/resource/DocType/Delivery%20Form',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const fields = parsed.data.fields.map(f => `${f.fieldname} (${f.fieldtype}) - label: ${f.label}`);
      console.log("Parent Fields:", fields);
      
      const childTables = parsed.data.fields.filter(f => f.fieldtype === 'Table').map(f => f.options);
      console.log("Child Tables:", childTables);
      
      // Fetch child table schema if exists
      if (childTables.length > 0) {
        fetchChild(childTables[0]);
      }
    } catch(e) {
      console.log("Error parsing:", e.message);
      console.log("Raw:", data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();

function fetchChild(childName) {
  const req2 = http.request({
    ...options,
    path: `/api/resource/DocType/${encodeURIComponent(childName)}`
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const parsed = JSON.parse(data);
      const fields = parsed.data.fields.map(f => `${f.fieldname} (${f.fieldtype}) - label: ${f.label}`);
      console.log(`\nChild Table (${childName}) Fields:`, fields);
    });
  });
  req2.end();
}
