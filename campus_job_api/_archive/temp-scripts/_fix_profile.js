const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'204114',database:'campus_job_platform'});
  await conn.execute("UPDATE users SET personality_profile_completed_at = NOW() WHERE role = 'student' AND personality_profile IS NOT NULL AND personality_profile != ''");
  const [users] = await conn.execute("SELECT id, username, personality_profile_completed_at FROM users WHERE role = 'student' LIMIT 3");
  users.forEach(u => console.log('User', u.id, u.username, 'completedAt:', u.personality_profile_completed_at));
  await conn.end();
})();
