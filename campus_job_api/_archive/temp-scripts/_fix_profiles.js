const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'204114',database:'campus_job_platform'});

  // 用户15：保留现有人格画像，补充简历数据
  const [r15] = await conn.execute("SELECT personality_profile FROM users WHERE id = 15");
  let p15 = typeof r15[0].personality_profile === 'string' ? JSON.parse(r15[0].personality_profile) : r15[0].personality_profile;
  p15.workExperience = [
    {
      title: "前端开发实习生",
      company: "校园科技工作室",
      period: "2025.03 - 至今",
      description: "参与校园兼职平台前端开发，使用Angular框架完成多个页面模块的开发与优化。",
      skills: ["Angular", "TypeScript", "Tailwind CSS"]
    },
    {
      title: "数学辅导助教",
      company: "校内辅导中心",
      period: "2024.09 - 2025.02",
      description: "协助主讲老师批改作业、组织答疑，帮助低年级学生巩固高等数学基础。",
      skills: ["教学辅导", "沟通表达", "数学建模"]
    }
  ];
  p15.education = [
    {
      school: "华东师范大学",
      degree: "本科",
      gpa: "3.7/4.0",
      graduationYear: "2026",
      status: "在读",
      courses: "数据结构、算法设计、软件工程、数据库原理",
      honors: "校级一等奖学金、优秀共青团员"
    }
  ];
  p15.technicalSkills = ["JavaScript", "Python", "Java", "Angular", "Vue.js", "Node.js", "MySQL"];
  p15.tools = ["VS Code", "Git", "Docker", "Figma", "Postman"];
  p15.languages = "英语 CET-6（580分），普通话二级甲等";
  await conn.execute("UPDATE users SET personality_profile = ? WHERE id = 15", [JSON.stringify(p15)]);

  // 用户23：保留现有人格画像，补充简历数据
  const [r23] = await conn.execute("SELECT personality_profile FROM users WHERE id = 23");
  let p23 = typeof r23[0].personality_profile === 'string' ? JSON.parse(r23[0].personality_profile) : r23[0].personality_profile;
  p23.workExperience = [
    {
      title: "Python数据分析兼职",
      company: "某教育科技公司",
      period: "2025.01 - 至今",
      description: "使用Python进行用户行为数据分析，输出周报与可视化报表，辅助产品决策。",
      skills: ["Python", "Pandas", "数据可视化"]
    }
  ];
  p23.education = [
    {
      school: "复旦大学",
      degree: "本科",
      gpa: "3.5/4.0",
      graduationYear: "2027",
      status: "在读",
      courses: "统计学、机器学习、数据挖掘、经济学原理",
      honors: "国家励志奖学金"
    }
  ];
  p23.technicalSkills = ["Python", "R语言", "SQL", "Excel高级", "SPSS", "Tableau"];
  p23.tools = ["Jupyter Notebook", "PyCharm", "Git", "Excel"];
  p23.languages = "英语 CET-4（520分）";
  await conn.execute("UPDATE users SET personality_profile = ? WHERE id = 23", [JSON.stringify(p23)]);

  // 验证
  const [users] = await conn.execute("SELECT id, username, personality_profile FROM users WHERE id IN (15, 23)");
  users.forEach(u => {
    let pp = typeof u.personality_profile === 'string' ? JSON.parse(u.personality_profile) : u.personality_profile;
    console.log('=== User', u.id, u.username, '===');
    console.log('workExperience:', pp.workExperience?.length || 0, '条');
    console.log('education:', pp.education?.length || 0, '条');
    console.log('technicalSkills:', pp.technicalSkills?.join(', ') || '无');
    console.log('tools:', pp.tools?.join(', ') || '无');
    console.log('languages:', pp.languages || '无');
  });
  await conn.end();
})();
