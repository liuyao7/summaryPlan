import type { AIResult } from '@/types';

/**
 * AI解析生日接口
 * 注意：当前为模拟接口，后续需要对接厂内大模型接口
 */
export async function parseBirthday(birthday: string): Promise<AIResult> {
  // 模拟API延迟
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 模拟返回结果（实际应该调用厂内接口）
  const mockResult: AIResult = {
    keywords: ['星辰', '勇气', '探索', '希望'],
    scenes: ['静谧的森林小径', '广阔的星空海洋'],
    themeColors: ['#6366f1', '#8b5cf6', '#06b6d4'],
    emotion: '宁静中带着探索的渴望',
    cosmicElements: ['银河', '彗星', '星云'],
  };

  return mockResult;
}

/**
 * 生成AI结果（别名函数）
 */
export async function generateAIResult(birthday: Date): Promise<AIResult> {
  const birthdayStr = birthday.toISOString().split('T')[0];
  return parseBirthday(birthdayStr);
}

/**
 * 实际调用厂内接口的示例代码（后续替换）
 */
/*
export async function parseBirthdayWithInternalAPI(birthday: string): Promise<AIResult> {
  const response = await fetch('INTERNAL_API_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
    },
    body: JSON.stringify({ birthday }),
  });

  if (!response.ok) {
    throw new Error('AI服务调用失败');
  }

  const data = await response.json();
  return data;
}
*/