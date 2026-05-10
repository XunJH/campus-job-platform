const axios = require('axios');
(async () => {
  const passwords = ['123456', '12345678', 'password', 'test123', '111111'];
  for (const pwd of passwords) {
    try {
      const res = await axios.post('http://localhost:3001/api/v1/auth/login', { username: '测试学生', password: pwd });
      console.log('SUCCESS with password:', pwd);
      console.log('user keys:', Object.keys(res.data.data.user));
      console.log('personalityProfile:', JSON.stringify(res.data.data.user.personalityProfile, null, 2));
      return;
    } catch(e) {
      if (e.response?.data?.message === '用户名或密码错误') {
        // continue
      } else {
        console.error('Other error:', e.response?.data || e.message);
        return;
      }
    }
  }
  console.log('None of the common passwords worked');
})();
