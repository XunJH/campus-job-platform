require('dotenv').config();

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Job,
  Application,
  Bookmark,
  Conversation,
  ConversationMessage,
  ConversationParticipantState,
  Settlement,
  Ticket,
  AdminOperationLog,
  SystemNotification,
  NotificationReadState,
  PlatformSetting,
  Verification
} = require('../models');

const DEMO_PASSWORD = '123456';

function daysFromNow(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value;
}

function daysAgo(days) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

function dataUrlCard(label, background, foreground = '#FFFFFF') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" rx="24" fill="${background}" />
      <text x="160" y="98" text-anchor="middle" font-size="28" font-family="Microsoft YaHei, Arial, sans-serif" fill="${foreground}">
        ${label}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildPersonalityProfile(config) {
  return {
    summary: config.summary,
    tags: config.tags,
    strengths: config.strengths,
    suitableJobs: config.suitableJobs,
    preferredJobTypes: config.preferredJobTypes,
    workStyle: config.workStyle,
    communicationStyle: config.communicationStyle,
    riskAwareness: config.riskAwareness,
    resumeImage: dataUrlCard(`${config.name}简历`, config.resumeColor),
    aiWorkbench: config.aiWorkbench || {}
  };
}

function buildVerificationRisk(level, summary, warningSigns, recommendation) {
  return {
    risk_level: level,
    summary,
    warning_signs: warningSigns,
    recommendation
  };
}

function buildJobRisk(level, warningSigns, recommendation) {
  return {
    risk_level: level,
    warning_signs: warningSigns,
    recommendation
  };
}

