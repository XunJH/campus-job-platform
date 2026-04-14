"""
薪资托管服务

核心业务逻辑：
1. 资金安全审核（检查金额、账户合规性）
2. 冻结资金（企业预存工资到平台）
3. 发放工资（任务完成后自动发放给学生）
4. 退款（任务取消时退回企业）
5. 申诉处理（异常情况冻结等待人工介入）
"""

import uuid
from datetime import datetime
from typing import List, Optional, Dict

from ..models.salary_models import (
    FundStatus, TaskStatus, AuditStatus,
    AccountInfo, AccountResponse,
    FundAuditRequest, FundAuditResult,
    SalaryEscrow, FreezeRequest, ReleaseRequest,
    DisputeRequest, SalaryFlowResponse, EscrowListResponse
)


class SalaryService:
    """
    薪资托管服务类

    用内存字典模拟数据库存储（演示用）
    真实项目中换成数据库操作
    """

    def __init__(self):
        # 模拟数据库：账户信息
        self._accounts: Dict[str, AccountInfo] = {}

        # 模拟数据库：审核记录
        self._audits: Dict[str, FundAuditResult] = {}

        # 模拟数据库：托管记录
        self._escrows: Dict[str, SalaryEscrow] = {}

        # 平台服务费率（5%）
        self.PLATFORM_FEE_RATE = 0.05

        # 初始化一些演示账户
        self._init_demo_accounts()

    def _init_demo_accounts(self):
        """初始化演示账户数据"""
        # 演示企业账户
        self._accounts["enterprise_001"] = AccountInfo(
            user_id="enterprise_001",
            role="enterprise",
            real_name="星辰科技有限公司",
            bank_account="6222 0000 1234 5678",
            balance=50000.0,
            frozen_amount=0.0
        )
        # 演示学生账户
        self._accounts["student_001"] = AccountInfo(
            user_id="student_001",
            role="student",
            real_name="张小明",
            bank_account="6222 1111 2222 3333",
            balance=0.0,
            frozen_amount=0.0
        )

    # ==================== 账户查询 ====================

    def get_account(self, user_id: str) -> Optional[AccountResponse]:
        """查询账户信息（脱敏返回）"""
        account = self._accounts.get(user_id)
        if not account:
            return None

        # 银行卡脱敏：只显示最后4位
        masked = "**** " + account.bank_account[-4:]

        return AccountResponse(
            user_id=account.user_id,
            role=account.role,
            real_name=account.real_name,
            masked_account=masked,
            available_balance=account.balance,
            frozen_amount=account.frozen_amount,
            total_balance=account.balance + account.frozen_amount
        )

    # ==================== 资金安全审核 ====================

    def audit_fund(self, request: FundAuditRequest) -> FundAuditResult:
        """
        资金安全审核

        检查项：
        1. 金额合理性（不能为0或负数，不能超出余额）
        2. 日薪合理性（不能低于最低工资标准）
        3. 账户是否存在
        4. 企业余额是否充足
        """
        audit_id = "audit_" + str(uuid.uuid4())[:8]
        checks = []
        issues = []
        suggestions = []
        risk_level = "low"

        # 检查1：金额是否合理
        checks.append("金额合法性检查")
        if request.amount <= 0:
            issues.append("预存金额必须大于0")
            risk_level = "high"
        elif request.amount != round(request.daily_wage * request.work_days, 2):
            issues.append(f"金额不一致：日薪×天数={request.daily_wage * request.work_days}，但预存金额={request.amount}")
            suggestions.append("请确认日薪和工作天数是否填写正确")
            risk_level = "medium"

        # 检查2：日薪是否合理（低于20元/天视为异常）
        checks.append("薪资标准检查")
        if request.daily_wage < 20:
            issues.append(f"日薪 {request.daily_wage} 元低于最低标准（20元/天）")
            risk_level = "high"
        elif request.daily_wage < 80:
            suggestions.append("日薪偏低，建议不低于80元/天")
            risk_level = "medium"

        # 检查3：企业账户是否存在且余额充足
        checks.append("企业账户核验")
        enterprise = self._accounts.get(request.enterprise_id)
        if not enterprise:
            issues.append("企业账户不存在，请先注册账户")
            risk_level = "high"
        elif enterprise.balance < request.amount:
            issues.append(f"企业余额不足：当前余额 {enterprise.balance} 元，需要 {request.amount} 元")
            suggestions.append("请先充值后再操作")
            risk_level = "high"

        # 检查4：学生账户是否存在
        checks.append("学生账户核验")
        student = self._accounts.get(request.student_id)
        if not student:
            issues.append("学生账户不存在，学生需先绑定收款账户")
            risk_level = "high"

        # 判断是否可以继续
        can_proceed = len(issues) == 0

        # 如果没问题但有建议，风险等级为low
        if can_proceed and risk_level == "medium":
            risk_level = "low"

        result = FundAuditResult(
            audit_id=audit_id,
            status=AuditStatus.PASSED if can_proceed else AuditStatus.REJECTED,
            risk_level=risk_level,
            checks=checks,
            issues=issues,
            suggestions=suggestions,
            can_proceed=can_proceed
        )

        # 保存审核记录
        self._audits[audit_id] = result
        return result

    # ==================== 创建托管记录 ====================

    def create_escrow(self, request: FundAuditRequest, audit_id: str) -> SalaryEscrow:
        """
        创建薪资托管记录（审核通过后调用）
        """
        escrow_id = "escrow_" + str(uuid.uuid4())[:8]

        # 计算平台服务费和学生实际到手
        platform_fee = round(request.amount * self.PLATFORM_FEE_RATE, 2)
        student_receive = round(request.amount - platform_fee, 2)

        enterprise = self._accounts.get(request.enterprise_id)
        student = self._accounts.get(request.student_id)

        escrow = SalaryEscrow(
            escrow_id=escrow_id,
            job_id=request.job_id,
            job_title=request.job_title,
            enterprise_id=request.enterprise_id,
            enterprise_name=enterprise.real_name if enterprise else "未知企业",
            student_id=request.student_id,
            student_name=student.real_name if student else "未知学生",
            amount=request.amount,
            platform_fee=platform_fee,
            student_receive=student_receive,
            fund_status=FundStatus.PENDING,
            task_status=TaskStatus.CREATED,
            audit_id=audit_id
        )

        self._escrows[escrow_id] = escrow
        return escrow

    # ==================== 冻结资金 ====================

    def freeze_fund(self, request: FreezeRequest) -> SalaryFlowResponse:
        """
        冻结资金：企业余额 → 冻结状态

        相当于"把钱锁进保险柜"
        """
        escrow = self._escrows.get(request.escrow_id)
        if not escrow:
            return SalaryFlowResponse(
                success=False, message="托管记录不存在",
                escrow_id=request.escrow_id,
                current_status=FundStatus.PENDING
            )

        # 验证操作方
        if escrow.enterprise_id != request.enterprise_id:
            return SalaryFlowResponse(
                success=False, message="无权操作：只有对应企业才能冻结资金",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        # 检查状态
        if escrow.fund_status != FundStatus.PENDING:
            return SalaryFlowResponse(
                success=False, message=f"当前状态为 {escrow.fund_status}，无法冻结",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        # 扣除企业余额，增加冻结金额
        enterprise = self._accounts[request.enterprise_id]
        if enterprise.balance < escrow.amount:
            return SalaryFlowResponse(
                success=False, message="企业余额不足，无法冻结",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        enterprise.balance -= escrow.amount
        enterprise.frozen_amount += escrow.amount

        # 更新托管记录状态
        escrow.fund_status = FundStatus.FROZEN
        escrow.task_status = TaskStatus.ACCEPTED
        escrow.frozen_at = datetime.now()

        return SalaryFlowResponse(
            success=True,
            message=f"资金冻结成功！{escrow.amount} 元已锁定，等待学生完成任务后发放",
            escrow_id=request.escrow_id,
            current_status=FundStatus.FROZEN,
            detail=f"学生完成任务后，将收到 {escrow.student_receive} 元（平台服务费 {escrow.platform_fee} 元）"
        )

    # ==================== 发放工资 ====================

    def release_fund(self, request: ReleaseRequest) -> SalaryFlowResponse:
        """
        发放工资：企业确认完成 → 平台自动发放给学生

        相当于"打开保险柜，把钱给学生"
        """
        escrow = self._escrows.get(request.escrow_id)
        if not escrow:
            return SalaryFlowResponse(
                success=False, message="托管记录不存在",
                escrow_id=request.escrow_id,
                current_status=FundStatus.PENDING
            )

        # 验证操作方
        if escrow.enterprise_id != request.enterprise_id:
            return SalaryFlowResponse(
                success=False, message="无权操作：只有对应企业才能确认发放",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        # 检查状态
        if escrow.fund_status != FundStatus.FROZEN:
            return SalaryFlowResponse(
                success=False, message=f"当前状态为 {escrow.fund_status}，无法发放（需先冻结）",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        # 发放：冻结金额减少，学生余额增加
        enterprise = self._accounts[escrow.enterprise_id]
        enterprise.frozen_amount -= escrow.amount

        # 学生账户没有则自动创建（演示用）
        if escrow.student_id not in self._accounts:
            self._accounts[escrow.student_id] = AccountInfo(
                user_id=escrow.student_id,
                role="student",
                real_name=escrow.student_name,
                bank_account="**** 0000",
                balance=0.0
            )
        self._accounts[escrow.student_id].balance += escrow.student_receive

        # 更新状态
        escrow.fund_status = FundStatus.RELEASED
        escrow.task_status = TaskStatus.COMPLETED
        escrow.released_at = datetime.now()

        return SalaryFlowResponse(
            success=True,
            message=f"工资发放成功！{escrow.student_receive} 元已转入学生账户",
            escrow_id=request.escrow_id,
            current_status=FundStatus.RELEASED,
            detail=f"企业确认信息：{request.confirm_message}"
        )

    # ==================== 申诉 ====================

    def dispute_fund(self, request: DisputeRequest) -> SalaryFlowResponse:
        """
        发起申诉：资金进入争议状态，等待人工处理
        """
        escrow = self._escrows.get(request.escrow_id)
        if not escrow:
            return SalaryFlowResponse(
                success=False, message="托管记录不存在",
                escrow_id=request.escrow_id,
                current_status=FundStatus.PENDING
            )

        if escrow.fund_status not in [FundStatus.FROZEN, FundStatus.PENDING]:
            return SalaryFlowResponse(
                success=False, message="当前状态不支持申诉",
                escrow_id=request.escrow_id,
                current_status=escrow.fund_status
            )

        escrow.fund_status = FundStatus.DISPUTED
        escrow.task_status = TaskStatus.DISPUTED

        return SalaryFlowResponse(
            success=True,
            message="申诉已提交，资金已冻结等待人工处理，我们将在3个工作日内处理",
            escrow_id=request.escrow_id,
            current_status=FundStatus.DISPUTED,
            detail=f"申诉原因：{request.reason}"
        )

    # ==================== 查询 ====================

    def get_escrow(self, escrow_id: str) -> Optional[SalaryEscrow]:
        """查询单条托管记录"""
        return self._escrows.get(escrow_id)

    def list_escrows(self, user_id: str, role: str) -> EscrowListResponse:
        """查询用户所有托管记录"""
        if role == "enterprise":
            records = [e for e in self._escrows.values() if e.enterprise_id == user_id]
        else:
            records = [e for e in self._escrows.values() if e.student_id == user_id]

        return EscrowListResponse(total=len(records), records=records)


# 全局单例（整个应用共用一个服务实例）
salary_service = SalaryService()
