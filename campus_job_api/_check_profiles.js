const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'204114',database:'campus_job_platform'});
  const [users] = await conn.execute("SELECT id, username, personality_profile FROM users WHERE role = 'student' LIMIT 3");
  users.forEach(u => {
    let pp = null;
    try { pp = typeof u.personality_profile === 'string' ? JSON.parse(u.personality_profile) : u.personality_profile; } catch(e) {}
    console.log('=== User', u.id, u.username, '===');
    console.log(JSON.stringify(pp, null, 2));
  });
  await conn.end();
})();