async function createUsers(passwordHash) {
  const admins = await User.bulkCreate([
    {
      username: '管理员1',
      password: passwordHash,
      email: 'admin1@demo.local',
      role: 'admin',
      status: 'active',
      phone: '18800000001',
      bio: '负责平台日常审核与风控处置的演示管理员。',
      creditScore: 100
    },
    {
      username: '管理员2',
      password: passwordHash,
      email: 'admin2@demo.local',
      role: 'admin',
      status: 'active',
      phone: '18800000002',
      bio: '负责申诉工单与系统通知的演示管理员。',
      creditScore: 100
    }
  ]);

  const employers = await User.bulkCreate([
    {
      username: '测试企业1',
      password: passwordHash,
      email: 'employer1@demo.local',
      role: 'employer',
      status: 'active',
      phone: '17700000001',
      bio: '校园科技园A栋302，长期招聘前端、数据分析与产品助理。',
      creditScore: 98,
    },
    {
      username: '测试企业2',
      password: passwordHash,
      email: 'employer2@demo.local',
      role: 'employer',
      status: 'active',
      phone: '17700000002',
      bio: '校园国际交流中心，提供外语与新媒体方向兼职岗位。',
      creditScore: 95,
    },
    {
      username: '测试企业3',
      password: passwordHash,
      email: 'employer3@demo.local',
      role: 'employer',
      status: 'active',
      phone: '17700000003',
      bio: '用于演示企业认证待审核流程。',
      creditScore: 88,
    },
    {
      username: '测试企业4',
      password: passwordHash,
      email: 'employer4@demo.local',
      role: 'employer',
      status: 'active',
      phone: '17700000004',
      bio: '用于演示企业认证被驳回与申诉流程。',
      creditScore: 82,
    }
  ]);

  const students = await User.bulkCreate([
    {
      username: '测试学生1',
      password: passwordHash,
      email: 'student1@demo.local',
      role: 'student',
      status: 'active',
      phone: '16600000001',
      bio: '计算机科学专业，偏向前端开发与产品设计岗位。',
      creditScore: 97,
      personalityProfile: buildPersonalityProfile({
        name: '测试学生1',
        summary: '擅长前端开发与跨团队沟通，适合校园产品和技术类兼职。',
        tags: ['外向协作', '执行力强', '学习速度快'],
        strengths: ['Vue/Angular 开发', '页面设计', '沟通协调'],
        suitableJobs: ['前端开发实习生', '产品助理', '新媒体运营'],
        preferredJobTypes: ['internship', 'part_time'],
        workStyle: '注重协作，能快速推动任务落地',
        communicationStyle: '沟通直接、反馈及时',
        riskAwareness: '对押金、私下转账等风险较敏感',
        resumeColor: '#2563EB',
        aiWorkbench: {
          resumeOptimize: {
            input: {
              section: '项目经历',
              content: '完成校园招聘平台前端搭建与交互实现。',
              jobTarget: '前端开发实习生'
            },
            result: {
              score: 88,
              suggestions: ['突出成果指标', '补充协作细节'],
              rewrittenContent: '主导校园招聘平台学生端核心页面开发，完成岗位推荐、投递与沟通流程的交互实现。'
            },
            updatedAt: daysAgo(1).toISOString()
          },
          careerPlan: {
            input: {
              targetJob: '前端开发实习生',
              currentSkills: 'HTML,CSS,TypeScript,Angular',
              personalityTags: '外向协作,执行力强'
            },
            result: {
              summary: '建议先从校园产品实习切入，重点补强工程化与接口联调。',
              nextActions: ['持续完善作品集', '准备前端常见面试题', '积累真实项目交付经验']
            },
            updatedAt: daysAgo(2).toISOString()
          }
        }
      }),
      personalityProfileCompletedAt: daysAgo(2)
    },
    {
      username: '测试学生2',
      password: passwordHash,
      email: 'student2@demo.local',
      role: 'student',
      status: 'active',
      phone: '16600000002',
      bio: '统计学专业，偏向数据分析、运营和内容类兼职。',
      creditScore: 94,
      personalityProfile: buildPersonalityProfile({
        name: '测试学生2',
        summary: '对数据分析和内容运营有较强兴趣，做事细致。',
        tags: ['理性分析', '细致耐心', '目标清晰'],
        strengths: ['Python 数据处理', 'Excel', '内容整理'],
        suitableJobs: ['Python数据分析兼职', '新媒体运营', '内容编辑'],
        preferredJobTypes: ['part_time', 'internship'],
        workStyle: '偏独立推进，注重结果复盘',
        communicationStyle: '表达清晰，善于整理结构',
        riskAwareness: '会优先核验岗位真实性和结算方式',
        resumeColor: '#059669',
        aiWorkbench: {
          interview: {
            input: {
              jobTitle: 'Python数据分析兼职',
              messages: ['请介绍一次你用数据解决问题的经历']
            },
            result: {
              summary: '表达逻辑清楚，但建议补充更多业务场景和结果数字。',
              score: 84
            },
            updatedAt: daysAgo(3).toISOString()
          }
        }
      }),
      personalityProfileCompletedAt: daysAgo(3)
    },
    {
      username: '测试学生3',
      password: passwordHash,
      email: 'student3@demo.local',
      role: 'student',
      status: 'active',
      phone: '16600000003',
      bio: '英语专业，偏向外教助理、教辅与国际交流方向兼职。',
      creditScore: 91,
      personalityProfile: buildPersonalityProfile({
        name: '测试学生3',
        summary: '语言表达能力强，适合教学和国际交流类岗位。',
        tags: ['亲和力强', '服务意识', '耐心稳定'],
        strengths: ['英语口语', '课程辅导', '活动组织'],
        suitableJobs: ['英语外教助理', '教学辅导', '国际交流接待'],
        preferredJobTypes: ['part_time', 'temporary'],
        workStyle: '关注体验与细节，适合服务型岗位',
        communicationStyle: '友好耐心，善于解释',
        riskAwareness: '对合同条款和薪资说明比较关注',
        resumeColor: '#F59E0B'
      }),
      personalityProfileCompletedAt: daysAgo(4)
    },
    {
      username: '测试学生4',
      password: passwordHash,
      email: 'student4@demo.local',
      role: 'student',
      status: 'active',
      phone: '16600000004',
      bio: '留作现场演示人格测评、岗位投递和聊天链路的干净测试账号。',
      creditScore: 90,
    }
  ]);

  return { admins, employers, students };
}

