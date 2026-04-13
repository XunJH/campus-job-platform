const sequelize = require('../config/database');

const dropTables = async () => {
  try {
    console.log('警告：这将删除所有表及其数据！');
    console.log('是否继续？(y/n)');

    // 在实际使用中，你可能需要更复杂的确认机制
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('输入 y 继续，其他任意键取消: ', (answer) => {
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('操作已取消');
        process.exit(0);
      }

      dropAllTables();
    });
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
};

const dropAllTables = async () => {
  try {
    console.log('正在删除所有表...');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    await sequelize.drop();

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('所有表已成功删除！');
    process.exit(0);
  } catch (error) {
    console.error('删除表失败:', error);
    process.exit(1);
  }
};

dropTables();