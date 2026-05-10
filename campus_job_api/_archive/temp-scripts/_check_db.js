const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'204114',database:'campus_job_platform'});
  const [jobs] = await conn.execute('SELECT id, title, category, description, job_type FROM jobs LIMIT 10');
  console.log('--- Jobs ---');
  jobs.forEach(j => console.log(JSON.stringify(j, null, 2)));
  await conn.end();
})();