async function createPlatformSettings(admin) {
  return PlatformSetting.create({
    scope: 'default',
    jobCategories: ['技术类', '教学类', '配送类', '营销类', '其他'],
    workLocationOptions: ['校内', '远程', '混合'],
    sensitiveWords: ['押金', '刷单', '私下转账', '高额返利'],
    aiRiskThresholds: {
      verificationHigh: 0.8,
      jobHigh: 0.75,
      chatHigh: 0.85
    },
    featureToggles: {
      enableBatchApply: true,
      enableAiAssistant: true,
      enableAppeals: true,
      requireResumeImageBeforeApply: false,
      enableConversationReminder: true
    },
    operationRules: {
      batchApplyLimit: 20,
      reportWindowDays: 30,
      ticketResponseHours: 24
    },
    updatedBy: admin.id
  });
}

async function createVerifications(employers) {
  return Verification.bulkCreate([
    {
      userId: employers[0].id,
      companyName: '测试企业1',
      licenseNumber: 'DEMO-LIC-1001',
      contactName: '王老师',
      contactPhone: '17700000001',
      licenseImage: '/uploads/demo/licenses/license-1.svg',
      city: '北京',
      address: '校内科技园A栋302',
      industry: '校园科技服务',
      scale: '20-50人',
      website: 'https://demo-employer1.local',
      otherQualifications: '已通过校园合作单位认证',
      status: 'approved',
      submittedAt: daysAgo(10),
      reviewedAt: daysAgo(9),
      aiAuditResult: buildVerificationRisk(
        'low',
        '企业资质信息完整，联系方式与行业方向一致。',
        ['联系信息与营业执照一致'],
        '可正常通过人工复核'
      )
    },
    {
      userId: employers[1].id,
      companyName: '测试企业2',
      licenseNumber: 'DEMO-LIC-1002',
      contactName: '李老师',
      contactPhone: '17700000002',
      licenseImage: '/uploads/demo/licenses/license-2.svg',
      city: '北京',
      address: '校园国际交流中心',
      industry: '教育与内容服务',
      scale: '50-100人',
      website: 'https://demo-employer2.local',
      otherQualifications: '提供多语种课程服务',
      status: 'approved',
      submittedAt: daysAgo(8),
      reviewedAt: daysAgo(7),
      aiAuditResult: buildVerificationRisk(
        'medium',
        '企业信息基本完整，但办公地址与官网展示信息存在轻微差异。',
        ['官网展示地址与提交地址不完全一致'],
        '建议管理员补充复核办公场地照片'
      )
    },
    {
      userId: employers[2].id,
      companyName: '测试企业3',
      licenseNumber: 'DEMO-LIC-1003',
      contactName: '赵老师',
      contactPhone: '17700000003',
      licenseImage: '/uploads/demo/licenses/license-3.svg',
      city: '北京',
      address: '创业中心B座201',
      industry: '校园运营服务',
      scale: '10-20人',
      website: 'https://demo-employer3.local',
      otherQualifications: '用于演示待审核企业',
      status: 'pending',
      submittedAt: daysAgo(1),
      reviewedAt: null,
      aiAuditResult: buildVerificationRisk(
        'medium',
        '基础证照已提交，但企业官网与工商信息存在待确认项。',
        ['网站信息缺少备案说明'],
        '建议管理员继续核验后决定是否通过'
      )
    },
    {
      userId: employers[3].id,
      companyName: '测试企业4',
      licenseNumber: 'DEMO-LIC-1004',
      contactName: '孙老师',
      contactPhone: '17700000004',
      licenseImage: '/uploads/demo/licenses/license-4.svg',
      city: '北京',
      address: '校外商务楼1302',
      industry: '兼职中介',
      scale: '10人以下',
      website: 'https://demo-employer4.local',
      otherQualifications: '用于演示被驳回企业与申诉工单',
      status: 'rejected',
      rejectionReason: '证照与企业官网信息不一致，存在较高中介风险。',
      submittedAt: daysAgo(5),
      reviewedAt: daysAgo(4),
      aiAuditResult: buildVerificationRisk(
        'high',
        '营业执照、官网和联系人信息存在明显冲突。',
        ['联系人手机号与官网公示不一致', '企业行业描述与历史投诉标签匹配'],
        '建议驳回并要求补充权属证明'
      )
    }
  ]);
}

