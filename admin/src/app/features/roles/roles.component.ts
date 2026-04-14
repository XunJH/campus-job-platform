import { Component, OnInit } from '@angular/core';

interface Role {
  name: string;
  description: string;
  permissions: string[];
}

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  roles: Role[] = [
    {
      name: 'admin',
      description: '管理员 - 拥有所有权限',
      permissions: [
        '管理用户',
        '管理职位',
        '管理申请',
        '管理角色',
        '查看统计数据',
        '系统设置'
      ]
    },
    {
      name: 'employer',
      description: '雇主 - 发布和管理职位',
      permissions: [
        '发布职位',
        '管理职位',
        '查看申请',
        '管理申请状态'
      ]
    },
    {
      name: 'student',
      description: '学生 - 浏览和申请职位',
      permissions: [
        '浏览职位',
        '申请职位',
        '管理个人资料',
        '查看申请状态'
      ]
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }
}
