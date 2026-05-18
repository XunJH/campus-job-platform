const { Op } = require('sequelize');
const {
  Conversation,
  ConversationMessage,
  ConversationParticipantState,
  Application,
  Job,
  User
} = require('../models');
const { sanitizeText } = require('../utils/sanitize');

const APPLICATION_STAGE_PRIORITY = {
  interview_confirmed: 7,
  new: 6,
  screening: 5,
  interview_shortlist: 4,
  rejected_pool: 2,
  archived: 1
};

const conversationListInclude = [
  {
    model: Application,
    as: 'application',
    attributes: [
      'id',
      'status',
      'applicationStage',
      'stageUpdatedAt',
      'appliedAt',
      'reviewedAt',
      'resume',
      'coverLetter',
      'notes'
    ]
  },
  {
    model: Job,
    as: 'job',
    attributes: ['id', 'title', 'location', 'salary', 'salaryType', 'status', 'auditStatus']
  },
  {
    model: User,
    as: 'student',
    attributes: ['id', 'username', 'avatar']
  },
  {
    model: User,
    as: 'employer',
    attributes: ['id', 'username', 'avatar']
  }
];

const messageInclude = [{
  model: User,
  as: 'sender',
  attributes: ['id', 'username', 'avatar']
}];

const buildConversationWhere = (user, applicationId) => {
  const where = {};

  if (user.role === 'student') {
    where.studentId = user.id;
  } else if (user.role === 'employer') {
    where.employerId = user.id;
  } else if (user.role !== 'admin') {
    where.id = null;
  }

  if (applicationId) {
    where.applicationId = applicationId;
  }

  return where;
};

const canAccessConversation = (conversation, user) => {
  if (!conversation) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return conversation.studentId === user.id || conversation.employerId === user.id;
};

const buildConversationPreview = (coverLetter, hasResume) => {
  if (coverLetter) {
    return sanitizeText(coverLetter).slice(0, 120);
  }

  if (hasResume) {
    return '已发送简历图片';
  }

  return '已发起岗位沟通';
};

const getParticipantRole = (conversation, userId) => {
  if (!conversation) {
    return null;
  }

  if (conversation.studentId === userId) {
    return 'student';
  }

  if (conversation.employerId === userId) {
    return 'employer';
  }

  return null;
};

const normalizeMessageForConversation = (message, conversation) => {
  const serialized = typeof message.toJSON === 'function' ? message.toJSON() : { ...message };

  if (!conversation) {
    return serialized;
  }

  if (serialized.senderId === conversation.studentId) {
    return {
      ...serialized,
      senderRole: 'student'
    };
  }

  if (serialized.senderId === conversation.employerId) {
    return {
      ...serialized,
      senderRole: 'employer'
    };
  }

  return serialized;
};

const getConversationStagePriority = (conversation) => {
  if (!conversation || conversation.application?.status === 'withdrawn') {
    return 0;
  }

  return APPLICATION_STAGE_PRIORITY[conversation.application?.applicationStage || 'new'] || 0;
};

const sortConversationsForUser = (conversations, userRole) => {
  return [...conversations].sort((left, right) => {
    if (userRole === 'employer') {
      const priorityDiff = getConversationStagePriority(right) - getConversationStagePriority(left);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
    }

    if ((right.unreadCount || 0) !== (left.unreadCount || 0)) {
      return (right.unreadCount || 0) - (left.unreadCount || 0);
    }

    const rightStageTime = right.application?.stageUpdatedAt ? new Date(right.application.stageUpdatedAt).getTime() : 0;
    const leftStageTime = left.application?.stageUpdatedAt ? new Date(left.application.stageUpdatedAt).getTime() : 0;
    if (rightStageTime !== leftStageTime) {
      return rightStageTime - leftStageTime;
    }

    const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
    const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
    return rightTime - leftTime;
  });
};

const ensureParticipantStates = async (conversation, options = {}) => {
  if (!conversation) {
    return {};
  }

  const {
    employerUnreadCount = 0,
    studentUnreadCount = 0,
    studentLastReadAt = null,
    employerLastReadAt = null
  } = options;

  const [studentState, studentCreated] = await ConversationParticipantState.findOrCreate({
    where: {
      conversationId: conversation.id,
      userId: conversation.studentId
    },
    defaults: {
      conversationId: conversation.id,
      userId: conversation.studentId,
      role: 'student',
      unreadCount: studentUnreadCount,
      lastReadAt: studentLastReadAt
    }
  });

  const [employerState, employerCreated] = await ConversationParticipantState.findOrCreate({
    where: {
      conversationId: conversation.id,
      userId: conversation.employerId
    },
    defaults: {
      conversationId: conversation.id,
      userId: conversation.employerId,
      role: 'employer',
      unreadCount: employerUnreadCount,
      lastReadAt: employerLastReadAt
    }
  });

  if (!studentCreated && studentState.role !== 'student') {
    await studentState.update({ role: 'student' });
  }

  if (!employerCreated && employerState.role !== 'employer') {
    await employerState.update({ role: 'employer' });
  }

  return { studentState, employerState };
};