async function createJobs(employers) {
  const jobs = await Job.bulkCreate([
    {
      title: '前端开发实习生',
      description: '协助完善校园招聘平台的前端页面与交互体验，参与接口联调和缺陷修复。',
      requirements: '熟悉 HTML、CSS、JavaScript/TypeScript，了解 Angular 或 Vue，具备良好的沟通能力。',
      salary: 2500,
      salaryType: 'monthly',
      location: '校内科技园A栋302',
      workLocation: 'on_campus',
      category: '技术类',
      jobType: 'internship',
      workingHours: '每周至少4天，09:30-18:00',
      deadline: daysFromNow(15),
      employerId: employers[0].id,
      status: 'active',
      views: 128,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('low', ['薪资与岗位职责匹配'], '可正常展示给学生')
    },
    {
      title: 'Python数据分析兼职',
      description: '负责活动数据清洗、报表整理与基础可视化输出，协助运营做复盘。',
      requirements: '熟悉 Python、Excel，掌握数据清洗与基础图表分析，做事细致。',
      salary: 50,
      salaryType: 'hourly',
      location: '远程协作',
      workLocation: 'remote',
      category: '技术类',
      jobType: 'part_time',
      workingHours: '每周15小时，可远程',
      deadline: daysFromNow(10),
      employerId: employers[0].id,
      status: 'active',
      views: 96,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('low', ['岗位描述清晰'], '可继续推荐给具备数据能力的学生')
    },
    {
      title: '英语外教助理',
      description: '协助外教准备课堂资料、组织口语活动并跟进学生反馈。',
      requirements: '英语口语流畅，责任心强，有教学或活动组织经验优先。',
      salary: 2200,
      salaryType: 'monthly',
      location: '校园国际交流中心',
      workLocation: 'on_campus',
      category: '教学类',
      jobType: 'part_time',
      workingHours: '周中下午与周末上午',
      deadline: daysFromNow(12),
      employerId: employers[1].id,
      status: 'active',
      views: 75,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('low', ['教学场景明确'], '可直接上线')
    },
    {
      title: '活动执行助理',
      description: '参与校园活动物料准备、现场执行和流程串联。',
      requirements: '执行力强，能适应活动现场节奏，有社团或大型活动经历优先。',
      salary: 180,
      salaryType: 'daily',
      location: '创业中心广场',
      workLocation: 'on_campus',
      category: '营销类',
      jobType: 'temporary',
      workingHours: '活动日整天',
      deadline: daysFromNow(20),
      employerId: employers[1].id,
      status: 'active',
      views: 58,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('medium', ['现场执行岗位人员流动较大'], '建议企业保持结算说明透明')
    },
    {
      title: '校园新媒体运营',
      description: '负责短文案撰写、社群维护与活动预热内容发布。',
      requirements: '有文案基础，了解公众号/短视频平台，善于整理传播节奏。',
      salary: 2000,
      salaryType: 'monthly',
      location: '混合办公（校内+线上）',
      workLocation: 'hybrid',
      category: '营销类',
      jobType: 'part_time',
      workingHours: '每天2-3小时，时间灵活',
      deadline: daysFromNow(18),
      employerId: employers[1].id,
      status: 'active',
      views: 87,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('low', ['岗位要求与薪资匹配'], '适合推荐给内容和传播方向学生')
    },
    {
      title: '校园地推专员',
      description: '协助线下拉新、推广活动介绍和意向用户登记。',
      requirements: '性格开朗，愿意外出沟通，有校园活动经验优先。',
      salary: 160,
      salaryType: 'daily',
      location: '校园主干道',
      workLocation: 'on_campus',
      category: '营销类',
      jobType: 'temporary',
      workingHours: '工作日傍晚',
      deadline: daysFromNow(14),
      employerId: employers[0].id,
      status: 'draft',
      views: 12,
      applicationsCount: 0,
      auditStatus: 'pending',
      fraudCheckResult: buildJobRisk('medium', ['岗位推广场景涉及线下私域引流'], '建议管理员核实活动主办方资质')
    },
    {
      title: '短视频剪辑兼职',
      description: '负责视频剪辑、包装和平台发布。',
      requirements: '熟悉剪映或 Premiere，接受押金后再安排排班。',
      salary: 3000,
      salaryType: 'monthly',
      location: '线上接单',
      workLocation: 'remote',
      category: '其他',
      jobType: 'part_time',
      workingHours: '弹性',
      deadline: daysFromNow(7),
      employerId: employers[1].id,
      status: 'cancelled',
      views: 41,
      applicationsCount: 0,
      auditStatus: 'rejected',
      rejectionReason: '岗位描述包含押金要求，存在较高风险。',
      fraudCheckResult: buildJobRisk('high', ['出现押金要求', '排班规则不清晰'], '建议直接驳回并列入重点关注')
    },
    {
      title: 'Java后端开发工程师',
      description: '协助维护校内管理系统接口，完成功能联调与日志排查。',
      requirements: '熟悉 Java/SpringBoot，具备接口调试能力。',
      salary: 3200,
      salaryType: 'monthly',
      location: '校内科技园B栋101',
      workLocation: 'on_campus',
      category: '技术类',
      jobType: 'internship',
      workingHours: '每周3-4天',
      deadline: daysFromNow(5),
      employerId: employers[0].id,
      status: 'closed',
      views: 63,
      applicationsCount: 0,
      auditStatus: 'approved',
      fraudCheckResult: buildJobRisk('low', ['技术岗需求清晰'], '已完成阶段性招聘，可关闭岗位')
    }
  ]);

  return jobs;
}

