import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    // 获取用户会话
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 });
    }

    // 从URL参数中获取日期范围（如果有）
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询
    let query = `
      SELECT * FROM tasks 
      WHERE user_id = ?
    `;
    
    const queryParams = [session.user.id];

    // 如果提供了日期范围，添加到查询中
    if (startDate && endDate) {
      query += ` AND deadline BETWEEN ? AND ?`;
      queryParams.push(startDate, endDate);
    }

    // 执行查询
    const tasks = await db.query(query, queryParams);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('获取任务失败:', error);
    return NextResponse.json({ message: '服务器错误', error: error.message }, { status: 500 });
  }
}