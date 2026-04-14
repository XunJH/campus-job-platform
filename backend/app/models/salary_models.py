"""
薪资托管数据模型

定义薪资结算流程中的所有数据格式：
- 账户信息
- 资金记录
- 任务状态
- 申诉记录
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ==================== 枚举类型（状态定义）====================

class FundStatus(str, Enum):
    """资金状态"""
    PENDING   = "pending"    # 待冻结（企业刚提交，等待审核）
    FROZEN    = "frozen"     # 已冻结（钱在平台，等待任务完成）
    RELEASED  = "released"   # 已发放（学生收到工资）
    REFUNDED  = "refunded"   # 已退款（任务取消，钱退给企业）
    DISPUTED  = "disputed"   # 争议中（有异常，等待人工处理）


class TaskStatus(str, Enum):
    """任务状态"""
    CREATED    = "created"    # 任务已创建
    ACCEPTED   = "accepted"   # 学生已接受
    IN_PROGRESS = "in_progress" # 进行中
    COMPLETED  = "completed"  # 企业已确认完成
    CANCELLED  = "cancelled"  # 已取消
    DISPUTED   = "disputed"   # 争议中


class AuditStatus(str, Enum):
    """资金安全审核状态"""
    PENDING  = "pending"   # 待审核
    PASSED   = "passed"    # 审核通过
    REJECTED = "rejected"  # 审核拒绝


# ==================== 账户相关 ====================

class AccountInfo(BaseModel):
    """用户账户信息（企业/学生）"""
    user_id: str                          # 用户ID
    role: str                             # 角色："enterprise" 或 "student"
    real_name: str                        # 真实姓名
    bank_account: str                     # 银行卡号（脱敏显示：**** **** **** 1234）
    balance: float = 0.0                  # 当前余额（平台钱包）
    frozen_amount: float = 0.0            # 冻结中的金额（不可用）
    created_at: datetime = Field(default_factory=datetime.now)


class AccountResponse(BaseModel):
    """账户信息返回（对外展示，脱敏）"""
    user_id: str
    role: str
    real_name: str
    masked_account: str                   # 脱敏银行卡：**** 1234
    available_balance: float              # 可用余额
    frozen_amount: float                  # 冻结金额
    total_balance: float                  # 总余额（可用+冻结）


# ==================== 资金审核相关 ====================

class FundAuditRequest(BaseModel):
    """企业预存工资 - 审核请求"""
    enterprise_id: str                    # 企业ID
    job_id: str                           # 岗位ID
    job_title: str                        # 岗位名称
    student_id: str                       # 学生ID
    amount: float                         # 预存金额（元）
    work_days: int                        # 工作天数
    daily_wage: float                     # 日薪（元）
    description: str                      # 工作描述


class FundAuditResult(BaseModel):
    """资金安全审核结果"""
    audit_id: str                         # 审核记录ID
    status: AuditStatus                   # 审核状态
    risk_level: str                       # 风险等级："low" | "medium" | "high"
    checks: List[str]                     # 审核检查项
    issues: List[str]                     # 发现的问题（如果有）
    suggestions: List[str]                # 建议
    can_proceed: bool                     # 是否可以继续（冻结资金）
    audited_at: datetime = Field(default_factory=datetime.now)


# ==================== 薪资托管记录 ====================

class SalaryEscrow(BaseModel):
    """薪资托管记录（核心数据）"""
    escrow_id: str                        # 托管记录ID
    job_id: str                           # 岗位ID
    job_title: str                        # 岗位名称
    enterprise_id: str                    # 企业ID
    enterprise_name: str                  # 企业名称
    student_id: str                       # 学生ID
    student_name: str                     # 学生姓名
    amount: float                         # 托管金额（元）
    platform_fee: float                   # 平台服务费（元）
    student_receive: float                # 学生实际到手（元）
    fund_status: FundStatus               # 资金状态
    task_status: TaskStatus               # 任务状态
    audit_id: Optional[str] = None        # 关联的审核记录ID
    created_at: datetime = Field(default_factory=datetime.now)
    frozen_at: Optional[datetime] = None  # 冻结时间
    released_at: Optional[datetime] = None # 发放时间


# ==================== 操作请求 ====================

class FreezeRequest(BaseModel):
    """冻结资金请求（企业操作）"""
    escrow_id: str                        # 托管记录ID
    enterprise_id: str                    # 企业ID（验证身份）


class ReleaseRequest(BaseModel):
    """发放工资请求（企业确认完成后触发）"""
    escrow_id: str                        # 托管记录ID
    enterprise_id: str                    # 企业ID
    confirm_message: str                  # 企业确认描述（"学生已完成全部工作"）


class DisputeRequest(BaseModel):
    """申诉请求（任何一方可发起）"""
    escrow_id: str                        # 托管记录ID
    applicant_id: str                     # 申诉方ID
    applicant_role: str                   # 申诉方角色："enterprise" | "student"
    reason: str                           # 申诉原因
    evidence: Optional[str] = None        # 证据描述


# ==================== 返回格式 ====================

class SalaryFlowResponse(BaseModel):
    """薪资流程操作结果"""
    success: bool
    message: str
    escrow_id: str
    current_status: FundStatus
    detail: Optional[str] = None


class EscrowListResponse(BaseModel):
    """托管记录列表"""
    total: int
    records: List[SalaryEscrow]