async function createApplications(admins, employers, students, jobs) {
  const applications = await Application.bulkCreate([
    {
      studentId: students[0].id,
      jobId: jobs[0].id,
      status: 'pending',
      applicationStage: 'interview_confirmed',
      coverLetter: '我已经完成相关前端项目开发，希望进一步参与真实业务交付。',
      resume: '/uploads/demo/resumes/student-1.svg',
      appliedAt: daysAgo(4),
      stageUpdatedAt: daysAgo(1),
      notes: '已确认周三下午 14:00 面试。'
    },
    {
      studentId: students[1].id,
      jobId: jobs[1].id,
      status: 'pending',
      applicationStage: 'screening',
      coverLetter: '我熟悉 Python 数据清洗和图表分析，希望参与数据复盘工作。',
      resume: '/uploads/demo/resumes/student-2.svg',
      appliedAt: daysAgo(3),
      stageUpdatedAt: daysAgo(2),
      notes: '简历方向匹配，待进一步核验时间安排。'
    },
    {
      studentId: students[2].id,
      jobId: jobs[2].id,
      status: 'approved',
      applicationStage: 'archived',
      coverLetter: '我有多次英语活动志愿经历，能协助课堂组织与口语活动。',
      resume: '/uploads/demo/resumes/student-3.svg',
      appliedAt: daysAgo(7),
      reviewedAt: daysAgo(5),
      reviewedBy: employers[1].id,
      stageUpdatedAt: daysAgo(5),
      notes: '已通过并安排入岗。'
    },
    {
      studentId: students[3].id,
      jobId: jobs[3].id,
      status: 'rejected',
      applicationStage: 'rejected_pool',
      coverLetter: '我有社团活动执行经验，希望参与活动现场支持。',
      appliedAt: daysAgo(6),
      reviewedAt: daysAgo(4),
      reviewedBy: employers[1].id,
      stageUpdatedAt: daysAgo(4),
      notes: '执行经验不足，建议先积累更多活动案例。'
    },
    {
      studentId: students[0].id,
      jobId: jobs[4].id,
      status: 'pending',
      applicationStage: 'new',
      coverLetter: '我有新媒体内容运营经历，希望进一步参与校园品牌传播。',
      resume: '/uploads/demo/resumes/student-1.svg',
      appliedAt: daysAgo(2),
      stageUpdatedAt: daysAgo(2),
      notes: '新投递，待企业初筛。'
    },
    {
      studentId: students[1].id,
      jobId: jobs[7].id,
      status: 'approved',
      applicationStage: 'archived',
      coverLetter: '我参与过校内系统接口调试，希望继续积累工程实践经验。',
      resume: '/uploads/demo/resumes/student-2.svg',
      appliedAt: daysAgo(9),
      reviewedAt: daysAgo(7),
      reviewedBy: employers[0].id,
      stageUpdatedAt: daysAgo(7),
      notes: '已完成录用，进入结算阶段。'
    }
  ]);

  const jobCounts = new Map();
  applications.forEach((application) => {
    jobCounts.set(application.jobId, (jobCounts.get(application.jobId) || 0) + 1);
  });

  for (const job of jobs) {
    await job.update({ applicationsCount: jobCounts.get(job.id) || 0 });
  }

  return applications;
}