const ensureConversationForApplication = async (application) => {
  if (!application || !application.job || !application.studentId || !application.job.employerId) {
    return null;
  }

  const existingConversation = await Conversation.findOne({
    where: { applicationId: application.id }
  });

  if (existingConversation) {
    await ensureParticipantStates(existingConversation);
    return existingConversation;
  }

  const studentName = application.student?.username || '学生';
  const resumeUrl = application.resume || application.student?.personalityProfile?.resumeImage || null;
  const preview = buildConversationPreview(application.coverLetter, Boolean(resumeUrl));
  const fallbackTime = application.appliedAt || new Date();

  const conversation = await Conversation.create({
    applicationId: application.id,
    jobId: application.jobId,
    studentId: application.studentId,
    employerId: application.job.employerId,
    lastMessagePreview: preview,
    lastMessageAt: fallbackTime
  });

  let lastMessageAt = fallbackTime;
  let initialUnreadCount = 0;

  if (resumeUrl) {
    const resumeMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: application.studentId,
      senderRole: 'student',
      messageType: 'resume',
      content: `${studentName} 已投递该岗位，并发送了简历图片。`,
      attachmentUrl: resumeUrl
    });
    lastMessageAt = resumeMessage.createdAt;
    initialUnreadCount += 1;
  }

  if (application.coverLetter) {
    const coverLetterMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: application.studentId,
      senderRole: 'student',
      messageType: 'text',
      content: application.coverLetter
    });
    lastMessageAt = coverLetterMessage.createdAt;
    initialUnreadCount += 1;
  } else if (!resumeUrl) {
    const systemMessage = await ConversationMessage.create({
      conversationId: conversation.id,
      senderId: application.studentId,
      senderRole: 'student',
      messageType: 'system',
      content: `${studentName} 已投递该岗位。`
    });
    lastMessageAt = systemMessage.createdAt;
    initialUnreadCount += 1;
  }

  await conversation.update({ lastMessageAt });
  await ensureParticipantStates(conversation, {
    studentUnreadCount: 0,
    employerUnreadCount: initialUnreadCount,
    studentLastReadAt: lastMessageAt,
    employerLastReadAt: null
  });

  return conversation;
};

const ensureConversationsForUser = async (user, applicationId) => {
  if (!['student', 'employer', 'admin'].includes(user.role)) {
    return;
  }

  const applicationWhere = {};
  const jobInclude = {
    model: Job,
    as: 'job',
    attributes: ['id', 'title', 'employerId']
  };

  if (applicationId) {
    applicationWhere.id = applicationId;
  }

  if (user.role === 'student') {
    applicationWhere.studentId = user.id;
  } else if (user.role === 'employer') {
    jobInclude.where = { employerId: user.id };
    jobInclude.required = true;
  }

  const applications = await Application.findAll({
    where: applicationWhere,
    include: [
      jobInclude,
      {
        model: User,
        as: 'student',
        attributes: ['id', 'username', 'personalityProfile']
      }
    ],
    order: [['appliedAt', 'DESC']]
  });

  for (const application of applications) {
    await ensureConversationForApplication(application);
  }
};

const getUnreadMapForUser = async (user, conversationIds) => {
  if (!conversationIds.length || !['student', 'employer'].includes(user.role)) {
    return {
      unreadMap: {},
      totalUnread: 0
    };
  }

  const states = await ConversationParticipantState.findAll({
    where: {
      userId: user.id,
      conversationId: { [Op.in]: conversationIds }
    }
  });

  const unreadMap = {};
  let totalUnread = 0;

  states.forEach((state) => {
    unreadMap[state.conversationId] = state.unreadCount || 0;
    totalUnread += state.unreadCount || 0;
  });

  return { unreadMap, totalUnread };
};

const markConversationAsRead = async (conversation, user) => {
  if (!conversation || !['student', 'employer'].includes(user.role)) {
    return;
  }

  const role = getParticipantRole(conversation, user.id);
  if (!role) {
    return;
  }

  const state = await ConversationParticipantState.findOne({
    where: {
      conversationId: conversation.id,
      userId: user.id
    }
  });

  if (!state) {
    await ensureParticipantStates(conversation, {
      studentUnreadCount: 0,
      employerUnreadCount: 0
    });
    return;
  }

  if (state.unreadCount !== 0 || !state.lastReadAt) {
    await state.update({
      unreadCount: 0,
      lastReadAt: new Date()
    });
  }
};

