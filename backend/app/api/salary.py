"""
薪资结算 API 接口

提供以下接口：
- POST /salary/audit          资金安全审核
- POST /salary/escrow         创建托管记录
- POST /salary/freeze         冻结资金
- POST /salary/release        发放工资
- POST /salary/dispute        发起申诉
- GET  /salary/escrow/{id}    查询托管详情
- GET  /salary/list/{user_id} 查询用户托管记录
- GET  /salary/account/{id}   查询账户余额
"""

from fastapi import APIRouter, HTTPException
from ..models.salary_models import (
    FundAuditRequest, FreezeRequest,
    ReleaseRequest, DisputeRequest
)
from ..services.salary_service import salary_service

router = APIRouter(prefix="/salary", tags=["薪资结算"])


# ==================== 第一步：资金安全审核 ====================

@router.post("/audit", summary="资金安全审核")
async def audit_fund(request: FundAuditRequest):
    """
    企业提交预存工资前，先做安全审核。

    检查：
    - 金额是否合理
    - 日薪是否合规
    - 企业余额是否充足
    - 账户是否真实存在

    返回：审核结果 + 是否可以继续冻结资金
    """
    result = salary_service.audit_fund(request)
    return {
        "audit_id": result.audit_id,
        "status": result.status,
        "risk_level": result.risk_level,
        "can_proceed": result.can_proceed,
        "checks": result.checks,
        "issues": result.issues,
        "suggestions": result.suggestions,
        "message": "审核通过，可以冻结资金" if result.can_proceed else "审核不通过，请处理问题后重试"
    }


# ==================== 第二步：创建托管记录 ====================

@router.post("/escrow", summary="创建薪资托管记录")
async def create_escrow(request: FundAuditRequest):
    """
    审核通过后，创建薪资托管记录。

    流程：
    1. 先调用 /audit 审核
    2. 审核通过后调用此接口创建记录
    3. 再调用 /freeze 冻结资金

    返回：托管记录ID（后续操作都用这个ID）
    """
    # 自动做一次审核
    audit = salary_service.audit_fund(request)
    if not audit.can_proceed:
        raise HTTPException(
            status_code=400,
            detail=f"审核不通过：{'; '.join(audit.issues)}"
        )

    escrow = salary_service.create_escrow(request, audit.audit_id)
    return {
        "escrow_id": escrow.escrow_id,
        "job_title": escrow.job_title,
        "amount": escrow.amount,
        "platform_fee": escrow.platform_fee,
        "student_receive": escrow.student_receive,
        "fund_status": escrow.fund_status,
        "task_status": escrow.task_status,
        "message": f"托管记录创建成功！下一步：调用 /salary/freeze 冻结资金",
        "tip": f"平台服务费 {escrow.platform_fee} 元（{int(salary_service.PLATFORM_FEE_RATE*100)}%），学生实际到手 {escrow.student_receive} 元"
    }


# ==================== 第三步：冻结资金 ====================

@router.post("/freeze", summary="冻结资金（企业操作）")
async def freeze_fund(request: FreezeRequest):
    """
    企业确认冻结资金到平台。

    冻结后：
    - 企业可用余额减少
    - 资金被锁定在平台
    - 学生开始工作

    注意：冻结后企业无法单方面取回资金
    """
    result = salary_service.freeze_fund(request)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result


# ==================== 第四步：确认发放工资 ====================

@router.post("/release", summary="确认发放工资（企业确认任务完成）")
async def release_fund(request: ReleaseRequest):
    """
    企业确认学生已完成任务，平台自动将工资发放给学生。

    发放后：
    - 学生账户余额增加
    - 企业冻结金额减少
    - 托管记录关闭

    注意：发放后不可撤销，如有争议请先提申诉
    """
    result = salary_service.release_fund(request)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result


# ==================== 申诉 ====================

@router.post("/dispute", summary="发起申诉")
async def dispute_fund(request: DisputeRequest):
    """
    任何一方（企业/学生）均可发起申诉。

    申诉后：
    - 资金冻结状态不变
    - 进入"争议中"状态
    - 等待人工客服介入处理

    适用场景：
    - 学生认为工作已完成但企业不确认
    - 企业认为工作质量不达标
    """
    result = salary_service.dispute_fund(request)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result


# ==================== 查询接口 ====================

@router.get("/escrow/{escrow_id}", summary="查询托管记录详情")
async def get_escrow(escrow_id: str):
    """查询某条托管记录的详细信息和当前状态"""
    escrow = salary_service.get_escrow(escrow_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="托管记录不存在")
    return escrow


@router.get("/list/{user_id}", summary="查询用户所有托管记录")
async def list_escrows(user_id: str, role: str = "enterprise"):
    """
    查询某用户（企业或学生）的所有薪资托管记录

    参数：
    - user_id: 用户ID
    - role: 角色（enterprise/student）
    """
    return salary_service.list_escrows(user_id, role)


@router.get("/account/{user_id}", summary="查询账户余额")
async def get_account(user_id: str):
    """查询用户账户余额（脱敏显示银行卡）"""
    account = salary_service.get_account(user_id)
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return account
