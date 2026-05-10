const { verifyIdentity, checkFraud } = require('../services/aiService');

async function test() {
  console.log('[Test] Calling AI verification service...');
  const result = await verifyIdentity('enterprise', '9999', '企业名称：测试科技有限公司\n营业执照号：123456789012345\n联系人：张三\n联系电话：13800138000\n地址：北京市朝阳区\n行业：互联网\n规模：50-100人\n官网：www.test.com\n其他资质：无\n营业执照图片：https://via.placeholder.com/400x300');
  console.log('[Test] AI Result:', JSON.stringify(result, null, 2));

  console.log('[Test] Calling AI fraud check service...');
  const fraud = await checkFraud({
    jobId: '1',
    title: '测试岗位',
    company: '测试公司',
    salary: '5000',
    description: '负责测试工作',
    requirements: ['本科', '1年经验']
  });
  console.log('[Test] Fraud Result:', JSON.stringify(fraud, null, 2));
}

test().catch(console.error);