exports.getUnreadSummary = async (req, res) => {
  try {
    await ensureConversationsForUser(req.user, null);

    if (!['student', 'employer'].includes(req.user.role)) {
      return res.json({
        success: true,
        data: {
          totalUnread: 0,
          unreadConversations: 0
        }
      });
    }

    const states = await ConversationParticipantState.findAll({
      where: {
        userId: req.user.id,
        unreadCount: { [Op.gt]: 0 }
      }
    });

    const totalUnread = states.reduce((sum, state) => sum + (state.unreadCount || 0), 0);

    return res.json({
      success: true,
      data: {
        totalUnread,
        unreadConversations: states.length
      }
    });
  } catch (error) {
    console.error('获取未读消息摘要失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getMyConversations = async (req, res) => {
  try {
    const applicationId = req.query.applicationId ? parseInt(req.query.applicationId, 10) : null;
    await ensureConversationsForUser(req.user, applicationId);
    const where = buildConversationWhere(req.user, applicationId);

    const conversations = await Conversation.findAll({
      where,
      include: conversationListInclude,
      order: [
        ['lastMessageAt', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    });

    const conversationIds = conversations.map((conversation) => conversation.id);
    const { unreadMap, totalUnread } = await getUnreadMapForUser(req.user, conversationIds);

    const data = sortConversationsForUser(
      conversations.map((conversation) => ({
        ...conversation.toJSON(),
        unreadCount: unreadMap[conversation.id] || 0
      })),
      req.user.role
    );

    return res.json({
      success: true,
      data,
      meta: {
        totalUnread
      }
    });
  } catch (error) {
    console.error('获取沟通列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.getConversationDetail = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);

    if (Number.isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        message: '会话编号不正确'
      });
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: conversationListInclude
    });

    if (!canAccessConversation(conversation, req.user)) {
      return res.status(404).json({
        success: false,
        message: '会话不存在或无权访问'
      });
    }

    await markConversationAsRead(conversation, req.user);

    const messages = await ConversationMessage.findAll({
      where: { conversationId },
      include: messageInclude,
      order: [['createdAt', 'ASC']]
    });

    return res.json({
      success: true,
      data: {
        ...conversation.toJSON(),
        unreadCount: 0,
        messages: messages.map((message) => normalizeMessageForConversation(message, conversation))
      }
    });
  } catch (error) {
    console.error('获取会话详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id, 10);
    const rawContent = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (Number.isNaN(conversationId)) {
      return res.status(400).json({
        success: false,
        message: '会话编号不正确'
      });
    }

    if (!rawContent) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    if (rawContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: '单条消息不能超过 1000 个字符'
      });
    }

    const conversation = await Conversation.findByPk(conversationId, {
      include: [{
        model: Application,
        as: 'application',
        attributes: ['id', 'applicationStage', 'status']
      }]
    });

    if (!canAccessConversation(conversation, req.user)) {
      return res.status(404).json({
        success: false,
        message: '会话不存在或无权访问'
      });
    }

    await ensureParticipantStates(conversation);

    const content = sanitizeText(rawContent);
    const senderRole = getParticipantRole(conversation, req.user.id) || req.user.role;
    const message = await ConversationMessage.create({
      conversationId,
      senderId: req.user.id,
      senderRole,
      messageType: 'text',
      content
    });

    const senderState = await ConversationParticipantState.findOne({
      where: {
        conversationId,
        userId: req.user.id
      }
    });

    if (senderState) {
      await senderState.update({
        unreadCount: 0,
        lastReadAt: message.createdAt
      });
    }

    const recipientId = req.user.id === conversation.studentId
      ? conversation.employerId
      : req.user.id === conversation.employerId
        ? conversation.studentId
        : null;

    if (recipientId) {
      const recipientState = await ConversationParticipantState.findOne({
        where: {
          conversationId,
          userId: recipientId
        }
      });

      if (recipientState) {
        await recipientState.update({
          unreadCount: (recipientState.unreadCount || 0) + 1
        });
      }
    }

    await conversation.update({
      lastMessagePreview: content.slice(0, 120),
      lastMessageAt: message.createdAt
    });

    const fullMessage = await ConversationMessage.findByPk(message.id, {
      include: messageInclude
    });

    return res.json({
      success: true,
      message: '消息发送成功',
      data: normalizeMessageForConversation(fullMessage, conversation)
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};