async function createConversations(applications, students, employers) {
  const conversationSeeds = [
    {
      application: applications[0],
      student: students[0],
      employer: employers[0],
      messages: [
        {
          senderId: students[0].id,
          senderRole: 'student',
          messageType: 'text',
          content: '老师您好，我已经看过岗位要求，本周可以配合面试安排。'
        },
        {
          senderId: employers[0].id,
          senderRole: 'employer',
          messageType: 'text',
          content: '收到，已为你预留周三下午 14:00 的线上面试时间。'
        }
      ],
      unread: { student: 0, employer: 0 }
    },
    {
      application: applications[1],
      student: students[1],
      employer: employers[0],
      messages: [
        {
          senderId: students[1].id,
          senderRole: 'student',
          messageType: 'text',
          content: '我可以补充一个最近做的数据清洗项目链接，方便老师参考。'
        }
      ],
      unread: { student: 0, employer: 1 }
    },
    {
      application: applications[2],
      student: students[2],
      employer: employers[1],
      messages: [
        {
          senderId: employers[1].id,
          senderRole: 'employer',
          messageType: 'system',
          content: '已确认录用，请按要求准备入岗资料。'
        },
        {
          senderId: students[2].id,
          senderRole: 'student',
          messageType: 'text',
          content: '好的，我会在今晚前提交所需资料。'
        }
      ],
      unread: { student: 0, employer: 0 }
    },
    {
      application: applications[4],
      student: students[0],
      employer: employers[1],
      messages: [
        {
          senderId: employers[1].id,
          senderRole: 'employer',
          messageType: 'text',
          content: '已收到你的投递，我们会在 24 小时内完成初筛。'
        }
      ],
      unread: { student: 1, employer: 0 }
    }
  ];

  for (const seed of conversationSeeds) {
    const conversation = await Conversation.create({
      applicationId: seed.application.id,
      jobId: seed.application.jobId,
      studentId: seed.student.id,
      employerId: seed.employer.id,
      status: 'active'
    });

    let lastMessage = null;
    for (const messageSeed of seed.messages) {
      lastMessage = await ConversationMessage.create({
        conversationId: conversation.id,
        senderId: messageSeed.senderId,
        senderRole: messageSeed.senderRole,
        messageType: messageSeed.messageType,
        content: messageSeed.content
      });
    }

    await ConversationParticipantState.bulkCreate([
      {
        conversationId: conversation.id,
        userId: seed.student.id,
        role: 'student',
        unreadCount: seed.unread.student,
        lastReadAt: daysAgo(1)
      },
      {
        conversationId: conversation.id,
        userId: seed.employer.id,
        role: 'employer',
        unreadCount: seed.unread.employer,
        lastReadAt: daysAgo(1)
      }
    ]);

    await conversation.update({
      lastMessagePreview: lastMessage?.content || null,
      lastMessageAt: lastMessage?.createdAt || daysAgo(1)
    });
  }
}

async function createBookmarks(students, jobs) {
  return Bookmark.bulkCreate([
    { studentId: students[0].id, jobId: jobs[1].id, createdAt: daysAgo(2) },
    { studentId: students[0].id, jobId: jobs[2].id, createdAt: daysAgo(1) },
    { studentId: students[1].id, jobId: jobs[0].id, createdAt: daysAgo(3) },
    { studentId: students[2].id, jobId: jobs[4].id, createdAt: daysAgo(1) }
  ]);
}

