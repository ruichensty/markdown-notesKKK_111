export const cyberTrigrams = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"];
export const cyberGates = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"];
export const cyberStars = ["天蓬", "天芮", "天冲", "天辅", "天禽", "天心", "天柱", "天任", "天英"];
export const cyberSpirits = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];
export const cyberMountains = [
  "子",
  "癸",
  "丑",
  "艮",
  "寅",
  "甲",
  "卯",
  "乙",
  "辰",
  "巽",
  "巳",
  "丙",
  "午",
  "丁",
  "未",
  "坤",
  "申",
  "庚",
  "酉",
  "辛",
  "戌",
  "乾",
  "亥",
  "壬",
];

export interface CyberReadingInput {
  trigramAngle: number;
  gateAngle: number;
  starAngle: number;
  spiritAngle: number;
  mountainAngle: number;
}

export interface CyberReading {
  trigram: string;
  gate: string;
  star: string;
  spirit: string;
  mountain: string;
  code: string;
  summary: string;
  advice: string;
  risk: string;
}

const gateMeanings: Record<string, { summary: string; advice: string; risk: string }> = {
  休门: {
    summary: "系统进入低噪声窗口，适合整理、修复、等待信号回流。",
    advice: "先收束变量，把未完成的线索归档，再决定下一步。",
    risk: "过度观望会让机会窗口关闭。",
  },
  生门: {
    summary: "增长通道打开，资源、关系和灵感都有向上汇聚的趋势。",
    advice: "选择一个最小可行动作，今天就让它产生可见增量。",
    risk: "扩张太快会稀释注意力。",
  },
  伤门: {
    summary: "冲突信号增强，适合破局，也容易产生摩擦。",
    advice: "用一次小范围试验释放压力，不要直接押上全部筹码。",
    risk: "情绪化决策会放大损耗。",
  },
  杜门: {
    summary: "边界收紧，信息被遮蔽，需要降低曝光、保留余地。",
    advice: "先做内部推演，不急着公开结论。",
    risk: "闭门太久会错过外部校准。",
  },
  景门: {
    summary: "可见度上升，适合表达、展示、发布和建立叙事。",
    advice: "把复杂方案压缩成一句清楚的主张。",
    risk: "表象过强时，容易忽略真实数据。",
  },
  死门: {
    summary: "旧结构需要终止，适合复盘、清理和做减法。",
    advice: "删掉一个长期拖累你的承诺或流程。",
    risk: "不要把阶段性结束误判成全局失败。",
  },
  惊门: {
    summary: "异常波动出现，注意突发消息、灵感闪回和外部扰动。",
    advice: "先记录信号，再判断是否行动。",
    risk: "被噪声牵引会导致频繁切换。",
  },
  开门: {
    summary: "通路打开，适合启动、谈判、发布和推进关键事项。",
    advice: "把想法变成一个可以被别人看到的版本。",
    risk: "开局顺利时，也要预留回滚路径。",
  },
};

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function pickByAngle<T>(items: T[], angle: number) {
  const normalized = normalizeAngle(angle + 90);
  const index = Math.floor((normalized / 360) * items.length) % items.length;
  return items[index];
}

export function createCyberReading(input: CyberReadingInput): CyberReading {
  const trigram = pickByAngle(cyberTrigrams, input.trigramAngle);
  const gate = pickByAngle(cyberGates, input.gateAngle);
  const star = pickByAngle(cyberStars, input.starAngle);
  const spirit = pickByAngle(cyberSpirits, input.spiritAngle);
  const mountain = pickByAngle(cyberMountains, input.mountainAngle);
  const meaning = gateMeanings[gate];

  return {
    trigram,
    gate,
    star,
    spirit,
    mountain,
    code: `${trigram}-${gate}-${star}-${spirit}-${mountain}`,
    summary: `${meaning.summary} ${star}接入，${spirit}校准，方位落在${mountain}。`,
    advice: meaning.advice,
    risk: meaning.risk,
  };
}