async function createSettlements(applications, jobs, students, employers) {
  return Settlement.bulkCreate([
    {
      applicationId: applications[2].id,
      jobId: jobs[2].id,
      studentId: students[2].id,
      employerId: employers[1].id,
      amount: 2200,
      salaryType: 'monthly',
      status: 'disputed',
      notes: '学生提出课时统计与实际结算不一致，等待管理员介入。',
      paidAt: null,
      paidBy: null
    },
    {
      applicationId: applications[5].id,
      jobId: jobs[7].id,
      studentId: students[1].id,
      employerId: employers[0].id,
      amount: 3200,
      salaryType: 'monthly',
      status: 'paid',
      notes: '项目阶段完成，已按月支付。',
      paidAt: daysAgo(3),
      paidBy: employers[0].id
    }
  ]);
}

async function createTickets(admins, employers, jobs, verifications, settlements) {
  return Ticket.bulkCreate([
    {
      title: '结算金额争议待复核',
      description: '学生反馈英语外教助理岗位的课时统计与企业结算金额不一致，请管理员复核。',
      type: 'settlement_dispute',
      sourceRole: 'system',
      status: 'in_progress',
      priority: 'high',
      userId: employers[1].id,
      assigneeId: admins[0].id,
      relatedSettlementId: settlements[0].id,
      resolutionNote: '已要求企业补充课时记录截图，等待学生确认。',
      resolvedAt: null
    },
    {
      title: '企业认证驳回申诉',
      description: '测试企业4 针对认证驳回结果提交申诉，请管理员复核补充材料。',
      type: 'verification_appeal',
      sourceRole: 'employer',
      status: 'open',
      priority: 'medium',
      userId: employers[3].id,
      assigneeId: admins[1].id,
      relatedVerificationId: verifications[3].id,
      resolutionNote: null,
      resolvedAt: null
    },
    {
      title: '高风险岗位人工复查',
      description: '短视频剪辑兼职因押金条款被驳回，保留工单用于答辩演示风险处置流程。',
      type: 'job_appeal',
      sourceRole: 'admin',
      status: 'resolved',
      priority: 'high',
      userId: admins[0].id,
      assigneeId: admins[0].id,
      relatedJobId: jobs[6].id,
      resolutionNote: '已驳回岗位并通知企业修改条款后重新提交。',
      resolvedAt: daysAgo(2)
    }
  ]);
}

async function createNotifications(admins, employers, students, jobs, verifications, settlements, tickets) {
  const notifications = await SystemNotification.bulkCreate([
    {
      title: '欢迎使用校园招聘平台演示环境',
      content: '当前账号库已重置为答辩演示数据，可直接体验学生、企业与管理端完整流程。',
      type: 'announcement',
      targetRole: 'all',
      senderAdminId: admins[0].id,
      isPinned: true,
      actionUrl: '/student/jobs'
    },
    {
      title: '你的面试已确认',
      content: '测试企业1 已为你确认前端开发实习生面试，请按时参加。',
      type: 'audit_result',
      targetRole: 'student',
      targetUserId: students[0].id,
      senderAdminId: admins[0].id,
      relatedJobId: jobs[0].id,
      actionUrl: '/student/messages'
    },
    {
      title: '你收到新的投递申请',
      content: '测试学生2 已投递 Python数据分析兼职，建议优先查看资料并进入筛选阶段。',
      type: 'system',
      targetRole: 'employer',
      targetUserId: employers[0].id,
      relatedJobId: jobs[1].id,
      actionUrl: '/employer/applications'
    },
    {
      title: '企业认证待审核',
      content: '测试企业3 已提交新的认证材料，请管理员进入认证审核台处理。',
      type: 'ticket_update',
      targetRole: 'admin',
      targetUserId: admins[1].id,
      relatedVerificationId: verifications[2].id,
      relatedTicketId: tickets[1].id,
      actionUrl: '/admin/verifications'
    },
    {
      title: '结算争议处理中',
      content: '英语外教助理岗位的结算争议已进入管理员复核流程，请留意后续通知。',
      type: 'settlement',
      targetRole: 'student',
      targetUserId: students[2].id,
      senderAdminId: admins[0].id,
      relatedSettlementId: settlements[0].id,
      relatedTicketId: tickets[0].id,
      actionUrl: '/student/wallet'
    }
  ]);

  return NotificationReadState.bulkCreate([
    {
      notificationId: notifications[0].id,
      userId: admins[0].id,
      readAt: daysAgo(1)
    },
    {
      notificationId: notifications[2].id,
      userId: employers[0].id,
      readAt: daysAgo(1)
    }
  ]);
}

async function createAdminLogs(admins, verifications, jobs, tickets) {
  return AdminOperationLog.bulkCreate([
    {
      adminId: admins[0].id,
      actionType: 'verification_approved',
      targetType: 'verification',
      targetId: verifications[0].id,
      summary: '通过测试企业1认证审核',
      detail: '核验营业执照、联系人与企业介绍后通过。',
      metadata: { companyName: '测试企业1' },
      ipAddress: '127.0.0.1',
      userAgent: 'demo-seed-script'
    },
    {
      adminId: admins[1].id,
      actionType: 'job_rejected',
      targetType: 'job',
      targetId: jobs[6].id,
      summary: '驳回高风险岗位短视频剪辑兼职',
      detail: '岗位描述包含押金条款，已驳回并记录风控原因。',
      metadata: { riskLevel: 'high' },
      ipAddress: '127.0.0.1',
      userAgent: 'demo-seed-script'
    },
    {
      adminId: admins[0].id,
      actionType: 'ticket_in_progress',
      targetType: 'ticket',
      targetId: tickets[0].id,
      summary: '跟进结算争议工单',
      detail: '已要求企业补充课时记录，工单进入处理中。',
      metadata: { ticketType: 'settlement_dispute' },
      ipAddress: '127.0.0.1',
      userAgent: 'demo-seed-script'
    }
  ]);
}

function printCredentials() {
  const lines = [
    '',
    '演示账号已重置完成，统一密码：123456',
    '',
    '管理员账号：',
    '  管理员1 / 123456',
    '  管理员2 / 123456',
    '',
    '企业账号：',
    '  测试企业1 / 123456',
    '  测试企业2 / 123456',
    '  测试企业3 / 123456',
    '  测试企业4 / 123456',
    '',
    '学生账号：',
    '  测试学生1 / 123456',
    '  测试学生2 / 123456',
    '  测试学生3 / 123456',
    '  测试学生4 / 123456',
    '',
    '建议答辩演示：',
    '  学生端：测试学生4（干净链路，适合现场测评与投递）',
    '  企业端：测试企业1（岗位、申请、沟通、推荐数据最完整）',
    '  管理端：管理员1（风控、审核、工单、通知数据最完整）',
    ''
  ];

  console.log(lines.join('\n'));
}

async function resetDemoData() {
  try {
    console.log('开始重置本地答辩演示数据...');

    await sequelize.drop();
    await sequelize.sync({ force: true, alter: false });

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const { admins, employers, students } = await createUsers(passwordHash);

    await createPlatformSettings(admins[0]);
    const verifications = await createVerifications(employers);
    const jobs = await createJobs(employers);
    const applications = await createApplications(admins, employers, students, jobs);
    await createConversations(applications, students, employers);
    await createBookmarks(students, jobs);
    const settlements = await createSettlements(applications, jobs, students, employers);
    const tickets = await createTickets(admins, employers, jobs, verifications, settlements);
    await createNotifications(admins, employers, students, jobs, verifications, settlements, tickets);
    await createAdminLogs(admins, verifications, jobs, tickets);

    printCredentials();
    console.log('本地答辩演示数据重置完成。');
    process.exit(0);
  } catch (error) {
    console.error('重置演示数据失败：', error);
    process.exit(1);
  }
}

resetDemoData();
